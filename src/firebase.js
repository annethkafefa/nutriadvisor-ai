import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  authDomain: "nutriadvisor-c11da.firebaseapp.com",
  databaseURL: "https://nutriadvisor-c11da-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "nutriadvisor-c11da",

  // Add these later from Firebase console:
   // Add these later from Firebase console:
  const firebaseConfig = {
  apiKey: "AIzaSyAAjfl5AXKTUYoSD1vEfZy4Tpp6ylhEodo",
  authDomain: "nutriadvisor-c11da.firebaseapp.com",
  databaseURL: "https://nutriadvisor-c11da-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "nutriadvisor-c11da",
  storageBucket: "nutriadvisor-c11da.firebasestorage.app",
  messagingSenderId: "704483302777",
  appId: "1:704483302777:web:9e78dc370e176ede3a63a8"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);