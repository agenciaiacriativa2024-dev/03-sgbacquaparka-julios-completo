// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-storage.js";
import { getFunctions } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-functions.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCmdAtBmNaJAEJEiU6QfoqdwOUa7vhL8dk",
  authDomain: "sgbacquapark-julios.firebaseapp.com",
  projectId: "sgbacquapark-julios",
  storageBucket: "sgbacquapark-julios.appspot.com",
  messagingSenderId: "447883532999",
  appId: "1:447883532999:web:e40cb22f3465538038bce2",
  measurementId: "G-QDYMW2SDMM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
