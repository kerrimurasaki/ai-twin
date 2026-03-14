import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  sendSignInLinkToEmail, 
  isSignInWithEmailLink, 
  signInWithEmailLink 
} from "firebase/auth";

// TODO: Replace with your actual Firebase config from the Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyDohQn5MYCE2QlP5iqxuhNgRqY4orn_PrM",
  authDomain: "speakmesh.firebaseapp.com",
  projectId: "speakmesh",
  storageBucket: "speakmesh.firebasestorage.app",
  messagingSenderId: "323553047928",
  appId: "1:323553047928:web:1205d491570f828448c48d"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export { 
  sendSignInLinkToEmail, 
  isSignInWithEmailLink, 
  signInWithEmailLink 
};
