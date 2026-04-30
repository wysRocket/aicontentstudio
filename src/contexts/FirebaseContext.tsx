import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../firebase';
import { createUserProfileIfNotExists } from '../lib/firestore';

interface FirebaseContextType {
  user: User | null;
  isAuthReady: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (name: string, email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType | null>(null);

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);

      if (currentUser) {
        await createUserProfileIfNotExists(
          currentUser.uid,
          currentUser.email,
          currentUser.displayName,
          currentUser.photoURL
        );
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Error signing in with email/password', error);
      throw error;
    }
  };

  const signUpWithEmail = async (name: string, email: string, password: string) => {
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      const trimmedName = name.trim();

      if (trimmedName) {
        await updateProfile(credential.user, { displayName: trimmedName });
        await createUserProfileIfNotExists(
          credential.user.uid,
          credential.user.email,
          trimmedName,
          credential.user.photoURL
        );
      }
    } catch (error) {
      console.error('Error signing up with email/password', error);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Error signing in with Google', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Error signing out', error);
      throw error;
    }
  };

  return (
    <FirebaseContext.Provider value={{ user, isAuthReady, signInWithEmail, signUpWithEmail, signInWithGoogle, signOut }}>
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
}
