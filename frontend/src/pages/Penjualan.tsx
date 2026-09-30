import React, { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as api from '../services/api';
import { Produk, StokProduk, TransaksiPenjualan, AkunKas } from '../types';
import { Dialog, Transition } from '@headlessui/react';
import {
    CalendarDaysIcon,
    CurrencyDollarIcon,
    ExclamationTriangleIcon,
    MagnifyingGlassIcon,
    PlusIcon,
    XMarkIcon,
    XCircleIcon,
    CreditCardIcon,
} from '@heroicons/react/24/solid';
import { FaBowlFood } from 'react-icons/fa6';
import { GiPowder, GiStonePile } from 'react-icons/gi';
import { FaEdit, FaTrashAlt, FaUserTie } from 'react-icons/fa';
import Pagination from '../components/Pagination';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContexts';

// ---------- Utilities ----------
const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    (window as any).addToast?.(message, type);
};
const formatRupiah = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
const isSameDate = (a: Date | string, b: Date) => {
    const da = new Date(a);
    return (
        da.getFullYear() === b.getFullYear() &&
        da.getMonth() === b.getMonth() &&
        da.getDate() === b.getDate()
    );
};

// ---------- Local Types ----------
interface ProdukDenganStok {
    produk: Produk;
    stok: number;
}

// ---------- Summary Card ----------
const SummaryCard: React.FC<{
    title: string;
    value: string;
    icon: React.ReactNode;
    bgColor?: string;
    valueColor?: string;
    gradient?: string;
    shadow?: string;
    onClick?: () => void;
}> = ({ title, value, icon, bgColor = 'bg-blue-50', valueColor = 'text-gray-900', gradient = 'from-blue-500 to-indigo-600', shadow = 'shadow-blue-500/25', onClick }) => (
    <div
        className={`group relative overflow-hidden ${bgColor} border border-gray-100 p-5 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 w-full cursor-pointer`}
        onClick={onClick}
    >
        {/* Decorative blob */}
        <div className="absolute w-32 h-32 rounded-full -top-10 -right-10 bg-gradient-to-br from-white/40 to-transparent blur-2xl" />
        
        <div className="relative flex items-center justify-between">
            <div className="flex-1">
                <p className="mb-2 text-sm font-semibold text-gray-600">{title}</p>
                <p className={`text-2xl lg:text-3xl font-extrabold ${valueColor} tabular-nums`}>{value}</p>
            </div>
            <div className={`bg-gradient-to-br ${gradient} p-4 rounded-2xl shadow-lg ${shadow} group-hover:scale-110 transition-transform duration-300`}>
                <div className="text-white">{icon}</div>
            </div>
        </div>
    </div>
);

