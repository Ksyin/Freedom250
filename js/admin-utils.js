// js/admin-utils.js - Admin Dashboard Utilities for Freedom 250

import { db, collection, doc, updateDoc, deleteDoc, getDocs, query, where } from './firebase-config.js';
import { manuallyAwardPoints } from './points-system.js';
import { broadcastNotification, sendNotification } from './firestore-schema.js';

/**
 * Admin role check
 */
export function isAdmin(user) {
  return user && ['admin', 'organizer'].includes(user.role);
}

/**
 * Get all participants
 */
export async function getAllParticipants() {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('role', '==', 'participant'));
    const snapshot = await getDocs(q);

    const participants = [];
    snapshot.forEach((doc) => {
      participants.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return participants;
  } catch (error) {
    console.error('[Admin] Error fetching participants:', error);
    return [];
  }
}

/**
 * Get participant details
 */
export async function getParticipantDetails(userId) {
  try {
    const { getDoc } = await import('./firebase-config.js');
    const userDoc = await getDoc(doc(db, 'users', userId));

    if (userDoc.exists()) {
      return {
        id: userDoc.id,
        ...userDoc.data()
      };
    }
    return null;
  } catch (error) {
    console.error('[Admin] Error fetching participant:', error);
    return null;
  }
}

/**
 * Award manual points to participant
 */
