// Déclaration globale des variables Firebase
let db;
let orderId;

// Configuration Firebase
const firebaseConfig = {
    apiKey: "AIzaSyC3u3QnOPmjhYzRB3YGcgystzVOy00kBP4",
    authDomain: "login-project-a421d.firebaseapp.com",
    projectId: "login-project-a421d",
    storageBucket: "login-project-a421d.appspot.com",
    messagingSenderId: "1028222933596",
    appId: "1:1028222933596:web:9bf788c6d655d71bf06499"
};

// Initialisation Firebase
function initializeFirebase() {
    try {
        if (typeof firebase === 'undefined') {
            throw new Error("Firebase SDK non chargé");
        }

        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        db = firebase.firestore();
        
        // Test de connexion
        db.collection("test").doc("test").get()
            .catch(() => console.log("Connexion Firestore établie"));
            
        return true;
    } catch (error) {
        console.error("Erreur Firebase:", error);
        showError("Erreur de connexion au serveur");
        return false;
    }
}

// Fonction principale
async function initOrderConfirmation() {
    // 1. Récupérer l'ID de commande
    const urlParams = new URLSearchParams(window.location.search);
    orderId = urlParams.get('orderId')?.trim();
    
    if (!orderId || !/^[a-zA-Z0-9_-]{10,}$/.test(orderId)) {
        showError("Numéro de commande invalide");
        return;
    }

    // 2. Afficher le loader
    showLoading();

    // 3. Initialiser Firebase
    if (!initializeFirebase()) return;

    // 4. Charger la commande avec timeout
    try {
        await Promise.race([
            loadOrderDetails(orderId),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error("Délai dépassé")), 10000)
                )
        ]);
    } catch (error) {
        console.error("Erreur:", error);
        showError(error.message.includes("Délai") 
            ? "Le chargement prend trop de temps"
            : "Erreur lors du chargement de la commande");
    }
}

// Chargement des détails
async function loadOrderDetails(orderId) {
    try {
        const doc = await db.collection("orders").doc(orderId).get();
        
        if (!doc.exists) {
            throw new Error("Commande introuvable");
        }

        const order = doc.data();
        
        if (!validateOrderData(order)) {
            throw new Error("Données de commande invalides");
        }

        displayOrderDetails(order);
        
    } catch (error) {
        console.error("Erreur Firestore:", error);
        throw error;
    }
}

// Validation des données
function validateOrderData(order) {
    return (
        order &&
        order.user &&
        order.items &&
        Array.isArray(order.items) &&
        order.items.length > 0 &&
        typeof order.total === 'number'
    );
}

// Affichage des détails
function displayOrderDetails(order) {
    const orderDetailsEl = document.getElementById("order-details");
    if (!orderDetailsEl) return;

    // Style global
    orderDetailsEl.style.color = "#1a365d";
    orderDetailsEl.style.fontFamily = "Arial, sans-serif";

    // Construction du HTML
    let html = `
        <h3 style="margin-bottom: 15px; color: #1a365d;">
            Votre commande #${escapeHtml(orderId)}
        </h3>
        
        <div style="margin-bottom: 20px;">
            <h4 style="color: #1a365d; border-bottom: 1px solid #e0e0e0; padding-bottom: 5px;">
                Articles
            </h4>
    `;

    // Articles
    order.items.forEach(item => {
        const total = (item.price * item.quantity).toFixed(2);
        html += `
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span>${escapeHtml(item.name)} × ${item.quantity}</span>
                <span>${total} MAD</span>
            </div>
        `;
    });

    // Total
    html += `
        </div>
        <div style="display: flex; justify-content: space-between; font-weight: bold; 
                    margin: 15px 0; padding-top: 10px; border-top: 1px solid #1a365d;">
            <span>Total</span>
            <span>${order.total.toFixed(2)} MAD</span>
        </div>
        
        <div style="margin-top: 25px;">
            <h4 style="color: #1a365d; border-bottom: 1px solid #e0e0e0; padding-bottom: 5px;">
                Livraison
            </h4>
            <p><strong>Nom :</strong> ${escapeHtml(order.user.name || 'Non spécifié')}</p>
            <p><strong>Adresse :</strong> ${formatAddress(order.address)}</p>
            <p><strong>Téléphone :</strong> ${maskPhoneNumber(order.user.phone)}</p>
            <p><strong>Paiement :</strong> ${escapeHtml(order.paymentMethod || 'Non spécifié')}</p>
        </div>
    `;

    orderDetailsEl.innerHTML = html;
    document.getElementById("order-status").textContent = `Commande #${orderId} confirmée`;
}

// Fonctions utilitaires
function showLoading() {
    const el = document.getElementById("order-details");
    if (el) {
        el.innerHTML = `
            <div style="text-align: center; color: #1a365d;">
                <p>Chargement de votre commande...</p>
            </div>
        `;
    }
}

function showError(message) {
    const el = document.getElementById("order-details") || document.body;
    el.innerHTML = `
        <div style="color: #d9534f; background: #f8d7da; padding: 15px; border-radius: 5px;">
            <p><strong>Erreur :</strong> ${escapeHtml(message)}</p>
            <p>Veuillez contacter le support avec le numéro : ${escapeHtml(orderId || 'N/A')}</p>
            <button onclick="window.location.href='index.html'" 
                    style="margin-top: 10px; padding: 5px 10px; background: #1a365d; color: white; border: none; border-radius: 3px;">
                Retour à l'accueil
            </button>
        </div>
    `;
}

function maskPhoneNumber(phone) {
    return phone ? phone.replace(/(\d{2})\d+(\d{2})/, '$1******$2') : 'Non spécifié';
}

function formatAddress(address) {
    if (!address) return 'Non spécifiée';
    return escapeHtml(
        [address.street, address.postalCode, address.city, address.country]
            .filter(Boolean)
            .join(', ')
    );
}

function escapeHtml(unsafe) {
    if (unsafe == null) return '';
    return String(unsafe)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Lancement au chargement
document.addEventListener('DOMContentLoaded', initOrderConfirmation);