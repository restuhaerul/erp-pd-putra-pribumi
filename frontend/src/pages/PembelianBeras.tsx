import React, { useState, useEffect, useCallback, Fragment, useMemo } from 'react';
import * as api from '../services/api';
import { Produk, PembelianLangsung, AkunKas, LogPembelian } from '../types';
import { Dialog, Transition } from '@headlessui/react';
import {
    FaEdit,
    FaEye,
    FaCalendarAlt,
    FaTruck,
    FaPlus,
    FaTimesCircle,
    FaBoxOpen,
    FaMoneyBillWave,
    FaCheck,
    FaChevronLeft,
    FaChevronRight,
    FaHistory
} from 'react-icons/fa';
import {
    XMarkIcon,
    CalendarDaysIcon,
    ExclamationTriangleIcon,
    CurrencyDollarIcon,
    HashtagIcon,
    ScaleIcon,
    ShoppingBagIcon,
    UserIcon
} from '@heroicons/react/24/solid';
import { CreditCardIcon, PackageIcon, TrendingUpIcon } from 'lucide-react';

/* ======================================================================== *
 * Types & Interfaces
 * ======================================================================== */

interface LogPembelianLangsung {
    id: number;
    pembelian_langsung_id: number;
    tanggal: string;
    tipe_penggunaan: string;
    jumlah_digunakan_kg: number;
    deskripsi?: string;
    jumlah_kg?: number;
    sumber?: string;
    sumber_id?: number;
}

interface ExtendedPembelianLangsung extends PembelianLangsung {
    total_harga: number;
    digunakan_kg?: number;
    sisa_kg?: number;
    status?: 'AKTIF' | 'DIBATALKAN' | string;
    status_pembayaran?: 'LUNAS' | 'SEBAGIAN' | 'BELUM_LUNAS';
    nilai_terbayar?: number;
    akun_kas_id?: number;
    is_terpakai: boolean; // Remove optional - must be boolean
}

type FilterMode = 'HARI_INI' | 'MINGGU_INI' | 'BULAN_INI' | 'KUSTOM';

/* ======================================================================== *
 * Utilities
 * ======================================================================== */

const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    (window as any).addToast?.(message, type);
};

const formatRupiah = (n: number) =>
    new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(n);

/* ======================================================================== *
 * 🎨 ENHANCED SUB-COMPONENTS WITH ANIMATIONS
 * ======================================================================== */

// ✨ Summary Card dengan Animasi Smooth
const SummaryCard: React.FC<{
    title: string;
    value: string;
    subtitle?: string;
    icon: React.ReactNode;
    bgColor?: string;
    gradient?: string;
    shadow?: string;
}> = ({
          title,
          value,
          subtitle,
          icon,
          bgColor = 'bg-emerald-50',
          gradient = 'from-emerald-500 to-teal-600',
          shadow = 'shadow-emerald-500/25'
      }) => (
    <div className={`relative overflow-hidden rounded-2xl border border-gray-100 ${bgColor} p-5 shadow-sm hover:shadow-lg transition-all duration-300 group cursor-pointer`}>
        {/* Decorative blob */}
        <div className="absolute w-32 h-32 rounded-full -top-10 -right-10 bg-gradient-to-br from-white/40 to-transparent blur-2xl" />
        <div className="relative z-10 flex items-center justify-between">
            <div className="flex-1">
                <p className="mb-2 text-sm font-semibold text-gray-600">{title}</p>
                <p className="text-2xl font-extrabold text-gray-900 lg:text-3xl tabular-nums">{value}</p>
                {subtitle && <p className="text-xs text-gray-500 mt-1.5">{subtitle}</p>}
            </div>
            <div className={`bg-gradient-to-br ${gradient} p-4 rounded-2xl shadow-lg ${shadow} group-hover:scale-110 transition-transform duration-300`}>
                <div className="text-white">{icon}</div>
            </div>
        </div>
    </div>
);

// ✨ Enhanced Pagination
const EnhancedPagination: React.FC<{
    currentPage: number;
    totalPages: number;
    onPageChange: (p: number) => void;
}> = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;

    const getPageNumbers = () => {
        const arr: (number | string)[] = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) arr.push(i);
        } else {
            let start = Math.max(1, currentPage - 2);
            let end = Math.min(totalPages, start + maxVisible - 1);
            if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);

            if (start > 1) {
                arr.push(1);
                if (start > 2) arr.push('...');
            }
            for (let i = start; i <= end; i++) arr.push(i);
            if (end < totalPages) {
                if (end < totalPages - 1) arr.push('...');
                arr.push(totalPages);
            }
        }
        return arr;
    };

    return (
        <div className="flex items-center justify-center gap-2 mt-8">
            <button
                type="button"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="group flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 hover:shadow-md disabled:hover:scale-100"
            >
                <FaChevronLeft className="w-3 h-3 transition-transform group-hover:-translate-x-1" />
                Sebelumnya
            </button>

            <div className="flex items-center gap-1.5">
                {getPageNumbers().map((page, i) =>
                    typeof page === 'string' ? (
                        <span key={`ellipsis-${i}`} className="px-3 py-2 text-sm font-bold text-gray-400">
                            {page}
                        </span>
                    ) : (
                        <button
                            key={`page-${page}`}
                            type="button"
                            onClick={() => onPageChange(page)}
                            className={`px-4 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 transform hover:scale-110 ${
                                currentPage === page
                                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-300 scale-110'
                                    : 'bg-white text-gray-600 border-2 border-gray-200 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-300 hover:shadow-md'
                            }`}
                        >
                            {page}
                        </button>
                    )
                )}
            </div>

            <button
                type="button"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="group flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 hover:shadow-md disabled:hover:scale-100"
            >
                Berikutnya
                <FaChevronRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
            </button>
        </div>
    );
};

