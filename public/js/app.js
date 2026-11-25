const STORE_WHATSAPP_NUMBER = "92337214265";
// Admin password/PIN for Admin Panel unlock and API requests (must match server ADMIN_PASSWORD/.env).
// Client-side UI protection only; not secure server auth by itself.
const ADMIN_PIN = "M Idrees 46 14";
const ADMIN_PRODUCTS_KEY = "mi_store_products_v1";
const DELIVERY_CHARGES = 0;
const API_BASE = "/api";

const DEFAULT_PRODUCTS = [
  { id: 1, title: "Royal Chronograph Black", category: "mens-watches", price: 8500, originalPrice: 12000, badge: "Sale", image: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=800&q=80", section: ["best-sellers", "new-arrivals"], description: "Premium stainless steel chronograph with black dial." },
  { id: 2, title: "Elegance Rose Gold", category: "ladies-watches", price: 7200, originalPrice: 10500, badge: "Sale", image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=800&q=80", section: ["best-sellers"], description: "Elegant rose gold watch for a refined look." },
  { id: 3, title: "Aviator Classic Sunglasses", category: "glasses", price: 3500, originalPrice: 5000, badge: "Sale", image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=800&q=80", section: ["best-sellers", "new-arrivals"], description: "Timeless aviator sunglasses with UV protection." },
  { id: 4, title: "Midnight Luxe Edition", category: "mens-watches", price: 15500, originalPrice: 22000, badge: "Sale", image: "https://images.unsplash.com/photo-1547996160-81dfa63595aa?auto=format&fit=crop&w=800&q=80", section: ["best-sellers"], description: "Luxury edition watch with midnight black finish." },
  { id: 5, title: "Pearl Dial Ladies Watch", category: "ladies-watches", price: 6800, originalPrice: 9500, badge: "Sale", image: "https://images.unsplash.com/photo-1533139502658-0198f920d8e8?auto=format&fit=crop&w=800&q=80", section: ["new-arrivals"], description: "Delicate pearl dial with premium strap." },
  { id: 6, title: "Urban Square Sunglasses", category: "glasses", price: 2900, originalPrice: 4200, badge: "Sale", image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=800&q=80", section: ["new-arrivals"], description: "Modern square frame sunglasses for everyday style." },
  { id: 7, title: "Gold Prestige Automatic", category: "mens-watches", price: 18500, originalPrice: 25000, badge: "Sale", image: "https://images.unsplash.com/photo-1614164185128-e4ec99c436d7?auto=format&fit=crop&w=800&q=80", section: ["new-arrivals", "best-sellers"], description: "Automatic gold prestige watch with premium craftsmanship." },
  { id: 8, title: "Crystal Bloom Ladies Watch", category: "ladies-watches", price: 7900, originalPrice: 11000, badge: "Sale", image: "https://images.unsplash.com/photo-1509941943102-10c232535736?auto=format&fit=crop&w=800&q=80", section: ["best-sellers"], description: "Crystal-accented ladies watch with elegant bloom design." }
];

function loadProductsFallback() {
  try {
    const raw = localStorage.getItem(ADMIN_PRODUCTS_KEY);
    if (!raw) return DEFAULT_PRODUCTS.map(p => ({ ...p }));
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length) return parsed;
  } catch {}
  return DEFAULT_PRODUCTS.map(p => ({ ...p }));
}
function saveProductsFallback() { try { localStorage.setItem(ADMIN_PRODUCTS_KEY, JSON.stringify(state.products)); } catch {} }

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

async function fetchProductsFromApi() {
  const products = await apiFetch('/products');
  if (!Array.isArray(products)) throw new Error('Invalid products response');
  return products;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

async function compressImageFile(file, { maxWidth = 800, maxHeight = 800, quality = 0.8 } = {}) {
  const dataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(dataUrl);
  let { width, height } = img;
  const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
  const targetW = Math.round(width * ratio);
  const targetH = Math.round(height * ratio);
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, targetW, targetH);
  ctx.drawImage(img, 0, 0, targetW, targetH);
  // Prefer JPEG for compact DB storage
  return canvas.toDataURL('image/jpeg', quality);
}

const state = { products: loadProductsFallback(), cart: loadCart(), activeCategory: 'home', search: '', sort: 'featured', heroIndex: 0, heroTimer: null, adminUnlocked: false, adminPassword: '', editingProductId: null, adminImageData: '' };
const els = {};

document.addEventListener('DOMContentLoaded', init);

async function init() {
  cacheEls();
  setWhatsappLinks();
  bindEvents();
  buildHeroDots();
  startHero();
  renderCart();
  renderHomeProducts();
  routeFromLocation();
  await refreshProductsFromApi(true);
}

function cacheEls() {
  els.navLinks = document.getElementById('navLinks');
  els.mobileMenuBtn = document.getElementById('mobileMenuBtn');
  els.searchInput = document.getElementById('searchInput');
  els.mobileSearchInput = document.getElementById('mobileSearchInput');
  els.searchBtn = document.getElementById('searchBtn');
  els.cartBtn = document.getElementById('cartBtn');
  els.cartOverlay = document.getElementById('cartOverlay');
  els.cartDrawer = document.getElementById('cartDrawer');
  els.closeCartBtn = document.getElementById('closeCartBtn');
  els.cartItems = document.getElementById('cartItems');
  els.cartSubtotal = document.getElementById('cartSubtotal');
  els.cartCount = document.getElementById('cartCount');
  els.checkoutBtn = document.getElementById('checkoutBtn');
  els.checkoutOverlay = document.getElementById('checkoutOverlay');
  els.checkoutModal = document.getElementById('checkoutModal');
  els.closeCheckoutBtn = document.getElementById('closeCheckoutBtn');
  els.checkoutForm = document.getElementById('checkoutForm');
  els.checkoutSummary = document.getElementById('checkoutSummary');
  els.orderConfirmBanner = document.getElementById('orderConfirmBanner');
  els.placeOrderBtn = document.getElementById('placeOrderBtn');
  els.bestSellerGrid = document.getElementById('bestSellerGrid');
  els.newArrivalsGrid = document.getElementById('newArrivalsGrid');
  els.catalogSection = document.getElementById('catalogSection');
  els.catalogGrid = document.getElementById('catalogGrid');
  els.catalogTitle = document.getElementById('catalogTitle');
  els.catalogEyebrow = document.getElementById('catalogEyebrow');
  els.catalogEmpty = document.getElementById('catalogEmpty');
  els.sortSelect = document.getElementById('sortSelect');
  els.homeSections = [document.getElementById('homeSection'), document.querySelector('.categories-section'), document.getElementById('bestSellers'), document.getElementById('newArrivals')];
  els.trackSection = document.getElementById('trackSection');
  els.heroSlides = Array.from(document.querySelectorAll('.hero-slide'));
  els.heroDots = document.getElementById('heroDots');
  els.toast = document.getElementById('toast');
  // admin
  els.adminBtn = document.getElementById('adminBtn'); // optional
  els.adminOverlay = document.getElementById('adminOverlay');
  els.adminModal = document.getElementById('adminModal');
  els.closeAdminBtn = document.getElementById('closeAdminBtn');
  els.adminAuth = document.getElementById('adminAuth');
  els.adminPanel = document.getElementById('adminPanel');
  els.adminPinInput = document.getElementById('adminPinInput');
  els.adminUnlockBtn = document.getElementById('adminUnlockBtn');
  els.adminAuthMsg = document.getElementById('adminAuthMsg');
  els.adminProductForm = document.getElementById('adminProductForm');
  els.adminFormTitle = document.getElementById('adminFormTitle');
  els.adminCancelEditBtn = document.getElementById('adminCancelEditBtn');
  els.adminProductList = document.getElementById('adminProductList');
  els.adminResetBtn = document.getElementById('adminResetBtn');
    els.adminExportBtn = document.getElementById('adminExportBtn');
  els.adminCategorySelect = document.getElementById('adminCategorySelect');
  els.adminCategoryCustom = document.getElementById('adminCategoryCustom');
  els.adminImageUrl = document.getElementById('adminImageUrl');
  els.productImageFile = document.getElementById('productImageFile');
  els.adminImagePreview = document.getElementById('adminImagePreview');
  els.adminImageStatus = document.getElementById('adminImageStatus');
}

function setWhatsappLinks() {
  const inquire = `https://wa.me/${STORE_WHATSAPP_NUMBER}?text=${encodeURIComponent('Assalam-o-Alaikum MI STORE, I want to inquire about a product.')}`;
  const track = `https://wa.me/${STORE_WHATSAPP_NUMBER}?text=${encodeURIComponent('Assalam-o-Alaikum MI STORE, I want to track my order.')}`;
  document.getElementById('floatingWhatsapp').href = inquire;
  document.getElementById('footerWhatsappLink').href = inquire;
  document.getElementById('trackWhatsappBtn').href = track;
  document.getElementById('trackHelpBtn').href = inquire;
}

function bindEvents() {
  els.mobileMenuBtn.addEventListener('click', () => els.navLinks.classList.toggle('open'));
  document.addEventListener('click', (e) => { if (!e.target.closest('.nav-links') && !e.target.closest('.mobile-menu-btn')) els.navLinks.classList.remove('open'); });
  document.querySelectorAll('[data-nav]').forEach(el => el.addEventListener('click', (e) => { e.preventDefault(); navigate(el.dataset.nav); }));
  document.querySelectorAll('[data-category]').forEach(el => el.addEventListener('click', () => navigate(el.dataset.category)));
  document.querySelectorAll('.hero-shop-alt').forEach(el => el.addEventListener('click', (e) => { e.preventDefault(); navigate('home'); setTimeout(() => document.getElementById('newArrivals').scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); }));

  const onSearch = (value) => { state.search = value.trim(); if (state.search) navigate('search'); else if (state.activeCategory === 'search') navigate('home'); };
  els.searchInput.addEventListener('input', e => { els.mobileSearchInput.value = e.target.value; onSearch(e.target.value); });
  els.mobileSearchInput.addEventListener('input', e => { els.searchInput.value = e.target.value; onSearch(e.target.value); });
  els.searchBtn.addEventListener('click', () => onSearch(els.searchInput.value));

  els.cartBtn.addEventListener('click', openCart);
  els.closeCartBtn.addEventListener('click', closeCart);
  els.cartOverlay.addEventListener('click', closeCart);
  els.checkoutBtn.addEventListener('click', openCheckout);
  els.closeCheckoutBtn.addEventListener('click', closeCheckout);
  els.checkoutOverlay.addEventListener('click', closeCheckout);
  els.checkoutForm.addEventListener('submit', placeOrder);
  els.sortSelect.addEventListener('change', (e) => { state.sort = e.target.value; renderCatalog(); });
  window.addEventListener('hashchange', routeFromLocation);
  window.addEventListener('popstate', routeFromLocation);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (els.adminModal.classList.contains('open')) { closeAdmin(); return; }
      if (els.checkoutModal.classList.contains('open')) { closeCheckout(); return; }
      if (els.cartDrawer.classList.contains('open')) { closeCart(); return; }
    }
  });

  // admin
  if (els.adminBtn) els.adminBtn.addEventListener('click', (e) => { e.preventDefault(); history.pushState({}, '', '/admin'); openAdmin(); });
  els.closeAdminBtn.addEventListener('click', closeAdmin);
  els.adminOverlay.addEventListener('click', closeAdmin);
  els.adminUnlockBtn.addEventListener('click', unlockAdmin);
  els.adminPinInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); unlockAdmin(); } });
  els.adminProductForm.addEventListener('submit', handleAdminSave);
  els.adminCancelEditBtn.addEventListener('click', resetAdminForm);
  els.adminResetBtn.addEventListener('click', resetDefaultProducts);
    els.adminExportBtn.addEventListener('click', exportProductsJson);
  els.adminCategorySelect.addEventListener('change', () => {
    const custom = els.adminCategorySelect.value === '__custom__';
    els.adminCategoryCustom.classList.toggle('hidden', !custom);
    if (custom) els.adminCategoryCustom.focus();
  });
  els.productImageFile.addEventListener('change', handleAdminImageFile);
  els.adminImageUrl.addEventListener('input', () => {
    if (!els.productImageFile.files?.length) setAdminImagePreview(els.adminImageUrl.value.trim());
  });
}

