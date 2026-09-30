// File: src/services/api.ts
// BERKAS INI SUDAH DIPERBAIKI SEPENUHNYA
// Semua fungsi yang hilang sudah dikembalikan dan cache busting diterapkan.

import {
  Produk,
  BatchPembelian,
  BatchProduksi,
  TransaksiPenjualan,
  StokProduk,
  LogStokProduk,
  BiayaOperasional,
  TransaksiJasaGiling,
  Konfigurasi,
  LaporanKeuangan,
  KategoriBiaya,
  TipePembayaranJasa,
  DashboardData,
  InputProduksi,
  InputPembelianLangsung,
  LogProduksi,
  InputTambahStokKemasan,
   BatchKarung,
  LogKarung,
  InputPembelianKarung,
    KasData,
    KasPenjualan,
    KasJasaGiling,
    LoginResponse,
    LoginRequest,
    LogPembelian,
    Hutang,
    Piutang,
    AkunKas,
    InputPembayaran,
    TransaksiKas,
    PaginatedTransaksiKas

} from '../types';

// ======================================================================
// Konfigurasi Dasar & Helper
// ======================================================================

const BASE_URL = 'http://localhost:8081/api/v1';
// Update getUrlWithCacheBust untuk skip cache pada auth endpoints
const getUrlWithCacheBust = (url: string) => {
  // Skip cache busting for auth endpoints
  if (url.includes('/login') || url.includes('/me')) {
    return url;
  }
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}t=${new Date().getTime()}`;
}

// Update handleResponse untuk include auth headers
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    if (response.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    const errorData = await response.json();
    throw new Error(errorData.error || 'Terjadi kesalahan pada server');
  }
  const data = await response.json();
  return data.data || data;
}

// Helper function untuk get auth headers
const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

export const login = async (username: string, password: string): Promise<LoginResponse> => {
  const response = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Login gagal');
  }

  const result = await response.json();
  return result.data;
};

export const getMe = async (): Promise<LoginResponse['user']> => {
  const response = await fetch(`${BASE_URL}/me`, {
    headers: getAuthHeaders(),
  });
  return handleResponse<LoginResponse['user']>(response);
};

export const changePassword = async (oldPassword: string, newPassword: string): Promise<{ message: string }> => {
  const response = await fetch(`${BASE_URL}/change-password`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
  });
  return handleResponse<{ message: string }>(response);
};

// ======================================================================
// Tipe Data untuk Input
// ======================================================================

export type InputProduk = Omit<Produk, 'id' | 'deskripsi'> & { deskripsi?: string };
export interface InputPembelian {
  produk_id: number;
  nama_pemasok: string;
  jumlah_kg: number;
  harga_per_kg: number;
  // --- TAMBAHAN UNTUK PEMBAYARAN ---
  status_pembayaran: 'LUNAS' | 'SEBAGIAN' | 'BELUM_LUNAS';
  nilai_terbayar: number;
  akun_kas_id: number;
}
export type InputUpdatePembelian = Partial<InputPembelian>;

export interface InputTambahStok {
  produk_id: number;
  jumlah_kg: number;
}
export interface InputPenjualan {
  produk_id: number;
  batch_produksi_id?: number; // Opsional, bisa dihapus jika tidak lagi relevan
  jumlah_kg: number;
  harga_jual_per_kg: number;
  nama_pelanggan: string;
  // ▼▼▼ TAMBAHKAN FIELD-FIELD INI ▼▼▼
  status_pembayaran: 'LUNAS' | 'SEBAGIAN' | 'BELUM_LUNAS';
  nilai_terbayar: number;
  akun_kas_id: number;
}
export interface InputPenjualanUmum {
  produk_id: number;
  jumlah_kg: number;
  harga_jual_per_kg: number;
  nama_pelanggan: string;
}
export interface InputBiayaOperasional {
  tanggal: string;
  kategori: KategoriBiaya;
  deskripsi: string;
  jumlah: number;
  akun_kas_id: number;
}

export interface InputTransaksiKasManual {
  akun_kas_id: number;
  arah: 'IN' | 'OUT';
  jumlah: number;
  memo: string;
}

export type InputUpdateBiayaOperasional = Partial<InputBiayaOperasional>;
export interface InputJasaGiling {
  nama_pelanggan: string;
  berat_beras_hasil_kg: number;
  tipe_jasa_giling: 'UMUM' | 'PRIBADI';
  tipe_pembayaran: TipePembayaranJasa;
  produk_pembayaran_id?: number;
  jumlah_pembayaran_tunai?: number;
  jumlah_pembayaran_beras_kg?: number;
  deskripsi?: string;
}

export interface InputTambahStokDenganBiaya {
  produk_id: number;
  jumlah_kg: number;
  harga_per_kg: number;
  nama_pemasok: string;
}

export type InputUpdateJasaGiling = Partial<Omit<InputJasaGiling, 'nama_pelanggan'>>;
export type InputUpdateKonfigurasi = Omit<Konfigurasi, 'id'>;


// ======================================================================
// Fungsi API per Modul (LENGKAP)
// ======================================================================


// ======================================================================
// --- Dashboard ---
export const getDashboardData = async (): Promise<DashboardData> => {
  const response = await fetch(`${BASE_URL}/dashboard`,{
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Gagal memuat data dashboard');
  }
  const data = await response.json();
  return data.data; // Asumsi backend mengembalikan dalam { "data": ... }
};

// --- Produk ---
export const getAllProduk = async (): Promise<Produk[]> => {
  const response = await fetch(getUrlWithCacheBust(`${BASE_URL}/produk`), {
    headers: getAuthHeaders(),
  });
  return handleResponse<Produk[]>(response);
};
export const getProdukById = async (id: number): Promise<Produk> => {
  const response = await fetch(getUrlWithCacheBust(`${BASE_URL}/produk/${id}`),{
    headers: getAuthHeaders(),
  });
  return handleResponse<Produk>(response);
};
export const createProduk = async (produk: InputProduk): Promise<{ message: string }> => {
  const response = await fetch(`${BASE_URL}/produk`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(produk),
  });
  return handleResponse<{ message: string }>(response);
};
export const updateProduk = async (id: number, produk: Partial<InputProduk>): Promise<{ message: string }> => {
  const response = await fetch(`${BASE_URL}/produk/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(produk),
  });
  return handleResponse<{ message: string }>(response);
};
export const deleteProduk = async (id: number): Promise<{ message: string }> => {
  const response = await fetch(`${BASE_URL}/produk/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleResponse<{ message: string }>(response);
};

// --- Pembelian ---
export const getAllPembelian = async (): Promise<BatchPembelian[]> => {
  const response = await fetch(getUrlWithCacheBust(`${BASE_URL}/pembelian`), {
    headers: getAuthHeaders(),
  });
  return handleResponse<BatchPembelian[]>(response);
};
export const getPembelianById = async (id: number): Promise<BatchPembelian> => {
    const response = await fetch(getUrlWithCacheBust(`${BASE_URL}/pembelian/${id}`),{
      headers: getAuthHeaders(),
    });
    return handleResponse<BatchPembelian>(response);
};
export const createPembelian = async (pembelian: InputPembelian): Promise<BatchPembelian> => {
  const response = await fetch(`${BASE_URL}/pembelian`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(pembelian),
  });
  return handleResponse<BatchPembelian>(response);
};
export const updatePembelian = async (id: number, pembelian: InputUpdatePembelian): Promise<{ message: string }> => {
    const response = await fetch(`${BASE_URL}/pembelian/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(pembelian),
    });
    return handleResponse<{ message: string }>(response);
};
export const deletePembelian = async (id: number): Promise<{ message: string }> => {
    const response = await fetch(`${BASE_URL}/pembelian/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse<{ message: string }>(response);
};

// Ubah return type di fungsi API Anda
export const getPembelianHistory = async (batchId: number): Promise<LogPembelian[]> => {
  const response = await fetch(getUrlWithCacheBust(`${BASE_URL}/pembelian/${batchId}/history`), {
    headers: getAuthHeaders(),
  });
  return handleResponse<LogPembelian[]>(response);
};

// --- Produksi ---
// Types untuk pagination
export interface PaginationMeta {
  current_page: number;
  total_pages: number;
  total_items: number;
  items_per_page: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface SummaryData {
  total_produksi_dihasilkan: number;
  total_bahan_baku_digunakan: number;
  total_sisa_produksi: number;
  total_hpp: number;
  avg_efficiency: number;
}

// NEW: Fungsi untuk pagination
export const getProduksiPaginated = async (params: {
  page: number;
  limit: number;
  dateFrom?: string;
  dateTo?: string;
}): Promise<PaginatedResponse<any>> => {
  const queryParams = new URLSearchParams({
    page: params.page.toString(),
    limit: params.limit.toString(),
  });

  if (params.dateFrom) {
    queryParams.append('date_from', params.dateFrom);
  }

  if (params.dateTo) {
    queryParams.append('date_to', params.dateTo);
  }

  const response = await fetch(`${BASE_URL}/produksi?${queryParams}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch paginated produksi data');
  }

  return response.json();
};

