"use client";

// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC1_KQTG0iCOvQsZ2N7JbMNjG_Zfnzzj68",
  authDomain: "condominio-gestion.firebaseapp.com",
  projectId: "condominio-gestion",
  storageBucket: "condominio-gestion.firebasestorage.app",
  messagingSenderId: "365513058615",
  appId: "1:365513058615:web:36a93045dfb8c7d23e12b2",
  measurementId: "G-7PHGG4Q5N4",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

let analytics = null;
isSupported().then((yes) => {
  if (yes) analytics = getAnalytics(app);
});

export { auth, db, analytics };
