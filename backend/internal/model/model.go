package model

import (
	"fmt"
	"time"
)

// Model Definitif dengan GORM dan JSON tags
// gorm:"column:nama_kolom_di_db" -> Memberitahu GORM cara berkomunikasi dengan Database.
// json:"nama_properti_di_json" -> Memberitahu Go cara berkomunikasi dengan Frontend.

type Produk struct {
	ID            uint      `gorm:"primaryKey;column:id" json:"id"`
	NamaProduk    string    `gorm:"type:varchar(255);column:nama_produk" json:"nama_produk"`
	TipeProduk    string    `gorm:"type:enum('BAHAN_MENTAH', 'PRODUK_JADI', 'PRODUK_SAMPINGAN', 'PERLENGKAPAN', 'KEMASAN');column:tipe_produk" json:"tipe_produk"`
	Satuan        string    `gorm:"type:varchar(50);column:satuan" json:"satuan"`
	LacakPerBatch bool      `gorm:"default:false;column:lacak_per_batch" json:"lacak_per_batch"`
	Deskripsi     string    `gorm:"column:deskripsi" json:"deskripsi"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type BatchPembelian struct {
	ID               uint      `gorm:"primaryKey;column:id" json:"id"`
	ProdukID         uint      `gorm:"column:produk_id" json:"produk_id"`
	TglPembelian     time.Time `gorm:"column:tgl_pembelian" json:"tgl_pembelian"`
	NamaPemasok      string    `gorm:"type:varchar(255);column:nama_pemasok" json:"nama_pemasok"`
	JumlahKg         float64   `gorm:"type:decimal(10,2);column:jumlah_kg" json:"jumlah_kg"`
	HargaPerKg       float64   `gorm:"type:decimal(10,2);column:harga_per_kg" json:"harga_per_kg"`
	SisaKg           float64   `gorm:"type:decimal(10,2);column:sisa_kg" json:"sisa_kg"`
	TotalHarga       float64   `gorm:"type:decimal(15,2);column:total_harga" json:"total_harga"`
	Produk           Produk    `gorm:"foreignKey:ProdukID" json:"produk"`
	JumlahDigunakan  float64   `gorm:"-" json:"jumlah_digunakan"`
	IsTerpakai       bool      `gorm:"-" json:"is_terpakai"`
	StatusPembayaran string    `gorm:"type:enum('BELUM_LUNAS', 'LUNAS', 'SEBAGIAN');default:'BELUM_LUNAS'" json:"status_pembayaran"`
	NilaiTerbayar    float64   `gorm:"type:decimal(18,2);default:0" json:"nilai_terbayar"`
	Status           string    `gorm:"type:enum('AKTIF', 'DIBATALKAN');default:'AKTIF'" json:"status"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

// Anda bisa melanjutkan pola yang sama untuk struct lainnya jika diperlukan,
// tetapi Produk dan BatchPembelian adalah yang paling krusial untuk masalah Anda saat ini.
// Di bawah ini saya sertakan contoh lengkap untuk semua model Anda.

type TransaksiPenjualan struct {
	ID             uint      `gorm:"primaryKey;column:id" json:"id"`
	TglTransaksi   time.Time `gorm:"column:tgl_transaksi" json:"tgl_transaksi"`
	NamaPelanggan  string    `gorm:"type:varchar(255);column:nama_pelanggan" json:"nama_pelanggan"`
	ProdukID       uint      `gorm:"column:produk_id" json:"produk_id"`
	JumlahKg       float64   `gorm:"type:decimal(10,2);column:jumlah_kg" json:"jumlah_kg"`
	HargaJualPerKg float64   `gorm:"type:decimal(10,2);column:harga_jual_per_kg" json:"harga_jual_per_kg"`
	Laba           float64   `gorm:"type:decimal(10,2);column:laba" json:"laba"`
	Produk         Produk    `gorm:"foreignKey:ProdukID" json:"produk"`
	// --- KOLOM INI TETAP DIPERTAHANKAN SESUAI INSTRUKSI ANDA ---
	BatchProduksiID *uint          `gorm:"column:batch_produksi_id" json:"batch_produksi_id,omitempty"`
	BatchProduksi   *BatchProduksi `gorm:"foreignKey:BatchProduksiID" json:"batch_produksi,omitempty"`
	// --- PENAMBAHAN KOLOM KEUANGAN & STATUS ---
	StatusPembayaran string    `gorm:"type:enum('BELUM_LUNAS', 'LUNAS', 'SEBAGIAN');default:'BELUM_LUNAS'" json:"status_pembayaran"`
	NilaiTerbayar    float64   `gorm:"type:decimal(18,2);default:0" json:"nilai_terbayar"`
	Status           string    `gorm:"type:enum('AKTIF', 'DIBATALKAN');default:'AKTIF'" json:"status"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

type Konfigurasi struct {
	ID                      uint    `gorm:"primaryKey;column:id" json:"id"`
	BiayaProduksiPerKgGabah float64 `gorm:"column:biaya_produksi_per_kg_gabah" json:"biaya_produksi_per_kg_gabah"`
	HargaJualDedakPerKg     float64 `gorm:"column:harga_jual_dedak_per_kg" json:"harga_jual_dedak_per_kg"`
	HargaJualMenirPerKg     float64 `gorm:"column:harga_jual_menir_per_kg" json:"harga_jual_menir_per_kg"`
	// ✅ TAMBAHKAN FIELD BARU INI
	TarifJasaGilingUmumPerKgBeras    float64 `gorm:"column:tarif_jasa_giling_umum_per_kg_beras" json:"tarif_jasa_giling_umum_per_kg_beras"`
	TarifJasaGilingPribadiPerKgGabah float64 `gorm:"column:tarif_jasa_giling_pribadi_per_kg_gabah" json:"tarif_jasa_giling_pribadi_per_kg_gabah"` // BARU
}

type StokProduk struct {
	ID          uint    `gorm:"primaryKey;column:id" json:"id"`
	ProdukID    uint    `gorm:"unique;column:produk_id" json:"produk_id"`
	TotalStokKg float64 `gorm:"column:total_stok_kg" json:"total_stok_kg"`
	HppRataRata float64 `gorm:"type:decimal(15,2);column:hpp_rata_rata" json:"hpp_rata_rata"`
	Produk      Produk  `gorm:"foreignKey:ProdukID" json:"produk"`
}

type BatchProduksi struct {
	ID               uint             `gorm:"primaryKey;column:id" json:"id"`
	ProdukID         uint             `gorm:"column:produk_id" json:"produk_id"`
	TglProduksi      time.Time        `gorm:"column:tgl_produksi" json:"tgl_produksi"`
	JumlahProduksiKg float64          `gorm:"type:decimal(10,2);column:jumlah_produksi_kg" json:"jumlah_produksi_kg"`
	Produk           Produk           `gorm:"foreignKey:ProdukID" json:"produk"`
	SumberDigunakan  []ProduksiSumber `gorm:"foreignKey:BatchProduksiID" json:"sumber_digunakan"`
	// --- TAMBAHKAN DUA BARIS INI ---
	TotalBiayaProduksi float64 `gorm:"type:decimal(15,2);column:total_biaya_produksi" json:"total_biaya_produksi"`
	SisaKg             float64 `gorm:"type:decimal(10,2);column:sisa_kg" json:"sisa_kg"`
	// ------------------------------
	// --- TAMBAHKAN KOLOM BARU INI ---
	IsTerpakai bool `gorm:"default:false;column:is_terpakai" json:"is_terpakai"`
	// ✅ TAMBAHKAN DUA FIELD BARU INI
	KarungDigunakan int `gorm:"column:karung_digunakan;default:0" json:"karung_digunakan"`
	// ✅ TAMBAHKAN FIELD BARU INI UNTUK RELASI DATA
	SumberKarung []ProduksiKarungSumber `gorm:"foreignKey:BatchProduksiID" json:"sumber_karung"`
	// ✅ TAMBAHKAN FIELD BARU INI UNTUK MELACAK SISA KARUNG
	SisaKarung            int   `gorm:"column:sisa_karung;default:0" json:"sisa_karung"`
	TransaksiJasaGilingID *uint `gorm:"column:transaksi_jasa_giling_id" json:"transaksi_jasa_giling_id,omitempty"` // BARU
}

type ProduksiSumber struct {
	ID               uint  `gorm:"primaryKey;column:id" json:"id"`
	BatchProduksiID  uint  `gorm:"column:batch_produksi_id" json:"batch_produksi_id"`
	BatchPembelianID *uint `gorm:"column:batch_pembelian_id" json:"batch_pembelian_id"`
	StokProdukID     *uint `gorm:"column:stok_produk_id" json:"stok_produk_id"`

	// --- TAMBAHKEUN KOLOM BARU IEU ---
	// Pikeun nyimpen ID tina batch produksi anu dijantenkeun sumber
	BatchProduksiSumberID *uint `gorm:"column:batch_produksi_sumber_id" json:"batch_produksi_sumber_id,omitempty"`
	// --------------------------------

	JumlahKgDigunakan float64 `gorm:"type:decimal(10,2);column:jumlah_kg_digunakan" json:"jumlah_kg_digunakan"`

	// Relasi
	BatchPembelian *BatchPembelian `gorm:"foreignKey:BatchPembelianID" json:"batch_pembelian,omitempty"`
	StokProduk     *StokProduk     `gorm:"foreignKey:StokProdukID" json:"stok_produk,omitempty"`
	// --- TAMBAHKEUN RELASI BARU IEU ---
	BatchProduksiSumber *BatchProduksi `gorm:"foreignKey:BatchProduksiSumberID" json:"batch_produksi_sumber,omitempty"`
}

type BiayaOperasional struct {
	ID        uint      `gorm:"primaryKey;column:id" json:"id"`
	Tanggal   time.Time `gorm:"column:tanggal" json:"tanggal"`
	Kategori  string    `gorm:"type:enum('...', 'PEMBELIAN_BAHAN');column:kategori" json:"kategori"`
	Deskripsi string    `gorm:"column:deskripsi" json:"deskripsi"`
	Jumlah    float64   `gorm:"type:decimal(15,2);column:jumlah" json:"jumlah"`

	// --- KEDUA KOLOM FOREIGN KEY SEKARANG DIDEFINISIKAN ---
	// Untuk Pembelian Gabah (sudah ada, kita ubah namanya agar konsisten di Go)
	BatchPembelianID *uint `gorm:"column:batch_pembelian_id" json:"batch_pembelian_id,omitempty"`

	// Untuk Pembelian Beras Jadi (yang baru kita tambahkan)
	PembelianLangsungID *uint `gorm:"column:pembelian_langsung_id" json:"pembelian_langsung_id,omitempty"`

	// --- TAMBAHKAN BARIS DI BAWAH INI ---
	BatchKarungID *uint `gorm:"column:batch_karung_id" json:"batch_karung_id,omitempty"`
}
type TransaksiJasaGiling struct {
	ID                      uint      `gorm:"primaryKey;column:id" json:"id"`
	Tanggal                 time.Time `gorm:"column:tanggal" json:"tanggal"`
	NamaPelanggan           string    `gorm:"type:varchar(255);column:nama_pelanggan" json:"nama_pelanggan"`
	TipePembayaran          string    `gorm:"type:enum('TUNAI', 'BERAS');column:tipe_pembayaran" json:"tipe_pembayaran"`
	ProdukPembayaranID      *uint     `gorm:"column:produk_pembayaran_id" json:"produk_pembayaran_id"`
	JumlahPembayaranTunai   float64   `gorm:"type:decimal(15,2);column:jumlah_pembayaran_tunai" json:"jumlah_pembayaran_tunai"`
	JumlahPembayaranBerasKg float64   `gorm:"type:decimal(10,2);column:jumlah_pembayaran_beras_kg" json:"jumlah_pembayaran_beras_kg"`
	Deskripsi               string    `gorm:"column:deskripsi" json:"deskripsi"`
	// ✅ TAMBAHKAN FIELD BARU INI
	TotalTagihan      float64 `gorm:"type:decimal(15,2);column:total_tagihan" json:"total_tagihan"`
	BeratGabahAwalKg  float64 `gorm:"type:decimal(10,2);column:berat_gabah_awal_kg" json:"berat_gabah_awal_kg"`                    // BARU (untuk Pribadi)
	BeratBerasHasilKg float64 `gorm:"type:decimal(10,2);column:berat_beras_hasil_kg" json:"berat_beras_hasil_kg"`                  // (untuk Umum)
	TipeJasaGiling    string  `gorm:"type:enum('UMUM', 'PRIBADI');column:tipe_jasa_giling;default:'UMUM'" json:"tipe_jasa_giling"` // BARU
	// PASTIKAN BARIS INI ADA DAN TIDAK ADA TYPO
	BatchProduksiID *uint `gorm:"column:batch_produksi_id" json:"batch_produksi_id,omitempty"`
	// --- TAMBAHKAN FIELD-FIELD DI BAWAH INI ---
	StatusPembayaran string    `gorm:"type:enum('BELUM_LUNAS', 'LUNAS', 'SEBAGIAN');default:'BELUM_LUNAS'" json:"status_pembayaran"`
	NilaiTerbayar    float64   `gorm:"type:decimal(18,2);default:0" json:"nilai_terbayar"`
	Status           string    `gorm:"type:enum('AKTIF', 'DIBATALKAN');default:'AKTIF'" json:"status"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

// putra-pribumi/internal/model/model.go
type PembelianLangsung struct {
	ID               uint                   `gorm:"primaryKey;column:id" json:"id"`
	ProdukID         uint                   `gorm:"column:produk_id;not null" json:"produk_id"`
	TglPembelian     time.Time              `gorm:"column:tgl_pembelian;type:datetime(3);not null" json:"tgl_pembelian"`
	NamaPemasok      string                 `gorm:"column:nama_pemasok;type:varchar(100)" json:"nama_pemasok"`
	JumlahKg         float64                `gorm:"column:jumlah_kg;type:decimal(10,2);not null" json:"jumlah_kg"`
	HargaPerKg       float64                `gorm:"column:harga_per_kg;type:decimal(12,2);not null" json:"harga_per_kg"`
	TotalHarga       float64                `gorm:"column:total_harga;type:decimal(15,2);not null" json:"total_harga"`
	DigunakanKg      float64                `gorm:"column:digunakan_kg;type:decimal(10,2);default:0" json:"digunakan_kg"`
	SisaKg           float64                `gorm:"column:sisa_kg;type:decimal(10,2);default:0" json:"sisa_kg"`
	Produk           Produk                 `gorm:"foreignKey:ProdukID" json:"produk"`
	LogPenggunaan    []LogPembelianLangsung `gorm:"foreignKey:PembelianLangsungID" json:"log_penggunaan"`
	IsTerpakai       bool                   `gorm:"-" json:"is_terpakai"`
	StatusPembayaran string                 `gorm:"type:enum('BELUM_LUNAS', 'LUNAS', 'SEBAGIAN');default:'BELUM_LUNAS'" json:"status_pembayaran"`
	NilaiTerbayar    float64                `gorm:"type:decimal(18,2);default:0" json:"nilai_terbayar"`
	Status           string                 `gorm:"type:enum('AKTIF', 'DIBATALKAN');default:'AKTIF'" json:"status"`
	CreatedAt        time.Time              `json:"created_at"`
	UpdatedAt        time.Time              `json:"updated_at"`
	HutangID         *uint                  `gorm:"column:hutang_id" json:"hutang_id,omitempty"` // <-- TAMBAHKAN FIELD INI
}

// Tambahan untuk LogPembelianLangsung di model.go
type LogPembelianLangsung struct {
	ID                  uint      `gorm:"primaryKey;column:id" json:"id"`
	PembelianLangsungID uint      `gorm:"column:pembelian_langsung_id;index;not null" json:"pembelian_langsung_id"`
	Tanggal             time.Time `gorm:"column:tanggal;type:datetime(3);not null" json:"tanggal"`
	TipePenggunaan      string    `gorm:"column:tipe_penggunaan;type:enum('PENJUALAN','PRODUKSI','PEMBELIAN_AWAL','PEMBELIAN_DIUPDATE','PEMBELIAN_DIBATALKAN');not null" json:"tipe_penggunaan"`
	JumlahDigunakanKg   float64   `gorm:"column:jumlah_digunakan_kg;type:decimal(10,2);not null" json:"jumlah_digunakan_kg"`
	Deskripsi           string    `gorm:"column:deskripsi;type:varchar(255)" json:"deskripsi"`
	PenjualanID         *uint     `gorm:"column:penjualan_id;index" json:"penjualan_id,omitempty"`
	ProduksiID          *uint     `gorm:"column:produksi_id;index" json:"produksi_id,omitempty"`
	ProdukID            uint      `gorm:"column:produk_id;index" json:"produk_id"`
	JumlahKg            float64   `gorm:"column:jumlah_kg;type:decimal(10,2)" json:"jumlah_kg"`
	Sumber              string    `gorm:"column:sumber;type:varchar(50)" json:"sumber"`
	SumberID            *uint     `gorm:"column:sumber_id;index" json:"sumber_id,omitempty"`

	// ======================================================================
	// PERBAIKAN UTAMA: Ubah tipe data menjadi pointer (*time.Time)
	// ======================================================================
	TglKonsumsi *time.Time `gorm:"column:tgl_konsumsi;type:datetime(3)" json:"tgl_konsumsi,omitempty"`
	// ======================================================================
}

// TAMBAHKAN STRUCT BARU INI
type LogStokProduk struct {
	ID        uint      `gorm:"primaryKey;column:id" json:"id"`
	ProdukID  uint      `gorm:"index;column:produk_id" json:"produk_id"` // Wajib di-indeks!
	TipeLog   string    `gorm:"type:enum('MASUK', 'KELUAR');column:tipe_log" json:"tipe_log"`
	JumlahKg  float64   `gorm:"type:decimal(10,2);column:jumlah_kg" json:"jumlah_kg"`
	Deskripsi string    `gorm:"column:deskripsi" json:"deskripsi"`
	Timestamp time.Time `gorm:"column:timestamp" json:"timestamp"`

	// --- BAGIAN PENTING YANG KEMUNGKINAN HILANG ---
	// Foreign keys untuk melacak sumber (opsional, bisa NULL)
	ProduksiID          *uint `gorm:"index;column:produksi_id" json:"produksi_id,omitempty"`
	PembelianLangsungID *uint `gorm:"index;column:pembelian_langsung_id" json:"pembelian_langsung_id,omitempty"`
	JasaGilingID        *uint `gorm:"index;column:jasa_giling_id" json:"jasa_giling_id,omitempty"`
	PenjualanID         *uint `gorm:"index;column:penjualan_id" json:"penjualan_id,omitempty"`
	// ✅✅✅ TAMBAHKAN SATU BARIS INI UNTUK RELASI ✅✅✅
	Produk Produk `gorm:"foreignKey:ProdukID" json:"produk"`
	// ✅ TAMBAHKAN FOREIGN KEY BARU INI
	BatchPembelianID *uint `gorm:"index;column:batch_pembelian_id" json:"batch_pembelian_id,omitempty"`
}

type LogProduksi struct {
	ID                     uint      `gorm:"primaryKey;column:id" json:"id"`
	Timestamp              time.Time `gorm:"column:timestamp" json:"timestamp"`
	BatchProduksiID        uint      `gorm:"index;column:batch_produksi_id" json:"batch_produksi_id"`
	TipeLog                string    `gorm:"type:enum('PRODUKSI_AWAL', 'PENJUALAN', 'DIGUNAKAN_PRODUKSI_LAIN', 'BAHAN_BAKU_KELUAR', 'BAHAN_BAKU_DIGUNAKAN', 'BAHAN_BAKU_DARI_PEMBELIAN');column:tipe_log" json:"tipe_log"`
	JumlahKg               float64   `gorm:"type:decimal(10,2);column:jumlah_kg" json:"jumlah_kg"`
	SisaKgSetelahTransaksi float64   `gorm:"type:decimal(10,2);column:sisa_kg_setelah_transaksi" json:"sisa_kg_setelah_transaksi"`
	Deskripsi              string    `gorm:"column:deskripsi" json:"deskripsi"`

	// Foreign Key untuk melacak tujuan penggunaan
	PenjualanID           *uint `gorm:"index;column:penjualan_id" json:"penjualan_id,omitempty"`
	DigunakanDiProduksiID *uint `gorm:"index;column:digunakan_di_produksi_id" json:"digunakan_di_produksi_id,omitempty"`
}

// ✅ TAMBAHKAN STRUCT BARU INI UNTUK PEMBELIAN KARUNG
type BatchKarung struct {
	ID               uint      `gorm:"primaryKey" json:"id"`
	ProdukID         uint      `json:"produk_id"`
	TglPembelian     time.Time `json:"tgl_pembelian"`
	NamaPemasok      string    `json:"nama_pemasok"`
	Jumlah           int       `json:"jumlah"`
	HargaSatuan      float64   `gorm:"type:decimal(15,2)" json:"harga_satuan"`
	Sisa             int       `json:"sisa"`
	TotalHarga       float64   `gorm:"type:decimal(18,2)" json:"total_harga"`
	Produk           Produk    `gorm:"foreignKey:ProdukID" json:"produk"`
	IsTerpakai       bool      `gorm:"-" json:"is_terpakai"`
	StatusPembayaran string    `gorm:"type:enum('BELUM_LUNAS', 'LUNAS', 'SEBAGIAN');default:'BELUM_LUNAS'" json:"status_pembayaran"`
	NilaiTerbayar    float64   `gorm:"type:decimal(18,2);default:0" json:"nilai_terbayar"`
	Status           string    `gorm:"type:enum('AKTIF', 'DIBATALKAN');default:'AKTIF'" json:"status"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

// ✅ TAMBAHKAN STRUCT BARU INI UNTUK LOG PENGGUNAAN KARUNG
type LogKarung struct {
	ID              uint      `gorm:"primaryKey" json:"id"`
	Timestamp       time.Time `json:"timestamp"`
	BatchKarungID   uint      `gorm:"index" json:"batch_karung_id"`
	BatchProduksiID uint      `gorm:"index" json:"batch_produksi_id"`
	JumlahDigunakan int       `json:"jumlah_digunakan"` // Selalu negatif
	SisaSetelah     int       `json:"sisa_setelah"`
	Deskripsi       string    `json:"deskripsi"`
}

// ✅ TAMBAHKAN STRUCT BARU INI SEBAGAI TABEL PENGHUBUNG
type ProduksiKarungSumber struct {
	ID              uint `gorm:"primaryKey" json:"id"`
	BatchProduksiID uint `gorm:"index" json:"batch_produksi_id"`
	BatchKarungID   uint `gorm:"index" json:"batch_karung_id"`
	JumlahDigunakan int  `json:"jumlah_digunakan"`
	// Relasi
	BatchKarung BatchKarung `gorm:"foreignKey:BatchKarungID" json:"batch_karung"`
	//// ✅ TAMBAHKAN RELASI PRODUK DI SINI
	//Produk Produk `gorm:"foreignKey:BatchKarungID;references:ID"` // Ini akan mengambil produk dari batch karung
}

type LogPembelian struct {
	ID               uint      `json:"id" gorm:"primaryKey"`
	BatchPembelianID uint      `json:"batch_pembelian_id" gorm:"not null"`
	TipeLog          string    `json:"tipe_log" gorm:"not null"` // MASUK, DIGUNAKAN_PRODUKSI
	JumlahKg         float64   `json:"jumlah_kg" gorm:"not null"`
	SisaKgSetelah    float64   `json:"sisa_kg_setelah" gorm:"not null"`
	Deskripsi        string    `json:"deskripsi" gorm:"not null"`
	Timestamp        time.Time `json:"timestamp" gorm:"not null"`
	BatchProduksiID  *uint     `json:"batch_produksi_id,omitempty"` // Untuk link ke produksi

	// Relasi
	BatchPembelian BatchPembelian `json:"batch_pembelian,omitempty" gorm:"foreignKey:BatchPembelianID"`
	BatchProduksi  *BatchProduksi `json:"batch_produksi,omitempty" gorm:"foreignKey:BatchProduksiID"`
}

// --- MODEL KEUANGAN BARU ---

type AkunKas struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	NamaAkun  string    `gorm:"type:varchar(100);not null;unique" json:"nama_akun"`
	TipeAkun  string    `gorm:"type:enum('KAS_TUNAI', 'BANK');not null" json:"tipe_akun"`
	Saldo     float64   `gorm:"type:decimal(18,2);default:0" json:"saldo"` // Kolom cache
	IsActive  bool      `gorm:"default:true" json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Piutang struct {
	ID               uint      `gorm:"primaryKey" json:"id"`
	CustomerID       *uint     `json:"customer_id"`
	NamaPelanggan    string    `gorm:"type:varchar(255)" json:"nama_pelanggan"`
	TanggalTransaksi time.Time `json:"tanggal_transaksi"`
	JatuhTempo       time.Time `json:"jatuh_tempo"`
	NilaiTotal       float64   `gorm:"type:decimal(18,2);not null" json:"nilai_total"`
	NilaiTerbayar    float64   `gorm:"type:decimal(18,2);default:0" json:"nilai_terbayar"`
	SisaTagihan      float64   `gorm:"type:decimal(18,2);not null" json:"sisa_tagihan"`
	Status           string    `gorm:"type:enum('BELUM_LUNAS', 'LUNAS', 'SEBAGIAN', 'DIBATALKAN');default:'BELUM_LUNAS'" json:"status"`
	SourceType       string    `gorm:"type:varchar(50)" json:"source_type"` // 'TRANSAKSI_PENJUALAN', 'JASA_GILING'
	SourceID         uint      `json:"source_id"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

type Hutang struct {
	ID               uint      `gorm:"primaryKey" json:"id"`
	SupplierID       *uint     `json:"supplier_id"`
	NamaPemasok      string    `gorm:"type:varchar(255)" json:"nama_pemasok"`
	TanggalTransaksi time.Time `json:"tanggal_transaksi"`
	JatuhTempo       time.Time `json:"jatuh_tempo"`
	NilaiTotal       float64   `gorm:"type:decimal(18,2);not null" json:"nilai_total"`
	NilaiTerbayar    float64   `gorm:"type:decimal(18,2);default:0" json:"nilai_terbayar"`
	SisaTagihan      float64   `gorm:"type:decimal(18,2);not null" json:"sisa_tagihan"`
	Status           string    `gorm:"type:enum('BELUM_LUNAS', 'LUNAS', 'SEBAGIAN', 'DIBATALKAN');default:'BELUM_LUNAS'" json:"status"`
	SourceType       string    `gorm:"type:varchar(50)" json:"source_type"` // 'BATCH_PEMBELIAN', 'BIAYA_OPERASIONAL', etc.
	SourceID         uint      `json:"source_id"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

type Payment struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	TanggalBayar time.Time `json:"tanggal_bayar"`
	AkunKasID    uint      `gorm:"not null" json:"akun_kas_id"`
	JumlahTotal  float64   `gorm:"type:decimal(18,2);not null" json:"jumlah_total"`
	Metode       string    `gorm:"type:varchar(50)" json:"metode"`
	Memo         string    `gorm:"type:text" json:"memo"`
	CreatedByID  uint      `json:"created_by_id"`
	Status       string    `gorm:"type:enum('AKTIF', 'DIBATALKAN');default:'AKTIF'" json:"status"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
	AkunKas      AkunKas   `gorm:"foreignKey:AkunKasID" json:"akun_kas"`
	User         User      `gorm:"foreignKey:CreatedByID" json:"created_by"`
}

type PaymentAllocation struct {
	ID                 uint    `gorm:"primaryKey" json:"id"`
	PaymentID          uint    `gorm:"not null;index:idx_payment_target,unique" json:"payment_id"`
	TargetType         string  `gorm:"type:varchar(50);not null;index:idx_payment_target,unique" json:"target_type"` // 'PIUTANG' atau 'HUTANG'
	TargetID           uint    `gorm:"not null;index:idx_payment_target,unique" json:"target_id"`
	JumlahDialokasikan float64 `gorm:"type:decimal(18,2);not null" json:"jumlah_dialokasikan"`
	Payment            Payment `gorm:"foreignKey:PaymentID" json:"payment"`
}

type TransaksiKas struct {
	ID                uint      `gorm:"primaryKey" json:"id"`
	AkunKasID         uint      `gorm:"not null;index" json:"akun_kas_id"`
	Tanggal           time.Time `gorm:"not null;index" json:"tanggal"`
	Arah              string    `gorm:"type:enum('IN', 'OUT');not null" json:"arah"`
	Jumlah            float64   `gorm:"type:decimal(18,2);not null" json:"jumlah"`
	ReferenceType     string    `gorm:"type:varchar(50)" json:"reference_type"` // 'PAYMENT', 'BIAYA_OPERASIONAL', 'TRANSFER'
	ReferenceID       uint      `json:"reference_id"`
	PairID            *uint     `gorm:"index" json:"pair_id,omitempty"` // Untuk transfer antar kas
	Memo              string    `gorm:"type:text" json:"memo"`
	CreatedByID       uint      `json:"created_by_id"`
	Status            string    `gorm:"type:enum('AKTIF', 'DIBATALKAN');default:'AKTIF'" json:"status"`
	PembatalanUntukID *uint     `gorm:"index" json:"pembatalan_untuk_id,omitempty"` // ID TransaksiKas yg dibatalkan
	CreatedAt         time.Time `json:"created_at"`
	AkunKas           AkunKas   `gorm:"foreignKey:AkunKasID" json:"akun_kas"`
	User              User      `gorm:"foreignKey:CreatedByID" json:"created_by"`
}

func (LogPembelian) TableName() string {
	return "log_pembelian"
}

// Tambahkan method ini di file model.go untuk struct ProduksiSumber

// GetNamaSumber mengembalikan nama produk dari sumber yang digunakan
func (ps *ProduksiSumber) GetNamaSumber() string {
	if ps.BatchPembelian != nil && ps.BatchPembelian.Produk.NamaProduk != "" {
		return ps.BatchPembelian.Produk.NamaProduk
	}
	if ps.StokProduk != nil && ps.StokProduk.Produk.NamaProduk != "" {
		return ps.StokProduk.Produk.NamaProduk
	}
	if ps.BatchProduksiSumber != nil && ps.BatchProduksiSumber.Produk.NamaProduk != "" {
		return ps.BatchProduksiSumber.Produk.NamaProduk
	}
	return "Tidak Diketahui"
}

// GetPemasok mengembalikan informasi pemasok atau sumber batch
func (ps *ProduksiSumber) GetPemasok() string {
	if ps.BatchPembelian != nil {
		return ps.BatchPembelian.NamaPemasok
	}
	if ps.StokProduk != nil {
		return "Stok Umum"
	}
	if ps.BatchProduksiSumber != nil && ps.BatchProduksiSumberID != nil {
		return fmt.Sprintf("Batch #%d", *ps.BatchProduksiSumberID)
	}
	return ""
}

// GetSumberInfo mengembalikan informasi lengkap sumber dalam format string
func (ps *ProduksiSumber) GetSumberInfo() string {
	nama := ps.GetNamaSumber()
	pemasok := ps.GetPemasok()

	if pemasok != "" {
		return fmt.Sprintf("%s (%s)", nama, pemasok)
	}
	return nama
}
