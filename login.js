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
      console.log("[DEBUG] État auth changé:", user ? `connecté (${user.uid})` : "déconnecté");
      if (user) {
        console.log("[DEBUG] User email verified:", user.emailVerified);
      }
    });

  } catch (error) {
    console.error("[ERREUR] Firebase:", error);
    showError("Erreur de chargement");
  }
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Échec du chargement du script: ${src}`));
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
    console.log("[DEBUG] Tentative d'authentification email");
    if (!email || !password) throw new Error('missing-fields');

    const recaptchaToken = grecaptcha.getResponse();
    if (!recaptchaToken) throw new Error('recaptcha-failed');

    if (isLoginMode) {
      console.log("[DEBUG] Mode connexion");
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      console.log("[DEBUG] Connexion réussie", userCredential.user);
    } else {
      console.log("[DEBUG] Mode inscription");
      if (!userData.firstName || !userData.lastName || !userData.username) {
        throw new Error('missing-fields');
      }

      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      console.log("[DEBUG] Inscription réussie", userCredential.user);
      
      await db.collection('users').doc(userCredential.user.uid).set({
        firstName: userData.firstName.trim(),
        lastName: userData.lastName.trim(),
        username: userData.username.trim().toLowerCase(),
        email: email.toLowerCase(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }

    grecaptcha.reset();
    console.log("[DEBUG] Redirection vers checkout.html");
    window.location.href = window.location.pathname.includes('github.io') 
      ? "/checkout.html" 
      : "checkout.html";

  } catch (error) {
    console.error("[ERREUR] handleEmailAuth:", error);
    showError(error.code || error.message);
    grecaptcha.reset();
  }
}

async function handleGoogleAuth() {
  try {
    console.log("[DEBUG] Tentative de connexion Google");
    const provider = new firebase.auth.GoogleAuthProvider();
    const result = await auth.signInWithPopup(provider);
    console.log("[DEBUG] Résultat Google Auth:", result);

    // Solution robuste pour attendre l'authentification
    let authResolved = false;
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (!authResolved) {
          unsubscribe();
          reject(new Error("Timeout d'authentification"));
        }
      }, 5000);

      const unsubscribe = auth.onAuthStateChanged(user => {
        if (user) {
          console.log("[DEBUG] AuthStateChanged confirmé");
          authResolved = true;
          clearTimeout(timeout);
          unsubscribe();
          resolve();
        }
      });
    });

    if (result.additionalUserInfo?.isNewUser) {
      console.log("[DEBUG] Nouvel utilisateur, création du profil");
      await db.collection('users').doc(result.user.uid).set({
        firstName: result.user.displayName?.split(' ')[0] || '',
        lastName: result.user.displayName?.split(' ').slice(1).join(' ') || '',
        email: result.user.email || '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }

    console.log("[DEBUG] Redirection vers checkout.html");
    window.location.href = window.location.pathname.includes('github.io') 
      ? "/checkout.html" 
      : "checkout.html";

  } catch (error) {
    console.error("[ERREUR] handleGoogleAuth:", error);
    if (error.code !== 'auth/popup-closed-by-user') {
      showError(error.code || error.message);
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
  console.log("[DEBUG] Initialisation de l'application");
  await loadFirebase();
  initEventListeners();
});
