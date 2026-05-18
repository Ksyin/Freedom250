// js/auth.js - Updated with signup bonus and fixed role routing
// js/auth.js — Freedom 250 Authentication with Role-Based Access Control
import {
  auth, db, doc, getDoc, setDoc, updateDoc, increment, serverTimestamp, collection, query, where, getDocs
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
  ADMIN:       'admin'
};

const SIGNUP_BONUS_POINTS = 100; // Increased bonus for better engagement

let currentUser = null;
let authCallbacks = [];
let authPromise = null;
let isInitialized = false;

// ─────────────────────────────────────────────────────────────────────────────
//  ROLE GUARD - FIXED to prevent incorrect redirects
// ─────────────────────────────────────────────────────────────────────────────
export function validateRoleAccess(userRole, allowedRoles) {
  if (!allowedRoles || allowedRoles.length === 0) return true;

  const normalised = (userRole || ROLES.PARTICIPANT).toLowerCase().replace(/[-_]/g, '');
  const allowed = allowedRoles.map(r => r.toLowerCase().replace(/[-_]/g, ''));

  // Special handling for legacy 'organizer' role mapping to admin
  if (normalised === 'organizer' && allowed.includes('admin')) return true;

  return allowed.includes(normalised);
}

// ─────────────────────────────────────────────────────────────────────────────
//  INIT AUTH
// ─────────────────────────────────────────────────────────────────────────────
export async function initAuth() {
  if (authPromise) return authPromise;

  authPromise = new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc    = await getDoc(userDocRef);

          let userData = {
            role: ROLES.PARTICIPANT,
            points: SIGNUP_BONUS_POINTS,
            badges: [{ name: 'Freedom Starter', icon: 'fa-flag', unlockedAt: new Date().toISOString() }],
            stamps: [],
            tasksCompleted: [],
            challengesCompleted: 0,
            missionsCompleted: 0,
            level: 1,
            xp: SIGNUP_BONUS_POINTS,
            streak: 1,
            scansCount: 0,
            activityHistory: [],
            freedomId: generateFreedomId(user.uid),
            loginStreak: 1,
            lastDailyBonus: new Date().toISOString(),
            redeemedRewards: []
          };

          let isNewUser = false;

          if (userDoc.exists()) {
            userData = { ...userData, ...userDoc.data() };
          } else {
            isNewUser = true;
            userData.signupBonusReceived = true;
            userData.activityHistory = [{
              label: 'Account Created',
              time: new Date().toISOString(),
              details: `Welcome to Freedom 250! +${SIGNUP_BONUS_POINTS} Liberty Coins`
            }];
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

          if (isNewUser) {
            await setDoc(userDocRef, userData);
          }

          currentUser = {
            uid:         user.uid,
            email:       user.email,
            displayName: user.displayName || userData.displayName || user.email.split('@')[0],
            role:        userData.role || ROLES.PARTICIPANT,
            points:      userData.points || SIGNUP_BONUS_POINTS,
            ...userData
          };

          isInitialized = true;
          authCallbacks.forEach(cb => cb(currentUser, true));
          resolve(currentUser);
        } catch (err) {
          console.error('[Auth] Firestore fetch error:', err);
          currentUser = {
            uid: user.uid, email: user.email,
            displayName: user.email.split('@')[0],
            role: ROLES.PARTICIPANT,
            points: SIGNUP_BONUS_POINTS,
            freedomId: generateFreedomId(user.uid)
          };
          isInitialized = true;
          authCallbacks.forEach(cb => cb(currentUser, true));
          resolve(currentUser);
        }
      } else {
        currentUser = null;
        isInitialized = true;
        authCallbacks.forEach(cb => cb(null, false));
        resolve(null);
      }
    });
  });

  return authPromise;
}

export function getCurrentUser() { return currentUser; }