// NEW: Fungsi untuk summary
export const getProduksiSummary = async (params: {
  dateFrom?: string;
  dateTo?: string;
}): Promise<{ data: SummaryData }> => {
  const queryParams = new URLSearchParams();

  if (params.dateFrom) {
    queryParams.append('date_from', params.dateFrom);
  }

  if (params.dateTo) {
    queryParams.append('date_to', params.dateTo);
  }

  const response = await fetch(`${BASE_URL}/produksi/summary?${queryParams}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    throw new Error('Failed to fetch produksi summary');
  }

  return response.json();
};

// UPDATE: Tambahkan fallback untuk getAllProduksi existing
export const getAllProduksi = async (): Promise<any[]> => {
  const response = await fetch(`${BASE_URL}/produksi`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch produksi data');
  }

  const result = await response.json();

  // Handle both old format (direct data) and new format (with meta)
  if (result.data && Array.isArray(result.data)) {
    return result.data;
  } else if (Array.isArray(result)) {
    return result;
  } else {
    return result.data || [];
  }
};
export const createProduksi = async (payload: InputProduksi): Promise<BatchProduksi> => {
  const response = await fetch(`${BASE_URL}/produksi`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Gagal membuat data produksi');
  }
  return response.json();
};

export const updateProduksi = async (id: number, payload: InputProduksi): Promise<BatchProduksi> => {
  const response = await fetch(`${BASE_URL}/produksi/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Gagal memperbarui data produksi');
  }
  return response.json().then(d => d.data); // Asumsi backend mengembalikan { data: ... }
};