function routeFromLocation() {
  const path = (location.pathname || '/').replace(/\/+$/, '') || '/';
  if (path === '/admin') { openAdmin(); return; }
  routeFromHash();
}
function routeFromHash() {
  const hash = (location.hash || '#home').replace('#', '');
  if (hash === 'admin') { history.replaceState({}, '', '/admin'); openAdmin(); return; }
  const allowed = ['home', 'mens-watches', 'ladies-watches', 'glasses', 'track-order', 'luxury', 'best-sellers', 'search'];
  navigate(allowed.includes(hash) ? hash : 'home', false);
}

function navigate(target, pushHash = true) {
  state.activeCategory = target;
  els.navLinks.classList.remove('open');
  document.querySelectorAll('.nav-link').forEach(a => a.classList.toggle('active', a.dataset.nav === target));
  if (pushHash) location.hash = target === 'search' ? 'home' : target;
  const showHome = target === 'home', showTrack = target === 'track-order', showCatalog = !showHome && !showTrack;
  els.homeSections.forEach(s => s.classList.toggle('hidden', !showHome));
  els.trackSection.classList.toggle('hidden', !showTrack);
  els.catalogSection.classList.toggle('hidden', !showCatalog);
  if (showCatalog) renderCatalog();
  if (showHome) window.scrollTo({ top: 0, behavior: 'smooth' });
  if (showTrack) els.trackSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (showCatalog) els.catalogSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderHomeProducts() {
  const best = state.products.filter(p => (p.section || []).includes('best-sellers')).slice(0, 4);
  const newly = state.products.filter(p => (p.section || []).includes('new-arrivals')).slice(0, 4);
  els.bestSellerGrid.innerHTML = (best.length ? best : state.products.slice(0, 4)).map(productCard).join('');
  els.newArrivalsGrid.innerHTML = (newly.length ? newly : state.products.slice(0, 4)).map(productCard).join('');
}

function getCatalogProducts() {
  let list = [...state.products];
  const cat = state.activeCategory;
  if (cat === 'mens-watches') list = list.filter(p => p.category === 'mens-watches');
  else if (cat === 'ladies-watches') list = list.filter(p => p.category === 'ladies-watches');
  else if (cat === 'glasses') list = list.filter(p => p.category === 'glasses');
  else if (cat === 'luxury') list = list.filter(p => /lux|prestige|royal|gold/i.test(p.title || '') || Number(p.price) >= 15000);
  else if (cat === 'best-sellers') list = list.filter(p => (p.section || []).includes('best-sellers'));
  if (state.search) { const q = state.search.toLowerCase(); list = list.filter(p => (p.title || '').toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q)); }
  if (state.sort === 'price-low') list.sort((a, b) => Number(a.price) - Number(b.price));
  if (state.sort === 'price-high') list.sort((a, b) => Number(b.price) - Number(a.price));
  if (state.sort === 'newest') list.sort((a, b) => Number(b.id) - Number(a.id));
  return list;
}

