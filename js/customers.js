import { db } from './firebase.js';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const tableBody = document.getElementById('customer-list');
const modal = document.getElementById('customer-modal');
const form = document.getElementById('customer-form');

// 1. Ambil Data Pelanggan
async function loadCustomers() {
  tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Memuat data...</td></tr>';
  
  try {
    const querySnapshot = await getDocs(collection(db, "customers"));
    tableBody.innerHTML = '';

    if(querySnapshot.empty) {
      tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Belum ada data pelanggan.</td></tr>';
      return;
    }

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const id = docSnap.id;

      // Tentukan badge HTML berdasarkan status
      const badgeClass = data.status === 'Member' ? 'badge-member' : 'badge-regular';

      const row = document.createElement('tr');
      row.innerHTML = `
        <td><strong>${data.name}</strong></td>
        <td>${data.phone}</td>
        <td>${data.address || '-'}</td>
        <td><span class="${badgeClass}">${data.status}</span></td>
        <td>
          <button class="btn-icon btn-edit" onclick="editCustomer('${id}', '${data.name}', '${data.phone}', '${data.address || ''}', '${data.status}')">
            <i data-lucide="edit" size="18"></i>
          </button>
          <button class="btn-icon btn-delete" onclick="deleteCustomer('${id}', '${data.name}')">
            <i data-lucide="trash-2" size="18"></i>
          </button>
        </td>
      `;
      tableBody.appendChild(row);
    });
    
    lucide.createIcons();
  } catch (error) {
    console.error("Error: ", error);
    tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">Gagal memuat data.</td></tr>';
  }
}

// 2. Buka/Tutup Modal
window.openModal = function() {
  form.reset();
  document.getElementById('cust-id').value = '';
  document.getElementById('modal-title').innerText = 'Tambah Pelanggan Baru';
  modal.style.display = 'flex';
}

window.closeModal = function() {
  modal.style.display = 'none';
}

// 3. Simpan Data (Tambah / Edit)
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btnSubmit = document.getElementById('btn-submit');
  btnSubmit.innerText = 'Menyimpan...';
  btnSubmit.disabled = true;

  const id = document.getElementById('cust-id').value;
  const name = document.getElementById('cust-name').value;
  const phone = document.getElementById('cust-phone').value;
  const address = document.getElementById('cust-address').value;
  const status = document.getElementById('cust-status').value;

  const dataPelanggan = { name, phone, address, status };

  try {
    if (id) {
      await updateDoc(doc(db, "customers", id), dataPelanggan);
      alert('Data pelanggan berhasil diperbarui!');
    } else {
      await addDoc(collection(db, "customers"), dataPelanggan);
      alert('Pelanggan baru berhasil ditambahkan!');
    }
    closeModal();
    loadCustomers(); 
  } catch (error) {
    console.error("Error saving: ", error);
    alert('Gagal menyimpan data: ' + error.message);
  } finally {
    btnSubmit.innerText = 'Simpan';
    btnSubmit.disabled = false;
  }
});

// 4. Edit Pelanggan
window.editCustomer = function(id, name, phone, address, status) {
  document.getElementById('cust-id').value = id;
  document.getElementById('cust-name').value = name;
  document.getElementById('cust-phone').value = phone;
  document.getElementById('cust-address').value = address;
  document.getElementById('cust-status').value = status;
  
  document.getElementById('modal-title').innerText = 'Edit Data Pelanggan';
  modal.style.display = 'flex';
}

// 5. Hapus Pelanggan
window.deleteCustomer = async function(id, name) {
  const konfirmasi = confirm(`Yakin ingin menghapus pelanggan "${name}"?`);
  
  if (konfirmasi) {
    try {
      await deleteDoc(doc(db, "customers", id));
      alert('Pelanggan berhasil dihapus.');
      loadCustomers(); 
    } catch (error) {
      console.error("Error deleting: ", error);
      alert('Gagal menghapus pelanggan.');
    }
  }
}

// Jalankan
loadCustomers();