// ---------- Filter Tabs (rapi sesuai header biru) ----------
type FilterType = 'hari_ini' | 'minggu_ini' | 'bulan_ini' | 'kustom';

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
        <div className="p-4 border border-blue-100 shadow-sm bg-white/95 rounded-2xl sm:p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap gap-2">
                    {tabs.map((t) => {
                        const isActive = activeTab === (t.id as FilterType);
                        return (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => onTabChange(t.id as FilterType)}
                                className={`relative inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                                    isActive
                                        ? 'bg-blue-600 text-white shadow-md -translate-y-0.5'
                                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-blue-50'
                                }`}
                            >
                                <span
                                    className={`flex items-center justify-center w-7 h-7 rounded-lg ${
                                        isActive ? 'bg-white/20' : 'bg-gray-100'
                                    }`}
                                >
                                    <CalendarDaysIcon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                                </span>
                                <span>{t.label}</span>
                            </button>
                        );
                    })}
                </div>

                {activeTab === 'kustom' && (
                    <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-2">
                            <CalendarDaysIcon className="w-5 h-5 text-gray-400" />
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => onDateFromChange(e.target.value)}
                                className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                            />
                            <span className="text-gray-400">-</span>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => onDateToChange(e.target.value)}
                                className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                            />
                        </div>
                        <button
                            onClick={onApplyCustom}
                            className="px-4 py-2 text-sm font-semibold text-white transition-colors bg-blue-600 rounded-xl hover:bg-blue-700"
                        >
                            Terapkan
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// ---------- Sale Form Modal (versi cantik & interaktif) ----------
const SaleFormModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (payload: api.InputPenjualan) => void;
    isEditing: boolean;
    initialData: TransaksiPenjualan | null;
    produkList: ProdukDenganStok[];
    akunKasList: AkunKas[];
    isSubmitting: boolean;
}> = ({
          isOpen,
          onClose,
          onSubmit,
          isEditing,
          initialData,
          produkList,
          akunKasList,
          isSubmitting,
      }) => {
    const [produkId, setProdukId] = useState<string>('');
    const [jumlahKg, setJumlahKg] = useState<string>('');
    const [hargaPerKg, setHargaPerKg] = useState<string>('');
    const [namaPelanggan, setNamaPelanggan] = useState<string>('');
    const [statusPembayaran, setStatusPembayaran] =
        useState<'LUNAS' | 'SEBAGIAN' | 'BELUM_LUNAS'>('BELUM_LUNAS');
    const [nilaiTerbayar, setNilaiTerbayar] = useState<string>('');
    const [akunKasId, setAkunKasId] = useState<string>('');

    const totalHarga = useMemo(
        () => (parseFloat(jumlahKg) || 0) * (parseFloat(hargaPerKg) || 0),
        [jumlahKg, hargaPerKg],
    );

    const selectedProduk = useMemo(
        () => produkList.find((p) => p.produk.id === Number(produkId)) || null,
        [produkId, produkList],
    );

    const isOverStok =
        selectedProduk && jumlahKg !== '' && Number(jumlahKg) > (selectedProduk?.stok || 0);

    const sisaStokSetelahJual = useMemo(() => {
        if (!selectedProduk || !jumlahKg) return null;
        const sisa = selectedProduk.stok - Number(jumlahKg || 0);
        return sisa < 0 ? 0 : sisa;
    }, [selectedProduk, jumlahKg]);

    const nilaiBayar = useMemo(() => {
        if (statusPembayaran === 'SEBAGIAN') return parseFloat(nilaiTerbayar) || 0;
        if (statusPembayaran === 'LUNAS') return totalHarga;
        return 0;
    }, [statusPembayaran, nilaiTerbayar, totalHarga]);

    const sisaPembayaran = Math.max(totalHarga - nilaiBayar, 0);

    const steps = [
        { id: 1, label: 'Pilih Produk' },
        { id: 2, label: 'Jumlah & Harga' },
        { id: 3, label: 'Pembayaran' },
    ];
    const currentStep = useMemo(() => {
        if (!produkId) return 1;
        if (!jumlahKg || !hargaPerKg) return 2;
        return 3;
    }, [produkId, jumlahKg, hargaPerKg]);

    const statusOptions: {
        value: 'BELUM_LUNAS' | 'SEBAGIAN' | 'LUNAS';
        label: string;
        short: string;
        helper: string;
    }[] = [
        {
            value: 'BELUM_LUNAS',
            label: 'Hutang (Bayar Nanti)',
            short: 'Piutang',
            helper: 'Tidak ada kas masuk sekarang, transaksi dicatat sebagai piutang pelanggan.',
        },
        {
            value: 'SEBAGIAN',
            label: 'Bayar Sebagian (DP)',
            short: 'DP',
            helper: 'Sebagian dibayar sekarang, sisa tetap tercatat sebagai piutang.',
        },
        {
            value: 'LUNAS',
            label: 'Lunas',
            short: 'Lunas',
            helper: 'Seluruh nilai penjualan dibayar dan langsung masuk ke kas.',
        },
    ];
    const activeStatusObj =
        statusOptions.find((opt) => opt.value === statusPembayaran) || statusOptions[0];

    useEffect(() => {
        if (isOpen) {
            if (isEditing && initialData) {
                setProdukId(String((initialData as any).produk_id ?? ''));
                setJumlahKg(String(initialData.jumlah_kg ?? ''));
                setHargaPerKg(String(initialData.harga_jual_per_kg ?? ''));
                setNamaPelanggan(String(initialData.nama_pelanggan ?? ''));
                setStatusPembayaran((initialData as any).status_pembayaran || 'BELUM_LUNAS');
                setNilaiTerbayar(String((initialData as any).nilai_terbayar || ''));
                setAkunKasId(akunKasList.length > 0 ? akunKasList[0].id.toString() : '');
            } else {
                setProdukId('');
                setJumlahKg('');
                setHargaPerKg('');
                setNamaPelanggan('');
                setStatusPembayaran('BELUM_LUNAS');
                setNilaiTerbayar('');
                setAkunKasId(akunKasList.length > 0 ? akunKasList[0].id.toString() : '');
            }
        }
    }, [isEditing, initialData, isOpen, akunKasList]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const bayar = parseFloat(nilaiTerbayar) || 0;

        if ((statusPembayaran === 'SEBAGIAN' || statusPembayaran === 'LUNAS') && !akunKasId) {
            showToast('Akun Kas harus dipilih untuk transaksi pembayaran!', 'error');
            return;
        }
        if (statusPembayaran === 'SEBAGIAN' && (bayar <= 0 || bayar >= totalHarga)) {
            showToast('Untuk pembayaran sebagian, nilai bayar harus > 0 dan < total harga.', 'error');
            return;
        }
        if (isOverStok) {
            showToast('Jumlah penjualan melebihi stok tersedia.', 'error');
            return;
        }

        const payload: api.InputPenjualan = {
            produk_id: Number(produkId),
            jumlah_kg: Number(jumlahKg),
            harga_jual_per_kg: Number(hargaPerKg),
            nama_pelanggan: namaPelanggan.trim(),
            status_pembayaran: statusPembayaran,
            nilai_terbayar: statusPembayaran === 'SEBAGIAN' ? bayar : 0,
            akun_kas_id: parseInt(akunKasId, 10),
        };
        onSubmit(payload);
    };

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
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-full p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95 translate-y-2"
                            enterTo="opacity-100 scale-100 translate-y-0"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100 translate-y-0"
                            leaveTo="opacity-0 scale-95 translate-y-2"
                        >
                            <Dialog.Panel className="w-full max-w-3xl overflow-hidden transition-all transform bg-white border border-blue-100 shadow-2xl rounded-3xl">
                                {/* Header */}
                                <div className="relative px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 sm:px-8 sm:py-5">
                                    <Dialog.Title className="flex items-center gap-3 text-lg font-bold text-white sm:text-xl">
                                        <div className="p-2.5 bg-white/20 rounded-xl">
                                            <CurrencyDollarIcon className="w-5 h-5" />
                                        </div>
                                        {isEditing ? 'Edit Penjualan' : 'Catat Penjualan Baru'}
                                    </Dialog.Title>
                                    <p className="mt-1 text-xs text-blue-100 sm:text-sm">
                                        Isi detail produk, jumlah, dan metode pembayaran dengan lebih terstruktur.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="absolute p-2 transition-colors rounded-full top-4 right-4 text-white/80 hover:text-white hover:bg-white/20"
                                    >
                                        <XMarkIcon className="w-5 h-5" />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="p-5 space-y-6 sm:p-6">
                                    {/* Step indicator */}
                                    <div className="mb-2">
                                        <ol className="flex items-center justify-between gap-2">
                                            {steps.map((step, idx) => {
                                                const active = step.id <= currentStep;
                                                return (
                                                    <li key={step.id} className="flex items-center flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <div
                                                                className={`flex items-center justify-center w-8 h-8 rounded-full border-2 text-xs font-semibold ${
                                                                    active
                                                                        ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                                                                        : 'border-gray-300 bg-white text-gray-500'
                                                                }`}
                                                            >
                                                                {step.id}
                                                            </div>
                                                            <span
                                                                className={`hidden sm:inline text-xs font-medium ${
                                                                    active ? 'text-blue-700' : 'text-gray-500'
                                                                }`}
                                                            >
                                {step.label}
                              </span>
                                                        </div>
                                                        {idx < steps.length - 1 && (
                                                            <div className={`flex-1 h-px ml-3 ${active ? 'bg-blue-300' : 'bg-gray-200'}`} />
                                                        )}
                                                    </li>
                                                );
                                            })}
                                        </ol>
                                    </div>

                                    {/* Main grid: form kiri + ringkasan kanan */}
                                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                                        {/* LEFT: fields utama */}
                                        <div className="space-y-4 lg:col-span-2">
                                            {/* Produk */}
                                            <div className="p-5 border border-blue-100 bg-blue-50 rounded-2xl">
                                                <div className="flex items-center justify-between mb-3">
                                                    <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900 sm:text-base">
                                                        <FaBowlFood className="w-4 h-4 text-blue-600" />
                                                        Produk yang Dijual
                                                    </h4>
                                                    {selectedProduk && (
                                                        <span className="text-xs font-medium text-blue-700 bg-white/70 px-2.5 py-1 rounded-full">
                              Stok: {selectedProduk.stok.toLocaleString('id-ID')} Kg
                            </span>
                                                    )}
                                                </div>
                                                <select
                                                    value={produkId}
                                                    onChange={(e) => setProdukId(e.target.value)}
                                                    className="w-full px-4 py-3 text-sm transition-colors bg-white border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                                    required
                                                    disabled={isEditing}
                                                >
                                                    <option value="" disabled>
                                                        Pilih Produk yang Dijual
                                                    </option>
                                                    {produkList.map((item) => (
                                                        <option key={item.produk.id} value={item.produk.id}>
                                                            {item.produk.nama_produk} (Stok: {item.stok.toLocaleString('id-ID')} Kg)
                                                        </option>
                                                    ))}
                                                </select>
                                                {!selectedProduk && (
                                                    <p className="mt-2 text-xs text-gray-500">
                                                        Pilih produk terlebih dahulu untuk melihat stok dan total harga.
                                                    </p>
                                                )}
                                            </div>

                                            {/* Jumlah & Harga */}
                                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                                <div className="p-4 border border-gray-200 rounded-2xl bg-gray-50">
                                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                        Jumlah (Kg)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        inputMode="decimal"
                                                        step="0.1"
                                                        min="0"
                                                        className={`w-full rounded-xl px-4 py-3 text-sm border bg-white tabular-nums focus:ring-2 transition-colors ${
                                                            isOverStok
                                                                ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
                                                                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                                                        }`}
                                                        value={jumlahKg}
                                                        onChange={(e) => setJumlahKg(e.target.value)}
                                                        required
                                                    />
                                                    {isOverStok && selectedProduk && (
                                                        <p className="mt-2 text-xs text-red-600">
                                                            Jumlah melebihi stok tersedia ({selectedProduk.stok.toLocaleString('id-ID')} Kg).
                                                        </p>
                                                    )}
                                                    {!isOverStok && selectedProduk && (
                                                        <p className="mt-2 text-xs text-gray-500">
                                                            Stok tersedia:{' '}
                                                            <span className="font-semibold">
                                {selectedProduk.stok.toLocaleString('id-ID')} Kg
                              </span>
                                                            {sisaStokSetelahJual !== null && (
                                                                <>
                                                                    {' '}&bull; Sisa setelah jual:{' '}
                                                                    <span className="font-semibold">
                                    {sisaStokSetelahJual.toLocaleString('id-ID')} Kg
                                  </span>
                                                                </>
                                                            )}
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="p-4 border border-gray-200 rounded-2xl bg-gray-50">
                                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                        Harga / Kg (Rp)
                                                    </label>
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                                                            <span className="text-sm font-medium text-gray-500">Rp</span>
                                                        </div>
                                                        <input
                                                            type="number"
                                                            inputMode="numeric"
                                                            min="0"
                                                            className="w-full py-3 pl-10 pr-4 text-sm bg-white border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 tabular-nums"
                                                            value={hargaPerKg}
                                                            onChange={(e) => setHargaPerKg(e.target.value)}
                                                            required
                                                        />
                                                    </div>
                                                    <p className="mt-2 text-xs text-gray-500">
                                                        Harga jual per kilogram. Contoh: <span className="font-mono">9500</span>.
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Nama pelanggan */}
                                            <div className="p-4 border border-gray-200 rounded-2xl bg-gray-50">
                                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                    Nama Pelanggan <span className="text-gray-400">(opsional)</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Nama pelanggan"
                                                    className="w-full px-4 py-3 text-sm bg-white border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                                    value={namaPelanggan}
                                                    onChange={(e) => setNamaPelanggan(e.target.value)}
                                                />
                                                <p className="mt-2 text-xs text-gray-500">
                                                    Bisa dikosongkan bila penjualan tidak perlu dicatat atas nama pelanggan tertentu.
                                                </p>
                                            </div>
                                        </div>

                                        {/* RIGHT: ringkasan realtime */}
                                        <aside className="space-y-4 lg:col-span-1">
                                            <div className="p-4 border border-blue-100 shadow-sm rounded-2xl bg-gradient-to-b from-blue-50 to-white">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div>
                                                        <p className="text-xs font-semibold text-blue-700">
                                                            Ringkasan Transaksi
                                                        </p>
                                                        <p className="text-[11px] text-blue-500">
                                                            Update otomatis saat kamu mengisi form.
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center justify-center bg-white shadow-sm w-9 h-9 rounded-xl">
                                                        <CurrencyDollarIcon className="w-5 h-5 text-blue-600" />
                                                    </div>
                                                </div>

                                                <div className="space-y-2 text-xs">
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-500">Produk</span>
                                                        <span className="font-semibold text-gray-900 max-w-[150px] text-right truncate">
                              {selectedProduk ? selectedProduk.produk.nama_produk : '-'}
                            </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-500">Jumlah</span>
                                                        <span className="font-semibold text-gray-900 tabular-nums">
                              {jumlahKg || '0'} Kg
                            </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-500">Harga / Kg</span>
                                                        <span className="font-semibold text-gray-900 tabular-nums">
                              {hargaPerKg ? formatRupiah(Number(hargaPerKg)) : 'Rp 0'}
                            </span>
                                                    </div>

                                                    <div className="my-2 border-t border-blue-100" />

                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-semibold text-gray-600">Total</span>
                                                        <span className="text-lg font-extrabold text-blue-700 tabular-nums">
                              {formatRupiah(totalHarga || 0)}
                            </span>
                                                    </div>
                                                    <div className="flex justify-between text-[11px]">
                                                        <span className="text-gray-500">Dibayar</span>
                                                        <span className="font-semibold text-emerald-600 tabular-nums">
                              {formatRupiah(nilaiBayar || 0)}
                            </span>
                                                    </div>
                                                    <div className="flex justify-between text-[11px]">
                                                        <span className="text-gray-500">Sisa Bayar</span>
                                                        <span className="font-semibold text-amber-600 tabular-nums">
                              {formatRupiah(sisaPembayaran || 0)}
                            </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3 text-[11px] text-gray-500 space-y-1">
                                                <p className="font-semibold text-gray-700">Tips</p>
                                                <ul className="space-y-1 list-disc list-inside">
                                                    <li>Pastikan jumlah tidak melebihi stok tersedia.</li>
                                                    <li>Sesuaikan status pembayaran agar arus kas & piutang rapi.</li>
                                                    <li>Periksa ringkasan sebelum klik Simpan.</li>
                                                </ul>
                                            </div>
                                        </aside>
                                    </div>

                                    {/* Detail Pembayaran */}
                                    <div className="p-5 space-y-4 border border-blue-200 bg-blue-50 rounded-2xl">
                                        <div className="flex items-center justify-between">
                                            <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-800 sm:text-base">
                                                <CreditCardIcon className="w-5 h-5 text-blue-600" />
                                                Detail Pembayaran
                                            </h4>
                                            <span className="text-[11px] text-blue-600 font-medium bg-white/70 px-2 py-0.5 rounded-full">
                        Langkah 3 dari 3
                      </span>
                                        </div>

                                        {/* Status segmented */}
                                        <div className="space-y-2">
                                            <p className="mb-1 text-xs font-semibold text-gray-700">Status Pembayaran</p>
                                            <div className="flex flex-wrap gap-2">
                                                {statusOptions.map((opt) => {
                                                    const active = opt.value === statusPembayaran;
                                                    return (
                                                        <button
                                                            key={opt.value}
                                                            type="button"
                                                            onClick={() => setStatusPembayaran(opt.value)}
                                                            className={`flex-1 min-w-[120px] inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium border transition-all ${
                                                                active
                                                                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                                    : 'bg-white text-gray-700 border-gray-200 hover:bg-blue-50'
                                                            }`}
                                                        >
                                                            <span className={`w-2 h-2 rounded-full ${active ? 'bg-blue-200' : 'bg-gray-300'}`} />
                                                            <span className="truncate">{opt.label}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <p className="text-[11px] text-gray-600">{activeStatusObj.helper}</p>
                                        </div>

                                        {/* DP jika SEBAGIAN */}
                                        {statusPembayaran === 'SEBAGIAN' && (
                                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                        Jumlah DP (Rp)
                                                    </label>
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                                                            <span className="text-sm font-medium text-gray-500">Rp</span>
                                                        </div>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={nilaiTerbayar}
                                                            onChange={(e) => setNilaiTerbayar(e.target.value)}
                                                            required
                                                            className="w-full py-3 pl-10 pr-4 text-sm border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                                            placeholder="0"
                                                        />
                                                    </div>
                                                    <p className="text-[11px] text-gray-500 mt-1">
                                                        DP harus lebih kecil dari total ({formatRupiah(totalHarga)}).
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Akun kas jika ada uang masuk */}
                                        {(statusPembayaran === 'SEBAGIAN' || statusPembayaran === 'LUNAS') && (
                                            <div className="pt-2">
                                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                    Masuk ke Akun Kas <span className="text-red-500">*</span>
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
                                                            {akun.nama_akun} ({formatRupiah(akun.saldo)})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer buttons */}
                                    <div className="flex flex-col justify-end gap-3 pt-2 sm:flex-row">
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="px-6 py-3 text-sm font-medium text-gray-700 transition-colors bg-white border border-gray-300 rounded-xl hover:bg-gray-50"
                                        >
                                            Batal
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className={`inline-flex justify-center items-center gap-2 rounded-xl border border-transparent bg-blue-600 py-3 px-6 text-sm font-medium text-white hover:bg-blue-700 transition-colors ${
                                                isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                                            }`}
                                        >
                                            {isSubmitting && (
                                                <div className="w-4 h-4 border-b-2 border-white rounded-full animate-spin" />
                                            )}
                                            Simpan
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

// ---------- Detail Drawer ----------
const DetailDrawer: React.FC<{
    sale: TransaksiPenjualan | null;
    open: boolean;
    onClose: () => void;
    canEdit: boolean;
    onEdit: (sale: TransaksiPenjualan) => void;
    onDelete: (sale: TransaksiPenjualan) => void;
}> = ({ sale, open, onClose, canEdit, onEdit, onDelete }) => {
    if (!sale) return null;
    const total = (sale.jumlah_kg || 0) * (sale.harga_jual_per_kg || 0);
    const isCancelled = (sale as any).status === 'DIBATALKAN';

    return (
        <Transition show={open} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="transition-opacity ease-linear duration-200"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="transition-opacity ease-linear duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/50" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-hidden">
                    <div className="absolute inset-0 overflow-hidden">
                        <div className="fixed inset-y-0 right-0 flex max-w-full pl-10 pointer-events-none">
                            <Transition.Child
                                as={Fragment}
                                enter="transform transition ease-in-out duration-300"
                                enterFrom="translate-x-full"
                                enterTo="translate-x-0"
                                leave="transform transition ease-in-out duration-300"
                                leaveFrom="translate-x-0"
                                leaveTo="translate-x-full"
                            >
                                <Dialog.Panel className="w-screen max-w-md pointer-events-auto">
                                    <div className="flex flex-col h-full bg-white border-l border-gray-200 shadow-2xl">
                                        {/* Header with gradient */}
                                        <div className={`relative overflow-hidden px-6 py-5 text-white ${isCancelled ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600'}`}>
                                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                                <CurrencyDollarIcon className="w-24 h-24" />
                                            </div>
                                            <div className="relative flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm">
                                                        {isCancelled ? <XCircleIcon className="w-5 h-5" /> : <CurrencyDollarIcon className="w-5 h-5" />}
                                                    </div>
                                                    <div>
                                                        <Dialog.Title className="text-lg font-bold">
                                                            {isCancelled ? 'Penjualan Dibatalkan' : 'Detail Penjualan'}
                                                        </Dialog.Title>
                                                        <p className="text-sm text-white/70">
                                                            {new Date(sale.tgl_transaksi).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button type="button" className="p-2 transition-colors rounded-xl bg-white/10 hover:bg-white/20" onClick={onClose}>
                                                    <XMarkIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex-1 p-6 space-y-4 overflow-y-auto bg-gradient-to-b from-slate-50 to-white">
                                            {isCancelled && (
                                                <div className="p-4 border border-red-200 bg-gradient-to-r from-red-50 to-red-100 rounded-2xl">
                                                    <div className="flex items-center gap-2 text-red-800">
                                                        <XCircleIcon className="w-5 h-5" />
                                                        <span className="font-semibold">Transaksi ini telah dibatalkan</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Produk Card - Enhanced */}
                                            <div className={`rounded-2xl border p-5 ${isCancelled ? 'bg-gray-100 opacity-60' : 'bg-gradient-to-br from-white to-blue-50 border-blue-100'}`}>
                                                <p className="mb-3 text-xs font-semibold tracking-wider text-gray-500 uppercase">Produk</p>
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
                                                        sale.tipe_produk === 'PRODUK_JADI' 
                                                            ? 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/25' 
                                                            : (sale as any).nama_produk?.toLowerCase() === 'dedak'
                                                                ? 'bg-gradient-to-br from-orange-500 to-amber-600 shadow-orange-500/25'
                                                                : 'bg-gradient-to-br from-purple-500 to-violet-600 shadow-purple-500/25'
                                                    }`}>
                                                        {sale.tipe_produk === 'PRODUK_JADI' ? (
                                                            <FaBowlFood className="w-6 h-6 text-white" />
                                                        ) : (sale as any).nama_produk?.toLowerCase() === 'dedak' ? (
                                                            <GiPowder className="w-6 h-6 text-white" />
                                                        ) : (
                                                            <GiStonePile className="w-6 h-6 text-white" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-xl font-bold text-gray-900">
                                                            {(sale as any).nama_produk || sale.produk?.nama_produk}
                                                        </p>
                                                        <p className="text-sm text-gray-500">
                                                            {sale.tipe_produk === 'PRODUK_JADI' ? 'Beras' : 'Produk Sampingan'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Jumlah & Harga - Enhanced */}
                                            <div className={`grid grid-cols-2 gap-4 ${isCancelled ? 'opacity-60' : ''}`}>
                                                <div className="relative p-5 overflow-hidden text-center transition-all border border-blue-100 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 group hover:shadow-lg">
                                                    <div className="absolute w-16 h-16 rounded-full -top-4 -right-4 bg-gradient-to-br from-blue-200/50 to-transparent blur-xl" />
                                                    <p className="mb-2 text-xs font-semibold tracking-wider text-blue-600 uppercase">Jumlah</p>
                                                    <p className="text-3xl font-extrabold text-blue-600 tabular-nums">{sale.jumlah_kg}</p>
                                                    <p className="text-sm font-semibold text-blue-500">Kilogram</p>
                                                </div>
                                                <div className="relative p-5 overflow-hidden text-center transition-all border border-gray-200 rounded-2xl bg-gradient-to-br from-gray-50 to-slate-50 group hover:shadow-lg">
                                                    <div className="absolute w-16 h-16 rounded-full -top-4 -right-4 bg-gradient-to-br from-gray-200/50 to-transparent blur-xl" />
                                                    <p className="mb-2 text-xs font-semibold tracking-wider text-gray-600 uppercase">Harga / Kg</p>
                                                    <p className="text-2xl font-bold text-gray-800 tabular-nums">{formatRupiah(sale.harga_jual_per_kg || 0)}</p>
                                                </div>
                                            </div>

                                            {/* Total - Enhanced with animation feel */}
                                            <div className={`relative overflow-hidden rounded-2xl border p-6 text-center ${isCancelled ? 'bg-gray-100 opacity-60 border-gray-200' : 'bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 border-green-200'}`}>
                                                <div className="absolute w-24 h-24 rounded-full -top-8 -right-8 bg-gradient-to-br from-green-200/40 to-transparent blur-2xl" />
                                                <div className="absolute w-24 h-24 rounded-full -bottom-8 -left-8 bg-gradient-to-br from-emerald-200/40 to-transparent blur-2xl" />
                                                <p className="mb-2 text-xs font-semibold tracking-wider text-green-600 uppercase">Total Penjualan</p>
                                                <p className={`text-4xl font-extrabold tabular-nums ${isCancelled ? 'text-gray-500 line-through' : 'text-green-600'}`}>
                                                    {formatRupiah(total)}
                                                </p>
                                                {!isCancelled && (
                                                    <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 rounded-full">
                                                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                                        <span className="text-xs font-semibold text-green-700">Transaksi Berhasil</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Pelanggan - Enhanced */}
                                            <div className={`rounded-2xl border p-4 ${isCancelled ? 'bg-gray-100 opacity-60' : 'bg-gradient-to-br from-white to-indigo-50/50 border-indigo-100'}`}>
                                                <p className="mb-3 text-xs font-semibold tracking-wider text-gray-500 uppercase">Pelanggan</p>
                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center justify-center w-12 h-12 shadow-sm rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100">
                                                        <FaUserTie className="w-5 h-5 text-blue-600" />
                                                    </div>
                                                    <div>
                                                        <p className="text-lg font-bold text-gray-900">{sale.nama_pelanggan || 'Pelanggan Umum'}</p>
                                                        <p className="text-sm text-gray-500">{sale.nama_pelanggan ? 'Pelanggan Terdaftar' : 'Tanpa nama'}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Waktu - Enhanced */}
                                            <div className={`rounded-2xl border p-4 ${isCancelled ? 'bg-gray-100 opacity-60' : 'bg-gradient-to-br from-white to-slate-50 border-gray-200'}`}>
                                                <p className="mb-3 text-xs font-semibold tracking-wider text-gray-500 uppercase">Waktu Transaksi</p>
                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center justify-center w-12 h-12 shadow-sm rounded-xl bg-gradient-to-br from-gray-100 to-slate-100">
                                                        <CalendarDaysIcon className="w-5 h-5 text-gray-600" />
                                                    </div>
                                                    <div>
                                                        <p className="text-lg font-bold text-gray-900">
                                                            {new Date(sale.tgl_transaksi).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                                                        </p>
                                                        <p className="text-sm text-gray-500">
                                                            {new Date(sale.tgl_transaksi).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Status Pembayaran - NEW */}
                                            {!isCancelled && (
                                                <div className={`rounded-2xl border p-4 ${
                                                    (sale as any).status_pembayaran === 'LUNAS' 
                                                        ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200'
                                                        : 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200'
                                                }`}>
                                                    <p className="mb-3 text-xs font-semibold tracking-wider text-gray-500 uppercase">Status Pembayaran</p>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${
                                                                (sale as any).status_pembayaran === 'LUNAS'
                                                                    ? 'bg-gradient-to-br from-emerald-100 to-green-100'
                                                                    : 'bg-gradient-to-br from-amber-100 to-orange-100'
                                                            }`}>
                                                                <CreditCardIcon className={`w-5 h-5 ${
                                                                    (sale as any).status_pembayaran === 'LUNAS' ? 'text-emerald-600' : 'text-amber-600'
                                                                }`} />
                                                            </div>
                                                            <div>
                                                                <p className={`text-lg font-bold ${
                                                                    (sale as any).status_pembayaran === 'LUNAS' ? 'text-emerald-700' : 'text-amber-700'
                                                                }`}>
                                                                    {(sale as any).status_pembayaran === 'LUNAS' ? 'Lunas' : 'Hutang'}
                                                                </p>
                                                                <p className="text-sm text-gray-500">
                                                                    {(sale as any).status_pembayaran === 'LUNAS' 
                                                                        ? 'Pembayaran telah selesai' 
                                                                        : `Terbayar: ${formatRupiah((sale as any).nilai_terbayar || 0)}`
                                                                    }
                                                                </p>
                                                            </div>
                                                        </div>
                                                        {(sale as any).status_pembayaran !== 'LUNAS' && (
                                                            <Link
                                                                to="/hutang-piutang"
                                                                className="px-4 py-2 text-sm font-semibold transition-colors text-amber-700 bg-amber-100 rounded-xl hover:bg-amber-200"
                                                                onClick={onClose}
                                                            >
                                                                Bayar
                                                            </Link>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Footer */}
                                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-slate-50">
                                            {canEdit && !isCancelled ? (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => onEdit(sale)}
                                                        className="px-5 py-2.5 font-semibold text-blue-700 bg-white border border-blue-200 rounded-xl hover:bg-blue-50 transition-colors"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => onDelete(sale)}
                                                        className="px-5 py-2.5 font-semibold text-white bg-gradient-to-r from-red-500 to-red-600 rounded-xl hover:from-red-600 hover:to-red-700 transition-all shadow-lg shadow-red-500/25"
                                                    >
                                                        Hapus
                                                    </button>
                                                </>
                                            ) : (
                                                <span className="text-sm italic text-gray-500">Tidak dapat diedit (sudah dibatalkan)</span>
                                            )}
                                        </div>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

// ---------- Page ----------
const PenjualanPage: React.FC = () => {
    const { user } = useAuth();

    const [akunKasList, setAkunKasList] = useState<AkunKas[]>([]);
    const [allProduk, setAllProduk] = useState<Produk[]>([]);
    const [salesList, setSalesList] = useState<TransaksiPenjualan[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const firstLoadRef = useRef(true);
    const showSkeleton = isInitialLoading && salesList.length === 0;
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<'semua' | 'dedak' | 'menir' | 'beras'>('semua');
    const [search, setSearch] = useState('');
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState<TransaksiPenjualan | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;
    const [produkSiapJual, setProdukSiapJual] = useState<ProdukDenganStok[]>([]);
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailSale, setDetailSale] = useState<TransaksiPenjualan | null>(null);
    const [itemToCancel, setItemToCancel] = useState<TransaksiPenjualan | null>(null);

    // toggle tampilkan transaksi dibatalkan
    const [showCancelled, setShowCancelled] = useState(false);
    
    // filter status pembayaran
    const [statusPembayaranFilter, setStatusPembayaranFilter] = useState<'ALL' | 'LUNAS' | 'SEBAGIAN' | 'BELUM_LUNAS'>('ALL');

    // filter periode
    const [activeTab, setActiveTab] = useState<FilterType>('hari_ini');
    const [dateFrom, setDateFrom] = useState<string>('');
    const [dateTo, setDateTo] = useState<string>('');

    const handleCancel = async () => {
        if (!itemToCancel) return;
        try {
            setIsRefreshing(true);
            await api.cancelPenjualan(itemToCancel.id);
            showToast('Penjualan berhasil dibatalkan. Kas dan stok telah dikembalikan.', 'success');
            fetchData();
        } catch (err: any) {
            showToast(err.message || 'Gagal membatalkan penjualan', 'error');
        } finally {
            setIsRefreshing(false);
            setItemToCancel(null);
        }
    };

    const handleTabChange = (tab: FilterType) => {
        setActiveTab(tab);
        const today = new Date();

        switch (tab) {
            case 'hari_ini': {
                setSelectedDate(today);
                break;
            }
            case 'minggu_ini': {
                const startOfWeek = new Date(today);
                startOfWeek.setDate(today.getDate() - today.getDay());
                setDateFrom(startOfWeek.toISOString().split('T')[0]);
                setDateTo(today.toISOString().split('T')[0]);
                break;
            }
            case 'bulan_ini': {
                const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                setDateFrom(startOfMonth.toISOString().split('T')[0]);
                setDateTo(today.toISOString().split('T')[0]);
                break;
            }
            case 'kustom': {
                // user pilih manual
                break;
            }
        }
        setCurrentPage(1);
    };

    const handleApplyCustom = () => {
        if (dateFrom && dateTo) {
            const start = new Date(dateFrom);
            const end = new Date(dateTo);
            const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

            if (daysDiff > 31) {
                showToast('Maksimal range 31 hari', 'error');
                return;
            }
            if (start > end) {
                showToast('Tanggal mulai tidak boleh lebih besar dari tanggal akhir', 'error');
                return;
            }
            setCurrentPage(1);
        } else {
            showToast('Silakan pilih tanggal mulai dan akhir', 'error');
        }
    };

    const fetchData = useCallback(async () => {
        const isFirst = firstLoadRef.current;
        try {
            if (isFirst) setIsInitialLoading(true);
            else setIsRefreshing(true);
            let penjualanData: any[] = [];

            if (activeTab === 'hari_ini') {
                const dateStr = new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000)
                    .toISOString()
                    .slice(0, 10);

                const [produkData, penjualanResp, stokData, kasData] = await Promise.all([
                    api.getAllProduk(),
                    api.getAllPenjualan(dateStr, showCancelled),
                    api.getAllStokProduk(),
                    api.getAllAkunKas(),
                ]);

                penjualanData = Array.isArray(penjualanResp) ? penjualanResp : [];

                const allProdukArr = Array.isArray(produkData) ? produkData : [];
                setAllProduk(allProdukArr);
                setAkunKasList(
                    Array.isArray(kasData) ? (kasData as AkunKas[]).filter((k: AkunKas) => k.is_active) : [],
                );

                const stokMap = new Map<number, number>();
                if (Array.isArray(stokData)) {
                    (stokData as StokProduk[]).forEach((stok: StokProduk) => {
                        stokMap.set((stok as any).produk_id ?? 0, (stok as any).total_stok_kg ?? 0);
                    });
                }

                const produkBisaDijual = allProdukArr
                    .map((produk: Produk) => ({ produk, stok: stokMap.get(produk.id) || 0 }))
                    .filter((item: ProdukDenganStok) => item.produk.tipe_produk !== 'BAHAN_MENTAH' && item.stok > 0);

                setProdukSiapJual(produkBisaDijual);
            } else {
                if (!dateFrom || !dateTo) {
                    setSalesList([]);
                    setError(null);
                    
                    return;
                }

                const start = new Date(dateFrom);
                const end = new Date(dateTo);
                const allData: any[] = [];

                for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                    const dateStr = d.toISOString().split('T')[0];
                    try {
                        const dayData = await api.getAllPenjualan(dateStr, showCancelled);
                        if (Array.isArray(dayData)) allData.push(...dayData);
                    } catch (err) {
                        console.error(`Error fetching data for ${dateStr}:`, err);
                    }
                }

                penjualanData = allData;

                const [produkData, stokData, kasData] = await Promise.all([
                    api.getAllProduk(),
                    api.getAllStokProduk(),
                    api.getAllAkunKas(),
                ]);

                const allProdukArr = Array.isArray(produkData) ? produkData : [];
                setAllProduk(allProdukArr);
                setAkunKasList(
                    Array.isArray(kasData) ? (kasData as AkunKas[]).filter((k: AkunKas) => k.is_active) : [],
                );

                const stokMap = new Map<number, number>();
                if (Array.isArray(stokData)) {
                    (stokData as StokProduk[]).forEach((stok: StokProduk) => {
                        stokMap.set((stok as any).produk_id ?? 0, (stok as any).total_stok_kg ?? 0);
                    });
                }

                const produkBisaDijual = allProdukArr
                    .map((produk: Produk) => ({ produk, stok: stokMap.get(produk.id) || 0 }))
                    .filter((item: ProdukDenganStok) => item.produk.tipe_produk !== 'BAHAN_MENTAH' && item.stok > 0);

                setProdukSiapJual(produkBisaDijual);
            }

            setSalesList(penjualanData);
            setError(null);
        } catch (err: any) {
            const msg = err?.message || 'Gagal memuat data.';
            showToast(msg, 'error');
            setError(msg);
        } finally {
            // IMPORTANT: jangan biarkan UI "stuck" di skeleton / refreshing
            setIsInitialLoading(false);
            setIsRefreshing(false);
            firstLoadRef.current = false;
        }
    }, [selectedDate, showCancelled, activeTab, dateFrom, dateTo]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const renderPaymentBadge = (status?: string, nilaiTerbayar?: number) => {
        const s = (status || 'BELUM_LUNAS').toUpperCase();
        if (s === 'LUNAS')
return (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Lunas
        </span>
            );
        if (s === 'SEBAGIAN')
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" /> DP ({formatRupiah(nilaiTerbayar || 0)})
        </span>
            );
        return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Hutang
      </span>
        );
    };

    const renderStatusBadge = (sale: TransaksiPenjualan) => {
        const status = (sale as any).status;
        if (status === 'DIBATALKAN') {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
          <XCircleIcon className="h-3.5 w-3.5" /> Dibatalkan
        </span>
            );
        }
        return null;
    };

    const showAddForm = () => {
        setIsEditing(false);
        setEditData(null);
        setIsFormVisible(true);
    };

    const handleEditClick = (sale: TransaksiPenjualan) => {
        if ((sale as any).status === 'DIBATALKAN') {
            showToast('Tidak dapat mengedit penjualan yang sudah dibatalkan', 'error');
            return;
        }
        setIsEditing(true);
        setEditData(sale);
        setIsFormVisible(true);
    };

    const confirmDelete = (id: number) => setDeleteId(id);

    const handleDelete = async () => {
        if (deleteId === null) return;
        try {
            await api.deletePenjualan(deleteId);
            showToast('Penjualan berhasil dihapus!', 'success');
            fetchData();
        } catch (err: any) {
            showToast(err.message || 'Gagal menghapus data.', 'error');
        } finally {
            setDeleteId(null);
        }
    };

    const handleSubmit = async (payload: api.InputPenjualan) => {
        setIsSubmitting(true);
        try {
            if (isEditing && editData) {
                await api.updatePenjualan(editData.id, payload);
                showToast('Penjualan berhasil diperbarui!');
            } else {
                await api.createPenjualan(payload);
                showToast('Penjualan berhasil dicatat!');
            }
            setIsFormVisible(false);
            await fetchData();
        } catch (err: any) {
            showToast(err.message || 'Gagal menyimpan data', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // filter list & search
    const filteredSales = useMemo(() => {
        let list = salesList;

        if (!showCancelled) {
            list = list.filter((s: TransaksiPenjualan) => {
                const status = (s as any).status || 'AKTIF';
                return status !== 'DIBATALKAN';
            });
        }

        if (filter === 'beras') {
            list = list.filter((s: TransaksiPenjualan) => s.tipe_produk === 'PRODUK_JADI');
        } else if (filter !== 'semua') {
            list = list.filter((s: TransaksiPenjualan) => s.nama_produk.toLowerCase() === filter);
        }

        // Filter by status pembayaran
        if (statusPembayaranFilter !== 'ALL') {
            list = list.filter((s: TransaksiPenjualan) => {
                const status = ((s as any).status_pembayaran || 'BELUM_LUNAS').toUpperCase();
                return status === statusPembayaranFilter;
            });
        }

        const q = search.trim().toLowerCase();
        if (!q) return list;

        return list.filter((s: TransaksiPenjualan) =>
            [s.nama_produk, s.nama_pelanggan, new Date(s.tgl_transaksi).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })]
                .filter(Boolean)
                .some((v) => String(v).toLowerCase().includes(q)),
        );
    }, [filter, search, salesList, showCancelled, statusPembayaranFilter]);

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentSales = filteredSales.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredSales.length / itemsPerPage) || 1;

    const summary = useMemo(() => {
        const totals = { beras: { kg: 0, rp: 0 }, dedak: { kg: 0, rp: 0 }, menir: { kg: 0, rp: 0 } } as any;

        const activeSales = salesList.filter((sale: TransaksiPenjualan) => {
            const status = (sale as any).status || 'AKTIF';
            return status !== 'DIBATALKAN';
        });

        activeSales.forEach((sale: TransaksiPenjualan) => {
            const totalRp = (sale.jumlah_kg || 0) * (sale.harga_jual_per_kg || 0);
            if (sale.tipe_produk === 'PRODUK_JADI') {
                totals.beras.kg += sale.jumlah_kg || 0;
                totals.beras.rp += totalRp;
            } else if (sale.nama_produk?.toLowerCase() === 'dedak') {
                totals.dedak.kg += sale.jumlah_kg || 0;
                totals.dedak.rp += totalRp;
            } else if (sale.nama_produk?.toLowerCase() === 'menir') {
                totals.menir.kg += sale.jumlah_kg || 0;
                totals.menir.rp += totalRp;
            }
        });
        return totals;
    }, [salesList]);

    const totalPemasukan = summary.beras.rp + summary.dedak.rp + summary.menir.rp;

    const cancelledCount = useMemo(
        () => salesList.filter((s: TransaksiPenjualan) => (s as any).status === 'DIBATALKAN').length,
        [salesList],
    );

    const getSummaryCards = () => {
        switch (filter) {
            case 'beras':
                return (
                    <>
                        <SummaryCard
                            title="Total Beras Terjual"
                            value={`${summary.beras.kg.toLocaleString('id-ID')} Kg`}
                            icon={<FaBowlFood size={24} />}
                            bgColor="bg-blue-50"
                            gradient="from-blue-500 to-indigo-600"
                            shadow="shadow-blue-500/25"
                        />
                        <SummaryCard
                            title="Total Pemasukan Beras"
                            value={formatRupiah(summary.beras.rp)}
                            icon={<CurrencyDollarIcon className="w-6 h-6" />}
                            valueColor="text-green-600"
                            bgColor="bg-green-50"
                            gradient="from-green-500 to-emerald-600"
                            shadow="shadow-green-500/25"
                        />
                    </>
                );
            case 'dedak':
                return (
                    <>
                        <SummaryCard
                            title="Total Dedak Terjual"
                            value={`${summary.dedak.kg.toLocaleString('id-ID')} Kg`}
                            icon={<GiPowder size={24} />}
                            bgColor="bg-orange-50"
                            gradient="from-orange-500 to-amber-600"
                            shadow="shadow-orange-500/25"
                        />
                        <SummaryCard
                            title="Total Pemasukan Dedak"
                            value={formatRupiah(summary.dedak.rp)}
                            icon={<CurrencyDollarIcon className="w-6 h-6" />}
                            valueColor="text-green-600"
                            bgColor="bg-green-50"
                            gradient="from-green-500 to-emerald-600"
                            shadow="shadow-green-500/25"
                        />
                    </>
                );
            case 'menir':
                return (
                    <>
                        <SummaryCard
                            title="Total Menir Terjual"
                            value={`${summary.menir.kg.toLocaleString('id-ID')} Kg`}
                            icon={<GiStonePile size={24} />}
                            bgColor="bg-purple-50"
                            gradient="from-purple-500 to-violet-600"
                            shadow="shadow-purple-500/25"
                        />
                        <SummaryCard
                            title="Total Pemasukan Menir"
                            value={formatRupiah(summary.menir.rp)}
                            icon={<CurrencyDollarIcon className="w-6 h-6" />}
                            valueColor="text-green-600"
                            bgColor="bg-green-50"
                            gradient="from-green-500 to-emerald-600"
                            shadow="shadow-green-500/25"
                        />
                    </>
                );
            default:
                return (
                    <>
                        <SummaryCard
                            title="Total Beras Terjual"
                            value={`${summary.beras.kg.toLocaleString('id-ID')} Kg`}
                            icon={<FaBowlFood size={24} />}
                            bgColor="bg-blue-50"
                            gradient="from-blue-500 to-indigo-600"
                            shadow="shadow-blue-500/25"
                            onClick={() => { setFilter('beras'); setCurrentPage(1); }}
                        />
                        <SummaryCard
                            title="Total Dedak Terjual"
                            value={`${summary.dedak.kg.toLocaleString('id-ID')} Kg`}
                            icon={<GiPowder size={24} />}
                            bgColor="bg-orange-50"
                            gradient="from-orange-500 to-amber-600"
                            shadow="shadow-orange-500/25"
                            onClick={() => { setFilter('dedak'); setCurrentPage(1); }}
                        />
                        <SummaryCard
                            title="Total Menir Terjual"
                            value={`${summary.menir.kg.toLocaleString('id-ID')} Kg`}
                            icon={<GiStonePile size={24} />}
                            bgColor="bg-purple-50"
                            gradient="from-purple-500 to-violet-600"
                            shadow="shadow-purple-500/25"
                            onClick={() => { setFilter('menir'); setCurrentPage(1); }}
                        />
                        <SummaryCard
                            title="Total Pemasukan"
                            value={formatRupiah(totalPemasukan)}
                            icon={<CurrencyDollarIcon className="w-6 h-6" />}
                            valueColor="text-green-600"
                            bgColor="bg-green-50"
                            gradient="from-green-500 to-emerald-600"
                            shadow="shadow-green-500/25"
                        />
                    </>
                );
        }
    };

    const isToday = useMemo(() => isSameDate(new Date(), selectedDate), [selectedDate]);

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="px-4 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8">
                {/* 🎨 HERO HEADER (same vibe as Produksi) */}
                <div className="relative px-6 py-6 mb-5 overflow-hidden text-white shadow-lg bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600 rounded-3xl sm:px-8 sm:py-7">
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_50%_120%,white,transparent)]" />
                    <div className="absolute top-0 right-0 w-64 h-64 rounded-full translate-x-1/3 -translate-y-1/3 bg-white/10 blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full -translate-x-1/3 translate-y-1/3 bg-white/10 blur-3xl" />
                    <div className="absolute right-10 top-10 opacity-10">
                        <CurrencyDollarIcon className="w-32 h-32" />
                    </div>

                    <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 mb-2 text-xs font-semibold rounded-full bg-white/15 ring-1 ring-white/20 backdrop-blur-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                Modul Penjualan
                            </div>
                            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Manajemen Penjualan</h1>
                            <p className="mt-1 text-sm text-blue-100">
                                Catat transaksi, pantau revenue, dan kelola pembatalan dengan rapi.
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            {isRefreshing && (
                                <div className="items-center hidden gap-2 px-3 py-2 text-xs font-semibold sm:flex rounded-xl bg-white/10 ring-1 ring-white/20 backdrop-blur-sm">
                                    <div className="w-4 h-4 border-2 rounded-full border-white/30 border-t-white animate-spin" />
                                    Memuat...
                                </div>
                            )}
                            <button
                                onClick={showAddForm}
                                className="group inline-flex items-center gap-2 px-5 py-3 font-bold text-blue-700 transition-all bg-white shadow-lg rounded-2xl hover:bg-blue-50 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98]"
                            >
                                <PlusIcon className="w-5 h-5 transition-transform duration-300 group-hover:rotate-90" />
                                Catat Penjualan
                            </button>
                        </div>
                    </div>
                </div>

                {/* FILTER TANGGAL */}
                <div className="mb-6">
                    <FilterTabs
                        activeTab={activeTab}
                        onTabChange={handleTabChange}
                        dateFrom={dateFrom}
                        dateTo={dateTo}
                        onDateFromChange={setDateFrom}
                        onDateToChange={setDateTo}
                        onApplyCustom={handleApplyCustom}
                    />
                </div>

{/* RINGKASAN */}
                <div className="p-6 mb-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
                    <div className="flex flex-col gap-6 mb-6 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-xl">
                                <CurrencyDollarIcon className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Ringkasan Penjualan</h2>
                                <p className="text-sm text-gray-600">
                                    {activeTab === 'hari_ini'
                                        ? `Data penjualan untuk ${selectedDate.toLocaleDateString('id-ID', {
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric',
                                        })}`
                                        : dateFrom && dateTo
                                            ? `Data penjualan dari ${new Date(dateFrom).toLocaleDateString('id-ID', {
                                                day: 'numeric',
                                                month: 'short',
                                            })} - ${new Date(dateTo).toLocaleDateString('id-ID', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric',
                                            })}`
                                            : 'Silakan pilih rentang tanggal'}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 lg:flex-nowrap">
                            {[
                                { key: 'semua', label: 'Semua' },
                                { key: 'beras', label: 'Beras' },
                                { key: 'dedak', label: 'Dedak' },
                                { key: 'menir', label: 'Menir' },
                            ].map((c) => (
                                <button
                                    key={c.key}
                                    type="button"
                                    onClick={() => {
                                        setFilter(c.key as any);
                                        setCurrentPage(1);
                                    }}
                                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                                        filter === c.key ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    {c.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {showSkeleton ? (
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="bg-gray-100 h-28 rounded-2xl animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        <div className={`grid gap-6 ${filter === 'semua' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 max-w-2xl'}`}>
                            {getSummaryCards()}
                        </div>
                    )}
                </div>

                {/* RIWAYAT + SEARCH di samping TOGGLE */}
                <div className="mb-6 overflow-hidden bg-white border border-gray-200 shadow-sm rounded-2xl">
                    <div className="p-6 border-b border-gray-100">
                        {/* Row 1: Title + Filters */}
                        <div className="flex flex-col gap-4 mb-4 md:flex-row md:items-center md:justify-between">
                            {/* Title */}
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-xl">
                                    <CurrencyDollarIcon className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Riwayat Data Penjualan</h2>
                                    <p className="text-sm text-gray-600">
                                        Menampilkan <span className="font-bold text-blue-600">{filteredSales.length}</span> transaksi penjualan
                                    </p>
                                </div>
                            </div>

                            {/* Filters Row */}
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                {/* Status Pembayaran Filter */}
                                <div className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-gray-50 rounded-xl">
                                    <CreditCardIcon className="w-4 h-4 text-gray-500" />
                                    <select
                                        value={statusPembayaranFilter}
                                        onChange={(e) => {
                                            setStatusPembayaranFilter(e.target.value as any);
                                            setCurrentPage(1);
                                        }}
                                        className="text-sm font-semibold text-gray-700 bg-transparent border-0 cursor-pointer focus:ring-0"
                                    >
                                        <option value="ALL">Semua Status Bayar</option>
                                        <option value="LUNAS">Lunas</option>
                                        <option value="SEBAGIAN">DP / Sebagian</option>
                                        <option value="BELUM_LUNAS">Piutang</option>
                                    </select>
                                </div>

                                {/* Toggle tampilkan dibatalkan */}
                                <label className="relative inline-flex items-center cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={showCancelled}
                                        onChange={(e) => {
                                            setShowCancelled(e.target.checked);
                                            setCurrentPage(1);
                                        }}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500" />
                                    <span className="flex items-center gap-2 ml-3 text-sm font-medium text-gray-700">
                                        Dibatalkan
                                        {cancelledCount > 0 && (
                                            <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold text-red-800 bg-red-100 rounded-full">
                                                {cancelledCount}
                                            </span>
                                        )}
                                    </span>
                                </label>
                            </div>
                        </div>

                        {/* Row 2: Search Box */}
                        <div className="relative">
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setCurrentPage(1);
                                }}
                                placeholder="Cari produk / pelanggan..."
                                className="w-full py-2.5 pl-10 pr-4 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
                            />
                            <div className="absolute text-gray-400 -translate-y-1/2 left-3 top-1/2">
                                <MagnifyingGlassIcon className="w-4 h-4" />
                            </div>
                        </div>
                    </div>

                    {/* Mobile cards */}
                    <div className="block lg:hidden">
                        {showSkeleton ? (
                            <div className="p-4 space-y-4">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
                                ))}
                            </div>
                        ) : currentSales.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                <CurrencyDollarIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                <p>Belum ada penjualan untuk kriteria ini.</p>
                            </div>
                        ) : (
                            <div className="p-4 space-y-4">
                                {currentSales.map((sale: TransaksiPenjualan) => {
                                    const isCancelled = (sale as any).status === 'DIBATALKAN';
                                    return (
                                        <div
                                            key={sale.id}
                                            className={`border rounded-xl p-4 transition-colors cursor-pointer ${
                                                isCancelled ? 'border-red-200 bg-red-50 opacity-70' : 'border-gray-200 bg-gray-50 hover:bg-blue-50'
                                            }`}
                                            onClick={() => {
                                                setDetailSale(sale);
                                                setDetailOpen(true);
                                            }}
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isCancelled ? 'bg-red-100' : 'bg-blue-100'}`}>
                                                            {isCancelled ? (
                                                                <XCircleIcon className="w-4 h-4 text-red-600" />
                                                            ) : sale.tipe_produk === 'PRODUK_JADI' ? (
                                                                <FaBowlFood className="w-4 h-4 text-blue-600" />
                                                            ) : sale.nama_produk.toLowerCase() === 'dedak' ? (
                                                                <GiPowder className="w-4 h-4 text-orange-600" />
                                                            ) : (
                                                                <GiStonePile className="w-4 h-4 text-purple-600" />
                                                            )}
                                                        </div>
                                                        <p className={`font-bold ${isCancelled ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                                                            {sale.nama_produk}
                                                        </p>
                                                        {renderStatusBadge(sale)}
                                                    </div>

                                                    <div className="space-y-1 text-sm text-gray-600">
                                                        <p className="flex items-center gap-2">
                                                            <FaUserTie className="w-4 h-4" />
                                                            {sale.nama_pelanggan || 'Tanpa nama'}
                                                        </p>
                                                        <p className="flex items-center gap-2">
                                                            <CalendarDaysIcon className="w-4 h-4" />
                                                            {new Date(sale.tgl_transaksi).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                </div>

                                                {!isCancelled && (
                                                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                        {(isToday || user?.role === 'ADMIN' || user?.role === 'OWNER') && (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleEditClick(sale)}
                                                                    className="p-2 text-blue-600 transition-colors rounded-lg hover:bg-blue-100"
                                                                >
                                                                    <FaEdit className="w-4 h-4" />
                                                                </button>

                                                                {((sale as any).nilai_terbayar ?? 0) > 0 ? (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setItemToCancel(sale)}
                                                                        className="p-2 text-orange-600 transition-colors rounded-lg hover:bg-orange-100"
                                                                        title="Batalkan Penjualan"
                                                                    >
                                                                        <ExclamationTriangleIcon className="w-4 h-4" />
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => confirmDelete(sale.id)}
                                                                        className="p-2 text-red-600 transition-colors rounded-lg hover:bg-red-100"
                                                                        title="Hapus"
                                                                    >
                                                                        <FaTrashAlt className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="pt-3 border-t border-gray-200">
                                                <div className="grid grid-cols-3 gap-4 text-center">
                                                    <div>
                                                        <p className={`text-2xl font-bold tabular-nums ${isCancelled ? 'text-gray-400' : 'text-blue-600'}`}>{sale.jumlah_kg}</p>
                                                        <p className="text-xs text-gray-500">Kg</p>
                                                    </div>
                                                    <div>
                                                        <p className={`text-lg font-bold tabular-nums ${isCancelled ? 'text-gray-400' : 'text-gray-700'}`}>
                                                            {(sale.harga_jual_per_kg || 0).toLocaleString('id-ID')}
                                                        </p>
                                                        <p className="text-xs text-gray-500">Per Kg</p>
                                                    </div>
                                                    <div>
                                                        <p className={`text-2xl font-bold tabular-nums ${isCancelled ? 'text-gray-400 line-through' : 'text-green-600'}`}>
                                                            {((sale.jumlah_kg || 0) * (sale.harga_jual_per_kg || 0)).toLocaleString('id-ID')}
                                                        </p>
                                                        <p className="text-xs text-gray-500">Total</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Desktop table */}
                    <div className="hidden overflow-x-auto lg:block">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-xs font-semibold tracking-wider text-left text-gray-600 uppercase">TANGGAL</th>
                                <th className="px-6 py-3 text-xs font-semibold tracking-wider text-left text-gray-600 uppercase">PRODUK</th>
                                <th className="px-6 py-3 text-xs font-semibold tracking-wider text-left text-gray-600 uppercase">PELANGGAN</th>
                                <th className="px-6 py-3 text-xs font-semibold tracking-wider text-right text-gray-600 uppercase">JUMLAH (KG)</th>
                                <th className="px-6 py-3 text-xs font-semibold tracking-wider text-right text-gray-600 uppercase">HARGA/KG</th>
                                <th className="px-6 py-3 text-xs font-semibold tracking-wider text-right text-gray-600 uppercase">TOTAL</th>
                                <th className="px-6 py-3 text-xs font-semibold tracking-wider text-left text-gray-600 uppercase">STATUS</th>
                                <th className="px-6 py-3 text-xs font-semibold tracking-wider text-center text-gray-600 uppercase">AKSI</th>
                            </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                            {showSkeleton ? (
                                Array.from({ length: 4 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        {Array.from({ length: 8 }).map((_, j) => (
                                            <td key={j} className="px-6 py-4">
                                                <div className="h-4 bg-gray-100 rounded" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : currentSales.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                                        <CurrencyDollarIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                        <p>Belum ada penjualan untuk kriteria ini.</p>
                                    </td>
                                </tr>
                            ) : (
                                currentSales.map((sale: TransaksiPenjualan, idx: number) => {
                                    const isCancelled = (sale as any).status === 'DIBATALKAN';
                                    return (
     <tr
                                            key={sale.id}
                                            className={`transition-all duration-200 cursor-pointer group ${
                                                isCancelled 
                                                    ? 'bg-red-50 hover:bg-red-100 opacity-70' 
                                                    : 'hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/30'
                                            }`}
                                            onClick={() => {
                                                setDetailSale(sale);
                                                setDetailOpen(true);
                                            }}
                                        >
                                            <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm ${
                                                        isCancelled 
                                                            ? 'bg-red-100' 
                                                            : sale.tipe_produk === 'PRODUK_JADI'
                                                                ? 'bg-gradient-to-br from-blue-100 to-indigo-100 group-hover:from-blue-200 group-hover:to-indigo-200'
                                                                : sale.nama_produk.toLowerCase() === 'dedak'
                                                                    ? 'bg-gradient-to-br from-orange-100 to-amber-100 group-hover:from-orange-200 group-hover:to-amber-200'
                                                                    : 'bg-gradient-to-br from-purple-100 to-violet-100 group-hover:from-purple-200 group-hover:to-violet-200'
                                                    }`}>
                                                        {isCancelled ? (
                                                            <XCircleIcon className="w-5 h-5 text-red-600" />
                                                        ) : sale.tipe_produk === 'PRODUK_JADI' ? (
                                                            <FaBowlFood className="w-5 h-5 text-blue-600" />
                                                        ) : sale.nama_produk.toLowerCase() === 'dedak' ? (
                                                            <GiPowder className="w-5 h-5 text-orange-600" />
                                                        ) : (
                                                            <GiStonePile className="w-5 h-5 text-purple-600" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-gray-900">{new Date(sale.tgl_transaksi).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                                                        <p className="text-xs text-gray-500">{new Date(sale.tgl_transaksi).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div>
                                                    <p className={`text-sm font-bold ${isCancelled ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                                                        {sale.nama_produk}
                                                    </p>
                                                    <p className="text-xs text-gray-500">{sale.tipe_produk === 'PRODUK_JADI' ? 'Beras' : 'Sampingan'}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center justify-center transition-colors w-9 h-9 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 group-hover:from-blue-200 group-hover:to-indigo-200">
                                                        <FaUserTie className="w-4 h-4 text-blue-600" />
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-700">{sale.nama_pelanggan || '-'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right whitespace-nowrap">
                                                <p className={`text-lg font-extrabold tabular-nums ${isCancelled ? 'text-gray-400' : 'text-gray-900'}`}>
                                                    {sale.jumlah_kg} <span className="text-sm font-medium text-gray-500">Kg</span>
                                                </p>
                                            </td>
                                            <td className={`px-6 py-4 whitespace-nowrap text-sm text-right tabular-nums ${isCancelled ? 'text-gray-400' : 'text-gray-700'}`}>
                                                {formatRupiah(sale.harga_jual_per_kg || 0)}
                                            </td>
                                            <td className="px-6 py-4 text-right whitespace-nowrap">
                                                <p className={`text-lg font-extrabold tabular-nums ${isCancelled ? 'text-gray-400 line-through' : 'text-green-600'}`}>
                                                    {formatRupiah((sale.jumlah_kg || 0) * (sale.harga_jual_per_kg || 0))}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4 text-sm whitespace-nowrap">
                                                <div className="flex flex-col gap-1">
                                                    {renderStatusBadge(sale)}
                                                    {!isCancelled && renderPaymentBadge((sale as any).status_pembayaran, (sale as any).nilai_terbayar)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-center whitespace-nowrap">
                                                {isCancelled ? (
                                                    <span className="text-xs italic text-gray-400">-</span>
                                                ) : (
                                                    <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                        {(sale as any).status_pembayaran !== 'LUNAS' && (
                                                            <Link
                                                                to={`/hutang-piutang`}
                                                                title="Bayar Piutang"
                                                                className="p-2 text-green-600 transition-colors rounded-lg hover:bg-green-100"
                                                            >
                                                                <CurrencyDollarIcon className="w-4 h-4" />
                                                            </Link>
                                                        )}

                                                        {(isToday || user?.role === 'ADMIN' || user?.role === 'OWNER') && (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleEditClick(sale)}
                                                                    className="p-2 text-blue-600 transition-colors rounded-lg hover:bg-blue-100"
                                                                    title="Edit"
                                                                >
                                                                    <FaEdit className="w-4 h-4" />
                                                                </button>

                                                                {((sale as any).nilai_terbayar ?? 0) > 0 ? (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setItemToCancel(sale)}
                                                                        className="p-2 text-orange-600 transition-colors rounded-lg hover:bg-orange-100"
                                                                        title="Batalkan Penjualan"
                                                                    >
                                                                        <ExclamationTriangleIcon className="w-4 h-4" />
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => confirmDelete(sale.id)}
                                                                        className="p-2 text-red-600 transition-colors rounded-lg hover:bg-red-100"
                                                                        title="Hapus"
                                                                    >
                                                                        <FaTrashAlt className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                            </tbody>
                        </table>
                    </div>

                    {!showSkeleton && currentSales.length > 0 && (
                        <div className="p-6 border-t border-gray-100">
                            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <SaleFormModal
                isOpen={isFormVisible}
                onClose={() => setIsFormVisible(false)}
                onSubmit={handleSubmit}
                isEditing={isEditing}
                initialData={editData}
                produkList={produkSiapJual}
                akunKasList={akunKasList}
                isSubmitting={isSubmitting}
            />

            <DetailDrawer
                sale={detailSale}
                open={detailOpen}
                onClose={() => setDetailOpen(false)}
                canEdit={isToday}
                onEdit={(sale: TransaksiPenjualan) => {
                    setDetailOpen(false);
                    handleEditClick(sale);
                }}
                onDelete={(sale: TransaksiPenjualan) => {
                    setDetailOpen(false);
                    confirmDelete(sale.id);
                }}
            />

            {/* Delete Modal */}
            <Transition appear show={deleteId !== null} as={Fragment}>
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
                                <Dialog.Panel className="w-full max-w-md overflow-hidden transition-all transform bg-white border border-red-100 shadow-2xl rounded-2xl">
                                    <div className="px-6 py-4 bg-red-600">
                                        <Dialog.Title className="flex items-center gap-3 text-xl font-bold text-white">
                                            <div className="p-2 rounded-lg bg-white/20">
                                                <ExclamationTriangleIcon className="w-5 h-5" />
                                            </div>
                                            Konfirmasi Hapus
                                        </Dialog.Title>
                                    </div>

                                    <div className="p-6">
                                        <p className="mb-4 text-gray-700">Yakin ingin menghapus penjualan ini?</p>

                                        <div className="p-4 mb-6 border border-yellow-200 rounded-lg bg-yellow-50">
                                            <p className="text-sm text-yellow-800">⚠️ Tindakan ini tidak dapat dibatalkan. Stok akan dikembalikan.</p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setDeleteId(null)}
                                                className="rounded-xl border border-gray-300 bg-white py-2.5 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                            >
                                                Batal
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleDelete}
                                                className="rounded-xl bg-red-600 hover:bg-red-700 text-white py-2.5 px-4 text-sm font-semibold transition-colors"
                                            >
                                                Ya, Hapus
                                            </button>
                                        </div>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            {/* Cancel Modal */}
            <Transition appear show={!!itemToCancel} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setItemToCancel(null)}>
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
                                <Dialog.Panel className="w-full max-w-md overflow-hidden transition-all transform bg-white border border-orange-100 shadow-2xl rounded-2xl">
                                    <div className="px-6 py-4 bg-orange-600">
                                        <Dialog.Title className="flex items-center gap-3 text-xl font-bold text-white">
                                            <div className="p-2 rounded-lg bg-white/20">
                                                <ExclamationTriangleIcon className="w-5 h-5" />
                                            </div>
                                            Batalkan Penjualan
                                        </Dialog.Title>
                                    </div>

                                    <div className="p-6">
                                        <p className="mb-4 text-gray-700">Yakin ingin membatalkan penjualan ini?</p>

                                        {itemToCancel && (
                                            <div className="p-4 mb-4 space-y-2 text-sm rounded-lg bg-gray-50">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Pelanggan:</span>
                                                    <span className="font-semibold">{itemToCancel.nama_pelanggan}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Jumlah:</span>
                                                    <span className="font-semibold">{itemToCancel.jumlah_kg} kg</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Terbayar:</span>
                                                    <span className="font-semibold text-green-600">
                            {formatRupiah((itemToCancel as any).nilai_terbayar ?? 0)}
                          </span>
                                                </div>
                                            </div>
                                        )}

                                        <div className="p-4 mb-6 border border-orange-200 rounded-lg bg-orange-50">
                                            <p className="mb-2 text-sm font-medium text-orange-800">⚠️ Yang Akan Terjadi:</p>
                                            <ul className="space-y-1 text-sm text-orange-700 list-disc list-inside">
                                                <li>Uang yang sudah dibayar akan dikembalikan ke kas</li>
                                                <li>Stok produk akan dikembalikan</li>
                                                <li>Transaksi akan berstatus &quot;DIBATALKAN&quot;</li>
                                                <li>Data tetap tersimpan untuk audit trail</li>
                                            </ul>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setItemToCancel(null)}
                                                className="rounded-xl border border-gray-300 bg-white py-2.5 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                            >
                                                Batal
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleCancel}
                                                className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white py-2.5 px-4 text-sm font-semibold transition-colors"
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
        </div>
    );
};

export default PenjualanPage;