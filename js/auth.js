// js/auth.js - Working Authentication with QR Code Support
import { generateQRCode, generateFreedomId } from './qr-generator.js';

export const ROLES = {
  PARTICIPANT: 'participant',
  VOLUNTEER: 'volunteer',
  BOOTH_ADMIN: 'booth_admin',
  ADMIN: 'admin',
  ORGANIZER: 'organizer'
};

let currentUser = null;
let authCallbacks = [];

export async function initAuth() {
  try {
    const { auth, db, doc, getDoc, updateDoc } = await import('./firebase-config.js');
    const { onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");

    return new Promise((resolve) => {
      onAuthStateChanged(auth, async (user) => {
        console.log("Auth state changed:", user ? user.email : "No user");

        if (user) {
          try {
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);

            let userData = { 
              role: ROLES.PARTICIPANT, 
              points: 0, 
              badges: [], 
              stamps: [], 
              level: 1, 
              xp: 0, 
              streak: 0, 
              activityHistory: [],
              freedomId: generateFreedomId(user.uid)
            };

            if (userDoc.exists()) {
              userData = userDoc.data();
            }

            // Generate QR code if it doesn't exist
            if (!userData.qrCode) {
              console.log('Generating QR code for user:', user.uid);
              try {
                const freedomId = userData.freedomId || generateFreedomId(user.uid);
                const qrDataUrl = await generateQRCode(freedomId);
                userData.qrCode = qrDataUrl;
                // Save QR code to Firestore
                await updateDoc(userDocRef, { 
                  qrCode: qrDataUrl,
                  freedomId: freedomId
                });
              } catch (qrError) {
                console.error('Error generating QR code:', qrError);
                // Continue without QR code - user can still proceed
              }
            }

            currentUser = {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || userData.displayName || user.email.split('@')[0],
              role: userData.role || ROLES.PARTICIPANT,
              points: userData.points || 0,
              badges: userData.badges || [],
              stamps: userData.stamps || [],
              level: userData.level || 1,
              xp: userData.xp || 0,
              streak: userData.streak || 0,
              activityHistory: userData.activityHistory || [],
              freedomId: userData.freedomId || generateFreedomId(user.uid),
              qrCode: userData.qrCode,
              ...userData
            };

            console.log("User loaded:", currentUser.email, "Freedom ID:", currentUser.freedomId);
            authCallbacks.forEach(cb => cb(currentUser, true));
            resolve(currentUser);
          } catch (error) {
            console.error('Error fetching user data:', error);
            currentUser = {
              uid: user.uid,
              email: user.email,
              displayName: user.email.split('@')[0],
              role: ROLES.PARTICIPANT,
              points: 0,
              freedomId: generateFreedomId(user.uid)
            };
            authCallbacks.forEach(cb => cb(currentUser, true));
            resolve(currentUser);
          }
        } else {
          currentUser = null;
          authCallbacks.forEach(cb => cb(null, false));
          resolve(null);
        }
      });
    });
  } catch (error) {
    console.error('Auth initialization error:', error);
    return null;
  }
}

export function getCurrentUser() {
  return currentUser;
}

export async function signUp(email, password, displayName = '', role = ROLES.PARTICIPANT) {
  try {
    const { auth, db, doc, setDoc } = await import('./firebase-config.js');
    const { createUserWithEmailAndPassword, updateProfile } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");

    if (!email || !password) return { success: false, error: 'Email and password are required' };
    if (password.length < 6) return { success: false, error: 'Password must be at least 6 characters' };

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    if (displayName) {
      await updateProfile(user, { displayName });
    }

    // Generate Freedom ID and QR Code
    const freedomId = generateFreedomId(user.uid);
    let qrCode = null;
    
    try {
      qrCode = await generateQRCode(freedomId);
      console.log('QR code generated successfully for:', freedomId);
    } catch (qrError) {
      console.warn('Failed to generate QR code:', qrError);
      // Continue without QR code - it can be generated later
    }

    const userData = {
      uid: user.uid,
      email: user.email,
      displayName: displayName || email.split('@')[0],
      role: role,
      createdAt: new Date().toISOString(),
      points: 0,
      freedomId: freedomId,
      qrCode: qrCode,
      badges: [
        { name: 'Freedom Starter', icon: 'fa-flag', unlockedAt: new Date().toISOString() }
      ],
      stamps: [],
      level: 1,
      xp: 0,
      streak: 0,
      activityHistory: [
        { label: 'Account created', time: new Date().toISOString(), details: 'Welcome to Freedom 250!' }
      ]
    };

    await setDoc(doc(db, 'users', user.uid), userData);
    currentUser = { uid: user.uid, ...userData };
    authCallbacks.forEach(cb => cb(currentUser, true));

    return { success: true, user: currentUser };
  } catch (error) {
    console.error('Sign up error:', error);
    let errorMessage = 'Registration failed. Please try again.';
    if (error.code === 'auth/email-already-in-use') {
      errorMessage = 'Email already registered. Please sign in instead.';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'Password is too weak. Use a stronger password.';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email address.';
    }
    return { success: false, error: errorMessage };
  }
}

