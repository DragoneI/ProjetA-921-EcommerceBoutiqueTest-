// Configuration sécurisée
const config = {
  firebase: {
    apiKey: "AIzaSyC3u3QnOPmjhYzRB3YGcgystzVOy00kBP4",
    authDomain: "login-project-a421d.firebaseapp.com",
    projectId: "login-project-a421d",
    storageBucket: "login-project-a421d.appspot.com",
    messagingSenderId: "1028222933596",
    appId: "1:1028222933596:web:9bf788c6d655d71bf06499"
  },
  security: {
    allowedProtocols: ['http:', 'https:', 'data:'],
    allowedTags: {
      img: ['src', 'alt', 'class'],
      div: ['class'],
      span: ['class'],
      i: ['class'],
      p: ['class'],
      h4: ['class']
    }
  }
};

// Sanitization avancée
class HTMLSanitizer {
  static sanitize(input) {
    if (typeof input !== 'string') return '';
    
    const temp = document.implementation.createHTMLDocument();
    const div = temp.createElement('div');
    div.textContent = input;
    
    let sanitized = div.innerHTML
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
    
    return sanitized;
  }

  static sanitizeAttribute(value) {
    return this.sanitize(value)
      .replace(/javascript:/gi, '')
      .replace(/data:/gi, '')
      .replace(/on\w+="[^"]*"/gi, '');
  }

  static sanitizeURL(url) {
    try {
      const parsed = new URL(url, window.location.href);
      if (!config.security.allowedProtocols.includes(parsed.protocol)) {
        return 'about:blank';
      }
      return this.sanitizeAttribute(parsed.toString());
    } catch {
      return 'about:blank';
    }
  }
}

// Gestion du menu mobile
const menuToggle = document.getElementById('menu-toggle');
if (menuToggle) {
  menuToggle.addEventListener('click', function() {
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks) return;
    
    navLinks.classList.toggle('active');
    document.body.classList.toggle('menu-open');
    
    const icon = this.querySelector('i');
    if (icon) {
      icon.classList.toggle('fa-bars');
      icon.classList.toggle('fa-times');
    }
  });
}

function closeMobileMenu() {
  const navLinks = document.querySelector('.nav-links');
  const menuToggle = document.getElementById('menu-toggle');
  
  if (navLinks) navLinks.classList.remove('active');
  document.body.classList.remove('menu-open');
  
  if (menuToggle) {
    const icon = menuToggle.querySelector('i');
    if (icon) {
      icon.classList.add('fa-bars');
      icon.classList.remove('fa-times');
    }
  }
}

