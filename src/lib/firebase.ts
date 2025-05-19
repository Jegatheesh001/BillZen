
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional

// --- BEGIN DIAGNOSTIC CHECK ---
// This check helps confirm if the API key environment variable is being loaded.
// The actual 'auth/invalid-api-key' error from Firebase can still occur if the key is present but incorrect.
if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
  console.error(
    "CRITICAL SETUP ERROR: Firebase API Key (NEXT_PUBLIC_FIREBASE_API_KEY) is not found in environment variables. " +
    "Please ensure that this variable is correctly set in your .env.local file " +
    "and that you have RESTARTED your development server after creating or modifying the .env.local file. " +
    "Example: NEXT_PUBLIC_FIREBASE_API_KEY=\"AIzaSyYOUR_KEY_HERExxxx\""
  );
}
// --- END DIAGNOSTIC CHECK ---

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
// Note: The Firebase SDK will throw an error if firebaseConfig.apiKey is undefined or invalid.
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
