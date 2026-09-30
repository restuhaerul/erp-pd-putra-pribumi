// src/types.ts

// ======================================================================
// Tipe Data Dasar & Enum
// ======================================================================

export type TipeProduk = 'BAHAN_MENTAH' | 'PRODUK_JADI' | 'PRODUK_SAMPINGAN' | 'PERLENGKAPAN' | 'KEMASAN';
export type KategoriBiaya = 'GAJI' | 'MAINTENANCE' | 'TRANSPORTASI' | 'BBM' | 'KEMASAN' | 'LAINNYA' | 'PEMBELIAN_BAHAN';
export type TipePembayaranJasa = 'TUNAI' | 'BERAS';

// ======================================================================
// Interface untuk Model Data Utama
// ======================================================================

export interface Produk {
  id: number;
  nama_produk: string;
  deskripsi: string;
  tipe_produk: TipeProduk;
  satuan: string;
  lacak_per_batch: boolean;
  stok_kg?: number;
}

export interface BatchPembelian {
  id: number;
  produk_id: number;
  tgl_pembelian: string;
  nama_pemasok: string;
  jumlah_kg: number;
  harga_per_kg: number;
  sisa_kg: number;
  total_harga: number;
  produk: Produk;
  jumlah_digunakan: number;
  is_terpakai: boolean;
  // --- TAMBAHKAN DUA BARIS DI BAWAH INI ---
  status_pembayaran: 'LUNAS' | 'SEBAGIAN' | 'BELUM_LUNAS';
  nilai_terbayar: number;
}

export interface BatchProduksi {
  id: number;
  produk_id: number;
  tgl_produksi: string;
  jumlah_produksi_kg: number;
  total_biaya_produksi: number;
  sisa_kg: number;
  produk: Produk;
  sumber_digunakan: ProduksiSumber[];
  sumber_karung: ProduksiKarungSumber[];
  is_terpakai: boolean;
}

// File: src/types/index.ts (atau src/types.ts)
// UPDATED: Tambah field status ke TransaksiPenjualan


export interface TransaksiPenjualan {
  id: number;
  tgl_transaksi: string;
  nama_pelanggan: string;
  produk_id: number;
  batch_produksi_id: number | null;
  jumlah_kg: number;
  harga_jual_per_kg: number;
  laba: number;
  produk: Produk;
  batch_produksi?: BatchProduksi;
  nama_produk: string;
  tipe_produk: string;
  nilai_terbayar: number;
  status_pembayaran?: string;
  status: 'AKTIF' | 'DIBATALKAN'; // <- TAMBAHKAN INI
}


export interface StokProduk {
  id: number;
  produk_id: number;
  total_stok_kg: number;
  hpp_rata_rata: number;
  produk: Produk;
}

export interface BiayaOperasional {
  id: number;
  tanggal: string;
  kategori: KategoriBiaya;
  deskripsi: string;
  jumlah: number;
  batch_pembelian_id?: number | null;
}

export interface TransaksiJasaGiling {
  id: number;
  tanggal: string;
  nama_pelanggan: string;
  berat_beras_hasil_kg: number;
  berat_gabah_awal_kg: number;
  tipe_pembayaran: TipePembayaranJasa;
  tipe_jasa_giling: 'UMUM' | 'PRIBADI';
  produk_pembayaran_id: number | null;
  jumlah_pembayaran_tunai: number;
  jumlah_pembayaran_beras_kg: number;
  deskripsi: string;
  total_tagihan: number;
}

export interface PembelianLangsung {
  id: number;
  produk_id: number;
  tgl_pembelian: string;
  nama_pemasok: string;
  jumlah_kg: number;
  harga_per_kg: number;
  total_harga: number;
  produk: Produk;
  is_terpakai: boolean;
}

export interface BatchKarung {
  id: number;
  produk_id: number;
  tgl_pembelian: string;
  nama_pemasok: string;
  jumlah: number;
  harga_satuan: number;
  sisa: number;
  total_harga: number;
  produk: Produk;
  is_terpakai: boolean;
}