export async function signIn(email, password) {
  try {
    const { auth } = await import('./firebase-config.js');
    const { signInWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error('Sign in error:', error);
    let errorMessage = 'Login failed. Please try again.';
    if (error.code === 'auth/user-not-found') {
      errorMessage = 'No account found. Please sign up first.';
    } else if (error.code === 'auth/wrong-password') {
      errorMessage = 'Incorrect password. Please try again.';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email address.';
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = 'Too many failed attempts. Try again later.';
    }
    return { success: false, error: errorMessage };
  }
}

export async function resetPassword(email) {
  try {
    const { auth } = await import('./firebase-config.js');
    const { sendPasswordResetEmail } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    console.error('Password reset error:', error);
    let errorMessage = 'Failed to send reset email.';
    if (error.code === 'auth/user-not-found') {
      errorMessage = 'No account found with this email.';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email address.';
    }
    return { success: false, error: errorMessage };
  }
}

export async function signInWithGoogle() {
  try {
    const { auth, db, doc, getDoc, setDoc, updateDoc } = await import('./firebase-config.js');
    const { signInWithPopup, GoogleAuthProvider } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");

    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    const user = userCredential.user;

    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    let userData;
    let isNewUser = false;
    
    if (!userDoc.exists()) {
      // New user via Google sign-in
      const freedomId = generateFreedomId(user.uid);
      let qrCode = null;
      
      try {
        qrCode = await generateQRCode(freedomId);
      } catch (qrError) {
        console.warn('Failed to generate QR code:', qrError);
      }
      
      userData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email.split('@')[0],
        role: ROLES.PARTICIPANT,
        createdAt: new Date().toISOString(),
        points: 0,
        freedomId: freedomId,
        qrCode: qrCode,
        badges: [
          { name: 'Freedom Starter', icon: 'fa-flag', unlockedAt: new Date().toISOString() }
        ],
        stamps: [],
        level: 1,
        xp: 0,
        streak: 0,
        activityHistory: [
          { label: 'Signed in with Google', time: new Date().toISOString(), details: 'Welcome to Freedom 250!' }
        ]
      };
      await setDoc(userDocRef, userData);
      isNewUser = true;
    } else {
      userData = userDoc.data();
      
      // Check if QR code exists; if not, generate it
      if (!userData.qrCode) {
        const freedomId = userData.freedomId || generateFreedomId(user.uid);
        try {
          const qrCode = await generateQRCode(freedomId);
          userData.qrCode = qrCode;
          await updateDoc(userDocRef, { 
            qrCode: qrCode,
            freedomId: freedomId 
          });
        } catch (qrError) {
          console.warn('Failed to generate QR code:', qrError);
        }
      }
    }

    currentUser = { uid: user.uid, ...userData };
    authCallbacks.forEach(cb => cb(currentUser, true));
    return { success: true, user: currentUser, isNewUser };
  } catch (error) {
    console.error('Google sign in error:', error);
    return { success: false, error: 'Google sign in failed. Please try again.' };
  }
}

export async function signOutUser() {
  try {
    const { auth } = await import('./firebase-config.js');
    const { signOut } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");
    await signOut(auth);
    currentUser = null;
    authCallbacks.forEach(cb => cb(null, false));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export function onAuthStateChange(callback) {
  authCallbacks.push(callback);
  if (currentUser !== null) callback(currentUser, true);
}

export function getDashboardPath(user) {
  if (!user) return 'login.html';
  switch (user.role) {
    case ROLES.ADMIN: return 'dashboard-admin.html';
    case ROLES.ORGANIZER: return 'dashboard-admin.html';
    case ROLES.BOOTH_ADMIN: return 'dashboard-booth-admin.html';
    case ROLES.VOLUNTEER: return 'dashboard-volunteer.html';
    default: return 'dashboard-participant.html';
  }
}