import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDrQIYzWcC1RAaS474r_a9I9caY3cCVTSc",
  authDomain: "agrimore-66a4e.firebaseapp.com",
  databaseURL: "https://agrimore-66a4e-default-rtdb.firebaseio.com",
  projectId: "agrimore-66a4e",
  storageBucket: "agrimore-66a4e.firebasestorage.app",
  messagingSenderId: "1082819024270",
  appId: "1:1082819024270:web:fa2a015928e81bf1e640df",
  measurementId: "G-73B1F06XC3"
};

// Initialize Firebase App (only once)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);

const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
