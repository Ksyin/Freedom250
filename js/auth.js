// js/auth.js - Fixed with better error logging
export const ROLES = {
  PARTICIPANT: 'participant',
  VOLUNTEER: 'volunteer',
  BOOTH_ADMIN: 'booth_admin',
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

            currentUser = {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || userData.displayName || user.email.split('@')[0],
              role: userData.role || ROLES.PARTICIPANT,
              points: userData.points || 0,
              events: userData.events || [],
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
    console.log("Attempting sign up for:", email);

    const { auth, db, doc, setDoc } = await import('./firebase-config.js');
    const { createUserWithEmailAndPassword, updateProfile } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");

    // Validate inputs
    if (!email || !password) {
      return { success: false, error: 'Email and password are required' };
    }
    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' };
    }

    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log("User created in Auth:", user.uid);

    // Update profile with display name
    if (displayName) {
      await updateProfile(user, { displayName });
    }

    // Create user document in Firestore
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
    console.log("User document created in Firestore");

    currentUser = userData;
    authCallbacks.forEach(cb => cb(currentUser, true));

    return { success: true, user: userData };
  } catch (error) {
    console.error('Sign up error DETAILS:', error.code, error.message);

    let errorMessage = error.message;
    if (error.code === 'auth/email-already-in-use') {
      errorMessage = 'This email is already registered. Please sign in instead.';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Please enter a valid email address.';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'Password should be at least 6 characters.';
    } else if (error.code === 'auth/operation-not-allowed') {
      errorMessage = 'Email/Password sign up is not enabled. Please enable it in Firebase Console.';
    } else if (error.code === 'auth/network-request-failed') {
      errorMessage = 'Network error. Please check your internet connection.';
    }

    return { success: false, error: errorMessage };
  }
}

export async function signIn(email, password) {
  try {
    console.log("Attempting sign in for:", email);

    const { auth } = await import('./firebase-config.js');
    const { signInWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");

    if (!email || !password) {
      return { success: false, error: 'Email and password are required' };
    }

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log("Sign in successful:", userCredential.user.email);

    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error('Sign in error DETAILS:', error.code, error.message);

    let errorMessage = error.message;
    if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      errorMessage = 'Invalid email or password. Please try again.';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Please enter a valid email address.';
    } else if (error.code === 'auth/user-disabled') {
      errorMessage = 'This account has been disabled.';
    } else if (error.code === 'auth/network-request-failed') {
      errorMessage = 'Network error. Please check your internet connection.';
    }

    return { success: false, error: errorMessage };
  }
}

export async function signInWithGoogle() {
  try {
    console.log("Attempting Google sign in");

    const { auth, db, doc, getDoc, setDoc } = await import('./firebase-config.js');
    const { signInWithPopup, GoogleAuthProvider } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");

    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    const user = userCredential.user;
    console.log("Google sign in successful:", user.email);

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
        teamName: null,
        teamColor: null,
        qrCode: `freedom250_${user.uid}`
      };
      await setDoc(userDocRef, userData);
      console.log("Created Firestore document for Google user");
    } else {
      userData = userDoc.data();
    }

    currentUser = { uid: user.uid, ...userData };
    authCallbacks.forEach(cb => cb(currentUser, true));
    return { success: true, user: currentUser };
  } catch (error) {
    console.error('Google sign in error DETAILS:', error.code, error.message);
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
    console.log("User signed out");
    return { success: true };
  } catch (error) {
    console.error('Sign out error:', error);
    return { success: false, error: error.message };
  }
}

export function onAuthStateChange(callback) {
  authCallbacks.push(callback);
  if (currentUser !== null) {
    callback(currentUser, true);
  }
}