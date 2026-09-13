import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeFirestore, getFirestore, setLogLevel } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyATkUltMCc3oFO_bXkuRgR5JcqMdF7mn7Q",
  authDomain: "gen-lang-client-0050723424.firebaseapp.com",
  projectId: "gen-lang-client-0050723424",
  storageBucket: "gen-lang-client-0050723424.firebasestorage.app",
  messagingSenderId: "1007087151680",
  appId: "1:1007087151680:web:6c5df791dcbc0cb1e44da5"
};

// Silence internal gRPC idle stream warnings
setLogLevel('silent');

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const databaseId = "ai-studio-organizationsimu-69feac0c-7d69-45d3-93fa-c069f1001ea5";

let dbInstance;
try {
  dbInstance = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
    ignoreUndefinedProperties: true,
  }, databaseId);
} catch {
  dbInstance = getFirestore(app, databaseId);
}

export const db = dbInstance;
