// js/auth.js - Working Authentication
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

            let userData = { role: ROLES.PARTICIPANT, points: 0 };
            if (userDoc.exists()) {
              userData = userDoc.data();
            }

            currentUser = {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || userData.displayName || user.email.split('@')[0],
              role: userData.role || ROLES.PARTICIPANT,
              points: userData.points || 0,
              ...userData
            };

            console.log("User loaded:", currentUser.email);
            authCallbacks.forEach(cb => cb(currentUser, true));
            resolve(currentUser);
          } catch (error) {
            console.error('Error fetching user data:', error);
            currentUser = {
              uid: user.uid,
              email: user.email,
              displayName: user.email.split('@')[0],
              role: ROLES.PARTICIPANT,
              points: 0
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
    if (password.length < 6) return { success: false, error: 'Password must be at least 6 characters' };

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    if (displayName) {
      await updateProfile(user, { displayName });
    }

    const userData = {
      uid: user.uid,
      email: user.email,
      displayName: displayName || email.split('@')[0],
      role: role,
      teamName: teamName,
      teamColor: teamColor,
      createdAt: new Date().toISOString(),
      points: 0,
      qrCode: `freedom250_${user.uid}`
    };

    await setDoc(doc(db, 'users', user.uid), userData);
    currentUser = userData;
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
  if (!user) return '/';
  switch (user.role) {
    case ROLES.ADMIN: return '/admin';
    case ROLES.ORGANIZER: return '/organizer';
    case ROLES.BOOTH_ADMIN: return '/booth-admin';
    case ROLES.VOLUNTEER: return '/volunteer';
    default: return '/participant';
  }
}