export const deleteProduksi = async (id: number): Promise<void> => {
  if (!id) {
    throw new Error("ID untuk menghapus tidak valid.");
  }
  const response = await fetch(`${BASE_URL}/produksi/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Gagal menghapus data produksi' }));
    throw new Error(err.error);
  }
};

// --- FUNGSI BARU UNTUK LOG PRODUKSI ---
export const getProduksiHistory = async (batchProduksiId: number): Promise<LogProduksi[]> => {
  const response = await fetch(getUrlWithCacheBust(`${BASE_URL}/produksi/${batchProduksiId}/history`),{
    headers: getAuthHeaders(),
  });
  return handleResponse<LogProduksi[]>(response);
};

// --- Stok Produk ---
export const getAllStokProduk = async (): Promise<StokProduk[]> => {
  const response = await fetch(getUrlWithCacheBust(`${BASE_URL}/stok-produk`),{
    headers: getAuthHeaders(),
  });
  return handleResponse<StokProduk[]>(response);
};
export const getStokByProdukID = async (produk_id: number): Promise<StokProduk> => {
    const response = await fetch(getUrlWithCacheBust(`${BASE_URL}/stok-produk/${produk_id}`),{
      headers: getAuthHeaders(),
    });
    return handleResponse<StokProduk>(response);
};
// Ganti nama `tambahStok` menjadi `tambahStokManual` dan arahkan ke endpoint baru
export const tambahStokManual = async (stok: InputTambahStok): Promise<StokProduk> => {
  const response = await fetch(`${BASE_URL}/stok-produk/manual`, { // <-- Endpoint baru
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(stok),
  });
  return handleResponse<StokProduk>(response);
};

// --- Penjualan ---
// File: src/services/api.ts
export const getAllPenjualan = async (
    date: string,
    includeCancelled: boolean = false  // <- PARAMETER BARU
): Promise<TransaksiPenjualan[]> => {
  // Build URL dengan query parameter
  let url = `${BASE_URL}/penjualan?tanggal=${date}`;

  // Tambahkan parameter include_cancelled jika true
  if (includeCancelled) {
    url += '&include_cancelled=true';
  }

  const response = await fetch(getUrlWithCacheBust(url), {
    headers: getAuthHeaders(),
  });
  return handleResponse<TransaksiPenjualan[]>(response);
};

export const createPenjualan = async (penjualan: InputPenjualan): Promise<TransaksiPenjualan> => {
  const response = await fetch(`${BASE_URL}/penjualan`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(penjualan),
  });
  return handleResponse<TransaksiPenjualan>(response);
};

export const updatePenjualan = async (id: number, payload: Partial<InputPenjualan>): Promise<TransaksiPenjualan> => {
  const response = await fetch(`${BASE_URL}/penjualan/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Gagal memperbarui penjualan');
  }
  return response.json().then(d => d.data);
};

export const deletePenjualan = async (id: number): Promise<void> => {
  const response = await fetch(`${BASE_URL}/penjualan/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Gagal menghapus penjualan');
  }
};

export const createPenjualanUmum = async (penjualan: InputPenjualanUmum): Promise<TransaksiPenjualan> => {
  const response = await fetch(`${BASE_URL}/penjualan-umum`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(penjualan),
  });
  return handleResponse<TransaksiPenjualan>(response);
};

// --- Biaya Operasional ---
export const getAllBiayaOperasional = async (): Promise<BiayaOperasional[]> => {
  const response = await fetch(`${BASE_URL}/biaya-operasional`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Gagal memuat data biaya');
  return response.json().then(d => d.data);
};

export const createBiayaOperasional = async (payload: InputBiayaOperasional): Promise<BiayaOperasional> => {
  const response = await fetch(`${BASE_URL}/biaya-operasional`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Gagal membuat biaya');
  }
  return response.json();
};

export const updateBiayaOperasional = async (id: number, payload: InputBiayaOperasional): Promise<BiayaOperasional> => {
  const response = await fetch(`${BASE_URL}/biaya-operasional/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Gagal memperbarui biaya');
  }
  return response.json();
};