function catalogMeta() {
  const map = { 'mens-watches': ['Collection', 'Mens Watches'], 'ladies-watches': ['Collection', 'Ladies Watches'], 'glasses': ['Collection', 'Glasses'], 'luxury': ['Collection', 'Luxury Editions'], 'best-sellers': ['Collection', 'Best Sellers'], 'search': ['Search Results', state.search ? `Results for "${state.search}"` : 'Search Products'] };
  return map[state.activeCategory] || ['Collection', 'All Products'];
}

function renderCatalog() {
  const [eyebrow, title] = catalogMeta();
  els.catalogEyebrow.textContent = eyebrow; els.catalogTitle.textContent = title;
  const list = getCatalogProducts();
  els.catalogGrid.innerHTML = list.map(productCard).join('');
  els.catalogEmpty.classList.toggle('hidden', list.length > 0);
}

function formatPKR(n) { return 'PKR ' + Number(n || 0).toLocaleString('en-PK'); }

function productCard(p) {
  const badge = p.badge ? `<span class="badge sale">${escapeHtml(p.badge)}</span>` : '';
  const old = p.originalPrice ? `<span class="price-old">${formatPKR(p.originalPrice)}</span>` : '';
  return `<article class="product-card">
    <div class="product-media"><img src="${escapeAttr(p.image)}" alt="${escapeAttr(p.title)}" loading="lazy">${badge}</div>
    <div class="product-body">
      <h3 class="product-title">${escapeHtml(p.title)}</h3>
      <div class="price-row"><span class="price-current">${formatPKR(p.price)}</span>${old}</div>
      <div class="card-actions">
        <button class="btn btn-outline btn-sm" onclick="addToCart(${Number(p.id)})">Add to Cart</button>
        <button class="btn btn-primary btn-sm" onclick="buyNow(${Number(p.id)})">Buy Now (COD)</button>
      </div>
    </div></article>`;
}

