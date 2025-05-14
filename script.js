import 'https://tomashubelbauer.github.io/github-pages-local-storage/index.js';
// Gestion du toggle menu
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

  if (!navLinks || !menuToggle) return;

  navLinks.classList.remove('active');
  document.body.classList.remove('menu-open');

  const icon = menuToggle.querySelector('i');
  if (icon) {
    icon.classList.add('fa-bars');
    icon.classList.remove('fa-times');
  }
}

// Panier
const openCartBtn = document.getElementById('open-cart');
const closeCartBtn = document.getElementById('close-cart');
const cartOverlay = document.getElementById('cart-overlay');
const cartContainer = document.getElementById('cart-container');

const setupCartEventListeners = () => {
  if (openCartBtn) {
    openCartBtn.addEventListener('click', () => {
      if (cartOverlay) cartOverlay.classList.add('active');
      if (cartContainer) cartContainer.classList.add('active');
      document.body.classList.add('menu-open');
    });
  }

  if (closeCartBtn) {
    closeCartBtn.addEventListener('click', () => {
      if (cartOverlay) cartOverlay.classList.remove('active');
      if (cartContainer) cartContainer.classList.remove('active');
      document.body.classList.remove('menu-open');
    });
  }

  if (cartOverlay) {
    cartOverlay.addEventListener('click', () => {
      cartOverlay.classList.remove('active');
      if (cartContainer) cartContainer.classList.remove('active');
      document.body.classList.remove('menu-open');
    });
  }
};

// Fonction pour échapper le HTML (protection XSS)
const escapeHtml = (unsafe) => {
  if (typeof unsafe !== 'string') return unsafe;
  return unsafe.replace(/[&<"'>]/g, (c) => {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c];
  });
};

// Fonction pour ajouter un produit au panier
function addProductToCart(id, name, price, image, event) {
  if (!id || typeof id !== 'number' || id <= 0) {
    console.error("ID de produit invalide");
    return false;
  }

  if (!name || typeof name !== 'string' || name.trim() === '') {
    console.error("Nom de produit invalide");
    return false;
  }

  if (typeof price !== 'number' || price <= 0 || !isFinite(price)) {
    console.error("Prix invalide");
    return false;
  }

  if (event && event.preventDefault) event.preventDefault();

  cart.addItem({
    id: id,
    name: escapeHtml(name),
    price: Number(price.toFixed(2)),
    image: escapeHtml(image)
  });

  const button = event?.target;
  if (button && button.nodeName === 'BUTTON') {
    const originalHtml = button.innerHTML;
    button.innerHTML = '<i class="fas fa-check"></i> Ajouté !';
    button.style.backgroundColor = '#4CAF50';

    setTimeout(() => {
      button.innerHTML = originalHtml;
      button.style.backgroundColor = '';
    }, 2000);
  }

  if (window.innerWidth <= 768) {
    if (cartOverlay) cartOverlay.classList.add('active');
    if (cartContainer) cartContainer.classList.add('active');
    document.body.classList.add('menu-open');
  }

  return true;
}

