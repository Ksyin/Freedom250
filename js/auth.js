// js/auth.js - Fixed with proper role handling
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
    const { auth, db, doc, getDoc } = await import('./firebase-config.js');
    const { onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");

    return new Promise((resolve) => {
      onAuthStateChanged(auth, async (user) => {
        console.log("Auth state changed:", user ? user.email : "No user");

        if (user) {
          try {
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);

            let userData = { role: ROLES.PARTICIPANT, points: 0, events: [] };
            if (userDoc.exists()) {
              userData = userDoc.data();
            }

            const userRole = userData.role || ROLES.PARTICIPANT;

            currentUser = {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || userData.displayName || user.email.split('@')[0],
              role: userRole,
              points: userData.points || 0,
              events: userData.events || [],
              teamName: userData.teamName || null,
              teamColor: userData.teamColor || null,
              qrCode: userData.qrCode || `freedom250_${user.uid}`,
              ...userData
            };

            console.log("User loaded:", currentUser.email, "Role:", currentUser.role);
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
              events: []
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

export async function signUp(email, password, displayName = '', role = ROLES.PARTICIPANT, teamName = null, teamColor = null) {
  try {
    const { auth, db, doc, setDoc } = await import('./firebase-config.js');
    const { createUserWithEmailAndPassword, updateProfile } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");

    if (!email || !password) return { success: false, error: 'Email and password are required' };

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    if (displayName) await updateProfile(user, { displayName });

    const userData = {
      uid: user.uid,
      email: user.email,
      displayName: displayName || email.split('@')[0],
      role: role,
      createdAt: new Date().toISOString(),
      points: 0,
      events: [],
      badges: [],
      teamName: teamName || null,
      teamColor: teamColor || null,
      qrCode: `freedom250_${user.uid}`
    };

    await setDoc(doc(db, 'users', user.uid), userData);
    currentUser = { ...userData };
    authCallbacks.forEach(cb => cb(currentUser, true));

    return { success: true, user: currentUser };
  } catch (error) {
    console.error('Sign up error:', error);
    return { success: false, error: error.message };
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
    return { success: false, error: error.message };
  }
}

export async function signInWithGoogle() {
  try {
    const { auth, db, doc, getDoc, setDoc } = await import('./firebase-config.js');
    const { signInWithPopup, GoogleAuthProvider } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");

    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    const user = userCredential.user;

    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    let userData;
    if (!userDoc.exists()) {
      userData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email.split('@')[0],
        role: ROLES.PARTICIPANT,
        createdAt: new Date().toISOString(),
        points: 0,
        events: [],
        badges: [],
        qrCode: `freedom250_${user.uid}`
      };
      await setDoc(userDocRef, userData);
    } else {
      userData = userDoc.data();
    }

    currentUser = { uid: user.uid, ...userData };
    authCallbacks.forEach(cb => cb(currentUser, true));
    return { success: true, user: currentUser };
  } catch (error) {
    console.error('Google sign in error:', error);
    return { success: false, error: error.message };
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
  if (!user) return '/';
  switch (user.role) {
    case ROLES.ADMIN: return '/admin';
    case ROLES.ORGANIZER: return '/organizer';
    case ROLES.BOOTH_ADMIN: return '/booth-admin';
    case ROLES.VOLUNTEER: return '/volunteer';
    default: return '/participant';
  }
}