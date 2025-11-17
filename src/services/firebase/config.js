import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD008gFjP299I8NFZAxFvBKA_PS4JnB_Nc",
  authDomain: "edugestor-502c5.firebaseapp.com",
  projectId: "edugestor-502c5",
  storageBucket: "edugestor-502c5.firebasestorage.app",
  messagingSenderId: "364279545874",
  appId: "1:364279545874:web:2e5785f09cce064d3b58cb",
  measurementId: "G-P0NTC653SF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Exportar serviços
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;
