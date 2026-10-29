import { db } from './firebase.js';
import { collection, getDocs, addDoc, doc, updateDoc, increment, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const modal = document.getElementById('inventory-modal');
const medicineListContainer = document.getElementById('item-list');
const supplierList = document.getElementById('supplier-list');
const batchList = document.getElementById('batch-list');
const totalNotif = document.getElementById('total-notif');
const scanInput = document.getElementById('scan-barcode');
let masterObat = []; 

async function loadMasters() {
  try {
    const medSnapshot = await getDocs(collection(db, "medicines"));
    masterObat = [];
    medSnapshot.forEach((doc) => {
      masterObat.push({ id: doc.id, ...doc.data() });
    });

    const supSnapshot = await getDocs(collection(db, "inventory_bills"));
    const uniqueSuppliers = new Set();
    supSnapshot.forEach((doc) => {
      if(doc.data().supplier) uniqueSuppliers.add(doc.data().supplier);
    });
    supplierList.innerHTML = '';
    uniqueSuppliers.forEach(sup => {
      supplierList.innerHTML += `<option value="${sup}">`;
    });

    const batchSnapshot = await getDocs(collection(db, "inventory_batches"));
    const uniqueBatches = new Set();
    batchSnapshot.forEach((doc) => {
      if(doc.data().batchNumber) uniqueBatches.add(doc.data().batchNumber);
    });
    batchList.innerHTML = '';
    uniqueBatches.forEach(batch => {
      batchList.innerHTML += `<option value="${batch}">`;
    });

  } catch (error) {
    console.error("Error loading masters: ", error);
  }
}

window.addItemRow = function(selectedMedId = "") {
  const card = document.createElement('div');
  card.className = 'item-card';
  
  let options = '<option value="">-- Pilih Obat --</option>';
  masterObat.forEach(med => {
    const isSelected = med.id === selectedMedId ? 'selected' : '';
    options += `<option value="${med.id}" data-name="${med.name}" data-stock="${med.stock}" ${isSelected}>${med.name} [${med.sku || 'No SKU'}]</option>`;
  });

  card.innerHTML = `
    <div class="form-group" style="margin-bottom:10px;">
      <label>Pilih Obat</label>
      <select class="input-med" required onchange="showStockInfo(this)">
        ${options}
      </select>
      <div class="stock-info" style="display:none;"></div>
    </div>
    
    <div style="display:flex; gap:10px; margin-bottom:10px;">
      <div class="form-group" style="flex:1;">
        <label>No. Batch</label>
        <input type="text" class="input-batch" list="batch-list" required placeholder="Batch">
      </div>
      <div class="form-group" style="flex:1;">
        <label>Expired</label>
        <input type="date" class="input-exp" required>
      </div>
    </div>
    
    <div style="display:flex; gap:10px; align-items:flex-end;">
      <div class="form-group" style="flex:1; margin-bottom:0;">
        <label>Qty Masuk</label>
        <input type="number" class="input-qty" required min="1" placeholder="0" oninput="updateTotalNotif()">
      </div>
      <button type="button" class="btn-remove-item" onclick="removeItemRow(this)"><i data-lucide="trash-2" size="16"></i></button>
    </div>
  `;
  medicineListContainer.appendChild(card);
  lucide.createIcons();

  if (selectedMedId) {
    const selectEl = card.querySelector('.input-med');
    showStockInfo(selectEl);
    card.querySelector('.input-batch').focus(); 
  }
}

window.processScan = function() {
  const barcode = scanInput.value.trim();
  if (!barcode) return;

  if (masterObat.length === 0) {
    return alert("Sedang memuat data obat, tunggu sebentar...");
  }

  const searchKey = barcode.replace(/\s+/g, '').toLowerCase();
  const foundMed = masterObat.find(m => m.sku && m.sku.replace(/\s+/g, '').toLowerCase() === searchKey);

  if (foundMed) {
    addItemRow(foundMed.id); 
    scanInput.value = ''; 
  } else {
    alert(`Kode "${barcode}" tidak ditemukan!`);
  }
}

scanInput.addEventListener('keydown', function(e) {
  if (e.key === 'Enter' || e.keyCode === 13) {
    e.preventDefault();
    processScan();
  }
});

window.removeItemRow = function(btn) {
  btn.closest('.item-card').remove();
  updateTotalNotif();
}

window.showStockInfo = function(selectElement) {
  const selectedOption = selectElement.options[selectElement.selectedIndex];
  const currentStock = selectedOption.getAttribute('data-stock');
  const infoDiv = selectElement.nextElementSibling;
  
  if (currentStock !== null && currentStock !== undefined && currentStock !== "") {
    infoDiv.style.display = 'block';
    infoDiv.innerHTML = `<i data-lucide="info" size="12" style="vertical-align:middle; margin-right:2px;"></i> Sisa stok: <b>${currentStock}</b>`;
    lucide.createIcons();
  } else {
    infoDiv.style.display = 'none';
  }
}

window.updateTotalNotif = function() {
  const qtyInputs = document.querySelectorAll('.input-qty');
  let totalQty = 0;
  qtyInputs.forEach(input => {
    const val = parseInt(input.value);
    if (!isNaN(val)) totalQty += val;
  });
  if (totalQty > 0) {
    totalNotif.style.display = 'block';
    totalNotif.innerText = `Total: ${totalQty} Qty`;
  } else {
    totalNotif.style.display = 'none';
  }
}

window.openModal = function() {
  document.getElementById('inv-bill').value = '';
  document.getElementById('inv-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('inv-supplier').value = '';
  medicineListContainer.innerHTML = '';
  totalNotif.style.display = 'none';
  scanInput.value = '';
  addItemRow(); 
  modal.style.display = 'flex';
}

window.closeModal = function() {
  modal.style.display = 'none';
}

window.saveBon = async function() {
  const billNumber = document.getElementById('inv-bill').value;
  const date = document.getElementById('inv-date').value;
  const supplier = document.getElementById('inv-supplier').value;
  
  if (!billNumber || !date || !supplier) return alert('Lengkapi data Bon terlebih dahulu!');
  
  const cards = medicineListContainer.querySelectorAll('.item-card');
  if (cards.length === 0) return alert('Tambahkan minimal 1 obat!');

  const itemsToSave = [];
  
  for (const card of cards) {
    const medSelect = card.querySelector('.input-med');
    const medId = medSelect.value;
    const medName = medSelect.options[medSelect.selectedIndex]?.getAttribute('data-name');
    const batch = card.querySelector('.input-batch').value;
    const exp = card.querySelector('.input-exp').value;
    const qty = parseInt(card.querySelector('.input-qty').value);

    if (!medId || !batch || !exp || !qty || qty <= 0) {
      return alert('Ada baris obat yang datanya belum lengkap / Qty tidak valid!');
    }
    itemsToSave.push({ medicineId: medId, medicineName: medName, batch, expiryDate: exp, quantity: qty });
  }

  const btnSubmit = document.getElementById('btn-submit');
  btnSubmit.innerText = '...';
  btnSubmit.disabled = true;

  try {
    const billRef = await addDoc(collection(db, "inventory_bills"), {
      billNumber: billNumber,
      supplier: supplier,
      date: date,
      items: itemsToSave,
      totalItemTypes: itemsToSave.length,
      totalQty: itemsToSave.reduce((sum, item) => sum + item.quantity, 0),
      createdAt: serverTimestamp()
    });

    for (const item of itemsToSave) {
      const medRef = doc(db, "medicines", item.medicineId);
      await updateDoc(medRef, { stock: increment(item.quantity) });

      await addDoc(collection(db, "inventory_batches"), {
        billId: billRef.id,
        medicineId: item.medicineId,
        medicineName: item.medicineName,
        batchNumber: item.batch,
        expiryDate: item.expiryDate,
        quantity: item.quantity,
        supplier: supplier,
        createdAt: serverTimestamp()
      });
    }

    alert(`Berhasil! Bon ${billNumber} tersimpan.`);
    closeModal();
    loadHistory(); 
    loadMasters(); 
  } catch (error) {
    console.error("Error saving bon: ", error);
    alert('Gagal menyimpan Bon: ' + error.message);
  } finally {
    btnSubmit.innerText = 'Simpan';
    btnSubmit.disabled = false;
  }
}

// DESAIN TABEL RIWAYAT YANG BARU (SUPER KECIL)
async function loadHistory() {
  const tableBody = document.getElementById('inventory-list');
  tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">Memuat...</td></tr>';
  
  try {
    const q = query(collection(db, "inventory_bills"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    tableBody.innerHTML = '';
    
    if(querySnapshot.empty) {
      tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px; color:gray;">Belum ada riwayat.</td></tr>';
      return;
    }
    
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      
      // Format Tanggal: 29 Okt 26
      const dateObj = new Date(data.date);
      const dateIn = dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' }).replace('.', '');

      const row = document.createElement('tr');
      row.innerHTML = `
        <td style="font-weight:700; color:var(--text-primary);">${data.billNumber}</td>
        <td style="font-size:10px;">${data.supplier}</td>
        <td style="color:var(--text-secondary); font-size:10px;">${dateIn}</td>
        <td style="font-weight:600;">${data.totalItemTypes}</td>
        <td><span style="background:#D1FAE5; color:#065F46; padding:2px 6px; border-radius:6px; font-weight:700; font-size:10px;">+${data.totalQty}</span></td>
      `;
      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error("Error: ", error);
    tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">Gagal memuat data.</td></tr>';
  }
}

loadMasters();
loadHistory();