function loadCart() { try { return JSON.parse(localStorage.getItem('mi_store_cart') || '[]'); } catch { return []; } }
function saveCart() { localStorage.setItem('mi_store_cart', JSON.stringify(state.cart)); }
function cartCount() { return state.cart.reduce((s, i) => s + Number(i.qty || 0), 0); }
function cartSubtotal() { return state.cart.reduce((s, i) => s + Number(i.qty || 0) * Number(i.price || 0), 0); }

function addToCart(id, qty = 1, silent = false) {
  const product = state.products.find(p => Number(p.id) === Number(id)); if (!product) return;
  const existing = state.cart.find(i => Number(i.id) === Number(product.id));
  if (existing) existing.qty += qty; else state.cart.push({ id: product.id, title: product.title, price: product.price, image: product.image, qty });
  saveCart(); renderCart(); if (!silent) showToast('Added to cart');
}
function buyNow(id) { addToCart(id, 1, true); openCheckout(); }
function updateQty(id, delta) { const item = state.cart.find(i => Number(i.id) === Number(id)); if (!item) return; item.qty += delta; if (item.qty <= 0) state.cart = state.cart.filter(i => Number(i.id) !== Number(id)); saveCart(); renderCart(); renderCheckoutSummary(); }
function removeFromCart(id) { state.cart = state.cart.filter(i => Number(i.id) !== Number(id)); saveCart(); renderCart(); renderCheckoutSummary(); }

