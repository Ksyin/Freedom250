// Firebase Configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  initializeAuth, 
  browserLocalPersistence,
  connectAuthEmulator
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getFirestore,
  enableIndexedDbPersistence,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  endBefore,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  increment,
  serverTimestamp,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// YOUR ACTUAL FIREBASE CONFIGURATION
const firebaseConfig = {
  apiKey: "AIzaSyBvuocYvCgMRliZoTbMGS6jz0CloMrRT1M",
  authDomain: "americam-spaces.firebaseapp.com",
  projectId: "americam-spaces",
  storageBucket: "americam-spaces.firebasestorage.app",
  messagingSenderId: "458108047807",
  appId: "1:458108047807:web:92090f4b37bdc2b7c6d10a",
  measurementId: "G-L1VZQR8XQ1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with persistence
let auth;
try {
  auth = initializeAuth(app, {
    persistence: browserLocalPersistence
  });
} catch (e) {
  auth = getAuth(app);
}

// Initialize Firestore
const db = getFirestore(app);

// Enable offline persistence (optional - helps with performance)
try {
  enableIndexedDbPersistence(db);
} catch (err) {
  if (err.code === 'failed-precondition') {
    console.log('Multiple tabs open, persistence enabled in one tab only.');
  } else if (err.code === 'unimplemented') {
    console.log('Browser does not support persistence');
  }
}

// Initialize Storage
const storage = getStorage(app);

// Re-export Firestore functions
export {
  app,
  auth,
  db,
  storage,
  getAuth,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  endBefore,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  increment,
  serverTimestamp,
  writeBatch
};