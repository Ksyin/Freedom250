// js/auth.js — Freedom 250 Authentication with Role-Based Access Control
import { 
  auth, db, doc, getDoc, setDoc, updateDoc 
} from './firebase-config.js';
import { 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  signInWithPopup,
  signOut,
  GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { generateQRCode, generateFreedomId } from './qr-generator.js';

export const ROLES = {
  PARTICIPANT: 'participant',
  VOLUNTEER:   'volunteer',
  BOOTH_ADMIN: 'booth_admin',
  ADMIN:       'admin',
  ORGANIZER:   'organizer'
};

let currentUser = null;
let authCallbacks = [];

// ─────────────────────────────────────────────────────────────────────────────
//  ROLE GUARD
// ─────────────────────────────────────────────────────────────────────────────
export function validateRoleAccess(userRole, allowedRoles) {
  if (!allowedRoles || allowedRoles.length === 0) return true;
  const normalised = (userRole || 'participant').toLowerCase();
  const allowed = allowedRoles.map(r => r.toLowerCase());
  return allowed.includes(normalised);
}

// ─────────────────────────────────────────────────────────────────────────────
//  INIT AUTH
// ─────────────────────────────────────────────────────────────────────────────
export async function initAuth() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc    = await getDoc(userDocRef);

          let userData = {
            role: ROLES.PARTICIPANT, points: 0, badges: [], stamps: [],
            level: 1, xp: 0, streak: 0, activityHistory: [],
            freedomId: generateFreedomId(user.uid)
          };

          if (userDoc.exists()) {
            userData = { ...userData, ...userDoc.data() };
          }

          if (!userData.qrCode) {
            try {
              const freedomId  = userData.freedomId || generateFreedomId(user.uid);
              const qrDataUrl  = await generateQRCode(freedomId);
              userData.qrCode  = qrDataUrl;
              await updateDoc(userDocRef, { qrCode: qrDataUrl, freedomId });
            } catch (qrErr) {
              console.warn('[Auth] QR generation skipped:', qrErr.message);
            }
          }

          currentUser = {
            uid:         user.uid,
            email:       user.email,
            displayName: user.displayName || userData.displayName || user.email.split('@')[0],
            role:        userData.role    || ROLES.PARTICIPANT,
            ...userData
          };

          authCallbacks.forEach(cb => cb(currentUser, true));
          resolve(currentUser);
        } catch (err) {
          console.error('[Auth] Firestore fetch error:', err);
          currentUser = {
            uid: user.uid, email: user.email,
            displayName: user.email.split('@')[0],
            role: ROLES.PARTICIPANT, points: 0,
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
}

export function getCurrentUser() { return currentUser; }

// ─────────────────────────────────────────────────────────────────────────────
//  SIGN UP
// ─────────────────────────────────────────────────────────────────────────────
export async function signUp(email, password, displayName = '', role = ROLES.PARTICIPANT) {
  try {
    if (!email || !password) return { success: false, error: 'Email and password are required.' };
    if (password.length < 6) return { success: false, error: 'Password must be at least 6 characters.' };

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    if (displayName) await updateProfile(user, { displayName });

    const freedomId = generateFreedomId(user.uid);
    let qrCode = null;
    try { qrCode = await generateQRCode(freedomId); } catch(e) { }

    const userData = {
      uid: user.uid, email: user.email,
      displayName: displayName || email.split('@')[0],
      role,
      createdAt: new Date().toISOString(),
      points: 0, freedomId, qrCode,
      badges: [{ name: 'Freedom Starter', icon: 'fa-flag', unlockedAt: new Date().toISOString() }],
      stamps: [], level: 1, xp: 0, streak: 0,
      activityHistory: [{ label: 'Account created', time: new Date().toISOString(), details: 'Welcome to Freedom 250!' }]
    };

    await setDoc(doc(db, 'users', user.uid), userData);
    currentUser = { ...userData };
    authCallbacks.forEach(cb => cb(currentUser, true));
    return { success: true, user: currentUser };

  } catch (err) {
    console.error('[Auth] signUp error:', err);
    let msg = 'Registration failed. Please try again.';
    if (err.code === 'auth/email-already-in-use') msg = 'Email already registered.';
    else if (err.code === 'auth/weak-password')   msg = 'Password is too weak.';
    else if (err.code === 'auth/invalid-email')   msg = 'Invalid email address.';
    return { success: false, error: msg };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  SIGN IN
// ─────────────────────────────────────────────────────────────────────────────
export async function signIn(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const userDocRef = doc(db, 'users', user.uid);
    const userDoc    = await getDoc(userDocRef);
    const storedRole = userDoc.exists() ? (userDoc.data().role || 'participant') : 'participant';

    currentUser = {
      uid:         user.uid,
      email:       user.email,
      displayName: user.displayName || (userDoc.exists() ? userDoc.data().displayName : user.email.split('@')[0]),
      role:        storedRole,
      ...((userDoc.exists() && userDoc.data()) || {})
    };
    authCallbacks.forEach(cb => cb(currentUser, true));
    return { success: true, user: currentUser };

  } catch (err) {
    console.error('[Auth] signIn error:', err);
    let msg = 'Login failed. Please try again.';
    if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') msg = 'Invalid email or password.';
    else if (err.code === 'auth/too-many-requests') msg = 'Too many attempts. Try later.';
    return { success: false, error: msg };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  RESET PASSWORD
// ─────────────────────────────────────────────────────────────────────────────
export async function resetPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  GOOGLE SIGN-IN
// ─────────────────────────────────────────────────────────────────────────────
export async function signInWithGoogle() {
  try {
    const provider = new GoogleAuthProvider();
    // Ensure this is triggered directly by a user gesture
    const userCredential = await signInWithPopup(auth, provider);
    const user = userCredential.user;

    const userDocRef = doc(db, 'users', user.uid);
    const userDoc    = await getDoc(userDocRef);

    let userData;
    let isNewUser = false;

    if (!userDoc.exists()) {
      const freedomId = generateFreedomId(user.uid);
      let qrCode = null;
      try { qrCode = await generateQRCode(freedomId); } catch(e) {}

      userData = {
        uid: user.uid, email: user.email,
        displayName: user.displayName || user.email.split('@')[0],
        role: ROLES.PARTICIPANT, // Default to participant
        createdAt: new Date().toISOString(),
        points: 0, freedomId, qrCode,
        badges: [{ name: 'Freedom Starter', icon: 'fa-flag', unlockedAt: new Date().toISOString() }],
        stamps: [], level: 1, xp: 0, streak: 0,
        activityHistory: [{ label: 'Signed in with Google', time: new Date().toISOString(), details: 'Welcome to Freedom 250!' }]
      };
      await setDoc(userDocRef, userData);
      isNewUser = true;
    } else {
      userData = userDoc.data();
      if (!userData.qrCode) {
        const freedomId = userData.freedomId || generateFreedomId(user.uid);
        try {
          const qrCode = await generateQRCode(freedomId);
          userData.qrCode = qrCode;
          await updateDoc(userDocRef, { qrCode, freedomId });
        } catch(e) {}
      }
    }

    currentUser = { uid: user.uid, ...userData };
    authCallbacks.forEach(cb => cb(currentUser, true));
    return { success: true, user: currentUser, isNewUser };

  } catch (err) {
    console.error('[Auth] Google sign-in error:', err);
    let msg = 'Google sign in failed.';
    if (err.code === 'auth/popup-blocked') msg = 'Sign-in popup was blocked by your browser. Please allow popups for this site.';
    if (err.code === 'auth/cancelled-popup-request') msg = 'Sign-in was cancelled.';
    return { success: false, error: msg };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  SIGN OUT
// ─────────────────────────────────────────────────────────────────────────────
export async function signOutUser() {
  try {
    await signOut(auth);
    currentUser = null;
    authCallbacks.forEach(cb => cb(null, false));
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export function onAuthStateChange(callback) {
  authCallbacks.push(callback);
  if (currentUser !== null) callback(currentUser, true);
}

export function getDashboardPath(user) {
  if (!user) return 'login.html';
  switch (user.role) {
    case ROLES.ADMIN:      return 'dashboard-admin.html';
    case ROLES.ORGANIZER:  return 'dashboard-admin.html';
    case ROLES.BOOTH_ADMIN:return 'dashboard-booth-admin.html';
    case ROLES.VOLUNTEER:  return 'dashboard-volunteer.html';
    default:               return 'dashboard-participant.html';
  }
}

export async function guardDashboard(requiredRoles) {
  const user = currentUser;
  if (!user) {
    window.location.replace('login.html');
    return false;
  }
  if (requiredRoles && !validateRoleAccess(user.role, requiredRoles)) {
    window.location.replace(getDashboardPath(user));
    return false;
  }
  return true;
}