function renderCart() {
  els.cartCount.textContent = cartCount();
  els.cartSubtotal.textContent = formatPKR(cartSubtotal());
  if (!state.cart.length) { els.cartItems.innerHTML = `<div class="cart-empty"><p>Your cart is empty.</p><button class="btn btn-primary btn-sm" onclick="closeCart(); navigate('home')">Continue Shopping</button></div>`; return; }
  els.cartItems.innerHTML = state.cart.map(item => `<div class="cart-item">
    <img src="${escapeAttr(item.image)}" alt="${escapeAttr(item.title)}">
    <div><p class="cart-item-title">${escapeHtml(item.title)}</p><div class="cart-item-price">${formatPKR(item.price)}</div>
      <div class="qty-row"><div class="qty-controls"><button aria-label="Decrease quantity" onclick="updateQty(${Number(item.id)}, -1)">-</button><span>${item.qty}</span><button aria-label="Increase quantity" onclick="updateQty(${Number(item.id)}, 1)">+</button></div>
      <button class="remove-item" onclick="removeFromCart(${Number(item.id)})">Remove</button></div></div></div>`).join('');
}
function closeAllPanels() { closeCart(); closeCheckout(); closeAdmin(); }
function openCart() {
  closeCheckout(); closeAdmin();
  els.cartDrawer.classList.add('open');
  els.cartOverlay.classList.add('open');
  els.cartDrawer.style.visibility = 'visible';
  els.cartOverlay.style.display = 'block';
  els.cartDrawer.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}
function closeCart() {
  els.cartDrawer.classList.remove('open');
  els.cartOverlay.classList.remove('open');
  els.cartDrawer.style.visibility = '';
  els.cartOverlay.style.display = '';
  els.cartDrawer.setAttribute('aria-hidden', 'true');
  if (!els.checkoutModal.classList.contains('open') && !els.adminModal.classList.contains('open')) document.body.style.overflow = '';
}

function openCheckout() {
  if (!state.cart.length) { showToast('Your cart is empty'); return; }
  closeCart(); closeAdmin();
  clearCheckoutErrors();
  els.orderConfirmBanner.classList.add('hidden');
  els.orderConfirmBanner.innerHTML = '';
  els.checkoutForm.classList.remove('hidden');
  renderCheckoutSummary();
  els.checkoutOverlay.classList.add('open');
  els.checkoutOverlay.style.display = 'block';
  els.checkoutModal.classList.add('open');
  els.checkoutModal.style.display = 'block';
  els.checkoutModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}
function closeCheckout() {
  els.checkoutOverlay.classList.remove('open');
  els.checkoutModal.classList.remove('open');
  els.checkoutOverlay.style.display = '';
  els.checkoutModal.style.display = '';
  els.checkoutModal.setAttribute('aria-hidden', 'true');
  if (!els.cartDrawer.classList.contains('open') && !els.adminModal.classList.contains('open')) document.body.style.overflow = '';
}
function renderCheckoutSummary() {
  const subtotal = cartSubtotal(), total = subtotal + DELIVERY_CHARGES;
  const lines = state.cart.map(i => `<div class="summary-row"><span>${escapeHtml(i.title)} x ${i.qty}</span><span>${formatPKR(Number(i.price) * Number(i.qty))}</span></div>`).join('');
  els.checkoutSummary.innerHTML = `${lines || '<div class="summary-row"><span>No items</span><span>-</span></div>'}<div class="summary-row"><span>Delivery Charges</span><span>${DELIVERY_CHARGES === 0 ? '00 dc advance' : formatPKR(DELIVERY_CHARGES)}</span></div><div class="summary-row total"><span>Final Total</span><span>${formatPKR(total)}</span></div>`;
}
function clearCheckoutErrors() { els.checkoutForm.querySelectorAll('.field-error').forEach(el => el.textContent = ''); els.checkoutForm.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error')); }
function setFieldError(name, message) { const err = els.checkoutForm.querySelector(`[data-error-for="${name}"]`); const input = els.checkoutForm.querySelector(`[name="${name}"]`); if (err) err.textContent = message; if (input) input.classList.add('input-error'); }
function validateCheckout(data) {
  clearCheckoutErrors(); let valid = true;
  if (!data.name) { setFieldError('name', 'Full name is required.'); valid = false; }
  if (!data.phone) { setFieldError('phone', 'Mobile / WhatsApp number is required.'); valid = false; }
  else if (!/^03\d{2}-?\d{7}$/.test(data.phone.replace(/\s+/g, ''))) { setFieldError('phone', 'Enter a valid Pakistan number (e.g., 03XX-XXXXXXX).'); valid = false; }
  if (!data.city) { setFieldError('city', 'City is required.'); valid = false; }
  if (!data.address) { setFieldError('address', 'Complete delivery address is required.'); valid = false; }
  return valid;
}
function buildWhatsAppMessage(data) {
  const subtotal = cartSubtotal(), total = subtotal + DELIVERY_CHARGES;
  const items = state.cart.map((i, idx) => `${idx + 1}. ${i.title} x ${i.qty} - ${formatPKR(Number(i.price) * Number(i.qty))}`).join('\n');
  return ['MI STORE - New Order','--------------------------',`Customer Name: ${data.name}`,`Phone: ${data.phone}`,`City: ${data.city}`,`Address: ${data.address}`,`Note: ${data.note || 'N/A'}`,'--------------------------','Order Items:',items,'--------------------------',`Delivery Charges: ${DELIVERY_CHARGES === 0 ? '00 dc advance' : formatPKR(DELIVERY_CHARGES)}`,`Final Total: ${formatPKR(total)}`,'','Please confirm my order. Thank you!'].join('\n');
}
function placeOrder(e) {
  e.preventDefault();
  if (!state.cart.length) { showToast('Your cart is empty'); return; }
  const form = new FormData(els.checkoutForm);
  const data = { name: String(form.get('name') || '').trim(), phone: String(form.get('phone') || '').trim(), city: String(form.get('city') || '').trim(), address: String(form.get('address') || '').trim(), note: String(form.get('note') || '').trim() };
  if (!validateCheckout(data)) return;
  const waUrl = `https://wa.me/${STORE_WHATSAPP_NUMBER}?text=${encodeURIComponent(buildWhatsAppMessage(data))}`;
  state.cart = []; saveCart(); renderCart(); renderCheckoutSummary();
  els.checkoutForm.reset(); els.checkoutForm.classList.add('hidden');
  els.orderConfirmBanner.innerHTML = `<strong>Order details prepared!</strong>WhatsApp has been opened with your order summary. Please hit <strong>"Send"</strong> in WhatsApp to confirm your order with MI STORE.`;
  els.orderConfirmBanner.classList.remove('hidden');
  const a = document.createElement('a'); a.href = waUrl; a.target = '_blank'; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => { window.location.href = waUrl; }, 300);
}