// ✨ History Modal
const HistoryModal = ({
                          isOpen,
                          onClose,
                          data,
                          isLoading,
                          title,
                      }: {
    isOpen: boolean;
    onClose: () => void;
    data: LogPembelianLangsung[];
    isLoading: boolean;
    title: string;
}) => (
    <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={onClose}>
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
                <div className="flex items-center justify-center min-h-full p-4">
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0 scale-95"
                        enterTo="opacity-100 scale-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100 scale-100"
                        leaveTo="opacity-0 scale-95"
                    >
                        <Dialog.Panel className="w-full max-w-4xl overflow-hidden transition-all transform bg-white border shadow-2xl rounded-2xl border-emerald-100">
                            <div className="relative px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600">
                                <Dialog.Title className="flex items-center gap-3 text-xl font-bold text-white">
                                    <div className="p-2 rounded-lg bg-white/20">
                                        <FaEye className="w-5 h-5" />
                                    </div>
                                    {title}
                                </Dialog.Title>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="absolute p-2 transition-colors rounded-lg top-4 right-4 text-white/80 hover:text-white hover:bg-white/20"
                                >
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-6 max-h-[70vh] overflow-y-auto">
                                {isLoading ? (
                                    <div className="py-12 text-center">
                                        <div className="w-16 h-16 mx-auto mb-4 border-4 rounded-full border-emerald-200 border-t-emerald-600 animate-spin" />
                                        <p className="font-medium text-gray-500">Memuat histori...</p>
                                    </div>
                                ) : data.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="border-b-2 border-gray-200 bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-xs font-bold text-left text-gray-600 uppercase">Tanggal</th>
                                                <th className="px-4 py-3 text-xs font-bold text-left text-gray-600 uppercase">Tipe</th>
                                                <th className="px-4 py-3 text-xs font-bold text-right text-gray-600 uppercase">Jumlah (Kg)</th>
                                                <th className="px-4 py-3 text-xs font-bold text-left text-gray-600 uppercase">Deskripsi</th>
                                            </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                            {data.map((log, idx) => (
                                                <tr key={idx} className="transition-colors hover:bg-emerald-50/50">
                                                    <td className="px-4 py-3 text-sm text-gray-900">
                                                        {new Date(log.tanggal).toLocaleDateString('id-ID')}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                            <span className="px-2 py-1 text-xs font-semibold text-blue-800 bg-blue-100 rounded-full">
                                                                {log.tipe_penggunaan}
                                                            </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm font-bold text-right text-gray-900">
                                                        {log.jumlah_digunakan_kg.toFixed(2)} Kg
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">
                                                        {log.deskripsi || '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="py-12 text-center">
                                        <FaEye className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                                        <p className="mb-2 text-lg font-medium text-gray-900">Tidak ada histori</p>
                                        <p className="text-gray-500">Belum ada histori penggunaan untuk batch ini.</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end px-6 py-4 border-t bg-gray-50">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-6 py-2 text-sm font-semibold text-gray-700 transition-all bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:shadow-md"
                                >
                                    Tutup
                                </button>
                            </div>
                        </Dialog.Panel>
                    </Transition.Child>
                </div>
            </div>
        </Dialog>
    </Transition>
);

/* ======================================================================== *
 * 🎨 MAIN COMPONENT
 * ======================================================================== */

const PembelianBerasPage: React.FC = () => {
    // Data States
    const [pembelianList, setPembelianList] = useState<ExtendedPembelianLangsung[]>([]);
    const [produkList, setProdukList] = useState<Produk[]>([]);
    const [akunKasList, setAkunKasList] = useState<AkunKas[]>([]);
    const [historyData, setHistoryData] = useState<LogPembelianLangsung[]>([]);

    // Filter States
    const [filterMode, setFilterMode] = useState<FilterMode>('BULAN_INI');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'LUNAS' | 'SEBAGIAN' | 'BELUM_LUNAS'>('ALL');
    const [searchQuery, setSearchQuery] = useState(''); // 🔍 Search state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // UI States
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editItemId, setEditItemId] = useState<number | null>(null);
    const [deleteItem, setDeleteItem] = useState<ExtendedPembelianLangsung | null>(null);
    const [historyItem, setHistoryItem] = useState<ExtendedPembelianLangsung | null>(null);
    const [isHistoryVisible, setIsHistoryVisible] = useState(false);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form States
    const [produkId, setProdukId] = useState('');
    const [namaPemasok, setNamaPemasok] = useState('');
    const [jumlahKg, setJumlahKg] = useState('');
    const [hargaPerKg, setHargaPerKg] = useState('');
    const [statusPembayaran, setStatusPembayaran] = useState<'LUNAS' | 'SEBAGIAN' | 'BELUM_LUNAS'>('BELUM_LUNAS');
    const [nilaiTerbayar, setNilaiTerbayar] = useState('');
    const [akunKasId, setAkunKasId] = useState('');

    /* ========================== Derived State (Filters) ========================== */

    /* ========================== Derived State (Filters) ========================== */

    // 1. Date Range Calculation (TETAP DI ATAS)
    const { startDate, endDate, rangeLabel } = useMemo(() => {
        const now = new Date();
        const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

        let start = startOfDay(now);
        let end = endOfDay(now);
        let label = 'Hari ini';

        if (filterMode === 'MINGGU_INI') {
            const day = now.getDay();
            const diff = (day + 6) % 7;
            const monday = new Date(now);
            monday.setDate(now.getDate() - diff);
            start = startOfDay(monday);
            end = endOfDay(now);
            label = 'Minggu ini';
        } else if (filterMode === 'BULAN_INI') {
            const first = new Date(now.getFullYear(), now.getMonth(), 1);
            const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            start = startOfDay(first);
            end = endOfDay(last);
            label = now.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
        } else if (filterMode === 'KUSTOM') {
            const fallbackStart = new Date(now.getFullYear(), now.getMonth(), 1);
            start = customStart ? startOfDay(new Date(customStart)) : fallbackStart;
            end = customEnd ? endOfDay(new Date(customEnd)) : endOfDay(now);
            if (customStart && customEnd) {
                label = `${new Date(customStart).toLocaleDateString('id-ID')} - ${new Date(customEnd).toLocaleDateString('id-ID')}`;
            } else label = 'Periode kustom';
        }

        return { startDate: start, endDate: end, rangeLabel: label };
    }, [filterMode, customStart, customEnd]);

    // 2. Helpers Map (WAJIB PINDAH KE SINI SEBELUM DIGUNAKAN DI FILTER)
    const produkMap = useMemo(() => {
        const map = new Map<number, string>();
        produkList.forEach((p) => {
            map.set(p.id, p.nama_produk);
        });
        return map;
    }, [produkList]);

    // 3. Apply Filters (SEKARANG AMAN KARENA produkMap SUDAH ADA DI ATAS)
    const filteredList = useMemo(() => {
        // Filter Tanggal
        let filtered = pembelianList.filter((item) => {
            const d = new Date(item.tgl_pembelian);
            return d >= startDate && d <= endDate;
        });

        // Filter Status Pembayaran
        if (statusFilter !== 'ALL') {
            filtered = filtered.filter((p) => (p.status_pembayaran || 'BELUM_LUNAS') === statusFilter);
        }

        // Filter Pencarian (Search)
        const q = searchQuery.toLowerCase();
        if (q) {
            filtered = filtered.filter((item) => {
                const prodName = produkMap.get(item.produk_id) || '';
                return (
                    prodName.toLowerCase().includes(q) ||
                    (item.nama_pemasok || '').toLowerCase().includes(q)
                );
            });
        }

        return filtered;
    }, [pembelianList, startDate, endDate, statusFilter, searchQuery, produkMap]);

    // 4. Pagination & Summary (DEPENDENSI KE filteredList)
    const totalPages = Math.ceil(filteredList.length / itemsPerPage) || 1;
    const currentItems = useMemo(() => {
        const startIdx = (currentPage - 1) * itemsPerPage;
        return filteredList.slice(startIdx, startIdx + itemsPerPage);
    }, [filteredList, currentPage]);

    const summary = useMemo(() => {
        return filteredList.reduce((acc, item) => {
            acc.totalPembelian += (item.jumlah_kg * item.harga_per_kg);
            acc.totalKg += item.jumlah_kg;
            acc.totalSisaKg += (item.sisa_kg || 0);
            return acc;
        }, { totalPembelian: 0, totalKg: 0, totalSisaKg: 0 });
    }, [filteredList]);

    // 5. Helpers Lain
    const isLocked = (p: ExtendedPembelianLangsung) => {
        const sisa = Number(p.sisa_kg ?? p.jumlah_kg ?? 0);
        const awal = Number(p.jumlah_kg ?? 0);
        return Boolean(p.is_terpakai) || sisa !== awal;
    };

    /* ========================== Data Fetching ========================== */

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true);
            const [pembelian, produk, akunKas] = await Promise.all([
                api.getAllPembelianLangsung(),
                api.getAllProduk(),
                api.getAllAkunKas(),
            ]);

            const extendedPembelian: ExtendedPembelianLangsung[] = (Array.isArray(pembelian) ? pembelian : []).map((item: any) => ({
                ...item,
                total_harga: item.jumlah_kg * item.harga_per_kg,
                digunakan_kg: item.digunakan_kg || 0,
                sisa_kg: item.sisa_kg !== undefined ? item.sisa_kg : item.jumlah_kg,
                is_terpakai: (item.digunakan_kg || 0) > 0,
            }));

            extendedPembelian.sort((a, b) => new Date(b.tgl_pembelian).getTime() - new Date(a.tgl_pembelian).getTime());

            setPembelianList(extendedPembelian);
            setProdukList(Array.isArray(produk) ? produk.filter(p => p.tipe_produk === 'PRODUK_JADI' && !p.lacak_per_batch) : []);
            setAkunKasList(Array.isArray(akunKas) ? akunKas.filter(a => a.is_active) : []);

            setError(null);
        } catch (err: any) {
            showToast(err.message || 'Gagal memuat data', 'error');
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        setCurrentPage(1);
    }, [fetchData]);

    const fetchHistory = useCallback(async (pembelianId: number) => {
        try {
            setIsLoadingHistory(true);
            const data = await api.getPembelianLangsungHistory(pembelianId);
            setHistoryData(data);
        } catch (err: any) {
            showToast(err.message || 'Gagal memuat history', 'error');
            setHistoryData([]);
        } finally {
            setIsLoadingHistory(false);
        }
    }, []);

    /* ========================== Form Handlers ========================== */

    const resetForm = () => {
        setProdukId('');
        setNamaPemasok('');
        setJumlahKg('');
        setHargaPerKg('');
        setStatusPembayaran('BELUM_LUNAS');
        setNilaiTerbayar('');
        setAkunKasId(akunKasList.length > 0 ? String(akunKasList[0].id) : '');
        setIsEditing(false);
        setEditItemId(null);
        setStep(1);
    };

    const handleOpenModal = () => {
        resetForm();
        setIsFormVisible(true);
    };

    const handleCloseModal = () => {
        resetForm();
        setIsFormVisible(false);
    };

    const handleEditClick = (item: ExtendedPembelianLangsung) => {
        setEditItemId(item.id);
        setProdukId(String(item.produk_id));
        setNamaPemasok(item.nama_pemasok || '');
        setJumlahKg(String(item.jumlah_kg));
        setHargaPerKg(String(item.harga_per_kg));
        const st = (item.status_pembayaran || 'BELUM_LUNAS').toUpperCase();
        setStatusPembayaran(st === 'HUTANG' ? 'BELUM_LUNAS' : st === 'DP' ? 'SEBAGIAN' : (st as any));
        setNilaiTerbayar(item.nilai_terbayar ? String(item.nilai_terbayar) : '');
        setAkunKasId(item.akun_kas_id ? String(item.akun_kas_id) : akunKasList[0] ? String(akunKasList[0].id) : '');

        setIsEditing(true);
        setStep(1);
        setIsFormVisible(true);
    };

    const calculateTotal = () => {
        const j = parseFloat(jumlahKg) || 0;
        const h = parseFloat(hargaPerKg) || 0;
        return j * h;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (step < 3) {
            if (step === 1) {
                if (!produkId) {
                    showToast('Silakan pilih produk terlebih dahulu', 'error');
                    return;
                }
            }

            if (step === 2) {
                if (!jumlahKg || parseFloat(jumlahKg) <= 0) {
                    showToast('Jumlah (Kg) harus diisi dan lebih dari 0', 'error');
                    return;
                }
                if (!hargaPerKg || parseFloat(hargaPerKg) <= 0) {
                    showToast('Harga per Kg harus diisi dan lebih dari 0', 'error');
                    return;
                }
            }

            nextStep();
            return;
        }

        const total = calculateTotal();
        const bayar = parseFloat(nilaiTerbayar || '0') || 0;

        if ((statusPembayaran === 'SEBAGIAN' || statusPembayaran === 'LUNAS') && !akunKasId) {
            showToast('Pilih akun kas untuk pembayaran.', 'error');
            return;
        }

        if (statusPembayaran === 'SEBAGIAN' && (bayar <= 0 || bayar >= total)) {
            showToast('Untuk DP, nilai harus > 0 dan < total.', 'error');
            return;
        }

        const payload: any = {
            produk_id: parseInt(produkId, 10),
            nama_pemasok: namaPemasok,
            jumlah_kg: parseFloat(jumlahKg),
            harga_per_kg: parseFloat(hargaPerKg),
            status_pembayaran: statusPembayaran,
            nilai_terbayar: statusPembayaran === 'SEBAGIAN' ? bayar : 0,
            akun_kas_id: akunKasId ? parseInt(akunKasId, 10) : undefined,
        };

        try {
            setIsSubmitting(true);
            if (isEditing && editItemId) {
                await api.updatePembelianLangsung(editItemId, payload);
                showToast('Data berhasil diperbarui!', 'success');
            } else {
                await api.createPembelianLangsung(payload);
                showToast('Pembelian baru berhasil dicatat!', 'success');
            }
            setIsFormVisible(false);
            fetchData();
        } catch (err: any) {
            showToast(err.message || 'Gagal menyimpan data.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const confirmDelete = (item: ExtendedPembelianLangsung) => {
        setDeleteItem(item);
    };

    const handleDelete = async () => {
        if (!deleteItem) return;
        try {
            await api.deletePembelianLangsung(deleteItem.id);
            showToast('Transaksi berhasil dibatalkan!', 'success');
            fetchData();
        } catch (err: any) {
            showToast(err.message || 'Gagal membatalkan transaksi.', 'error');
        } finally {
            setDeleteItem(null);
        }
    };

    const handleViewHistory = async (item: ExtendedPembelianLangsung) => {
        setHistoryItem(item);
        setIsHistoryVisible(true);
        await fetchHistory(item.id);
    };

    const nextStep = () => setStep((s) => (s < 3 ? ((s + 1) as 1 | 2 | 3) : s));
    const prevStep = () => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s));

    /* ========================== Badges & UI Helpers ========================== */

    const renderPaymentBadge = (status?: string, nilai?: number) => {
        const s = (status || 'BELUM_LUNAS').toUpperCase();
        if (s === 'LUNAS')
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Lunas
                </span>
            );
        if (s === 'SEBAGIAN' || s === 'DP')
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-800 border border-indigo-200">
                    <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                    DP {nilai ? `(${formatRupiah(nilai)})` : ''}
                </span>
            );
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border border-amber-200">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /> Hutang
            </span>
        );
    };

    const renderStatusBadge = (status?: string) => {
        const s = (status || 'AKTIF').toUpperCase();
        if (s === 'AKTIF')
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 border border-blue-200">
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" /> Aktif
                </span>
            );
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-red-100 to-pink-100 text-red-800 border border-red-200">
                <span className="w-2 h-2 bg-red-500 rounded-full" /> Dibatalkan
            </span>
        );
    };

    const statusFilterLabel = statusFilter === 'ALL' ? 'Semua Status' : statusFilter === 'LUNAS' ? 'Lunas' : statusFilter === 'SEBAGIAN' ? 'DP / Sebagian' : 'Hutang';

    /* ========================== LOADING STATE ========================== */

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-emerald-50/30">
                <div className="text-center">
                    <div className="w-20 h-20 mx-auto mb-4 border-4 rounded-full border-emerald-200 border-t-emerald-600 animate-spin" />
                    <p className="text-lg font-bold text-gray-700">Memuat data...</p>
                </div>
            </div>
        );
    }

    /* ========================== MAIN RENDER ========================== */

    return (
        <div className="min-h-screen p-4 bg-gray-50 sm:p-6">
            <div className="mx-auto space-y-6 max-w-7xl">
                {/* 🎨 HERO HEADER - Style seperti Karung */}
                <div className="relative px-6 py-6 overflow-hidden text-white shadow-lg bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 rounded-2xl">
                    {/* Decorative Icon */}
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <ShoppingBagIcon className="w-32 h-32" />
                    </div>

                    <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            {/* Badge */}
                            <div className="inline-flex items-center gap-2 px-3 py-1 mb-2 text-xs font-medium border rounded-full bg-white/20 backdrop-blur-sm border-white/10">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                Manajemen Pembelian
                            </div>

                            {/* Title */}
                            <h1 className="text-3xl font-bold tracking-tight">Pembelian Beras Langsung</h1>

                            {/* Description */}
                            <p className="max-w-lg mt-1 text-sm text-emerald-100">
                                Kelola pembelian beras jadi langsung dari pemasok dengan sistem pencatatan yang akurat dan terintegrasi
                            </p>
                        </div>

                        {/* Button */}
                        <button
                            onClick={handleOpenModal}
                            className="group flex items-center gap-2 px-5 py-3 bg-white text-emerald-600 rounded-xl font-bold shadow-lg hover:shadow-xl hover:bg-emerald-50 transition-all transform hover:-translate-y-0.5"
                        >
                            <FaPlus className="transition-transform duration-300 group-hover:rotate-90" />
                            Catat Pembelian
                        </button>
                    </div>
                </div>
                {/* 🎨 FILTER TABS - Style seperti Karung */}
                <div className="p-4 bg-white border shadow-sm rounded-2xl border-emerald-100">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex flex-wrap gap-2">
                            {([
                                { id: 'HARI_INI', label: 'Hari Ini' },
                                { id: 'MINGGU_INI', label: 'Minggu Ini' },
                                { id: 'BULAN_INI', label: 'Bulan Ini' },
                                { id: 'KUSTOM', label: 'Kustom' }
                            ] as { id: FilterMode; label: string }[]).map((opt) => {
                                const active = filterMode === opt.id;
                                return (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => setFilterMode(opt.id)}
                                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                                            active
                                                ? 'bg-emerald-500 text-white shadow-sm'
                                                : 'bg-gray-100 text-gray-600 hover:bg-emerald-50 hover:text-emerald-600'
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                );
                            })}
                        </div>

                        {filterMode === 'KUSTOM' && (
                            <div className="flex flex-col items-center gap-2 px-3 py-2 sm:flex-row bg-gray-50 rounded-xl">
                                <input
                                    type="date"
                                    value={customStart}
                                    onChange={(e) => setCustomStart(e.target.value)}
                                    className="text-sm border-0 bg-white px-3 py-1.5 rounded-lg focus:ring-2 focus:ring-emerald-200"
                                />
                                <span className="text-gray-400">→</span>
                                <input
                                    type="date"
                                    value={customEnd}
                                    onChange={(e) => setCustomEnd(e.target.value)}
                                    className="text-sm border-0 bg-white px-3 py-1.5 rounded-lg focus:ring-2 focus:ring-emerald-200"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* 🎨 SUMMARY CARDS - Style seperti Karung */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    <SummaryCard
                        title="Total Pembelian"
                        value={formatRupiah(summary.totalPembelian)}
                        subtitle={`Periode ${rangeLabel.toLowerCase()}`}
                        icon={<CurrencyDollarIcon className="w-7 h-7" />}
                        bgColor="bg-emerald-50"
                        gradient="from-emerald-500 to-teal-600"
                        shadow="shadow-emerald-500/25"
                    />
                    <SummaryCard
                        title="Total Beras"
                        value={`${summary.totalKg.toLocaleString('id-ID')} Kg`}
                        subtitle={`Periode ${rangeLabel.toLowerCase()}`}
                        icon={<ScaleIcon className="w-7 h-7" />}
                        bgColor="bg-blue-50"
                        gradient="from-blue-500 to-indigo-600"
                        shadow="shadow-blue-500/25"
                    />
                    <SummaryCard
                        title="Sisa Stok"
                        value={`${summary.totalSisaKg.toLocaleString('id-ID')} Kg`}
                        subtitle="Stok tersedia saat ini"
                        icon={<PackageIcon className="w-7 h-7" />}
                        bgColor="bg-orange-50"
                        gradient="from-orange-500 to-amber-600"
                        shadow="shadow-orange-500/25"
                    />
                </div>

                {/* 📋 DATA TABLE */}
                <div className="overflow-hidden bg-white border border-gray-100 shadow-sm rounded-2xl">
                    {/* Table Header */}
                    <div className="p-6 border-b border-gray-100">
                        <div className="flex flex-col gap-4 mb-4 md:flex-row md:items-center md:justify-between">
                            <div className="flex items-start gap-3">
                                {/* Icon Box */}
                                <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 rounded-xl bg-emerald-50">
                                    <ShoppingBagIcon className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Riwayat Transaksi</h2>
                                    <p className="mt-1 text-sm text-gray-600">
                                        Menampilkan <span className="font-bold text-emerald-600">{filteredList.length}</span> data untuk{' '}
                                        <span className="font-semibold">{rangeLabel}</span>
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 px-4 py-2 border border-gray-200 rounded-lg bg-gray-50">
                                <CreditCardIcon className="w-4 h-4 text-gray-500" />
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value as any)}
                                    className="text-sm font-semibold text-gray-700 bg-transparent border-0 cursor-pointer focus:ring-0"
                                >
                                    <option value="ALL">Semua Status Bayar</option>
                                    <option value="LUNAS">Lunas</option>
                                    <option value="SEBAGIAN">DP / Sebagian</option>
                                    <option value="BELUM_LUNAS">Hutang</option>
                                </select>
                            </div>
                        </div>

                        {/* Search Box */}
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Cari pemasok/produk..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all"
                            />
                            <div className="absolute text-gray-400 -translate-y-1/2 left-3 top-1/2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full">
                            <thead>
                            <tr className="bg-white border-b border-gray-100">
                                <th className="px-6 py-4 text-xs font-bold tracking-wider text-left text-gray-500 uppercase">Tanggal</th>
                                <th className="px-6 py-4 text-xs font-bold tracking-wider text-left text-gray-500 uppercase">Produk & Pemasok</th>
                                <th className="px-6 py-4 text-xs font-bold tracking-wider text-right text-gray-500 uppercase">Jumlah</th>
                                <th className="px-6 py-4 text-xs font-bold tracking-wider text-right text-gray-500 uppercase">Harga</th>
                                <th className="px-6 py-4 text-xs font-bold tracking-wider text-right text-gray-500 uppercase">Total</th>
                                <th className="px-6 py-4 text-xs font-bold tracking-wider text-center text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-4 text-xs font-bold tracking-wider text-center text-gray-500 uppercase">Aksi</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                            {currentItems.length > 0 ? (
                                currentItems.map((p) => {
                                    const locked = isLocked(p);
                                    const isCancelled = p.status === 'DIBATALKAN';
                                    const sisaKg = p.sisa_kg ?? 0;

                                    return (
                                        <tr
                                            key={p.id}
                                            className={`group hover:bg-emerald-50/30 transition-colors ${
                                                isCancelled ? 'bg-gray-50 opacity-60' : ''
                                            }`}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-2 transition-colors rounded-lg bg-emerald-50 group-hover:bg-emerald-100">
                                                        <FaCalendarAlt className="w-4 h-4 text-emerald-600" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-900">
                                                            {new Date(p.tgl_pembelian).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            {new Date(p.tgl_pembelian).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-bold text-gray-800">{produkMap.get(p.produk_id) || 'Produk Dihapus'}</p>
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <FaTruck className="w-3 h-3 text-gray-400" />
                                                    <span className="text-xs text-gray-500">{p.nama_pemasok || '-'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="text-sm font-semibold text-gray-900">{p.jumlah_kg.toLocaleString('id-ID')} Kg</div>
                                                <div className="text-xs text-gray-500">
                                                    Sisa: <span className={sisaKg === 0 ? 'text-red-500 font-bold' : 'text-green-600 font-bold'}>{sisaKg.toLocaleString('id-ID')} Kg</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-sm text-right text-gray-600">{formatRupiah(p.harga_per_kg)}</td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="px-2 py-1 text-sm font-bold rounded-lg text-emerald-600 bg-emerald-50">
                                                    {formatRupiah(p.jumlah_kg * p.harga_per_kg)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">{renderPaymentBadge(p.status_pembayaran, p.nilai_terbayar)}</td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button onClick={() => !isCancelled && handleViewHistory(p)} disabled={isCancelled} className="p-2 transition-colors text-emerald-600 hover:bg-emerald-50 rounded-xl disabled:opacity-40" title="Lihat Riwayat">
                                                        <FaHistory className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => !isCancelled && !locked && handleEditClick(p)} disabled={locked || isCancelled} className={`p-2 rounded-xl transition-colors ${locked || isCancelled ? 'text-gray-300 cursor-not-allowed' : 'text-emerald-600 hover:bg-emerald-50'}`} title={locked ? 'Tidak bisa edit' : 'Edit'}>
                                                        <FaEdit className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => !isCancelled && !locked && confirmDelete(p)} disabled={locked || isCancelled} className={`p-2 rounded-xl transition-colors ${locked || isCancelled ? 'text-gray-300 cursor-not-allowed' : 'text-red-600 hover:bg-red-50'}`} title="Batalkan">
                                                        <FaTimesCircle className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="flex items-center justify-center w-16 h-16 mb-4 bg-gray-100 rounded-full">
                                                <ShoppingBagIcon className="w-8 h-8 text-gray-400" />
                                            </div>
                                            <h3 className="text-lg font-semibold text-gray-900">Belum ada data pembelian</h3>
                                            <p className="max-w-sm mt-1 text-gray-500">Coba ubah filter periode atau klik tombol "Catat Pembelian" untuk memulai.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            </tbody>
                        </table>
                    </div>

                    {/* Desktop Pagination */}
                    {totalPages > 1 && (
                        <div className="hidden md:block p-6 border-t border-gray-100">
                            <EnhancedPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                        </div>
                    )}

                    {/* Mobile Cards */}
                    <div className="block md:hidden p-4 space-y-3">
                        {currentItems.length === 0 ? (
                            <div className="py-12 text-center">
                                <ShoppingBagIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                <p className="text-gray-500 font-medium">Belum ada data pembelian</p>
                                <p className="text-xs text-gray-400 mt-1">Coba ubah filter periode</p>
                            </div>
                        ) : (
                            currentItems.map((p) => {
                                const locked = isLocked(p);
                                const isCancelled = p.status === 'DIBATALKAN';
                                const sisaKg = p.sisa_kg ?? 0;
                                return (
                                    <div key={p.id} className={`rounded-2xl border overflow-hidden shadow-sm ${isCancelled ? 'opacity-60 border-gray-200' : 'border-emerald-100'}`}>
                                        {/* Card Header */}
                                        <div className="px-4 py-3 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-gray-900 truncate">{produkMap.get(p.produk_id) || 'Produk Dihapus'}</p>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <FaTruck className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                                        <span className="text-xs text-gray-500 truncate">{p.nama_pemasok || '-'}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <div className="text-xs text-gray-500">Total</div>
                                                    <div className="text-base font-extrabold text-emerald-600">{formatRupiah(p.jumlah_kg * p.harga_per_kg)}</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Card Body */}
                                        <div className="px-4 py-3 bg-white">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                                    <FaCalendarAlt className="w-3 h-3" />
                                                    {new Date(p.tgl_pembelian).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </div>
                                                {renderPaymentBadge(p.status_pembayaran, p.nilai_terbayar)}
                                            </div>

                                            <div className="grid grid-cols-3 gap-2 p-3 bg-gray-50 rounded-xl text-center mb-3">
                                                <div>
                                                    <div className="text-base font-bold text-gray-900">{p.jumlah_kg.toLocaleString()}</div>
                                                    <div className="text-xs text-gray-500">Total Kg</div>
                                                </div>
                                                <div>
                                                    <div className={`text-base font-bold ${sisaKg === 0 ? 'text-red-500' : 'text-emerald-600'}`}>{sisaKg.toLocaleString()}</div>
                                                    <div className="text-xs text-gray-500">Sisa Kg</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold text-gray-700">{formatRupiah(p.harga_per_kg)}</div>
                                                    <div className="text-xs text-gray-500">Per Kg</div>
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => !isCancelled && handleViewHistory(p)}
                                                    disabled={isCancelled}
                                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-emerald-600 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                                >
                                                    <FaHistory className="w-3.5 h-3.5" /> Riwayat
                                                </button>
                                                <button
                                                    onClick={() => !locked && !isCancelled && handleEditClick(p)}
                                                    disabled={locked || isCancelled}
                                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-xl transition-colors ${locked || isCancelled ? 'text-gray-400 bg-gray-100 cursor-not-allowed' : 'text-blue-600 bg-blue-50 hover:bg-blue-100'}`}
                                                >
                                                    <FaEdit className="w-3.5 h-3.5" /> Edit
                                                </button>
                                                <button
                                                    onClick={() => !locked && !isCancelled && confirmDelete(p)}
                                                    disabled={locked || isCancelled}
                                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-xl transition-colors ${locked || isCancelled ? 'text-gray-400 bg-gray-100 cursor-not-allowed' : 'text-red-600 bg-red-50 hover:bg-red-100'}`}
                                                >
                                                    <FaTimesCircle className="w-3.5 h-3.5" /> Batalkan
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}

                        {/* Mobile Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                    ← Sebelumnya
                                </button>
                                <span className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border-2 border-gray-200 rounded-xl">
                                    {currentPage} / {totalPages}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                    Berikutnya →
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ================ MODALS ================ */}

            {/* 🎨 FORM MODAL - 3-STEP WIZARD */}
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
                        <div className="flex items-center justify-center min-h-full p-4">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-2xl overflow-hidden transition-all transform bg-white border shadow-2xl rounded-3xl border-emerald-100">
                                    {/* Modal Header */}
                                    <div className="relative px-6 pt-4 pb-3 bg-gradient-to-r from-emerald-600 to-teal-600">
                                        <Dialog.Title className="flex items-center gap-3 text-lg font-bold text-white sm:text-xl">
                                            <div className="p-2 bg-white/20 rounded-xl">
                                                <FaTruck className="w-5 h-5" />
                                            </div>
                                            {isEditing ? 'Edit Pembelian Beras' : 'Catat Pembelian Beras Baru'}
                                        </Dialog.Title>
                                        <p className="max-w-md mt-1 text-xs text-emerald-100">
                                            Pembelian beras jadi untuk dijual kembali (Trading).
                                        </p>

                                        {/* Stepper Visual */}
                                        <div className="flex items-center gap-4 mt-4 text-xs text-emerald-100">
                                            {[1, 2, 3].map((s) => (
                                                <div key={s} className="flex items-center">
                                                    <div
                                                        className={`flex items-center justify-center w-7 h-7 rounded-full border text-[11px] font-semibold ${
                                                            step === s
                                                                ? 'bg-white text-emerald-600 border-white'
                                                                : step > s
                                                                    ? 'bg-emerald-400 text-white border-emerald-400'
                                                                    : 'bg-white/10 text-emerald-100 border-white/30'
                                                        }`}
                                                    >
                                                        {step > s ? '✓' : s}
                                                    </div>
                                                    <span className={`ml-2 font-medium ${step === s ? 'text-white' : 'text-emerald-100'}`}>
                                                        {s === 1 ? 'Pilih Produk' : s === 2 ? 'Jumlah & Harga' : 'Pembayaran'}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>

                                        <button
                                            onClick={handleCloseModal}
                                            className="absolute p-2 transition-colors rounded-lg top-4 right-4 text-white/80 hover:text-white hover:bg-white/20"
                                        >
                                            <XMarkIcon className="w-5 h-5" />
                                        </button>
                                    </div>

                                    {/* Modal Body - Form */}
                                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                                        {/* STEP 1: Product Selection */}
                                        {step === 1 && (
                                            <div className="p-5 space-y-4 duration-300 border bg-slate-50/80 border-slate-200 rounded-2xl animate-in fade-in">
                                                <div className="flex items-center justify-between mb-1">
                                                    <p className="text-sm font-semibold text-slate-800">Detail Produk & Supplier</p>
                                                    <span className="text-[11px] font-semibold text-emerald-600">Langkah 1 dari 3</span>
                                                </div>
                                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                            Produk (Beras Jadi) <span className="text-red-500">*</span>
                                                        </label>
                                                        <select
                                                            value={produkId}
                                                            onChange={(e) => setProdukId(e.target.value)}
                                                            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-colors"
                                                            required
                                                        >
                                                            <option value="" disabled>Pilih Produk</option>
                                                            {produkList.map((p) => (
                                                                <option key={p.id} value={p.id}>{p.nama_produk}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">Nama Pemasok</label>
                                                        <input
                                                            type="text"
                                                            value={namaPemasok}
                                                            onChange={(e) => setNamaPemasok(e.target.value)}
                                                            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-colors"
                                                            placeholder="Contoh: UD. Tani Jaya"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* STEP 2: Quantity & Price */}
                                        {step === 2 && (
                                            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,3fr)_minmax(0,2.2fr)] gap-4 animate-in fade-in duration-300">
                                                <div className="p-5 space-y-4 border bg-slate-50/80 border-slate-200 rounded-2xl">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <p className="text-sm font-semibold text-slate-800">Kuantitas & Harga</p>
                                                        <span className="text-[11px] font-semibold text-emerald-600">Langkah 2 dari 3</span>
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                        <div>
                                                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                                Jumlah (Kg) <span className="text-red-500">*</span>
                                                            </label>
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                min={0}
                                                                value={jumlahKg}
                                                                onChange={(e) => setJumlahKg(e.target.value)}
                                                                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                                                                placeholder="0.00"
                                                                required
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                                Harga/Kg (Rp) <span className="text-red-500">*</span>
                                                            </label>
                                                            <input
                                                                type="number"
                                                                min={0}
                                                                value={hargaPerKg}
                                                                onChange={(e) => setHargaPerKg(e.target.value)}
                                                                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                                                                placeholder="0"
                                                                required
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Summary Box */}
                                                <div className="p-5 bg-white border shadow-sm border-emerald-100 rounded-2xl">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <p className="text-sm font-semibold text-emerald-900">Ringkasan</p>
                                                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600">
                                                            <CurrencyDollarIcon className="w-5 h-5" />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1 text-sm text-gray-700">
                                                        <div className="flex justify-between">
                                                            <dt>Produk</dt>
                                                            <dd className="font-semibold">{produkMap.get(parseInt(produkId || '0')) || '-'}</dd>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <dt>Jumlah</dt>
                                                            <dd className="font-semibold">{jumlahKg ? `${jumlahKg} Kg` : '0 Kg'}</dd>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <dt>Harga/Kg</dt>
                                                            <dd className="font-semibold">{hargaPerKg ? formatRupiah(parseFloat(hargaPerKg)) : 'Rp 0'}</dd>
                                                        </div>
                                                    </div>
                                                    <hr className="my-3 border-emerald-100" />
                                                    <div className="flex items-baseline justify-between">
                                                        <span className="text-xs font-semibold text-gray-500">Total</span>
                                                        <span className="text-2xl font-extrabold text-emerald-700">{formatRupiah(calculateTotal())}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* STEP 3: Payment */}
                                        {step === 3 && (
                                            <div className="p-5 space-y-4 duration-300 border bg-emerald-50 border-emerald-200 rounded-2xl animate-in fade-in">
                                                <div className="flex items-center justify-between gap-3 mb-1">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex items-center justify-center w-8 h-8 bg-white rounded-full">
                                                            <CreditCardIcon className="w-4 h-4 text-emerald-600" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-semibold text-emerald-900">Detail Pembayaran</p>
                                                            <p className="text-xs text-emerald-700">Atur status dan akun kas.</p>
                                                        </div>
                                                    </div>
                                                    <span className="text-[11px] font-semibold text-emerald-700">Langkah 3 dari 3</span>
                                                </div>

                                                <div className="space-y-2">
                                                    <p className="block text-xs font-semibold text-gray-700">Status Pembayaran</p>
                                                    <div className="inline-flex p-1 bg-white rounded-full shadow-sm">
                                                        {[
                                                            { id: 'BELUM_LUNAS', label: 'Hutang' },
                                                            { id: 'SEBAGIAN', label: 'DP / Sebagian' },
                                                            { id: 'LUNAS', label: 'Lunas' }
                                                        ].map((opt) => (
                                                            <button
                                                                key={opt.id}
                                                                type="button"
                                                                onClick={() => setStatusPembayaran(opt.id as any)}
                                                                className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all ${
                                                                    statusPembayaran === opt.id
                                                                        ? 'bg-emerald-600 text-white shadow-sm'
                                                                        : 'text-gray-600 hover:bg-emerald-50'
                                                                }`}
                                                            >
                                                                {opt.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {statusPembayaran === 'SEBAGIAN' && (
                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">Jumlah DP (Rp)</label>
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            value={nilaiTerbayar}
                                                            onChange={(e) => setNilaiTerbayar(e.target.value)}
                                                            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-emerald-500"
                                                            required
                                                        />
                                                        <p className="mt-1 text-[11px] text-gray-500">Total tagihan: {formatRupiah(calculateTotal())}</p>
                                                    </div>
                                                )}

                                                {(statusPembayaran === 'SEBAGIAN' || statusPembayaran === 'LUNAS') && (
                                                    <div className="mt-1">
                                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">Bayar dari Akun Kas</label>
                                                        <select
                                                            value={akunKasId}
                                                            onChange={(e) => setAkunKasId(e.target.value)}
                                                            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-emerald-500"
                                                            required
                                                        >
                                                            <option value="" disabled>Pilih Akun Kas</option>
                                                            {akunKasList.map((a) => (
                                                                <option key={a.id} value={a.id}>
                                                                    {a.nama_akun} ({formatRupiah(a.saldo)})
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Modal Footer - Action Buttons */}
                                        <div className="flex flex-col justify-between gap-3 pt-2 sm:flex-row">
                                            <button
                                                type="button"
                                                onClick={handleCloseModal}
                                                className="rounded-xl border-2 border-gray-300 bg-white py-2.5 px-5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                                            >
                                                Batal
                                            </button>

                                            <div className="flex justify-end gap-3">
                                                {step > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={prevStep}
                                                        className="flex items-center gap-2 rounded-xl border-2 border-gray-300 bg-white py-2.5 px-5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                                                    >
                                                        <FaChevronLeft className="w-3 h-3" /> Kembali
                                                    </button>
                                                )}

                                                {step < 3 ? (
                                                    <button
                                                        type="submit"
                                                        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-2.5 px-6 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 hover:from-emerald-700 hover:to-teal-700 transition-all"
                                                    >
                                                        Lanjut <FaChevronRight className="w-3 h-3" />
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="submit"
                                                        disabled={isSubmitting}
                                                        className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-2.5 px-6 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 transition-all"
                                                    >
                                                        {isSubmitting ? 'Menyimpan...' : 'Simpan Pembelian'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </form>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            {/* 🎨 DELETE CONFIRMATION MODAL */}
            {deleteItem && (
                <Transition appear show={true} as={Fragment}>
                    <Dialog as="div" className="relative z-50" onClose={() => setDeleteItem(null)}>
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
                            <div className="flex items-center justify-center min-h-full p-4">
                                <Transition.Child
                                    as={Fragment}
                                    enter="ease-out duration-300"
                                    enterFrom="opacity-0 scale-95"
                                    enterTo="opacity-100 scale-100"
                                    leave="ease-in duration-200"
                                    leaveFrom="opacity-100 scale-100"
                                    leaveTo="opacity-0 scale-95"
                                >
                                    <Dialog.Panel className="w-full max-w-md overflow-hidden transition-all transform bg-white border shadow-2xl rounded-2xl border-rose-100">
                                        <div className="flex items-center gap-3 px-6 py-4 border-b bg-rose-50 border-rose-100">
                                            <ExclamationTriangleIcon className="w-6 h-6 text-rose-600" />
                                            <Dialog.Title className="text-lg font-bold text-rose-700">Konfirmasi Pembatalan</Dialog.Title>
                                        </div>
                                        <div className="p-6">
                                            <p className="mb-2 text-gray-700">Anda yakin ingin membatalkan pembelian ini?</p>
                                            <p className="p-3 text-xs text-gray-500 border border-gray-200 rounded-lg bg-gray-50">
                                                ⚠️ Stok akan dikembalikan (dikurangi), dan dana pembayaran akan di-refund ke akun kas terkait.
                                            </p>
                                            <div className="flex gap-3 mt-6">
                                                <button
                                                    type="button"
                                                    className="flex-1 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50"
                                                    onClick={() => setDeleteItem(null)}
                                                >
                                                    Tutup
                                                </button>
                                                <button
                                                    type="button"
                                                    className="flex-1 px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-sm bg-rose-600 hover:bg-rose-700"
                                                    onClick={handleDelete}
                                                >
                                                    Ya, Batalkan
                                                </button>
                                            </div>
                                        </div>
                                    </Dialog.Panel>
                                </Transition.Child>
                            </div>
                        </div>
                    </Dialog>
                </Transition>
            )}

            {/* 🎨 HISTORY MODAL */}
            {isHistoryVisible && (
                <HistoryModal
                    isOpen={isHistoryVisible}
                    onClose={() => setIsHistoryVisible(false)}
                    data={historyData}
                    isLoading={isLoadingHistory}
                    title={`Riwayat Pembelian #${historyItem?.id}`}
                />
            )}
        </div>
    );
};

export default PembelianBerasPage;