import { db } from './firebase.js';
import { collection, getDocs, doc, runTransaction, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let productsData = []; 
let cart = [];

// Fungsi untuk memformat angka menjadi format Rupiah Indonesia
function formatRupiah(angka) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0 
  }).format(angka);
}

// 1. Ambil data dari Firestore
async function fetchProducts() {
  const grid = document.getElementById('product-grid');
  grid.innerHTML = '<p>Loading data obat...</p>';

  try {
    const querySnapshot = await getDocs(collection(db, "medicines"));
    productsData = [];
    querySnapshot.forEach((doc) => {
      productsData.push({ id: doc.id, ...doc.data() });
    });
    renderProducts(); 
  } catch (error) {
    console.error("Error fetching data: ", error);
    grid.innerHTML = '<p style="color:red;">Gagal memuat data obat.</p>';
  }
}

// 2. Render Produk
function renderProducts(dataToRender = productsData) {
  const grid = document.getElementById('product-grid');
  
  if (dataToRender.length === 0) {
    grid.innerHTML = '<p style="color:gray; grid-column: 1/-1;">Obat tidak ditemukan.</p>';
    return;
  }

  grid.innerHTML = dataToRender.map(p => `
    <div class="product-card" onclick="addToCart('${p.id}')">
      <img src="${p.imageUrl || 'https://via.placeholder.com/100x100?text=Pill'}" alt="${p.name}" class="product-img">
      <h4>${p.name}</h4>
      <p style="font-size:10px; color:var(--accent-blue); margin-bottom:2px;">${p.sku || ''}</p>
      <p>${p.desc}</p>
      <div class="product-price">${formatRupiah(p.price)}</div>
      <div class="product-stock">
        <span><i data-lucide="package" size="12"></i> ${p.stock}</span>
        <span>Rack: ${p.rack}</span>
      </div>
    </div>
  `).join('');
  lucide.createIcons();
}

// 3. Tambah ke Keranjang
window.addToCart = function(id) {
  const product = productsData.find(p => p.id === id);
  if (!product || product.stock <= 0) return alert('Stok habis!');
  
  const existing = cart.find(item => item.id === id);
  if (existing) {
    if (existing.qty >= product.stock) return alert('Melebihi batas stok!');
    existing.qty++;
  } else {
    cart.push({ ...product, qty: 1 });
  }
  updateCartUI();
};

// 4. Ubah Qty
window.changeQty = function(id, delta) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  
  const product = productsData.find(p => p.id === id);
  const newQty = item.qty + delta;
  
  if (newQty > 0 && newQty <= product.stock) {
    item.qty = newQty;
  } else if (newQty === 0) {
    cart = cart.filter(i => i.id !== id);
  }
  updateCartUI();
};

// 5. Update UI Keranjang
function updateCartUI() {
  const container = document.getElementById('cart-items');
  document.getElementById('cart-count').innerText = cart.length;
  
  container.innerHTML = cart.map(item => `
    <div class="cart-item" style="display:flex; justify-content:space-between; border-bottom:1px solid #eee; padding-bottom:10px; margin-bottom:10px;">
      <div>
        <h4 style="font-size:13px;">${item.name}</h4>
        <p style="font-size:11px; color:gray;">${item.desc}</p>
        <div style="font-weight:600; font-size:13px; margin-top:5px;">${formatRupiah(item.price)}</div>
      </div>
      <div style="display:flex; align-items:center; gap:10px;">
        <button onclick="changeQty('${item.id}', -1)" style="border:none; background:#f0f0f0; width:24px; height:24px; border-radius:4px; cursor:pointer;">-</button>
        <span>${item.qty}</span>
        <button onclick="changeQty('${item.id}', 1)" style="border:none; background:#f0f0f0; width:24px; height:24px; border-radius:4px; cursor:pointer;">+</button>
      </div>
    </div>
  `).join('');
  
  calculateTotals();
}

// 6. Kalkulasi Total
function calculateTotals() {
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const discountPercent = parseFloat(document.getElementById('discount-percent').value) || 0;
  const discountAmount = (subtotal * discountPercent) / 100;
  const receivable = subtotal - discountAmount;
  
  document.getElementById('subtotal').innerText = formatRupiah(subtotal);
  document.getElementById('receivable').innerText = formatRupiah(receivable);
  document.getElementById('discount-amount').value = discountAmount;
  
  const received = parseFloat(document.getElementById('amount-received').value) || 0;
  const totalDue = received - receivable;
  
  const dueEl = document.getElementById('total-due');
  dueEl.innerText = formatRupiah(Math.abs(totalDue));
  dueEl.style.color = totalDue < 0 ? 'var(--accent-red)' : 'var(--accent-green)';
}

// 7. FITUR PENCARIAN
document.getElementById('search-input').addEventListener('input', (e) => {
  const keyword = e.target.value.toLowerCase();
  const filteredProducts = productsData.filter(product => {
    const matchName = product.name.toLowerCase().includes(keyword);
    const matchSku = product.sku ? product.sku.toLowerCase().includes(keyword) : false;
    return matchName || matchSku;
  });
  renderProducts(filteredProducts);
});

// 8. SIMPAN TRANSAKSI (SUDAH DIPERBAIKI)
document.getElementById('btn-save').addEventListener('click', async () => {
  if (cart.length === 0) return alert('Keranjang kosong!');
  
  const btnSave = document.getElementById('btn-save');
  btnSave.innerText = 'Menyimpan...';
  btnSave.disabled = true;

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  
  try {
    await runTransaction(db, async (transaction) => {
      // ==========================================
      // TAHAP 1: BACA SEMUA STOK OBAT TERLEBIH DAHULU
      // ==========================================
      const itemsToUpdate = [];
      
      for (const item of cart) {
        const medRef = doc(db, "medicines", item.id);
        const medDoc = await transaction.get(medRef); // Baca data
        
        if (!medDoc.exists()) throw "Obat tidak ditemukan!";
        
        const currentStock = medDoc.data().stock;
        if (currentStock - item.qty < 0) {
          throw `Stok ${item.name} tidak cukup!`;
        }
        
        // Simpan data yang akan diupdate ke dalam array
        itemsToUpdate.push({
          ref: medRef,
          newStock: currentStock - item.qty
        });
      }

      // ==========================================
      // TAHAP 2: LAKUKAN UPDATE STOK (SETELAH BACA SELESAI)
      // ==========================================
      for (const updateData of itemsToUpdate) {
        transaction.update(updateData.ref, { stock: updateData.newStock });
      }

      // ==========================================
      // TAHAP 3: SIMPAN DATA TRANSAKSI
      // ==========================================
      const trxRef = doc(collection(db, "transactions"));
      transaction.set(trxRef, {
        transactionId: trxRef.id,
        date: serverTimestamp(),
        items: cart,
        subtotal: subtotal,
        total: subtotal,
        status: "completed",
        cashier: "Kasir 1"
      });
    });

    alert('Transaksi Berhasil Disimpan!');
    cart = []; 
    updateCartUI();
    fetchProducts(); 
    
  } catch (error) {
    console.error("Transaksi gagal: ", error);
    alert('Gagal menyimpan transaksi: ' + error);
  } finally {
    btnSave.innerHTML = 'SAVE <i data-lucide="chevron-up"></i>';
    btnSave.disabled = false;
    lucide.createIcons();
  }
});

// Event Listeners
document.getElementById('discount-percent').addEventListener('input', calculateTotals);
document.getElementById('amount-received').addEventListener('input', calculateTotals);

// INITIALIZATION
fetchProducts();
