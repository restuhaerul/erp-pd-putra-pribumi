// src/pages/Dashboard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import * as api from '../services/api';
import { DashboardData } from '../types';
import {
    FaShoppingCart,
    FaShoppingBag,
    FaCogs,
    FaExclamationTriangle,
    FaUser,
    FaBullseye,
    FaTimes,
    FaChartLine,
    FaWarehouse,
    FaBell,
    FaCrown,
    FaCalendarAlt,
    FaArrowUp,
    FaArrowDown,
} from 'react-icons/fa';

/* =========================
   Helper & Small Utilities
   ========================= */
const formatRupiah = (angka: number) =>
    `Rp ${Math.round(angka || 0).toLocaleString('id-ID')}`;
const formatKg = (angka: number) =>
    `${(angka || 0).toLocaleString('id-ID', { maximumFractionDigits: 1 })} Kg`;
const formatPersentase = (angka: number) =>
    `${(angka || 0) > 0 ? '+' : ''}${(angka || 0).toFixed(1)}%`;

const getQueryParam = (key: string) =>
    new URLSearchParams(window.location.search).get(key);

type Role = 'OWNER' | 'ADMIN';

/** Resolve role from URL (?as=admin|owner) or localStorage */
function resolveRole(): Role {
    const as = (getQueryParam('as') || '').toLowerCase();
    if (as === 'admin') return 'ADMIN';
    if (as === 'owner') return 'OWNER';

    // try common localStorage shapes
    const keys = ['currentUser', 'user', 'auth', 'session'];
    for (const k of keys) {
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        try {
            const obj = JSON.parse(raw);
            const r =
                obj?.role ||
                obj?.data?.role ||
                obj?.user?.role ||
                obj?.profile?.role ||
                obj?.claims?.role;
            if (typeof r === 'string') {
                const up = r.toUpperCase();
                if (up === 'ADMIN' || up === 'OWNER') return up;
            }
        } catch {
            /* ignore */
        }
    }
    const flat = localStorage.getItem('role') || localStorage.getItem('user_role');
    if (flat && (flat.toUpperCase() === 'ADMIN' || flat.toUpperCase() === 'OWNER')) {
        return flat.toUpperCase() as Role;
    }
    // default safe: OWNER has full access in your app today
    return 'OWNER';
}

/* ================
   Icon components
   ================ */
const AktivitasIcon = ({ tipe }: { tipe: string }) => {
    const baseClass = 'w-5 h-5';
    switch (tipe) {
        case 'PENJUALAN':
            return <FaShoppingCart className={`${baseClass} text-green-500`} />;
        case 'PEMBELIAN':
            return <FaShoppingBag className={`${baseClass} text-orange-500`} />;
        case 'PRODUKSI':
            return <FaCogs className={`${baseClass} text-blue-500`} />;
        default:
            return null;
    }
};

/* ==============
   Modal generic
   ============== */
interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}
const Modal = ({ isOpen, onClose, title, children }: ModalProps) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
                    <h2 className="text-xl font-bold text-white">{title}</h2>
                    <button
                        onClick={onClose}
                        className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                    >
                        <FaTimes className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-88px)]">{children}</div>
            </div>
        </div>
    );
};

/* ===================
   ProgressBar small
   =================== */
interface ProgressBarProps {
    value: number;
    max: number;
    color?: 'blue' | 'green' | 'orange' | 'red' | 'purple';
    className?: string;
}
const ProgressBar = ({
                         value,
                         max,
                         color = 'blue',
                         className = '',
                     }: ProgressBarProps) => {
    const percentage = max > 0 ? Math.min(((value || 0) / max) * 100, 100) : 0;
    const colorClasses = {
        blue: 'bg-blue-500',
        green: 'bg-green-500',
        orange: 'bg-orange-500',
        red: 'bg-red-500',
        purple: 'bg-purple-500',
    } as const;

    return (
        <div className={`w-full bg-gray-200 rounded-full h-3 ${className}`}>
            <div
                className={`h-3 rounded-full transition-all duration-300 ${
                    colorClasses[color]
                }`}
                style={{ width: `${percentage}%` }}
            />
        </div>
    );
};