/* Admin */
function openAdmin() {
  closeCart(); closeCheckout();
  els.adminOverlay.classList.add('open');
  els.adminOverlay.style.display = 'block';
  els.adminModal.classList.add('open');
  els.adminModal.style.display = 'block';
  els.adminModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  renderAdminGate();
}
function closeAdmin() {
  els.adminOverlay.classList.remove('open');
  els.adminModal.classList.remove('open');
  els.adminOverlay.style.display = '';
  els.adminModal.style.display = '';
  els.adminModal.setAttribute('aria-hidden', 'true');
  if (!els.cartDrawer.classList.contains('open') && !els.checkoutModal.classList.contains('open')) document.body.style.overflow = '';
  if ((location.pathname || '').replace(/\/+$/, '') === '/admin') history.replaceState({}, '', '/');
}
function renderAdminGate() {
  if (state.adminUnlocked) { els.adminAuth.classList.add('hidden'); els.adminPanel.classList.remove('hidden'); renderAdminProducts(); }
  else { els.adminAuth.classList.remove('hidden'); els.adminPanel.classList.add('hidden'); els.adminAuthMsg.textContent = ''; els.adminPinInput.value = ''; }
}
function unlockAdmin() {
  const pin = (els.adminPinInput.value || '').trim();
  if (pin === ADMIN_PIN) {
    state.adminUnlocked = true;
    state.adminPassword = pin; // sent to API as x-admin-password
    els.adminAuthMsg.textContent = '';
    renderAdminGate();
    showToast('Admin unlocked');
  } else {
    els.adminAuthMsg.textContent = 'Incorrect PIN.';
  }
}
function adminCategoryLabel(cat) { return ({ 'mens-watches':'Mens Watches','ladies-watches':'Ladies Watches','glasses':'Glasses' })[cat] || cat || 'Other'; }
function setAdminImagePreview(src) {
  if (src) { els.adminImagePreview.src = src; els.adminImagePreview.classList.remove('hidden'); }
  else { els.adminImagePreview.removeAttribute('src'); els.adminImagePreview.classList.add('hidden'); }
}
async function handleAdminImageFile(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    els.adminImageStatus.textContent = 'Compressing image...';
    const dataUrl = await compressImageFile(file, { maxWidth: 800, maxHeight: 800, quality: 0.8 });
    state.adminImageData = dataUrl;
    setAdminImagePreview(dataUrl);
    els.adminImageStatus.textContent = `Local image ready (${Math.round(dataUrl.length / 1024)} KB).`;
  } catch (err) {
    console.error(err);
    state.adminImageData = '';
    els.adminImageStatus.textContent = 'Image processing failed. Try another image or use Image URL.';
    showToast('Image processing failed');
  }
}
async function refreshProductsFromApi(showErrorToast = false) {
  try {
    const products = await fetchProductsFromApi();
    state.products = products;
    saveProductsFallback();
    syncStorefront();
    if (state.adminUnlocked) renderAdminProducts();
  } catch (err) {
    console.warn('API fetch failed, using local fallback', err);
    if (showErrorToast) showToast('Using local product data (API unavailable)');
    syncStorefront();
  }
}
function renderAdminProducts() {
  if (!state.products.length) { els.adminProductList.innerHTML = '<p class="admin-empty">No products. Add one below.</p>'; return; }
  els.adminProductList.innerHTML = `<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Image</th><th>Title</th><th>Category</th><th>Price</th><th>Old Price</th><th>Badge</th><th>Actions</th></tr></thead><tbody>${state.products.map(p => `<tr>
    <td><img class="admin-thumb" src="${escapeAttr(p.image)}" alt="${escapeAttr(p.title)}"></td>
    <td>${escapeHtml(p.title)}</td><td>${escapeHtml(adminCategoryLabel(p.category))}</td><td>${formatPKR(p.price)}</td><td>${p.originalPrice ? formatPKR(p.originalPrice) : '-'}</td><td>${escapeHtml(p.badge || '-')}</td>
    <td class="admin-actions"><button class="btn btn-outline btn-sm" onclick="editAdminProduct(${Number(p.id)})">Edit</button><button class="btn btn-dark btn-sm" onclick="deleteAdminProduct(${Number(p.id)})">Delete</button></td>
  </tr>`).join('')}</tbody></table></div>`;
}
function resetAdminForm() {
  state.editingProductId = null;
  state.adminImageData = '';
  els.adminProductForm.reset();
  els.adminProductForm.querySelector('[name="id"]').value = '';
  els.adminFormTitle.textContent = 'Add Product';
  els.adminCancelEditBtn.classList.add('hidden');
  if (els.adminCategoryCustom) { els.adminCategoryCustom.value = ''; els.adminCategoryCustom.classList.add('hidden'); }
  if (els.adminImageStatus) els.adminImageStatus.textContent = '';
  setAdminImagePreview('');
}
function editAdminProduct(id) {
  const p = state.products.find(x => Number(x.id) === Number(id)); if (!p) return;
  state.editingProductId = p.id;
  state.adminImageData = '';
  els.adminFormTitle.textContent = 'Edit Product';
  els.adminCancelEditBtn.classList.remove('hidden');
  const f = els.adminProductForm;
  const setVal = (sel, val) => { const el = f.querySelector(sel); if (el) el.value = val ?? ''; };
  setVal('[name="id"]', p.id);
  setVal('#adminProductTitle, [name="title"]', p.title || '');
  const knownCats = ['mens-watches','ladies-watches','glasses'];
  if (knownCats.includes(p.category)) {
    setVal('#adminCategorySelect, [name="category"]', p.category);
    if (els.adminCategoryCustom) { els.adminCategoryCustom.classList.add('hidden'); els.adminCategoryCustom.value = ''; }
  } else {
    setVal('#adminCategorySelect, [name="category"]', '__custom__');
    if (els.adminCategoryCustom) { els.adminCategoryCustom.classList.remove('hidden'); els.adminCategoryCustom.value = p.category || ''; }
  }
  setVal('#adminProductPrice, [name="price"]', p.price ?? '');
  setVal('#adminImageUrl, [name="image"]', (p.image && !String(p.image).startsWith('data:')) ? p.image : '');
  // keep optional fields if present in DOM (backward compatible)
  setVal('[name="originalPrice"]', p.originalPrice ?? '');
  setVal('[name="badge"]', p.badge || '');
  setVal('[name="description"]', p.description || '');
  if (els.productImageFile) els.productImageFile.value = '';
  els.adminImageStatus.textContent = String(p.image || '').startsWith('data:') ? 'Current image is stored in database. Upload a new file to replace it.' : '';
  setAdminImagePreview(p.image || '');
  f.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
async function handleAdminSave(e) {
  e.preventDefault();
  const f = els.adminProductForm;
  const titleEl = f.querySelector('#adminProductTitle') || f.querySelector('[name="title"]') || f.querySelector('[name="name"]');
  const categoryEl = f.querySelector('#adminCategorySelect') || f.querySelector('[name="category"]');
  const priceEl = f.querySelector('#adminProductPrice') || f.querySelector('[name="price"]');
  const imageUrlEl = f.querySelector('#adminImageUrl') || f.querySelector('[name="image"]');
  const customCatEl = f.querySelector('#adminCategoryCustom') || f.querySelector('[name="categoryCustom"]');

  const title = String(titleEl?.value ?? '').trim();
  let category = String(categoryEl?.value ?? 'mens-watches').trim() || 'mens-watches';
  if (category === '__custom__') category = String(customCatEl?.value ?? '').trim() || 'custom';
  const priceRaw = String(priceEl?.value ?? '').trim();
  const price = Number(priceRaw);
  const imageUrl = String(imageUrlEl?.value ?? '').trim();
  const existing = state.editingProductId ? state.products.find(p => Number(p.id) === Number(state.editingProductId)) : null;
  const image = String(state.adminImageData || imageUrl || (existing ? existing.image : '') || '').trim();

  if (!title) { showToast('Title is required'); titleEl?.focus(); return; }
  if (!priceRaw || !Number.isFinite(price) || price < 0) { showToast('Valid price is required'); priceEl?.focus(); return; }
  if (!image) { showToast('Product image is required'); return; }

  const payload = {
    title,
    name: title, // alias for backend compatibility
    category,
    price,
    image,
    originalPrice: existing?.originalPrice ?? null,
    badge: existing?.badge || '',
    description: existing?.description || '',
    section: Array.isArray(existing?.section) ? existing.section : ['new-arrivals']
  };

  try {
    const endpoint = state.editingProductId ? `/products/${state.editingProductId}` : '/products';
    const method = state.editingProductId ? 'PUT' : 'POST';
    await apiFetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-admin-password': state.adminPassword
      },
      body: JSON.stringify(payload)
    });
    showToast(state.editingProductId ? 'Product updated' : 'Product added');
    await refreshProductsFromApi();
    resetAdminForm();
  } catch (err) {
    console.error('Admin save error:', err);
    showToast(String(err?.message || 'Save failed'));
  }
}
async function deleteAdminProduct(id) {
  if (!confirm('Delete this product?')) return;
  try {
    await apiFetch(`/products/${id}`, { method: 'DELETE', headers: { 'x-admin-password': state.adminPassword } });
    state.cart = state.cart.filter(i => Number(i.id) !== Number(id));
    saveCart();
    await refreshProductsFromApi();
    showToast('Product deleted');
  } catch (err) {
    console.error(err);
    showToast(err.message || 'Delete failed');
  }
}
async function resetDefaultProducts() {
  if (!confirm('Reset all products to defaults? This will replace database products.')) return;
  try {
    // delete all then recreate defaults via API
    const ids = state.products.map(p => p.id);
    for (const id of ids) {
      await apiFetch(`/products/${id}`, { method: 'DELETE', headers: { 'x-admin-password': state.adminPassword } });
    }
    for (const p of [...DEFAULT_PRODUCTS].reverse()) { // reverse then unshift behavior on server? easier post in order
      await apiFetch('/products', { method: 'POST', headers: { 'x-admin-password': state.adminPassword }, body: JSON.stringify(p) });
    }
    await refreshProductsFromApi();
    resetAdminForm();
    showToast('Products reset to defaults');
  } catch (err) {
    console.error(err);
    showToast(err.message || 'Reset failed');
  }
}
function exportProductsJson() {
  const json = JSON.stringify(state.products, null, 2);
  navigator.clipboard?.writeText(json).then(() => showToast('Products JSON copied')).catch(() => {});
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'mi-store-products.json'; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}function syncStorefront() {
  renderHomeProducts();
  renderCart();
  if (!els.catalogSection.classList.contains('hidden')) renderCatalog();
}