export interface ProduksiSumber {
  id: number;
  batch_produksi_id: number;
  batch_pembelian_id: number | null;
  stok_produk_id: number | null;
  jumlah_kg_digunakan: number;
  batch_pembelian?: BatchPembelian;
  stok_produk?: StokProduk;
  batch_produksi_sumber?: BatchProduksi;
}

export interface ProduksiKarungSumber {
  id: number;
  batch_produksi_id: number;
  batch_karung_id: number;
  jumlah_digunakan: number;
  batch_karung: BatchKarung;
}

// ======================================================================
// Interface untuk Log
// ======================================================================

export interface LogStokProduk {
  id: number;
  produk_id: number;
  tipe_log: 'MASUK' | 'KELUAR';
  jumlah_kg: number;
  deskripsi: string;
  timestamp: string;
  produk?: Produk;
}

export interface LogProduksi {
  id: number;
  timestamp: string;
  batch_produksi_id: number;
  tipe_log: 'PRODUKSI_AWAL' | 'PENJUALAN' | 'DIGUNAKAN_PRODUKSI_LAIN';
  jumlah_kg: number;
  sisa_kg_setelah_transaksi: number;
  deskripsi: string;
  penjualan_id?: number | null;
  digunakan_di_produksi_id?: number | null;
}

export interface LogKarung {
  id: number;
  timestamp: string;
  batch_karung_id: number;
  batch_produksi_id: number;
  jumlah_digunakan: number;
  sisa_setelah: number;
  deskripsi: string;
}

// ======================================================================
// Interface untuk Laporan & Konfigurasi
// ======================================================================

export interface Konfigurasi {
  id: number;
  biaya_produksi_per_kg_gabah: number;
  harga_jual_dedak_per_kg: number;
  harga_jual_menir_per_kg: number;
}

export interface RincianGrup {
  nama: string;
  total: number;
}

export interface LaporanKeuangan {
  periode: string;
  total_pemasukan: number;
  total_pengeluaran: number;
  laba_bersih: number;
  rincian_pemasukan: RincianGrup[];
  rincian_pengeluaran: RincianGrup[];
}

export interface KasPenjualan {
  tanggal: string;
  jumlah_kg: number;
  total_pemasukan: number;
  nama_produk: string;
  nama_pelanggan: string;
  transaksi_id: number;
}

export interface KasJasaGiling {
  tanggal: string;
  tipe_jasa: 'UMUM' | 'PRIBADI';
  tipe_pembayaran: 'TUNAI' | 'BERAS';
  total_pemasukan: number;
  nama_pelanggan: string;
  transaksi_id: number;
}

export interface RingkasanKas {
  total_penjualan: number;
  total_jasa_giling: number;
  total_keseluruhan: number;
}

export interface KasData {
  ringkasan: RingkasanKas;
  kas_penjualan: KasPenjualan[];
  kas_jasa_giling: KasJasaGiling[];
}

// ======================================================================
// Interface untuk Dashboard
// ======================================================================

export interface RingkasanHarian {
  TotalPenjualan: number;
  TotalTransaksi: number;
  TotalLaba: number;
}

export interface AktivitasTerbaru {
  timestamp: string;
  tipe: 'PENJUALAN' | 'PEMBELIAN' | 'PRODUKSI';
  deskripsi: string;
  link_id: number;
}

export interface DashboardData {
  ringkasan_harian: RingkasanHarian;
  stok_produk_jadi: number;
  stok_bahan_mentah: number;
  aktivitas_terbaru: AktivitasTerbaru[];
  perbandingan_mingguan: {
    penjualan_minggu_ini: number;
    penjualan_minggu_lalu: number;
    laba_minggu_ini: number;
    laba_minggu_lalu: number;
    persentase_penjualan: number;
    persentase_laba: number;
  };
  pergerakan_stok: Array<{
    tanggal: string;
    nama_produk: string;
    tipe_aksi: string;
    jumlah: number;
    stok_akhir: number;
    keterangan: string;
  }>;
  aktivitas_user: Array<{
    timestamp: string;
    nama_user: string;
    aktivitas: string;
    detail: string;
  }>;
  target_harian: {
    target_penjualan: number;
    realisasi_penjualan: number;
    persentase_realisasi: number;
    target_produksi: number;
    realisasi_produksi: number;
    persentase_produksi: number;
  };
  reminder_urgent: Array<{
    id: number;
    tipe: string;
    judul: string;
    deskripsi: string;
    prioritas: string;
    deadline: string;
    status: string;
  }>;
  statistik_bulanan: {
    total_penjualan_bulan: number;
    total_laba_bulan: number;
    total_transaksi_bulan: number;
    rata_rata_penjualan: number;
    peningkatan_dari_bulan_lalu: number;
  };
  top_produk: Array<{
    nama_produk: string;
    total_terjual: number;
    total_pendapatan: number;
    persentase: number;
  }>;
}

