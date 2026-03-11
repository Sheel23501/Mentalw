import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
// import { getAnalytics } from "firebase/analytics"; // Analytics import from previous config

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional

//old api

// const firebaseConfig = {
//   apiKey: "AIzaSyBOiqVYf3CZtogGennMpnS6VW8rr4xnThk",
//   authDomain: "truecare-bd5db.firebaseapp.com",
//   projectId: "truecare-bd5db",
//   storageBucket: "truecare-bd5db.firebasestorage.app",
//   messagingSenderId: "492969953961",
//   appId: "1:492969953961:web:6f4852d53f266060e637b8",
//   measurementId: "G-1E62YVH4HK"
// };


//new api key:

const firebaseConfig = {
  apiKey: "AIzaSyD3jwJgKyOFc2ypsHkJK9TiUvSx6TPA_xA",
  authDomain: "trucare-76365.firebaseapp.com",
  databaseURL: "https://trucare-76365-default-rtdb.firebaseio.com",
  projectId: "trucare-76365",
  storageBucket: "trucare-76365.firebasestorage.app",
  messagingSenderId: "900286609052",
  appId: "1:900286609052:web:0e8f8820c7c5645c309f59",
  measurementId: "G-ZMC4N9PLZC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
// const analytics = getAnalytics(app); // Analytics initialization from previous config

export default app; 