export async function awardManualPoints(participantId, amount, reason, adminId) {
  try {
    if (amount < 0) {
      return { success: false, error: 'Amount must be positive' };
    }

    const result = await manuallyAwardPoints(participantId, amount, reason, adminId);
    return result;
  } catch (error) {
    console.error('[Admin] Error awarding points:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create or update booth
 */
export async function createOrUpdateBooth(boothData) {
  try {
    const boothsRef = collection(db, 'booths');

    if (boothData.id) {
      // Update existing
      const boothRef = doc(boothsRef, boothData.id);
      await updateDoc(boothRef, boothData);
      return { success: true, id: boothData.id, message: 'Booth updated' };
    } else {
      // Create new
      const newBoothRef = doc(boothsRef);
      await (await import('./firebase-config.js')).setDoc(newBoothRef, {
        boothId: newBoothRef.id,
        ...boothData,
        createdAt: new Date().toISOString(),
        scanCount: 0
      });
      return { success: true, id: newBoothRef.id, message: 'Booth created' };
    }
  } catch (error) {
    console.error('[Admin] Error managing booth:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all booths
 */
export async function getAllBooths() {
  try {
    const boothsRef = collection(db, 'booths');
    const snapshot = await getDocs(boothsRef);

    const booths = [];
    snapshot.forEach((doc) => {
      booths.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return booths;
  } catch (error) {
    console.error('[Admin] Error fetching booths:', error);
    return [];
  }
}

/**
 * Delete booth
 */
export async function deleteBooth(boothId) {
  try {
    await deleteDoc(doc(db, 'booths', boothId));
    return { success: true, message: 'Booth deleted' };
  } catch (error) {
    console.error('[Admin] Error deleting booth:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create or update challenge
 */
export async function createOrUpdateChallenge(challengeData) {
  try {
    const challengesRef = collection(db, 'challenges');

    if (challengeData.id) {
      // Update
      const challengeRef = doc(challengesRef, challengeData.id);
      await updateDoc(challengeRef, challengeData);
      return { success: true, id: challengeData.id, message: 'Challenge updated' };
    } else {
      // Create
      const newChallengeRef = doc(challengesRef);
      await (await import('./firebase-config.js')).setDoc(newChallengeRef, {
        challengeId: newChallengeRef.id,
        ...challengeData,
        createdAt: new Date().toISOString()
      });
      return { success: true, id: newChallengeRef.id, message: 'Challenge created' };
    }
  } catch (error) {
    console.error('[Admin] Error managing challenge:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get event statistics
 */
export async function getEventStats() {
  try {
    const participants = await getAllParticipants();
    
    let totalPoints = 0;
    let totalXp = 0;
    let averageLevel = 0;
    const universityCounts = {};
    let maxRank = 1;

    participants.forEach(p => {
      totalPoints += p.points || 0;
      totalXp += p.xp || 0;
      averageLevel += p.level || 1;
      maxRank = Math.max(maxRank, p.level || 1);

      const uni = p.university || 'Unknown';
      universityCounts[uni] = (universityCounts[uni] || 0) + 1;
    });

    const stats = {
      totalParticipants: participants.length,
      totalPointsAwarded: totalPoints,
      totalXpAwarded: totalXp,
      averageLevel: participants.length > 0 ? (averageLevel / participants.length).toFixed(1) : 0,
      highestLevel: maxRank,
      averagePointsPerParticipant: participants.length > 0 ? (totalPoints / participants.length).toFixed(0) : 0,
      universitiesParticipating: Object.keys(universityCounts).length,
      universityBreakdown: universityCounts
    };

    return stats;
  } catch (error) {
    console.error('[Admin] Error calculating stats:', error);
    return {
      totalParticipants: 0,
      totalPointsAwarded: 0,
      averageLevel: 0
    };
  }
}

/**
 * Send broadcast announcement
 */
export async function sendBroadcastAnnouncement(title, message, data = {}) {
  try {
    await broadcastNotification(title, message, data);
    return { success: true, message: 'Announcement broadcast sent' };
  } catch (error) {
    console.error('[Admin] Error sending announcement:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send notification to specific user
 */
export async function sendUserNotification(userId, title, message, type = 'inApp') {
  try {
    await sendNotification(userId, type, title, message);
    return { success: true, message: 'Notification sent' };
  } catch (error) {
    console.error('[Admin] Error sending notification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get admin activity log
 */
export async function getActivityLog(limit = 100) {
  try {
    const logsRef = collection(db, 'eventLogs');
    const q = query(logsRef, where('action', '!=', 'system_event'));
    const snapshot = await getDocs(q);

    const logs = [];
    snapshot.forEach((doc) => {
      logs.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return logs.slice(-limit).reverse();
  } catch (error) {
    console.error('[Admin] Error fetching activity log:', error);
    return [];
  }
}

/**
 * Check in participant by Freedom ID
 */
export async function checkInParticipantByFreedomId(freedomId) {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('freedomId', '==', freedomId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return { success: false, error: 'Participant not found' };
    }

    const userDoc = snapshot.docs[0];
    const user = userDoc.data();

    // Update last check-in
    await updateDoc(doc(db, 'users', userDoc.id), {
      lastCheckIn: new Date().toISOString()
    });

    return {
      success: true,
      participant: {
        id: userDoc.id,
        name: user.displayName,
        email: user.email,
        points: user.points,
        level: user.level
      },
      message: `Welcome, ${user.displayName}!`
    };
  } catch (error) {
    console.error('[Admin] Error checking in participant:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate admin report
 */
export async function generateAdminReport() {
  try {
    const stats = await getEventStats();
    const participants = await getAllParticipants();
    const booths = await getAllBooths();

    const topParticipants = participants
      .sort((a, b) => (b.points || 0) - (a.points || 0))
      .slice(0, 10);

    const report = {
      generatedAt: new Date().toISOString(),
      eventStats: stats,
      topParticipants,
      totalBooths: booths.length,
      boothStats: booths.map(b => ({
        name: b.name,
        zone: b.zone,
        scans: b.scanCount || 0,
        pointsAwarded: (b.pointsAwarded || 0) * (b.scanCount || 0)
      }))
    };

    return report;
  } catch (error) {
    console.error('[Admin] Error generating report:', error);
    return null;
  }
}

/**
 * Export participant data (CSV format)
 */
export function exportParticipantDataCSV(participants) {
  const headers = ['Name', 'Email', 'Points', 'Level', 'Rank', 'Zones Visited', 'Badges', 'University'];
  const rows = participants.map(p => [
    p.displayName || 'N/A',
    p.email,
    p.points || 0,
    p.level || 1,
    p.freedomRank || 'N/A',
    (p.stamps?.length || 0) + '/7',
    (p.badges?.length || 0),
    p.university || 'Unknown'
  ]);

  let csv = headers.join(',') + '\n';
  rows.forEach(row => {
    csv += row.map(cell => `"${cell}"`).join(',') + '\n';
  });

  return csv;
}

/**
 * Download CSV file
 */
export function downloadCSV(csvContent, filename = 'report.csv') {
  const element = document.createElement('a');
  element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent));
  element.setAttribute('download', filename);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

export default {
  isAdmin,
  getAllParticipants,
  getParticipantDetails,
  awardManualPoints,
  createOrUpdateBooth,
  getAllBooths,
  deleteBooth,
  createOrUpdateChallenge,
  getEventStats,
  sendBroadcastAnnouncement,
  sendUserNotification,
  getActivityLog,
  checkInParticipantByFreedomId,
  generateAdminReport,
  exportParticipantDataCSV,
  downloadCSV
};
