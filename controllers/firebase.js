// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC57iz2LCjXDEO2N64AkxZuU3I1j6E_GIc",
  authDomain: "co2calculation.firebaseapp.com",
  projectId: "co2calculation",
  storageBucket: "co2calculation.appspot.com",
  messagingSenderId: "924723804035",
  appId: "1:924723804035:web:8ba1f7d3ab62e2fdb168b6",
  measurementId: "G-5V0XYF7G7V"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);