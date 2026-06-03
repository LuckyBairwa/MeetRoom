import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  UserCredential,
} from 'firebase/auth';

import { auth } from '../config/firebase';

export const signUp = async (
  email: string,
  password: string,
): Promise<UserCredential> => {
  return await createUserWithEmailAndPassword(auth, email, password);
};

export const login = async (
  email: string,
  password: string, 
): Promise<UserCredential> => {
  return await signInWithEmailAndPassword(auth, email, password);
};

export const logout = async () => {
  return await signOut(auth);
};
