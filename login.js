/**
 * Gestionnaire d'authentification complet - Version avec reCAPTCHA
 */

// Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyC3u3QnOPmjhYzRB3YGcgystzVOy00kBP4",
  authDomain: "login-project-a421d.firebaseapp.com",
  projectId: "login-project-a421d",
  storageBucket: "login-project-a421d.appspot.com",
  messagingSenderId: "1028222933596",
  appId: "1:1028222933596:web:9bf788c6d655d71bf06499"
};

// Paramètres
const PASSWORD_MIN_LENGTH = 6;
let auth, db;
let isLoginMode = false;

// Messages d'erreur
const ERROR_MESSAGES = {
  'auth/invalid-email': 'Email invalide',
  'auth/user-not-found': 'Compte non trouvé',
  'auth/wrong-password': 'Mot de passe incorrect',
  'auth/email-already-in-use': 'Email déjà utilisé',
  'auth/weak-password': `Mot de passe trop faible (min ${PASSWORD_MIN_LENGTH} caractères)`,
  'missing-fields': 'Veuillez remplir tous les champs',
  'recaptcha-failed': 'Veuillez valider le reCAPTCHA'
};

// Chargement Firebase
async function loadFirebase() {
  try {
    await loadScript('https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js');
    await loadScript('https://www.gstatic.com/firebasejs/8.10.0/firebase-auth.js');
    await loadScript('https://www.gstatic.com/firebasejs/8.10.0/firebase-firestore.js');

    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }

    auth = firebase.auth();
    db = firebase.firestore();

    auth.onAuthStateChanged(user => {
      console.log("État auth changé:", user ? "connecté" : "déconnecté");
    });

  } catch (error) {
    console.error("Erreur Firebase:", error);
    showError("Erreur de chargement");
  }
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

// Affichage erreurs
function showError(message, duration = 5000) {
  const errorEl = document.getElementById('errorMsg');
  if (!errorEl) return;

  errorEl.textContent = ERROR_MESSAGES[message] || message;
  errorEl.style.display = 'block';

  setTimeout(() => {
    errorEl.style.opacity = '0';
    setTimeout(() => errorEl.style.display = 'none', 300);
  }, duration);
}

// Gestion authentification
async function handleEmailAuth(email, password, userData) {
  try {
    if (!email || !password) throw new Error('missing-fields');

    // Vérification reCAPTCHA
    const recaptchaToken = grecaptcha.getResponse();
    if (!recaptchaToken) throw new Error('recaptcha-failed');

    if (isLoginMode) {
      await auth.signInWithEmailAndPassword(email, password);
    } else {
      if (!userData.firstName || !userData.lastName || !userData.username) {
        throw new Error('missing-fields');
      }

      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      
      await db.collection('users').doc(userCredential.user.uid).set({
        firstName: userData.firstName.trim(),
        lastName: userData.lastName.trim(),
        username: userData.username.trim().toLowerCase(),
        email: email.toLowerCase(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }

    grecaptcha.reset();
    // Attendre que l'état auth soit bien mis à jour
    await new Promise(resolve => setTimeout(resolve, 500));
    window.location.href = window.location.pathname.includes('github.io') 
      ? "/checkout.html" 
      : "checkout.html";

  } catch (error) {
    console.error("Erreur auth:", error);
    showError(error.code || error.message);
    grecaptcha.reset();
  }
}

async function handleGoogleAuth() {
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    const result = await auth.signInWithPopup(provider);

    // Attendre explicitement que l'état auth soit mis à jour
    await new Promise((resolve) => {
      const unsubscribe = auth.onAuthStateChanged(user => {
        if (user) {
          unsubscribe();
          resolve();
        }
      });
    });

    if (result.additionalUserInfo?.isNewUser) {
      await db.collection('users').doc(result.user.uid).set({
        firstName: result.user.displayName?.split(' ')[0] || '',
        lastName: result.user.displayName?.split(' ').slice(1).join(' ') || '',
        email: result.user.email || '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }

    window.location.href = window.location.pathname.includes('github.io') 
      ? "/checkout.html" 
      : "checkout.html";

  } catch (error) {
    console.error("Erreur Google auth:", error);
    if (error.code !== 'auth/popup-closed-by-user') {
      showError(error.code);
    }
  }
}

// Gestion interface
function toggleAuthMode() {
  isLoginMode = !isLoginMode;

  document.getElementById('formTitle').textContent = isLoginMode ? 'Connexion' : 'Inscription';
  document.getElementById('actionBtn').textContent = isLoginMode ? 'Se connecter' : "S'inscrire";
  document.getElementById('toggleLink').textContent = isLoginMode ? 'Créer un compte' : 'Déjà un compte ?';

  document.querySelector('.name-fields').style.display = isLoginMode ? 'none' : 'flex';
  document.getElementById('username').style.display = isLoginMode ? 'none' : 'block';
}

function initEventListeners() {
  document.getElementById('toggleLink').addEventListener('click', (e) => {
    e.preventDefault();
    toggleAuthMode();
  });

  document.getElementById('authForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleEmailAuth(
      document.getElementById('email').value.trim(),
      document.getElementById('password').value,
      {
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        username: document.getElementById('username').value
      }
    );
  });

  document.getElementById('googleSignIn').addEventListener('click', handleGoogleAuth);
}

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
  await loadFirebase();
  initEventListeners();
});