// ─────────────────────────────────────────────────────────────────────────────
//  SIGN UP - Enhanced with bonus points
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
      uid: user.uid,
      email: user.email,
      displayName: displayName || email.split('@')[0],
      role,
      createdAt: serverTimestamp(),
      points: SIGNUP_BONUS_POINTS,
      freedomId,
      qrCode,
      badges: [{ name: 'Freedom Starter', icon: 'fa-flag', unlockedAt: new Date().toISOString() }],
      stamps: [],
      tasksCompleted: [],
      challengesCompleted: 0,
      missionsCompleted: 0,
      level: 1,
      xp: SIGNUP_BONUS_POINTS,
      streak: 1,
      scansCount: 0,
      loginStreak: 1,
      lastDailyBonus: new Date().toISOString(),
      redeemedRewards: [],
      signupBonusReceived: true,
      activityHistory: [{ label: 'Account created', time: new Date().toISOString(), details: `Welcome to Freedom 250! +${SIGNUP_BONUS_POINTS} Liberty Coins` }]
    };

    await setDoc(doc(db, 'users', user.uid), userData);
    currentUser = { ...userData };
    authCallbacks.forEach(cb => cb(currentUser, true));
    return { success: true, user: currentUser, bonusPoints: SIGNUP_BONUS_POINTS };

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
    const storedRole = userDoc.exists() ? (userDoc.data().role || ROLES.PARTICIPANT) : ROLES.PARTICIPANT;
    const userData = userDoc.exists() ? userDoc.data() : {};

    currentUser = {
      uid:         user.uid,
      email:       user.email,
      displayName: user.displayName || userData.displayName || user.email.split('@')[0],
      role:        storedRole,
      points:      userData.points || 0,
      ...userData
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
export async function signInWithGoogle(defaultRole = ROLES.PARTICIPANT) {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

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
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email.split('@')[0],
        role: defaultRole,
        createdAt: serverTimestamp(),
        points: SIGNUP_BONUS_POINTS,
        freedomId,
        qrCode,
        badges: [{ name: 'Freedom Starter', icon: 'fa-flag', unlockedAt: new Date().toISOString() }],
        stamps: [],
        tasksCompleted: [],
        challengesCompleted: 0,
        missionsCompleted: 0,
        level: 1,
        xp: SIGNUP_BONUS_POINTS,
        streak: 1,
        scansCount: 0,
        loginStreak: 1,
        lastDailyBonus: new Date().toISOString(),
        redeemedRewards: [],
        signupBonusReceived: true,
        activityHistory: [{ label: 'Signed in with Google', time: new Date().toISOString(), details: `Welcome to Freedom 250! +${SIGNUP_BONUS_POINTS} Liberty Coins` }]
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
    return { success: true, user: currentUser, isNewUser, bonusPoints: isNewUser ? SIGNUP_BONUS_POINTS : 0 };

  } catch (err) {
    console.error('[Auth] Google sign-in error:', err);
    let msg = 'Google sign in failed.';
    if (err.code === 'auth/popup-blocked') msg = 'Popup blocked! Please allow popups.';
    if (err.code === 'auth/cancelled-popup-request') msg = 'Sign-in cancelled.';
    if (err.code === 'auth/popup-closed-by-user') msg = 'Sign-in closed.';
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
  if (isInitialized) callback(currentUser, currentUser !== null);
}

// FIXED: Correct dashboard routing - prevents booth_admin from being redirected to participant
export function getDashboardPath(user) {
  if (!user) return 'login.html';

  const role = (user.role || ROLES.PARTICIPANT).toLowerCase();

  // Exact role matching for correct dashboard routing
  if (role === 'admin' || role === 'organizer') return 'dashboard-admin.html';
  if (role === 'booth_admin' || role === 'boothadmin') return 'dashboard-booth-admin.html';
  if (role === 'volunteer') return 'dashboard-volunteer.html';

  return 'dashboard-participant.html';
}

export async function guardDashboard(requiredRoles) {
  const user = await initAuth();

  if (!user) {
    window.location.replace('login.html');
    return null;
  }

  if (requiredRoles && !validateRoleAccess(user.role, requiredRoles)) {
    // Redirect to appropriate dashboard based on actual role
    window.location.replace(getDashboardPath(user));
    return null;
  }

  return user;
}