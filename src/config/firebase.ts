import {initializeApp} from 'firebase/app';
import {getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import {getFirestore} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';


const firebaseConfig = {
  apiKey: 'AIzaSyB_KbH6oR7kbzZPAkxD0wN3XvFB_e_c8k0',
  authDomain: 'meetroom-f6216.firebaseapp.com',
  projectId: 'meetroom-f6216',
  storageBucket: 'meetroom-f6216.firebasestorage.app',
  messagingSenderId: '934542812712',
  appId: '1:934542812712:android:85b324e209cdb80be5f71d',
};


const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
export const db = getFirestore(app);

export default app;