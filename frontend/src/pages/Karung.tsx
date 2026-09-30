import React, { useState, useEffect, useCallback, Fragment, useMemo } from 'react';
import * as api from '../services/api';
import { BatchKarung, Produk, LogKarung, InputPembelianKarung, AkunKas } from '../types';
import { Dialog, Transition } from '@headlessui/react';
import {
    FaEdit,
    FaHistory,
    FaPlus,
    FaBox,
    FaCalendarAlt,
    FaTrashAlt,
    FaMoneyBillWave,
    FaTruck
} from 'react-icons/fa';
import {
    XMarkIcon,
    CurrencyDollarIcon,
    HashtagIcon,
    ExclamationTriangleIcon,
    CalendarDaysIcon,
    MagnifyingGlassIcon,
    CreditCardIcon
} from '@heroicons/react/24/solid';
import { ArchiveBoxIcon } from '@heroicons/react/24/outline';
import Pagination from '../components/Pagination';

/* ======================================================================== *
 * Utilities & Types
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

type FilterMode = 'HARI_INI' | 'MINGGU_INI' | 'BULAN_INI' | 'KUSTOM';

interface ExtBatchKarung extends BatchKarung {
    status?: 'AKTIF' | 'DIBATALKAN' | string;
    status_pembayaran?: 'LUNAS' | 'SEBAGIAN' | 'BELUM_LUNAS';
    nilai_terbayar?: number;
    akun_kas_id?: number;
}

/* ======================================================================== *
 * Sub-Components
 * ======================================================================== */

