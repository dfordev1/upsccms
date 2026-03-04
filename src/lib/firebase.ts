import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB7Z6DULadJLyucobfxr1W6nE5SEPDEh90",
  authDomain: "prepcms-dd87c.firebaseapp.com",
  projectId: "prepcms-dd87c",
  storageBucket: "prepcms-dd87c.firebasestorage.app",
  messagingSenderId: "412263523570",
  appId: "1:412263523570:web:81c986e4e45c9f705f1c6b"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
