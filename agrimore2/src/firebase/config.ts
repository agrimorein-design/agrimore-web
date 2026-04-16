import { initializeApp, getApp, getApps } from "firebase/app";
// @ts-ignore
import { getAuth, initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

// Conditionally initialize Auth to prevent persistence/login issues on mobile
let auth: any;
if (!getApps().length || !app) {
  auth = getAuth();
} else {
  // If we have just initialized it or getting it
  try {
    if (Platform.OS === 'web') {
      auth = getAuth(app);
    } else {
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage)
      });
    }
  } catch (e: any) {
    if (e.code === 'auth/already-initialized') {
      auth = getAuth(app);
    } else {
      auth = getAuth(app);
    }
  }
}

const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
