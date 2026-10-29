import { db } from './firebase.js';
import { collection, getDocs, doc, runTransaction, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let productsData = []; 
let cart = [];
let expiringData = []; // Menyimpan data batch yang mau expired

function formatRupiah(angka) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
}

// 1. Ambil data dari Firestore (Obat & Batch Expired)
async function fetchProducts() {
  const grid = document.getElementById('product-grid');
  grid.innerHTML = '<p>Loading data obat...</p>';

  try {
    // A. Ambil Data Obat
    const medSnapshot = await getDocs(collection(db, "medicines"));
    productsData = [];
    medSnapshot.forEach((doc) => {
      productsData.push({ id: doc.id, ...doc.data() });
    });

    // B. Ambil Data Batch untuk Notifikasi Expired
    const batchSnapshot = await getDocs(collection(db, "inventory_batches"));
    expiringData = []; // Reset data
    
    const today = new Date();
    const fourMonthsFromNow = new Date();
    fourMonthsFromNow.setMonth(today.getMonth() + 4);

    batchSnapshot.forEach((doc) => {
      const batch = doc.data();
      if (batch.quantity > 0 && batch.expiryDate) {
        const expDate = new Date(batch.expiryDate);
        if (expDate <= fourMonthsFromNow) {
          expiringData.push(batch);
        }
      }
    });

    // C. Update Tampilan Lonceng Notifikasi
    updateNotifBadge();
    renderProducts(); 
    
  } catch (error) {
    console.error("Error fetching data: ", error);
    grid.innerHTML = '<p style="color:red;">Gagal memuat data obat.</p>';
  }
}

// 2. Fungsi Update Lonceng
function updateNotifBadge() {
  const badge = document.getElementById('notif-badge');
  if (expiringData.length > 0) {
    badge.innerText = expiringData.length;
    badge.style.display = 'block';
  } else {
    badge.style.display = 'none';
  }
}

// 3. Fungsi Buka Modal Expired
window.openExpiryModal = function() {
  const listContainer = document.getElementById('expiry-list');
  
  if (expiringData.length === 0) {
    listContainer.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:gray;">Aman! Tidak ada obat yang mendekati expired.</td></tr>';
  } else {
    // Urutkan dari tanggal yang paling dekat
    expiringData.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
    
    listContainer.innerHTML = expiringData.map(batch => {
      const expDate = new Date(batch.expiryDate).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });
      return `
        <tr>
          <td><strong>${batch.medicineName}</strong></td>
          <td>${batch.batchNumber}</td>
          <td><span class="badge-date">${expDate}</span></td>
          <td><strong style="color:var(--accent-red);">${batch.quantity}</strong></td>
        </tr>
      `;
    }).join('');
  }
  
  document.getElementById('expiry-modal').style.display = 'flex';
}

window.closeExpiryModal = function() {
  document.getElementById('expiry-modal').style.display = 'none';
}

// 4. Render Produk POS (Tanpa Badge di Kartu)
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

// ... Sisa kode (addToCart, changeQty, updateCartUI, calculateTotals, search, simpan transaksi) SAMA PERSIS seperti sebelumnya ...
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

document.getElementById('search-input').addEventListener('input', (e) => {
  const keyword = e.target.value.toLowerCase();
  const filteredProducts = productsData.filter(product => {
    const matchName = product.name.toLowerCase().includes(keyword);
    const matchSku = product.sku ? product.sku.toLowerCase().includes(keyword) : false;
    return matchName || matchSku;
  });
  renderProducts(filteredProducts);
});

document.getElementById('btn-save').addEventListener('click', async () => {
  if (cart.length === 0) return alert('Keranjang kosong!');
  const btnSave = document.getElementById('btn-save');
  btnSave.innerText = 'Menyimpan...';
  btnSave.disabled = true;
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  
  try {
    await runTransaction(db, async (transaction) => {
      const itemsToUpdate = [];
      for (const item of cart) {
        const medRef = doc(db, "medicines", item.id);
        const medDoc = await transaction.get(medRef);
        if (!medDoc.exists()) throw new Error("Obat tidak ditemukan!");
        const currentStock = medDoc.data().stock;
        if (currentStock - item.qty < 0) throw new Error(`Stok ${item.name} tidak cukup!`);
        itemsToUpdate.push({ ref: medRef, newStock: currentStock - item.qty });
      }
      for (const updateData of itemsToUpdate) {
        transaction.update(updateData.ref, { stock: updateData.newStock });
      }
      const trxRef = doc(collection(db, "transactions"));
      transaction.set(trxRef, {
        transactionId: trxRef.id, date: serverTimestamp(), items: cart, subtotal: subtotal, total: subtotal, status: "completed", cashier: "Kasir 1"
      });
    });
    alert('Transaksi Berhasil Disimpan!');
    cart = []; updateCartUI(); fetchProducts(); 
  } catch (error) {
    console.error("Transaksi gagal: ", error);
    alert('Gagal menyimpan transaksi: ' + error.message);
  } finally {
    btnSave.innerHTML = 'SAVE <i data-lucide="chevron-up"></i>';
    btnSave.disabled = false;
    lucide.createIcons();
  }
});

document.getElementById('discount-percent').addEventListener('input', calculateTotals);
document.getElementById('amount-received').addEventListener('input', calculateTotals);

fetchProducts();