const SummaryCard: React.FC<{
    title: string;
    value: string;
    subtitle?: string;
    icon: React.ReactNode;
    bgColor?: string;
    gradient?: string;
    shadow?: string;
}> = ({ title, value, subtitle, icon, bgColor = 'bg-orange-50', gradient = 'from-orange-500 to-amber-600', shadow = 'shadow-orange-500/25' }) => (
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

const FilterTabs: React.FC<{
    activeTab: FilterMode;
    onTabChange: (id: FilterMode) => void;
    dateFrom: string;
    dateTo: string;
    onDateFromChange: (v: string) => void;
    onDateToChange: (v: string) => void;
}> = ({ activeTab, onTabChange, dateFrom, dateTo, onDateFromChange, onDateToChange }) => {
    const tabs = [
        { id: 'HARI_INI', label: 'Hari Ini' },
        { id: 'MINGGU_INI', label: 'Minggu Ini' },
        { id: 'BULAN_INI', label: 'Bulan Ini' },
        { id: 'KUSTOM', label: 'Kustom' },
    ] as const;

    return (
        <div className="p-4 mb-6 bg-white border border-orange-100 shadow-sm rounded-2xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap gap-2">
                    {tabs.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => onTabChange(t.id)}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                                activeTab === t.id
                                    ? 'bg-orange-500 text-white shadow-sm'
                                    : 'bg-gray-100 text-gray-600 hover:bg-orange-50 hover:text-orange-600'
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {activeTab === 'KUSTOM' && (
                    <div className="flex flex-col items-center gap-2 px-3 py-2 sm:flex-row bg-gray-50 rounded-xl">
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => onDateFromChange(e.target.value)}
                            className="text-sm border-0 bg-white px-3 py-1.5 rounded-lg focus:ring-2 focus:ring-orange-200"
                        />
                        <span className="text-gray-400">→</span>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => onDateToChange(e.target.value)}
                            className="text-sm border-0 bg-white px-3 py-1.5 rounded-lg focus:ring-2 focus:ring-orange-200"
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

/* ======================================================================== *
 * Main Component
 * ======================================================================== */

const KarungPage: React.FC = () => {
    // Data
    const [karungList, setKarungList] = useState<ExtBatchKarung[]>([]);
    const [produkForForm, setProdukForForm] = useState<Produk[]>([]);
    const [akunKasList, setAkunKasList] = useState<AkunKas[]>([]);

    // Filter
    const [filterMode, setFilterMode] = useState<FilterMode>('BULAN_INI');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'LUNAS' | 'SEBAGIAN' | 'BELUM_LUNAS'>('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // UI State
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    // History Modal
    const [isHistoryVisible, setIsHistoryVisible] = useState(false);
    const [historyData, setHistoryData] = useState<LogKarung[]>([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [selectedBatch, setSelectedBatch] = useState<ExtBatchKarung | null>(null);

    // Form Wizard State
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [produkId, setProdukId] = useState('');
    const [namaPemasok, setNamaPemasok] = useState('');
    const [jumlah, setJumlah] = useState('');
    const [hargaSatuan, setHargaSatuan] = useState('');
    const [statusPembayaran, setStatusPembayaran] = useState<'LUNAS' | 'SEBAGIAN' | 'BELUM_LUNAS'>('BELUM_LUNAS');
    const [nilaiTerbayar, setNilaiTerbayar] = useState('');
    const [akunKasId, setAkunKasId] = useState('');

    /* ========================== Helpers & Computations ========================== */

    // Date Range Calculation
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

    // Filtering Data
    const filteredList = useMemo(() => {
        return karungList.filter((item) => {
            const d = new Date(item.tgl_pembelian);
            const inDate = d >= startDate && d <= endDate;

            const statusMatch = statusFilter === 'ALL' || (item.status_pembayaran || 'BELUM_LUNAS') === statusFilter;

            const q = searchQuery.toLowerCase();
            const searchMatch = !q ||
                item.produk?.nama_produk.toLowerCase().includes(q) ||
                item.nama_pemasok?.toLowerCase().includes(q);

            // Filter out cancelled unless specifically looking for them (optional logic)
            const notCancelled = (item.status || 'AKTIF') !== 'DIBATALKAN';

            return inDate && statusMatch && searchMatch && notCancelled;
        });
    }, [karungList, startDate, endDate, statusFilter, searchQuery]);

    // Summary Calculation
    const summary = useMemo(() => {
        return filteredList.reduce((acc, item) => {
            const total = item.total_harga || (item.jumlah * item.harga_satuan);
            acc.totalBelanja += total;
            acc.totalPcs += item.jumlah;
            acc.totalSisa += item.sisa;
            return acc;
        }, { totalBelanja: 0, totalPcs: 0, totalSisa: 0 });
    }, [filteredList]);

    // Pagination
    const totalPages = Math.ceil(filteredList.length / itemsPerPage);
    const currentItems = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredList.slice(start, start + itemsPerPage);
    }, [filteredList, currentPage]);

    // Helpers for Form
    const totalHargaForm = useMemo(() => {
        const j = parseFloat(jumlah) || 0;
        const h = parseFloat(hargaSatuan) || 0;
        return j * h;
    }, [jumlah, hargaSatuan]);

    const isLocked = (item: ExtBatchKarung) => {
        return item.is_terpakai || item.sisa !== item.jumlah;
    };

    /* ========================== Data Fetching ========================== */

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true);
            const [karungData, produkData, akunData] = await Promise.all([
                api.getAllKarung(),
                api.getAllProduk(),
                api.getAllAkunKas()
            ]);

            // Sort by date desc
            const sortedKarung = (Array.isArray(karungData) ? karungData : []).sort(
                (a, b) => new Date(b.tgl_pembelian).getTime() - new Date(a.tgl_pembelian).getTime()
            ) as ExtBatchKarung[];

            setKarungList(sortedKarung);

            const prods = Array.isArray(produkData) ? produkData : [];
            setProdukForForm(prods.filter(p => p.tipe_produk === 'KEMASAN'));

            setAkunKasList(Array.isArray(akunData) ? akunData.filter(a => a.is_active) : []);

        } catch (err: any) {
            showToast(err.message || 'Gagal memuat data', 'error');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        setCurrentPage(1);
    }, [fetchData]);

    const fetchHistory = async (id: number) => {
        try {
            setIsHistoryLoading(true);
            const data = await api.getKarungHistory(id);
            setHistoryData(data);
        } catch (err: any) {
            showToast('Gagal memuat history', 'error');
        } finally {
            setIsHistoryLoading(false);
        }
    };

    /* ========================== Handlers ========================== */

    const resetForm = () => {
        setProdukId('');
        setNamaPemasok('');
        setJumlah('');
        setHargaSatuan('');
        setStatusPembayaran('BELUM_LUNAS');
        setNilaiTerbayar('');
        setAkunKasId(akunKasList[0]?.id.toString() || '');
        setStep(1);
        setIsEditing(false);
        setEditId(null);
    };

    const handleOpenForm = () => {
        resetForm();
        setIsFormVisible(true);
    };

    // 👇 TAMBAHKAN FUNGSI INI 👇
    const handleCloseModal = () => {
        resetForm();
        setIsFormVisible(false);
    };

    const handleEditClick = (item: ExtBatchKarung) => {
        setEditId(item.id);
        setProdukId(item.produk_id.toString());
        setNamaPemasok(item.nama_pemasok);
        setJumlah(item.jumlah.toString());
        setHargaSatuan(item.harga_satuan.toString());
        setStatusPembayaran(item.status_pembayaran || 'BELUM_LUNAS');
        setNilaiTerbayar((item.nilai_terbayar || '').toString());
        setAkunKasId(item.akun_kas_id ? item.akun_kas_id.toString() : '');

        setIsEditing(true);
        setStep(1); // Start form from beginning but prefilled
        setIsFormVisible(true);
    };

    const nextStep = () => {
        if (step === 1) {
            if (!produkId) return showToast('Pilih jenis karung dulu', 'error');
        }
        if (step === 2) {
            if (!jumlah || !hargaSatuan) return showToast('Lengkapi jumlah dan harga', 'error');
        }
        setStep(s => s < 3 ? (s + 1) as 1|2|3 : s);
    };

    const prevStep = () => setStep(s => s > 1 ? (s - 1) as 1|2|3 : s);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Final Validation logic (similar to PembelianBeras)
        if (step < 3) {
            nextStep();
            return;
        }

        const total = totalHargaForm;
        const bayar = parseFloat(nilaiTerbayar || '0');

        if ((statusPembayaran === 'SEBAGIAN' || statusPembayaran === 'LUNAS') && !akunKasId) {
            showToast('Pilih akun kas untuk pembayaran', 'error');
            return;
        }

        if (statusPembayaran === 'SEBAGIAN' && (bayar <= 0 || bayar >= total)) {
            showToast('DP harus lebih dari 0 dan kurang dari total harga', 'error');
            return;
        }

        setIsSubmitting(true);

        // Calculate nilai_terbayar based on status
        let nilaiYangTerbayar = 0;
        if (statusPembayaran === 'LUNAS') {
            nilaiYangTerbayar = total;
        } else if (statusPembayaran === 'SEBAGIAN') {
            nilaiYangTerbayar = parseFloat(nilaiTerbayar) || 0;
        }
        // BELUM_LUNAS = 0

        // Build payload with status pembayaran
        const payload: any = {
            produk_id: parseInt(produkId),
            nama_pemasok: namaPemasok,
            jumlah: parseInt(jumlah),
            harga_satuan: parseFloat(hargaSatuan),
            status_pembayaran: statusPembayaran,
            nilai_terbayar: nilaiYangTerbayar
        };
        
        // Only include akun_kas_id if payment is made (not hutang)
        if (statusPembayaran !== 'BELUM_LUNAS' && akunKasId) {
            payload.akun_kas_id = parseInt(akunKasId);
        }

        try {
            if (isEditing && editId) {
                await api.updateKarung(editId, payload);
                showToast('Data berhasil diperbarui!', 'success');
            } else {
                await api.createKarung(payload);
                showToast('Pembelian karung berhasil dicatat!', 'success');
            }
            setIsFormVisible(false);
            fetchData();
        } catch (err: any) {
            showToast(err.message || 'Gagal menyimpan data', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        setIsSubmitting(true);
        try {
            await api.deleteKarung(deleteId);
            showToast('Pembelian berhasil dibatalkan', 'success');
            setDeleteId(null);
            fetchData();
        } catch (err: any) {
            showToast(err.message || 'Gagal membatalkan', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    /* ========================== Render Helpers ========================== */

    const renderPaymentBadge = (status?: string) => {
        switch (status) {
            case 'LUNAS': return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"/>Lunas</span>;
            case 'SEBAGIAN': return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500"/>DP / Sebagian</span>;
            default: return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"/>Hutang</span>;
        }
    };

    if (isLoading) return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="w-12 h-12 border-b-2 border-orange-500 rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="min-h-screen p-4 bg-gray-50 sm:p-6">
            <div className="mx-auto space-y-6 max-w-7xl">

                {/* --- HERO HEADER --- */}
                <div className="relative px-6 py-6 overflow-hidden text-white shadow-lg bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 rounded-2xl">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <ArchiveBoxIcon className="w-32 h-32" />
                    </div>
                    <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 mb-2 text-xs font-medium border rounded-full bg-white/20 backdrop-blur-sm border-white/10">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                Manajemen Logistik
                            </div>
                            <h1 className="text-3xl font-bold tracking-tight">Stok & Pembelian Karung</h1>
                            <p className="max-w-lg mt-1 text-sm text-orange-100">
                                Pantau ketersediaan kemasan, catat pembelian baru, dan kelola pembayaran supplier.
                            </p>
                        </div>
                        <button
                            onClick={handleOpenForm}
                            className="group flex items-center gap-2 px-5 py-3 bg-white text-orange-600 rounded-xl font-bold shadow-lg hover:shadow-xl hover:bg-orange-50 transition-all transform hover:-translate-y-0.5"
                        >
                            <FaPlus className="transition-transform duration-300 group-hover:rotate-90" />
                            Catat Pembelian
                        </button>
                    </div>
                </div>

                {/* --- FILTER TABS --- */}
                <FilterTabs
                    activeTab={filterMode}
                    onTabChange={setFilterMode}
                    dateFrom={customStart}
                    dateTo={customEnd}
                    onDateFromChange={setCustomStart}
                    onDateToChange={setCustomEnd}
                />

                {/* --- SUMMARY CARDS --- */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    <SummaryCard
                        title="Total Belanja"
                        value={formatRupiah(summary.totalBelanja)}
                        subtitle={`Periode ${rangeLabel.toLowerCase()}`}
                        icon={<CurrencyDollarIcon className="w-7 h-7" />}
                        bgColor="bg-orange-50"
                        gradient="from-orange-500 to-amber-600"
                        shadow="shadow-orange-500/25"
                    />
                    <SummaryCard
                        title="Total Karung Masuk"
                        value={`${summary.totalPcs.toLocaleString('id-ID')} Pcs`}
                        subtitle={`Periode ${rangeLabel.toLowerCase()}`}
                        icon={<FaBox className="w-7 h-7" />}
                        bgColor="bg-blue-50"
                        gradient="from-blue-500 to-indigo-600"
                        shadow="shadow-blue-500/25"
                    />
                    <SummaryCard
                        title="Sisa Stok Karung"
                        value={`${summary.totalSisa.toLocaleString('id-ID')} Pcs`}
                        subtitle="Stok tersedia saat ini"
                        icon={<HashtagIcon className="w-7 h-7" />}
                        bgColor="bg-emerald-50"
                        gradient="from-emerald-500 to-teal-600"
                        shadow="shadow-emerald-500/25"
                    />
                </div>

                {/* --- DATA TABLE --- */}
                <div className="overflow-hidden bg-white border border-gray-200 shadow-sm rounded-2xl">
                    {/* Table Header */}
                    <div className="p-6 border-b border-gray-100">
                        <div className="flex flex-col gap-4 mb-4 md:flex-row md:items-center md:justify-between">
                            <div className="flex items-start gap-3">
                                {/* Icon Box */}
                                <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 rounded-xl bg-orange-50">
                                    <FaHistory className="w-5 h-5 text-orange-600" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Riwayat Transaksi</h2>
                                    <p className="mt-1 text-sm text-gray-600">
                                        Menampilkan <span className="font-bold text-orange-600">{filteredList.length}</span> data untuk{' '}
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
                                placeholder="Cari supplier/produk..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-all"
                            />
                            <div className="absolute text-gray-400 -translate-y-1/2 left-3 top-1/2">
                                <MagnifyingGlassIcon className="w-4 h-4" />
                            </div>
                        </div>
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="text-xs font-semibold tracking-wider text-gray-600 uppercase bg-gray-50/80">
                            <tr>
                                <th className="px-6 py-4 text-left">Tanggal</th>
                                <th className="px-6 py-4 text-left">Produk & Supplier</th>
                                <th className="px-6 py-4 text-right">Jumlah</th>
                                <th className="px-6 py-4 text-right">Harga</th>
                                <th className="px-6 py-4 text-right">Total</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="sticky right-0 z-10 px-6 py-4 text-center bg-gray-50">Aksi</th>
                            </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                            {currentItems.length > 0 ? (
                                currentItems.map((item) => {
                                    const locked = isLocked(item);
                                    return (
                                        <tr key={item.id} className="transition-colors hover:bg-orange-50/30 group">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 text-gray-500 transition-all bg-gray-100 rounded-lg group-hover:bg-white group-hover:shadow-sm group-hover:text-orange-600">
                                                        <CalendarDaysIcon className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">
                                                            {new Date(item.tgl_pembelian).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            {new Date(item.tgl_pembelian).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-bold text-gray-800">{item.produk.nama_produk}</p>
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <FaTruck className="w-3 h-3 text-gray-400" />
                                                    <span className="text-xs text-gray-500">{item.nama_pemasok || '-'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="text-sm font-semibold text-gray-900">{item.jumlah.toLocaleString('id-ID')}</div>
                                                <div className="text-xs text-gray-500">Sisa: <span className={item.sisa === 0 ? 'text-red-500 font-bold' : 'text-green-600 font-bold'}>{item.sisa}</span></div>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-sm text-right text-gray-600">
                                                {formatRupiah(item.harga_satuan)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                    <span className="px-2 py-1 text-sm font-bold text-orange-600 rounded-lg bg-orange-50">
                                                        {formatRupiah(item.total_harga)}
                                                    </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {renderPaymentBadge(item.status_pembayaran)}
                                            </td>
                                            <td className="sticky right-0 z-10 px-6 py-4 text-center bg-white group-hover:bg-orange-50/30">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedBatch(item);
                                                            setIsHistoryVisible(true);
                                                            fetchHistory(item.id);
                                                        }}
                                                        className="p-2 text-blue-600 transition-colors hover:bg-blue-50 rounded-xl"
                                                        title="Log Penggunaan"
                                                    >
                                                        <FaHistory />
                                                    </button>
                                                    <button
                                                        onClick={() => handleEditClick(item)}
                                                        disabled={locked}
                                                        className={`p-2 rounded-xl transition-colors ${
                                                            locked ? 'text-gray-300 cursor-not-allowed' : 'text-orange-600 hover:bg-orange-50'
                                                        }`}
                                                        title="Edit"
                                                    >
                                                        <FaEdit />
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteId(item.id)}
                                                        disabled={locked}
                                                        className={`p-2 rounded-xl transition-colors ${
                                                            locked ? 'text-gray-300 cursor-not-allowed' : 'text-red-600 hover:bg-red-50'
                                                        }`}
                                                        title="Hapus"
                                                    >
                                                        <FaTrashAlt />
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
                                                <FaBox className="w-8 h-8 text-gray-400" />
                                            </div>
                                            <h3 className="text-lg font-semibold text-gray-900">Belum ada data pembelian</h3>
                                            <p className="max-w-sm mt-1 text-gray-500">
                                                Coba ubah filter periode atau klik tombol "Catat Pembelian" untuk memulai.
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="block md:hidden p-4 space-y-3">
                        {currentItems.length === 0 ? (
                            <div className="py-12 text-center">
                                <FaBox className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                <p className="text-gray-500 font-medium">Belum ada data pembelian</p>
                                <p className="text-xs text-gray-400 mt-1">Coba ubah filter periode</p>
                            </div>
                        ) : (
                            currentItems.map((item) => {
                                const locked = isLocked(item);
                                return (
                                    <div key={item.id} className="bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden">
                                        {/* Card Header */}
                                        <div className="px-4 py-3 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">{item.produk.nama_produk}</p>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <FaTruck className="w-3 h-3 text-gray-400" />
                                                        <span className="text-xs text-gray-500">{item.nama_pemasok || '-'}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <div className="text-xs text-gray-500">Total</div>
                                                    <div className="text-lg font-extrabold text-orange-600">{formatRupiah(item.total_harga)}</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Card Body */}
                                        <div className="px-4 py-3">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                                    <CalendarDaysIcon className="w-3.5 h-3.5" />
                                                    {new Date(item.tgl_pembelian).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </div>
                                                {renderPaymentBadge(item.status_pembayaran)}
                                            </div>

                                            <div className="grid grid-cols-3 gap-2 p-3 bg-gray-50 rounded-xl text-center">
                                                <div>
                                                    <div className="text-lg font-bold text-gray-900">{item.jumlah.toLocaleString()}</div>
                                                    <div className="text-xs text-gray-500">Total Pcs</div>
                                                </div>
                                                <div>
                                                    <div className={`text-lg font-bold ${item.sisa === 0 ? 'text-red-500' : 'text-emerald-600'}`}>{item.sisa}</div>
                                                    <div className="text-xs text-gray-500">Sisa Pcs</div>
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-gray-700">{formatRupiah(item.harga_satuan)}</div>
                                                    <div className="text-xs text-gray-500">Per Pcs</div>
                                                </div>
                                            </div>

                                            <div className="flex gap-2 mt-3">
                                                <button
                                                    onClick={() => {
                                                        setSelectedBatch(item);
                                                        setIsHistoryVisible(true);
                                                        fetchHistory(item.id);
                                                    }}
                                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
                                                >
                                                    <FaHistory className="w-3.5 h-3.5" /> Riwayat
                                                </button>
                                                <button
                                                    onClick={() => !locked && handleEditClick(item)}
                                                    disabled={locked}
                                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-xl transition-colors ${
                                                        locked ? 'text-gray-400 bg-gray-100 cursor-not-allowed' : 'text-orange-600 bg-orange-50 hover:bg-orange-100'
                                                    }`}
                                                >
                                                    <FaEdit className="w-3.5 h-3.5" /> Edit
                                                </button>
                                                <button
                                                    onClick={() => !locked && setDeleteId(item.id)}
                                                    disabled={locked}
                                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-xl transition-colors ${
                                                        locked ? 'text-gray-400 bg-gray-100 cursor-not-allowed' : 'text-red-600 bg-red-50 hover:bg-red-100'
                                                    }`}
                                                >
                                                    <FaTrashAlt className="w-3.5 h-3.5" /> Hapus
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
                                    className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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
                                    className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                    Berikutnya →
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Desktop Pagination */}
                    <div className="hidden md:block p-4 border-t border-gray-100 bg-gray-50">
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                            showItemsInfo={true}
                            totalItems={filteredList.length}
                            itemsPerPage={itemsPerPage}
                        />
                    </div>
                </div>
            </div>

            {/* ======================= MODALS ======================= */}

            {/* 1. Form Wizard Modal (Create/Edit) */}
            <Transition appear show={isFormVisible} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={handleCloseModal}>
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex items-center justify-center min-h-full p-4">
                            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                                <Dialog.Panel className="w-full max-w-2xl overflow-hidden transition-all transform bg-white border border-orange-100 shadow-2xl rounded-3xl">

                                    {/* Modal Header */}
                                    <div className="relative px-8 py-6 bg-gradient-to-r from-orange-500 to-amber-600">
                                        <Dialog.Title className="flex items-center gap-3 text-xl font-bold text-white">
                                            <div className="p-2 bg-white/20 rounded-xl"><FaBox className="w-5 h-5" /></div>
                                            {isEditing ? 'Edit Data Pembelian' : 'Catat Pembelian Karung'}
                                        </Dialog.Title>
                                        <button onClick={handleCloseModal} className="absolute p-2 transition-colors rounded-lg top-6 right-6 text-white/80 hover:text-white hover:bg-white/20">
                                            <XMarkIcon className="w-5 h-5" />
                                        </button>

                                        {/* Stepper Indicator */}
                                        <div className="flex items-center gap-4 mt-6 text-xs font-medium text-orange-100">
                                            {[1, 2, 3].map(s => (
                                                <div key={s} className={`flex items-center gap-2 ${step >= s ? 'opacity-100' : 'opacity-50'}`}>
                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${step >= s ? 'bg-white text-orange-600' : 'bg-white/20 text-white'}`}>{s}</div>
                                                    <span>{s===1 ? 'Info Produk' : s===2 ? 'Harga & Jumlah' : 'Pembayaran'}</span>
                                                    {s < 3 && <div className="w-8 h-0.5 bg-white/30" />}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Modal Body */}
                                    <form onSubmit={handleSubmit} className="p-8">
                                        {step === 1 && (
                                            <div className="space-y-6 duration-300 animate-in slide-in-from-right">
                                                <div>
                                                    <label className="block mb-2 text-sm font-semibold text-gray-700">Jenis Kemasan</label>
                                                    <div className="relative">
                                                        <select
                                                            value={produkId}
                                                            onChange={e => setProdukId(e.target.value)}
                                                            className="w-full px-4 py-3 text-sm transition-all bg-white border border-gray-300 appearance-none rounded-xl pl-11 focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                                                            disabled={isEditing}
                                                        >
                                                            <option value="" disabled>Pilih Karung/Kemasan...</option>
                                                            {produkForForm.map(p => (
                                                                <option key={p.id} value={p.id}>{p.nama_produk}</option>
                                                            ))}
                                                        </select>
                                                        <FaBox className="absolute text-gray-400 -translate-y-1/2 left-4 top-1/2" />
                                                    </div>
                                                    <p className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                                                        <ExclamationTriangleIcon className="w-3 h-3 text-orange-500" />
                                                        Hanya menampilkan produk dengan tipe 'KEMASAN'
                                                    </p>
                                                </div>

                                                <div>
                                                    <label className="block mb-2 text-sm font-semibold text-gray-700">Supplier / Pemasok</label>
                                                    <div className="relative">
                                                        <input
                                                            type="text"
                                                            value={namaPemasok}
                                                            onChange={e => setNamaPemasok(e.target.value)}
                                                            className="w-full px-4 py-3 text-sm transition-all border border-gray-300 rounded-xl pl-11 focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                                                            placeholder="Contoh: Toko Plastik Jaya"
                                                        />
                                                        <FaTruck className="absolute text-gray-400 -translate-y-1/2 left-4 top-1/2" />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {step === 2 && (
                                            <div className="space-y-6 duration-300 animate-in slide-in-from-right">
                                                <div className="grid grid-cols-2 gap-6">
                                                    <div>
                                                        <label className="block mb-2 text-sm font-semibold text-gray-700">Jumlah (Pcs)</label>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            value={jumlah}
                                                            onChange={e => setJumlah(e.target.value)}
                                                            className="w-full px-4 py-3 text-sm transition-all border border-gray-300 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                                                            placeholder="0"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block mb-2 text-sm font-semibold text-gray-700">Harga Satuan (Rp)</label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={hargaSatuan}
                                                            onChange={e => setHargaSatuan(e.target.value)}
                                                            className="w-full px-4 py-3 text-sm transition-all border border-gray-300 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                                                            placeholder="0"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Live Summary */}
                                                <div className="flex items-center justify-between p-5 border border-orange-100 bg-orange-50 rounded-xl">
                                                    <div>
                                                        <p className="text-xs font-semibold tracking-wider text-orange-600 uppercase">Estimasi Total</p>
                                                        <p className="mt-1 text-sm text-gray-600">
                                                            {Number(jumlah || 0).toLocaleString()} pcs x {formatRupiah(Number(hargaSatuan || 0))}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-2xl font-bold text-gray-900">{formatRupiah(totalHargaForm)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {step === 3 && (
                                            <div className="space-y-6 duration-300 animate-in slide-in-from-right">
                                                <div>
                                                    <label className="block mb-3 text-sm font-semibold text-gray-700">Status Pembayaran</label>
                                                    <div className="grid grid-cols-3 gap-3">
                                                        {['LUNAS', 'SEBAGIAN', 'BELUM_LUNAS'].map((s) => (
                                                            <button
                                                                key={s}
                                                                type="button"
                                                                onClick={() => setStatusPembayaran(s as any)}
                                                                className={`py-3 px-2 rounded-xl text-xs font-bold border transition-all ${
                                                                    statusPembayaran === s
                                                                        ? 'bg-orange-600 text-white border-orange-600 shadow-md'
                                                                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                                                }`}
                                                            >
                                                                {s === 'BELUM_LUNAS' ? 'HUTANG' : s === 'SEBAGIAN' ? 'DP / SEBAGIAN' : s}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {statusPembayaran === 'SEBAGIAN' && (
                                                    <div>
                                                        <label className="block mb-2 text-sm font-semibold text-gray-700">Nominal DP (Rp)</label>
                                                        <input
                                                            type="number"
                                                            value={nilaiTerbayar}
                                                            onChange={e => setNilaiTerbayar(e.target.value)}
                                                            className="w-full px-4 py-3 text-sm transition-all border border-gray-300 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                                                            placeholder="0"
                                                        />
                                                    </div>
                                                )}

                                                {(statusPembayaran !== 'BELUM_LUNAS') && (
                                                    <div>
                                                        <label className="block mb-2 text-sm font-semibold text-gray-700">Sumber Dana (Akun Kas)</label>
                                                        <div className="relative">
                                                            <select
                                                                value={akunKasId}
                                                                onChange={e => setAkunKasId(e.target.value)}
                                                                className="w-full px-4 py-3 text-sm transition-all bg-white border border-gray-300 appearance-none rounded-xl pl-11 focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                                                            >
                                                                {akunKasList.map(a => (
                                                                    <option key={a.id} value={a.id}>{a.nama_akun} (Saldo: {formatRupiah(a.saldo)})</option>
                                                                ))}
                                                            </select>
                                                            <CreditCardIcon className="absolute w-5 h-5 text-gray-400 -translate-y-1/2 left-4 top-1/2" />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Footer Controls */}
                                        <div className="flex items-center justify-between pt-6 mt-8 border-t border-gray-100">
                                            {step > 1 ? (
                                                <button
                                                    type="button"
                                                    onClick={prevStep}
                                                    className="px-6 py-2.5 rounded-xl text-gray-600 font-semibold hover:bg-gray-100 transition-colors"
                                                >
                                                    Kembali
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={handleCloseModal}
                                                    className="px-6 py-2.5 rounded-xl text-gray-600 font-semibold hover:bg-gray-100 transition-colors"
                                                >
                                                    Batal
                                                </button>
                                            )}

                                            <button
                                                type="submit"
                                                disabled={isSubmitting}
                                                className="px-8 py-2.5 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 shadow-lg hover:shadow-orange-500/30 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {isSubmitting ? 'Memproses...' : (step === 3 ? 'Simpan Transaksi' : 'Lanjut')}
                                            </button>
                                        </div>
                                    </form>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            {/* 2. Delete Confirmation Modal */}
            <Transition appear show={!!deleteId} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setDeleteId(null)}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
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
                                <Dialog.Panel className="w-full max-w-md overflow-hidden transition-all transform bg-white border border-red-100 shadow-2xl rounded-2xl">
                                    <div className="p-6 text-center border-b border-red-100 bg-red-50">
                                        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full">
                                            <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
                                        </div>
                                        <Dialog.Title className="text-xl font-bold text-red-700">
                                            Konfirmasi Pembatalan
                                        </Dialog.Title>
                                    </div>
                                    <div className="p-6">
                                        <p className="mb-6 leading-relaxed text-center text-gray-600">
                                            Apakah Anda yakin ingin membatalkan transaksi ini? <br/>
                                            <span className="inline-block px-2 py-1 mt-2 text-xs font-medium text-red-600 rounded bg-red-50">
                                                ⚠️ Stok akan dikurangi & Uang akan dikembalikan ke Kas
                                            </span>
                                        </p>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => setDeleteId(null)}
                                                className="flex-1 px-4 py-3 font-semibold text-gray-700 transition-colors bg-gray-100 rounded-xl hover:bg-gray-200"
                                            >
                                                Batal
                                            </button>
                                            <button
                                                onClick={handleDelete}
                                                disabled={isSubmitting}
                                                className="flex-1 px-4 py-3 font-semibold text-white transition-all bg-red-600 shadow-lg rounded-xl hover:bg-red-700 shadow-red-200"
                                            >
                                                {isSubmitting ? 'Memproses...' : 'Ya, Batalkan'}
                                            </button>
                                        </div>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            {/* 3. History Modal */}
            <Transition appear show={isHistoryVisible} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setIsHistoryVisible(false)}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
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
                                <Dialog.Panel className="w-full max-w-3xl overflow-hidden transition-all transform bg-white border border-blue-100 shadow-2xl rounded-2xl">
                                    <div className="relative px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600">
                                        <Dialog.Title className="flex items-center gap-3 text-lg font-bold text-white">
                                            <div className="p-2 rounded-lg bg-white/20"><FaHistory className="w-4 h-4" /></div>
                                            Riwayat Penggunaan Batch #{selectedBatch?.id}
                                        </Dialog.Title>
                                        <button onClick={() => setIsHistoryVisible(false)} className="absolute p-2 rounded-lg top-4 right-4 text-white/80 hover:text-white">
                                            <XMarkIcon className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="p-6 max-h-[60vh] overflow-y-auto">
                                        {isHistoryLoading ? (
                                            <div className="py-8 text-center text-gray-500">Memuat data...</div>
                                        ) : historyData.length === 0 ? (
                                            <div className="py-12 text-center">
                                                <div className="flex items-center justify-center w-16 h-16 mx-auto mb-3 bg-gray-100 rounded-full">
                                                    <ArchiveBoxIcon className="w-8 h-8 text-gray-400" />
                                                </div>
                                                <p className="font-medium text-gray-500">Belum ada riwayat penggunaan</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {historyData.map((log, idx) => (
                                                    <div key={idx} className="flex items-start gap-4 p-4 transition-all border border-gray-100 rounded-xl bg-gray-50 hover:bg-white hover:shadow-md">
                                                        <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 text-xs font-bold text-blue-600 bg-blue-100 rounded-full">
                                                            {new Date(log.timestamp).getDate()}
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-start justify-between">
                                                                <h4 className="text-sm font-bold text-gray-800">{log.deskripsi}</h4>
                                                                <span className="text-xs font-medium text-gray-400">
                                                                    {new Date(log.timestamp).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-4 mt-2 text-sm">
                                                                <span className="text-red-600 font-semibold bg-red-50 px-2 py-0.5 rounded">
                                                                    Keluar: {Math.abs(log.jumlah_digunakan).toLocaleString()} Pcs
                                                                </span>
                                                                <span className="text-gray-500">→</span>
                                                                <span className="text-green-700 font-semibold bg-green-50 px-2 py-0.5 rounded">
                                                                    Sisa: {log.sisa_setelah.toLocaleString()} Pcs
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
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

export default KarungPage;