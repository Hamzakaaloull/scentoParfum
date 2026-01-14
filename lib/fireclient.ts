import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDWLVf4VJ9rANvWwxxSuRWQIw6c_JOpA7A",
  authDomain: "scentoparfum-f3ca6.firebaseapp.com",
  projectId: "scentoparfum-f3ca6",
  storageBucket: "scentoparfum-f3ca6.firebasestorage.app",
  messagingSenderId: "712228393478",
  appId: "1:712228393478:web:01e56ca25bbb4cb70d6987"
};

let clientDb: ReturnType<typeof getFirestore> | null = null;

export function getClientFirestore() {
  if (clientDb) return clientDb;
  
  try {
    if (!getApps().length) {
      initializeApp(firebaseConfig);
    }
    clientDb = getFirestore();
    return clientDb;
  } catch (error) {
    console.error("Error initializing Firebase:", error);
    throw error;
  }
}