/* ==========================
   Main: ModernDashboard()
   ========================== */
export default function ModernDashboard() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [role, setRole] = useState<Role>('OWNER');

    // fetch dashboard data
    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const apiData = await api.getDashboardData();
            setData(apiData);
        } catch (err: any) {
            setError(err?.message || 'Gagal memuat data dashboard.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // resolve role once
    useEffect(() => {
        setRole(resolveRole());
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Memuat dashboard...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <div className="text-center p-6 bg-white rounded-2xl shadow-xl">
                    <FaExclamationTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <p className="text-red-600 font-semibold">Error: {error}</p>
                    <button
                        onClick={fetchData}
                        className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Coba Lagi
                    </button>
                </div>
            </div>
        );
    }

    if (!data) return null;

    // Safe destructure with defaults (struktur sama dengan versi sebelumnya)
    const {
        ringkasan_harian = { TotalPenjualan: 0, TotalTransaksi: 0, TotalLaba: 0 },
        stok_produk_jadi = 0,
        stok_bahan_mentah = 0,
        aktivitas_terbaru = [],
        perbandingan_mingguan = { persentase_penjualan: 0, persentase_laba: 0 },
        pergerakan_stok = [],
        aktivitas_user = [],
        target_harian = {
            target_penjualan: 0,
            realisasi_penjualan: 0,
            persentase_realisasi: 0,
            target_produksi: 0,
            realisasi_produksi: 0,
            persentase_produksi: 0,
        },
        reminder_urgent = [],
        statistik_bulanan = {
            total_penjualan_bulan: 0,
            total_laba_bulan: 0,
            rata_rata_penjualan: 0,
            peningkatan_dari_bulan_lalu: 0,
        },
        top_produk = [],
    } = data;

    const isAdmin = role === 'ADMIN';
    const isOwner = role === 'OWNER';

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="p-4 sm:p-6 lg:p-8 space-y-8">
                {/* Header */}
                <div className="text-center lg:text-left">
                    <h1 className="text-4xl font-bold text-gray-800 mb-2">Dashboard Putra Pribumi</h1>
                    <p className="text-gray-600">
                        {isAdmin ? 'Akses terbatas — Admin hanya melihat aktivitas.' : 'Ringkasan bisnis penggilingan padi & toko beras'}
                    </p>
                    <div className="mt-2 flex items-center justify-center lg:justify-start space-x-2 text-sm text-gray-500">
                        <FaCalendarAlt className="w-4 h-4" />
                        <span>
              {new Date().toLocaleDateString('id-ID', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
              })}
            </span>
                    </div>
                </div>

                {/* ====== ADMIN VIEW: hanya Aktivitas Terbaru ====== */}
                {isAdmin && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-start-3 space-y-6">
                            {/* Aktivitas Terbaru (same component) */}
                            <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-bold text-gray-800 flex items-center space-x-2">
                                        <FaChartLine className="w-6 h-6 text-green-500" />
                                        <span>Aktivitas Terbaru</span>
                                    </h2>
                                    <button
                                        onClick={() => setActiveModal('aktivitas')}
                                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                    >
                                        Semua →
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {(aktivitas_terbaru || []).slice(0, 5).map((aktivitas, index) => (
                                        <div
                                            key={index}
                                            className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer"
                                        >
                                            <div className="flex-shrink-0 p-2 bg-gray-100 rounded-full">
                                                <AktivitasIcon tipe={aktivitas?.tipe || ''} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900">
                                                    {aktivitas?.deskripsi || 'Tidak ada deskripsi'}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {aktivitas?.timestamp
                                                        ? new Date(aktivitas.timestamp).toLocaleTimeString('id-ID', {
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })
                                                        : 'Waktu tidak diketahui'}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                    {(!aktivitas_terbaru || aktivitas_terbaru.length === 0) && (
                                        <div className="text-center py-8 text-gray-500">
                                            <p>Belum ada aktivitas terbaru</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ====== OWNER VIEW: semua konten seperti sebelumnya ====== */}
                {isOwner && (
                    <>
                        {/* Reminder Urgent */}
                        {reminder_urgent && reminder_urgent.length > 0 && (
                            <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-4 rounded-2xl shadow-lg">
                                <div className="flex items-center space-x-3">
                                    <FaBell className="w-6 h-6 animate-pulse" />
                                    <div>
                                        <h3 className="font-bold">Peringatan Urgent</h3>
                                        <p className="text-red-100">
                                            {reminder_urgent[0]?.deskripsi || 'Tidak ada deskripsi'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setActiveModal('reminders')}
                                        className="ml-auto bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg transition-colors"
                                    >
                                        Lihat Detail
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Ringkasan Harian */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-gray-100">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-gradient-to-br from-green-400 to-green-600 rounded-xl">
                                        <FaShoppingCart className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-gray-500">vs minggu lalu</p>
                                        <div className="flex items-center space-x-1">
                                            {(perbandingan_mingguan?.persentase_penjualan || 0) > 0 ? (
                                                <FaArrowUp className="w-3 h-3 text-green-500" />
                                            ) : (
                                                <FaArrowDown className="w-3 h-3 text-red-500" />
                                            )}
                                            <span
                                                className={`text-sm font-semibold ${
                                                    (perbandingan_mingguan?.persentase_penjualan || 0) > 0
                                                        ? 'text-green-500'
                                                        : 'text-red-500'
                                                }`}
                                            >
                        {formatPersentase(perbandingan_mingguan?.persentase_penjualan || 0)}
                      </span>
                                        </div>
                                    </div>
                                </div>
                                <h3 className="text-lg font-medium text-gray-500 mb-1">Penjualan Hari Ini</h3>
                                <p className="text-3xl font-bold text-gray-800">
                                    {formatRupiah(ringkasan_harian?.TotalPenjualan || 0)}
                                </p>
                                <div className="mt-4 flex items-center space-x-2">
                  <span className="text-sm text-gray-400">
                    {ringkasan_harian?.TotalTransaksi || 0} transaksi
                  </span>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-gray-100">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl">
                                        <FaArrowUp className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-gray-500">vs minggu lalu</p>
                                        <div className="flex items-center space-x-1">
                                            {(perbandingan_mingguan?.persentase_laba || 0) > 0 ? (
                                                <FaArrowUp className="w-3 h-3 text-green-500" />
                                            ) : (
                                                <FaArrowDown className="w-3 h-3 text-red-500" />
                                            )}
                                            <span
                                                className={`text-sm font-semibold ${
                                                    (perbandingan_mingguan?.persentase_laba || 0) > 0
                                                        ? 'text-green-500'
                                                        : 'text-red-500'
                                                }`}
                                            >
                        {formatPersentase(perbandingan_mingguan?.persentase_laba || 0)}
                      </span>
                                        </div>
                                    </div>
                                </div>
                                <h3 className="text-lg font-medium text-gray-500 mb-1">Laba Hari Ini</h3>
                                <p className="text-3xl font-bold text-blue-600">
                                    {formatRupiah(ringkasan_harian?.TotalLaba || 0)}
                                </p>
                            </div>

                            <div className="bg-white p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-gray-100">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl">
                                        <FaBullseye className="w-6 h-6 text-white" />
                                    </div>
                                    <button
                                        onClick={() => setActiveModal('target')}
                                        className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                                    >
                                        Detail →
                                    </button>
                                </div>
                                <h3 className="text-lg font-medium text-gray-500 mb-1">Target Harian</h3>
                                <p className="text-3xl font-bold text-gray-800">
                                    {(target_harian?.persentase_realisasi || 0).toFixed(1)}%
                                </p>
                                <ProgressBar
                                    value={target_harian?.realisasi_penjualan || 0}
                                    max={target_harian?.target_penjualan || 1}
                                    color="purple"
                                    className="mt-4"
                                />
                                <p className="text-sm text-gray-500 mt-2">
                                    {formatRupiah(target_harian?.realisasi_penjualan || 0)} dari{' '}
                                    {formatRupiah(target_harian?.target_penjualan || 0)}
                                </p>
                            </div>
                        </div>

                        {/* Grid Utama */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Kolom Kiri */}
                            <div className="lg:col-span-2 space-y-6">
                                {/* Status Stok */}
                                <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-xl font-bold text-gray-800 flex items-center space-x-2">
                                            <FaWarehouse className="w-6 h-6 text-blue-600" />
                                            <span>Status Stok Gudang</span>
                                        </h2>
                                        <button
                                            onClick={() => setActiveModal('stok')}
                                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                        >
                                            Lihat Pergerakan →
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                                            <div className="flex items-center space-x-3 mb-3">
                                                <div className="p-2 bg-blue-500 rounded-lg">
                                                    <FaCogs className="w-5 h-5 text-white" />
                                                </div>
                                                <div>
                                                    <p className="text-gray-600 text-sm">Beras (Produk Jadi)</p>
                                                    <p className="font-bold text-2xl text-blue-600">
                                                        {formatKg(stok_produk_jadi || 0)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="w-full bg-blue-200 rounded-full h-2">
                                                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2">75% dari kapasitas optimal</p>
                                        </div>

                                        <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200">
                                            <div className="flex items-center space-x-3 mb-3">
                                                <div className="p-2 bg-orange-500 rounded-lg">
                                                    <FaShoppingBag className="w-5 h-5 text-white" />
                                                </div>
                                                <div>
                                                    <p className="text-gray-600 text-sm">Gabah (Bahan Mentah)</p>
                                                    <p className="font-bold text-2xl text-orange-600">
                                                        {formatKg(stok_bahan_mentah || 0)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="w-full bg-orange-200 rounded-full h-2">
                                                <div className="bg-orange-500 h-2 rounded-full" style={{ width: '45%' }}></div>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2">45% dari kapasitas optimal</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Top Produk */}
                                <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-xl font-bold text-gray-800 flex items-center space-x-2">
                                            <FaCrown className="w-6 h-6 text-yellow-500" />
                                            <span>Produk Terlaris</span>
                                        </h2>
                                        <button
                                            onClick={() => setActiveModal('produk')}
                                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                        >
                                            Lihat Semua →
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        {(top_produk || []).slice(0, 3).map((produk, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                                            >
                                                <div className="flex-shrink-0">
                                                    <div
                                                        className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold ${
                                                            index === 0
                                                                ? 'bg-yellow-500'
                                                                : index === 1
                                                                    ? 'bg-gray-400'
                                                                    : 'bg-orange-400'
                                                        }`}
                                                    >
                                                        #{index + 1}
                                                    </div>
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-gray-800">
                                                        {produk?.nama_produk || 'Produk Tidak Dikenal'}
                                                    </h3>
                                                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                                                        <span>{formatKg(produk?.total_terjual || 0)} terjual</span>
                                                        <span>{formatRupiah(produk?.total_pendapatan || 0)}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                          <span className="text-2xl font-bold text-blue-600">
                            {(produk?.persentase || 0).toFixed(1)}%
                          </span>
                                                    <p className="text-xs text-gray-500">dari total</p>
                                                </div>
                                            </div>
                                        ))}
                                        {(!top_produk || top_produk.length === 0) && (
                                            <div className="text-center py-8 text-gray-500">
                                                <p>Belum ada data produk terlaris</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Kolom Kanan */}
                            <div className="space-y-6">
                                {/* Aktivitas Terbaru */}
                                <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-xl font-bold text-gray-800 flex items-center space-x-2">
                                            <FaChartLine className="w-6 h-6 text-green-500" />
                                            <span>Aktivitas Terbaru</span>
                                        </h2>
                                        <button
                                            onClick={() => setActiveModal('aktivitas')}
                                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                        >
                                            Semua →
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        {(aktivitas_terbaru || []).slice(0, 5).map((aktivitas, index) => (
                                            <div
                                                key={index}
                                                className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer"
                                            >
                                                <div className="flex-shrink-0 p-2 bg-gray-100 rounded-full">
                                                    <AktivitasIcon tipe={aktivitas?.tipe || ''} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900">
                                                        {aktivitas?.deskripsi || 'Tidak ada deskripsi'}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {aktivitas?.timestamp
                                                            ? new Date(aktivitas.timestamp).toLocaleTimeString('id-ID', {
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                            })
                                                            : 'Waktu tidak diketahui'}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                        {(!aktivitas_terbaru || aktivitas_terbaru.length === 0) && (
                                            <div className="text-center py-8 text-gray-500">
                                                <p>Belum ada aktivitas terbaru</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Aktivitas User */}
                                <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-xl font-bold text-gray-800 flex items-center space-x-2">
                                            <FaUser className="w-6 h-6 text-purple-500" />
                                            <span>Aktivitas User</span>
                                        </h2>
                                        <button
                                            onClick={() => setActiveModal('user')}
                                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                        >
                                            Detail →
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {(aktivitas_user || []).slice(0, 4).map((user, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-xl transition-colors"
                                            >
                                                <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">
                            {(user?.nama_user || 'U').charAt(0)}
                          </span>
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-gray-800">
                                                        {user?.nama_user || 'User Tidak Dikenal'}
                                                    </p>
                                                    <p className="text-xs text-gray-500">{user?.aktivitas || 'Tidak ada aktivitas'}</p>
                                                </div>
                                                <span className="text-xs text-gray-400">
                          {user?.timestamp
                              ? new Date(user.timestamp).toLocaleTimeString('id-ID', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                              })
                              : '--:--'}
                        </span>
                                            </div>
                                        ))}
                                        {(!aktivitas_user || aktivitas_user.length === 0) && (
                                            <div className="text-center py-8 text-gray-500">
                                                <p>Belum ada aktivitas user</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Statistik Bulanan */}
                                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-6 rounded-2xl shadow-xl">
                                    <h2 className="text-xl font-bold mb-4 flex items-center space-x-2">
                                        <FaChartLine className="w-6 h-6" />
                                        <span>Performa Bulan Ini</span>
                                    </h2>

                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-indigo-100">Total Penjualan</span>
                                            <span className="font-bold">
                        {formatRupiah(statistik_bulanan?.total_penjualan_bulan || 0)}
                      </span>
                                        </div>

                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-indigo-100">Total Laba</span>
                                            <span className="font-bold">
                        {formatRupiah(statistik_bulanan?.total_laba_bulan || 0)}
                      </span>
                                        </div>

                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-indigo-100">Rata-rata Harian</span>
                                            <span className="font-bold">
                        {formatRupiah(statistik_bulanan?.rata_rata_penjualan || 0)}
                      </span>
                                        </div>

                                        <div className="pt-2 border-t border-indigo-400">
                                            <div className="flex items-center justify-center space-x-2">
                                                <FaArrowUp className="w-4 h-4" />
                                                <span className="text-sm">
                          {formatPersentase(statistik_bulanan?.peningkatan_dari_bulan_lalu || 0)} vs
                          bulan lalu
                        </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* ===== Modals ===== */}
            {/* ADMIN boleh membuka modal aktivitas; OWNER boleh semuanya */}
            {activeModal === 'aktivitas' && (
                <Modal isOpen onClose={() => setActiveModal(null)} title="Semua Aktivitas Bisnis">
                    <div className="space-y-4">
                        {(aktivitas_terbaru || []).length > 0 ? (
                            (aktivitas_terbaru || []).map((aktivitas, index) => (
                                <div
                                    key={index}
                                    className="p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-start space-x-4">
                                        <div className="flex-shrink-0 p-3 bg-gray-100 rounded-full">
                                            <AktivitasIcon tipe={aktivitas?.tipe || ''} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-2">
                        <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                                (aktivitas?.tipe || '') === 'PENJUALAN'
                                    ? 'bg-green-100 text-green-800'
                                    : (aktivitas?.tipe || '') === 'PEMBELIAN'
                                        ? 'bg-orange-100 text-orange-800'
                                        : 'bg-blue-100 text-blue-800'
                            }`}
                        >
                          {aktivitas?.tipe || 'TIDAK DIKETAHUI'}
                        </span>
                                                <span className="text-sm text-gray-500">
                          {aktivitas?.timestamp
                              ? new Date(aktivitas.timestamp).toLocaleString('id-ID')
                              : 'Waktu tidak diketahui'}
                        </span>
                                            </div>
                                            <p className="text-gray-800 font-medium">
                                                {aktivitas?.deskripsi || 'Tidak ada deskripsi'}
                                            </p>
                                            <p className="text-sm text-gray-600 mt-1">
                                                ID Transaksi: #{aktivitas?.link_id || 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-gray-500 py-8">Tidak ada aktivitas bisnis</p>
                        )}
                    </div>
                </Modal>
            )}

            {isOwner && activeModal === 'target' && (
                <Modal isOpen onClose={() => setActiveModal(null)} title="Detail Target Harian">
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-4 border border-gray-200 rounded-xl">
                                <h3 className="font-semibold text-gray-800 mb-3">Target Penjualan</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Target:</span>
                                        <span className="font-medium">
                      {formatRupiah(target_harian?.target_penjualan || 0)}
                    </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Realisasi:</span>
                                        <span className="font-medium text-blue-600">
                      {formatRupiah(target_harian?.realisasi_penjualan || 0)}
                    </span>
                                    </div>
                                    <ProgressBar
                                        value={target_harian?.realisasi_penjualan || 0}
                                        max={target_harian?.target_penjualan || 1}
                                        color="blue"
                                    />
                                    <p className="text-center font-bold text-2xl text-blue-600 mt-2">
                                        {(target_harian?.persentase_realisasi || 0).toFixed(1)}%
                                    </p>
                                </div>
                            </div>
                            <div className="p-4 border border-gray-200 rounded-xl">
                                <h3 className="font-semibold text-gray-800 mb-3">Target Produksi</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Target:</span>
                                        <span className="font-medium">{formatKg(target_harian?.target_produksi || 0)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Realisasi:</span>
                                        <span className="font-medium text-green-600">
                      {formatKg(target_harian?.realisasi_produksi || 0)}
                    </span>
                                    </div>
                                    <ProgressBar
                                        value={target_harian?.realisasi_produksi || 0}
                                        max={target_harian?.target_produksi || 1}
                                        color="green"
                                    />
                                    <p className="text-center font-bold text-2xl text-green-600 mt-2">
                                        {(target_harian?.persentase_produksi || 0).toFixed(1)}%
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}

            {isOwner && activeModal === 'stok' && (
                <Modal isOpen onClose={() => setActiveModal(null)} title="Pergerakan Stok Gudang">
                    <div className="space-y-4">
                        {(pergerakan_stok || []).length > 0 ? (
                            (pergerakan_stok || []).map((item, index) => (
                                <div
                                    key={index}
                                    className="p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div
                                                className={`p-2 rounded-full ${
                                                    (item?.tipe_aksi || '') === 'IN'
                                                        ? 'bg-green-100 text-green-600'
                                                        : 'bg-red-100 text-red-600'
                                                }`}
                                            >
                                                {(item?.tipe_aksi || '') === 'IN' ? (
                                                    <FaArrowUp className="w-4 h-4" />
                                                ) : (
                                                    <FaArrowDown className="w-4 h-4" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-800">
                                                    {item?.nama_produk || 'Produk Tidak Dikenal'}
                                                </p>
                                                <p className="text-sm text-gray-600">
                                                    {item?.keterangan || 'Tidak ada keterangan'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p
                                                className={`font-bold ${
                                                    (item?.tipe_aksi || '') === 'IN' ? 'text-green-600' : 'text-red-600'
                                                }`}
                                            >
                                                {(item?.tipe_aksi || '') === 'IN' ? '+' : '-'}
                                                {formatKg(item?.jumlah || 0)}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                {item?.tanggal
                                                    ? new Date(item.tanggal).toLocaleDateString('id-ID')
                                                    : 'Tanggal tidak diketahui'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-gray-500 py-8">Tidak ada pergerakan stok hari ini</p>
                        )}
                    </div>
                </Modal>
            )}

            {isOwner && activeModal === 'user' && (
                <Modal isOpen onClose={() => setActiveModal(null)} title="Detail Aktivitas User">
                    <div className="space-y-4">
                        {(aktivitas_user || []).length > 0 ? (
                            (aktivitas_user || []).map((user, index) => (
                                <div
                                    key={index}
                                    className="p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-center space-x-4">
                                        <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">
                        {(user?.nama_user || 'U').charAt(0)}
                      </span>
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <h3 className="font-semibold text-gray-800">
                                                    {user?.nama_user || 'User Tidak Dikenal'}
                                                </h3>
                                                <span className="text-sm text-gray-500">
                          {user?.timestamp
                              ? new Date(user.timestamp).toLocaleString('id-ID')
                              : 'Waktu tidak diketahui'}
                        </span>
                                            </div>
                                            <p className="text-blue-600 font-medium">{user?.aktivitas || 'Tidak ada aktivitas'}</p>
                                            <p className="text-sm text-gray-600">{user?.detail || 'Tidak ada detail'}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-gray-500 py-8">Tidak ada aktivitas user</p>
                        )}
                    </div>
                </Modal>
            )}

            {isOwner && activeModal === 'produk' && (
                <Modal isOpen onClose={() => setActiveModal(null)} title="Semua Produk Terlaris">
                    <div className="space-y-4">
                        {(top_produk || []).length > 0 ? (
                            (top_produk || []).map((produk, index) => (
                                <div
                                    key={index}
                                    className="p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-center space-x-4">
                                        <div
                                            className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg ${
                                                index === 0
                                                    ? 'bg-gradient-to-br from-yellow-400 to-yellow-600'
                                                    : index === 1
                                                        ? 'bg-gradient-to-br from-gray-400 to-gray-600'
                                                        : index === 2
                                                            ? 'bg-gradient-to-br from-orange-400 to-orange-600'
                                                            : 'bg-gradient-to-br from-blue-400 to-blue-600'
                                            }`}
                                        >
                                            #{index + 1}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-gray-800 text-lg">
                                                {produk?.nama_produk || 'Produk Tidak Dikenal'}
                                            </h3>
                                            <div className="grid grid-cols-2 gap-4 mt-2">
                                                <div>
                                                    <p className="text-sm text-gray-500">Total Terjual</p>
                                                    <p className="font-semibold text-blue-600">
                                                        {formatKg(produk?.total_terjual || 0)}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-500">Total Pendapatan</p>
                                                    <p className="font-semibold text-green-600">
                                                        {formatRupiah(produk?.total_pendapatan || 0)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-3xl font-bold text-gray-800">
                                                {(produk?.persentase || 0).toFixed(1)}%
                                            </p>
                                            <p className="text-sm text-gray-500">kontribusi</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-gray-500 py-8">Tidak ada data produk terlaris</p>
                        )}
                    </div>
                </Modal>
            )}
        </div>
    );
}
