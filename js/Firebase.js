// js/firebase.js

// 1. Import fungsi-fungsi yang dibutuhkan dari Firebase CDN (Modular SDK)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// 2. Konfigurasi Firebase milikmu
const firebaseConfig = {
  apiKey: "AIzaSyCTbpGwmRh07VsW8jGcPSZl508nuUDgdc0",
  authDomain: "simplymeds-85cbe.firebaseapp.com",
  projectId: "simplymeds-85cbe",
  storageBucket: "simplymeds-85cbe.firebasestorage.app",
  messagingSenderId: "79277820611",
  appId: "1:79277820611:web:ebd23fc1f9b800800c3076"
};

// 3. Inisialisasi Firebase
const app = initializeApp(firebaseConfig);

// 4. Inisialisasi layanan yang akan kita gunakan (Firestore & Auth)
// Kita export agar bisa dipanggil di file lain seperti pos.js
export const db = getFirestore(app);
export const auth = getAuth(app);