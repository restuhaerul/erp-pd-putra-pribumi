// src/pages/Produksi.tsx
import React, { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import * as api from '../services/api';
import {
    BatchProduksi,
    Produk,
    StokProduk,
    InputProduksi,
    BatchKarung,
    BatchPembelian,
    LogProduksi,
    SumberBahanBakuInput,
    InputKarungDigunakan,
} from '../types';
import { Dialog, Transition } from '@headlessui/react';

// Icons
import {
    PlusIcon,
    XMarkIcon,
    TrashIcon,
    ClockIcon,
    ExclamationTriangleIcon,
    CalendarDaysIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    MinusIcon,
    CheckCircleIcon,
    ChevronRightIcon,
    ChevronLeftIcon,
    InformationCircleIcon,
    CubeIcon,
    ArrowDownTrayIcon,
    ArrowUpTrayIcon,
    EyeIcon
} from '@heroicons/react/24/solid';
import { CurrencyDollarIcon, HashtagIcon, ScaleIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { FaEdit, FaIndustry, FaBoxes, FaCalendarAlt } from 'react-icons/fa';
import { GiPowder, GiStonePile } from 'react-icons/gi';

// Components
import Pagination from '../components/Pagination';

// ---------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------
const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    (window as any).addToast?.(message, type);
};

const formatRupiah = (angka: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(
        angka || 0,
    );

// Label & warna untuk tipe log produksi (untuk modal History)
const labelLogProduksi = (tipe: LogProduksi['tipe_log']) => {
    switch (tipe) {
        case 'PRODUKSI_AWAL':
            return 'Produksi Masuk';
        case 'PENJUALAN':
            return 'Penjualan';
        case 'DIGUNAKAN_PRODUKSI_LAIN':
            return 'Dipakai Produksi Lain';
        default:
            return tipe;
    }
};
const badgeClassForLog = (tipe: LogProduksi['tipe_log']) => {
    switch (tipe) {
        case 'PRODUKSI_AWAL':
            return 'bg-green-100 text-green-700';
        case 'PENJUALAN':
            return 'bg-red-100 text-red-700';
        case 'DIGUNAKAN_PRODUKSI_LAIN':
            return 'bg-purple-100 text-purple-700';
        default:
            return 'bg-gray-100 text-gray-700';
    }
};

// ---------------------------------------------------------------------
// Local Types
// ---------------------------------------------------------------------
type SumberBahan = {
    tipe_sumber: 'BATCH_PEMBELIAN' | 'STOK_PRODUK' | 'BATCH_PRODUKSI';
    sumber_id: number;
    nama: string;
    sisa_kg: number;
    pemasok?: string;
    tipe_produk: 'BAHAN_MENTAH' | 'PRODUK_SAMPINGAN' | 'PRODUK_JADI';
};

type FilterType = 'hari_ini' | 'minggu_ini' | 'bulan_ini' | 'kustom';

const kategoriInfo: Record<
    SumberBahan['tipe_produk'],
    { label: string; icon: React.ReactNode; color: string }
> = {
    BAHAN_MENTAH: {
        label: 'Bahan Mentah (Gabah)',
        icon: <GiStonePile className="w-5 h-5 text-yellow-700" />,
        color: 'text-yellow-700',
    },
    PRODUK_JADI: {
        label: 'Produk Jadi (Beras)',
        icon: <FaBoxes className="w-5 h-5 text-blue-700" />,
        color: 'text-blue-700',
    },
    PRODUK_SAMPINGAN: {
        label: 'Produk Sampingan (Menir/Dedak)',
        icon: <GiPowder className="w-5 h-5 text-orange-700" />,
        color: 'text-orange-700',
    },
};

// ---------------------------------------------------------------------
// UI Pieces
// ---------------------------------------------------------------------
const EnhancedSummaryCard: React.FC<{
    title: string;
    value: string;
    subtitle?: string;
    trend?: { value: number; isPositive: boolean } | undefined;
    icon: React.ReactNode;
    bgColor?: string;
    iconColor?: string;
    onClick?: () => void;
}> = ({ title, value, subtitle, trend, icon, bgColor = 'bg-blue-50', iconColor = 'text-blue-600', onClick }) => {
    // Determine gradient based on bgColor
    const gradientMap: Record<string, string> = {
        'bg-blue-50': 'from-blue-500 to-indigo-500',
        'bg-amber-50': 'from-amber-500 to-orange-500',
        'bg-green-50': 'from-emerald-500 to-green-500',
    };
    const shadowMap: Record<string, string> = {
        'bg-blue-50': 'shadow-blue-500/20',
        'bg-amber-50': 'shadow-amber-500/20',
        'bg-green-50': 'shadow-emerald-500/20',
    };
    const gradient = gradientMap[bgColor] || 'from-blue-500 to-indigo-500';
    const shadow = shadowMap[bgColor] || 'shadow-blue-500/20';

    return (
        <div
            className={`group relative overflow-hidden ${bgColor} border-2 border-transparent hover:border-blue-200 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 w-full transform hover:-translate-y-1 ${
                onClick ? 'cursor-pointer' : ''
            }`}
            onClick={onClick}
        >
            {/* Decorative blob */}
            <div className="absolute w-32 h-32 rounded-full -top-10 -right-10 bg-gradient-to-br from-white/40 to-transparent blur-2xl" />
            
            <div className="relative flex items-center justify-between">
                <div className="flex-1">
                    <p className="mb-2 text-sm font-semibold text-gray-600">{title}</p>
                    <p className="text-2xl font-extrabold text-gray-900 lg:text-3xl tabular-nums">{value}</p>
                    {subtitle && <p className="text-xs text-gray-500 mt-1.5">{subtitle}</p>}
                    {trend && (
                        <div
                            className={`inline-flex items-center gap-1 mt-2 text-xs font-semibold px-2 py-1 rounded-full ${
                                trend.isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}
                        >
                            {trend.isPositive ? (
                                <ArrowTrendingUpIcon className="w-3 h-3" />
                            ) : (
                                <ArrowTrendingDownIcon className="w-3 h-3" />
                            )}
                            <span>{trend.isPositive ? '+' : ''}{trend.value.toLocaleString('id-ID')}</span>
                        </div>
                    )}
                </div>
                <div className={`bg-gradient-to-br ${gradient} p-4 rounded-2xl shadow-lg ${shadow} group-hover:scale-110 transition-transform duration-300`}>
                    <div className="text-white">{icon}</div>
                </div>
            </div>
        </div>
    );
};
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
                {/* Tab Buttons - Simple like Pembelian */}
                <div className="flex flex-wrap gap-2">
                    {tabs.map((t) => {
                        const isActive = activeTab === (t.id as FilterType);
                        return (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => onTabChange(t.id as FilterType)}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                                    isActive
                                        ? 'bg-blue-500 text-white shadow-sm'
                                        : 'bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                                }`}
                            >
                                {t.label}
                            </button>
                        );
                    })}
                </div>

                {/* Custom Date Range - inline */}
                {activeTab === 'kustom' && (
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
                        <button
                            onClick={onApplyCustom}
                            className="px-4 py-1.5 text-sm font-semibold text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
                        >
                            Terapkan
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// Small component: numeric inline badge
const StatBadge: React.FC<{ label: string; value: string; tone?: 'blue' | 'amber' | 'green' }> = ({
                                                                                                      label,
                                                                                                      value,
                                                                                                      tone = 'blue',
                                                                                                  }) => {
    const tones: Record<string, string> = {
        blue: 'from-blue-50 to-indigo-50 text-blue-700 border-blue-100',
        amber: 'from-amber-50 to-orange-50 text-amber-700 border-amber-100',
        green: 'from-green-50 to-emerald-50 text-green-700 border-green-100',
    };
    return (
        <div
            className={`inline-flex items-center gap-2 bg-gradient-to-r ${tones[tone]} px-3 py-1.5 rounded-lg text-xs font-semibold border`}
        >
            <HashtagIcon className="w-3.5 h-3.5" />
            {label}: <span className="tabular-nums">{value}</span>
        </div>
    );
};

// Detail KPI Modal (unchanged except style tweaks)
const DetailModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    title: string;
    data: any[];
    type: 'production' | 'materials' | 'stock';
}> = ({ isOpen, onClose, title, data, type }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    const totalPages = Math.ceil(data.length / itemsPerPage) || 1;
    const currentItems = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return data.slice(startIndex, startIndex + itemsPerPage);
    }, [data, currentPage]);

    useEffect(() => setCurrentPage(1), [data, type]);

    const render = () => {
        switch (type) {
            case 'production':
                return (
                    <div className="space-y-3">
                        {currentItems.map((i, idx) => (
                            <div
                                key={idx}
                                className="flex items-center justify-between p-4 border border-blue-200 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100"
                            >
                                <span className="font-medium text-gray-800">{i.produk?.nama_produk ?? 'Produk'}</span>
                                <span className="text-lg font-bold text-blue-700">
                  {Number(i.jumlah_produksi_kg || 0).toLocaleString('id-ID')} Kg
                </span>
                            </div>
                        ))}
                    </div>
                );
            case 'materials': {
                const agg = currentItems.reduce((acc: Record<string, number>, it: any) => {
                    (it.sumber_digunakan || []).forEach((s: any) => {
                        const nm =
                            s.batch_pembelian?.produk?.nama_produk ||
                            s.stok_produk?.produk?.nama_produk ||
                            s.batch_produksi_sumber?.produk?.nama_produk ||
                            'Bahan';
                        acc[nm] = (acc[nm] || 0) + (s.jumlah_kg_digunakan || 0);
                    });
                    return acc;
                }, {});
                return (
                    <div className="space-y-3">
                        {Object.entries(agg).map(([name, kg]) => (
                            <div
                                key={name}
                                className="flex items-center justify-between p-4 border rounded-lg bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200"
                            >
                                <span className="font-medium text-gray-800">{name}</span>
                                <span className="text-lg font-bold text-amber-700">{Number(kg).toLocaleString('id-ID')} Kg</span>
                            </div>
                        ))}
                    </div>
                );
            }
            case 'stock':
                return (
                    <div className="space-y-3">
                        {currentItems.map((i, idx) => (
                            <div
                                key={idx}
                                className="flex items-center justify-between p-4 border border-green-200 rounded-lg bg-gradient-to-r from-green-50 to-green-100"
                            >
                                <span className="font-medium text-gray-800">{i.produk?.nama_produk ?? 'Produk'}</span>
                                <span className="text-lg font-bold text-green-700">
                  {Number(i.sisa_kg || 0).toLocaleString('id-ID')} Kg
                </span>
                            </div>
                        ))}
                    </div>
                );
            default:
                return null;
        }
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
                            <Dialog.Panel className="w-full max-w-2xl overflow-hidden transition-all transform bg-white border border-gray-100 shadow-2xl rounded-2xl">
                                <div className="relative px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-slate-50 to-slate-100">
                                    <Dialog.Title className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                        {title}
                                    </Dialog.Title>
                                    <button
                                        onClick={onClose}
                                        className="absolute p-2 text-gray-400 transition-colors rounded-lg top-4 right-4 hover:text-gray-600 hover:bg-gray-100"
                                    >
                                        <XMarkIcon className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="p-6">{render()}</div>

                                {totalPages > 1 && (
                                    <div className="flex items-center justify-between px-6 pb-6">
                                        <p className="text-sm text-gray-500">
                                            Menampilkan {Math.min(itemsPerPage, data.length - (currentPage - 1) * itemsPerPage)} dari {data.length} item
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                                                disabled={currentPage === 1}
                                                className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Prev
                                            </button>
                                            <span className="px-3 py-1 text-sm text-gray-600">
                        {currentPage} / {totalPages}
                      </span>
                                            <button
                                                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                                                disabled={currentPage === totalPages}
                                                className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-end px-6 py-4 border-t border-gray-200 bg-gray-50">
                                    <button
                                        onClick={onClose}
                                        className="px-4 py-2 text-gray-700 transition-colors bg-gray-200 rounded-lg hover:bg-gray-300"
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
};

// ---------------------------------------------------------------------
// Production Detail Modal - Shows all info + history when row is clicked
// ---------------------------------------------------------------------
const ProductionDetailModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    item: BatchProduksi | null;
    historyData: LogProduksi[];
    isHistoryLoading: boolean;
}> = ({ isOpen, onClose, item, historyData, isHistoryLoading }) => {
    if (!item) return null;

    const totalBahan = (item.sumber_digunakan || []).reduce((t, s) => t + (s.jumlah_kg_digunakan || 0), 0);
    const totalGabah = (item.sumber_digunakan || []).reduce((t, s) => {
        const tp =
            s.batch_pembelian?.produk?.tipe_produk ||
            s.stok_produk?.produk?.tipe_produk ||
            s.batch_produksi_sumber?.produk?.tipe_produk;
        return tp === 'BAHAN_MENTAH' ? t + (s.jumlah_kg_digunakan || 0) : t;
    }, 0);

    const output = item.jumlah_produksi_kg || 0;
    const sisa = item.sisa_kg || 0;
    const terpakai = output - sisa;
    
    // Bahan non-gabah (beras jadi, produk sampingan) = campuran
    const bahanCampuran = totalBahan - totalGabah;
    
    // Rendemen Gabah Murni: (Output - Campuran) / Gabah × 100
    // Ini = berapa persen gabah yang jadi beras (hasil giling murni)
    const hasilGilingGabah = Math.max(0, output - bahanCampuran);
    const rendemenGabah = totalGabah > 0 ? (hasilGilingGabah / totalGabah) * 100 : 0;

    const tanggalLabel = new Date(item.tgl_produksi).toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
    const jamLabel = new Date(item.tgl_produksi).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
    });

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
                            <Dialog.Panel className="w-full max-w-5xl overflow-hidden bg-white shadow-2xl rounded-2xl">
                                {/* Header - Gradient Blue */}
                                <div className="relative px-6 py-6 overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700">
                                    {/* Decorative elements */}
                                    <div className="absolute top-0 right-0 w-64 h-64 translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 blur-3xl" />
                                    <div className="absolute bottom-0 left-0 w-32 h-32 -translate-x-1/2 translate-y-1/2 rounded-full bg-blue-400/20 blur-2xl" />
                                    
                                    <div className="relative flex items-start justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="p-4 rounded-2xl bg-white/15 backdrop-blur-sm ring-1 ring-white/20">
                                                <FaIndustry className="text-white w-7 h-7" />
                                            </div>
                                            <div>
                                                <Dialog.Title className="text-2xl font-bold text-white">
                                                    {item.produk?.nama_produk || 'Detail Produksi'}
                                                </Dialog.Title>
                                                <p className="mt-1 text-blue-100">
                                                    {tanggalLabel} • {jamLabel}
                                                </p>
                                                <div className="flex items-center gap-2 mt-3">
                                                    <span className="px-3 py-1 text-xs font-bold text-white rounded-full bg-white/20">
                                                        Batch #{item.id}
                                                    </span>
                                                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${sisa > 0 ? 'bg-emerald-400/30 text-emerald-100' : 'bg-white/10 text-white/70'}`}>
                                                        {sisa > 0 ? 'Stok Tersedia' : 'Stok Habis'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={onClose}
                                            className="p-2 text-white transition-colors rounded-xl bg-white/10 hover:bg-white/20 ring-1 ring-white/20"
                                        >
                                            <XMarkIcon className="w-6 h-6" />
                                        </button>
                                    </div>
                                </div>

                                {/* Body */}
                                <div className="max-h-[70vh] overflow-y-auto">
                                    {/* Stats Cards */}
                                    <div className="p-6 bg-gradient-to-b from-blue-50 to-white">
                                        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                                            {/* Output */}
                                            <div className="relative p-5 overflow-hidden transition-all bg-white border border-blue-100 shadow-sm rounded-2xl group hover:shadow-md hover:border-blue-200">
                                                <div className="absolute w-16 h-16 rounded-full opacity-50 -right-4 -top-4 bg-blue-50" />
                                                <div className="relative">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className="p-2 bg-blue-100 rounded-lg">
                                                            <ArrowDownTrayIcon className="w-4 h-4 text-blue-600" />
                                                        </div>
                                                        <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Output</p>
                                                    </div>
                                                    <p className="text-3xl font-extrabold text-blue-600 tabular-nums">{output.toLocaleString('id-ID')}</p>
                                                    <p className="mt-1 text-sm text-gray-500">Kilogram dihasilkan</p>
                                                </div>
                                            </div>

                                            {/* Sisa Stok */}
                                            <div className="relative p-5 overflow-hidden transition-all bg-white border border-blue-100 shadow-sm rounded-2xl group hover:shadow-md hover:border-blue-200">
                                                <div className="absolute w-16 h-16 rounded-full opacity-50 -right-4 -top-4 bg-blue-50" />
                                                <div className="relative">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className="p-2 bg-blue-100 rounded-lg">
                                                            <CubeIcon className="w-4 h-4 text-blue-600" />
                                                        </div>
                                                        <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Sisa Stok</p>
                                                    </div>
                                                    <p className={`text-3xl font-extrabold tabular-nums ${sisa > 0 ? 'text-blue-600' : 'text-gray-400'}`}>{sisa.toLocaleString('id-ID')}</p>
                                                    <p className="mt-1 text-sm text-gray-500">{sisa > 0 ? 'Kg tersedia' : 'Stok habis'}</p>
                                                </div>
                                            </div>

                                            {/* Bahan Baku */}
                                            <div className="relative p-5 overflow-hidden transition-all bg-white border border-blue-100 shadow-sm rounded-2xl group hover:shadow-md hover:border-blue-200">
                                                <div className="absolute w-16 h-16 rounded-full opacity-50 -right-4 -top-4 bg-blue-50" />
                                                <div className="relative">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className="p-2 bg-blue-100 rounded-lg">
                                                            <ScaleIcon className="w-4 h-4 text-blue-600" />
                                                        </div>
                                                        <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Bahan Baku</p>
                                                    </div>
                                                    <p className="text-3xl font-extrabold text-blue-600 tabular-nums">{totalBahan.toLocaleString('id-ID')}</p>
                                                    <p className="mt-1 text-sm text-gray-500">{(item.sumber_digunakan || []).length} sumber bahan</p>
                                                </div>
                                            </div>

                                            {/* HPP */}
                                            <div className="relative p-5 overflow-hidden transition-all bg-white border border-blue-100 shadow-sm rounded-2xl group hover:shadow-md hover:border-blue-200">
                                                <div className="absolute w-16 h-16 rounded-full opacity-50 -right-4 -top-4 bg-blue-50" />
                                                <div className="relative">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className="p-2 bg-blue-100 rounded-lg">
                                                            <CurrencyDollarIcon className="w-4 h-4 text-blue-600" />
                                                        </div>
                                                        <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">HPP</p>
                                                    </div>
                                                    <p className="text-2xl font-extrabold text-blue-600">{formatRupiah(item.total_biaya_produksi || 0)}</p>
                                                    <p className="mt-1 text-sm text-gray-500">Total biaya produksi</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Rendemen Card - Simple dengan info campuran */}
                                        <div className="p-5 mt-4 text-white shadow-lg bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-blue-500/20">
                                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-3 rounded-xl bg-white/20 backdrop-blur">
                                                        <SparklesIcon className="w-6 h-6 text-white" />
                                                    </div>
                                                    <div>
                                                        <p className="text-lg font-bold">Rendemen Giling Gabah</p>
                                                        <p className="text-sm text-blue-100">
                                                            {totalGabah > 0 
                                                                ? `${totalGabah.toLocaleString('id-ID')} Kg gabah → ${hasilGilingGabah.toLocaleString('id-ID')} Kg beras`
                                                                : 'Tidak ada gabah yang digiling'
                                                            }
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-right">
                                                        <p className="text-4xl font-extrabold tabular-nums">{rendemenGabah.toFixed(1)}%</p>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Info breakdown jika ada campuran */}
                                            {bahanCampuran > 0 && (
                                                <div className="pt-3 mt-4 border-t border-white/20">
                                                    <div className="flex items-center gap-2 text-sm text-blue-100">
                                                        <PlusIcon className="w-4 h-4" />
                                                        <span>Ditambah <span className="font-bold text-white">{bahanCampuran.toLocaleString('id-ID')} Kg</span> bahan campuran (beras/produk jadi)</span>
                                                    </div>
                                                    <p className="mt-2 text-xs text-blue-200">
                                                        Total output: {hasilGilingGabah.toLocaleString('id-ID')} Kg (giling) + {bahanCampuran.toLocaleString('id-ID')} Kg (campuran) = <span className="font-bold text-white">{output.toLocaleString('id-ID')} Kg</span>
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Content Grid */}
                                    <div className="p-6 pt-0">
                                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                                            {/* Bahan Baku Section */}
                                            <div className="overflow-hidden bg-white border border-gray-200 shadow-sm rounded-2xl">
                                                <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-blue-50">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
                                                                <ScaleIcon className="w-5 h-5 text-white" />
                                                            </div>
                                                            <div>
                                                                <h3 className="font-bold text-gray-900">Bahan Baku Digunakan</h3>
                                                                <p className="text-xs text-gray-500">{(item.sumber_digunakan || []).length} sumber bahan</p>
                                                            </div>
                                                        </div>
                                                        <span className="px-3 py-1.5 text-sm font-bold rounded-full bg-blue-100 text-blue-700">
                                                            {totalBahan.toLocaleString('id-ID')} Kg
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="p-4 space-y-2 overflow-y-auto max-h-72">
                                                    {(item.sumber_digunakan || []).length === 0 ? (
                                                        <div className="py-8 text-center">
                                                            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full">
                                                                <ScaleIcon className="w-6 h-6 text-gray-400" />
                                                            </div>
                                                            <p className="text-sm font-medium text-gray-600">Tidak ada data bahan baku</p>
                                                        </div>
                                                    ) : (
                                                        (item.sumber_digunakan || []).map((s, i) => {
                                                            const nama = s.batch_pembelian?.produk?.nama_produk
                                                                || s.stok_produk?.produk?.nama_produk
                                                                || s.batch_produksi_sumber?.produk?.nama_produk
                                                                || 'Bahan';
                                                            const sumber = s.batch_pembelian?.nama_pemasok
                                                                ? s.batch_pembelian.nama_pemasok
                                                                : s.stok_produk ? 'Stok Umum'
                                                                : s.batch_produksi_sumber ? `Batch #${s.batch_produksi_sumber.id}` : '-';
                                                            const tipe = s.batch_pembelian?.produk?.tipe_produk
                                                                || s.stok_produk?.produk?.tipe_produk
                                                                || s.batch_produksi_sumber?.produk?.tipe_produk;
                                                            const isGabah = tipe === 'BAHAN_MENTAH';

                                                            return (
                                                                <div key={i} className="flex items-center justify-between p-4 transition-all border border-gray-100 bg-gradient-to-r from-gray-50 to-blue-50/30 rounded-xl hover:border-blue-200 hover:shadow-sm">
                                                                    <div className="flex items-center min-w-0 gap-3">
                                                                        <div className={`w-3 h-3 rounded-full ${isGabah ? 'bg-yellow-500' : 'bg-blue-500'}`} />
                                                                        <div className="min-w-0">
                                                                            <p className="font-semibold text-gray-900 truncate">{nama}</p>
                                                                            <p className="text-xs text-gray-500">{sumber} {isGabah && <span className="font-medium text-yellow-600">• Gabah</span>}</p>
                                                                        </div>
                                                                    </div>
                                                                    <p className="ml-3 text-base font-bold text-blue-600 tabular-nums shrink-0">
                                                                        {Number(s.jumlah_kg_digunakan || 0).toLocaleString('id-ID')} Kg
                                                                    </p>
                                                                </div>
                                                            );
                                                        })
                                                    )}

                                                    {/* Kemasan */}
                                                    {(item.sumber_karung || []).length > 0 && (
                                                        <div className="pt-4 mt-4 border-t border-gray-200">
                                                            <p className="mb-3 text-xs font-bold tracking-wider text-gray-500 uppercase">Kemasan Digunakan</p>
                                                            {(item.sumber_karung || []).map((k, i) => (
                                                                <div key={i} className="flex items-center justify-between p-4 border border-gray-100 bg-gradient-to-r from-gray-50 to-blue-50/30 rounded-xl">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-3 h-3 bg-blue-400 rounded-full" />
                                                                        <p className="font-semibold text-gray-900">
                                                                            {k.batch_karung?.produk?.nama_produk || 'Karung'}
                                                                        </p>
                                                                    </div>
                                                                    <p className="text-base font-bold text-blue-600 tabular-nums">
                                                                        {k.jumlah_digunakan} Pcs
                                                                    </p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Riwayat Section */}
                                            <div className="overflow-hidden bg-white border border-gray-200 shadow-sm rounded-2xl">
                                                <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-blue-50">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
                                                            <ClockIcon className="w-5 h-5 text-white" />
                                                        </div>
                                                        <div>
                                                            <h3 className="font-bold text-gray-900">Riwayat Penggunaan</h3>
                                                            <p className="text-xs text-gray-500">Log aktivitas stok batch ini</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="p-4 space-y-2 overflow-y-auto max-h-72">
                                                    {isHistoryLoading ? (
                                                        <div className="flex flex-col items-center justify-center py-8">
                                                            <div className="w-10 h-10 mb-3 border-4 border-blue-200 rounded-full border-t-blue-600 animate-spin" />
                                                            <p className="text-sm text-gray-500">Memuat riwayat...</p>
                                                        </div>
                                                    ) : historyData.length === 0 ? (
                                                        <div className="py-8 text-center">
                                                            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full">
                                                                <ClockIcon className="w-6 h-6 text-gray-400" />
                                                            </div>
                                                            <p className="text-sm font-medium text-gray-600">Belum ada riwayat transaksi</p>
                                                        </div>
                                                    ) : (
                                                        historyData.map((log) => {
                                                            const isIn = log.tipe_log === 'PRODUKSI_AWAL';
                                                            return (
                                                                <div key={log.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                                                                    isIn 
                                                                        ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200' 
                                                                        : 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200'
                                                                }`}>
                                                                    <div className="flex items-center min-w-0 gap-3">
                                                                        <div className={`p-2 rounded-lg ${isIn ? 'bg-blue-100' : 'bg-gray-100'}`}>
                                                                            {isIn ? (
                                                                                <ArrowDownTrayIcon className="w-4 h-4 text-blue-600" />
                                                                            ) : (
                                                                                <ArrowUpTrayIcon className="w-4 h-4 text-gray-600" />
                                                                            )}
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            <p className="font-semibold text-gray-900">{labelLogProduksi(log.tipe_log)}</p>
                                                                            <p className="text-xs text-gray-500">
                                                                                {new Date(log.timestamp).toLocaleString('id-ID', {
                                                                                    day: 'numeric', month: 'short', year: 'numeric',
                                                                                    hour: '2-digit', minute: '2-digit'
                                                                                })}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="ml-3 text-right shrink-0">
                                                                        <p className={`text-base font-bold tabular-nums ${isIn ? 'text-blue-600' : 'text-gray-700'}`}>
                                                                            {isIn ? '+' : '-'}{Math.abs(log.jumlah_kg).toLocaleString('id-ID')} Kg
                                                                        </p>
                                                                        <p className="text-xs text-gray-500">
                                                                            Sisa: <span className="font-semibold">{log.sisa_kg_setelah_transaksi.toLocaleString('id-ID')}</span> Kg
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
                                    <p className="text-xs text-gray-500">
                                        Tekan <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs font-mono">Esc</kbd> atau klik di luar untuk menutup
                                    </p>
                                    <button
                                        onClick={onClose}
                                        className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm"
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
};


// ---------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------
const ProduksiPage: React.FC = () => {
    // Master data
    const [produksiList, setProduksiList] = useState<BatchProduksi[]>([]);
    const [sumberBahanList, setSumberBahanList] = useState<SumberBahan[]>([]);
    const [produkJadiList, setProdukJadiList] = useState<Produk[]>([]);
    const [karungList, setKarungList] = useState<BatchKarung[]>([]);

    // Load & error
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [activeTab, setActiveTab] = useState<FilterType>('hari_ini');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Pagination (table)
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;
    const [displayedItemsLimit, setDisplayedItemsLimit] = useState(60);

    // History modal
    const [isHistoryVisible, setIsHistoryVisible] = useState(false);
    const [historyData, setHistoryData] = useState<LogProduksi[]>([]);
    const [selectedProduksi, setSelectedProduksi] = useState<BatchProduksi | null>(null);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);

    // KPI detail modal
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [detailModalData, setDetailModalData] = useState<any[]>([]);
    const [detailModalTitle, setDetailModalTitle] = useState('');
    const [detailModalType, setDetailModalType] = useState<'production' | 'materials' | 'stock'>('production');

    // Form (revamped wizard)
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editItem, setEditItem] = useState<BatchProduksi | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [sumberDipilih, setSumberDipilih] = useState<{ kategori: SumberBahan['tipe_produk'] | ''; id: string; jumlah: string }[]>([
        { kategori: '', id: '', jumlah: '' },
    ]);
    const [produkHasilId, setProdukHasilId] = useState('');
    const [jumlahHasilKg, setJumlahHasilKg] = useState('');
    const [karungDigunakan, setKarungDigunakan] = useState<{ produk_id: string; jumlah: string }[]>([
        { produk_id: '', jumlah: '' },
    ]);

    // Wizard step
    const [step, setStep] = useState<1 | 2 | 3>(1);

    // Delete modal
    const [itemToDelete, setItemToDelete] = useState<BatchProduksi | null>(null);

    // -------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------
    const getDateRange = useCallback(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        switch (activeTab) {
            case 'hari_ini':
                return { from: today, to: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1) };
            case 'minggu_ini': {
                const start = new Date(today);
                start.setDate(today.getDate() - today.getDay());
                const end = new Date(start);
                end.setDate(start.getDate() + 6);
                end.setHours(23, 59, 59, 999);
                return { from: start, to: end };
            }
            case 'bulan_ini': {
                const start = new Date(today.getFullYear(), today.getMonth(), 1);
                const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                end.setHours(23, 59, 59, 999);
                return { from: start, to: end };
            }
            case 'kustom':
                return {
                    from: dateFrom ? new Date(dateFrom) : null,
                    to: dateTo ? new Date(dateTo + 'T23:59:59') : null,
                };
            default:
                return { from: null, to: null };
        }
    }, [activeTab, dateFrom, dateTo]);

    const filteredProduksiList = useMemo(() => {
        const { from, to } = getDateRange();
        if (!from || !to) return [];
        return produksiList.filter((p) => {
            const d = new Date(p.tgl_produksi);
            return d >= from && d <= to;
        });
    }, [produksiList, getDateRange]);

    const enhancedSummary = useMemo(() => {
        const curr = filteredProduksiList.reduce(
            (acc, item) => {
                const totalBahan = (item.sumber_digunakan || []).reduce((t, s) => t + (s.jumlah_kg_digunakan || 0), 0);
                const totalGabah = (item.sumber_digunakan || []).reduce((t, s) => {
                    const tp =
                        s.batch_pembelian?.produk?.tipe_produk ||
                        s.stok_produk?.produk?.tipe_produk ||
                        s.batch_produksi_sumber?.produk?.tipe_produk;
                    return tp === 'BAHAN_MENTAH' ? t + (s.jumlah_kg_digunakan || 0) : t;
                }, 0);

                acc.totalProduksi += item.jumlah_produksi_kg || 0;
                acc.totalBahan += totalBahan;
                acc.totalGabah += totalGabah;
                acc.totalSisa += item.sisa_kg || 0;
                return acc;
            },
            { totalProduksi: 0, totalBahan: 0, totalGabah: 0, totalSisa: 0 },
        );

        // trend vs previous same-length period
        const { from, to } = getDateRange();
        let prev = { totalProduksi: 0, totalBahan: 0, totalSisa: 0 };
        if (from && to) {
            const period = to.getTime() - from.getTime();
            const pFrom = new Date(from.getTime() - period);
            const pTo = new Date(to.getTime() - period);
            prev = produksiList
                .filter((i) => {
                    const d = new Date(i.tgl_produksi);
                    return d >= pFrom && d <= pTo;
                })
                .reduce(
                    (acc, i) => {
                        const tb = (i.sumber_digunakan || []).reduce((t, s) => t + (s.jumlah_kg_digunakan || 0), 0);
                        acc.totalProduksi += i.jumlah_produksi_kg || 0;
                        acc.totalBahan += tb;
                        acc.totalSisa += i.sisa_kg || 0;
                        return acc;
                    },
                    { totalProduksi: 0, totalBahan: 0, totalSisa: 0 },
                );
        }

        const hasCurr = curr.totalProduksi > 0 || curr.totalBahan > 0 || curr.totalSisa > 0;
        const hasPrev = prev.totalProduksi > 0 || prev.totalBahan > 0 || prev.totalSisa > 0;

        return {
            ...curr,
            trends: {
                produksi: hasCurr && hasPrev ? { value: curr.totalProduksi - prev.totalProduksi, isPositive: curr.totalProduksi >= prev.totalProduksi } : undefined,
                materials: hasCurr && hasPrev ? { value: curr.totalBahan - prev.totalBahan, isPositive: curr.totalBahan >= prev.totalBahan } : undefined,
                sisa: hasCurr && hasPrev ? { value: curr.totalSisa - prev.totalSisa, isPositive: curr.totalSisa <= prev.totalSisa } : undefined,
            },
        };
    }, [filteredProduksiList, produksiList, getDateRange]);

    const handleKPIClick = useCallback(
        (type: 'production' | 'materials' | 'stock') => {
            setDetailModalType(type);
            setDetailModalData(filteredProduksiList);
            setDetailModalTitle(
                type === 'production'
                    ? 'Detail Produksi per Produk'
                    : type === 'materials'
                        ? 'Detail Penggunaan Bahan Baku'
                        : 'Detail Sisa per Batch',
            );
            setIsDetailModalOpen(true);
        },
        [filteredProduksiList],
    );

    // -------------------------------------------------------------------
    // Data fetching - fetch ALL data once, filter client-side
    // -------------------------------------------------------------------
    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            // 1) Master untuk dropdown
            const [pembelianData, stokData, produkData, karungData] = await Promise.all([
                api.getAllPembelian(),
                api.getAllStokProduk(),
                api.getAllProduk(),
                api.getAllKarung(),
            ]);

            const allProduk = Array.isArray(produkData) ? (produkData as Produk[]) : [];
            setProdukJadiList(allProduk.filter((p) => p.tipe_produk === 'PRODUK_JADI'));

            const sources: SumberBahan[] = [];
            if (Array.isArray(pembelianData)) {
                (pembelianData as BatchPembelian[])
                    .filter((b) => b.produk && b.sisa_kg > 0)
                    .forEach((b) =>
                        sources.push({
                            tipe_sumber: 'BATCH_PEMBELIAN',
                            sumber_id: b.id,
                            nama: `${b.produk.nama_produk} dari ${b.nama_pemasok}`,
                            sisa_kg: b.sisa_kg,
                            pemasok: b.nama_pemasok,
                            tipe_produk: 'BAHAN_MENTAH',
                        }),
                    );
            }
            if (Array.isArray(stokData)) {
                (stokData as StokProduk[])
                    .filter(
                        (s) =>
                            s.produk &&
                            s.total_stok_kg > 0 &&
                            (s.produk.tipe_produk === 'PRODUK_SAMPINGAN' || s.produk.tipe_produk === 'PRODUK_JADI'),
                    )
                    .forEach((s) =>
                        sources.push({
                            tipe_sumber: 'STOK_PRODUK',
                            sumber_id: s.produk_id,
                            nama: `${s.produk.nama_produk} (Stok Umum)`,
                            sisa_kg: s.total_stok_kg,
                            tipe_produk: s.produk.tipe_produk as any,
                        }),
                    );
            }
            setSumberBahanList(sources);
            setKarungList(Array.isArray(karungData) ? (karungData as BatchKarung[]).filter((k) => k.sisa > 0) : []);

            // 2) Data produksi - AMBIL SEMUA tanpa filter, filter di client-side
            try {
                const paged = await api.getProduksiPaginated({
                    page: 1,
                    limit: 1000, // ambil banyak
                    // TIDAK pakai dateFrom/dateTo - ambil semua
                });
                setProduksiList(paged?.data || []);
            } catch {
                // fallback
                const all = await api.getAllProduksi();
                setProduksiList(
                    (Array.isArray(all) ? (all as BatchProduksi[]) : []).sort(
                        (a, b) => new Date(b.tgl_produksi).getTime() - new Date(a.tgl_produksi).getTime(),
                    ),
                );
            }
        } catch (err: any) {
            const msg = err?.message || 'Gagal memuat data';
            setError(msg);
            showToast(msg, 'error');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Initial fetch only
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Reset page saat filter berubah (tanpa refetch - filtering di client)
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, dateFrom, dateTo]);

    // -------------------------------------------------------------------
    // History
    // -------------------------------------------------------------------
    const handleViewHistory = async (item: BatchProduksi) => {
        setSelectedProduksi(item);
        setIsHistoryVisible(true);
        setIsHistoryLoading(true);
        try {
            const data = await api.getProduksiHistory(item.id);
            setHistoryData(data || []);
        } catch (err: any) {
            showToast(err?.message || 'Gagal memuat histori produksi', 'error');
        } finally {
            setIsHistoryLoading(false);
        }
    };

    const handleCloseHistoryModal = () => {
        setIsHistoryVisible(false);
        setHistoryData([]);
        setSelectedProduksi(null);
    };

    // -------------------------------------------------------------------
    // Wizard Form: helpers & handlers
    // -------------------------------------------------------------------
    const resetForm = () => {
        setSumberDipilih([{ kategori: '', id: '', jumlah: '' }]);
        setProdukHasilId('');
        setJumlahHasilKg('');
        setKarungDigunakan([{ produk_id: '', jumlah: '' }]);
        setIsEditing(false);
        setEditItem(null);
        setStep(1);
    };
    const openForm = () => {
        resetForm();
        setIsFormVisible(true);
    };
    const closeForm = () => {
        resetForm();
        setIsFormVisible(false);
    };

    const isLocked = (p: BatchProduksi) => {
        const sisa = Number(p.sisa_kg ?? 0);
        const hasil = Number(p.jumlah_produksi_kg ?? 0);
        return p.is_terpakai || sisa !== hasil;
    };

    const handleEdit = (p: BatchProduksi) => {
        setIsEditing(true);
        setEditItem(p);
        setProdukHasilId(String(p.produk_id));
        
        // Hitung bahan campuran dari data existing
        const totalBahanEdit = (p.sumber_digunakan || []).reduce((t, s) => t + (s.jumlah_kg_digunakan || 0), 0);
        const totalGabahEdit = (p.sumber_digunakan || []).reduce((t, s) => {
            const tp = s.batch_pembelian?.produk?.tipe_produk 
                || s.stok_produk?.produk?.tipe_produk 
                || s.batch_produksi_sumber?.produk?.tipe_produk;
            return tp === 'BAHAN_MENTAH' ? t + (s.jumlah_kg_digunakan || 0) : t;
        }, 0);
        const bahanCampuranEdit = totalBahanEdit - totalGabahEdit;
        
        // jumlahHasilKg = hasil giling = output - campuran
        const outputEdit = p.jumlah_produksi_kg || 0;
        const hasilGilingEdit = outputEdit - bahanCampuranEdit;
        setJumlahHasilKg(String(hasilGilingEdit > 0 ? hasilGilingEdit : outputEdit));
        
        const sumberFromData =
            (p.sumber_digunakan || []).map((s: any) => {
                let idUntukForm = '';
                let kategori: any = '';
                if (s.batch_pembelian_id && s.batch_pembelian) {
                    idUntukForm = `BATCH_PEMBELIAN-${s.batch_pembelian_id}`;
                    kategori = s.batch_pembelian.produk.tipe_produk;
                } else if (s.stok_produk_id && s.stok_produk) {
                    idUntukForm = `STOK_PRODUK-${s.stok_produk.produk_id}`;
                    kategori = s.stok_produk.produk.tipe_produk;
                } else if (s.batch_produksi_sumber?.id && s.batch_produksi_sumber) {
                    idUntukForm = `BATCH_PRODUKSI-${s.batch_produksi_sumber.id}`;
                    kategori = s.batch_produksi_sumber.produk.tipe_produk;
                }
                return { kategori, id: idUntukForm, jumlah: String(s.jumlah_kg_digunakan || '') };
            }) || [];
        const karungFromData =
            (p.sumber_karung || []).map((k: any) => ({
                produk_id: String(k.batch_karung?.produk_id || ''),
                jumlah: String(k.jumlah_digunakan || ''),
            })) || [];

        setKarungDigunakan(
            karungFromData.length ? karungFromData : [{ produk_id: '', jumlah: '' }],
        );
        setSumberDipilih(sumberFromData.length ? sumberFromData : [{ kategori: '', id: '', jumlah: '' }]);
        setIsFormVisible(true);
        setStep(1);
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;
        setIsSubmitting(true);
        try {
            await api.deleteProduksi(itemToDelete.id);
            showToast('Data produksi berhasil dihapus!', 'success');
            setItemToDelete(null);
            fetchData();
        } catch (err: any) {
            showToast(err?.message || 'Gagal menghapus data', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSumberChange = (idx: number, field: 'kategori' | 'id' | 'jumlah', val: string) => {
        const next = [...sumberDipilih];
        if (field === 'kategori') next[idx].id = '';
        next[idx][field] = val as any;
        setSumberDipilih(next);
    };
    const tambahSumber = () => setSumberDipilih((s) => [...s, { kategori: '', id: '', jumlah: '' }]);
    const hapusSumber = (idx: number) => setSumberDipilih((s) => (s.length > 1 ? s.filter((_, i) => i !== idx) : s));

    const handleKarungChange = (idx: number, field: 'produk_id' | 'jumlah', val: string) => {
        const next = [...karungDigunakan];
        next[idx][field] = val;
        setKarungDigunakan(next);
    };
    const tambahKarung = () => setKarungDigunakan((k) => [...k, { produk_id: '', jumlah: '' }]);
    const hapusKarung = (idx: number) => setKarungDigunakan((k) => (k.length > 1 ? k.filter((_, i) => i !== idx) : k));

    // stok sisa yang masih bisa dipakai pada baris tertentu
    const hitungSisaStok = (currentIndex: number) => {
        const src = sumberDipilih[currentIndex];
        if (!src.id) return 0;
        const [tipe, idStr] = src.id.split('-');
        const sumberId = parseInt(idStr, 10);
        const sumberData = sumberBahanList.find((i) => i.tipe_sumber === (tipe as any) && i.sumber_id === sumberId);
        const total = sumberData?.sisa_kg ?? 0;

        // jumlah yang sudah dipakai di baris lain untuk sumber yang sama
        const terpakai = sumberDipilih.reduce((t, s, i) => {
            if (i === currentIndex) return t;
            const [_tipe, _idStr] = String(s.id || '-0').split('-');
            return _tipe === tipe && parseInt(_idStr, 10) === sumberId ? t + parseFloat(s.jumlah || '0') : t;
        }, 0);

        // saat edit, izinkan sesuai kuantitas awal
        if (isEditing && editItem) {
            const asli = (editItem.sumber_digunakan || []).find((s: any) => {
                let asId = '';
                if (s.batch_pembelian_id) asId = `BATCH_PEMBELIAN-${s.batch_pembelian_id}`;
                else if (s.stok_produk?.produk_id) asId = `STOK_PRODUK-${s.stok_produk.produk_id}`;
                else if (s.batch_produksi_sumber?.id) asId = `BATCH_PRODUKSI-${s.batch_produksi_sumber.id}`;
                return asId === src.id;
            });
            if (asli) return total + (asli.jumlah_kg_digunakan || 0) - terpakai;
        }
        return total - terpakai;
    };

    const summaryForm = useMemo(() => {
        const totalBahan = sumberDipilih.reduce((acc, s) => acc + (parseFloat(s.jumlah || '0') || 0), 0);

        const totalGabah = sumberDipilih.reduce((acc, s) => {
            if (!s.id) return acc;
            const [tipe, idStr] = s.id.split('-');
            const sumber = sumberBahanList.find(
                (i) => `${i.tipe_sumber}-${i.sumber_id}` === `${tipe}-${idStr}`
            );
            const isGabah = sumber?.tipe_produk === 'BAHAN_MENTAH';
            return acc + (isGabah ? (parseFloat(s.jumlah || '0') || 0) : 0);
        }, 0);

        // Bahan campuran (beras jadi, produk sampingan) - BUKAN gabah
        const bahanCampuran = totalBahan - totalGabah;
        
        // Input user = hasil giling gabah murni
        const hasilGilingGabah = parseFloat(jumlahHasilKg || '0') || 0;
        
        // Output Total = hasil giling + campuran (otomatis dijumlahkan)
        const outputTotal = hasilGilingGabah + bahanCampuran;
        
        // Rendemen Gabah: Hasil Giling / Gabah × 100
        const rendemenGabah = totalGabah > 0 ? (hasilGilingGabah / totalGabah) * 100 : 0;

        // BREAKDOWN DITIPKAN KETAT
        const breakdown = sumberDipilih.reduce((acc, s) => {
            if (!s.id) return acc;
            const [tipe, idStr] = s.id.split('-');
            const sumber = sumberBahanList.find(
                (i) => `${i.tipe_sumber}-${i.sumber_id}` === `${tipe}-${idStr}`
            );
            if (!sumber) return acc;
            const key = sumber.tipe_produk as SumberBahan['tipe_produk'];
            acc[key] = (acc[key] || 0) + (parseFloat(s.jumlah || '0') || 0);
            return acc;
        }, {} as Record<SumberBahan['tipe_produk'], number>);

        return { totalBahan, totalGabah, bahanCampuran, hasilGilingGabah, outputTotal, rendemenGabah, breakdown };
    }, [sumberDipilih, jumlahHasilKg, sumberBahanList]);


    const canNextFromStep1 = useMemo(() => {
        // baris yang dianggap valid: sudah pilih sumber & isi jumlah > 0
        const validRows = sumberDipilih.filter(
            (s) => s.id && parseFloat(s.jumlah || '0') > 0,
        );

        // pastikan tidak ada satupun yang melebihi stok
        const notOver = validRows.every((sumber) => {
            const val = parseFloat(sumber.jumlah || '0') || 0;

            // cari index sumber ini di array sumberDipilih
            const idx = sumberDipilih.findIndex((r) => r === sumber);
            const sisaBaris = hitungSisaStok(idx);

            return val <= sisaBaris + 1e-9;
        });

        return validRows.length > 0 && notOver;
    }, [sumberDipilih]);



    const canNextFromStep2 = useMemo(() => {
        return !!produkHasilId && parseFloat(jumlahHasilKg || '0') > 0;
    }, [produkHasilId, jumlahHasilKg]);

// --- Stepper handlers (REPLACE) ---
    const nextStep = () => {
        if (step === 1 && !canNextFromStep1) {
            showToast('Lengkapi bahan baku dengan benar terlebih dahulu.', 'error');
            return;
        }
        if (step === 2 && !canNextFromStep2) {
            showToast('Isi produk hasil dan jumlahnya dengan benar.', 'error');
            return;
        }
        setStep((s): 1 | 2 | 3 => (s === 1 ? 2 : s === 2 ? 3 : 3));
    };

    const prevStep = () => {
        setStep((s): 1 | 2 | 3 => (s === 3 ? 2 : 1));
    };


    const handleSubmit = async () => {
        // Safety ekstra: kalau belum di step 3, jangan submit apa pun.
        if (step < 3) {
            return;
        }

        const sumberPayload: SumberBahanBakuInput[] = sumberDipilih
            .filter((s) => s.id && Number(s.jumlah) > 0)
            .map((s) => {
                const [tipe, idStr] = s.id.split('-');
                return {
                    tipe_sumber: tipe as any,
                    sumber_id: parseInt(idStr, 10),
                    jumlah_kg_digunakan: parseFloat(s.jumlah),
                };
            });

        const karungPayload: InputKarungDigunakan[] = karungDigunakan
            .filter((k) => k.produk_id && Number(k.jumlah) > 0)
            .map((k) => ({ produk_id: parseInt(k.produk_id, 10), jumlah: parseInt(k.jumlah, 10) }));
        if (karungPayload.length === 0) {
            showToast('Isi dulu kemasan (minimal 1 baris) sebelum menyimpan.', 'error');
            return;
        }

        // Gunakan outputTotal (hasil giling + campuran) sebagai jumlah yang disimpan
        const payload: InputProduksi = {
            produk_id: parseInt(produkHasilId, 10),
            jumlah_beras_dihasilkan_kg: summaryForm.outputTotal,
            sumber_bahan_baku: sumberPayload,
            karung_digunakan: karungPayload,
        };

        if (!payload.produk_id || !payload.jumlah_beras_dihasilkan_kg || sumberPayload.length === 0) {
            showToast('Semua field wajib diisi dengan benar.', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            if (isEditing && editItem) {
                await api.updateProduksi(editItem.id, payload);
                showToast('Data produksi berhasil diperbarui!');
            } else {
                await api.createProduksi(payload);
                showToast('Proses produksi berhasil dicatat!', 'success');
            }
            closeForm();
            fetchData();
        } catch (err: any) {
            showToast(err?.message || 'Gagal menyimpan data produksi', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };


    // -------------------------------------------------------------------
    // Rendering conditions
    // -------------------------------------------------------------------
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto border-b-2 border-blue-600 rounded-full animate-spin" />
                    <p className="mt-4 text-lg font-medium text-gray-700">Memuat data produksi...</p>
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
                    <p className="mb-2 text-lg font-medium text-gray-900">Terjadi Kesalahan</p>
                    <p className="mb-4 text-red-600">{error}</p>
                    <button
                        onClick={() => fetchData()}
                        className="px-4 py-2 text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
                    >
                        Coba Lagi
                    </button>
                </div>
            </div>
        );
    }

    // paginate client-side using displayedItemsLimit
    const listForPagination = filteredProduksiList.slice(0, displayedItemsLimit);
    const totalPages = Math.ceil(listForPagination.length / itemsPerPage) || 1;
    const startIdx = (currentPage - 1) * itemsPerPage;
    const currentItems = listForPagination.slice(startIdx, startIdx + itemsPerPage);

    return (
        
        <div className="min-h-screen p-4 bg-gray-50 sm:p-6">
            <div className="mx-auto space-y-6 max-w-7xl">
                {/* 🎨 HERO HEADER - Same style as Pembelian */}
                <div className="relative px-6 py-6 overflow-hidden text-white shadow-lg bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600 rounded-2xl">
                    {/* Decorative Icon */}
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <FaIndustry className="w-32 h-32" />
                    </div>

                    <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            {/* Badge */}
                            <div className="inline-flex items-center gap-2 px-3 py-1 mb-2 text-xs font-medium border rounded-full bg-white/20 backdrop-blur-sm border-white/10">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                Modul Produksi
                            </div>

                            {/* Title */}
                            <h1 className="text-3xl font-bold tracking-tight">
                                Manajemen Produksi
                            </h1>

                            {/* Description */}
                            <p className="max-w-lg mt-1 text-sm text-blue-100">
                                Kelola proses produksi dan transformasi bahan baku menjadi produk jadi
                            </p>
                        </div>

                        {/* Button */}
                        <button
                            type="button"
                            onClick={openForm}
                            className="group flex items-center gap-2 px-5 py-3 bg-white text-blue-600 rounded-xl font-bold shadow-lg hover:shadow-xl hover:bg-blue-50 transition-all transform hover:-translate-y-0.5"
                        >
                            <PlusIcon className="w-5 h-5 transition-transform duration-300 group-hover:rotate-90" />
                            <span>Catat Produksi</span>
                        </button>
                    </div>
                </div>

                {/* Filter Tabs */}
                <FilterTabs
                    activeTab={activeTab}
                    onTabChange={(t) => {
                        setActiveTab(t);
                        setCurrentPage(1);
                        if (t !== 'kustom') {
                            setDateFrom('');
                            setDateTo('');
                        }
                    }}
                    dateFrom={dateFrom}
                    dateTo={dateTo}
                    onDateFromChange={setDateFrom}
                    onDateToChange={setDateTo}
                    onApplyCustom={() => {
                        if (!dateFrom || !dateTo) return showToast('Pilih tanggal mulai & akhir', 'error');
                        setCurrentPage(1);
                    }}
                />

                {/* Summary Cards */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <EnhancedSummaryCard
                        title="Total Produksi"
                        value={`${enhancedSummary.totalProduksi.toLocaleString('id-ID')} Kg`}
                        subtitle={`Periode ${
                            activeTab === 'hari_ini' ? 'Hari Ini' : activeTab === 'minggu_ini' ? 'Minggu Ini' : activeTab === 'bulan_ini' ? 'Bulan Ini' : 'Kustom'
                        }`}
                        icon={<FaIndustry className="w-7 h-7" />}
                        bgColor="bg-blue-50"
                        iconColor="text-blue-600"
                        trend={enhancedSummary.trends.produksi}
                        onClick={() => handleKPIClick('production')}
                    />
                    <EnhancedSummaryCard
                        title="Total Bahan Baku"
                        value={`${enhancedSummary.totalBahan.toLocaleString('id-ID')} Kg`}
                        subtitle="Semua bahan yang dikonsumsi"
                        icon={<ScaleIcon className="w-8 h-8" />}
                        bgColor="bg-amber-50"
                        iconColor="text-amber-600"
                        trend={enhancedSummary.trends.materials}
                        onClick={() => handleKPIClick('materials')}
                    />
                    <EnhancedSummaryCard
                        title="Sisa Stok Total"
                        value={`${enhancedSummary.totalSisa.toLocaleString('id-ID')} Kg`}
                        subtitle="Produk tersedia untuk dijual"
                        icon={<HashtagIcon className="w-8 h-8" />}
                        bgColor="bg-green-50"
                        iconColor="text-green-600"
                        trend={enhancedSummary.trends.sisa}
                        onClick={() => handleKPIClick('stock')}
                    />
                </div>

                {/* History Table - Simplified like Pembelian */}
                <div className="overflow-hidden bg-white border border-gray-200 shadow-lg rounded-2xl">
                    {/* Table Header */}
                    <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-slate-50 via-blue-50/50 to-indigo-50/50">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 shadow-lg bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-blue-500/20">
                                    <FaIndustry className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Riwayat Produksi</h2>
                                    <p className="text-sm text-gray-500 mt-0.5">
                                        Menampilkan <span className="font-semibold text-blue-600">{listForPagination.length}</span> data untuk{' '}
                                        <span className="font-medium text-gray-700">
                                            Periode {activeTab === 'hari_ini' ? 'hari ini' : activeTab === 'minggu_ini' ? 'minggu ini' : activeTab === 'bulan_ini' ? 'bulan ini' : 'kustom'}
                                        </span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden overflow-x-auto md:block">
                        <table className="min-w-full">
                            <thead>
                                <tr className="bg-white border-b border-gray-100">
                                    <th className="px-6 py-4 text-xs font-bold tracking-wider text-left text-gray-500 uppercase">Tanggal</th>
                                    <th className="px-6 py-4 text-xs font-bold tracking-wider text-left text-gray-500 uppercase">Produk Dihasilkan</th>
                                    <th className="px-6 py-4 text-xs font-bold tracking-wider text-right text-gray-500 uppercase">Jumlah</th>
                                    <th className="px-6 py-4 text-xs font-bold tracking-wider text-right text-gray-500 uppercase">Sisa</th>
                                    <th className="px-6 py-4 text-xs font-bold tracking-wider text-center text-gray-500 uppercase">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {currentItems.length > 0 ? (
                                    currentItems.map((p) => {
                                        const locked = isLocked(p);
                                        return (
                                            <tr
                                                key={p.id}
                                                onClick={() => handleViewHistory(p)}
                                                className="transition-colors cursor-pointer group hover:bg-blue-50/30"
                                            >
                                                {/* TANGGAL */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 transition-colors rounded-lg bg-blue-50 group-hover:bg-blue-100">
                                                            <FaCalendarAlt className="w-4 h-4 text-blue-600" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-gray-900">
                                                                {new Date(p.tgl_produksi).toLocaleDateString('id-ID', {
                                                                    day: 'numeric',
                                                                    month: 'short',
                                                                    year: 'numeric',
                                                                })}
                                                            </p>
                                                            <p className="text-xs text-gray-500">
                                                                {new Date(p.tgl_produksi).toLocaleTimeString('id-ID', {
                                                                    hour: '2-digit',
                                                                    minute: '2-digit',
                                                                })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* PRODUK DIHASILKAN */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex items-center justify-center w-10 h-10 transition-transform rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 group-hover:scale-105">
                                                            <FaIndustry className="w-5 h-5 text-blue-600" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-gray-800">{p.produk?.nama_produk ?? 'Produk Dihapus'}</p>
                                                            <p className="text-xs text-gray-500">Batch #{p.id}</p>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* JUMLAH */}
                                                <td className="px-6 py-4 text-right">
                                                    <span className="text-lg font-bold text-blue-600 tabular-nums">
                                                        {(p.jumlah_produksi_kg || 0).toLocaleString('id-ID')}
                                                    </span>
                                                    <span className="ml-1 text-sm text-gray-500">Kg</span>
                                                </td>

                                                {/* SISA */}
                                                <td className="px-6 py-4 text-right">
                                                    <span className={`text-lg font-bold tabular-nums ${(p.sisa_kg || 0) > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                                                        {(p.sisa_kg || 0).toLocaleString('id-ID')}
                                                    </span>
                                                    <span className="ml-1 text-sm text-gray-500">Kg</span>
                                                </td>

                                                {/* AKSI */}
                                                <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleEdit(p);
                                                            }}
                                                            disabled={locked}
                                                            className={`p-2 rounded-xl transition-colors ${
                                                                locked
                                                                    ? 'text-gray-300 cursor-not-allowed'
                                                                    : 'text-blue-600 hover:bg-blue-50'
                                                            }`}
                                                            title={locked ? 'Batch terkunci' : 'Edit'}
                                                        >
                                                            <FaEdit className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setItemToDelete(p);
                                                            }}
                                                            disabled={locked}
                                                            className={`p-2 rounded-xl transition-colors ${
                                                                locked
                                                                    ? 'text-gray-300 cursor-not-allowed'
                                                                    : 'text-red-600 hover:bg-red-50'
                                                            }`}
                                                            title={locked ? 'Batch terkunci' : 'Hapus'}
                                                        >
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-16 text-center">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="flex items-center justify-center w-20 h-20 mb-4 rounded-full bg-gradient-to-br from-gray-100 to-gray-50">
                                                    <FaIndustry className="w-10 h-10 text-gray-300" />
                                                </div>
                                                <h3 className="text-lg font-bold text-gray-900">Belum ada data produksi</h3>
                                                <p className="max-w-sm mt-1 text-gray-500">
                                                    Coba ubah filter periode atau klik tombol "Catat Produksi" untuk memulai.
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="p-4 space-y-3 md:hidden">
                        {currentItems.length === 0 ? (
                            <div className="py-12 text-center">
                                <div className="flex items-center justify-center w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-gray-100 to-gray-50">
                                    <FaIndustry className="w-10 h-10 text-gray-300" />
                                </div>
                                <p className="mb-1 font-bold text-gray-700">Belum ada data produksi</p>
                                <p className="text-sm text-gray-500">Klik "Catat Produksi" untuk memulai</p>
                            </div>
                        ) : (
                            currentItems.map((p, idx) => {
                                const locked = isLocked(p);
                                return (
                                    <div
                                        key={p.id}
                                        onClick={() => handleViewHistory(p)}
                                        className="p-4 transition-all border-2 border-blue-200 cursor-pointer bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-50 rounded-2xl hover:shadow-lg hover:-translate-y-1"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-lg">
                                                    <FaIndustry className="w-5 h-5 text-white" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900">{p.produk?.nama_produk ?? 'Produk'}</p>
                                                    <p className="text-xs text-gray-500">
                                                        {new Date(p.tgl_produksi).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEdit(p);
                                                    }}
                                                    disabled={locked}
                                                    className={`p-2 rounded-lg ${locked ? 'text-gray-300' : 'text-blue-600 hover:bg-blue-100'}`}
                                                >
                                                    <FaEdit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setItemToDelete(p);
                                                    }}
                                                    disabled={locked}
                                                    className={`p-2 rounded-lg ${locked ? 'text-gray-300' : 'text-red-600 hover:bg-red-100'}`}
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="p-3 text-center bg-white/60 rounded-xl">
                                                <p className="mb-1 text-xs text-gray-500">Jumlah</p>
                                                <p className="text-xl font-extrabold text-blue-600 tabular-nums">{(p.jumlah_produksi_kg || 0).toLocaleString('id-ID')} <span className="text-sm font-medium">Kg</span></p>
                                            </div>
                                            <div className="p-3 text-center bg-white/60 rounded-xl">
                                                <p className="mb-1 text-xs text-gray-500">Sisa</p>
                                                <p className={`text-xl font-extrabold tabular-nums ${(p.sisa_kg || 0) > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                                                    {(p.sisa_kg || 0).toLocaleString('id-ID')} <span className="text-sm font-medium">Kg</span>
                                                </p>
                                            </div>
                                        </div>
                                        <p className="mt-3 text-xs font-medium text-center text-blue-600">Ketuk untuk melihat detail →</p>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Pagination */}
                    <div className="p-4 border-t border-gray-100 bg-gray-50">
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                            showItemsInfo
                            totalItems={listForPagination.length}
                            itemsPerPage={itemsPerPage}
                        />
                    </div>
                                                

                    

                        {/* Load more */}
                        {displayedItemsLimit < filteredProduksiList.length && (
                            <div className="pt-6 text-center">
                                <button
                                    onClick={() => setDisplayedItemsLimit((v) => Math.min(v + 60, filteredProduksiList.length))}
                                    className="inline-flex items-center gap-2 px-6 py-3 font-medium text-gray-700 transition-colors bg-gray-100 rounded-lg hover:bg-gray-200"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                    Tampilkan {Math.min(60, filteredProduksiList.length - displayedItemsLimit)} Data Lainnya
                                    <span className="text-xs text-gray-500">({displayedItemsLimit} dari {filteredProduksiList.length})</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            

            {/* KPI Detail Modal */}
            <DetailModal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                title={detailModalTitle}
                data={detailModalData}
                type={detailModalType}
            />

            {/* Production Detail Modal */}
            <ProductionDetailModal
                isOpen={isHistoryVisible}
                onClose={handleCloseHistoryModal}
                item={selectedProduksi}
                historyData={historyData}
                isHistoryLoading={isHistoryLoading}
            />

            {/* Delete Modal */}
            <Transition appear show={!!itemToDelete} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setItemToDelete(null)}>
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex items-center justify-center min-h-full p-4">
                            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
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
                                        <p className="mb-4 text-gray-700">Yakin ingin menghapus data produksi ini?</p>
                                        <div className="p-4 mb-6 border border-yellow-200 rounded-lg bg-yellow-50">
                                            <p className="text-sm text-yellow-800">⚠️ Tindakan ini tidak dapat dibatalkan. Stok dan histori terkait akan disesuaikan.</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button onClick={() => setItemToDelete(null)} className="rounded-xl border border-gray-300 bg-white py-2.5 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Batal</button>
                                            <button onClick={handleDelete} disabled={isSubmitting} className="rounded-xl bg-red-600 hover:bg-red-700 text-white py-2.5 px-4 text-sm font-semibold transition-colors disabled:opacity-60">
                                                {isSubmitting ? 'Menghapus…' : 'Ya, Hapus'}
                                            </button>
                                        </div>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            {/* ===================  FORM WIZARD: CATAT / EDIT PRODUKSI  =================== */}
            <Transition appear show={isFormVisible} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={closeForm}>
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex items-center justify-center min-h-full p-4">
                            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                                <Dialog.Panel className="w-full max-w-6xl overflow-hidden transition-all transform bg-white border-0 shadow-2xl rounded-3xl">
                                    {/* Header */}
                                    <div className="relative px-8 py-6 border-b border-gray-100 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
                                        <Dialog.Title className="flex items-center gap-4 text-2xl font-semibold text-gray-800">
                                            <div className="p-3 shadow-lg bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl">
                                                <FaIndustry className="w-6 h-6 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-gray-800">{isEditing ? 'Edit Data Produksi' : 'Catat Produksi Baru'}</h3>
                                                <p className="mt-1 text-sm text-gray-600">Kelola proses transformasi bahan baku menjadi produk jadi</p>
                                            </div>
                                        </Dialog.Title>
                                        <button onClick={closeForm} className="absolute p-3 text-gray-400 transition-all duration-200 top-6 right-6 hover:text-gray-600 hover:bg-white/80 rounded-xl hover:shadow-md">
                                            <XMarkIcon className="w-6 h-6" />
                                        </button>
                                    </div>

                                    {/* Stepper */}
                                    <div className="px-8 pt-6">
                                        <ol className="flex items-center w-full mb-2">
                                            {[
                                                { no: 1, label: 'Bahan Baku' },
                                                { no: 2, label: 'Produk Hasil' },
                                                { no: 3, label: 'Kemasan' },
                                            ].map((s) => {
                                                const active = step >= (s.no as any);
                                                return (
                                                    <li key={s.no} className="flex items-center flex-1">
                                                        <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${active ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                                            {s.no}
                                                        </div>
                                                        <span className={`ml-3 text-sm font-semibold ${active ? 'text-blue-700' : 'text-gray-500'}`}>{s.label}</span>
                                                        {s.no < 3 && <div className={`flex-1 h-0.5 mx-3 ${step > (s.no as any) ? 'bg-blue-300' : 'bg-gray-200'}`} />}
                                                    </li>
                                                );
                                            })}
                                        </ol>
                                        <div className="flex items-center gap-2 mb-6 -mt-1 text-xs text-gray-500">
                                            <InformationCircleIcon className="w-4 h-4 text-blue-500" />
                                            Tip: Isi bahan dulu → cek estimasi *rendemen* di panel kanan → lanjut ke produk hasil & kemasan.
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <form onSubmit={(e) => e.preventDefault()} className="px-8 pb-8">
                                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                                            {/* Left: Step content */}
                                            <div className="space-y-6 lg:col-span-2">
                                                {/* STEP 1: Bahan Baku */}
                                                {step === 1 && (
                                                    <div className="p-6 border border-gray-100 shadow-sm bg-white/80 backdrop-blur-sm rounded-2xl">
                                                        <h4 className="flex items-center gap-3 mb-4 text-lg font-bold text-gray-800">
                                                            <div className="p-2 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl">
                                                                <FaBoxes className="w-5 h-5 text-blue-700" />
                                                            </div>
                                                            Bahan Baku yang Digunakan
                                                        </h4>

                                                        <div className="space-y-5">
                                                            {sumberDipilih.map((s, idx) => {
                                                                const selectedIds = new Set(sumberDipilih.map((x) => x.id).filter(Boolean));
                                                                const opsi = sumberBahanList.filter((it) => {
                                                                    const uid = `${it.tipe_sumber}-${it.sumber_id}`;
                                                                    const okKategori = s.kategori ? it.tipe_produk === s.kategori : true;
                                                                    const isSelectedElsewhere = selectedIds.has(uid) && uid !== s.id;
                                                                    return okKategori && !isSelectedElsewhere && it.sisa_kg > 0;
                                                                });

                                                                const sisa = hitungSisaStok(idx);
                                                                const over = Number(s.jumlah || 0) > sisa && s.id;

                                                                return (
                                                                    <div key={idx} className="p-5 border shadow-sm bg-gradient-to-br from-white to-gray-50/50 rounded-2xl border-gray-200/60">
                                                                        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                                                                            {/* Kategori */}
                                                                            <div className="md:col-span-4">
                                                                                <label className="block mb-2 text-sm font-semibold text-gray-700">Kategori Bahan Baku</label>
                                                                                <select
                                                                                    value={s.kategori}
                                                                                    onChange={(e) => handleSumberChange(idx, 'kategori', e.target.value as any)}
                                                                                    className="w-full px-4 py-3 text-sm bg-white border border-gray-200 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                                                                >
                                                                                    <option value="" disabled>Pilih Kategori</option>
                                                                                    <option value="BAHAN_MENTAH">🌾 Bahan Mentah (Gabah)</option>
                                                                                    <option value="PRODUK_JADI">🍚 Produk Jadi (Beras)</option>
                                                                                    <option value="PRODUK_SAMPINGAN">🌾 Produk Sampingan (Menir/Dedak)</option>
                                                                                </select>
                                                                            </div>

                                                                            {/* Sumber spesifik */}
                                                                            <div className="md:col-span-5">
                                                                                <label className="block mb-2 text-sm font-semibold text-gray-700">Sumber Spesifik</label>
                                                                                <select
                                                                                    value={s.id}
                                                                                    onChange={(e) => handleSumberChange(idx, 'id', e.target.value)}
                                                                                    className="w-full px-4 py-3 text-sm bg-white border border-gray-200 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                                                                    disabled={!s.kategori}
                                                                                    required
                                                                                >
                                                                                    <option value="" disabled>Pilih Sumber Spesifik</option>
                                                                                    {opsi.map((it) => (
                                                                                        <option key={`${it.tipe_sumber}-${it.sumber_id}`} value={`${it.tipe_sumber}-${it.sumber_id}`}>
                                                                                            {it.nama} — (Sisa: {it.sisa_kg.toLocaleString('id-ID')} Kg)
                                                                                        </option>
                                                                                    ))}
                                                                                    {opsi.length === 0 && <option disabled>Tidak ada stok tersedia</option>}
                                                                                </select>
                                                                            </div>

                                                                            {/* Jumlah */}
                                                                            <div className="md:col-span-3">
                                                                                <label className="block mb-2 text-sm font-semibold text-gray-700">Jumlah (Kg)</label>
                                                                                <input
                                                                                    type="number"
                                                                                    step="0.01"
                                                                                    min="0"
                                                                                    value={s.jumlah}
                                                                                    onChange={(e) => handleSumberChange(idx, 'jumlah', e.target.value)}
                                                                                    className={`w-full rounded-xl border px-4 py-3 text-sm focus:ring-4 tabular-nums bg-white ${
                                                                                        over ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-gray-200 focus:border-blue-400 focus:ring-blue-100'
                                                                                    }`}
                                                                                    placeholder="0.00"
                                                                                    required
                                                                                    disabled={!s.id}
                                                                                />
                                                                                {s.id && (
                                                                                    <p className={`mt-1.5 text-xs ${over ? 'text-red-600' : 'text-gray-500'}`}>
                                                                                        Sisa stok tersedia: {sisa.toLocaleString('id-ID')} Kg
                                                                                    </p>
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        <div className="flex items-center justify-between mt-3">
                                                                            <div className="space-x-2">
                                                                                {s.kategori && <StatBadge label="Kategori" value={kategoriInfo[s.kategori].label} tone="blue" />}
                                                                                {s.id && <StatBadge label="Dipilih" value={s.id.split('-')[0].replace('_', ' ')} tone="amber" />}
                                                                            </div>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => hapusSumber(idx)}
                                                                                className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                                disabled={sumberDipilih.length <= 1}
                                                                                title="Hapus Sumber"
                                                                            >
                                                                                <TrashIcon className="w-5 h-5" />
                                                                            </button>
                                                                        </div>

                                                                        {over && (
                                                                            <div className="p-3 mt-3 border border-red-200 bg-gradient-to-r from-red-50 to-red-100 rounded-xl">
                                                                                <p className="flex items-center gap-3 text-sm text-red-700">
                                                                                    <ExclamationTriangleIcon className="flex-shrink-0 w-5 h-5" />
                                                                                    Jumlah melebihi sisa stok yang ada.
                                                                                </p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>

                                                        <button
                                                            type="button"
                                                            onClick={tambahSumber}
                                                            className="inline-flex items-center gap-2 px-4 py-2 mt-5 font-semibold text-blue-600 transition-all duration-200 hover:text-blue-700 hover:bg-blue-50 rounded-xl"
                                                        >
                                                            <PlusIcon className="w-5 h-5" />
                                                            Tambah Bahan Baku
                                                        </button>
                                                    </div>
                                                )}

                                                {/* STEP 2: Produk Hasil */}
                                                {step === 2 && (
                                                    <div className="p-6 border border-gray-100 shadow-sm bg-white/80 backdrop-blur-sm rounded-2xl">
                                                        <h4 className="flex items-center gap-3 mb-4 text-lg font-bold text-gray-800">
                                                            <div className="p-2 bg-gradient-to-br from-green-100 to-green-200 rounded-xl">
                                                                <CheckCircleIcon className="w-5 h-5 text-green-700" />
                                                            </div>
                                                            Produk yang Dihasilkan
                                                        </h4>

                                                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                                                            <div>
                                                                <label className="block mb-2 text-sm font-semibold text-gray-700">Nama Produk</label>
                                                                <select
                                                                    value={produkHasilId}
                                                                    onChange={(e) => setProdukHasilId(e.target.value)}
                                                                    className="w-full px-4 py-3 text-sm bg-white border border-gray-200 rounded-xl focus:border-green-400 focus:ring-4 focus:ring-green-100"
                                                                    required
                                                                >
                                                                    <option value="" disabled>Pilih Produk Hasil</option>
                                                                    {produkJadiList.map((p) => (
                                                                        <option key={p.id} value={p.id}>
                                                                            {p.nama_produk}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label className="block mb-2 text-sm font-semibold text-gray-700">
                                                                    {summaryForm.totalGabah > 0 ? 'Hasil Giling Gabah (Kg)' : 'Jumlah Dihasilkan (Kg)'}
                                                                </label>
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    value={jumlahHasilKg}
                                                                    onChange={(e) => setJumlahHasilKg(e.target.value)}
                                                                    className="w-full px-4 py-3 text-sm bg-white border border-gray-200 rounded-xl focus:border-green-400 focus:ring-4 focus:ring-green-100 tabular-nums"
                                                                    placeholder={summaryForm.totalGabah > 0 ? "Hasil giling murni" : "100.50"}
                                                                    required
                                                                />
                                                                {summaryForm.totalGabah > 0 && (
                                                                    <p className="mt-1 text-xs text-gray-500">
                                                                        Rendemen: <span className="font-semibold text-green-700">{summaryForm.rendemenGabah.toFixed(2)}%</span>
                                                                        <span className="text-gray-400"> ({summaryForm.hasilGilingGabah.toLocaleString('id-ID')} Kg dari {summaryForm.totalGabah.toLocaleString('id-ID')} Kg gabah)</span>
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Info output total dengan campuran */}
                                                        {summaryForm.bahanCampuran > 0 && summaryForm.hasilGilingGabah > 0 && (
                                                            <div className="p-4 mt-4 border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="p-2 bg-green-100 rounded-lg">
                                                                            <CheckCircleIcon className="w-5 h-5 text-green-600" />
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-sm font-semibold text-green-800">Output Total (otomatis)</p>
                                                                            <p className="text-xs text-green-600">
                                                                                {summaryForm.hasilGilingGabah.toLocaleString('id-ID')} Kg (giling) + {summaryForm.bahanCampuran.toLocaleString('id-ID')} Kg (campuran)
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    <p className="text-2xl font-extrabold text-green-700 tabular-nums">
                                                                        {summaryForm.outputTotal.toLocaleString('id-ID')} Kg
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* STEP 3: Kemasan */}
                                                {step === 3 && (
                                                    <div className="p-6 border border-gray-100 shadow-sm bg-white/80 backdrop-blur-sm rounded-2xl">
                                                        <h4 className="flex items-center gap-3 mb-4 text-lg font-bold text-gray-800">
                                                            <div className="p-2 bg-gradient-to-br from-amber-100 to-amber-200 rounded-xl">
                                                                <FaBoxes className="w-5 h-5 text-amber-700" />
                                                            </div>
                                                            Kemasan yang Digunakan <span className="text-sm font-normal text-gray-500">(opsional)</span>
                                                        </h4>

                                                        <div className="space-y-4">
                                                            {karungDigunakan.map((k, idx) => (
                                                                <div key={idx} className="p-5 border shadow-sm bg-gradient-to-br from-white to-gray-50/50 rounded-2xl border-gray-200/60">
                                                                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                                                        <div>
                                                                            <label className="block mb-2 text-sm font-semibold text-gray-700">Jenis Karung</label>
                                                                            <select
                                                                                value={k.produk_id}
                                                                                onChange={(e) => handleKarungChange(idx, 'produk_id', e.target.value)}
                                                                                className="w-full px-4 py-3 text-sm bg-white border border-gray-200 rounded-xl focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                                                                            >
                                                                                <option value="">Pilih Jenis Karung</option>
                                                                                {karungList.map((b) => (
                                                                                    <option key={b.id} value={b.produk_id}>
                                                                                        {b.produk?.nama_produk || 'Karung'} (Sisa: {b.sisa})
                                                                                    </option>
                                                                                ))}
                                                                            </select>
                                                                        </div>
                                                                        <div>
                                                                            <label className="block mb-2 text-sm font-semibold text-gray-700">Jumlah (Pcs)</label>
                                                                            <input
                                                                                type="number"
                                                                                min="0"
                                                                                value={k.jumlah}
                                                                                onChange={(e) => handleKarungChange(idx, 'jumlah', e.target.value)}
                                                                                className="w-full px-4 py-3 text-sm bg-white border border-gray-200 rounded-xl focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                                                                                placeholder="0"
                                                                            />
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex justify-end mt-3">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => hapusKarung(idx)}
                                                                            className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                            disabled={karungDigunakan.length <= 1}
                                                                            title="Hapus Baris"
                                                                        >
                                                                            <TrashIcon className="w-5 h-5" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        <button
                                                            type="button"
                                                            onClick={tambahKarung}
                                                            className="inline-flex items-center gap-2 px-4 py-2 mt-5 font-semibold transition-all duration-200 text-amber-700 hover:text-amber-800 hover:bg-amber-50 rounded-xl"
                                                        >
                                                            <PlusIcon className="w-5 h-5" />
                                                            Tambah Karung
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Stepper footer (Left Column) */}
                                                <div className="flex items-center justify-between pt-2">
                                                <button
                                                    type="button"
                                                    onClick={step === 1 ? closeForm : prevStep}
                                                    className="inline-flex items-center gap-2 px-5 py-3 text-sm font-medium text-gray-700 transition-colors bg-white border border-gray-300 rounded-xl hover:bg-gray-50"
                                                >
                                                    {step === 1 ? <XMarkIcon className="w-4 h-4" /> : <ChevronLeftIcon className="w-4 h-4" />}
                                                    {step === 1 ? "Batal" : "Kembali"}
                                                </button>

                                                {step < 3 ? (
                                                    <button
                                                    type="button"
                                                    onClick={nextStep}
                                                    className={`inline-flex items-center gap-2 rounded-xl border border-transparent py-3 px-6 text-sm font-semibold text-white transition-colors ${
                                                        step === 1
                                                        ? canNextFromStep1
                                                            ? "bg-blue-600 hover:bg-blue-700"
                                                            : "bg-blue-300"
                                                        : canNextFromStep2
                                                            ? "bg-blue-600 hover:bg-blue-700"
                                                            : "bg-blue-300"
                                                    }`}
                                                    disabled={step === 1 ? !canNextFromStep1 : !canNextFromStep2}
                                                    >
                                                    Lanjut
                                                    <ChevronRightIcon className="w-4 h-4" />
                                                    </button>
                                                ) : (
                                                    <button
                                                    type="button"
                                                    onClick={handleSubmit}
                                                    disabled={isSubmitting}
                                                    className={`inline-flex justify-center items-center gap-2 rounded-xl border border-transparent bg-blue-600 py-3 px-6 text-sm font-medium text-white hover:bg-blue-700 transition-colors ${
                                                        isSubmitting ? "opacity-50 cursor-not-allowed" : ""
                                                    }`}
                                                    >
                                                    {isSubmitting && <div className="w-4 h-4 border-b-2 border-white rounded-full animate-spin" />}
                                                    Simpan
                                                    </button>
                                                )}
                                                </div>
                                                </div>
    

                                            {/* Right: Live Summary */}
                                            <aside className="hidden lg:block">
                                                <div className="sticky space-y-4 top-4">
                                                    <div className="p-6 border border-blue-100 shadow-sm rounded-2xl bg-gradient-to-br from-white to-blue-50">
                                                        <div className="flex items-center gap-2 mb-4">
                                                            <SparklesIcon className="w-5 h-5 text-blue-600" />
                                                            <h5 className="text-sm font-bold text-gray-800">Ringkasan Produksi</h5>
                                                        </div>

                                                        <div className="space-y-3 text-sm">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-gray-600">Total Bahan</span>
                                                                <span className="font-semibold text-gray-900 tabular-nums">{summaryForm.totalBahan.toLocaleString('id-ID')} Kg</span>
                                                            </div>
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-gray-600">Gabah</span>
                                                                <span className="font-semibold text-gray-900 tabular-nums">{summaryForm.totalGabah.toLocaleString('id-ID')} Kg</span>
                                                            </div>
                                                            {summaryForm.bahanCampuran > 0 && (
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-gray-600">Campuran</span>
                                                                    <span className="font-semibold text-blue-600 tabular-nums">{summaryForm.bahanCampuran.toLocaleString('id-ID')} Kg</span>
                                                                </div>
                                                            )}
                                                            
                                                            {/* Hasil Giling */}
                                                            {summaryForm.totalGabah > 0 && (
                                                                <div className="flex items-center justify-between pt-2 border-t border-blue-100">
                                                                    <span className="text-gray-600">Hasil Giling</span>
                                                                    <span className="font-semibold text-gray-900 tabular-nums">{summaryForm.hasilGilingGabah.toLocaleString('id-ID')} Kg</span>
                                                                </div>
                                                            )}
                                                            
                                                            {/* Output Total */}
                                                            <div className={`flex items-center justify-between ${summaryForm.totalGabah > 0 ? '' : 'pt-2 border-t border-blue-100'}`}>
                                                                <span className="font-semibold text-gray-700">Output Total</span>
                                                                <span className="font-bold text-gray-900 tabular-nums">{summaryForm.outputTotal.toLocaleString('id-ID')} Kg</span>
                                                            </div>
                                                            
                                                            {/* Rendemen Gabah */}
                                                            {summaryForm.totalGabah > 0 && (
                                                                <div className="p-3 mt-2 border border-green-200 bg-green-50 rounded-xl">
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="font-semibold text-green-800">Rendemen Gabah</span>
                                                                        <span className="text-xl font-extrabold text-green-700 tabular-nums">{summaryForm.rendemenGabah.toFixed(1)}%</span>
                                                                    </div>
                                                                    <p className="mt-1 text-xs text-green-700">
                                                                        {summaryForm.totalGabah.toLocaleString('id-ID')} Kg → {summaryForm.hasilGilingGabah.toLocaleString('id-ID')} Kg beras
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {Object.keys(summaryForm.breakdown).length > 0 && (
                                                            <div className="p-4 mt-5 border border-blue-100 bg-white/70 rounded-xl">
                                                                <p className="mb-2 text-xs font-semibold text-gray-700">Per Kategori</p>
                                                                <div className="space-y-2 text-sm">
                                                                    {(Object.entries(summaryForm.breakdown) as [SumberBahan['tipe_produk'], number][])
                                                                        .map(([key, val]) => (
                                                                            <div key={key} className="flex items-center justify-between">
                                                                                  <span className="flex items-center gap-2">
                                                                                    {kategoriInfo[key].icon}
                                                                                      <span className="text-gray-700">{kategoriInfo[key].label}</span>
                                                                                  </span>
                                                                                <span className="font-semibold tabular-nums">
                                                                                    {Number(val).toLocaleString('id-ID')} Kg
                                                                                </span>
                                                                            </div>
                                                                        ))}

                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="p-4 bg-white border border-gray-200 rounded-2xl">
                                                        <p className="text-xs text-gray-500">
                                                            Input hasil giling gabah murni. Output total otomatis dijumlahkan dengan bahan campuran.
                                                        </p>
                                                    </div>
                                                </div>
                                            </aside>
                                        </div>
                                    </form>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </div>
    );
};

export default ProduksiPage;