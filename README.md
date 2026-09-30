# 🌾 ERP PD Putra Pribumi

<div align="center">

![Go](https://img.shields.io/badge/Go-1.24-00ADD8?style=for-the-badge&logo=go&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-4.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3.3-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white)

**Sistem ERP (Enterprise Resource Planning) lengkap untuk manajemen operasional penggilingan padi.**  
Dibangun dengan Go (Gin) di sisi backend dan React + TypeScript di sisi frontend.

[Dokumentasi API](#api-endpoints) · [Panduan Instalasi](#-instalasi)

<br/>

![Tampilan Dashboard](assets/dashboard.png)

*(Tampilan UI Aplikasi - Dashboard)*

</div>

---

## 📌 Tentang Proyek

**ERP PD Putra Pribumi** adalah sistem manajemen operasional terintegrasi yang dirancang khusus untuk industri penggilingan padi. Sistem ini mencakup seluruh alur bisnis dari pembelian gabah, proses produksi, penjualan hasil giling, manajemen jasa giling, hingga pelaporan keuangan.

Proyek ini dibangun sebagai solusi nyata untuk menggantikan pencatatan manual yang rentan terhadap kesalahan, dan memberikan visibilitas penuh terhadap operasional bisnis secara real-time.

---

## 🔑 Demo & Hak Akses
Jika sistem ini sudah di-deploy secara publik, Anda dapat menguji fitur aplikasi (dengan hak akses terbatas/penuh) menggunakan kredensial berikut:

- **Username:** `admin`
- **Password:** `admin123`
- **Role:** OWNER (Full Access)

---

## ✨ Fitur Utama

### 📦 Manajemen Pembelian
- Pencatatan pembelian gabah dari pemasok dengan tracking batch
- Pembelian beras langsung (trading) dengan sistem FIFO otomatis
- Status pembayaran: Lunas, DP (Sebagian), Hutang
- Riwayat penggunaan stok per batch pembelian

### ⚙️ Produksi & Penggilingan
- Manajemen batch produksi dengan tracking bahan baku multi-sumber
- Kalkulasi HPP (Harga Pokok Produksi) otomatis per batch
- Sistem alokasi bahan baku fleksibel (dari pembelian gabah, stok produk sampingan, atau karung)
- Log produksi lengkap dengan audit trail

### 🛒 Penjualan
- Pencatatan penjualan produk jadi (beras, menir, dedak, dll)
- Penjualan dari stok batch produksi menggunakan algoritma FIFO
- Tracking piutang pelanggan secara otomatis
- Manajemen status pembayaran dan pelunasan

### 🌀 Jasa Giling
- Pencatatan jasa giling untuk pelanggan eksternal
- Kalkulasi biaya jasa berdasarkan berat gabah dan jenis layanan
- Tracking pembayaran jasa giling

### 🏦 Keuangan
- **Kas & Akun Kas**: Manajemen multi-akun kas dengan riwayat transaksi
- **Hutang & Piutang**: Tracking hutang ke pemasok dan piutang dari pelanggan
- **Biaya Operasional**: Pencatatan pengeluaran operasional harian
- **Laporan Keuangan**: Ringkasan pendapatan, HPP, dan laba kotor

### 📦 Inventaris
- Manajemen stok produk (Gabah, Beras, Menir, Dedak, Karung)
- Riwayat aktivitas stok (masuk/keluar) per produk
- Manajemen stok karung dengan tracking penggunaan per batch produksi

### 🔐 Autentikasi & Otorisasi
- JWT-based authentication
- Role-Based Access Control (RBAC) dengan 5 level akses:
  | Role | Akses |
  |------|-------|
  | **OWNER** | Full access ke semua fitur |
  | **ADMIN** | Pembelian, Penjualan, Jasa Giling, Laporan |
  | **KASIR** | Penjualan, Jasa Giling, Stok (read-only) |
  | **GUDANG** | Pembelian, Produksi, Stok, Karung |
  | **VIEWER** | Read-only semua modul |

### 📋 Activity Log
- Pencatatan semua aktivitas user secara otomatis
- Filter berdasarkan user, modul, dan rentang tanggal

---

## 🛠️ Tech Stack

### Backend
| Teknologi | Versi | Kegunaan |
|-----------|-------|---------|
| **Go** | 1.24 | Bahasa pemrograman utama |
| **Gin** | v1.10 | HTTP web framework |
| **GORM** | v1.30 | ORM untuk database MySQL |
| **MySQL** | 8.0 | Database relasional |
| **JWT (golang-jwt)** | v5 | Autentikasi token |
| **godotenv** | v1.5 | Manajemen environment variables |

### Frontend
| Teknologi | Versi | Kegunaan |
|-----------|-------|---------|
| **React** | 19 | UI library |
| **TypeScript** | 4.9 | Type-safe JavaScript |
| **Tailwind CSS** | 3.3 | Utility-first CSS framework |
| **React Router** | v7 | Client-side routing |
| **Recharts** | v3 | Visualisasi grafik dan chart |
| **Headless UI** | v2 | Komponen UI accessible |
| **Heroicons** | v2 | Icon library |
| **React Icons** | v4 | Extended icon library |

---

## 🏗️ Arsitektur Sistem

```text
erp-pd-putra-pribumi/
├── backend/                    # Go REST API
│   ├── cmd/
│   │   └── main.go             # Entry point & route registration
│   └── internal/
│       ├── handler/            # HTTP request handlers (controllers)
│       ├── service/            # Business logic layer
│       ├── repository/         # Data access layer
│       ├── model/              # Database models & structs
│       ├── middleware/         # JWT auth & role middleware
│       └── helper/             # Utility functions
│
└── frontend/                   # React + TypeScript SPA
    └── src/
        ├── pages/              # 18 halaman utama aplikasi
        ├── components/         # Reusable UI components
        ├── contexts/           # React Context (Auth, Permission)
        ├── services/           # API client (axios wrapper)
        └── types.ts            # TypeScript type definitions
Alur Arsitektur BackendPlaintextHTTP Request
    ↓
Middleware (JWT Auth + Role Check)
    ↓
Handler (Input Validation)
    ↓
Service (Business Logic + Transaction)
    ↓
Repository (GORM Query)
    ↓
MySQL Database
🚀 InstalasiPrasyaratGo 1.21+Node.js 18+ & npmMySQL 8.0+Git1. Clone RepositoryBashgit clone [https://github.com/restuhaerul/erp-pd-putra-pribumi.git](https://github.com/restuhaerul/erp-pd-putra-pribumi.git)
cd erp-pd-putra-pribumi
2. Setup BackendBashcd backend

# Buat file environment
cp .env.example .env
Edit file .env sesuai konfigurasi lokal:Code snippetDB_USER=root
DB_PASSWORD=your_password
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=putrapribumi
JWT_SECRET=your_secret_key_here
Bash# Install dependencies
go mod download

# Buat database
mysql -u root -p -e "CREATE DATABASE putrapribumi CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Jalankan server (auto-migrate schema)
go run cmd/main.go
Server berjalan di: http://localhost:80813. Setup FrontendBashcd ../frontend

# Buat file environment
cp .env.example .env
Edit file .env:Code snippetREACT_APP_API_URL=http://localhost:8081
Bash# Install dependencies
npm install

# Jalankan development server
npm start
Aplikasi berjalan di: http://localhost:30004. Akun DefaultSetelah pertama kali run, buat akun OWNER melalui endpoint:PlaintextPOST /api/register
Atau gunakan halaman /register (hanya bisa diakses oleh OWNER yang sudah login).🌐 DeployFrontend (Vercel)Import repo ke VercelSet konfigurasi:Root Directory: frontendBuild Command: npm run buildOutput Directory: buildTambahkan Environment Variable:Code snippetREACT_APP_API_URL=[https://your-backend-url.com](https://your-backend-url.com)
Backend (Railway / Render / VPS)Set environment variables di platform deploy:Code snippetDB_USER=...
DB_PASSWORD=...
DB_HOST=...
DB_PORT=3306
DB_NAME=putrapribumi
JWT_SECRET=...
Build command: go build -o main ./cmd/main.goStart command: ./main📡 API EndpointsAuthMethodEndpointDeskripsiPOST/api/loginLogin dan dapatkan JWT tokenGET/api/meInfo user yang sedang loginPOST/api/registerRegistrasi user baru (OWNER only)Pembelian GabahMethodEndpointRoleGET/api/pembelianOWNER, ADMIN, GUDANGPOST/api/pembelianOWNER, ADMIN, GUDANGPUT/api/pembelian/:idOWNER, ADMIN, GUDANGDELETE/api/pembelian/:idOWNER onlyProduksiMethodEndpointRoleGET/api/produksiOWNER, ADMIN, GUDANGPOST/api/produksiOWNER, ADMIN, GUDANGPUT/api/produksi/:idOWNER onlyDELETE/api/produksi/:idOWNER onlyPenjualanMethodEndpointRoleGET/api/penjualanOWNER, ADMIN, KASIRPOST/api/penjualanOWNER, ADMIN, KASIRDELETE/api/penjualan/:idOWNER, ADMINLihat semua endpoint di backend/cmd/main.go📸 Halaman AplikasiHalamanDeskripsiDashboardRingkasan statistik, grafik penjualan & produksiPembelian GabahManajemen pembelian gabah + tracking batchPembelian BerasTrading beras langsung dari pemasokProduksiBatch produksi + kalkulasi HPP otomatisPenjualanPencatatan penjualan + manajemen piutangJasa GilingLayanan giling untuk pelanggan eksternalStok ProdukInventaris semua produk + riwayat aktivitasKarungManajemen stok & pembelian karungKasRiwayat transaksi masuk/keluar per akunAkun KasManajemen rekening & akun kasHutang & PiutangTracking tagihan masuk dan keluarBiaya OperasionalPencatatan pengeluaran operasionalLaporanLaporan keuangan periodeActivity LogsAudit trail semua aktivitas user🔑 Logika Bisnis UtamaFIFO InventorySistem menggunakan algoritma First In, First Out untuk pengambilan stok dari batch produksi dan pembelian. Ini memastikan stok terlama digunakan terlebih dahulu, sesuai standar akuntansi.HPP OtomatisHarga Pokok Produksi dikalkulasi otomatis berdasarkan:Total biaya pembelian bahan baku per batchBiaya operasional yang dialokasikanJumlah output produksi (Kg)Multi-Sumber Bahan BakuSatu batch produksi dapat menggunakan bahan baku dari beberapa sumber sekaligus:Stok gabah dari pembelianStok produk sampinganStok karung🤝 KontribusiProyek ini bersifat portfolio. Saran dan feedback sangat diterima melalui Issues.📄 LisensiMIT License — lihat file LICENSE untuk detail.Dibuat dengan ❤️ oleh Restu Haerul Zamzam
