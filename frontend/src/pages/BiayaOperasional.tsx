// FILE: src/pages/BiayaOperasional.tsx
import React, { useState, useEffect, useCallback, Fragment, useMemo } from 'react';
import * as api from '../services/api';
import { BiayaOperasional, KategoriBiaya, AkunKas } from '../types';
import { Dialog, Transition } from '@headlessui/react';
import Pagination from '../components/Pagination';

import {
  XMarkIcon,
  CalendarDaysIcon,
  TagIcon,
  FunnelIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

import { CurrencyDollarIcon } from '@heroicons/react/24/solid';

import {
  FaTrashAlt,
  FaEdit,
  FaPlus,
  FaCalendarAlt,
  FaTags,
  FaMoneyBillWave,
  FaWallet,
} from 'react-icons/fa';

const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
  (window as any).addToast?.(message, type);
};

const formatRupiah = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const kategoriOptions: KategoriBiaya[] = [
  'GAJI',
  'MAINTENANCE',
  'TRANSPORTASI',
  'BBM',
  'KEMASAN',
  'PEMBELIAN_BAHAN',
  'LAINNYA',
];

const BiayaOperasionalPage: React.FC = () => {
  // Data
  const [biayaList, setBiayaList] = useState<BiayaOperasional[]>([]);
  const [akunKasList, setAkunKasList] = useState<AkunKas[]>([]);

  // UI & modal
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editItem, setEditItem] = useState<BiayaOperasional | null>(null);

  // Delete confirm
  const [itemToDelete, setItemToDelete] = useState<BiayaOperasional | null>(null);

  // Filters & paging
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedKategori, setSelectedKategori] = useState<KategoriBiaya | 'SEMUA'>('SEMUA');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Form state (UI saja; logika tetap)
  const [tanggal, setTanggal] = useState('');
  const [kategori, setKategori] = useState<KategoriBiaya>('LAINNYA');
  const [deskripsi, setDeskripsi] = useState('');
  const [jumlah, setJumlah] = useState('');
  const [akunKasId, setAkunKasId] = useState('');

  // ===== Fetch =====
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [biayaData, akunKasData] = await Promise.all([
        api.getAllBiayaOperasional(),
        api.getAllAkunKas(),
      ]);

      setBiayaList(
          Array.isArray(biayaData)
              ? biayaData.sort(
                  (a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime(),
              )
              : [],
      );

      const activeAkunKas = Array.isArray(akunKasData)
          ? (akunKasData as AkunKas[]).filter((a) => a.is_active)
          : [];
      setAkunKasList(activeAkunKas);

      if (activeAkunKas.length > 0) {
        setAkunKasId(String(activeAkunKas[0].id));
      }

      setError(null);
    } catch (err: any) {
      const msg = err?.message || 'Gagal memuat data biaya';
      showToast(msg, 'error');
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ===== Derived: filter + paging + summary =====
  const filteredBiayaList = useMemo(() => {
    return biayaList.filter((item) => {
      const d = new Date(item.tanggal);
      const monthOK = d.getMonth() + 1 === selectedMonth;
      const yearOK = d.getFullYear() === selectedYear;
      const katOK = selectedKategori === 'SEMUA' || item.kategori === selectedKategori;
      return monthOK && yearOK && katOK;
    });
  }, [biayaList, selectedMonth, selectedYear, selectedKategori]);

  const filteredSummary = useMemo(() => {
    return filteredBiayaList.reduce(
        (acc, item) => {
          acc.totalBiaya += item.jumlah;
          switch (item.kategori) {
            case 'GAJI':
              acc.totalGaji += item.jumlah;
              break;
            case 'BBM':
              acc.totalBBM += item.jumlah;
              break;
            case 'PEMBELIAN_BAHAN':
              acc.totalPembelianBahan += item.jumlah;
              break;
            case 'KEMASAN':
              acc.totalKemasan += item.jumlah;
              break;
            default:
              break;
          }
          return acc;
        },
        { totalBiaya: 0, totalGaji: 0, totalBBM: 0, totalPembelianBahan: 0, totalKemasan: 0 },
    );
  }, [filteredBiayaList]);

  const totalPages = Math.ceil(filteredBiayaList.length / itemsPerPage);
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredBiayaList.slice(start, start + itemsPerPage);
  }, [filteredBiayaList, currentPage]);

  useEffect(() => setCurrentPage(1), [selectedMonth, selectedYear, selectedKategori]);

  // ===== Utils =====
  const formatDateForInput = (date: Date): string => date.toISOString().split('T')[0];

  const resetForm = () => {
    setTanggal(formatDateForInput(new Date()));
    setKategori('LAINNYA');
    setDeskripsi('');
    setJumlah('');
    setIsEditing(false);
    setEditItem(null);
    // akunKasId sudah diset default saat fetchData; dibiarkan
  };

  const getKategoriBadge = (kat: string) => {
    const cls: Record<string, string> = {
      GAJI: 'bg-emerald-100 text-emerald-800',
      MAINTENANCE: 'bg-orange-100 text-orange-800',
      TRANSPORTASI: 'bg-purple-100 text-purple-800',
      BBM: 'bg-red-100 text-red-800',
      KEMASAN: 'bg-yellow-100 text-yellow-800',
      PEMBELIAN_BAHAN: 'bg-blue-100 text-blue-800',
      LAINNYA: 'bg-gray-100 text-gray-800',
    };
    return cls[kat] || cls['LAINNYA'];
  };

  // ===== Handlers =====
  const handleCloseModal = () => setIsFormVisible(false);
  const handleCloseDeleteModal = () => setItemToDelete(null);

  const showAddForm = () => {
    resetForm();
    setIsFormVisible(true);
  };

  const handleEditClick = (biaya: BiayaOperasional) => {
    setIsEditing(true);
    setEditItem(biaya);
    setTanggal(formatDateForInput(new Date(biaya.tanggal)));
    setKategori(biaya.kategori as KategoriBiaya);
    setDeskripsi(biaya.deskripsi || '');
    setJumlah(biaya.jumlah.toString());
    // Catatan: akunKasId tetap sesuai default/terakhir dipilih; user bisa ganti bila perlu
    setIsFormVisible(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tanggal || !kategori || !jumlah || !akunKasId) {
      return showToast('Tanggal, Kategori, Jumlah, dan Akun Kas wajib diisi!', 'error');
    }

    const payload: api.InputBiayaOperasional = {
      tanggal,
      kategori,
      deskripsi,
      jumlah: parseFloat(jumlah),
      akun_kas_id: parseInt(akunKasId, 10),
    };

    try {
      if (isEditing && editItem) {
        await api.updateBiayaOperasional(editItem.id, payload);
        showToast('Biaya berhasil diperbarui!', 'success');
      } else {
        await api.createBiayaOperasional(payload);
        showToast('Biaya baru berhasil dicatat!', 'success');
      }
      handleCloseModal();
      fetchData();
    } catch (err: any) {
      showToast(err?.message || 'Gagal menyimpan data.', 'error');
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await api.deleteBiayaOperasional(itemToDelete.id);
      showToast('Biaya berhasil dihapus!', 'success');
      fetchData();
    } catch (err: any) {
      showToast(err?.message || 'Gagal menghapus data.', 'error');
    } finally {
      setItemToDelete(null);
    }
  };

  // ===== Loading / Error =====
  if (isLoading) {
    return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Memuat data biaya operasional...</p>
          </div>
        </div>
    );
  }

  if (error) {
    return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center p-8 bg-red-50 rounded-lg border border-red-200">
            <div className="text-red-600 text-5xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold text-red-800 mb-2">Terjadi Kesalahan</h3>
            <p className="text-red-600">{error}</p>
            <button
                onClick={fetchData}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Coba Lagi
            </button>
          </div>
        </div>
    );
  }

  // ===== Render =====
  return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg p-4 sm:p-6 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">Biaya Operasional</h1>
                <p className="text-blue-100">Kelola dan pantau semua biaya operasional perusahaan</p>
              </div>
              <button
                  onClick={showAddForm}
                  className="inline-flex items-center gap-2 px-4 sm:px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                <FaPlus className="w-5 h-5" />
                Catat Biaya Baru
              </button>
            </div>
          </div>

          {/* Filter Section */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FunnelIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Filter & Periode</h3>
                  <p className="text-sm text-gray-600">Pilih periode dan kategori untuk melihat data</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                {/* Bulan & Tahun */}
                <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                  <CalendarDaysIcon className="w-5 h-5 text-gray-400" />
                  <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(Number(e.target.value))}
                      className="border-0 bg-transparent focus:ring-0 text-sm font-medium text-gray-700"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {new Date(0, i).toLocaleString('id-ID', { month: 'long' })}
                        </option>
                    ))}
                  </select>
                  <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="border-0 bg-transparent focus:ring-0 text-sm font-medium text-gray-700"
                  >
                    {Array.from({ length: 5 }, (_, i) => {
                      const y = new Date().getFullYear() - 2 + i;
                      return (
                          <option key={y} value={y}>
                            {y}
                          </option>
                      );
                    })}
                  </select>
                </div>

                {/* Kategori */}
                <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                  <TagIcon className="w-5 h-5 text-gray-400" />
                  <select
                      value={selectedKategori}
                      onChange={(e) => setSelectedKategori(e.target.value as KategoriBiaya | 'SEMUA')}
                      className="border-0 bg-transparent focus:ring-0 text-sm font-medium text-gray-700"
                  >
                    <option value="SEMUA">Semua Kategori</option>
                    {kategoriOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt.charAt(0).toUpperCase() + opt.slice(1).toLowerCase()}
                        </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Biaya Operasional</p>
                  <p className="text-2xl font-bold text-gray-900">Rp {filteredSummary.totalBiaya.toLocaleString('id-ID')}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(0, selectedMonth - 1).toLocaleString('id-ID', { month: 'long' })} {selectedYear}
                  </p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <CurrencyDollarIcon className="w-8 h-8 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Biaya Gaji</p>
                  <p className="text-2xl font-bold text-emerald-600">Rp {filteredSummary.totalGaji.toLocaleString('id-ID')}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(0, selectedMonth - 1).toLocaleString('id-ID', { month: 'long' })} {selectedYear}
                  </p>
                </div>
                <div className="bg-emerald-100 p-3 rounded-lg">
                  <FaMoneyBillWave className="w-8 h-8 text-emerald-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Biaya BBM</p>
                  <p className="text-2xl font-bold text-red-600">Rp {filteredSummary.totalBBM.toLocaleString('id-ID')}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(0, selectedMonth - 1).toLocaleString('id-ID', { month: 'long' })} {selectedYear}
                  </p>
                </div>
                <div className="bg-red-100 p-3 rounded-lg">
                  <FaMoneyBillWave className="w-8 h-8 text-red-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Biaya Pembelian Bahan</p>
                  <p className="text-2xl font-bold text-blue-600">Rp {filteredSummary.totalPembelianBahan.toLocaleString('id-ID')}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(0, selectedMonth - 1).toLocaleString('id-ID', { month: 'long' })} {selectedYear}
                  </p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <FaMoneyBillWave className="w-8 h-8 text-blue-600" />
                </div>
              </div>
            </div>
          </div>

          {/* ===== FORM MODAL (UI disamakan dengan PembelianBeras) ===== */}
          <Transition appear show={isFormVisible} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={handleCloseModal}>
              <Transition.Child
                  as={Fragment}
                  enter="ease-out duration-300"
                  enterFrom="opacity-0"
                  enterTo="opacity-100"
                  leave="ease-in duration-200"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
              >
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
              </Transition.Child>

              <div className="fixed inset-0 overflow-y-auto">
                <div className="flex min-h-full items-center justify-center p-4">
                  <Transition.Child
                      as={Fragment}
                      enter="ease-out duration-300"
                      enterFrom="opacity-0 scale-95"
                      enterTo="opacity-100 scale-100"
                      leave="ease-in duration-200"
                      leaveFrom="opacity-100 scale-100"
                      leaveTo="opacity-0 scale-95"
                  >
                    <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all border border-blue-100">
                      {/* Header Modal */}
                      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 relative">
                        <Dialog.Title className="text-xl font-bold text-white flex items-center gap-3">
                          <div className="p-2 bg-white/20 rounded-lg">
                            <FaMoneyBillWave className="w-5 h-5 text-white" />
                          </div>
                          {isEditing ? 'Edit Biaya Operasional' : 'Catat Biaya Operasional'}
                        </Dialog.Title>
                        <button
                            onClick={handleCloseModal}
                            className="absolute top-4 right-4 text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                            aria-label="Tutup"
                        >
                          <XMarkIcon className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Body Form (UI mengikuti PembelianBeras) */}
                      <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Tanggal */}
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Tanggal <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={tanggal}
                                onChange={(e) => setTanggal(e.target.value)}
                                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                                required
                            />
                          </div>

                          {/* Kategori */}
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Kategori <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={kategori}
                                onChange={(e) => setKategori(e.target.value as KategoriBiaya)}
                                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                            >
                              {kategoriOptions.map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt.charAt(0).toUpperCase() + opt.slice(1).toLowerCase()}
                                  </option>
                              ))}
                            </select>
                          </div>

                          {/* Jumlah (Rp) */}
                          <div className="lg:col-span-1">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Jumlah (Rp) <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                                <span className="text-gray-500 text-sm font-medium">Rp</span>
                              </div>
                              <input
                                  type="number"
                                  step="100"
                                  min="0"
                                  value={jumlah}
                                  onChange={(e) => setJumlah(e.target.value)}
                                  className="w-full rounded-xl border border-gray-300 pl-10 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                                  placeholder="0"
                                  required
                              />
                            </div>
                          </div>

                          {/* Akun Kas */}
                          <div className="lg:col-span-1">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Bayar Dari Akun Kas <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={akunKasId}
                                onChange={(e) => setAkunKasId(e.target.value)}
                                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                                required
                            >
                              <option value="" disabled>
                                Pilih Akun Kas
                              </option>
                              {akunKasList.map((akun) => (
                                  <option key={akun.id} value={akun.id}>
                                    {akun.nama_akun} ({formatRupiah(akun.saldo)})
                                  </option>
                              ))}
                            </select>
                          </div>

                          {/* Deskripsi */}
                          <div className="lg:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Deskripsi (Opsional)</label>
                            <textarea
                                value={deskripsi}
                                onChange={(e) => setDeskripsi(e.target.value)}
                                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                                rows={3}
                                placeholder="Catatan tambahan..."
                            />
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-2">
                          <button
                              type="button"
                              onClick={handleCloseModal}
                              className="flex-1 rounded-xl border border-gray-300 bg-white py-3 px-4 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
                          >
                            Batal
                          </button>
                          <button
                              type="submit"
                              className="flex-1 rounded-xl bg-blue-600 py-3 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
                          >
                            {isEditing ? 'Update' : 'Simpan'}
                          </button>
                        </div>
                      </form>
                    </Dialog.Panel>
                  </Transition.Child>
                </div>
              </div>
            </Dialog>
          </Transition>

          {/* ===== Data Table ===== */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-800">Riwayat Biaya Operasional</h2>
              <p className="text-gray-600 mt-1">
                Menampilkan {filteredBiayaList.length} dari {biayaList.length} total catatan biaya
                {selectedMonth && selectedYear && (
                    <span className="text-blue-600 font-medium">
                  {' '}
                      untuk {new Date(0, selectedMonth - 1).toLocaleString('id-ID', { month: 'long' })} {selectedYear}
                </span>
                )}
                {selectedKategori !== 'SEMUA' && <span className="text-blue-600 font-medium"> kategori {selectedKategori}</span>}
              </p>
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y divide-gray-100">
              {currentItems.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <FaMoneyBillWave className="w-12 h-12 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Belum ada biaya operasional</h3>
                    <p className="text-gray-600 mb-6">
                      {biayaList.length === 0 ? 'Mulai catat biaya operasional perusahaan Anda' : `Tidak ada biaya pada periode yang dipilih`}
                    </p>
                    <button
                        onClick={showAddForm}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                    >
                      <FaPlus className="w-5 h-5" />
                      Catat Biaya Pertama
                    </button>
                  </div>
              ) : (
                  currentItems.map((item) => (
                      <div key={item.id} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                        <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getKategoriBadge(
                                item.kategori,
                            )}`}
                        >
                          <FaTags className="w-3 h-3 mr-1" />
                          {item.kategori}
                        </span>
                            </div>
                            <div className="text-sm text-gray-500 flex items-center gap-1 mb-1">
                              <FaCalendarAlt className="w-3 h-3" />
                              {new Date(item.tanggal).toLocaleDateString('id-ID', {
                                weekday: 'short',
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </div>
                            {item.deskripsi && <p className="text-sm text-gray-700 mt-2">{item.deskripsi}</p>}
                          </div>

                          <div className="flex items-center gap-2 ml-4">
                            {item.kategori !== 'PEMBELIAN_BAHAN' && (
                                <>
                                  <button
                                      onClick={() => handleEditClick(item)}
                                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                      title="Edit"
                                  >
                                    <FaEdit className="w-4 h-4" />
                                  </button>
                                  <button
                                      onClick={() => setItemToDelete(item)}
                                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                      title="Hapus"
                                  >
                                    <FaTrashAlt className="w-4 h-4" />
                                  </button>
                                </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className="text-sm font-medium text-gray-600 flex items-center gap-1">
                      <FaMoneyBillWave className="w-3 h-3" />
                      Total Biaya
                    </span>
                          <span className="text-lg font-bold text-red-600">Rp {item.jumlah.toLocaleString('id-ID')}</span>
                        </div>
                      </div>
                  ))
              )}
            </div>

            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tanggal</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Kategori</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Deskripsi</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Jumlah</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Aksi</th>
                </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                {currentItems.length > 0 ? (
                    currentItems.map((item) => (
                        <tr key={item.id} className="hover:bg-blue-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {new Date(item.tanggal).toLocaleDateString('id-ID')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getKategoriBadge(
                                item.kategori,
                            )}`}
                        >
                          {item.kategori}
                        </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">{item.deskripsi || '-'}</td>
                          <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                            {formatRupiah(item.jumlah)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 justify-center">
                              {item.kategori !== 'PEMBELIAN_BAHAN' ? (
                                  <>
                                    <button
                                        onClick={() => handleEditClick(item)}
                                        className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                                        title="Edit"
                                        aria-label="Edit"
                                    >
                                      <FaEdit className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => setItemToDelete(item)}
                                        className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                                        title="Hapus"
                                        aria-label="Hapus"
                                    >
                                      <FaTrashAlt className="w-5 h-5" />
                                    </button>
                                  </>
                              ) : (
                                  <span className="text-xs text-gray-400 italic">Terkunci</span>
                              )}
                            </div>
                          </td>
                        </tr>
                    ))
                ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-600">
                        Tidak ada data pada periode/kategori ini.
                      </td>
                    </tr>
                )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-4 sm:p-6">
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(p) => setCurrentPage(p)} />
            </div>
          </div>
        </div>

        {/* ===== Delete Confirmation Modal ===== */}
        <Transition appear show={!!itemToDelete} as={Fragment}>
          <Dialog as="div" className="relative z-50" onClose={handleCloseDeleteModal}>
            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
            </Transition.Child>

            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4">
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0 scale-95"
                    enterTo="opacity-100 scale-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100 scale-100"
                    leaveTo="opacity-0 scale-95"
                >
                  <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-red-100">
                        <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
                      </div>
                      <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                        Hapus Biaya Operasional?
                      </Dialog.Title>
                    </div>
                    <p className="text-sm text-gray-600">
                      Tindakan ini akan menghapus catatan biaya{' '}
                      <span className="font-semibold">{itemToDelete?.deskripsi || '(tanpa deskripsi)'}</span> pada tanggal{' '}
                      {itemToDelete ? new Date(itemToDelete.tanggal).toLocaleDateString('id-ID') : '-'}.
                    </p>

                    <div className="mt-6 flex gap-3">
                      <button
                          type="button"
                          className="flex-1 rounded-lg border border-gray-300 bg-white py-2.5 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                          onClick={handleCloseDeleteModal}
                      >
                        Batal
                      </button>
                      <button
                          type="button"
                          className="flex-1 rounded-lg bg-red-600 py-2.5 px-4 text-sm font-semibold text-white hover:bg-red-700"
                          onClick={handleDelete}
                      >
                        Hapus
                      </button>
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition>
      </div>
  );
};

export default BiayaOperasionalPage;
