import { db } from './firebase.js';
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const tableBody = document.getElementById('transaction-list');

function formatRupiah(angka) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
}

async function loadTransactions() {
  try {
    // Ambil data dari koleksi transactions, urutkan dari yang terbaru
    const q = query(collection(db, "transactions"), orderBy("date", "desc"));
    const querySnapshot = await getDocs(q);
    
    tableBody.innerHTML = '';

    if (querySnapshot.empty) {
      tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:gray;">Belum ada transaksi.</td></tr>';
      return;
    }

    querySnapshot.forEach((doc) => {
      const trx = doc.data();
      
      // Format tanggal
      let tanggal = "-";
      if (trx.date) {
        tanggal = trx.date.toDate().toLocaleString('id-ID', {
          dateStyle: 'medium', 
          timeStyle: 'short'
        });
      }

      // Ambil 8 karakter pertama dari ID agar tidak terlalu panjang
      const shortId = trx.transactionId.substring(0, 8).toUpperCase();

      const row = document.createElement('tr');
      row.innerHTML = `
        <td><strong>#${shortId}</strong></td>
        <td>${tanggal}</td>
        <td>${trx.cashier}</td>
        <td><strong style="color: var(--accent-green);">${formatRupiah(trx.total)}</strong></td>
        <td><span class="badge-status">Selesai</span></td>
      `;
      tableBody.appendChild(row);
    });

  } catch (error) {
    console.error("Error: ", error);
    tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">Gagal memuat data transaksi.</td></tr>';
  }
}

// Jalankan
loadTransactions();