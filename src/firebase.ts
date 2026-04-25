import { initializeApp } from 'firebase/app';
// import { getAnalytics } from "firebase/analytics";
import { initializeUI, requireDisplayName } from '@firebase-oss/ui-core';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';


const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string || '',
  authDomain: "still-grove.firebaseapp.com",
  projectId: "still-grove",
  storageBucket: "still-grove.firebasestorage.app",
  messagingSenderId: "21536437340",
  appId: "1:21536437340:web:24e9856795bd2d65be2299",
  measurementId: "G-JJWJD0DH8X"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get the authentication instance using the modular SDK
export const auth = getAuth(app);

// const analytics = getAnalytics(app);

// Initialize FirebaseUI with the modular SDK
export const ui = initializeUI({
  app,
  behaviors: [requireDisplayName()],
});

// Initialize Firestore database
export const db = getFirestore(app);