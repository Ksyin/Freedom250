// js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  initializeAuth,
  browserLocalPersistence,
  indexedDBLocalPersistence,
  browserSessionPersistence
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
  onSnapshot,
  arrayUnion,
  arrayRemove,
  increment,
  serverTimestamp,
  writeBatch,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBvuocYvCgMRliZoTbMGS6jz0CloMrRT1M",
  authDomain: "americam-spaces.firebaseapp.com",
  projectId: "americam-spaces",
  storageBucket: "americam-spaces.firebasestorage.app",
  messagingSenderId: "458108047807",
  appId: "1:458108047807:web:92090f4b37bdc2b7c6d10a",
  measurementId: "G-L1VZQR8XQ1"
};

const app = initializeApp(firebaseConfig);

let auth;
try {
  auth = initializeAuth(app, {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence]
  });
} catch (e) {
  auth = getAuth(app);
}

const db = getFirestore(app);

try {
  enableIndexedDbPersistence(db);
} catch (err) {
  if (err.code === 'failed-precondition') {
    console.log('Multiple tabs open, persistence enabled in one tab only.');
  } else if (err.code === 'unimplemented') {
    console.log('Browser does not support persistence');
  }
}

const storage = getStorage(app);

export {
  app,
  auth,
  db,
  storage,
  ref,
  uploadBytes,
  getDownloadURL,
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
  onSnapshot,
  arrayUnion,
  arrayRemove,
  increment,
  serverTimestamp,
  writeBatch,
  Timestamp
};