function buildHeroDots() { els.heroDots.innerHTML = els.heroSlides.map((_, i) => `<button class="hero-dot ${i === 0 ? 'active' : ''}" aria-label="Slide ${i + 1}" data-slide="${i}"></button>`).join(''); els.heroDots.querySelectorAll('.hero-dot').forEach(dot => dot.addEventListener('click', () => goToSlide(Number(dot.dataset.slide)))); }
function goToSlide(i) { els.heroSlides[state.heroIndex].classList.remove('active'); els.heroDots.children[state.heroIndex].classList.remove('active'); state.heroIndex = i; els.heroSlides[state.heroIndex].classList.add('active'); els.heroDots.children[state.heroIndex].classList.add('active'); }
function startHero() { clearInterval(state.heroTimer); state.heroTimer = setInterval(() => { goToSlide((state.heroIndex + 1) % els.heroSlides.length); }, 4500); }
function showToast(msg) { els.toast.textContent = msg; els.toast.classList.add('show'); clearTimeout(showToast._t); showToast._t = setTimeout(() => els.toast.classList.remove('show'), 2200); }
function escapeHtml(str = '') { return String(str).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
function escapeAttr(str = '') { return escapeHtml(str).replace(/`/g, '&#96;'); }

window.addToCart = addToCart; window.buyNow = buyNow; window.updateQty = updateQty; window.removeFromCart = removeFromCart; window.closeCart = closeCart; window.navigate = navigate; window.closeCheckout = closeCheckout; window.closeAdmin = closeAdmin; window.editAdminProduct = editAdminProduct; window.deleteAdminProduct = deleteAdminProduct;










