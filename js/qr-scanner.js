// js/qr-scanner.js
import { doc, getDoc, updateDoc, increment, serverTimestamp, addDoc, collection } from './firebase-config.js';
import { db } from './firebase-config.js';

// Generate a scannable QR code with user data embedded
export async function generateUserQRCode(user) {
  const qrData = {
    uid: user.uid,
    name: user.displayName,
    email: user.email,
    freedomId: user.freedomId,
    timestamp: Date.now()
  };

  const qrString = btoa(JSON.stringify(qrData));
  return qrString;
}

// Decode QR scan data
export function decodeQRScan(qrString) {
  try {
    const decoded = atob(qrString);
    return JSON.parse(decoded);
  } catch (error) {
    return null;
  }
}

// Process booth scan - called when participant QR is scanned at a booth
export async function processBoothScan(scannedData, boothId, boothName, scannerUserId) {
  try {
    const { uid, name, email, freedomId } = scannedData;

    // Get user data
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return { success: false, error: 'User not found' };
    }

    const user = userDoc.data();
    const pointsToAward = 50;

    // Record the scan
    const scanRef = await addDoc(collection(db, 'scans'), {
      userId: uid,
      userName: name,
      userEmail: email,
      boothId,
      boothName,
      scannedBy: scannerUserId,
      pointsAwarded: pointsToAward,
      scannedAt: serverTimestamp(),
      type: 'booth_scan'
    });

    // Award points
    await updateDoc(userRef, {
      points: increment(pointsToAward),
      lastScanAt: serverTimestamp(),
      scansCount: increment(1)
    });

    // Add stamp if not already present
    const currentStamps = user.stamps || [];
    if (!currentStamps.includes(boothId)) {
      await updateDoc(userRef, {
        stamps: [...currentStamps, boothId]
      });
    }

    // Send notification to participant
    await addDoc(collection(db, 'notifications'), {
      userId: uid,
      title: '✓ Booth Visit!',
      message: `You earned ${pointsToAward} Liberty Coins at ${boothName}`,
      type: 'success',
      read: false,
      createdAt: serverTimestamp()
    });

    return {
      success: true,
      userName: name,
      pointsAwarded: pointsToAward,
      totalPoints: (user.points || 0) + pointsToAward,
      message: `Welcome ${name}! +${pointsToAward} Liberty Coins`
    };
  } catch (error) {
    console.error('Scan processing error:', error);
    return { success: false, error: error.message };
  }
}

// Get scan history for a user
export async function getUserScanHistory(userId) {
  try {
    const q = query(
      collection(db, 'scans'),
      where('userId', '==', userId),
      orderBy('scannedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    const scans = [];
    snapshot.forEach(doc => {
      scans.push({ id: doc.id, ...doc.data() });
    });
    return scans;
  } catch (error) {
    return [];
  }
}

// Get booth scan statistics
export async function getBoothStats(boothId) {
  try {
    const q = query(
      collection(db, 'scans'),
      where('boothId', '==', boothId)
    );
    const snapshot = await getDocs(q);
    const uniqueUsers = new Set();

    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.userId) uniqueUsers.add(data.userId);
    });

    return {
      totalScans: snapshot.size,
      uniqueVisitors: uniqueUsers.size
    };
  } catch (error) {
    return { totalScans: 0, uniqueVisitors: 0 };
  }
}