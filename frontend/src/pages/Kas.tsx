import React, { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import * as api from '../services/api';
import { Dialog, Transition } from '@headlessui/react';
import { FaMoneyBillWave, FaShoppingCart, FaTools, FaCalendarAlt, FaChartLine } from 'react-icons/fa';
import { XMarkIcon, CurrencyDollarIcon, ShoppingCartIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline';
import { KasData } from '../types';
import Pagination from '../components/Pagination';
import {Link} from "react-router-dom";

const formatRupiah = (angka: number) => `Rp ${angka.toLocaleString('id-ID')}`;

const ITEMS_PER_PAGE = 5;

const KasPage = () => {
    const [kasData, setKasData] = useState<KasData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tahun, setTahun] = useState(new Date().getFullYear());
    const [bulan, setBulan] = useState(new Date().getMonth() + 1);
    const [modal, setModal] = useState<'penjualan' | 'jasagiling' | 'total' | null>(null);
    const [penjualanPage, setPenjualanPage] = useState(1);
    const [jasaGilingPage, setJasaGilingPage] = useState(1);

    const fetchData = useCallback(async (b: number, t: number) => {
        try {
            setIsLoading(true);
            const data = await api.getKasBulanan(b, t);
            setKasData(data);
            setError(null);
        } catch (err: any) {
            setError(err.message || "Gagal memuat data kas.");
            setKasData(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData(bulan, tahun);
    }, [bulan, tahun, fetchData]);

    useEffect(() => {
        if (modal === 'penjualan') setPenjualanPage(1);
        if (modal === 'jasagiling') setJasaGilingPage(1);
    }, [modal]);

    const tahunOptions = useMemo(() => {
        const tahunSekarang = new Date().getFullYear();
        return Array.from({ length: 5 }, (_, i) => tahunSekarang - i);
    }, []);

    const bulanOptions = useMemo(() => {
        return Array.from({ length: 12 }, (_, i) => ({
            value: i + 1,
            label: new Date(0, i).toLocaleString('id-ID', { month: 'long' })
        }));
    }, []);

    const penjualanData = kasData?.kas_penjualan || [];
    const penjualanTotalPages = Math.ceil(penjualanData.length / ITEMS_PER_PAGE) || 1;
    const penjualanPaginated = penjualanData.slice((penjualanPage - 1) * ITEMS_PER_PAGE, penjualanPage * ITEMS_PER_PAGE);

    const jasaGilingData = kasData?.kas_jasa_giling || [];
    const jasaGilingTotalPages = Math.ceil(jasaGilingData.length / ITEMS_PER_PAGE) || 1;
    const jasaGilingPaginated = jasaGilingData.slice((jasaGilingPage - 1) * ITEMS_PER_PAGE, jasaGilingPage * ITEMS_PER_PAGE);

    const ModalDetail = ({ open, onClose, title, children, headerColor = "from-blue-500 to-blue-600" }: { open: boolean, onClose: () => void, title: string, children: React.ReactNode, headerColor?: string }) => (
        <Transition appear show={open} as={Fragment}>
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
                    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0 scale-95"
                        enterTo="opacity-100 scale-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100 scale-100"
                        leaveTo="opacity-0 scale-95"
                    >
                        <Dialog.Panel className="w-full max-w-5xl rounded-2xl bg-white shadow-2xl transition-all">
                            <div className={`bg-gradient-to-r ${headerColor} p-6 text-white rounded-t-2xl`}>
                                <Dialog.Title className="text-2xl font-bold">{title}</Dialog.Title>
                                <button
                                    onClick={onClose}
                                    className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
                                >
                                    <XMarkIcon className="w-7 h-7" />
                                </button>
                            </div>
                            <div className="p-6">{children}</div>
                        </Dialog.Panel>
                    </Transition.Child>
                </div>
            </Dialog>
        </Transition>
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Memuat data kas pemasukan...</p>
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
                        onClick={() => fetchData(bulan, tahun)}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        Coba Lagi
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header Premium Match With Dashboard */}
                <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-xl p-6 sm:p-8 text-white">
                    {/* Decorative Background Elements */}
                    <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3">
                        <div className="w-64 h-64 rounded-full bg-white/10 blur-3xl"></div>
                    </div>
                    <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3">
                        <div className="w-48 h-48 rounded-full bg-blue-400/20 blur-2xl"></div>
                    </div>

                    <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Kas Pemasukan</h1>
                            <p className="text-blue-100">
                                Monitor pemasukan dari penjualan dan jasa giling untuk{' '}
                                <span className="font-semibold">
                  {bulanOptions.find(b => b.value === bulan)?.label} {tahun}
                </span>
                            </p>
                        </div>

                        {/* Pilih Bulan & Tahun */}
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl px-6 py-5 w-full max-w-md mx-auto border border-white/20 shadow-inner">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                                <div className="w-full max-w-sm">
                                    <label className="block text-sm font-semibold text-blue-100 mb-2">
                                        <FaCalendarAlt className="w-4 h-4 inline mr-1" /> Bulan
                                    </label>
                                    <select
                                        value={bulan}
                                        onChange={e => setBulan(parseInt(e.target.value))}
                                        className="w-full rounded-lg border-0 bg-white/20 backdrop-blur text-white placeholder-blue-200 focus:ring-2 focus:ring-white/50 transition-all"
                                    >
                                        {bulanOptions.map(option => (
                                            <option key={option.value} value={option.value} className="text-gray-900">
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="w-full max-w-sm">
                                    <label className="block text-sm font-semibold text-blue-100 mb-2">Tahun</label>
                                    <select
                                        value={tahun}
                                        onChange={e => setTahun(parseInt(e.target.value))}
                                        className="w-full rounded-lg border-0 bg-white/20 backdrop-blur text-white placeholder-blue-200 focus:ring-2 focus:ring-white/50 transition-all"
                                    >
                                        {tahunOptions.map(t => (
                                            <option key={t} value={t} className="text-gray-900">{t}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {kasData && (
                    <div className="space-y-8">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <button
                                onClick={() => setModal('penjualan')}
                                className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 text-left group relative overflow-hidden"
                            >
                                <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500 ease-in-out"></div>
                                <div className="relative z-10 flex items-center justify-between mb-4">
                                    <div className="bg-gradient-to-br from-blue-400 to-blue-600 p-4 rounded-xl shadow-md group-hover:shadow-lg transition-all">
                                        <ShoppingCartIcon className="w-8 h-8 text-white" />
                                    </div>
                                    <FaChartLine className="w-6 h-6 text-gray-300 group-hover:text-blue-500 transition-colors" />
                                </div>
                                <h3 className="relative z-10 text-sm font-semibold text-gray-500 mb-1">Kas Penjualan</h3>
                                <p className="relative z-10 text-3xl font-bold text-gray-900 mb-1">
                                    {formatRupiah(kasData.ringkasan.total_penjualan)}
                                </p>
                                <p className="text-sm text-gray-500">
                                    {penjualanData.length} transaksi penjualan
                                </p>
                            </button>

                            <button
                                onClick={() => setModal('jasagiling')}
                                className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 text-left group relative overflow-hidden"
                            >
                                <div className="absolute -right-4 -top-4 w-24 h-24 bg-orange-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500 ease-in-out"></div>
                                <div className="relative z-10 flex items-center justify-between mb-4">
                                    <div className="bg-gradient-to-br from-orange-400 to-orange-600 p-4 rounded-xl shadow-md group-hover:shadow-lg transition-all">
                                        <WrenchScrewdriverIcon className="w-8 h-8 text-white" />
                                    </div>
                                    <FaChartLine className="w-6 h-6 text-gray-300 group-hover:text-orange-500 transition-colors" />
                                </div>
                                <h3 className="relative z-10 text-sm font-semibold text-gray-500 mb-1">Kas Jasa Giling</h3>
                                <p className="relative z-10 text-3xl font-bold text-gray-900 mb-1">
                                    {formatRupiah(kasData.ringkasan.total_jasa_giling)}
                                </p>
                                <p className="text-sm text-gray-500">
                                    {jasaGilingData.length} transaksi jasa
                                </p>
                            </button>

                            <button
                                onClick={() => setModal('total')}
                                className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 text-left group relative overflow-hidden"
                            >
                                <div className="absolute -right-4 -top-4 w-24 h-24 bg-green-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500 ease-in-out"></div>
                                <div className="relative z-10 flex items-center justify-between mb-4">
                                    <div className="bg-gradient-to-br from-green-400 to-green-600 p-4 rounded-xl shadow-md group-hover:shadow-lg transition-all">
                                        <CurrencyDollarIcon className="w-8 h-8 text-white" />
                                    </div>
                                    <FaChartLine className="w-6 h-6 text-gray-300 group-hover:text-green-500 transition-colors" />
                                </div>
                                <h3 className="relative z-10 text-sm font-semibold text-gray-500 mb-1">Total Pemasukan</h3>
                                <p className="relative z-10 text-3xl font-bold text-gray-900 mb-1">
                                    {formatRupiah(kasData.ringkasan.total_keseluruhan)}
                                </p>
                                <p className="text-sm text-gray-500">
                                    Gabungan semua pemasukan
                                </p>
                            </button>
                        </div>

                        {/* Modal Penjualan */}
                        <ModalDetail
                            open={modal === 'penjualan'}
                            onClose={() => setModal(null)}
                            title="Detail Kas Penjualan"
                            headerColor="from-blue-600 to-indigo-700"
                        >
                            {/* Mobile Cards - Penjualan */}
                            <div className="block sm:hidden space-y-3">
                                {penjualanPaginated.length > 0 ? (
                                    penjualanPaginated.map((item, index) => (
                                        <div key={index} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                                    <FaCalendarAlt className="w-3.5 h-3.5" />
                                                    {new Date(item.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </div>
                                                <span className="text-sm font-bold text-blue-600">{formatRupiah(item.total_pemasukan)}</span>
                                            </div>
                                            <p className="text-sm font-semibold text-gray-900">{item.nama_pelanggan}</p>
                                            <div className="flex items-center justify-between mt-1">
                                                <span className="text-xs text-gray-500">{item.nama_produk}</span>
                                                <span className="text-xs text-gray-600 font-medium">{item.jumlah_kg} Kg</span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8">
                                        <FaShoppingCart className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                                        <p className="text-gray-500 text-sm">Tidak ada data penjualan bulan ini</p>
                                    </div>
                                )}
                                {penjualanPaginated.length > 0 && (
                                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                                        <span className="text-xs font-semibold text-gray-500 uppercase">Total Kas Penjualan</span>
                                        <span className="text-base font-bold text-blue-600">{formatRupiah(kasData.ringkasan.total_penjualan)}</span>
                                    </div>
                                )}
                            </div>

                            {/* Desktop Table - Penjualan */}
                            <div className="hidden sm:block overflow-x-auto rounded-xl shadow-sm border border-gray-200">
                                <table className="min-w-full divide-y divide-gray-200 mb-0">
                                    <thead className="bg-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tanggal</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Pelanggan</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Produk</th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Jumlah (Kg)</th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Pemasukan</th>
                                    </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                    {penjualanPaginated.length > 0 ? (
                                        penjualanPaginated.map((item, index) => (
                                            <tr key={index} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    <div className="flex items-center gap-2">
                                                        <FaCalendarAlt className="w-4 h-4 text-gray-400" />
                                                        {new Date(item.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.nama_pelanggan}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{item.nama_produk}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">{item.jumlah_kg} Kg</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <FaMoneyBillWave className="w-4 h-4" />
                                                        {formatRupiah(item.total_pemasukan)}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center">
                                                <FaShoppingCart className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                                                <p className="text-gray-500 font-medium">Tidak ada data penjualan bulan ini</p>
                                            </td>
                                        </tr>
                                    )}
                                    </tbody>
                                    <tfoot className="bg-gray-100">
                                    <tr>
                                        <td colSpan={4} className="px-6 py-4 font-bold text-right text-gray-900 uppercase text-xs tracking-wider">Total Kas Penjualan</td>
                                        <td className="px-6 py-4 font-bold text-right text-blue-600 text-lg">
                                            <div className="flex items-center justify-end gap-1">
                                                <FaMoneyBillWave className="w-4 h-4" />
                                                {formatRupiah(kasData.ringkasan.total_penjualan)}
                                            </div>
                                        </td>
                                    </tr>
                                    </tfoot>
                                </table>
                            </div>
                            
                            <div className="mt-4">
                                {penjualanData.length > ITEMS_PER_PAGE && (
                                    <Pagination
                                        currentPage={penjualanPage}
                                        totalPages={penjualanTotalPages}
                                        onPageChange={setPenjualanPage}
                                    />
                                )}
                            </div>
                        </ModalDetail>

                        {/* Modal Jasa Giling */}
                        <ModalDetail
                            open={modal === 'jasagiling'}
                            onClose={() => setModal(null)}
                            title="Detail Kas Jasa Giling"
                            headerColor="from-orange-500 to-orange-600"
                        >
                            {/* Mobile Cards - Jasa Giling */}
                            <div className="block sm:hidden space-y-3">
                                {jasaGilingPaginated.length > 0 ? (
                                    jasaGilingPaginated.map((item, index) => (
                                        <div key={index} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                                    <FaCalendarAlt className="w-3.5 h-3.5" />
                                                    {new Date(item.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </div>
                                                <span className="text-sm font-bold text-blue-600">{formatRupiah(item.total_pemasukan)}</span>
                                            </div>
                                            <p className="text-sm font-semibold text-gray-900">{item.nama_pelanggan}</p>
                                            <div className="flex items-center justify-between mt-2">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">
                                                    <FaTools className="w-3 h-3 mr-1" />
                                                    {item.tipe_jasa}
                                                </span>
                                                <span className="text-xs text-gray-500">{item.tipe_pembayaran}</span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8">
                                        <FaTools className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                                        <p className="text-gray-500 text-sm">Tidak ada data jasa giling bulan ini</p>
                                    </div>
                                )}
                                {jasaGilingPaginated.length > 0 && (
                                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                                        <span className="text-xs font-semibold text-gray-500 uppercase">Total Kas Jasa Giling</span>
                                        <span className="text-base font-bold text-orange-600">{formatRupiah(kasData.ringkasan.total_jasa_giling)}</span>
                                    </div>
                                )}
                            </div>

                            {/* Desktop Table - Jasa Giling */}
                            <div className="hidden sm:block overflow-x-auto rounded-xl shadow-sm border border-gray-200">
                                <table className="min-w-full divide-y divide-gray-200 mb-0">
                                    <thead className="bg-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tanggal</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Pelanggan</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipe</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Pembayaran</th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Pemasukan</th>
                                    </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                    {jasaGilingPaginated.length > 0 ? (
                                        jasaGilingPaginated.map((item, index) => (
                                            <tr key={index} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    <div className="flex items-center gap-2">
                                                        <FaCalendarAlt className="w-4 h-4 text-gray-400" />
                                                        {new Date(item.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.nama_pelanggan}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">
                                                        <FaTools className="w-3 h-3 mr-1" />
                                                        {item.tipe_jasa}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{item.tipe_pembayaran}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <FaMoneyBillWave className="w-4 h-4" />
                                                        {formatRupiah(item.total_pemasukan)}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center">
                                                <FaTools className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                                                <p className="text-gray-500 font-medium">Tidak ada data jasa giling bulan ini</p>
                                            </td>
                                        </tr>
                                    )}
                                    </tbody>
                                    <tfoot className="bg-gray-100">
                                    <tr>
                                        <td colSpan={4} className="px-6 py-4 font-bold text-right text-gray-900 uppercase text-xs tracking-wider">Total Kas Jasa Giling</td>
                                        <td className="px-6 py-4 font-bold text-right text-orange-600 text-lg">
                                            <div className="flex items-center justify-end gap-1">
                                                <FaMoneyBillWave className="w-4 h-4 text-orange-600" />
                                                {formatRupiah(kasData.ringkasan.total_jasa_giling)}
                                            </div>
                                        </td>
                                    </tr>
                                    </tfoot>
                                </table>
                            </div>
                            
                            <div className="mt-4">
                                {jasaGilingData.length > ITEMS_PER_PAGE && (
                                    <Pagination
                                        currentPage={jasaGilingPage}
                                        totalPages={jasaGilingTotalPages}
                                        onPageChange={setJasaGilingPage}
                                    />
                                )}
                            </div>
                        </ModalDetail>

                        {/* Modal Total Pemasukan */}
                        <ModalDetail
                            open={modal === 'total'}
                            onClose={() => setModal(null)}
                            title="Total Pemasukan Bulanan"
                            headerColor="from-green-500 to-green-600"
                        >
                            <div className="text-center py-8">
                                {/* Total Amount */}
                                <div className="mb-8">
                                    <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
                                        <FaMoneyBillWave className="w-10 h-10 text-green-600" />
                                    </div>
                                    <h3 className="text-sm font-medium text-gray-600 mb-2">Total Pemasukan</h3>
                                    <p className="text-4xl sm:text-5xl font-bold text-green-600 mb-2">
                                        {formatRupiah(kasData.ringkasan.total_keseluruhan)}
                                    </p>
                                    <p className="text-gray-500">
                                        {bulanOptions.find(b => b.value === bulan)?.label} {tahun}
                                    </p>
                                </div>

                                {/* Breakdown */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                                    <div className="bg-white hover:bg-blue-50 transition-colors p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-4 opacity-5 bg-blue-500 rounded-bl-full w-24 h-24 transform translate-x-12 -translate-y-12 group-hover:scale-110 transition-transform"></div>
                                        <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-xl mx-auto mb-3 shadow-inner">
                                            <ShoppingCartIcon className="w-6 h-6 text-blue-600" />
                                        </div>
                                        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Kas Penjualan</h4>
                                        <p className="text-2xl font-bold text-gray-900">
                                            {formatRupiah(kasData.ringkasan.total_penjualan)}
                                        </p>
                                        <p className="text-sm text-blue-600 mt-2 bg-blue-50 rounded-full px-3 py-1 inline-block font-medium">
                                            {penjualanData.length} transaksi
                                        </p>
                                    </div>

                                    <div className="bg-white hover:bg-orange-50 transition-colors p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-4 opacity-5 bg-orange-500 rounded-bl-full w-24 h-24 transform translate-x-12 -translate-y-12 group-hover:scale-110 transition-transform"></div>
                                        <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-xl mx-auto mb-3 shadow-inner">
                                            <WrenchScrewdriverIcon className="w-6 h-6 text-orange-600" />
                                        </div>
                                        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Kas Jasa Giling</h4>
                                        <p className="text-2xl font-bold text-gray-900">
                                            {formatRupiah(kasData.ringkasan.total_jasa_giling)}
                                        </p>
                                        <p className="text-sm text-orange-600 mt-2 bg-orange-50 rounded-full px-3 py-1 inline-block font-medium">
                                            {jasaGilingData.length} transaksi
                                        </p>
                                    </div>
                                </div>

                                {/* Additional Info */}
                                <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                                    <p className="text-sm text-gray-600">
                                        Data pemasukan diambil dari transaksi yang tercatat pada periode yang dipilih
                                    </p>
                                </div>
                            </div>
                        </ModalDetail>
                    </div>
                )}

                {kasData && kasData.ringkasan.total_keseluruhan === 0 && (
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-12 text-center">
                        <div className="mx-auto w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-6 shadow-inner">
                            <FaMoneyBillWave className="w-10 h-10 text-gray-400" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800 mb-2">Belum ada pemasukan</h3>
                        <p className="text-gray-500 mb-8 max-w-md mx-auto line-height-relaxed">
                            Belum ada transaksi penjualan atau jasa giling yang tercatat untuk periode{' '}
                            <span className="font-semibold text-gray-700">
                                {bulanOptions.find(b => b.value === bulan)?.label} {tahun}
                            </span>
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link to="/penjualan" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg transition-all focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                                <FaShoppingCart className="w-4 h-4" />
                                Catat Penjualan
                            </Link>
                            <Link to="/jasa-giling" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-200 text-blue-600 rounded-xl font-medium hover:bg-gray-50 shadow-sm hover:shadow transition-all focus:ring-2 focus:ring-gray-200 focus:ring-offset-2">
                                <FaTools className="w-4 h-4" />
                                Catat Jasa Giling
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default KasPage;