import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCybmmISxpKhYnjpPA2MqA760v1nyZmPOk",
  authDomain: "financas-familia-f501b.firebaseapp.com",
  projectId: "financas-familia-f501b",
  storageBucket: "financas-familia-f501b.firebasestorage.app",
  messagingSenderId: "914481848825",
  appId: "1:914481848825:web:ca5601544adc2a66a8dd28"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
