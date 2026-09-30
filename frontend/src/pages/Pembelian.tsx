import React, {
    useState,
    useEffect,
    useCallback,
    Fragment,
    useMemo,
} from 'react';
import * as api from '../services/api';
import {
    BatchPembelian,
    Produk,
    LogStokProduk,
    LogPembelian,
    AkunKas,
} from '../types';
import { Dialog, Transition } from '@headlessui/react';
import {
    FaEdit,
    FaEye,
    FaCalendarAlt,
    FaTruck,
    FaPlus,
    FaTimesCircle,
} from 'react-icons/fa';
import {
    XMarkIcon,
    CalendarDaysIcon,
    ExclamationTriangleIcon,
} from '@heroicons/react/24/solid';
import {
    CurrencyDollarIcon,
    HashtagIcon,
    ScaleIcon,
} from '@heroicons/react/24/outline';
import { CreditCardIcon } from 'lucide-react';

/* ======================================================================== *
 * Utilities
 * ======================================================================== */

const showToast = (
    message: string,
    type: 'success' | 'error' | 'info' = 'info',
) => {
    (window as any).addToast?.(message, type);
};

const formatRupiah = (n: number) =>
    new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(n);

type FilterMode = 'HARI_INI' | 'MINGGU_INI' | 'BULAN_INI' | 'KUSTOM';

/* ======================================================================== *
 * Pagination
 * ======================================================================== */

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
            if (end - start < maxVisible - 1)
                start = Math.max(1, end - maxVisible + 1);

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
                className="group flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 hover:shadow-md disabled:hover:scale-100"
            >
                <span className="transition-transform group-hover:-translate-x-1">←</span>
                Sebelumnya
            </button>

            <div className="flex items-center gap-1">
                {getPageNumbers().map((page, i) =>
                    typeof page === 'string' ? (
                        <span
                            key={`ellipsis-${i}`}
                            className="px-3 py-2 text-sm text-gray-400"
                        >
                            {page}
                        </span>
                    ) : (
                        <button
                            key={`page-${page}`}
                            type="button"
                            onClick={() => onPageChange(page)}
                            className={`px-4 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 transform hover:scale-110 ${currentPage === page
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-300 scale-110'
                                : 'bg-white text-gray-600 border-2 border-gray-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 hover:shadow-md'
                                }`}
                        >
                            {page}
                        </button>
                    ),
                )}
            </div>

            <button
                type="button"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="group flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 hover:shadow-md disabled:hover:scale-100"
            >
                Berikutnya
                <span className="transition-transform group-hover:translate-x-1">→</span>
            </button>
        </div>
    );
};

/* ======================================================================== *
 * History Modal
 * ======================================================================== */

