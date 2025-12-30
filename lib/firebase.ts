// lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { initializeAuth } from 'firebase/auth';
// @ts-ignore - getReactNativePersistence is available in RN builds of Firebase
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getReactNativePersistence } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyAnieduPd1HS2uMr0_bpTQk8VO1zU9hxf8",
  authDomain: "your-app.firebaseapp.com",
  projectId: "tttt-ed355",
  messagingSenderId: "636642925982",
  appId: "1:636642925982:android:52bad232bfd3bc75e08a8f",
  firebaseurl: "https://tttt-ed355-default-rtdb.asia-southeast1.firebasedatabase.app",
  databaseURL: "https://tttt-ed355-default-rtdb.asia-southeast1.firebasedatabase.app"
};

const app = initializeApp(firebaseConfig);
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});
export const database = getDatabase(app);
