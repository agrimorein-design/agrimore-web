/**
 * Quick utility to promote a user to admin role.
 * Call makeAdmin() from browser console or import in a component.
 */
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './config';

export async function makeAdmin(email: string, password: string) {
  try {
    console.log('🔐 Signing in as', email, '...');
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;
    console.log('✅ Signed in! UID:', uid);

    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      // User doc exists — update role to admin
      await updateDoc(userRef, { role: 'admin' });
      console.log('✅ Updated existing user doc → role: admin');
    } else {
      // User doc missing — create it
      await setDoc(userRef, {
        uid,
        name: email.split('@')[0],
        email,
        phone: '',
        role: 'admin',
        addresses: [],
        defaultAddress: null,
        location: null,
        createdAt: new Date().toISOString(),
      });
      console.log('✅ Created new user doc with role: admin');
    }

    console.log('🎉 Done! User is now admin. Reload the app to see admin portal.');
    return uid;
  } catch (err: any) {
    console.error('❌ Error:', err.message);
    throw err;
  }
}

// Attach to window for browser console access
if (typeof window !== 'undefined') {
  (window as any).makeAdmin = makeAdmin;
}
