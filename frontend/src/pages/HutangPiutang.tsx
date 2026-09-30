// src/pages/HutangPiutang.tsx
import React, { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import * as api from '../services/api';
import { Hutang, Piutang, AkunKas, InputPembayaran, AlokasiInput } from '../types';
import { Dialog, Transition } from '@headlessui/react';
import { FaArrowDown, FaArrowUp, FaCalendarAlt, FaFileInvoiceDollar, FaPlus, FaUniversity, FaWallet, FaCheckCircle, FaExchangeAlt } from 'react-icons/fa';
import { XMarkIcon, CurrencyDollarIcon, ClockIcon, BanknotesIcon, ChartBarIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon, CalendarDaysIcon } from '@heroicons/react/24/solid';
import Pagination from '../components/Pagination';

const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    (window as any).addToast?.(message, type);
};

const formatRupiah = (angka: number) => `Rp ${Math.round(angka).toLocaleString('id-ID')}`;

type TargetType = 'HUTANG' | 'PIUTANG';
type FilterMode = 'HARI_INI' | 'MINGGU_INI' | 'BULAN_INI' | 'KUSTOM' | 'SEMUA';

// Filter Tabs Component
const FilterTabs: React.FC<{
    activeTab: FilterMode;
    onTabChange: (id: FilterMode) => void;
    dateFrom: string;
    dateTo: string;
    onDateFromChange: (v: string) => void;
    onDateToChange: (v: string) => void;
}> = ({ activeTab, onTabChange, dateFrom, dateTo, onDateFromChange, onDateToChange }) => {
    const tabs = [
        { id: 'SEMUA', label: 'Semua' },
        { id: 'HARI_INI', label: 'Hari Ini' },
        { id: 'MINGGU_INI', label: 'Minggu Ini' },
        { id: 'BULAN_INI', label: 'Bulan Ini' },
        { id: 'KUSTOM', label: 'Kustom' },
    ] as const;

    return (
        <div className="p-4 bg-white border border-blue-100 shadow-sm rounded-2xl">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
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

                {activeTab === 'KUSTOM' && (
                    <div className="flex flex-col items-center gap-2 px-3 py-2 sm:flex-row bg-gray-50 rounded-xl">
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => onDateFromChange(e.target.value)}
                            className="text-sm border-0 bg-white px-3 py-1.5 rounded-lg focus:ring-2 focus:ring-blue-200"
                        />
                        <span className="text-gray-400">→</span>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => onDateToChange(e.target.value)}
                            className="text-sm border-0 bg-white px-3 py-1.5 rounded-lg focus:ring-2 focus:ring-blue-200"
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

// Modal Pembayaran / Penerimaan (Dipercantik & Responsif)
const PaymentModal = ({
                          isOpen,
                          onClose,
                          targetType,
                          items,
                          akunKasList,
                          onPaymentSuccess,
                          preselectIds = [],
                      }: {
    isOpen: boolean;
    onClose: () => void;
    targetType: TargetType;
    items: (Hutang | Piutang)[];
    akunKasList: AkunKas[];
    onPaymentSuccess: () => void;
    preselectIds?: number[];
}) => {
    const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [akunKasId, setAkunKasId] = useState('');
    const [memo, setMemo] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setSelectedItems(new Set(preselectIds || []));
            setPaymentAmount('');
            setAkunKasId(akunKasList.length > 0 ? akunKasList[0].id.toString() : '');
            setMemo('');
        }
    }, [isOpen, akunKasList, preselectIds]);

    const totalSisaTagihanTerpilih = useMemo(() => {
        return items.reduce((total, item) => {
            if (selectedItems.has(item.id)) {
                return total + item.sisa_tagihan;
            }
            return total;
        }, 0);
    }, [selectedItems, items]);

    const handleSelect = (id: number) => {
        const newSelection = new Set(selectedItems);
        if (newSelection.has(id)) newSelection.delete(id);
        else newSelection.add(id);
        setSelectedItems(newSelection);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedItems.size === 0 || !paymentAmount || !akunKasId) {
            showToast('Pilih minimal satu tagihan, isi jumlah, dan pilih akun kas.', 'error');
            return;
        }

        const amount = parseFloat(paymentAmount);
        if (amount <= 0) {
            showToast('Jumlah harus lebih dari nol.', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            const alokasi: AlokasiInput[] = [];
            let sisaAlokasi = amount;
            const itemsToPay = items.filter((item) => selectedItems.has(item.id));

            for (const item of itemsToPay) {
                if (sisaAlokasi <= 0) break;
                const alokasiUntukItemIni = Math.min(item.sisa_tagihan, sisaAlokasi);
                alokasi.push({
                    target_id: item.id,
                    jumlah_dialokasikan: alokasiUntukItemIni,
                });
                sisaAlokasi -= alokasiUntukItemIni;
            }

            const payload: InputPembayaran = {
                tanggal_bayar: paymentDate,
                akun_kas_id: parseInt(akunKasId),
                jumlah_total: amount,
                metode: 'TUNAI',
                memo: memo,
                target_type: targetType,
                alokasi: alokasi,
            };

            await api.createPayment(payload);
            showToast('Transaksi berhasil dicatat!', 'success');
            onPaymentSuccess();
            onClose();
        } catch (err: any) {
            showToast(err.message || 'Gagal menyimpan transaksi.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const isPiutang = targetType === 'PIUTANG';
    const title = isPiutang ? 'Catat Penerimaan Piutang' : 'Catat Pembayaran Hutang';
    const amountLabel = isPiutang ? 'Jumlah Terima' : 'Jumlah Bayar';

    return (
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
                    <div className="fixed inset-0 bg-gradient-to-br from-slate-900/80 via-gray-900/70 to-slate-900/80 backdrop-blur-md" />
                </Transition.Child>
                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-full p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-400"
                            enterFrom="opacity-0 scale-90 translate-y-8"
                            enterTo="opacity-100 scale-100 translate-y-0"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100 translate-y-0"
                            leaveTo="opacity-0 scale-90 translate-y-8"
                        >
                            <Dialog.Panel className="w-full max-w-5xl overflow-hidden transition-all transform bg-white shadow-2xl rounded-3xl ring-1 ring-black/5">
                                {/* Header dengan gradient menarik */}
                                <div className={`relative px-6 py-5 overflow-hidden bg-gradient-to-r ${isPiutang ? 'from-emerald-500 via-green-500 to-teal-500' : 'from-rose-500 via-red-500 to-pink-500'}`}>
                                    {/* Decorative pattern */}
                                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_50%_120%,white,transparent)]" />
                                    <div className="absolute top-0 right-0 w-64 h-64 translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 blur-3xl" />
                                    
                                    <div className="relative flex items-center gap-4">
                                        <div className="p-3 shadow-lg bg-white/20 rounded-2xl backdrop-blur-sm ring-1 ring-white/30">
                                            {isPiutang ? <FaArrowDown className="w-6 h-6 text-white" /> : <FaArrowUp className="w-6 h-6 text-white" />}
                                        </div>
                                        <div>
                                            <Dialog.Title as="h3" className="text-2xl font-bold tracking-tight text-white">
                                                {title}
                                            </Dialog.Title>
                                            <p className="text-white/80 text-sm mt-0.5">
                                                {isPiutang ? 'Catat penerimaan pembayaran dari pelanggan' : 'Catat pembayaran hutang ke pemasok'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="absolute top-4 right-4 p-2.5 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95"
                                    >
                                        <XMarkIcon className="w-6 h-6" />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit}>
                                    <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-2">
                                        {/* Kolom Kiri: Daftar Tagihan */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isPiutang ? 'bg-green-100' : 'bg-red-100'}`}>
                                                    <FaFileInvoiceDollar className={`w-4 h-4 ${isPiutang ? 'text-green-600' : 'text-red-600'}`} />
                                                </div>
                                                <h4 className="font-bold text-gray-900">Pilih Tagihan</h4>
                                            </div>
                                            <p className="text-sm text-gray-600">
                                                {selectedItems.size > 0
                                                    ? `${selectedItems.size} tagihan terpilih - Total: ${formatRupiah(totalSisaTagihanTerpilih)}`
                                                    : 'Klik untuk memilih tagihan yang akan dibayar'}
                                            </p>
                                            <div className="p-3 space-y-2 overflow-y-auto border border-gray-200 max-h-96 rounded-xl bg-gray-50">
                                                {items.length === 0 ? (
                                                    <div className="py-8 text-center text-gray-500">
                                                        <FaFileInvoiceDollar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                                        <p>Tidak ada tagihan tersedia</p>
                                                    </div>
                                                ) : (
                                                    items.map((item) => (
                                                        <div
                                                            key={item.id}
                                                            onClick={() => handleSelect(item.id)}
                                                            className={`relative p-4 rounded-xl cursor-pointer border-2 transition-all ${
                                                                selectedItems.has(item.id)
                                                                    ? isPiutang
                                                                        ? 'bg-green-50 border-green-400 ring-2 ring-green-200 shadow-md'
                                                                        : 'bg-red-50 border-red-400 ring-2 ring-red-200 shadow-md'
                                                                    : 'bg-white hover:bg-blue-50 hover:border-blue-300 border-gray-200'
                                                            }`}
                                                        >
                                                            {selectedItems.has(item.id) && (
                                                                <div className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center ${isPiutang ? 'bg-green-600' : 'bg-red-600'}`}>
                                                                    <FaCheckCircle className="w-4 h-4 text-white" />
                                                                </div>
                                                            )}
                                                            <div className="space-y-2">
                                                                <p className="pr-8 font-bold text-gray-900">
                                                                    {(item as Hutang).nama_pemasok || (item as Piutang).nama_pelanggan}
                                                                </p>
                                                                <div className="flex flex-wrap gap-2 text-xs">
                                                                    <span className="inline-flex items-center gap-1 px-2 py-1 text-gray-700 bg-gray-100 rounded-md">
                                                                        <FaFileInvoiceDollar className="w-3 h-3" />
                                                                        {item.source_type}-{item.source_id}
                                                                    </span>
                                                                    <span className="inline-flex items-center gap-1 px-2 py-1 text-gray-700 bg-gray-100 rounded-md">
                                                                        <FaCalendarAlt className="w-3 h-3" />
                                                                        {new Date(item.tanggal_transaksi).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                                                                    <span className="text-xs text-gray-600">Sisa Tagihan:</span>
                                                                    <span className={`font-bold tabular-nums ${isPiutang ? 'text-green-600' : 'text-red-600'}`}>
                                                                        {formatRupiah(item.sisa_tagihan)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>

                                        {/* Kolom Kanan: Detail */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isPiutang ? 'bg-green-100' : 'bg-red-100'}`}>
                                                    <CurrencyDollarIcon className={`w-5 h-5 ${isPiutang ? 'text-green-600' : 'text-red-600'}`} />
                                                </div>
                                                <h4 className="font-bold text-gray-900">Detail {isPiutang ? 'Penerimaan' : 'Pembayaran'}</h4>
                                            </div>

                                            <div className="p-4 border border-gray-200 rounded-xl bg-gray-50">
                                                <label className="block mb-2 text-sm font-semibold text-gray-700">Tanggal</label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                                                        <FaCalendarAlt className="w-4 h-4 text-gray-400" />
                                                    </div>
                                                    <input
                                                        type="date"
                                                        value={paymentDate}
                                                        onChange={(e) => setPaymentDate(e.target.value)}
                                                        required
                                                        className="w-full py-3 pl-10 pr-4 text-sm bg-white border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                                    />
                                                </div>
                                            </div>

                                            <div className="p-4 border border-gray-200 rounded-xl bg-gray-50">
                                                <label className="block mb-2 text-sm font-semibold text-gray-700">{amountLabel}</label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                                                        <span className="text-sm font-medium text-gray-500">Rp</span>
                                                    </div>
                                                    <input
                                                        type="number"
                                                        value={paymentAmount}
                                                        onChange={(e) => setPaymentAmount(e.target.value)}
                                                        required
                                                        min="0"
                                                        placeholder="0"
                                                        className="w-full py-3 pl-10 pr-4 text-sm bg-white border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 tabular-nums"
                                                    />
                                                </div>
                                                {totalSisaTagihanTerpilih > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setPaymentAmount(totalSisaTagihanTerpilih.toString())}
                                                        className={`text-xs mt-2 px-3 py-1 rounded-lg font-medium transition-colors ${
                                                            isPiutang
                                                                ? 'text-green-700 bg-green-100 hover:bg-green-200'
                                                                : 'text-red-700 bg-red-100 hover:bg-red-200'
                                                        }`}
                                                    >
                                                        Isi sesuai total: {formatRupiah(totalSisaTagihanTerpilih)}
                                                    </button>
                                                )}
                                            </div>

                                            <div className="p-4 border border-gray-200 rounded-xl bg-gray-50">
                                                <label className="block mb-2 text-sm font-semibold text-gray-700">
                                                    {isPiutang ? 'Masuk Ke Akun Kas' : 'Keluar Dari Akun Kas'}
                                                </label>
                                                <select
                                                    value={akunKasId}
                                                    onChange={(e) => setAkunKasId(e.target.value)}
                                                    required
                                                    className="w-full px-4 py-3 text-sm bg-white border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                                >
                                                    <option value="" disabled>
                                                        Pilih Akun Kas
                                                    </option>
                                                    {akunKasList.map((akun) => (
                                                        <option key={akun.id} value={akun.id}>
                                                            {akun.nama_akun} - {formatRupiah(akun.saldo)}
                                                        </option>
                                                    ))}
                                                </select>
                                                <p className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                                                    <span className={`h-2 w-2 rounded-full ${isPiutang ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                                    {isPiutang ? 'Dana diterima ke akun ini' : 'Dana dibayar dari akun ini'}
                                                </p>
                                            </div>

                                            <div className="p-4 border border-gray-200 rounded-xl bg-gray-50">
                                                <label className="block mb-2 text-sm font-semibold text-gray-700">Keterangan (Opsional)</label>
                                                <textarea
                                                    value={memo}
                                                    onChange={(e) => setMemo(e.target.value)}
                                                    rows={3}
                                                    placeholder="Tambahkan catatan jika diperlukan..."
                                                    className="w-full px-4 py-3 text-sm bg-white border border-gray-300 resize-none rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                                ></textarea>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div className="flex flex-col justify-end gap-3 px-6 py-5 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-slate-50 sm:flex-row">
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="px-6 py-3 text-sm font-medium text-gray-700 transition-all duration-300 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 hover:shadow-md"
                                        >
                                            Batal
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className={`inline-flex justify-center items-center gap-2 rounded-xl py-3 px-8 text-sm font-semibold text-white transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] ${
                                                isSubmitting
                                                    ? 'bg-gray-400 cursor-not-allowed'
                                                    : isPiutang
                                                        ? 'bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 shadow-emerald-500/30'
                                                        : 'bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 shadow-rose-500/30'
                                            }`}
                                        >
                                            {isSubmitting && <div className="w-4 h-4 border-b-2 border-white rounded-full animate-spin"></div>}
                                            {isSubmitting ? 'Menyimpan...' : isPiutang ? 'Simpan Penerimaan' : 'Simpan Pembayaran'}
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

const HutangPiutangPage = () => {
    const [activeTab, setActiveTab] = useState<'piutang' | 'hutang'>('piutang');
    const [piutangList, setPiutangList] = useState<Piutang[]>([]);
    const [hutangList, setHutangList] = useState<Hutang[]>([]);
    const [akunKasList, setAkunKasList] = useState<AkunKas[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [preselectIds, setPreselectIds] = useState<number[] | null>(null);

    // Filter tanggal state
    const [filterMode, setFilterMode] = useState<FilterMode>('SEMUA');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    // Date range calculation
    const { startDate, endDate, rangeLabel } = useMemo(() => {
        const now = new Date();
        const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

        let start: Date | null = null;
        let end: Date | null = null;
        let label = 'Semua waktu';

        if (filterMode === 'HARI_INI') {
            start = startOfDay(now);
            end = endOfDay(now);
            label = 'Hari ini';
        } else if (filterMode === 'MINGGU_INI') {
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
            if (customStart) start = startOfDay(new Date(customStart));
            if (customEnd) end = endOfDay(new Date(customEnd));
            if (customStart && customEnd) {
                label = `${new Date(customStart).toLocaleDateString('id-ID')} - ${new Date(customEnd).toLocaleDateString('id-ID')}`;
            } else {
                label = 'Periode kustom';
            }
        }

        return { startDate: start, endDate: end, rangeLabel: label };
    }, [filterMode, customStart, customEnd]);

    // Filtered lists based on date
    const filteredPiutangList = useMemo(() => {
        if (filterMode === 'SEMUA' || !startDate || !endDate) return piutangList;
        return piutangList.filter(item => {
            const d = new Date(item.tanggal_transaksi);
            return d >= startDate && d <= endDate;
        });
    }, [piutangList, filterMode, startDate, endDate]);

    const filteredHutangList = useMemo(() => {
        if (filterMode === 'SEMUA' || !startDate || !endDate) return hutangList;
        return hutangList.filter(item => {
            const d = new Date(item.tanggal_transaksi);
            return d >= startDate && d <= endDate;
        });
    }, [hutangList, filterMode, startDate, endDate]);

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true);
            const [piutangData, hutangData, akunKasData] = await Promise.all([
                api.getAllPiutang(),
                api.getAllHutang(),
                api.getAllAkunKas(),
            ]);
            setPiutangList(Array.isArray(piutangData) ? piutangData.filter((p) => p.status !== 'LUNAS') : []);
            setHutangList(Array.isArray(hutangData) ? hutangData.filter((h) => h.status !== 'LUNAS') : []);
            setAkunKasList(Array.isArray(akunKasData) ? akunKasData.filter(k => k.is_active) : []);
        } catch (err: any) {
            showToast(err.message || 'Gagal memuat data', 'error');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const summary = useMemo(() => {
        const totalPiutang = filteredPiutangList.reduce((sum, item) => sum + item.sisa_tagihan, 0);
        const totalHutang = filteredHutangList.reduce((sum, item) => sum + item.sisa_tagihan, 0);
        return { totalPiutang, totalHutang };
    }, [filteredPiutangList, filteredHutangList]);

    const dataToShow = activeTab === 'piutang' ? filteredPiutangList : filteredHutangList;
    const headerActionLabel = activeTab === 'piutang' ? 'Terima Piutang' : 'Bayar Hutang';
    const isPiutangTab = activeTab === 'piutang';

    return (
        <div className="min-h-screen p-4 bg-gray-50 sm:p-6">
            <div className="mx-auto space-y-6 max-w-7xl">
                {/* 🎨 HERO HEADER - Same style as Pembelian */}
                <div className="relative px-6 py-6 overflow-hidden text-white shadow-lg bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600 rounded-2xl">
                    {/* Decorative Icon */}
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <FaExchangeAlt className="w-32 h-32" />
                    </div>

                    <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            {/* Badge */}
                            <div className="inline-flex items-center gap-2 px-3 py-1 mb-2 text-xs font-medium border rounded-full bg-white/20 backdrop-blur-sm border-white/10">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                Modul Keuangan
                            </div>

                            {/* Title */}
                            <h1 className="text-3xl font-bold tracking-tight">
                                Buku Hutang & Piutang
                            </h1>

                            {/* Description */}
                            <p className="max-w-lg mt-1 text-sm text-blue-100">
                                Kelola semua tagihan & kewajiban pembayaran di satu tempat dengan mudah dan terorganisir.
                            </p>
                        </div>

                        {/* Button */}
                        <button
                            onClick={() => {
                                setPreselectIds(null);
                                setIsModalOpen(true);
                            }}
                            className="group flex items-center gap-2 px-5 py-3 bg-white text-blue-600 rounded-xl font-bold shadow-lg hover:shadow-xl hover:bg-blue-50 transition-all transform hover:-translate-y-0.5"
                        >
                            <FaPlus className="transition-transform duration-300 group-hover:rotate-90" />
                            <span>{headerActionLabel}</span>
                        </button>
                    </div>
                </div>

                {/* Summary Cards - Enhanced */}
                <div className="p-6 bg-white border border-gray-100 shadow-lg rounded-2xl shadow-gray-200/50">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="flex items-center justify-center w-12 h-12 shadow-lg bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl shadow-blue-100">
                            <ChartBarIcon className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Ringkasan Keuangan</h2>
                            <p className="text-sm text-gray-500">Total piutang dan hutang yang belum lunas</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        {/* Piutang Card */}
                        <div 
                            onClick={() => setActiveTab('piutang')}
                            className={`group relative overflow-hidden p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 transform hover:-translate-y-1 ${
                                activeTab === 'piutang' 
                                    ? 'bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 border-emerald-300 shadow-xl shadow-emerald-100' 
                                    : 'bg-gradient-to-br from-emerald-50/50 to-green-50/30 border-emerald-100 hover:border-emerald-300 hover:shadow-lg'
                            }`}
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-emerald-200/30 to-transparent" />
                            <div className="relative">
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`p-3 rounded-xl transition-all duration-300 ${activeTab === 'piutang' ? 'bg-gradient-to-br from-emerald-500 to-green-500 shadow-lg shadow-emerald-300' : 'bg-emerald-100 group-hover:bg-emerald-200'}`}>
                                        <ArrowTrendingDownIcon className={`w-6 h-6 ${activeTab === 'piutang' ? 'text-white' : 'text-emerald-600'}`} />
                                    </div>
                                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${activeTab === 'piutang' ? 'bg-emerald-200 text-emerald-800' : 'bg-emerald-100 text-emerald-700'}`}>
                                        {filteredPiutangList.length} Tagihan
                                    </span>
                                </div>
                                <p className="mb-2 text-sm font-medium text-gray-600">Total Piutang Belum Lunas</p>
                                <p className={`text-3xl font-extrabold tabular-nums ${activeTab === 'piutang' ? 'text-emerald-600' : 'text-emerald-500'}`}>
                                    {formatRupiah(summary.totalPiutang)}
                                </p>
                                <p className="mt-2 text-xs text-gray-500">
                                    <span className="font-medium text-emerald-600">↓ Akan diterima</span> dari pelanggan
                                </p>
                            </div>
                        </div>
                        
                        {/* Hutang Card */}
                        <div 
                            onClick={() => setActiveTab('hutang')}
                            className={`group relative overflow-hidden p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 transform hover:-translate-y-1 ${
                                activeTab === 'hutang' 
                                    ? 'bg-gradient-to-br from-rose-50 via-red-50 to-pink-50 border-rose-300 shadow-xl shadow-rose-100' 
                                    : 'bg-gradient-to-br from-rose-50/50 to-red-50/30 border-rose-100 hover:border-rose-300 hover:shadow-lg'
                            }`}
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-rose-200/30 to-transparent" />
                            <div className="relative">
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`p-3 rounded-xl transition-all duration-300 ${activeTab === 'hutang' ? 'bg-gradient-to-br from-rose-500 to-red-500 shadow-lg shadow-rose-300' : 'bg-rose-100 group-hover:bg-rose-200'}`}>
                                        <ArrowTrendingUpIcon className={`w-6 h-6 ${activeTab === 'hutang' ? 'text-white' : 'text-rose-600'}`} />
                                    </div>
                                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${activeTab === 'hutang' ? 'bg-rose-200 text-rose-800' : 'bg-rose-100 text-rose-700'}`}>
                                        {filteredHutangList.length} Tagihan
                                    </span>
                                </div>
                                <p className="mb-2 text-sm font-medium text-gray-600">Total Hutang Belum Dibayar</p>
                                <p className={`text-3xl font-extrabold tabular-nums ${activeTab === 'hutang' ? 'text-rose-600' : 'text-rose-500'}`}>
                                    {formatRupiah(summary.totalHutang)}
                                </p>
                                <p className="mt-2 text-xs text-gray-500">
                                    <span className="font-medium text-rose-600">↑ Akan dibayar</span> ke pemasok
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    {/* Net Position */}
                    <div className="p-4 mt-6 border border-gray-200 bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100">
                                    <BanknotesIcon className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Posisi Bersih</p>
                                    <p className="text-xs text-gray-400">Piutang - Hutang</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className={`text-2xl font-extrabold tabular-nums ${summary.totalPiutang - summary.totalHutang >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {summary.totalPiutang - summary.totalHutang >= 0 ? '+' : ''}{formatRupiah(summary.totalPiutang - summary.totalHutang)}
                                </p>
                                <p className={`text-xs font-medium ${summary.totalPiutang - summary.totalHutang >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {summary.totalPiutang - summary.totalHutang >= 0 ? 'Posisi Surplus' : 'Posisi Defisit'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filter Tabs - Di atas table */}
                <FilterTabs
                    activeTab={filterMode}
                    onTabChange={setFilterMode}
                    dateFrom={customStart}
                    dateTo={customEnd}
                    onDateFromChange={setCustomStart}
                    onDateToChange={setCustomEnd}
                />

                {/* Tabs + Tabel */}
                <div className="overflow-hidden bg-white border border-gray-100 shadow-lg rounded-2xl shadow-gray-200/50">
                    <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-slate-50">
                        <nav className="flex gap-2">
                            <button
                                onClick={() => setActiveTab('piutang')}
                                className={`relative px-5 py-3 text-sm font-semibold rounded-xl transition-all duration-300 ${
                                    activeTab === 'piutang'
                                        ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/30'
                                        : 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50'
                                }`}
                            >
                                <span className="flex items-center gap-2">
                                    <FaArrowDown className="w-4 h-4" />
                                    Piutang
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                        activeTab === 'piutang' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'
                                    }`}>
                                        {filteredPiutangList.length}
                                    </span>
                                </span>
                            </button>
                            <button
                                onClick={() => setActiveTab('hutang')}
                                className={`relative px-5 py-3 text-sm font-semibold rounded-xl transition-all duration-300 ${
                                    activeTab === 'hutang'
                                        ? 'bg-gradient-to-r from-rose-500 to-red-500 text-white shadow-lg shadow-rose-500/30'
                                        : 'text-gray-600 hover:text-rose-600 hover:bg-rose-50'
                                }`}
                            >
                                <span className="flex items-center gap-2">
                                    <FaArrowUp className="w-4 h-4" />
                                    Hutang
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                        activeTab === 'hutang' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-700'
                                    }`}>
                                        {filteredHutangList.length}
                                    </span>
                                </span>
                            </button>
                        </nav>
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden overflow-x-auto lg:block">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className={`${isPiutangTab ? 'bg-gradient-to-r from-emerald-50 to-green-50' : 'bg-gradient-to-r from-rose-50 to-red-50'}`}>
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold tracking-wider text-left text-gray-600 uppercase">Tanggal</th>
                                <th className="px-6 py-4 text-xs font-bold tracking-wider text-left text-gray-600 uppercase">Jatuh Tempo</th>
                                <th className="px-6 py-4 text-xs font-bold tracking-wider text-left text-gray-600 uppercase">
                                    {isPiutangTab ? 'Pelanggan' : 'Pemasok'}
                                </th>
                                <th className="px-6 py-4 text-xs font-bold tracking-wider text-left text-gray-600 uppercase">Sumber</th>
                                <th className="px-6 py-4 text-xs font-bold tracking-wider text-right text-gray-600 uppercase">Total</th>
                                <th className="px-6 py-4 text-xs font-bold tracking-wider text-right text-gray-600 uppercase">Terbayar</th>
                                <th className="px-6 py-4 text-xs font-bold tracking-wider text-right text-gray-600 uppercase">Sisa</th>
                                <th className="px-6 py-4 text-xs font-bold tracking-wider text-center text-gray-600 uppercase">Aksi</th>
                            </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                            {isLoading ? (
                                Array.from({ length: 4 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded" /></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded" /></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded" /></td>
                                        <td className="px-6 py-4"><div className="h-6 bg-gray-100 rounded" /></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded" /></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded" /></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded" /></td>
                                        <td className="px-6 py-4"><div className="h-8 bg-gray-100 rounded" /></td>
                                    </tr>
                                ))
                            ) : dataToShow.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-16">
                                        <div className="text-center text-gray-500">
                                            <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                                                isPiutangTab ? 'bg-green-100' : 'bg-red-100'
                                            }`}>
                                                {isPiutangTab ? (
                                                    <FaArrowDown className="w-8 h-8 text-green-400" />
                                                ) : (
                                                    <FaArrowUp className="w-8 h-8 text-red-400" />
                                                )}
                                            </div>
                                            <p className="mb-1 font-semibold text-gray-700">Belum ada data {isPiutangTab ? 'piutang' : 'hutang'}</p>
                                            <p className="text-sm text-gray-500">Semua tagihan sudah lunas atau belum ada transaksi</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                dataToShow.map((item, idx) => (
                                    <tr 
                                        key={item.id} 
                                        className={`group transition-all duration-300 hover:shadow-md ${
                                            isPiutangTab 
                                                ? 'hover:bg-gradient-to-r hover:from-emerald-50/50 hover:to-transparent' 
                                                : 'hover:bg-gradient-to-r hover:from-rose-50/50 hover:to-transparent'
                                        }`}
                                        style={{ animationDelay: `${idx * 50}ms` }}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 ${
                                                    isPiutangTab ? 'bg-gradient-to-br from-emerald-100 to-green-100' : 'bg-gradient-to-br from-rose-100 to-red-100'
                                                }`}>
                                                    <FaCalendarAlt className={`w-4 h-4 ${isPiutangTab ? 'text-emerald-600' : 'text-rose-600'}`} />
                                                </div>
                                                <span className="text-sm font-medium text-gray-700">
                                                        {new Date(item.tanggal_transaksi).toLocaleDateString('id-ID', {
                                                            day: '2-digit',
                                                            month: 'short',
                                                            year: 'numeric'
                                                        })}
                                                    </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <ClockIcon className="w-4 h-4 text-gray-400" />
                                                <span className="text-sm text-gray-700">
                                                        {new Date(item.jatuh_tempo).toLocaleDateString('id-ID', {
                                                            day: '2-digit',
                                                            month: 'short',
                                                            year: 'numeric'
                                                        })}
                                                    </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <p className="text-sm font-semibold text-gray-900">
                                                {(item as Hutang).nama_pemasok || (item as Piutang).nama_pelanggan}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="inline-flex items-center gap-2 px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-200 rounded-full">
                                                    <FaFileInvoiceDollar className="w-3 h-3" />
                                                    {item.source_type}-{item.source_id}
                                                </span>
                                        </td>
                                        <td className="px-6 py-4 text-right whitespace-nowrap">
                                            <span className="text-sm text-gray-700 tabular-nums">{formatRupiah(item.nilai_total)}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right whitespace-nowrap">
                                            <span className="text-sm font-medium text-green-600 tabular-nums">{formatRupiah(item.nilai_terbayar)}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right whitespace-nowrap">
                                                <span className={`text-sm font-bold tabular-nums ${isPiutangTab ? 'text-green-600' : 'text-red-600'}`}>
                                                    {formatRupiah(item.sisa_tagihan)}
                                                </span>
                                        </td>
                                        <td className="px-6 py-4 text-center whitespace-nowrap">
                                            <button
                                                onClick={() => {
                                                    setPreselectIds([item.id]);
                                                    setIsModalOpen(true);
                                                }}
                                                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-semibold shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 active:scale-[0.98] ${
                                                    isPiutangTab
                                                        ? 'bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 shadow-emerald-500/30'
                                                        : 'bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 shadow-rose-500/30'
                                                }`}
                                                title={isPiutangTab ? 'Terima Piutang' : 'Bayar Hutang'}
                                            >
                                                {isPiutangTab ? (
                                                    <>
                                                        <FaArrowDown className="w-3 h-3" />
                                                        Terima
                                                    </>
                                                ) : (
                                                    <>
                                                        <FaArrowUp className="w-3 h-3" />
                                                        Bayar
                                                    </>
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="p-4 lg:hidden">
                        {isLoading ? (
                            <div className="space-y-4">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="h-48 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 animate-pulse" />
                                ))}
                            </div>
                        ) : dataToShow.length === 0 ? (
                            <div className="py-16 text-center">
                                <div className={`w-20 h-20 mx-auto mb-5 rounded-2xl flex items-center justify-center ${
                                    isPiutangTab ? 'bg-gradient-to-br from-emerald-100 to-green-100' : 'bg-gradient-to-br from-rose-100 to-red-100'
                                }`}>
                                    {isPiutangTab ? (
                                        <FaArrowDown className="w-10 h-10 text-emerald-300" />
                                    ) : (
                                        <FaArrowUp className="w-10 h-10 text-rose-300" />
                                    )}
                                </div>
                                <p className="mb-1 text-lg font-bold text-gray-700">Belum ada data {isPiutangTab ? 'piutang' : 'hutang'}</p>
                                <p className="text-sm text-gray-500">Semua tagihan sudah lunas atau belum ada transaksi</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {dataToShow.map((item, idx) => (
                                    <div
                                        key={item.id}
                                        className={`rounded-2xl border-2 p-5 shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                                            isPiutangTab
                                                ? 'bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 border-emerald-200'
                                                : 'bg-gradient-to-br from-rose-50 via-red-50 to-pink-50 border-rose-200'
                                        }`}
                                        style={{ animationDelay: `${idx * 50}ms` }}
                                    >
                                        <div className="space-y-4">
                                            {/* Header */}
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <p className="text-lg font-bold text-gray-900">
                                                        {(item as Hutang).nama_pemasok || (item as Piutang).nama_pelanggan}
                                                    </p>
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium mt-2 ${
                                                        isPiutangTab ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                                    }`}>
                                                        <FaFileInvoiceDollar className="w-3 h-3" />
                                                        {item.source_type}-{item.source_id}
                                                    </span>
                                                </div>
                                                <div className={`p-3 rounded-xl shadow-lg ${isPiutangTab ? 'bg-gradient-to-br from-emerald-500 to-green-500' : 'bg-gradient-to-br from-rose-500 to-red-500'}`}>
                                                    {isPiutangTab ? (
                                                        <FaArrowDown className="w-5 h-5 text-white" />
                                                    ) : (
                                                        <FaArrowUp className="w-5 h-5 text-white" />
                                                    )}
                                                </div>
                                            </div>

                                            {/* Tanggal */}
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="flex items-center gap-2 p-3 bg-white/60 rounded-xl">
                                                    <FaCalendarAlt className={`w-4 h-4 ${isPiutangTab ? 'text-emerald-500' : 'text-rose-500'}`} />
                                                    <div>
                                                        <p className="text-xs text-gray-500">Tanggal</p>
                                                        <p className="text-sm font-semibold text-gray-800">
                                                            {new Date(item.tanggal_transaksi).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 p-3 bg-white/60 rounded-xl">
                                                    <ClockIcon className={`w-4 h-4 ${isPiutangTab ? 'text-emerald-500' : 'text-rose-500'}`} />
                                                    <div>
                                                        <p className="text-xs text-gray-500">Jatuh Tempo</p>
                                                        <p className="text-sm font-semibold text-gray-800">
                                                            {new Date(item.jatuh_tempo).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Nilai */}
                                            <div className={`border-t pt-4 ${isPiutangTab ? 'border-emerald-200' : 'border-rose-200'}`}>
                                                <div className="grid grid-cols-3 gap-3">
                                                    <div className="p-2 text-center bg-white/60 rounded-xl">
                                                        <p className="mb-1 text-xs text-gray-500">Total</p>
                                                        <p className="text-sm font-bold text-gray-800 tabular-nums">
                                                            {(item.nilai_total / 1000).toFixed(0)}K
                                                        </p>
                                                    </div>
                                                    <div className="p-2 text-center bg-white/60 rounded-xl">
                                                        <p className="mb-1 text-xs text-gray-500">Terbayar</p>
                                                        <p className="text-sm font-bold text-emerald-600 tabular-nums">
                                                            {(item.nilai_terbayar / 1000).toFixed(0)}K
                                                        </p>
                                                    </div>
                                                    <div className={`text-center p-2 rounded-xl ${isPiutangTab ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                                                        <p className="mb-1 text-xs text-gray-500">Sisa</p>
                                                        <p className={`text-sm font-extrabold tabular-nums ${isPiutangTab ? 'text-emerald-700' : 'text-rose-700'}`}>
                                                            {(item.sisa_tagihan / 1000).toFixed(0)}K
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Action Button */}
                                            <button
                                                onClick={() => {
                                                    setPreselectIds([item.id]);
                                                    setIsModalOpen(true);
                                                }}
                                                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-semibold shadow-lg transition-all duration-300 hover:shadow-xl active:scale-[0.98] ${
                                                    isPiutangTab
                                                        ? 'bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 shadow-emerald-500/30'
                                                        : 'bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 shadow-rose-500/30'
                                                }`}
                                            >
                                                {isPiutangTab ? (
                                                    <>
                                                        <FaArrowDown className="w-4 h-4" />
                                                        Terima Piutang
                                                    </>
                                                ) : (
                                                    <>
                                                        <FaArrowUp className="w-4 h-4" />
                                                        Bayar Hutang
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <PaymentModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    targetType={isPiutangTab ? 'PIUTANG' : 'HUTANG'}
                    items={dataToShow}
                    akunKasList={akunKasList}
                    onPaymentSuccess={fetchData}
                    preselectIds={preselectIds || []}
                />
            </div>
        </div>
    );
};

export default HutangPiutangPage;