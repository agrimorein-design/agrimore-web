import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { doc, getDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { UserData } from '../services/auth';

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  needsOnboarding: boolean;
  refreshUserData: () => Promise<void>;
  setUserData: (data: UserData | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  needsOnboarding: false,
  refreshUserData: async () => {},
  setUserData: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  const refreshUserData = async () => {
    if (user) {
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as UserData;
        setUserData(data);
        setNeedsOnboarding(data.profileComplete === false);
      }
    }
  };

  useEffect(() => {
    let unsubsData: Unsubscribe | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser: any) => {
      setUser(currentUser);
      if (currentUser) {
        // Real-time listener instead of one-time fetch!
        unsubsData = onSnapshot(
          doc(db, 'users', currentUser.uid),
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data() as UserData;
              setUserData(data);
              setNeedsOnboarding(data.profileComplete === false);
            } else {
              setUserData(null);
              setNeedsOnboarding(false);
            }
            setLoading(false);
          },
          (err) => {
            console.error('Error listening to user data:', err);
            setLoading(false);
          }
        );
      } else {
        setUserData(null);
        setNeedsOnboarding(false);
        setLoading(false);
        if (unsubsData) unsubsData();
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubsData) unsubsData();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, userData, loading, needsOnboarding, refreshUserData, setUserData }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