// Gestion du panier
const cart = {
  items: [],
  maxQuantity: 10,

  initCartElements() {
    this.openCartBtn = document.getElementById('open-cart');
    this.closeCartBtn = document.getElementById('close-cart');
    this.cartOverlay = document.getElementById('cart-overlay');
    this.cartContainer = document.getElementById('cart-container');
    this.cartItemsEl = document.getElementById('cart-items');
    this.cartTotalEl = document.getElementById('cart-total');
  },

  setupCartEvents() {
    if (this.openCartBtn) {
      this.openCartBtn.addEventListener('click', () => this.toggleCart(true));
    }
    if (this.closeCartBtn) {
      this.closeCartBtn.addEventListener('click', () => this.toggleCart(false));
    }
    if (this.cartOverlay) {
      this.cartOverlay.addEventListener('click', () => this.toggleCart(false));
    }
  },

  toggleCart(show) {
    if (!this.cartOverlay || !this.cartContainer) return;
    
    if (show) {
      this.cartOverlay.classList.add('active');
      this.cartContainer.classList.add('active');
      document.body.classList.add('menu-open');
    } else {
      this.cartOverlay.classList.remove('active');
      this.cartContainer.classList.remove('active');
      document.body.classList.remove('menu-open');
    }
  },

  loadCart() {
    try {
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        const cartData = JSON.parse(savedCart);
        this.items = (cartData.items || []).filter(item => 
          item && 
          typeof item.name === 'string' &&
          typeof item.price === 'number' && 
          item.price > 0 &&
          typeof item.quantity === 'number' &&
          item.quantity > 0 &&
          item.quantity <= this.maxQuantity
        );
        this.updateCartDisplay();
      }
    } catch (error) {
      console.error("Erreur chargement panier:", error);
      localStorage.removeItem('cart');
    }
  },

  updateCartDisplay() {
    if (!this.cartItemsEl || !this.cartTotalEl) return;

    if (this.items.length === 0) {
      this.cartItemsEl.innerHTML = `
        <div class="empty-cart-message">
          <i class="fas fa-shopping-cart"></i>
          <p>Votre panier est vide</p>
        </div>
      `;
    } else {
      this.cartItemsEl.innerHTML = this.items.map(item => `
        <div class="cart-item">
          <img src="${HTMLSanitizer.sanitizeURL(item.image || 'placeholder.jpg')}" 
               alt="${HTMLSanitizer.sanitize(item.name)}">
          <div class="cart-item-details">
            <h4>${HTMLSanitizer.sanitize(item.name)}</h4>
            <div class="cart-item-price">${item.price.toFixed(2)} MAD</div>
            <div class="cart-item-quantity">
              <span>Quantité: ${item.quantity}</span>
            </div>
          </div>
        </div>
      `).join('');
    }

    const total = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    this.cartTotalEl.textContent = `${total.toFixed(2)} MAD`;
  }
};

// Gestion Firebase
const firebaseApp = {
  init() {
    if (!config.firebase.apiKey || config.firebase.apiKey === 'API_KEY_PLACEHOLDER') {
      console.error('Configuration Firebase manquante');
      return;
    }

    try {
      // Vérifie si Firebase est déjà initialisé
      if (!firebase.apps.length) {
        firebase.initializeApp(config.firebase);
      } else {
        firebase.app(); // Si déjà initialisé, utilise l'instance existante
      }
      
      this.auth = firebase.auth();
      this.db = firebase.firestore();
      
      if (this.db) {
        this.db.settings({
          timestampsInSnapshots: true,
          merge: true
        });
        
        // Désactive la persistance si non nécessaire
        this.db.enablePersistence()
          .catch((err) => {
            if (err.code === 'failed-precondition') {
              console.log("Persistance désactivée (multi-onglets)");
            } else if (err.code === 'unimplemented') {
              console.log("Persistance non supportée par le navigateur");
            }
          });
      }
    } catch (error) {
      console.error("Erreur d'initialisation Firebase:", error);
    }
  },

  async handleAuth() {
    if (!this.auth) return;

    this.auth.onAuthStateChanged(async (user) => {
      if (!user) {
        window.location.href = 'login.html';
        return;
      }

      try {
        const doc = await this.db.collection('users').doc(user.uid).get();
        if (doc.exists) {
          this.updateUserUI(user, doc.data());
        }
      } catch (error) {
        console.error("Erreur Firebase:", error);
      }
    });
  },

  updateUserUI(user, userData) {
    if (!user || !userData) return;

    const userNameEl = document.getElementById('userName');
    const userEmailEl = document.getElementById('userEmail');
    
    if (userNameEl) {
      userNameEl.textContent = HTMLSanitizer.sanitize(
        `${userData.firstName || ''} ${userData.lastName || ''}`.trim()
      );
    }
    if (userEmailEl) {
      userEmailEl.textContent = HTMLSanitizer.sanitize(user.email || '');
    }

    const fullNameInput = document.getElementById('fullName');
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');
    
    if (fullNameInput) {
      fullNameInput.value = HTMLSanitizer.sanitize(
        `${userData.firstName || ''} ${userData.lastName || ''}`.trim()
      );
    }
    if (emailInput) {
      emailInput.value = HTMLSanitizer.sanitize(user.email || '');
    }
    
    if (phoneInput) {
      phoneInput.required = true;
      if (userData.phone) {
        phoneInput.value = HTMLSanitizer.sanitize(userData.phone);
      } else {
        phoneInput.placeholder = "Obligatoire (ex: 0612345678)";
      }
    }

    if (userData.address) {
      const streetInput = document.getElementById('street');
      const postalCodeInput = document.getElementById('postalCode');
      
      if (streetInput) streetInput.value = HTMLSanitizer.sanitize(userData.address.street || '');
      if (postalCodeInput) postalCodeInput.value = HTMLSanitizer.sanitize(userData.address.postalCode || '');
      
      const citySelect = document.getElementById('city');
      const otherCityInput = document.getElementById('otherCity');
      const otherCityWrapper = document.getElementById('otherCityWrapper');
      
      if (citySelect && userData.address.city) {
        const cityOption = Array.from(citySelect.options).find(
          opt => opt.value === userData.address.city
        );
        
        if (cityOption) {
          citySelect.value = userData.address.city;
          if (otherCityWrapper) otherCityWrapper.style.display = 'none';
        } else {
          citySelect.value = 'Autre';
          if (otherCityInput) {
            otherCityInput.value = HTMLSanitizer.sanitize(userData.address.city || '');
          }
          if (otherCityWrapper) otherCityWrapper.style.display = 'block';
        }
      }

      const countryInput = document.getElementById('country');
      if (countryInput) {
        countryInput.value = HTMLSanitizer.sanitize(userData.address.country || 'Maroc');
      }
    }
  }
};

