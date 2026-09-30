import React, { useState, useEffect, useCallback, Fragment, useMemo } from 'react';
import * as api from '../services/api';
import { TransaksiJasaGiling, Produk, TipePembayaranJasa } from '../types';
import { Dialog, Transition } from '@headlessui/react';
import {
    PlusIcon,
    XMarkIcon,
    TrashIcon,
    CalendarDaysIcon,
    ExclamationTriangleIcon,
    BanknotesIcon,
    CheckCircleIcon,
    InformationCircleIcon,
    EyeIcon,
    ChevronDownIcon,
    FunnelIcon,
} from '@heroicons/react/24/solid';
import { FaEdit, FaUserTie } from 'react-icons/fa';
import { GiGrain, GiWheat } from 'react-icons/gi';

const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    (window as any).addToast?.(message, type);
};

const formatRupiah = (n: number): string =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

type FilterType = 'hari_ini' | 'minggu_ini' | 'bulan_ini' | 'kustom';

// FilterTabs Component
const FilterTabs: React.FC<{
    activeTab: FilterType;
    onTabChange: (id: FilterType) => void;
    dateFrom: string;
    dateTo: string;
    onDateFromChange: (v: string) => void;
    onDateToChange: (v: string) => void;
    onApplyCustom: () => void;
}> = ({ activeTab, onTabChange, dateFrom, dateTo, onDateFromChange, onDateToChange, onApplyCustom }) => {
    const tabs = [
        { id: 'hari_ini', label: 'Hari Ini' },
        { id: 'minggu_ini', label: 'Minggu Ini' },
        { id: 'bulan_ini', label: 'Bulan Ini' },
        { id: 'kustom', label: 'Kustom' },
    ] as const;

    return (
        <div className="p-4 bg-white border border-blue-100 shadow-sm rounded-2xl sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                    {tabs.map((t) => (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => onTabChange(t.id)}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                                activeTab === t.id
                                    ? 'bg-blue-500 text-white shadow-sm'
                                    : 'bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
                {activeTab === 'kustom' && (
                    <div className="flex flex-col items-center gap-2 px-3 py-2 sm:flex-row bg-gray-50 rounded-xl">
                        <input type="date" value={dateFrom} onChange={(e) => onDateFromChange(e.target.value)}
                            className="text-sm border-0 bg-white px-3 py-1.5 rounded-lg focus:ring-2 focus:ring-blue-200" />
                        <span className="text-gray-400">→</span>
                        <input type="date" value={dateTo} onChange={(e) => onDateToChange(e.target.value)}
                            className="text-sm border-0 bg-white px-3 py-1.5 rounded-lg focus:ring-2 focus:ring-blue-200" />
                        <button onClick={onApplyCustom}
                            className="px-4 py-1.5 text-sm font-semibold text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors">
                            Terapkan
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// Summary Card Component
const EnhancedSummaryCard: React.FC<{
    title: string; value: string; subtitle?: string; icon: React.ReactNode;
    bgColor: string; gradient: string; shadow: string; onClick?: () => void;
}> = ({ title, value, subtitle, icon, bgColor, gradient, shadow, onClick }) => (
    <div 
        onClick={onClick}
        className={`relative overflow-hidden ${bgColor} border border-gray-100 p-5 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer group`}
    >
        <div className="absolute w-32 h-32 rounded-full -top-10 -right-10 bg-gradient-to-br from-white/40 to-transparent blur-2xl" />
        <div className="relative flex items-center justify-between">
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

// Form Modal
const JasaGilingFormModal: React.FC<{
    isOpen: boolean; onClose: () => void; onSubmit: (payload: api.InputJasaGiling) => void;
    produkList: Produk[]; isEditing?: boolean; editData?: TransaksiJasaGiling | null;
}> = ({ isOpen, onClose, onSubmit, produkList, isEditing = false, editData = null }) => {
    const [namaPelanggan, setNamaPelanggan] = useState('');
    const [beratBerasHasilKg, setBeratBerasHasilKg] = useState('');
    const [tipePembayaran, setTipePembayaran] = useState<TipePembayaranJasa>('TUNAI');
    const [produkPembayaranId, setProdukPembayaranId] = useState('');
    const [jumlahPembayaranTunai, setJumlahPembayaranTunai] = useState('');
    const [jumlahPembayaranBerasKg, setJumlahPembayaranBerasKg] = useState('');
    const [deskripsi, setDeskripsi] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (isEditing && editData) {
                setNamaPelanggan(editData.nama_pelanggan);
                setBeratBerasHasilKg(editData.berat_beras_hasil_kg.toString());
                setTipePembayaran(editData.tipe_pembayaran);
                setProdukPembayaranId(editData.produk_pembayaran_id?.toString() || '');
                setJumlahPembayaranTunai(editData.jumlah_pembayaran_tunai.toString());
                setJumlahPembayaranBerasKg(editData.jumlah_pembayaran_beras_kg.toString());
                setDeskripsi(editData.deskripsi || '');
            } else {
                setNamaPelanggan(''); setBeratBerasHasilKg(''); setTipePembayaran('TUNAI');
                setProdukPembayaranId(''); setJumlahPembayaranTunai(''); setJumlahPembayaranBerasKg(''); setDeskripsi('');
            }
        }
    }, [isOpen, isEditing, editData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload: api.InputJasaGiling = {
            tipe_jasa_giling: 'UMUM', nama_pelanggan: namaPelanggan,
            berat_beras_hasil_kg: parseFloat(beratBerasHasilKg), tipe_pembayaran: tipePembayaran, deskripsi,
        };
        if (tipePembayaran === 'TUNAI') {
            if (!jumlahPembayaranTunai) { showToast("Jumlah pembayaran tunai harus diisi!", 'error'); return; }
            payload.jumlah_pembayaran_tunai = parseFloat(jumlahPembayaranTunai);
        } else {
            if (!produkPembayaranId || !jumlahPembayaranBerasKg) { showToast("Produk dan jumlah beras harus diisi!", 'error'); return; }
            payload.produk_pembayaran_id = parseInt(produkPembayaranId, 10);
            payload.jumlah_pembayaran_beras_kg = parseFloat(jumlahPembayaranBerasKg);
        }
        setIsSubmitting(true);
        try { await onSubmit(payload); } finally { setIsSubmitting(false); }
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
                </Transition.Child>
                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-full p-4">
                        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                            <Dialog.Panel className="w-full max-w-2xl overflow-hidden transition-all transform bg-white shadow-2xl rounded-2xl">
                                <div className="relative px-6 py-5 overflow-hidden bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600">
                                    <div className="absolute top-0 right-0 p-4 opacity-10"><GiGrain className="w-24 h-24" /></div>
                                    <div className="relative flex items-center justify-between">
                                        <div>
                                            <Dialog.Title className="text-xl font-bold text-white">{isEditing ? 'Edit Jasa Giling' : 'Catat Jasa Giling Baru'}</Dialog.Title>
                                            <p className="text-sm text-blue-100 mt-0.5">{isEditing ? 'Perbarui data transaksi' : 'Tambah transaksi jasa giling umum'}</p>
                                        </div>
                                        <button onClick={onClose} className="p-2 text-white transition-colors rounded-xl bg-white/10 hover:bg-white/20"><XMarkIcon className="w-5 h-5" /></button>
                                    </div>
                                </div>
                                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                                    <div className="p-5 border border-blue-100 bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20"><FaUserTie className="w-4 h-4 text-white" /></div>
                                            <h4 className="font-bold text-gray-900">Informasi Pelanggan</h4>
                                        </div>
                                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                            <div>
                                                <label className="block mb-2 text-sm font-semibold text-gray-700">Nama Pelanggan</label>
                                                <input type="text" value={namaPelanggan} onChange={(e) => setNamaPelanggan(e.target.value)} className="w-full px-4 py-3 text-sm transition-all bg-white border border-gray-200 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-100" placeholder="Masukkan nama pelanggan" required />
                                            </div>
                                            <div>
                                                <label className="block mb-2 text-sm font-semibold text-gray-700">Berat Beras Hasil (Kg)</label>
                                                <input type="number" step="0.01" value={beratBerasHasilKg} onChange={(e) => setBeratBerasHasilKg(e.target.value)} className="w-full px-4 py-3 text-sm transition-all bg-white border border-gray-200 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-100 tabular-nums" placeholder="Contoh: 25.5" required />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-5 border bg-gradient-to-br from-emerald-50 to-blue-50 rounded-2xl border-emerald-100">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20"><BanknotesIcon className="w-4 h-4 text-white" /></div>
                                            <h4 className="font-bold text-gray-900">Metode Pembayaran</h4>
                                        </div>
                                        <div className="flex gap-2 p-1 mb-4 bg-white border border-gray-200 rounded-xl">
                                            <button type="button" onClick={() => setTipePembayaran('TUNAI')} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${tipePembayaran === 'TUNAI' ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25' : 'text-gray-600 hover:bg-gray-50'}`}><BanknotesIcon className="w-4 h-4" />Tunai</button>
                                            <button type="button" onClick={() => setTipePembayaran('BERAS')} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${tipePembayaran === 'BERAS' ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/25' : 'text-gray-600 hover:bg-gray-50'}`}><GiWheat className="w-4 h-4" />Beras</button>
                                        </div>
                                        {tipePembayaran === 'TUNAI' && (
                                            <div className="p-4 bg-white border border-gray-200 rounded-xl">
                                                <label className="block mb-2 text-sm font-semibold text-gray-700">Jumlah Pembayaran</label>
                                                <div className="relative">
                                                    <span className="absolute font-medium text-gray-500 -translate-y-1/2 left-4 top-1/2">Rp</span>
                                                    <input type="number" step="100" value={jumlahPembayaranTunai} onChange={(e) => setJumlahPembayaranTunai(e.target.value)} className="w-full py-3 pl-12 pr-4 text-sm transition-all border border-gray-200 rounded-xl focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 tabular-nums" placeholder="50000" required />
                                                </div>
                                            </div>
                                        )}
                                        {tipePembayaran === 'BERAS' && (
                                            <div className="p-4 space-y-4 bg-white border border-gray-200 rounded-xl">
                                                <div>
                                                    <label className="block mb-2 text-sm font-semibold text-gray-700">Pilih Produk Beras</label>
                                                    <select value={produkPembayaranId} onChange={(e) => setProdukPembayaranId(e.target.value)} className="w-full px-4 py-3 text-sm transition-all border border-gray-200 rounded-xl focus:border-amber-400 focus:ring-4 focus:ring-amber-100" required>
                                                        <option value="" disabled>Pilih Produk Beras</option>
                                                        {produkList.map((p) => <option key={p.id} value={p.id}>{p.nama_produk}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block mb-2 text-sm font-semibold text-gray-700">Jumlah Pembayaran (Kg)</label>
                                                    <div className="relative">
                                                        <input type="number" step="0.01" value={jumlahPembayaranBerasKg} onChange={(e) => setJumlahPembayaranBerasKg(e.target.value)} className="w-full px-4 py-3 pr-12 text-sm transition-all border border-gray-200 rounded-xl focus:border-amber-400 focus:ring-4 focus:ring-amber-100 tabular-nums" placeholder="2.5" required />
                                                        <span className="absolute font-medium text-gray-500 -translate-y-1/2 right-4 top-1/2">Kg</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-2 p-3 border rounded-lg bg-amber-50 border-amber-200">
                                                    <InformationCircleIcon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                                    <p className="text-xs text-amber-800">Beras yang diterima akan otomatis masuk ke stok produk yang dipilih.</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block mb-2 text-sm font-semibold text-gray-700">Catatan (Opsional)</label>
                                        <textarea value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} className="w-full px-4 py-3 text-sm transition-all border border-gray-200 resize-none rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-100" rows={2} placeholder="Tambahkan catatan jika perlu..." />
                                    </div>
                                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                        <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors">Batal</button>
                                        <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2">
                                            {isSubmitting ? <><div className="w-4 h-4 border-2 rounded-full border-white/30 border-t-white animate-spin" />Menyimpan...</> : <><CheckCircleIcon className="w-5 h-5" />{isEditing ? 'Simpan Perubahan' : 'Simpan'}</>}
                                        </button>
                                    </div>
                                </form>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

// Main Page
const JasaGilingPage: React.FC = () => {
    const [jasaGilingList, setJasaGilingList] = useState<TransaksiJasaGiling[]>([]);
    const [produkList, setProdukList] = useState<Produk[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState<TransaksiJasaGiling | null>(null);
    const [itemToDelete, setItemToDelete] = useState<TransaksiJasaGiling | null>(null);
    const [activeTab, setActiveTab] = useState<FilterType>('bulan_ini');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [tipeFilter, setTipeFilter] = useState<'SEMUA' | 'UMUM' | 'PRIBADI'>('SEMUA');

    const getDateRange = useCallback(() => {
        const now = new Date();
        let from: Date | null = null, to: Date | null = null;
        switch (activeTab) {
            case 'hari_ini':
                from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
                break;
            case 'minggu_ini': {
                const day = now.getDay(), diff = now.getDate() - day + (day === 0 ? -6 : 1);
                from = new Date(now.getFullYear(), now.getMonth(), diff);
                to = new Date(from); to.setDate(from.getDate() + 6); to.setHours(23, 59, 59);
                break;
            }
            case 'bulan_ini':
                from = new Date(now.getFullYear(), now.getMonth(), 1);
                to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
                break;
            case 'kustom':
                if (dateFrom) from = new Date(dateFrom);
                if (dateTo) { to = new Date(dateTo); to.setHours(23, 59, 59); }
                break;
        }
        return { from, to };
    }, [activeTab, dateFrom, dateTo]);

    const filteredList = useMemo(() => {
        const { from, to } = getDateRange();
        let list = jasaGilingList;
        
        // Filter by date range
        if (from && to) {
            list = list.filter(j => { const d = new Date(j.tanggal); return d >= from && d <= to; });
        }
        
        // Filter by tipe jasa giling
        if (tipeFilter !== 'SEMUA') {
            list = list.filter(j => j.tipe_jasa_giling === tipeFilter);
        }
        
        return list;
    }, [jasaGilingList, getDateRange, tipeFilter]);

    const summary = useMemo(() => {
        const umum = filteredList.filter(j => j.tipe_jasa_giling === 'UMUM');
        const pribadi = filteredList.filter(j => j.tipe_jasa_giling === 'PRIBADI');
        return {
            totalGabahUmum: umum.reduce((s, j) => s + (j.berat_beras_hasil_kg || 0), 0),
            totalGabahPribadi: pribadi.reduce((s, j) => s + (j.berat_gabah_awal_kg || 0), 0),
            pendapatanBeras: umum.filter(j => j.tipe_pembayaran === 'BERAS').reduce((s, j) => s + (j.jumlah_pembayaran_beras_kg || 0), 0),
        };
    }, [filteredList]);

    const formatPembayaran = useCallback((jasa: TransaksiJasaGiling): string => {
        if (jasa.tipe_pembayaran === 'TUNAI') return formatRupiah(jasa.jumlah_pembayaran_tunai || 0);
        const produk = produkList.find(p => p.id === jasa.produk_pembayaran_id);
        return `${jasa.jumlah_pembayaran_beras_kg || 0} Kg ${produk?.nama_produk || 'Beras'}`;
    }, [produkList]);

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true);
            const [jasaData, produkData] = await Promise.all([api.getAllJasaGiling(), api.getAllProduk()]);
            setJasaGilingList(Array.isArray(jasaData) ? jasaData : []);
            setProdukList(Array.isArray(produkData) ? produkData.filter(p => p.tipe_produk === 'PRODUK_JADI') : []);
            setError(null);
        } catch (err: any) { setError(err.message || "Gagal memuat data"); showToast(err.message || "Gagal memuat data", 'error'); }
        finally { setIsLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleSubmit = async (payload: api.InputJasaGiling) => {
        try {
            if (isEditing && editData) { await api.updateJasaGiling(editData.id, payload); showToast('Transaksi berhasil diperbarui!'); }
            else { await api.createJasaGiling(payload); showToast('Transaksi baru berhasil dicatat!'); }
            setIsFormVisible(false); setIsEditing(false); setEditData(null); fetchData();
        } catch (err: any) { showToast(err.message || 'Gagal menyimpan data.', 'error'); }
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;
        try { await api.deleteJasaGiling(itemToDelete.id); showToast('Transaksi berhasil dihapus!'); fetchData(); }
        catch (err: any) { showToast(err.message || 'Gagal menghapus data.', 'error'); }
        finally { setItemToDelete(null); }
    };

    const getPeriodLabel = () => ({ hari_ini: 'Hari Ini', minggu_ini: 'Minggu Ini', bulan_ini: 'Bulan Ini', kustom: 'Kustom' }[activeTab]);

    if (isLoading) return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="text-center">
                <div className="w-16 h-16 mx-auto border-b-2 border-blue-600 rounded-full animate-spin" />
                <p className="mt-4 text-lg font-medium text-gray-700">Memuat data jasa giling...</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="max-w-md p-8 mx-auto text-center bg-white shadow-xl rounded-2xl">
                <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full"><ExclamationTriangleIcon className="w-8 h-8 text-red-600" /></div>
                <p className="mb-2 text-lg font-bold text-gray-900">Terjadi Kesalahan</p>
                <p className="mb-6 text-red-600">{error}</p>
                <button onClick={fetchData} className="px-6 py-3 font-semibold text-white transition-all bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:shadow-lg">Coba Lagi</button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen p-4 bg-gray-50 sm:p-6">
            <div className="mx-auto space-y-6 max-w-7xl">
                {/* Header */}
                <div className="relative px-6 py-6 overflow-hidden text-white shadow-lg bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600 rounded-2xl">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><GiGrain className="w-32 h-32" /></div>
                    <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 mb-2 text-xs font-medium border rounded-full bg-white/20 backdrop-blur-sm border-white/10">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />Modul Jasa Giling
                            </div>
                            <h1 className="text-3xl font-bold tracking-tight">Riwayat Jasa Giling</h1>
                            <p className="max-w-lg mt-1 text-sm text-blue-100">Kelola transaksi penggilingan gabah dengan mudah dan efisien</p>
                        </div>
                        <button type="button" onClick={() => { setIsEditing(false); setEditData(null); setIsFormVisible(true); }}
                            className="group flex items-center gap-2 px-5 py-3 bg-white text-blue-600 rounded-xl font-bold shadow-lg hover:shadow-xl hover:bg-blue-50 transition-all transform hover:-translate-y-0.5">
                            <PlusIcon className="w-5 h-5 transition-transform duration-300 group-hover:rotate-90" /><span>Catat Jasa Giling</span>
                        </button>
                    </div>
                </div>

                {/* Filter Tabs */}
                <FilterTabs activeTab={activeTab} onTabChange={(t) => { setActiveTab(t); if (t !== 'kustom') { setDateFrom(''); setDateTo(''); } }}
                    dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo}
                    onApplyCustom={() => { if (!dateFrom || !dateTo) showToast('Pilih tanggal mulai & akhir', 'error'); }} />

                {/* Summary Cards */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <EnhancedSummaryCard 
                        title="Jasa Giling Umum" 
                        value={`${summary.totalGabahUmum.toLocaleString('id-ID')} Kg`} 
                        subtitle={`Periode ${getPeriodLabel()}`} 
                        icon={<GiWheat className="w-7 h-7" />} 
                        bgColor="bg-emerald-50" 
                        gradient="from-emerald-500 to-teal-600" 
                        shadow="shadow-emerald-500/25" 
                        onClick={() => setTipeFilter('UMUM')}
                    />
                    <EnhancedSummaryCard 
                        title="Jasa Giling Pribadi" 
                        value={`${summary.totalGabahPribadi.toLocaleString('id-ID')} Kg`} 
                        subtitle={`Periode ${getPeriodLabel()}`} 
                        icon={<FaUserTie className="w-7 h-7" />} 
                        bgColor="bg-indigo-50" 
                        gradient="from-indigo-500 to-purple-600" 
                        shadow="shadow-indigo-500/25" 
                        onClick={() => setTipeFilter('PRIBADI')}
                    />
                    <EnhancedSummaryCard 
                        title="Pendapatan Beras" 
                        value={`${summary.pendapatanBeras.toLocaleString('id-ID')} Kg`} 
                        subtitle="Beras dari pembayaran jasa" 
                        icon={<GiGrain className="w-7 h-7" />} 
                        bgColor="bg-amber-50" 
                        gradient="from-amber-500 to-orange-600" 
                        shadow="shadow-amber-500/25" 
                    />
                </div>

                {/* Table */}
                <div className="overflow-hidden bg-white border border-gray-200 shadow-lg rounded-2xl">
                    <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-slate-50 via-blue-50/50 to-indigo-50/50">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 shadow-lg bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-blue-500/20"><GiGrain className="w-5 h-5 text-white" /></div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Riwayat Transaksi</h2>
                                    <p className="text-sm text-gray-500 mt-0.5">
                                        Menampilkan <span className="font-semibold text-blue-600">{filteredList.length}</span> data 
                                        {tipeFilter !== 'SEMUA' && <span className="font-medium text-gray-700"> ({tipeFilter.toLowerCase()})</span>} untuk <span className="font-medium text-gray-700">Periode {getPeriodLabel()?.toLowerCase()}</span>
                                    </p>
                                </div>
                            </div>
                            
                            {/* Dropdown Filter Tipe */}
                            <div className="relative">
                                <div className="flex items-center gap-2">
                                    <FunnelIcon className="w-4 h-4 text-gray-400" />
                                    <select
                                        value={tipeFilter}
                                        onChange={(e) => setTipeFilter(e.target.value as 'SEMUA' | 'UMUM' | 'PRIBADI')}
                                        className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer hover:border-blue-300 transition-colors"
                                    >
                                        <option value="SEMUA">Semua Tipe</option>
                                        <option value="UMUM">Giling Umum</option>
                                        <option value="PRIBADI">Giling Pribadi</option>
                                    </select>
                                    <ChevronDownIcon className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 pointer-events-none right-3 top-1/2" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="hidden overflow-x-auto md:block">
                        <table className="min-w-full">
                            <thead className="bg-gray-50/80">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold tracking-wider text-left text-gray-500 uppercase">Tanggal</th>
                                    <th className="px-6 py-4 text-xs font-bold tracking-wider text-left text-gray-500 uppercase">Pelanggan</th>
                                    <th className="px-6 py-4 text-xs font-bold tracking-wider text-center text-gray-500 uppercase">Tipe</th>
                                    <th className="px-6 py-4 text-xs font-bold tracking-wider text-right text-gray-500 uppercase">Jumlah</th>
                                    <th className="px-6 py-4 text-xs font-bold tracking-wider text-right text-gray-500 uppercase">Pembayaran</th>
                                    <th className="px-6 py-4 text-xs font-bold tracking-wider text-center text-gray-500 uppercase">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredList.length > 0 ? filteredList.map((jasa) => (
                                    <tr key={jasa.id} className="transition-all duration-200 cursor-pointer hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/30 group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 transition-colors bg-gray-100 rounded-lg group-hover:bg-blue-100"><CalendarDaysIcon className="w-4 h-4 text-gray-500 group-hover:text-blue-600" /></div>
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900">{new Date(jasa.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                                    <p className="text-xs text-gray-500">{new Date(jasa.tanggal).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center justify-center w-10 h-10 transition-colors rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 group-hover:from-blue-200 group-hover:to-indigo-200"><FaUserTie className="w-4 h-4 text-blue-600" /></div>
                                                <div>
                                                    <p className="font-bold text-gray-900">{jasa.nama_pelanggan}</p>
                                                    {jasa.deskripsi && <p className="text-xs text-gray-500 truncate max-w-[150px]">{jasa.deskripsi}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-full ${jasa.tipe_jasa_giling === 'PRIBADI' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>{jasa.tipe_jasa_giling}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <p className="text-lg font-extrabold text-gray-900 tabular-nums">{jasa.tipe_jasa_giling === 'UMUM' ? jasa.berat_beras_hasil_kg : jasa.berat_gabah_awal_kg}<span className="ml-1 text-sm font-medium text-gray-500">Kg</span></p>
                                            <p className="text-xs text-gray-500">{jasa.tipe_jasa_giling === 'UMUM' ? 'Beras Hasil' : 'Gabah Digiling'}</p>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <p className={`text-sm font-bold ${jasa.tipe_pembayaran === 'BERAS' ? 'text-amber-600' : 'text-emerald-600'}`}>{formatPembayaran(jasa)}</p>
                                            <p className="text-xs text-gray-500">{jasa.tipe_pembayaran === 'TUNAI' ? 'Tunai' : 'Beras'}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            {jasa.tipe_jasa_giling === 'UMUM' ? (
                                                <div className="flex justify-center gap-1">
                                                    <button onClick={() => { setIsEditing(true); setEditData(jasa); setIsFormVisible(true); }} className="p-2 text-blue-600 transition-colors rounded-lg hover:bg-blue-100"><FaEdit className="w-4 h-4" /></button>
                                                    <button onClick={() => setItemToDelete(jasa)} className="p-2 text-red-600 transition-colors rounded-lg hover:bg-red-100"><TrashIcon className="w-4 h-4" /></button>
                                                </div>
                                            ) : <div className="flex justify-center"><span className="p-2 text-gray-400"><EyeIcon className="w-4 h-4" /></span></div>}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-16 text-center">
                                            <div className="flex items-center justify-center w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-gray-100 to-blue-50"><GiGrain className="w-10 h-10 text-gray-400" /></div>
                                            <h3 className="mb-2 text-lg font-bold text-gray-900">Belum ada transaksi</h3>
                                            <p className="max-w-sm mx-auto mb-6 text-gray-500">{jasaGilingList.length === 0 ? 'Mulai catat transaksi jasa giling Anda' : `Tidak ada transaksi pada periode ${getPeriodLabel()?.toLowerCase()}`}</p>
                                            <button onClick={() => { setIsEditing(false); setEditData(null); setIsFormVisible(true); }} className="group inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all">
                                                <PlusIcon className="w-5 h-5 transition-transform duration-300 group-hover:rotate-90" />Catat Transaksi Pertama
                                            </button>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile */}
                    <div className="divide-y divide-gray-100 md:hidden">
                        {filteredList.length === 0 ? (
                            <div className="px-6 py-12 text-center">
                                <div className="flex items-center justify-center w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-gray-100 to-blue-50"><GiGrain className="w-10 h-10 text-gray-400" /></div>
                                <h3 className="mb-2 text-lg font-bold text-gray-900">Belum ada transaksi</h3>
                                <button onClick={() => { setIsEditing(false); setEditData(null); setIsFormVisible(true); }} className="inline-flex items-center gap-2 px-6 py-3 font-semibold text-white group bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl">
                                    <PlusIcon className="w-5 h-5 transition-transform duration-300 group-hover:rotate-90" />Catat Transaksi
                                </button>
                            </div>
                        ) : filteredList.map((jasa) => (
                            <div key={jasa.id} className="p-4 transition-colors hover:bg-blue-50/50">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100"><FaUserTie className="w-5 h-5 text-blue-600" /></div>
                                        <div>
                                            <p className="font-bold text-gray-900">{jasa.nama_pelanggan}</p>
                                            <p className="flex items-center gap-1 text-xs text-gray-500"><CalendarDaysIcon className="w-3 h-3" />{new Date(jasa.tanggal).toLocaleDateString('id-ID')}</p>
                                        </div>
                                    </div>
                                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${jasa.tipe_jasa_giling === 'PRIBADI' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>{jasa.tipe_jasa_giling}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3 p-3 mb-3 bg-gray-50 rounded-xl">
                                    <div className="text-center">
                                        <p className="text-xl font-bold text-blue-600">{jasa.tipe_jasa_giling === 'UMUM' ? jasa.berat_beras_hasil_kg : jasa.berat_gabah_awal_kg}</p>
                                        <p className="text-xs text-gray-500">Kg {jasa.tipe_jasa_giling === 'UMUM' ? 'Beras' : 'Gabah'}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className={`text-sm font-bold ${jasa.tipe_pembayaran === 'BERAS' ? 'text-amber-600' : 'text-emerald-600'}`}>{formatPembayaran(jasa)}</p>
                                        <p className="text-xs text-gray-500">Pembayaran</p>
                                    </div>
                                </div>
                                {jasa.tipe_jasa_giling === 'UMUM' && (
                                    <div className="flex justify-end gap-1">
                                        <button onClick={() => { setIsEditing(true); setEditData(jasa); setIsFormVisible(true); }} className="p-2 text-blue-600 transition-colors rounded-lg hover:bg-blue-100"><FaEdit className="w-4 h-4" /></button>
                                        <button onClick={() => setItemToDelete(jasa)} className="p-2 text-red-600 transition-colors rounded-lg hover:bg-red-100"><TrashIcon className="w-4 h-4" /></button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Modals */}
                <JasaGilingFormModal isOpen={isFormVisible} onClose={() => { setIsFormVisible(false); setIsEditing(false); setEditData(null); }} onSubmit={handleSubmit} produkList={produkList} isEditing={isEditing} editData={editData} />

                <Transition appear show={itemToDelete !== null} as={Fragment}>
                    <Dialog as="div" className="relative z-50" onClose={() => setItemToDelete(null)}>
                        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
                        </Transition.Child>
                        <div className="fixed inset-0 overflow-y-auto">
                            <div className="flex items-center justify-center min-h-full p-4">
                                <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                                    <Dialog.Panel className="w-full max-w-md overflow-hidden transition-all transform bg-white shadow-2xl rounded-2xl">
                                        <div className="px-6 py-5 bg-gradient-to-r from-red-500 to-red-600">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm"><ExclamationTriangleIcon className="w-6 h-6 text-white" /></div>
                                                <div>
                                                    <Dialog.Title className="text-xl font-bold text-white">Konfirmasi Hapus</Dialog.Title>
                                                    <p className="text-sm text-red-100">Tindakan ini tidak dapat dibatalkan</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-6">
                                            <p className="text-gray-700">Yakin ingin menghapus transaksi untuk <span className="font-bold text-gray-900">{itemToDelete?.nama_pelanggan}</span>?</p>
                                            {itemToDelete?.tipe_pembayaran === 'BERAS' && (
                                                <div className="flex items-start gap-3 p-3 mt-4 border bg-amber-50 border-amber-200 rounded-xl">
                                                    <InformationCircleIcon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                                    <p className="text-sm text-amber-800">Stok beras yang diterima sebagai pembayaran akan dikurangi.</p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50">
                                            <button type="button" className="px-5 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-700 font-semibold hover:bg-gray-50 transition-colors" onClick={() => setItemToDelete(null)}>Batal</button>
                                            <button type="button" className="px-5 py-2.5 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors" onClick={handleDelete}>Ya, Hapus</button>
                                        </div>
                                    </Dialog.Panel>
                                </Transition.Child>
                            </div>
                        </div>
                    </Dialog>
                </Transition>
            </div>
        </div>
    );
};

export default JasaGilingPage;