const cart = {
  items: [],
  MAX_QUANTITY: 100,

  _validateProduct(product) {
    if (!product || typeof product !== 'object') return false;

    const requiredFields = ['id', 'name', 'price'];
    for (const field of requiredFields) {
      if (!(field in product)) return false;
    }

    return typeof product.id === 'number' && product.id > 0 &&
           typeof product.name === 'string' && product.name.trim() !== '' &&
           typeof product.price === 'number' && product.price > 0;
  },

  addItem(product) {
    try {
      if (!this._validateProduct(product)) {
        throw new Error("Produit invalide");
      }

      const existingItem = this.items.find(item => item.id === product.id);
      if (existingItem) {
        if (existingItem.quantity >= this.MAX_QUANTITY) {
          throw new Error(`Quantité maximale (${this.MAX_QUANTITY}) atteinte`);
        }
        existingItem.quantity += 1;
      } else {
        this.items.push({
          id: product.id,
          name: product.name,
          price: product.price,
          image: product.image || 'placeholder.jpg',
          quantity: 1
        });
      }
      this.updateCart();
      return true;
    } catch (error) {
      console.error("Erreur sécurisée:", error.message);
      return false;
    }
  },

  removeItem(id) {
    if (!id || typeof id !== 'number') {
      console.error("ID invalide pour suppression");
      return false;
    }

    this.items = this.items.filter(item => item.id !== id);
    this.updateCart();
    return true;
  },

  updateQuantity(id, newQuantity) {
    if (!id || typeof id !== 'number' || 
        typeof newQuantity !== 'number' || newQuantity < 1) {
      console.error("Paramètres invalides pour mise à jour quantité");
      return false;
    }

    if (newQuantity > this.MAX_QUANTITY) {
      console.error(`Quantité maximale (${this.MAX_QUANTITY}) dépassée`);
      return false;
    }

    const item = this.items.find(item => item.id === id);
    if (item) {
      item.quantity = newQuantity;
      this.updateCart();
      return true;
    }
    return false;
  },

  _createCartItemElement(item) {
    if (!item) return null;

    const itemEl = document.createElement('div');
    itemEl.className = 'cart-item';

    const img = document.createElement('img');
    img.src = item.image;
    img.alt = item.name;
    img.className = 'cart-item-img';

    const details = document.createElement('div');
    details.className = 'cart-item-details';

    const title = document.createElement('div');
    title.className = 'cart-item-title';
    title.textContent = item.name;

    const price = document.createElement('div');
    price.className = 'cart-item-price';
    price.textContent = `${item.price.toFixed(2)} €`;

    const quantity = document.createElement('div');
    quantity.className = 'cart-item-quantity';

    const decreaseBtn = document.createElement('button');
    decreaseBtn.className = 'quantity-btn';
    decreaseBtn.textContent = '−';
    decreaseBtn.addEventListener('click', () => this.updateQuantity(item.id, item.quantity - 1));

    const quantityValue = document.createElement('span');
    quantityValue.className = 'quantity-value';
    quantityValue.textContent = item.quantity;

    const increaseBtn = document.createElement('button');
    increaseBtn.className = 'quantity-btn';
    increaseBtn.textContent = '+';
    increaseBtn.addEventListener('click', () => this.updateQuantity(item.id, item.quantity + 1));

    quantity.appendChild(decreaseBtn);
    quantity.appendChild(quantityValue);
    quantity.appendChild(increaseBtn);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'cart-item-remove';
    removeBtn.innerHTML = '<i class="fas fa-trash"></i> Supprimer';
    removeBtn.addEventListener('click', () => this.removeItem(item.id));

    details.appendChild(title);
    details.appendChild(price);
    details.appendChild(quantity);
    details.appendChild(removeBtn);

    itemEl.appendChild(img);
    itemEl.appendChild(details);

    return itemEl;
  },

  updateCart() {
    try {
      const cartItemsEl = document.getElementById('cart-items');
      const cartCountEl = document.querySelector('.cart-count');
      const cartTotalEl = document.getElementById('cart-total');

      if (!cartItemsEl || !cartCountEl || !cartTotalEl) {
        throw new Error("Éléments du panier introuvables");
      }

      while (cartItemsEl.firstChild) {
        cartItemsEl.removeChild(cartItemsEl.firstChild);
      }

      if (this.items.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-cart-message';

        const icon = document.createElement('i');
        icon.className = 'fas fa-shopping-cart';

        const text = document.createElement('p');
        text.textContent = 'Votre panier est vide';

        emptyMessage.appendChild(icon);
        emptyMessage.appendChild(text);
        cartItemsEl.appendChild(emptyMessage);
      } else {
        this.items.forEach(item => {
          const itemElement = this._createCartItemElement(item);
          if (itemElement) cartItemsEl.appendChild(itemElement);
        });
      }

      const totalCount = this.items.reduce((sum, item) => sum + item.quantity, 0);
      const totalPrice = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      cartCountEl.textContent = totalCount;
      cartTotalEl.textContent = `${totalPrice.toFixed(2)} €`;

      this._saveCart();
    } catch (error) {
      console.error("Erreur sécurisée lors de la mise à jour du panier:", error);
    }
  },

  _saveCart() {
    try {
      localStorage.setItem('cartItems', JSON.stringify(this.items));
    } catch (error) {
      console.error("Erreur lors de la sauvegarde du panier:", error);
    }
  },

  loadCart() {
    try {
      const saved = localStorage.getItem('cartItems');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          this.items = parsed;
          this.updateCart();
        }
      }
    } catch (error) {
      console.error("Erreur lors du chargement du panier:", error);
    }
  }
};

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
  setupCartEventListeners();
  cart.loadCart();
});

// Redirection vers la page de connexion lors du clic sur le bouton "Commander"
document.addEventListener('DOMContentLoaded', () => {
  const checkoutBtn = document.getElementById('checkout-btn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      window.location.href = 'login.html';
    });
  }
});