// ======================================================================
// Interface untuk Otentikasi & User
// ======================================================================

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: number;
    username: string;
    full_name: string;
    role: 'OWNER' | 'ADMIN' | 'KASIR' | 'GUDANG' | 'VIEWER';
    is_active: boolean;
  };
}

export interface User {
  id: number;
  username: string;
  full_name: string;
  photo_url?: string | null;
  role: 'OWNER' | 'ADMIN' | 'KASIR' | 'GUDANG' | 'VIEWER';
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// ======================================================================
// Interface untuk Input API
// ======================================================================

export interface SumberBahanBakuInput {
  tipe_sumber: 'BATCH_PEMBELIAN' | 'STOK_PRODUK' | 'BATCH_PRODUKSI';
  sumber_id: number;
  jumlah_kg_digunakan: number;
}

export interface InputKarungDigunakan {
  produk_id: number;
  jumlah: number;
}

export interface InputProduksi {
  produk_id: number;
  jumlah_beras_dihasilkan_kg: number;
  sumber_bahan_baku: SumberBahanBakuInput[];
  karung_digunakan: InputKarungDigunakan[];
}

export interface InputPembelianLangsung {
  produk_id: number;
  nama_pemasok: string;
  jumlah_kg: number;
  harga_per_kg: number;
}

export interface InputPembelianKarung {
  produk_id: number;
  nama_pemasok: string;
  jumlah: number;
  harga_satuan: number;
  akun_kas_id: number;
}

export interface InputTambahStokKemasan {
  produk_id: number;
  jumlah: number;
  harga_satuan: number;
  nama_pemasok: string;
}

export interface LogPembelian {
  id: number;
  batch_pembelian_id: number;
  tipe_log: string; // "MASUK", "DIGUNAKAN_PRODUKSI"
  jumlah_kg: number;
  sisa_kg_setelah: number;
  deskripsi: string;
  timestamp: string;
  batch_produks_id?: number;
}

export interface Hutang {
  id: number;
  nama_pemasok: string;
  tanggal_transaksi: string;
  jatuh_tempo: string;
  nilai_total: number;
  nilai_terbayar: number;
  sisa_tagihan: number;
  status: 'BELUM_LUNAS' | 'LUNAS' | 'SEBAGIAN';
  source_type: string;
  source_id: number;
}

export interface Piutang {
  id: number;
  nama_pelanggan: string;
  tanggal_transaksi: string;
  jatuh_tempo: string;
  nilai_total: number;
  nilai_terbayar: number;
  sisa_tagihan: number;
  status: 'BELUM_LUNAS' | 'LUNAS' | 'SEBAGIAN';
  source_type: string;
  source_id: number;
}

export interface AkunKas {
  id: number;
  nama_akun: string;
  tipe_akun: 'KAS_TUNAI' | 'BANK';
  saldo: number;
  is_active: boolean;
}

export interface AlokasiInput {
  target_id: number;
  jumlah_dialokasikan: number;
}

export interface InputPembayaran {
  tanggal_bayar: string;
  akun_kas_id: number;
  jumlah_total: number;
  metode: string;
  memo: string;
  target_type: 'PIUTANG' | 'HUTANG';
  alokasi: AlokasiInput[];
}

// Tambahkan tipe data untuk response history
export interface TransaksiKas {
  id: number;
  tanggal: string;
  arah: 'IN' | 'OUT';
  jumlah: number;
  memo: string;
  reference_type: string;
  reference_id: number;
}

export interface PaginatedTransaksiKas {
  data: TransaksiKas[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_items: number;
  };
}