export const deleteBiayaOperasional = async (id: number): Promise<void> => {
  const response = await fetch(`${BASE_URL}/biaya-operasional/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Gagal menghapus biaya');
  }
};

// --- Jasa Giling ---
export const getAllJasaGiling = async (): Promise<TransaksiJasaGiling[]> => {
  const response = await fetch(getUrlWithCacheBust(`${BASE_URL}/jasa-giling`), {
    headers: getAuthHeaders(),
  });
  return handleResponse<TransaksiJasaGiling[]>(response);
};
export const createJasaGiling = async (jasa: InputJasaGiling): Promise<TransaksiJasaGiling> => {
  const response = await fetch(`${BASE_URL}/jasa-giling`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(jasa),
  });
  return handleResponse<TransaksiJasaGiling>(response);
};
export const updateJasaGiling = async (id: number, jasa: InputUpdateJasaGiling): Promise<{ message: string }> => {
    const response = await fetch(`${BASE_URL}/jasa-giling/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(jasa),
    });
    return handleResponse<{ message: string }>(response);
};
export const deleteJasaGiling = async (id: number): Promise<{ message: string }> => {
    const response = await fetch(`${BASE_URL}/jasa-giling/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse<{ message: string }>(response);
};

// --- Konfigurasi ---
export const getKonfigurasi = async (): Promise<Konfigurasi> => {
  const response = await fetch(getUrlWithCacheBust(`${BASE_URL}/konfigurasi`), {
    headers: getAuthHeaders(),
  });
  return handleResponse<Konfigurasi>(response);
};
export const updateKonfigurasi = async (konfigurasi: InputUpdateKonfigurasi): Promise<Konfigurasi> => {
  const response = await fetch(`${BASE_URL}/konfigurasi`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(konfigurasi),
  });
  return handleResponse<Konfigurasi>(response);
};

// --- Laporan ---
export const getLaporanBulanan = async (bulan: number, tahun: number): Promise<LaporanKeuangan> => {
  const response = await fetch(`${BASE_URL}/laporan/bulanan?bulan=${bulan}&tahun=${tahun}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Gagal memuat data laporan');
  }
  const data = await response.json();
  return data.data; // Asumsi backend mengembalikan dalam { "data": ... }
};
export const getLabaHarian = async (): Promise<{ total_laba_hari_ini: number }> => {
  const response = await fetch(getUrlWithCacheBust(`${BASE_URL}/laporan/laba-harian`), {
    headers: getAuthHeaders(),
  });
  return handleResponse<{ total_laba_hari_ini: number }>(response);
};

// --- Pembelian Langsung ---
// Interface sesuai dengan model Go
interface PembelianLangsung {
  id: number;
  produk_id: number;
  nama_pemasok: string;
  jumlah_kg: number;
  harga_per_kg: number;
  total_harga: number;
  tgl_pembelian: string;
  digunakan_kg: number;
  sisa_kg: number;
  produk: Produk;
  created_at: string;
  updated_at: string;
}

interface LogPembelianLangsung {
  id: number;
  pembelian_langsung_id: number;
  tanggal: string;
  tipe_penggunaan: string;
  jumlah_digunakan_kg: number;
  deskripsi?: string;
  penjualan_id?: number;
  produksi_id?: number;
  produk_id?: number;
  jumlah_kg?: number;
  sumber?: string;
  sumber_id?: number;
}

interface CreatePembelianLangsungRequest {
  produk_id: number;
  nama_pemasok: string;
  jumlah_kg: number;
  harga_per_kg: number;
}

interface UpdatePembelianLangsungRequest {
  produk_id?: number;
  nama_pemasok?: string;
  jumlah_kg?: number;
  harga_per_kg?: number;
}

