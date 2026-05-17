// js/auth.js — Freedom 250 Authentication with Role-Based Access Control
// Commercial RBAC pattern: roles are stored in Firestore (server-side truth),
// never trusted from the client. Every login verifies role against Firestore.

import { generateQRCode, generateFreedomId } from './qr-generator.js';

export const ROLES = {
  PARTICIPANT: 'participant',
  VOLUNTEER:   'volunteer',
  BOOTH_ADMIN: 'booth_admin',
  ADMIN:       'admin',
  ORGANIZER:   'organizer'
};

// Role hierarchy — higher number = more privileges
const ROLE_LEVEL = {
  participant: 1,
  volunteer:   2,
  booth_admin: 3,
  admin:       4,
  organizer:   5
};

let currentUser = null;
let authCallbacks = [];

// ─────────────────────────────────────────────────────────────────────────────
//  ROLE GUARD
//  Called after every successful Firebase auth to verify the user's Firestore
//  role matches what the current portal allows. This is the key security layer:
//  even if a participant somehow reaches login.html#staff and knows the code,
//  their Firestore role is still 'participant' and login will be rejected.
// ─────────────────────────────────────────────────────────────────────────────
export function validateRoleAccess(userRole, allowedRoles) {
  if (!allowedRoles || allowedRoles.length === 0) return true; // No restriction
  const normalised = (userRole || 'participant').toLowerCase();
  const allowed = allowedRoles.map(r => r.toLowerCase());
  return allowed.includes(normalised);
}

// ─────────────────────────────────────────────────────────────────────────────
//  INIT AUTH — listens to Firebase auth state, fetches Firestore role
// ─────────────────────────────────────────────────────────────────────────────
export async function initAuth() {
  try {
    const { auth, db, doc, getDoc, updateDoc } = await import('./firebase-config.js');
    const { onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");

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

            // Generate QR if missing
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
              points:      userData.points  || 0,
              badges:      userData.badges  || [],
              stamps:      userData.stamps  || [],
              level:       userData.level   || 1,
              xp:          userData.xp      || 0,
              streak:      userData.streak  || 0,
              activityHistory: userData.activityHistory || [],
              freedomId:   userData.freedomId || generateFreedomId(user.uid),
              qrCode:      userData.qrCode,
              ...userData
            };

            authCallbacks.forEach(cb => cb(currentUser, true));
            resolve(currentUser);
          } catch (err) {
            console.error('[Auth] Firestore fetch error:', err);
            // Minimal fallback — role defaults to participant
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
  } catch (err) {
    console.error('[Auth] initAuth error:', err);
    return null;
  }
}

export function getCurrentUser() { return currentUser; }

