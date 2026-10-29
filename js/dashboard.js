import { db } from './firebase.js';
import { collection, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Fungsi untuk memformat angka menjadi format Rupiah Indonesia
function formatRupiah(angka) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0 
  }).format(angka);
}

async function loadDashboardData() {
  try {
    // 1. AMBIL DATA OBAT (Untuk Medicine Info)
    const medSnapshot = await getDocs(collection(db, "medicines"));
    let totalObat = 0;
    let stokMenipis = 0;
    let stokHabis = 0;

    medSnapshot.forEach((doc) => {
      const data = doc.data();
      totalObat += data.stock; 
      
      if (data.stock === 0) {
        stokHabis++;
      } else if (data.stock < 10) {
        stokMenipis++;
      }
    });

    document.getElementById('total-medicine').innerText = totalObat;
    document.getElementById('low-stock').innerText = stokMenipis;
    document.getElementById('out-stock').innerText = stokHabis;

    // 2. AMBIL DATA TRANSAKSI TERBARU (Untuk Recent Orders)
    const trxQuery = query(collection(db, "transactions"), orderBy("date", "desc"), limit(5));
    const trxSnapshot = await getDocs(trxQuery);
    const listContainer = document.getElementById('recent-orders-list');
    
    if (trxSnapshot.empty) {
      listContainer.innerHTML = '<p style="color:gray;">Belum ada transaksi.</p>';
      return;
    }

    listContainer.innerHTML = ''; 

    trxSnapshot.forEach((doc) => {
      const trx = doc.data();
      
      let tanggal = "Baru saja";
      if (trx.date) {
         tanggal = trx.date.toDate().toLocaleString('id-ID');
      }

      // Render dengan format Rupiah
      listContainer.innerHTML += `
        <div style="display:flex; justify-content:space-between; border-bottom:1px solid #eee; padding:10px 0;">
          <div>
            <strong style="color:var(--text-primary);">${trx.transactionId.substring(0, 8)}...</strong><br>
            <span style="font-size:11px; color:gray;">${tanggal}</span>
          </div>
          <div style="text-align:right;">
            <strong style="color:var(--accent-green);">${formatRupiah(trx.total)}</strong><br>
            <span style="font-size:11px; background:#D1FAE5; color:#065F46; padding:2px 6px; border-radius:4px;">Selesai</span>
          </div>
        </div>
      `;
    });

  } catch (error) {
    console.error("Error loading dashboard: ", error);
    document.getElementById('recent-orders-list').innerHTML = '<p style="color:red;">Gagal memuat data.</p>';
  }
}

// Jalankan fungsi saat halaman dimuat
loadDashboardData();