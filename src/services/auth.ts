import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, setDoc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { Platform } from "react-native";
import { auth, db } from "../firebase/config";

export interface UserData {
  uid: string;
  name: string;
  email: string;
  phone: string;
  role: 'user' | 'admin' | 'seller';
  addresses: any[];
  defaultAddress: string | null;
  location: {
    lat: number;
    lng: number;
  } | null;
  createdAt: string;
  profileComplete: boolean;
  photoURL?: string;
  walletBalance?: number;
  coinsBalance?: number;
  referralCode?: string;
  appliedReferralCode?: string | null;
  isReferralRewarded?: boolean;
}

const generateReferralCode = (uid: string) => {
  return ('AGRI' + uid.substring(0, 4) + Math.random().toString(36).substring(2, 4)).toUpperCase();
};

// ==================== EMAIL AUTH ====================

export const registerUser = async (email: string, password: string, name: string, phone: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const userData: UserData = {
      uid: user.uid,
      name,
      email,
      phone,
      role: email.toLowerCase() === 'srieswaran22@gmail.com' ? 'admin' : 'user',
      addresses: [],
      defaultAddress: null,
      location: null,
      createdAt: new Date().toISOString(),
      profileComplete: true,
      referralCode: generateReferralCode(user.uid),
    };

    await setDoc(doc(db, "users", user.uid), userData);
    return { user, userData };
  } catch (error: any) {
    console.error('Register error:', error.code, error.message);
    throw new Error(getFirebaseErrorMessage(error.code));
  }
};

export const loginUser = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userDocRef = doc(db, "users", userCredential.user.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      let data = userDocSnap.data() as UserData;
      // Auto-promote hardcoded admin email if missing role
      if (email.toLowerCase() === 'srieswaran22@gmail.com' && data.role !== 'admin') {
        data.role = 'admin';
        await setDoc(userDocRef, { role: 'admin' }, { merge: true });
      }
      return { user: userCredential.user, userData: data };
    } else {
      // User exists in Auth but not Firestore — create doc
      const userData: UserData = {
        uid: userCredential.user.uid,
        name: userCredential.user.displayName || '',
        email: userCredential.user.email || email,
        phone: '',
        role: email.toLowerCase() === 'srieswaran22@gmail.com' ? 'admin' : 'user',
        addresses: [],
        defaultAddress: null,
        location: null,
        createdAt: new Date().toISOString(),
        profileComplete: false,
        referralCode: generateReferralCode(userCredential.user.uid),
      };
      await setDoc(userDocRef, userData);
      return { user: userCredential.user, userData };
    }
  } catch (error: any) {
    console.error('Login error:', error.code, error.message);
    throw new Error(getFirebaseErrorMessage(error.code));
  }
};

// ==================== GOOGLE AUTH ====================

const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    if (Platform.OS !== 'web') {
      throw new Error('Google Sign-In is temporarily available only on the Website. Please use Email/Password on the Mobile App.');
    }

    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    const emailStr = user.email || '';

    // Check if user doc already exists in Firestore
    const userDocRef = doc(db, "users", user.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      let data = userDocSnap.data() as UserData;
      if (emailStr.toLowerCase() === 'srieswaran22@gmail.com' && data.role !== 'admin') {
        data.role = 'admin';
        await setDoc(userDocRef, { role: 'admin' }, { merge: true });
      }
      return {
        user,
        userData: data,
        isNewUser: false,
      };
    } else {
      const partialData: UserData = {
        uid: user.uid,
        name: user.displayName || '',
        email: emailStr,
        phone: '',
        role: emailStr.toLowerCase() === 'srieswaran22@gmail.com' ? 'admin' : 'user',
        addresses: [],
        defaultAddress: null,
        location: null,
        createdAt: new Date().toISOString(),
        profileComplete: false,
        photoURL: user.photoURL || '',
        referralCode: generateReferralCode(user.uid),
      };

      await setDoc(userDocRef, partialData);
      return {
        user,
        userData: partialData,
        isNewUser: true,
      };
    }
  } catch (error: any) {
    console.error('Google Sign-In error:', error.code || error.message);
    throw new Error(error.code ? getFirebaseErrorMessage(error.code) : error.message);
  }
};

// Complete the profile after Google onboarding
export const completeUserProfile = async (
  uid: string,
  name: string,
  phone: string,
  address: string,
  location: { lat: number; lng: number } | null
) => {
  try {
    const userDocRef = doc(db, "users", uid);
    await setDoc(userDocRef, {
      name,
      phone,
      defaultAddress: address,
      addresses: address ? [{ address, location, isDefault: true }] : [],
      location,
      profileComplete: true,
    }, { merge: true });

    const snap = await getDoc(userDocRef);
    return snap.data() as UserData;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// ==================== RESET PASSWORD ====================

export const resetPasswordWithVerification = async (email: string, phone: string) => {
  try {
    const q = query(collection(db, "users"), where("email", "==", email));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      throw new Error("No account found with this email.");
    }
    
    const userData = snapshot.docs[0].data() as UserData;
    if (userData.phone !== phone) {
      throw new Error("Phone number does not match our records.");
    }
    
    await sendPasswordResetEmail(auth, email);
    return true;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// ==================== LOGOUT ====================

export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// ==================== ERROR MESSAGES ====================

function getFirebaseErrorMessage(code: string): string {
  switch (code) {
    case 'auth/invalid-email': return 'Invalid email address format.';
    case 'auth/user-disabled': return 'This account has been disabled.';
    case 'auth/user-not-found': return 'No account found with this email. Please register first.';
    case 'auth/wrong-password': return 'Incorrect password. Please try again.';
    case 'auth/invalid-credential': return 'Invalid credentials. Please check your email and password, or register a new account.';
    case 'auth/email-already-in-use': return 'This email is already registered. Try logging in.';
    case 'auth/weak-password': return 'Password should be at least 6 characters.';
    case 'auth/too-many-requests': return 'Too many attempts. Please try again later.';
    case 'auth/popup-blocked': return 'Sign-in popup was blocked. Please allow popups for this site.';
    case 'auth/popup-closed-by-user': return 'Sign-in popup was closed. Please try again.';
    case 'auth/cancelled-popup-request': return 'Multiple popup requests. Please try again.';
    case 'auth/network-request-failed': return 'Network error. Please check your internet connection.';
    case 'auth/unauthorized-domain': return 'This domain is not authorized for sign-in. Please add it in Firebase Console → Authentication → Settings → Authorized domains.';
    default: return `Authentication error (${code}). Please try again.`;
  }
}