// API Functions untuk Pembelian Langsung
export const getAllPembelianLangsung = async (): Promise<PembelianLangsung[]> => {
  try {
    const response = await fetch(`${BASE_URL}/pembelian-langsung`, {
      headers:  getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.data || [];
  } catch (error: any) {
    console.error('Error fetching pembelian langsung:', error);
    throw new Error(error.message || 'Gagal mengambil data pembelian langsung');
  }
};

export const getPembelianLangsungById = async (id: number): Promise<PembelianLangsung> => {
  try {
    const response = await fetch(`${BASE_URL}/pembelian-langsung/${id}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  } catch (error: any) {
    console.error('Error fetching pembelian langsung by ID:', error);
    throw new Error(error.message || 'Gagal mengambil data pembelian langsung');
  }
};

export const createPembelianLangsung = async (data: CreatePembelianLangsungRequest): Promise<PembelianLangsung> => {
  try {
    const response = await fetch(`${BASE_URL}/pembelian-langsung`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  } catch (error: any) {
    console.error('Error creating pembelian langsung:', error);
    throw new Error(error.message || 'Gagal membuat pembelian langsung');
  }
};

export const updatePembelianLangsung = async (
    id: number,
    data: UpdatePembelianLangsungRequest
): Promise<PembelianLangsung> => {
  try {
    const response = await fetch(`${BASE_URL}/pembelian-langsung/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  } catch (error: any) {
    console.error('Error updating pembelian langsung:', error);
    throw new Error(error.message || 'Gagal mengupdate pembelian langsung');
  }
};

export const deletePembelianLangsung = async (id: number): Promise<void> => {
  try {
    const response = await fetch(`${BASE_URL}/pembelian-langsung/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
  } catch (error: any) {
    console.error('Error deleting pembelian langsung:', error);
    throw new Error(error.message || 'Gagal menghapus pembelian langsung');
  }
};

// API Functions untuk Log/History Pembelian Langsung
export const getHistoryPembelianLangsung = async (pembelianId: number): Promise<LogPembelianLangsung[]> => {
  try {
    const response = await fetch(`${BASE_URL}/pembelian-langsung/${pembelianId}/history`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.data || [];
  } catch (error: any) {
    console.error('Error fetching pembelian langsung history:', error);
    throw new Error(error.message || 'Gagal mengambil history pembelian langsung');
  }
};

export const getLogsByProdukId = async (produkId: number): Promise<LogPembelianLangsung[]> => {
  try {
    const response = await fetch(`${BASE_URL}/pembelian-langsung/logs/produk/${produkId}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.data || [];
  } catch (error: any) {
    console.error('Error fetching logs by produk ID:', error);
    throw new Error(error.message || 'Gagal mengambil log berdasarkan produk');
  }
};

// Additional helper functions
export const getPembelianLangsungWithPagination = async (
    page: number = 1,
    limit: number = 10
): Promise<{
  data: PembelianLangsung[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> => {
  try {
    const response = await fetch(`${BASE_URL}/pembelian-langsung?page=${page}&limit=${limit}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    console.error('Error fetching pembelian langsung with pagination:', error);
    throw new Error(error.message || 'Gagal mengambil data pembelian langsung');
  }
};

// src/services/api.ts

export const getPembelianLangsungHistory = async (id: number): Promise<LogPembelianLangsung[]> => {
  const response = await fetch(getUrlWithCacheBust(`${BASE_URL}/pembelian-langsung/${id}/history`), {
    headers: getAuthHeaders(),
  });
  return handleResponse<LogPembelianLangsung[]>(response);
};

export const getPembelianLangsungByDateRange = async (
    startDate: string,
    endDate: string
): Promise<PembelianLangsung[]> => {
  try {
    const response = await fetch(
        `${BASE_URL}/pembelian-langsung/date-range?start=${startDate}&end=${endDate}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.data || [];
  } catch (error: any) {
    console.error('Error fetching pembelian langsung by date range:', error);
    throw new Error(error.message || 'Gagal mengambil data berdasarkan rentang tanggal');
  }
};

// Function untuk mendapatkan summary/statistik
export const getPembelianLangsungSummary = async (
    month?: number,
    year?: number
): Promise<{
  total_pembelian: number;
  total_jumlah_kg: number;
  total_sisa_kg: number;
  total_digunakan_kg: number;
  count_transaksi: number;
}> => {
  try {
    const params = new URLSearchParams();
    if (month) params.append('month', month.toString());
    if (year) params.append('year', year.toString());

    const response = await fetch(`${BASE_URL}/pembelian-langsung/summary?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  } catch (error: any) {
    console.error('Error fetching pembelian langsung summary:', error);
    throw new Error(error.message || 'Gagal mengambil summary pembelian langsung');
  }
};

// Function untuk update stok (ketika digunakan untuk produksi/penjualan)
export const updateStokPembelianLangsung = async (
    pembelianId: number,
    jumlahDigunakan: number,
    tipePenggunaan: 'PRODUKSI' | 'PENJUALAN',
    deskripsi?: string,
    referenceId?: number
): Promise<void> => {
  try {
    const response = await fetch(`${BASE_URL}/pembelian-langsung/${pembelianId}/use-stock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jumlah_digunakan_kg: jumlahDigunakan,
        tipe_penggunaan: tipePenggunaan,
        deskripsi: deskripsi,
        reference_id: referenceId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
  } catch (error: any) {
    console.error('Error updating stock pembelian langsung:', error);
    throw new Error(error.message || 'Gagal mengupdate stok pembelian langsung');
  }
};

// --- Log Stok Produk ---
export const getStokHistory = async (produkId: number): Promise<LogStokProduk[]> => {
  // 1. Buat URL lengkap
  const url = `${BASE_URL}/stok-produk/${produkId}/history`;

  // 2. Lakukan request dengan fetch
  const response = await fetch(url, {
    headers: getAuthHeaders(),
  });

  // 3. Wajib periksa status respons secara manual
  if (!response.ok) {
    // Coba ambil pesan error dari backend jika ada
    const errorData = await response.json().catch(() => ({ error: 'Gagal mengambil histori' }));
    throw new Error(errorData.error);
  }

  // 4. Ubah respons menjadi JSON dan ambil datanya
  const result = await response.json();
  return result.data || []; // Asumsi backend mengembalikan dalam format { "data": [...] }
};

export const getRecentStockActivity = async (limit: number = 10): Promise<LogStokProduk[]> => {
  const response = await fetch(getUrlWithCacheBust(`${BASE_URL}/log-stok/activity?limit=${limit}`), {
    headers: getAuthHeaders(),
  });
  return handleResponse<LogStokProduk[]>(response);
};

// ✅ TAMBAHKAN FUNGSI BARU INI DI MANA SAJA DI DALAM FILE
export const tambahStokKemasan = async (payload: InputTambahStokKemasan): Promise<StokProduk> => {
  const response = await fetch(`${BASE_URL}/stok-produk/kemasan`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse<StokProduk>(response);
};

// ✅ TAMBAHKAN SEMUA FUNGSI API BARU UNTUK KARUNG DI BAWAH INI

export const getAllKarung = async (): Promise<BatchKarung[]> => {
  const response = await fetch(getUrlWithCacheBust(`${BASE_URL}/karung`), {
    headers: getAuthHeaders(),
  });
  return handleResponse<BatchKarung[]>(response);
};

export const createKarung = async (payload: InputPembelianKarung): Promise<BatchKarung> => {
  const response = await fetch(`${BASE_URL}/karung`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse<BatchKarung>(response);
};

export const updateKarung = async (id: number, payload: Partial<InputPembelianKarung>): Promise<BatchKarung> => {
  const response = await fetch(`${BASE_URL}/karung/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse<BatchKarung>(response);
};

export const deleteKarung = async (id: number): Promise<{ message: string }> => {
  const response = await fetch(`${BASE_URL}/karung/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleResponse<{ message: string }>(response);
};

export const getKarungHistory = async (id: number): Promise<LogKarung[]> => {
  const response = await fetch(getUrlWithCacheBust(`${BASE_URL}/karung/${id}/history`), {
    headers: getAuthHeaders(),
  });
  return handleResponse<LogKarung[]>(response);
};

// Kas
export const getKasBulanan = async (bulan: number, tahun: number): Promise<KasData> => {
  const response = await fetch(`${BASE_URL}/kas?bulan=${bulan}&tahun=${tahun}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Gagal memuat data kas');
  }
  const data = await response.json();
  return data.data;
};


// Profile management
// Profile management
export const updateProfile = async (fullName: string): Promise<any> => {
  const response = await fetch(`${BASE_URL}/profile`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      full_name: fullName
      // Tidak kirim photo_url sama sekali
    }),
  });
  return handleResponse(response);
};

export const uploadProfilePhoto = async (formData: FormData): Promise<any> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${BASE_URL}/profile/photo`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      // Don't set Content-Type for FormData
    },
    body: formData,
  });
  return handleResponse(response);
};


export const getActivitySummary = async (period: 'day' | 'week' | 'month' = 'day'): Promise<any> => {
  const response = await fetch(`${BASE_URL}/activity-logs/summary?period=${period}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};
// Tambahkan ini di file api.ts untuk mengatasi TypeScript errors
// Tambahkan ini di bagian bawah file api.ts untuk mengganti fungsi yang bermasalah

// PERBAIKAN: Hapus definisi interface yang sudah ada di atas dan ganti dengan ini
interface ActivityLogFiltersUpdated {
  page?: number;
  per_page?: number;
  action?: string;
  module?: string;
  user_id?: string;
  date_from?: string;
  date_to?: string;
}

interface UserUpdated {
  id: number;
  username: string;
  full_name: string;
  email?: string;
  role?: string;
  created_at?: string;
  is_active?: boolean;
}

interface ActivityLogUpdated {
  id: number;
  user_id: number;
  user?: UserUpdated;
  action: string;
  module: string;
  record_id?: number;
  description: string;
  ip_address: string;
  timestamp: string;
}

interface PaginatedActivityLogsResponseUpdated {
  data: ActivityLogUpdated[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_items: number;
    items_per_page: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

// PERBAIKAN: Ganti semua fungsi activity logs yang bermasalah dengan ini:

// Get all users for filter dropdown - FIXED VERSION
export const getUsersFixed = async (): Promise<UserUpdated[]> => {
  try {
    const response = await fetch(`${BASE_URL}/users`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch users');
    }

    const result: unknown = await response.json();

    // Safe type checking
    if (Array.isArray(result)) {
      return result as UserUpdated[];
    }

    if (result && typeof result === 'object' && 'data' in result) {
      const dataResult = (result as { data: unknown }).data;
      if (Array.isArray(dataResult)) {
        return dataResult as UserUpdated[];
      }
    }

    return [];
  } catch (error) {
    console.error('Error fetching users:', error);
    throw new Error('Gagal mengambil data pengguna.');
  }
};

// Get activity logs with enhanced filters - FIXED VERSION
export const getActivityLogsFixed = async (filters: ActivityLogFiltersUpdated = {}): Promise<PaginatedActivityLogsResponseUpdated> => {
  try {
    const queryParams = new URLSearchParams();

    // Add filters to query params
    if (filters.page) queryParams.append('page', filters.page.toString());
    if (filters.per_page) queryParams.append('per_page', filters.per_page.toString());
    if (filters.action && filters.action !== '') queryParams.append('action', filters.action);
    if (filters.module && filters.module !== '') queryParams.append('module', filters.module);
    if (filters.user_id && filters.user_id !== '') queryParams.append('user_id', filters.user_id);
    if (filters.date_from && filters.date_from !== '') queryParams.append('date_from', filters.date_from);
    if (filters.date_to && filters.date_to !== '') queryParams.append('date_to', filters.date_to);

    const response = await fetch(`${BASE_URL}/activity-logs?${queryParams.toString()}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch activity logs');
    }

    const result: unknown = await response.json();

    // Safe type checking and response handling
    if (Array.isArray(result)) {
      return {
        data: result as ActivityLogUpdated[],
        pagination: {
          current_page: filters.page || 1,
          total_pages: 1,
          total_items: result.length,
          items_per_page: filters.per_page || 10,
          has_next: false,
          has_prev: false,
        }
      };
    }

    if (result && typeof result === 'object' && 'data' in result) {
      const dataResult = (result as { data: unknown }).data;
      if (Array.isArray(dataResult)) {
        const paginationData = 'pagination' in result ? (result as any).pagination : undefined;
        return {
          data: dataResult as ActivityLogUpdated[],
          pagination: paginationData || {
            current_page: filters.page || 1,
            total_pages: 1,
            total_items: dataResult.length,
            items_per_page: filters.per_page || 10,
            has_next: false,
            has_prev: false,
          }
        };
      }
    }

    // Fallback
    return {
      data: [],
      pagination: {
        current_page: 1,
        total_pages: 1,
        total_items: 0,
        items_per_page: filters.per_page || 10,
        has_next: false,
        has_prev: false,
      }
    };
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    throw new Error('Gagal mengambil log aktivitas.');
  }
};

// Get activity log detail - FIXED VERSION
export const getActivityLogDetailFixed = async (logId: number): Promise<ActivityLogUpdated> => {
  try {
    const response = await fetch(`${BASE_URL}/activity-logs/${logId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch activity log detail');
    }

    const result: unknown = await response.json();

    if (result && typeof result === 'object' && 'data' in result) {
      return (result as { data: ActivityLogUpdated }).data;
    }

    return result as ActivityLogUpdated;
  } catch (error) {
    console.error('Error fetching activity log detail:', error);
    throw new Error('Gagal mengambil detail log aktivitas.');
  }
};

// Export activity logs to CSV - FIXED VERSION
export const exportActivityLogsFixed = async (filters: ActivityLogFiltersUpdated = {}): Promise<Blob> => {
  try {
    const queryParams = new URLSearchParams();

    if (filters.action && filters.action !== '') queryParams.append('action', filters.action);
    if (filters.module && filters.module !== '') queryParams.append('module', filters.module);
    if (filters.user_id && filters.user_id !== '') queryParams.append('user_id', filters.user_id);
    if (filters.date_from && filters.date_from !== '') queryParams.append('date_from', filters.date_from);
    if (filters.date_to && filters.date_to !== '') queryParams.append('date_to', filters.date_to);

    const response = await fetch(`${BASE_URL}/activity-logs/export?${queryParams.toString()}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.status} ${response.statusText}`);
    }

    return await response.blob();
  } catch (error) {
    console.error('Error exporting activity logs:', error);
    throw new Error('Gagal mengekspor log aktivitas.');
  }
};

// Get activity summary/statistics - FIXED VERSION
export const getActivityLogStatsFixed = async (filters: Omit<ActivityLogFiltersUpdated, 'page' | 'per_page'> = {}): Promise<any> => {
  try {
    const queryParams = new URLSearchParams();

    if (filters.action && filters.action !== '') queryParams.append('action', filters.action);
    if (filters.module && filters.module !== '') queryParams.append('module', filters.module);
    if (filters.user_id && filters.user_id !== '') queryParams.append('user_id', filters.user_id);
    if (filters.date_from && filters.date_from !== '') queryParams.append('date_from', filters.date_from);
    if (filters.date_to && filters.date_to !== '') queryParams.append('date_to', filters.date_to);

    const response = await fetch(`${BASE_URL}/activity-logs/stats?${queryParams.toString()}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch activity stats');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching activity stats:', error);
    throw new Error('Gagal mengambil statistik log aktivitas.');
  }
};


export const getAllHutang = async (): Promise<Hutang[]> => {
  const response = await fetch(getUrlWithCacheBust(`${BASE_URL}/hutang`), { headers: getAuthHeaders() });
  return handleResponse<Hutang[]>(response);
};

export const getAllPiutang = async (): Promise<Piutang[]> => {
  const response = await fetch(getUrlWithCacheBust(`${BASE_URL}/piutang`), { headers: getAuthHeaders() });
  return handleResponse<Piutang[]>(response);
};

export const getAllAkunKas = async (): Promise<AkunKas[]> => {
  const response = await fetch(getUrlWithCacheBust(`${BASE_URL}/akun-kas`), { headers: getAuthHeaders() });
  return handleResponse<AkunKas[]>(response);
};

export interface InputAkunKas {
  nama_akun: string;
  tipe_akun: 'KAS_TUNAI' | 'BANK';
  is_active?: boolean;
}

export const createAkunKas = async (payload: InputAkunKas): Promise<AkunKas> => {
  const response = await fetch(`${BASE_URL}/akun-kas`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse<AkunKas>(response);
};

export const updateAkunKas = async (id: number, payload: InputAkunKas): Promise<AkunKas> => {
  const response = await fetch(`${BASE_URL}/akun-kas/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse<AkunKas>(response);
};

export const deleteAkunKas = async (id: number): Promise<{ message: string }> => {
  const response = await fetch(`${BASE_URL}/akun-kas/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleResponse<{ message: string }>(response);
};

export const createPayment = async (payload: InputPembayaran): Promise<any> => {
  const response = await fetch(`${BASE_URL}/payments`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse<any>(response);
};

// --- TAMBAHAN: Fungsi untuk membuat transaksi kas manual ---
export const createTransaksiKasManual = async (payload: InputTransaksiKasManual): Promise<any> => {
  const response = await fetch(`${BASE_URL}/kas/manual`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse<any>(response);
};

export interface TransaksiKasFilters {
  dateFrom?: string;  // YYYY-MM-DD
  dateTo?: string;    // YYYY-MM-DD
  arah?: 'IN' | 'OUT';
  referenceType?: string;
  search?: string;
}

export const getAkunKasHistory = async (
    id: number,
    page: number = 1,
    limit: number = 10,
    filters?: TransaksiKasFilters
): Promise<PaginatedTransaksiKas> => {
  // Build query parameters
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  // Add filters if provided
  if (filters) {
    if (filters.dateFrom) params.append('date_from', filters.dateFrom);
    if (filters.dateTo) params.append('date_to', filters.dateTo);
    if (filters.arah) params.append('arah', filters.arah);
    if (filters.referenceType) params.append('reference_type', filters.referenceType);
    if (filters.search) params.append('search', filters.search);
  }

  const response = await fetch(
      getUrlWithCacheBust(`${BASE_URL}/akun-kas/${id}/history?${params.toString()}`),
      {
        headers: getAuthHeaders(),
      }
  );

  // Error handling (tetap seperti sebelumnya)
  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    const errorData = await response.json();
    throw new Error(errorData.error || 'Terjadi kesalahan pada server');
  }

  // Return full response (sudah berisi 'data' dan 'pagination')
  return response.json();
};

// Ganti fungsi cancelPenjualan yang salah dengan ini:
export const cancelPenjualan = async (id: number): Promise<{ message: string }> => {
  const response = await fetch(`${BASE_URL}/penjualan/${id}/cancel`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    const errorData = await response.json();
    throw new Error(errorData.error || 'Gagal membatalkan penjualan');
  }

  return response.json();
};