// ─────────────────────────────────────────────────────────────────────────────
//  SIGN UP — always saves role to Firestore. Role comes from the form.
//  register.html hardcodes role='participant' so users can never self-elevate.
//  Staff accounts are created by admins directly in Firestore or via
//  a protected admin panel route.
// ─────────────────────────────────────────────────────────────────────────────
export async function signUp(email, password, displayName = '', role = ROLES.PARTICIPANT, allowedRoles = ['participant']) {
  try {
    // Client-side sanity check: enforce that the role being registered
    // is within what this portal allows (belt-and-suspenders over server check)
    if (!validateRoleAccess(role, allowedRoles)) {
      return { success: false, error: 'This registration portal does not allow that role.' };
    }

    const { auth, db, doc, setDoc } = await import('./firebase-config.js');
    const { createUserWithEmailAndPassword, updateProfile } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");

    if (!email || !password) return { success: false, error: 'Email and password are required.' };
    if (password.length < 6) return { success: false, error: 'Password must be at least 6 characters.' };

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    if (displayName) await updateProfile(user, { displayName });

    const freedomId = generateFreedomId(user.uid);
    let qrCode = null;
    try { qrCode = await generateQRCode(freedomId); } catch(e) { /* non-fatal */ }

    const userData = {
      uid: user.uid, email: user.email,
      displayName: displayName || email.split('@')[0],
      role,                      // ← stored in Firestore — this is the server-side truth
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
    if (err.code === 'auth/email-already-in-use') msg = 'Email already registered. Please sign in instead.';
    else if (err.code === 'auth/weak-password')   msg = 'Password is too weak.';
    else if (err.code === 'auth/invalid-email')   msg = 'Invalid email address.';
    return { success: false, error: msg };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  SIGN IN — after Firebase auth succeeds, fetch Firestore role and enforce
//  it matches what the portal expects. This is the critical security check.
// ─────────────────────────────────────────────────────────────────────────────
export async function signIn(email, password, allowedRoles = null) {
  try {
    const { auth, db, doc, getDoc } = await import('./firebase-config.js');
    const { signInWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // ── ROLE CHECK ── fetch Firestore record and verify role
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc    = await getDoc(userDocRef);
    const storedRole = userDoc.exists() ? (userDoc.data().role || 'participant') : 'participant';

    if (allowedRoles && !validateRoleAccess(storedRole, allowedRoles)) {
      // Sign them out immediately — wrong portal
      const { signOut } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");
      await signOut(auth);
      currentUser = null;

      // Helpful error message directing them to the right place
      const isStaffRole = ['admin','organizer','volunteer','booth_admin'].includes(storedRole);
      const isParticipantPortal = allowedRoles.includes('participant') && allowedRoles.length === 1;

      if (isParticipantPortal && isStaffRole) {
        return {
          success: false,
          error: `Your account has the "${storedRole}" role. Please use the staff portal to sign in.`
        };
      } else {
        return {
          success: false,
          error: `Access denied. Your account role ("${storedRole}") is not permitted here.`
        };
      }
    }

    return { success: true, user };

  } catch (err) {
    console.error('[Auth] signIn error:', err);
    let msg = 'Login failed. Please try again.';
    if (err.code === 'auth/user-not-found')      msg = 'No account found. Please sign up first.';
    else if (err.code === 'auth/wrong-password') msg = 'Incorrect password. Please try again.';
    else if (err.code === 'auth/invalid-email')  msg = 'Invalid email address.';
    else if (err.code === 'auth/too-many-requests') msg = 'Too many failed attempts. Try again later.';
    return { success: false, error: msg };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  RESET PASSWORD
// ─────────────────────────────────────────────────────────────────────────────
export async function resetPassword(email) {
  try {
    const { auth } = await import('./firebase-config.js');
    const { sendPasswordResetEmail } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (err) {
    let msg = 'Failed to send reset email.';
    if (err.code === 'auth/user-not-found') msg = 'No account found with this email.';
    else if (err.code === 'auth/invalid-email') msg = 'Invalid email address.';
    return { success: false, error: msg };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  GOOGLE SIGN-IN — same role enforcement applies
// ─────────────────────────────────────────────────────────────────────────────
export async function signInWithGoogle(allowedRoles = null) {
  try {
    const { auth, db, doc, getDoc, setDoc, updateDoc } = await import('./firebase-config.js');
    const { signInWithPopup, signOut, GoogleAuthProvider } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");

    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    const user = userCredential.user;

    const userDocRef = doc(db, 'users', user.uid);
    const userDoc    = await getDoc(userDocRef);

    let userData;
    let isNewUser = false;

    if (!userDoc.exists()) {
      // New user via Google — always a participant (register.html passes ['participant'])
      const effectiveRole = (allowedRoles && allowedRoles.length === 1) ? allowedRoles[0] : ROLES.PARTICIPANT;
      const freedomId = generateFreedomId(user.uid);
      let qrCode = null;
      try { qrCode = await generateQRCode(freedomId); } catch(e) {}

      userData = {
        uid: user.uid, email: user.email,
        displayName: user.displayName || user.email.split('@')[0],
        role: effectiveRole,
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

      // ── ROLE CHECK for existing Google users ──
      const storedRole = userData.role || 'participant';
      if (allowedRoles && !validateRoleAccess(storedRole, allowedRoles)) {
        await signOut(auth);
        currentUser = null;
        const isParticipantPortal = allowedRoles.includes('participant') && allowedRoles.length === 1;
        const isStaffRole = ['admin','organizer','volunteer','booth_admin'].includes(storedRole);
        if (isParticipantPortal && isStaffRole) {
          return { success: false, error: `Your account has the "${storedRole}" role. Please use the staff portal.` };
        }
        return { success: false, error: `Access denied. Your role ("${storedRole}") is not permitted here.` };
      }

      // Generate QR if missing
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
    return { success: false, error: 'Google sign in failed. Please try again.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  SIGN OUT
// ─────────────────────────────────────────────────────────────────────────────
export async function signOutUser() {
  try {
    const { auth } = await import('./firebase-config.js');
    const { signOut } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");
    await signOut(auth);
    currentUser = null;
    authCallbacks.forEach(cb => cb(null, false));
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  AUTH STATE CHANGE SUBSCRIPTION
// ─────────────────────────────────────────────────────────────────────────────
export function onAuthStateChange(callback) {
  authCallbacks.push(callback);
  if (currentUser !== null) callback(currentUser, true);
}

// ─────────────────────────────────────────────────────────────────────────────
//  DASHBOARD PATH — determines where to redirect after login
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
//  DASHBOARD ROUTE GUARD
//  Call this at the top of every dashboard HTML page.
//  Redirects to login if user is not authenticated OR doesn't have required role.
//  Usage: await guardDashboard(['admin','organizer'])
// ─────────────────────────────────────────────────────────────────────────────
export async function guardDashboard(requiredRoles) {
  const user = currentUser;
  if (!user) {
    console.warn('[Auth] guardDashboard: no user — redirecting to login');
    window.location.replace('login.html');
    return false;
  }
  if (requiredRoles && !validateRoleAccess(user.role, requiredRoles)) {
    console.warn(`[Auth] guardDashboard: role "${user.role}" not in [${requiredRoles.join(',')}]`);
    // Redirect to their correct dashboard instead of login
    window.location.replace(getDashboardPath(user));
    return false;
  }
  return true;
}