const HistoryModal = ({
    isOpen,
    onClose,
    data,
    isLoading,
    title,
}: {
    isOpen: boolean;
    onClose: () => void;
    data: (LogStokProduk | LogPembelian)[];
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
                        <Dialog.Panel className="w-full max-w-4xl overflow-hidden transition-all transform bg-white border border-blue-100 shadow-2xl rounded-2xl">
                            <div className="relative px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600">
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
                                        <div className="w-12 h-12 mx-auto mb-4 border-b-2 border-blue-600 rounded-full animate-spin" />
                                        <p className="text-lg font-medium text-gray-700">
                                            Memuat histori...
                                        </p>
                                    </div>
                                ) : data.length > 0 ? (
                                    <div className="overflow-hidden bg-white border border-gray-200 rounded-xl">
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-6 py-4 text-xs font-semibold tracking-wider text-left text-gray-600 uppercase">
                                                            Tanggal & Waktu
                                                        </th>
                                                        <th className="px-6 py-4 text-xs font-semibold tracking-wider text-left text-gray-600 uppercase">
                                                            Tipe
                                                        </th>
                                                        <th className="px-6 py-4 text-xs font-semibold tracking-wider text-right text-gray-600 uppercase">
                                                            Jumlah (Kg)
                                                        </th>
                                                        <th className="px-6 py-4 text-xs font-semibold tracking-wider text-left text-gray-600 uppercase">
                                                            Deskripsi
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-100">
                                                    {data.map((log, idx) => (
                                                        <tr
                                                            key={log.id}
                                                            className={`hover:bg-blue-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                                                                }`}
                                                        >
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="text-sm font-medium text-gray-900">
                                                                    {new Date(
                                                                        log.timestamp,
                                                                    ).toLocaleDateString('id-ID')}
                                                                </div>
                                                                <div className="text-xs text-gray-500">
                                                                    {new Date(
                                                                        log.timestamp,
                                                                    ).toLocaleTimeString('id-ID', {
                                                                        hour: '2-digit',
                                                                        minute: '2-digit',
                                                                    })}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span
                                                                    className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${(log as any).tipe_log?.includes('MASUK')
                                                                        ? 'bg-green-100 text-green-800'
                                                                        : 'bg-yellow-100 text-yellow-800'
                                                                        }`}
                                                                >
                                                                    {(log as any).tipe_log?.replace(
                                                                        '_',
                                                                        ' ',
                                                                    ) || '-'}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <span
                                                                    className={`text-lg font-bold ${log.jumlah_kg > 0
                                                                        ? 'text-green-600'
                                                                        : 'text-red-600'
                                                                        }`}
                                                                >
                                                                    {log.jumlah_kg.toLocaleString('id-ID')}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className="text-sm text-gray-700">
                                                                    {(log as any).deskripsi || '-'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-12 text-center">
                                        <FaEye className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                                        <p className="mb-2 text-lg font-medium text-gray-900">
                                            Tidak ada histori
                                        </p>
                                        <p className="text-gray-500">
                                            Belum ada histori untuk batch ini.
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end px-6 py-4 bg-gray-50">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-6 py-2 text-sm font-medium text-gray-700 transition-colors bg-white border border-gray-300 rounded-xl hover:bg-gray-50"
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
 * Main
 * ======================================================================== */

type ExtPembelian = BatchPembelian & {
    status?: 'AKTIF' | 'DIBATALKAN' | 'NONAKTIF' | string;
    status_pembayaran?: 'LUNAS' | 'SEBAGIAN' | 'BELUM_LUNAS';
    nilai_terbayar?: number;
    akun_kas_id?: number;
};

const Pembelian: React.FC = () => {
    // data
    const [pembelianList, setPembelianList] = useState<ExtPembelian[]>([]);
    const [allProdukList, setAllProdukList] = useState<Produk[]>([]);
    const [produkForForm, setProdukForForm] = useState<Produk[]>([]);
    const [akunKasList, setAkunKasList] = useState<AkunKas[]>([]);

    // filter
    const [filterMode, setFilterMode] = useState<FilterMode>('BULAN_INI');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [statusFilter, setStatusFilter] =
        useState<'ALL' | 'LUNAS' | 'SEBAGIAN' | 'BELUM_LUNAS'>('ALL');
    const [searchQuery, setSearchQuery] = useState(''); // 🔍 Search state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // ui state
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editPembelianId, setEditPembelianId] = useState<number | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [isHistoryVisible, setIsHistoryVisible] = useState(false);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [selectedBatch, setSelectedBatch] = useState<ExtPembelian | null>(null);
    const [logPembelianData, setLogPembelianData] = useState<LogPembelian[]>([]);

    // form state
    const [produkId, setProdukId] = useState('');
    const [namaPemasok, setNamaPemasok] = useState('');
    const [jumlahKg, setJumlahKg] = useState('');
    const [hargaPerKg, setHargaPerKg] = useState('');
    const [statusPembayaran, setStatusPembayaran] =
        useState<'LUNAS' | 'SEBAGIAN' | 'BELUM_LUNAS'>('BELUM_LUNAS');
    const [nilaiTerbayar, setNilaiTerbayar] = useState('');
    const [akunKasId, setAkunKasId] = useState('');

    // 🔥 NEW: multi-step form seperti Penjualan
    const [step, setStep] = useState<1 | 2 | 3>(1);

    const nextStep = () =>
        setStep((s) => (s < 3 ? ((s + 1) as 1 | 2 | 3) : s));

    const prevStep = () =>
        setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s));

    // helpers
    const produkMap = useMemo(
        () => new Map(allProdukList.map((p) => [p.id, p.nama_produk])),
        [allProdukList],
    );

    const isLocked = (p: ExtPembelian) => {
        const sisa = Number(p.sisa_kg ?? p.jumlah_kg ?? 0);
        const awal = Number(p.jumlah_kg ?? 0);
        return Boolean(p.is_terpakai) || sisa !== awal;
    };

    // date range calc (selaras produksi / penjualan)
    const { startDate, endDate, rangeLabel } = useMemo(() => {
        const now = new Date();
        const startOfDay = (d: Date) =>
            new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const endOfDay = (d: Date) =>
            new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

        let start = startOfDay(now);
        let end = endOfDay(now);
        let label = 'Hari ini';

        if (filterMode === 'MINGGU_INI') {
            const day = now.getDay();
            const diff = (day + 6) % 7; // Monday as start
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
            label = now.toLocaleString('id-ID', {
                month: 'long',
                year: 'numeric',
            });
        } else if (filterMode === 'KUSTOM') {
            const fallbackStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const fallbackEnd = now;

            start = customStart ? startOfDay(new Date(customStart)) : fallbackStart;
            end = customEnd ? endOfDay(new Date(customEnd)) : endOfDay(fallbackEnd);

            if (customStart && customEnd) {
                label = `${new Date(customStart).toLocaleDateString(
                    'id-ID',
                )} - ${new Date(customEnd).toLocaleDateString('id-ID')}`;
            } else label = 'Periode kustom';
        }

        if (filterMode === 'HARI_INI') label = 'Hari ini';

        return { startDate: start, endDate: end, rangeLabel: label };
    }, [filterMode, customStart, customEnd]);

    // filter by date & status
    const filteredPembelianList = useMemo(
        () =>
            pembelianList.filter((item) => {
                const d = new Date(item.tgl_pembelian);
                return d >= startDate && d <= endDate;
            }),
        [pembelianList, startDate, endDate],
    );

    // 🔍 Add search + status filtering
    const statusFilteredList = useMemo(() => {
        let filtered = filteredPembelianList;

        // Status filter
        if (statusFilter !== 'ALL') {
            filtered = filtered.filter(
                (p) => (p.status_pembayaran || 'BELUM_LUNAS') === statusFilter
            );
        }

        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter((p) => {
                const produkName = produkMap.get(p.produk_id)?.toLowerCase() || '';
                const supplierName = (p.nama_pemasok || '').toLowerCase();
                return produkName.includes(query) || supplierName.includes(query);
            });
        }

        return filtered;
    }, [filteredPembelianList, statusFilter, searchQuery, produkMap]);

    const summary = useMemo(
        () =>
            filteredPembelianList.reduce(
                (acc, p) => {
                    acc.totalPembelian += p.jumlah_kg * p.harga_per_kg;
                    acc.totalGabah += p.jumlah_kg;
                    acc.totalSisaStok += p.sisa_kg || 0;
                    return acc;
                },
                { totalPembelian: 0, totalGabah: 0, totalSisaStok: 0 },
            ),
        [filteredPembelianList],
    );

    const totalPages = Math.ceil(statusFilteredList.length / itemsPerPage) || 1;

    const currentItems = useMemo(() => {
        const startIdx = (currentPage - 1) * itemsPerPage;
        return statusFilteredList.slice(startIdx, startIdx + itemsPerPage);
    }, [statusFilteredList, currentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [filterMode, customStart, customEnd, statusFilter]);

    /* ====================================================================== *
     * Data Fetch
     * ====================================================================== */

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true);
            const [pembelianData, produkData, akunKasData] = await Promise.all([
                api.getAllPembelian(),
                api.getAllProduk(),
                api.getAllAkunKas(),
            ]);

            setPembelianList(
                (Array.isArray(pembelianData) ? pembelianData : []) as ExtPembelian[],
            );

            const allProduk = Array.isArray(produkData) ? produkData : [];
            setAllProdukList(allProduk);
            setProdukForForm(
                allProduk.filter((p) => p.tipe_produk === 'BAHAN_MENTAH'),
            );

            setAkunKasList(
                (Array.isArray(akunKasData) ? akunKasData : []).filter(
                    (a) => a.is_active,
                ),
            );

            setError(null);
        } catch (err: any) {
            setError(err.message || 'Gagal memuat data');
            showToast(err.message || 'Gagal memuat data', 'error');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    /* ====================================================================== *
     * Form helpers
     * ====================================================================== */

    const resetForm = () => {
        setProdukId('');
        setNamaPemasok('');
        setJumlahKg('');
        setHargaPerKg('');
        setStatusPembayaran('BELUM_LUNAS');
        setNilaiTerbayar('');
        setAkunKasId(
            akunKasList.length > 0 ? akunKasList[0].id.toString() : '',
        );
        setIsEditing(false);
        setEditPembelianId(null);

        setStep(1);
    };

    const showAddForm = () => {
        resetForm();
        setIsFormVisible(true);
    };

    const handleCloseModal = () => {
        setIsFormVisible(false);
        resetForm();
    };

    const handleEditClick = (p: ExtPembelian) => {
        setIsEditing(true);
        setEditPembelianId(p.id);
        setProdukId(String(p.produk_id));
        setNamaPemasok(p.nama_pemasok || '');
        setJumlahKg(String(p.jumlah_kg));
        setHargaPerKg(String(p.harga_per_kg));
        setStatusPembayaran(p.status_pembayaran || 'BELUM_LUNAS');
        setNilaiTerbayar(String(p.nilai_terbayar ?? 0));
        setAkunKasId(p.akun_kas_id ? String(p.akun_kas_id) : '');
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
        const total = calculateTotal();
        const bayar = parseFloat(nilaiTerbayar || '0') || 0;

        if (!produkId || !jumlahKg || !hargaPerKg) {
            showToast('Lengkapi data pembelian terlebih dahulu', 'error');
            return;
        }

        if (
            (statusPembayaran === 'SEBAGIAN' || statusPembayaran === 'LUNAS') &&
            !akunKasId
        ) {
            showToast(
                'Pilih akun kas untuk mencatat arus kas pembayaran pembelian.',
                'error',
            );
            return;
        }

        if (statusPembayaran === 'SEBAGIAN') {
            if (bayar <= 0 || bayar >= total) {
                showToast(
                    'Untuk pembayaran sebagian, nilai DP harus > 0 dan < total.',
                    'error',
                );
                return;
            }
        }

        // 👉 di sini kita bikin angka pasti, bukan number | undefined
        const akunKasIdNumber =
            statusPembayaran === 'SEBAGIAN' || statusPembayaran === 'LUNAS'
                ? parseInt(akunKasId, 10)
                : 0;

        const payload: api.InputPembelian = {
            produk_id: parseInt(produkId, 10),
            nama_pemasok: namaPemasok,
            jumlah_kg: parseFloat(jumlahKg),
            harga_per_kg: parseFloat(hargaPerKg),
            status_pembayaran: statusPembayaran,
            nilai_terbayar: statusPembayaran === 'SEBAGIAN' ? bayar : 0,
            akun_kas_id: akunKasIdNumber, // ✅ selalu number
        };

        try {
            if (isEditing && editPembelianId) {
                showToast('Update pembelian belum diimplementasikan.', 'info');
                // await api.updatePembelian(editPembelianId, payload);
            } else {
                await api.createPembelian(payload);
                showToast('Pembelian baru berhasil dicatat!', 'success');
            }
            handleCloseModal();
            fetchData();
        } catch (err: any) {
            showToast(err.message || 'Gagal menyimpan pembelian', 'error');
        }
    };

    const confirmDelete = (id: number) => setDeleteId(id);

    const handleDelete = async () => {
        if (deleteId == null) return;
        try {
            await api.deletePembelian(deleteId);
            showToast('Pembelian berhasil dibatalkan', 'success');
            fetchData();
        } catch (err: any) {
            showToast(err.message || 'Gagal membatalkan pembelian', 'error');
        } finally {
            setDeleteId(null);
        }
    };

    const handleViewHistory = async (p: ExtPembelian) => {
        setSelectedBatch(p);
        setIsHistoryVisible(true);
        setIsHistoryLoading(true);
        try {
            const data = await api.getPembelianHistory(p.id);
            setLogPembelianData(data);
        } catch (err: any) {
            showToast(err.message || 'Gagal memuat histori', 'error');
            setLogPembelianData([]);
        } finally {
            setIsHistoryLoading(false);
        }
    };

    /* ====================================================================== *
     * Badges + helpers
     * ====================================================================== */

    const renderPaymentBadge = (status?: ExtPembelian['status_pembayaran']) => {
        switch (status) {
            case 'LUNAS':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Lunas
                    </span>
                );
            case 'SEBAGIAN':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                        DP / Sebagian
                    </span>
                );
            case 'BELUM_LUNAS':
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        Hutang
                    </span>
                );
        }
    };

    const renderStatusBadge = (status?: ExtPembelian['status']) => {
        const s = (status || 'AKTIF').toUpperCase();
        if (s === 'AKTIF') {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                    Aktif
                </span>
            );
        }
        if (s === 'DIBATALKAN' || s === 'NONAKTIF') {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-200 text-gray-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-gray-500" />
                    {s === 'DIBATALKAN' ? 'Dibatalkan' : 'Nonaktif'}
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                {s}
            </span>
        );
    };

    const lockedReason = (p: ExtPembelian) => {
        const sisa = Number(p.sisa_kg ?? p.jumlah_kg ?? 0);
        const awal = Number(p.jumlah_kg ?? 0);
        if (p.is_terpakai || sisa !== awal)
            return 'Tidak bisa diubah (stok sudah terpakai)';
        return '';
    };

    /* ====================================================================== *
     * Render states
     * ====================================================================== */

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto border-b-2 border-blue-600 rounded-full animate-spin" />
                    <p className="mt-4 text-lg font-medium text-gray-700">
                        Memuat data pembelian...
                    </p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="max-w-md mx-auto text-center">
                    <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full">
                        <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
                    </div>
                    <p className="mb-2 text-lg font-medium text-gray-900">
                        Terjadi Kesalahan
                    </p>
                    <p className="mb-4 text-red-600">{error}</p>
                    <button
                        type="button"
                        onClick={fetchData}
                        className="px-4 py-2 text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
                    >
                        Coba Lagi
                    </button>
                </div>
            </div>
        );
    }

    const statusFilterLabel =
        statusFilter === 'ALL'
            ? 'Semua Status'
            : statusFilter === 'LUNAS'
                ? 'Lunas'
                : statusFilter === 'SEBAGIAN'
                    ? 'DP / Sebagian'
                    : 'Hutang';

    /* ====================================================================== *
     * MAIN UI
     * ====================================================================== */

    return (
        <div className="min-h-screen p-4 bg-gray-50 sm:p-6">
            <div className="mx-auto space-y-6 max-w-7xl">
                {/* 🎨 ENHANCED HERO HEADER */}
                <div className="relative px-6 py-6 overflow-hidden text-white shadow-lg bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600 rounded-2xl">
                    {/* Decorative Icon */}
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <FaTruck className="w-32 h-32" />
                    </div>

                    <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            {/* Badge */}
                            <div className="inline-flex items-center gap-2 px-3 py-1 mb-2 text-xs font-medium border rounded-full bg-white/20 backdrop-blur-sm border-white/10">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                Modul Pembelian Gabah
                            </div>

                            {/* Title */}
                            <h1 className="text-3xl font-bold tracking-tight">
                                Manajemen Pembelian Gabah
                            </h1>

                            {/* Description */}
                            <p className="max-w-lg mt-1 text-sm text-blue-100">
                                Catat pembelian gabah dari petani, pantau batch produksi, dan kelola pembayaran supplier.
                            </p>
                        </div>

                        {/* Button */}
                        <button
                            type="button"
                            onClick={showAddForm}
                            className="group flex items-center gap-2 px-5 py-3 bg-white text-blue-600 rounded-xl font-bold shadow-lg hover:shadow-xl hover:bg-blue-50 transition-all transform hover:-translate-y-0.5"
                        >
                            <FaPlus className="transition-transform duration-300 group-hover:rotate-90" />
                            <span>Catat Pembelian</span>
                        </button>
                    </div>
                </div>

                {/* 🎨 ENHANCED FILTER TABS */}
                <div className="p-4 bg-white border border-blue-100 shadow-sm rounded-2xl">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex flex-wrap gap-2">
                            {([
                                { id: 'HARI_INI', label: 'Hari Ini' },
                                { id: 'MINGGU_INI', label: 'Minggu Ini' },
                                { id: 'BULAN_INI', label: 'Bulan Ini' },
                                { id: 'KUSTOM', label: 'Kustom' },
                            ] as { id: FilterMode; label: string }[]).map((opt) => {
                                const active = filterMode === opt.id;
                                return (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => setFilterMode(opt.id)}
                                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${active
                                            ? 'bg-blue-500 text-white shadow-sm'
                                            : 'bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600'
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
                                    className="text-sm border-0 bg-white px-3 py-1.5 rounded-lg focus:ring-2 focus:ring-blue-200"
                                />
                                <span className="text-gray-400">→</span>
                                <input
                                    type="date"
                                    value={customEnd}
                                    onChange={(e) => setCustomEnd(e.target.value)}
                                    className="text-sm border-0 bg-white px-3 py-1.5 rounded-lg focus:ring-2 focus:ring-blue-200"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* 🎨 ENHANCED SUMMARY CARDS */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    {/* Card 1 - Total Pembelian */}
                    <div className="relative p-5 overflow-hidden transition-all duration-300 border border-gray-100 shadow-sm cursor-pointer rounded-2xl bg-blue-50 hover:shadow-lg group">
                        {/* Decorative blob */}
                        <div className="absolute w-32 h-32 rounded-full -top-10 -right-10 bg-gradient-to-br from-white/40 to-transparent blur-2xl" />
                        <div className="relative z-10 flex items-center justify-between">
                            <div className="flex-1">
                                <p className="mb-2 text-sm font-semibold text-gray-600">Total Pembelian</p>
                                <p className="text-2xl font-extrabold text-gray-900 lg:text-3xl tabular-nums">
                                    {formatRupiah(summary.totalPembelian)}
                                </p>
                                <p className="text-xs text-gray-500 mt-1.5">Periode {rangeLabel.toLowerCase()}</p>
                            </div>
                            <div className="p-4 transition-transform duration-300 shadow-lg bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-blue-500/25 group-hover:scale-110">
                                <CurrencyDollarIcon className="text-white w-7 h-7" />
                            </div>
                        </div>
                    </div>

                    {/* Card 2 - Total Gabah */}
                    <div className="relative p-5 overflow-hidden transition-all duration-300 border border-gray-100 shadow-sm cursor-pointer rounded-2xl bg-emerald-50 hover:shadow-lg group">
                        {/* Decorative blob */}
                        <div className="absolute w-32 h-32 rounded-full -top-10 -right-10 bg-gradient-to-br from-white/40 to-transparent blur-2xl" />
                        <div className="relative z-10 flex items-center justify-between">
                            <div className="flex-1">
                                <p className="mb-2 text-sm font-semibold text-gray-600">Total Gabah</p>
                                <p className="text-2xl font-extrabold text-gray-900 lg:text-3xl tabular-nums">
                                    {summary.totalGabah.toLocaleString('id-ID')} Kg
                                </p>
                                <p className="text-xs text-gray-500 mt-1.5">Periode {rangeLabel.toLowerCase()}</p>
                            </div>
                            <div className="p-4 transition-transform duration-300 shadow-lg bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-emerald-500/25 group-hover:scale-110">
                                <ScaleIcon className="text-white w-7 h-7" />
                            </div>
                        </div>
                    </div>

                    {/* Card 3 - Sisa Stok */}
                    <div className="relative p-5 overflow-hidden transition-all duration-300 border border-gray-100 shadow-sm cursor-pointer rounded-2xl bg-orange-50 hover:shadow-lg group">
                        {/* Decorative blob */}
                        <div className="absolute w-32 h-32 rounded-full -top-10 -right-10 bg-gradient-to-br from-white/40 to-transparent blur-2xl" />
                        <div className="relative z-10 flex items-center justify-between">
                            <div className="flex-1">
                                <p className="mb-2 text-sm font-semibold text-gray-600">Sisa Stok Gabah</p>
                                <p className="text-2xl font-extrabold text-gray-900 lg:text-3xl tabular-nums">
                                    {summary.totalSisaStok.toLocaleString('id-ID')} Kg
                                </p>
                                <p className="text-xs text-gray-500 mt-1.5">Stok tersedia saat ini</p>
                            </div>
                            <div className="p-4 transition-transform duration-300 shadow-lg bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl shadow-orange-500/25 group-hover:scale-110">
                                <HashtagIcon className="text-white w-7 h-7" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ================== FORM MODAL ================== */}
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
                                    <Dialog.Panel className="w-full max-w-2xl overflow-hidden transition-all transform bg-white border border-blue-100 shadow-2xl rounded-3xl">
                                        {/* header */}
                                        <div className="relative px-6 pt-4 pb-3 bg-gradient-to-r from-blue-600 to-indigo-600">
                                            <Dialog.Title className="flex items-center gap-3 text-lg font-bold text-white sm:text-xl">
                                                <div className="p-2 bg-white/20 rounded-xl">
                                                    <FaTruck className="w-5 h-5" />
                                                </div>
                                                {isEditing ? 'Edit Pembelian Gabah' : 'Catat Pembelian Baru'}
                                            </Dialog.Title>

                                            <p className="max-w-md mt-1 text-xs text-blue-100">
                                                Isi detail produk, jumlah, dan metode pembayaran dengan lebih terstruktur.
                                            </p>

                                            {/* 🔥 NEW: stepper */}
                                            <div className="flex items-center gap-4 mt-4 text-xs text-blue-100">
                                                {[
                                                    { id: 1, label: 'Pilih Produk' },
                                                    { id: 2, label: 'Jumlah & Harga' },
                                                    { id: 3, label: 'Pembayaran' },
                                                ].map((s) => {
                                                    const active = step === s.id;
                                                    const done = step > s.id;
                                                    return (
                                                        <div key={s.id} className="flex items-center">
                                                            <div
                                                                className={`flex items-center justify-center w-7 h-7 rounded-full border text-[11px] font-semibold ${active
                                                                    ? 'bg-white text-blue-600 border-white'
                                                                    : done
                                                                        ? 'bg-emerald-400 text-white border-emerald-400'
                                                                        : 'bg-white/10 text-blue-100 border-white/30'
                                                                    }`}
                                                            >
                                                                {done ? '✓' : s.id}
                                                            </div>
                                                            <span
                                                                className={`ml-2 font-medium ${active ? 'text-white' : 'text-blue-100'
                                                                    }`}
                                                            >
                                                                {s.label}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            <button
                                                type="button"
                                                onClick={handleCloseModal}
                                                className="absolute p-2 transition-colors rounded-lg top-4 right-4 text-white/80 hover:text-white hover:bg-white/20"
                                            >
                                                <XMarkIcon className="w-5 h-5" />
                                            </button>
                                        </div>

                                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                                            {/* STEP 1: PRODUK + PEMASOK */}
                                            {step === 1 && (
                                                <div className="p-4 space-y-4 border bg-slate-50/80 border-slate-200 rounded-2xl sm:p-5">
                                                    <div className="flex items-center justify-between gap-3 mb-1">
                                                        <div>
                                                            <p className="text-sm font-semibold text-slate-800">
                                                                Produk yang Dibeli
                                                            </p>
                                                            <p className="text-xs text-slate-500">
                                                                Pilih produk gabah dan isi nama pemasok.
                                                            </p>
                                                        </div>
                                                        <span className="text-[11px] font-semibold text-blue-600">
                                                            Langkah 1 dari 3
                                                        </span>
                                                    </div>

                                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                        {/* Produk */}
                                                        <div>
                                                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                                Produk (Bahan Mentah) <span className="text-red-500">*</span>
                                                            </label>
                                                            <select
                                                                value={produkId}
                                                                onChange={(e) => setProdukId(e.target.value)}
                                                                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                                                                required
                                                            >
                                                                <option value="" disabled>
                                                                    Pilih Produk
                                                                </option>
                                                                {produkForForm.map((p) => (
                                                                    <option key={p.id} value={p.id}>
                                                                        {p.nama_produk}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            <p className="mt-1 text-[11px] text-gray-500">
                                                                Hanya produk bertipe <b>Bahan Mentah</b> yang bisa dibeli di sini.
                                                            </p>
                                                        </div>

                                                        {/* Pemasok */}
                                                        <div>
                                                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                                Nama Pemasok
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={namaPemasok}
                                                                onChange={(e) => setNamaPemasok(e.target.value)}
                                                                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                                                                placeholder="Contoh: Pak Hendi"
                                                            />
                                                            <p className="mt-1 text-[11px] text-gray-500">
                                                                Opsional, tapi disarankan supaya histori pembelian lebih jelas.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* STEP 2: JUMLAH & HARGA + RINGKASAN */}
                                            {step === 2 && (
                                                <div className="grid grid-cols-1 md:grid-cols-[minmax(0,3fr)_minmax(0,2.2fr)] gap-4">
                                                    {/* Kiri: jumlah & harga */}
                                                    <div className="p-4 space-y-4 border bg-slate-50/80 border-slate-200 rounded-2xl sm:p-5">
                                                        <div className="flex items-center justify-between gap-3 mb-1">
                                                            <div>
                                                                <p className="text-sm font-semibold text-slate-800">
                                                                    Jumlah & Harga
                                                                </p>
                                                                <p className="text-xs text-slate-500">
                                                                    Isi jumlah gabah dan harga per kilogram.
                                                                </p>
                                                            </div>
                                                            <span className="text-[11px] font-semibold text-blue-600">
                                                                Langkah 2 dari 3
                                                            </span>
                                                        </div>

                                                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                            {/* Jumlah */}
                                                            <div>
                                                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                                    Jumlah (Kg) <span className="text-red-500">*</span>
                                                                </label>
                                                                <div className="relative">
                                                                    <input
                                                                        type="number"
                                                                        step="0.01"
                                                                        min={0}
                                                                        value={jumlahKg}
                                                                        onChange={(e) => setJumlahKg(e.target.value)}
                                                                        className="w-full rounded-xl border border-gray-300 px-4 pr-12 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                                                                        placeholder="0.00"
                                                                        required
                                                                    />
                                                                    <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-xs font-semibold text-gray-500">
                                                                        Kg
                                                                    </span>
                                                                </div>
                                                                <p className="mt-1 text-[11px] text-gray-500">
                                                                    Contoh: 100.5 (boleh desimal).
                                                                </p>
                                                            </div>

                                                            {/* Harga per Kg */}
                                                            <div>
                                                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                                    Harga per Kg (Rp) <span className="text-red-500">*</span>
                                                                </label>
                                                                <div className="relative">
                                                                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-xs font-semibold text-gray-500">
                                                                        Rp
                                                                    </span>
                                                                    <input
                                                                        type="number"
                                                                        min={0}
                                                                        value={hargaPerKg}
                                                                        onChange={(e) => setHargaPerKg(e.target.value)}
                                                                        className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                                                                        placeholder="0"
                                                                        required
                                                                    />
                                                                </div>
                                                                <p className="mt-1 text-[11px] text-gray-500">
                                                                    Contoh: 9000.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Kanan: Ringkasan transaksi */}
                                                    <div className="p-4 bg-white border border-blue-100 shadow-sm rounded-2xl sm:p-5">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <div>
                                                                <p className="text-sm font-semibold text-blue-900">
                                                                    Ringkasan Transaksi
                                                                </p>
                                                                <p className="text-[11px] text-blue-700">
                                                                    Update otomatis saat kamu mengisi form.
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center justify-center text-blue-600 w-9 h-9 rounded-xl bg-blue-50">
                                                                <CurrencyDollarIcon className="w-5 h-5" />
                                                            </div>
                                                        </div>

                                                        <dl className="space-y-1 text-sm text-gray-700">
                                                            <div className="flex justify-between">
                                                                <dt>Produk</dt>
                                                                <dd className="font-semibold">
                                                                    {produkMap.get(parseInt(produkId || '0', 10)) || '-'}
                                                                </dd>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <dt>Jumlah</dt>
                                                                <dd className="font-semibold">
                                                                    {jumlahKg ? `${jumlahKg} Kg` : '0 Kg'}
                                                                </dd>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <dt>Harga / Kg</dt>
                                                                <dd className="font-semibold">
                                                                    {hargaPerKg
                                                                        ? formatRupiah(parseFloat(hargaPerKg || '0'))
                                                                        : 'Rp 0'}
                                                                </dd>
                                                            </div>
                                                        </dl>

                                                        <hr className="my-3" />

                                                        <div className="flex items-baseline justify-between">
                                                            <span className="text-xs font-semibold text-gray-500">
                                                                Total Pembelian
                                                            </span>
                                                            <span className="text-2xl font-extrabold text-blue-700">
                                                                {formatRupiah(calculateTotal())}
                                                            </span>
                                                        </div>

                                                        <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-3 text-[11px] text-blue-800 space-y-1">
                                                            <p className="font-semibold text-[12px]">Tips:</p>
                                                            <ul className="list-disc list-inside space-y-0.5">
                                                                <li>Pastikan jumlah tidak melebihi kapasitas gudang.</li>
                                                                <li>Sesuaikan harga dengan kesepakatan pemasok.</li>
                                                                <li>Periksa ringkasan sebelum lanjut ke pembayaran.</li>
                                                            </ul>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* STEP 3: DETAIL PEMBAYARAN */}
                                            {step === 3 && (
                                                <div className="p-4 space-y-4 border border-blue-200 bg-blue-50 rounded-2xl sm:p-5">
                                                    <div className="flex items-center justify-between gap-3 mb-1">
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex items-center justify-center w-8 h-8 bg-white rounded-full">
                                                                <CreditCardIcon className="w-4 h-4 text-blue-600" />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-semibold text-blue-900">
                                                                    Detail Pembayaran
                                                                </p>
                                                                <p className="text-xs text-blue-700">
                                                                    Atur status pembayaran & akun kas yang digunakan.
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <span className="text-[11px] font-semibold text-blue-700">
                                                            Langkah 3 dari 3
                                                        </span>
                                                    </div>

                                                    {/* Status pembayaran – pill toggle */}
                                                    <div className="space-y-2">
                                                        <p className="block text-xs font-semibold text-gray-700">
                                                            Status Pembayaran
                                                        </p>
                                                        <div className="flex flex-wrap gap-2 p-1 bg-white rounded-2xl shadow-sm">
                                                            {[
                                                                { id: 'BELUM_LUNAS', label: 'Hutang (Bayar Nanti)' },
                                                                { id: 'SEBAGIAN', label: 'Bayar Sebagian (DP)' },
                                                                { id: 'LUNAS', label: 'Lunas' },
                                                            ].map((opt) => {
                                                                const active = statusPembayaran === opt.id;
                                                                return (
                                                                    <button
                                                                        key={opt.id}
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setStatusPembayaran(
                                                                                opt.id as 'BELUM_LUNAS' | 'SEBAGIAN' | 'LUNAS',
                                                                            )
                                                                        }
                                                                        className={`flex-1 min-w-0 px-3 py-2 text-[11px] sm:text-xs font-semibold rounded-xl transition-all text-center ${active
                                                                            ? 'bg-blue-600 text-white shadow-sm'
                                                                            : 'text-gray-600 hover:bg-blue-50'
                                                                            }`}
                                                                    >
                                                                        {opt.label}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                        <p className="text-[11px] text-blue-800">
                                                            Atur sesuai kesepakatan dengan pemasok agar arus kas & hutang rapi.
                                                        </p>
                                                    </div>

                                                    {/* DP */}
                                                    {statusPembayaran === 'SEBAGIAN' && (
                                                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                            <div>
                                                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                                    Jumlah DP (Rp)
                                                                </label>
                                                                <div className="relative">
                                                                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-xs font-semibold text-gray-500">
                                                                        Rp
                                                                    </span>
                                                                    <input
                                                                        type="number"
                                                                        min={0}
                                                                        value={nilaiTerbayar}
                                                                        onChange={(e) => setNilaiTerbayar(e.target.value)}
                                                                        required
                                                                        className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                                                                        placeholder="0"
                                                                    />
                                                                </div>
                                                                <p className="mt-1 text-[11px] text-gray-500">
                                                                    DP harus lebih kecil dari total{' '}
                                                                    {formatRupiah(Math.max(0, calculateTotal()))}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Akun kas */}
                                                    {(statusPembayaran === 'SEBAGIAN' || statusPembayaran === 'LUNAS') && (
                                                        <div className="mt-1">
                                                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                                Bayar dari Akun Kas
                                                            </label>
                                                            <select
                                                                value={akunKasId}
                                                                onChange={(e) => setAkunKasId(e.target.value)}
                                                                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                                                                required
                                                            >
                                                                <option value="" disabled>
                                                                    Pilih Akun Kas
                                                                </option>
                                                                {akunKasList.map((akun) => (
                                                                    <option key={akun.id} value={akun.id}>
                                                                        {akun.nama_akun} ({formatRupiah(akun.saldo || 0)})
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            <p className="mt-1 text-[11px] text-blue-800">
                                                                Pembayaran akan otomatis mengurangi saldo akun kas yang dipilih.
                                                            </p>
                                                        </div>
                                                    )}

                                                    {statusPembayaran === 'BELUM_LUNAS' && (
                                                        <p className="text-[11px] text-blue-800 bg-white/60 border border-blue-100 rounded-xl px-3 py-2">
                                                            Transaksi dicatat sebagai <b>hutang ke pemasok</b>. Kas belum
                                                            berkurang sampai pembayaran dicatat di modul keuangan.
                                                        </p>
                                                    )}
                                                </div>
                                            )}

                                            {/* FOOTER BUTTONS */}
                                            <div className="flex flex-col justify-between gap-3 pt-2 sm:flex-row sm:items-center">
                                                <button
                                                    type="button"
                                                    onClick={handleCloseModal}
                                                    className="rounded-xl border border-gray-300 bg-white py-2.5 px-5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                                >
                                                    Batal
                                                </button>

                                                <div className="flex justify-end gap-3">
                                                    {step > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={prevStep}
                                                            className="rounded-xl border border-gray-300 bg-white py-2.5 px-5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                                        >
                                                            Kembali
                                                        </button>
                                                    )}

                                                    {step < 3 && (
                                                        <button
                                                            type="button"
                                                            onClick={nextStep}
                                                            disabled={
                                                                (step === 1 && !produkId) ||
                                                                (step === 2 &&
                                                                    (!jumlahKg ||
                                                                        !hargaPerKg ||
                                                                        parseFloat(jumlahKg) <= 0 ||
                                                                        parseFloat(hargaPerKg) <= 0))
                                                            }
                                                            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-2.5 px-6 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                                                        >
                                                            Lanjut →
                                                        </button>
                                                    )}

                                                    {step === 3 && (
                                                        <button
                                                            type="submit"
                                                            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-2.5 px-6 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                                                        >
                                                            Simpan Pembelian
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

                {/* ===================== LIST MOBILE ===================== */}
                <div className="space-y-4 md:hidden">
                    {/* Filter Status (mobile) */}
                    <div className="flex items-center justify-between gap-3 px-1">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-gray-100 rounded-lg">
                                <CreditCardIcon className="w-4 h-4 text-gray-600" />
                            </div>
                            <span className="text-sm font-semibold text-gray-700">
                                Status Pembayaran
                            </span>
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) =>
                                setStatusFilter(
                                    e.target.value as 'ALL' | 'LUNAS' | 'SEBAGIAN' | 'BELUM_LUNAS',
                                )
                            }
                            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-[13px] font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                            aria-label="Filter Status Pembayaran (Mobile)"
                        >
                            <option value="ALL">Semua Status</option>
                            <option value="LUNAS">Lunas</option>
                            <option value="SEBAGIAN">DP / Sebagian</option>
                            <option value="BELUM_LUNAS">Hutang</option>
                        </select>
                    </div>

                    {currentItems.length === 0 ? (
                        <div className="py-12 text-center text-gray-600 bg-white border border-gray-200 border-dashed rounded-2xl">
                            Belum ada pembelian pada periode ini
                            {statusFilter !== 'ALL'
                                ? ` (Status: ${statusFilter === 'LUNAS'
                                    ? 'Lunas'
                                    : statusFilter === 'SEBAGIAN'
                                        ? 'DP / Sebagian'
                                        : 'Hutang'
                                })`
                                : ''}
                            .
                        </div>
                    ) : (
                        currentItems.map((p) => {
                            const sisa = Number(p.sisa_kg ?? p.jumlah_kg ?? 0);
                            const used = Math.max(0, Number(p.jumlah_kg ?? 0) - sisa);
                            const pct = Math.min(
                                100,
                                Math.max(0, Math.round((used / (p.jumlah_kg || 1)) * 100)),
                            );
                            const locked = isLocked(p);
                            const isCancelled = p.status === 'DIBATALKAN';

                            return (
                                <section
                                    key={p.id}
                                    className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${isCancelled ? 'opacity-60 bg-gray-100' : ''
                                        }`}
                                    aria-label="Kartu pembelian"
                                >
                                    <div className="px-4 py-3 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                                        <div className="flex items-start justify-between gap-3">
                                            <h3 className="text-base font-bold leading-tight text-gray-900 truncate">
                                                {produkMap.get(p.produk_id) || 'Produk'}
                                            </h3>
                                            <div className="text-right">
                                                <div className="text-[12px] text-gray-600">Total</div>
                                                <div className="text-2xl font-extrabold tracking-tight text-blue-700">
                                                    {formatRupiah(p.jumlah_kg * p.harga_per_kg)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="px-4 pt-3 text-[15px]">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 text-gray-800">
                                                <FaCalendarAlt className="w-3.5 h-3.5 mr-1 text-gray-500" />
                                                {new Date(p.tgl_pembelian).toLocaleDateString('id-ID', {
                                                    day: '2-digit',
                                                    month: 'long',
                                                    year: 'numeric',
                                                })}
                                            </span>
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-100 text-blue-900">
                                                <FaTruck className="w-3.5 h-3.5 mr-1" />
                                                {p.nama_pemasok || '–'}
                                            </span>
                                            {renderPaymentBadge(p.status_pembayaran)}
                                            {renderStatusBadge(p.status)}
                                        </div>
                                    </div>

                                    <div className="px-4 pt-3 pb-2">
                                        <div className="grid grid-cols-3 overflow-hidden border divide-x rounded-xl">
                                            <div className="px-3 py-3 text-center">
                                                <div className="text-[12px] text-gray-500">Jumlah</div>
                                                <div className="text-xl font-semibold text-gray-900">
                                                    {p.jumlah_kg.toLocaleString('id-ID')}{' '}
                                                    <span className="text-xs text-gray-500">Kg</span>
                                                </div>
                                            </div>
                                            <div className="px-3 py-3 text-center">
                                                <div className="text-[12px] text-gray-500">Terpakai</div>
                                                <div className="text-xl font-semibold text-amber-700">
                                                    {used.toLocaleString('id-ID')}{' '}
                                                    <span className="text-xs text-gray-500">Kg</span>
                                                </div>
                                            </div>
                                            <div className="px-3 py-3 text-center">
                                                <div className="text-[12px] text-gray-500">Sisa</div>
                                                <div
                                                    className={`text-xl font-semibold ${sisa === 0 ? 'text-rose-700' : 'text-emerald-700'
                                                        }`}
                                                >
                                                    {sisa.toLocaleString('id-ID')}{' '}
                                                    <span className="text-xs text-gray-500">Kg</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-3">
                                            <div className="w-full h-2 overflow-hidden bg-gray-100 rounded-full">
                                                <div
                                                    className={`h-2 ${sisa === 0 ? 'bg-rose-500' : 'bg-blue-500'
                                                        }`}
                                                    style={{ width: `${pct}%` }}
                                                    aria-label={`Terpakai ${pct}%`}
                                                />
                                            </div>
                                            <div className="mt-1.5 text-[12px] text-gray-600 text-right">
                                                {pct}% terpakai
                                            </div>
                                        </div>
                                    </div>

                                    <div className="px-4 pt-2 pb-4">
                                        <div className="grid grid-cols-3 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => !isCancelled && handleViewHistory(p)}
                                                disabled={isCancelled}
                                                className="flex items-center justify-center gap-2 px-4 py-3 text-base font-medium text-gray-900 bg-white border rounded-xl active:ring-2 active:ring-blue-200 disabled:opacity-60 disabled:cursor-not-allowed"
                                                aria-label="Lihat Riwayat"
                                            >
                                                <FaEye />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => !isCancelled && handleEditClick(p)}
                                                disabled={locked || isCancelled}
                                                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-base font-medium active:ring-2 active:ring-blue-200 ${locked || isCancelled
                                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                    : 'bg-white text-gray-900'
                                                    }`}
                                                aria-label="Edit"
                                            >
                                                <FaEdit />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => !isCancelled && confirmDelete(p.id)}
                                                disabled={locked || isCancelled}
                                                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-base font-medium active:ring-2 active:ring-rose-200 ${locked || isCancelled
                                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                    : 'bg-white text-rose-600'
                                                    }`}
                                                aria-label="Batalkan Pembelian"
                                            >
                                                <FaTimesCircle />
                                            </button>
                                        </div>
                                    </div>
                                </section>
                            );
                        })
                    )}
                </div>

                {/* ===================== 🎨 ENHANCED TABLE - KARUNG STYLE ===================== */}
                <div className="hidden overflow-hidden bg-white border border-gray-100 shadow-sm md:block rounded-2xl">
                    {/* Header Section */}
                    <div className="p-6 border-b border-gray-100">
                        <div className="flex flex-col gap-4 mb-4 md:flex-row md:items-center md:justify-between">
                            <div className="flex items-start gap-3">
                                {/* Icon Box - Karung Style */}
                                <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 rounded-xl bg-blue-50">
                                    <FaTruck className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Riwayat Transaksi</h2>
                                    <p className="mt-1 text-sm text-gray-600">
                                        Menampilkan <span className="font-bold text-blue-600">{statusFilteredList.length}</span> data untuk <span className="font-semibold">{rangeLabel}</span>
                                        {statusFilter !== 'ALL' && (
                                            <span className="ml-1"> (Status: <span className="font-medium">{statusFilterLabel}</span>)</span>
                                        )}
                                    </p>
                                </div>
                            </div>

                            {/* Filter Status Pembayaran */}
                            <div className="flex items-center gap-3 px-4 py-2 border border-gray-200 rounded-lg bg-gray-50">
                                <CreditCardIcon className="w-4 h-4 text-gray-500" />
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'LUNAS' | 'SEBAGIAN' | 'BELUM_LUNAS')}
                                    className="text-sm font-semibold text-gray-700 bg-transparent border-0 cursor-pointer focus:ring-0"
                                >
                                    <option value="ALL">Semua Status Bayar</option>
                                    <option value="LUNAS">Lunas</option>
                                    <option value="SEBAGIAN">DP / Sebagian</option>
                                    <option value="BELUM_LUNAS">Hutang</option>
                                </select>
                            </div>
                        </div>

                        {/* Search Box - Karung Style */}
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Cari supplier/produk..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
                            />
                            <div className="absolute text-gray-400 -translate-y-1/2 left-3 top-1/2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                                <tr className="bg-white border-b border-gray-100">
                                    <th className="px-6 py-4 text-xs font-bold tracking-wider text-left text-gray-500 uppercase">Tanggal</th>
                                    <th className="px-6 py-4 text-xs font-bold tracking-wider text-left text-gray-500 uppercase">Produk & Supplier</th>
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
                                        const sisa = Number(p.sisa_kg ?? p.jumlah_kg ?? 0);
                                        const used = Math.max(0, Number(p.jumlah_kg ?? 0) - sisa);
                                        const locked = isLocked(p);
                                        const isCancelled = p.status === 'DIBATALKAN';

                                        return (
                                            <tr
                                                key={p.id}
                                                className={`group hover:bg-blue-50/30 transition-colors ${isCancelled ? 'bg-gray-50 opacity-60' : ''
                                                    }`}
                                            >
                                                {/* TANGGAL */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-2 transition-colors rounded-lg bg-blue-50 group-hover:bg-blue-100">
                                                            <FaCalendarAlt className="w-4 h-4 text-blue-600" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-gray-900">
                                                                {new Date(p.tgl_pembelian).toLocaleDateString('id-ID', {
                                                                    day: 'numeric',
                                                                    month: 'short',
                                                                    year: 'numeric',
                                                                })}
                                                            </p>
                                                            <p className="text-xs text-gray-500">
                                                                {new Date(p.tgl_pembelian).toLocaleTimeString('id-ID', {
                                                                    hour: '2-digit',
                                                                    minute: '2-digit',
                                                                })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* PRODUK & SUPPLIER */}
                                                <td className="px-6 py-4">
                                                    <p className="text-sm font-bold text-gray-800">
                                                        {produkMap.get(p.produk_id) || 'Produk Dihapus'}
                                                    </p>
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <FaTruck className="w-3 h-3 text-gray-400" />
                                                        <span className="text-xs text-gray-500">{p.nama_pemasok || '-'}</span>
                                                    </div>
                                                </td>

                                                {/* JUMLAH */}
                                                <td className="px-6 py-4 text-right">
                                                    <div className="text-sm font-semibold text-gray-900">
                                                        {p.jumlah_kg.toLocaleString('id-ID')} Kg
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        Sisa:{' '}
                                                        <span className={sisa === 0 ? 'text-red-500 font-bold' : 'text-green-600 font-bold'}>
                                                            {sisa.toLocaleString('id-ID')} Kg
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* HARGA */}
                                                <td className="px-6 py-4 font-mono text-sm text-right text-gray-600">
                                                    {formatRupiah(p.harga_per_kg)}
                                                </td>

                                                {/* TOTAL */}
                                                <td className="px-6 py-4 text-right">
                                                    <span className="px-2 py-1 text-sm font-bold text-blue-600 rounded-lg bg-blue-50">
                                                        {formatRupiah(p.jumlah_kg * p.harga_per_kg)}
                                                    </span>
                                                </td>

                                                {/* STATUS */}
                                                <td className="px-6 py-4 text-center">
                                                    {renderPaymentBadge(p.status_pembayaran)}
                                                </td>

                                                {/* AKSI */}
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => !isCancelled && handleViewHistory(p)}
                                                            disabled={isCancelled}
                                                            className="p-2 text-blue-600 transition-colors hover:bg-blue-50 rounded-xl disabled:opacity-40"
                                                            title="Lihat Riwayat"
                                                        >
                                                            <FaEye className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => !isCancelled && !locked && handleEditClick(p)}
                                                            disabled={locked || isCancelled}
                                                            className={`p-2 rounded-xl transition-colors ${locked || isCancelled
                                                                ? 'text-gray-300 cursor-not-allowed'
                                                                : 'text-blue-600 hover:bg-blue-50'
                                                                }`}
                                                            title={locked ? lockedReason(p) : 'Edit'}
                                                        >
                                                            <FaEdit className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => !isCancelled && !locked && confirmDelete(p.id)}
                                                            disabled={locked || isCancelled}
                                                            className={`p-2 rounded-xl transition-colors ${locked || isCancelled
                                                                ? 'text-gray-300 cursor-not-allowed'
                                                                : 'text-red-600 hover:bg-red-50'
                                                                }`}
                                                            title="Hapus"
                                                        >
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
                                                    <FaTruck className="w-8 h-8 text-gray-400" />
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

                    {/* Pagination */}
                    <div className="p-4 border-t border-gray-100 bg-gray-50">
                        <EnhancedPagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                        />
                    </div>
                </div>

                {/* Delete Confirmation */}
                {deleteId !== null && (
                    <Transition appear show as={Fragment}>
                        <Dialog
                            as="div"
                            className="relative z-50"
                            onClose={() => setDeleteId(null)}
                        >
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
                                        <Dialog.Panel className="w-full max-w-md overflow-hidden transition-all transform bg-white shadow-2xl rounded-2xl">
                                            <div className="p-6">
                                                <div className="flex items-center gap-4 mb-4">
                                                    <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 bg-red-100 rounded-full">
                                                        <FaTimesCircle className="w-5 h-5 text-red-600" />
                                                    </div>
                                                    <div>
                                                        <Dialog.Title
                                                            as="h3"
                                                            className="text-lg font-semibold text-gray-900"
                                                        >
                                                            Konfirmasi Pembatalan
                                                        </Dialog.Title>
                                                    </div>
                                                </div>

                                                <div className="mb-6">
                                                    <p className="text-sm text-gray-600">
                                                        Anda yakin ingin membatalkan pembelian ini? Stok
                                                        akan dikembalikan dan semua pembayaran yang sudah
                                                        tercatat akan dikembalikan ke kas.
                                                    </p>
                                                    <p className="mt-2 text-xs text-gray-500">
                                                        Tindakan ini tidak dapat dibatalkan.
                                                    </p>
                                                </div>

                                                <div className="flex gap-3">
                                                    <button
                                                        type="button"
                                                        className="flex-1 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50"
                                                        onClick={() => setDeleteId(null)}
                                                    >
                                                        Tutup
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="flex-1 px-4 py-2 text-sm font-semibold text-white transition-colors bg-red-600 rounded-lg shadow-sm hover:bg-red-700"
                                                        onClick={handleDelete}
                                                    >
                                                        Ya, Batalkan Pembelian
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

                {/* History Modal */}
                <HistoryModal
                    isOpen={isHistoryVisible}
                    onClose={() => setIsHistoryVisible(false)}
                    isLoading={isHistoryLoading}
                    data={logPembelianData}
                    title={
                        selectedBatch
                            ? `Riwayat Batch Pembelian #${selectedBatch.id}`
                            : 'Riwayat Pembelian'
                    }
                />
            </div>
        </div>
    );
};

export default Pembelian;