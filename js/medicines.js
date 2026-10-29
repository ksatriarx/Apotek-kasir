import { db } from './firebase.js';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const tableBody = document.getElementById('medicine-list');
const modal = document.getElementById('medicine-modal');
const form = document.getElementById('medicine-form');

// Format angka (tanpa Rp) untuk tabel
function formatAngka(angka) {
  return new Intl.NumberFormat('id-ID').format(angka || 0);
}

// FUNGSI BARU: Generate Kode Berurutan (0001, 0002, dst)
window.generateSKU = async function() {
  const btn = document.querySelector('.btn-generate');
  const originalText = btn.innerText;
  btn.innerText = '...';
  btn.disabled = true;

  try {
    // Ambil semua data obat untuk mencari angka tertinggi
    const querySnapshot = await getDocs(collection(db, "medicines"));
    let maxSku = 0;
    
    querySnapshot.forEach((docSnap) => {
      const skuStr = docSnap.data().sku;
      
      // Pastikan yang diproses hanya kode yang murni angka
      if (skuStr && /^\d+$/.test(skuStr)) {
        const num = parseInt(skuStr, 10);
        if (num > maxSku) {
          maxSku = num;
        }
      }
    });

    // Tambah 1 dari angka tertinggi
    const nextSku = maxSku + 1;
    
    // Format menjadi minimal 4 digit dengan angka 0 di depan (0001)
    // Jika lebih dari 9999, otomatis jadi 5 digit (10000)
    const formattedSku = String(nextSku).padStart(4, '0');
    
    // Masukkan ke dalam form input
    document.getElementById('med-sku').value = formattedSku;

  } catch (error) {
    console.error("Error generating SKU:", error);
    alert("Gagal membuat kode otomatis. Periksa koneksi internet.");
  } finally {
    btn.innerText = originalText;
    btn.disabled = false;
  }
}

async function loadMedicines() {
  tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Memuat...</td></tr>';
  try {
    const querySnapshot = await getDocs(collection(db, "medicines"));
    tableBody.innerHTML = '';
    if(querySnapshot.empty) {
      tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Belum ada data obat.</td></tr>';
      return;
    }

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      let badgeClass = data.stock === 0 ? 'stock-out' : (data.stock < 10 ? 'stock-low' : 'stock-safe');

      const row = document.createElement('tr');
      row.innerHTML = `
        <td style="font-weight:600;">${data.sku || '-'}</td>
        <td>${data.name}</td>
        <td>${formatAngka(data.costPrice)}</td>
        <td>${formatAngka(data.price)}</td>
        <td><span class="badge-stock ${badgeClass}">${data.stock}</span></td>
        <td>
          <button class="btn-icon btn-edit" onclick="editMedicine('${docSnap.id}', '${data.sku}', '${data.name}', '${data.desc}', ${data.costPrice}, ${data.price}, '${data.imageUrl}', '${data.rack}')"><i data-lucide="edit"></i></button>
          <button class="btn-icon btn-delete" onclick="deleteMedicine('${docSnap.id}', '${data.name}')"><i data-lucide="trash-2"></i></button>
        </td>
      `;
      tableBody.appendChild(row);
    });
    lucide.createIcons();
  } catch (error) { console.error(error); }
}

window.openModal = function() {
  form.reset();
  document.getElementById('med-id').value = '';
  document.getElementById('modal-title').innerText = 'Daftarkan Obat Baru';
  modal.style.display = 'flex';
}
window.closeModal = function() { modal.style.display = 'none'; }

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btnSubmit = document.getElementById('btn-submit');
  btnSubmit.innerText = '...'; btnSubmit.disabled = true;

  const id = document.getElementById('med-id').value;
  
  const dataObat = {
    sku: document.getElementById('med-sku').value,
    name: document.getElementById('med-name').value,
    desc: document.getElementById('med-desc').value,
    costPrice: parseFloat(document.getElementById('med-cost').value) || 0,
    price: parseFloat(document.getElementById('med-price').value),
    imageUrl: document.getElementById('med-image').value,
    rack: document.getElementById('med-rack').value
  };

  try {
    if (id) {
      await updateDoc(doc(db, "medicines", id), dataObat);
      alert('Data diperbarui!');
    } else {
      dataObat.stock = 0;
      await addDoc(collection(db, "medicines"), dataObat);
      alert('Obat berhasil didaftarkan!');
    }
    closeModal(); loadMedicines(); 
  } catch (error) { alert('Error: ' + error.message); } 
  finally { btnSubmit.innerText = 'Simpan'; btnSubmit.disabled = false; }
});

window.editMedicine = function(id, sku, name, desc, cost, price, image, rack) {
  document.getElementById('med-id').value = id;
  document.getElementById('med-sku').value = sku;
  document.getElementById('med-name').value = name;
  document.getElementById('med-desc').value = desc;
  document.getElementById('med-cost').value = cost;
  document.getElementById('med-price').value = price;
  document.getElementById('med-image').value = image;
  document.getElementById('med-rack').value = rack;
  document.getElementById('modal-title').innerText = 'Edit Data Obat';
  modal.style.display = 'flex';
}

window.deleteMedicine = async function(id, name) {
  if (confirm(`Hapus obat "${name}"?`)) {
    await deleteDoc(doc(db, "medicines", id));
    loadMedicines();
  }
}

loadMedicines();