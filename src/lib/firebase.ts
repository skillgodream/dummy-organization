import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyATkUltMCc3oFO_bXkuRgR5JcqMdF7mn7Q",
  authDomain: "gen-lang-client-0050723424.firebaseapp.com",
  projectId: "gen-lang-client-0050723424",
  storageBucket: "gen-lang-client-0050723424.firebasestorage.app",
  messagingSenderId: "1007087151680",
  appId: "1:1007087151680:web:6c5df791dcbc0cb1e44da5"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, "ai-studio-organizationsimu-69feac0c-7d69-45d3-93fa-c069f1001ea5");