// Gestion de la commande
const checkout = {
  init() {
    this.setupCitySelection();
    this.loadOrderSummary();
    this.setupFormSubmit();
    this.setupPhoneValidation();
    this.setupCINValidation();
  },

  setupCitySelection() {
    const citySelect = document.getElementById('city');
    if (citySelect) {
      citySelect.addEventListener('change', function() {
        const otherCityWrapper = document.getElementById('otherCityWrapper');
        const otherCityInput = document.getElementById('otherCity');
        
        if (!otherCityWrapper || !otherCityInput) return;
        
        if (this.value === 'Autre') {
          otherCityWrapper.style.display = 'block';
          otherCityInput.required = true;
        } else {
          otherCityWrapper.style.display = 'none';
          otherCityInput.required = false;
        }
      });
    }
  },

  setupPhoneValidation() {
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
      phoneInput.addEventListener('input', function() {
        this.setCustomValidity('');
        if (!this.checkValidity()) {
          this.setCustomValidity("Format: 0612345678 (10 chiffres minimum)");
        }
      });
    }
  },
    
  setupCINValidation() {
    const cinInput = document.getElementById('cin');
    if (cinInput) {
      cinInput.addEventListener('input', function() {
        this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (this.value.length > 9) {
          this.value = this.value.substring(0, 9);
        }
      });

      cinInput.addEventListener('keypress', function(e) {
        const charCode = e.charCode;
        if (!(charCode >= 48 && charCode <= 57) &&
            !(charCode >= 65 && charCode <= 90) &&
            !(charCode >= 97 && charCode <= 122)) {
          e.preventDefault();
        }
      });
    }
  },

  loadOrderSummary() {
    const checkoutItemsEl = document.getElementById('checkout-items');
    if (!checkoutItemsEl) return;

    const savedCart = localStorage.getItem('cart');
    if (!savedCart) {
      checkoutItemsEl.innerHTML = `
        <div class="empty-cart-message">
          <i class="fas fa-shopping-cart"></i>
          <p>Votre panier est vide</p>
        </div>
      `;
      return;
    }

    try {
      const cartData = JSON.parse(savedCart);
      if (!cartData.items || cartData.items.length === 0) {
        window.location.href = 'index.html';
        return;
      }

      checkoutItemsEl.innerHTML = cartData.items.map(item => `
        <div class="checkout-item">
          <span>${HTMLSanitizer.sanitize(item.name)} × ${item.quantity}</span>
          <span>${(item.price * item.quantity).toFixed(2)} MAD</span>
        </div>
      `).join('');

      const checkoutTotalEl = document.getElementById('checkout-total');
      if (checkoutTotalEl) {
        checkoutTotalEl.textContent = `${cartData.totalPrice.toFixed(2)} MAD`;
      }
    } catch (error) {
      console.error("Erreur de chargement du panier:", error);
      checkoutItemsEl.innerHTML = `
        <div class="error-message">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Erreur de chargement du panier</p>
        </div>
      `;
    }
  },

  setupFormSubmit() {
    const form = document.getElementById('checkoutForm');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const formData = {
        fullName: HTMLSanitizer.sanitize(document.getElementById('fullName')?.value?.trim() || ''),
        cin: HTMLSanitizer.sanitize(document.getElementById('cin')?.value?.trim() || ''),
        email: HTMLSanitizer.sanitize(document.getElementById('email')?.value?.trim() || ''),
        street: HTMLSanitizer.sanitize(document.getElementById('street')?.value?.trim() || ''),
        postalCode: HTMLSanitizer.sanitize(document.getElementById('postalCode')?.value?.trim() || ''),
        phone: HTMLSanitizer.sanitize(document.getElementById('phone')?.value?.trim()?.replace(/\s/g, '') || ''),       
        city: HTMLSanitizer.sanitize(document.getElementById('city')?.value || ''),
        country: HTMLSanitizer.sanitize(document.getElementById('country')?.value || '')
      };

      if (formData.city === 'Autre') {
        const otherCity = document.getElementById('otherCity');
        formData.city = otherCity ? HTMLSanitizer.sanitize(otherCity.value?.trim() || '') : '';
      }

      const errors = this.validateForm(formData);
      if (errors.length > 0) {
        this.showValidationErrors(errors);
        return;
      }

      this.processOrder(formData);
    });
  },

 validateForm(formData) {
    const errors = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^(0|\+212)[5-7][0-9]{8}$/;
    const cinRegex = /^[A-Z][A-Z0-9]{7,8}$/;
    const postalCodeRegex = /^[0-9]{5}$/; // Exactement 5 chiffres
    const streetRegex = /^[A-Za-z0-9À-ž ,.'-]{5,30}$/; // 10 à 100 caractères raisonnables

    // Validation du nom complet (3-100 caractères)
    if (!formData.fullName || formData.fullName.trim().length < 3) {
        errors.push("- Nom complet requis (minimum 3 caractères)");
    } else if (formData.fullName.length > 100) {
        errors.push("- Le nom complet est trop long (max 100 caractères)");
    }

    // Validation du CIN
    if (!formData.cin) {
        errors.push("- CIN requis");
    } else if (!cinRegex.test(formData.cin)) {
        errors.push("- CIN invalide (1 lettre + 7 ou 8 chiffres/chars)");
    }

    // Validation de l'email (max 100 chars)
    if (!formData.email) {
        errors.push("- Email requis");
    } else if (!emailRegex.test(formData.email)) {
        errors.push("- Format email invalide");
    } else if (formData.email.length > 100) {
        errors.push("- Email trop long (max 100 caractères)");
    }

    // Validation téléphone (10-14 chiffres)
    const cleanedPhone = formData.phone.replace(/\s/g, '');
    if (!cleanedPhone) {
        errors.push("- Téléphone requis");
    } else if (!phoneRegex.test(cleanedPhone)) {
        errors.push("- Format: 0612345678 ou +212612345678");
    }

    // Validation ADRESSE (10-100 caractères stricts)
    if (!formData.street) {
        errors.push("- Adresse requise (10 caractères minimum)");
    } else if (!streetRegex.test(formData.street)) {
        errors.push("- Adresse invalide (10-100 caractères alphanumériques)");
    }

    // Validation CODE POSTAL (exactement 5 chiffres)
    if (!formData.postalCode) {
        errors.push("- Code postal requis (5 chiffres)");
    } else if (!postalCodeRegex.test(formData.postalCode)) {
        errors.push("- Code postal invalide (exactement 5 chiffres)");
    }

    // Validation Ville (2-50 caractères)
    const ville = formData.city === 'Autre' ? formData.otherCity : formData.city;
    if (!ville || ville.trim().length < 2) {
        errors.push("- Ville requise (2 caractères minimum)");
    } else if (ville.length > 50) {
        errors.push("- Nom de ville trop long (max 50 caractères)");
    }

    return errors;
},

  showValidationErrors(errors) {
    const errorContainer = document.getElementById('error-messages') || 
                          document.createElement('div');
    
    errorContainer.id = 'error-messages';
    errorContainer.className = 'error-messages';
    errorContainer.innerHTML = `
      <h3>Veuillez corriger les erreurs suivantes :</h3>
      <ul>
        ${errors.map(error => `<li>${HTMLSanitizer.sanitize(error)}</li>`).join('')}
      </ul>
    `;
    
    if (!document.getElementById('error-messages')) {
      document.body.appendChild(errorContainer);
    }
    
    const firstErrorField = errors[0].match(/Nom|Email|Adresse|Code postal|Ville|Téléphone/);
    if (firstErrorField) {
      const fieldId = firstErrorField[0].toLowerCase().replace(' ', '');
      const field = document.getElementById(fieldId);
      if (field) field.focus();
    }
  },
  
  getSanitizedCartItems() {
    const cart = JSON.parse(localStorage.getItem('cart') || '{}');
    return (cart.items || []).map(item => ({
      productId: item.id || null,
      name: HTMLSanitizer.sanitize(item.name),
      price: Number(item.price),
      quantity: Number(item.quantity),
      image: item.image ? HTMLSanitizer.sanitizeURL(item.image) : null
    }));
  },

  calculateTotal() {
  const cart = JSON.parse(localStorage.getItem('cart') || '{}');
  const items = Array.isArray(cart.items) ? cart.items : [];
  return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
},

  async processOrder(formData) {
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value;
    
    if (!paymentMethod) {
      this.showValidationErrors(["- Méthode de paiement requise"]);
      return;
    }

    try {
      const user = firebase.auth().currentUser;
      if (!user) throw new Error("Veuillez vous reconnecter");

      // Vérifie d'abord si l'utilisateur est authentifié
      if (!user.uid) {
        throw new Error("Utilisateur non authentifié");
      }

      const order = {
        user: {
          uid: user.uid,
          name: HTMLSanitizer.sanitize(formData.fullName),
          cin: HTMLSanitizer.sanitize(formData.cin),
          email: user.email || HTMLSanitizer.sanitize(formData.email),
          phone: HTMLSanitizer.sanitize(formData.phone)
        },
        address: {
          street: HTMLSanitizer.sanitize(formData.street),
          postalCode: HTMLSanitizer.sanitize(formData.postalCode),
          city: HTMLSanitizer.sanitize(formData.city),
          country: HTMLSanitizer.sanitize(formData.country)
        },
        items: this.getSanitizedCartItems(),
        paymentMethod: HTMLSanitizer.sanitize(paymentMethod),
        status: "pending",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        total: this.calculateTotal()
      };

      // Ajoute un try-catch spécifique pour l'écriture dans Firestore
      try {
        const docRef = await firebase.firestore().collection('orders').add(order);
        localStorage.removeItem('cart');
        window.location.href = `confirmation.html?orderId=${docRef.id}`;
      } catch (firestoreError) {
        console.error("Erreur Firestore:", firestoreError);
        throw new Error("Erreur lors de l'enregistrement de la commande");
      }

    } catch (error) {
      console.error("Erreur:", error);
      this.showValidationErrors([
        error.message || "Erreur lors de la commande. Veuillez réessayer ou nous contacter."
      ]);
    }
  }
};

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
  if (typeof firebase === 'object') {
    firebaseApp.init();
    firebaseApp.handleAuth();
  }

  cart.initCartElements();
  cart.setupCartEvents();
  cart.loadCart();
  checkout.init();
});