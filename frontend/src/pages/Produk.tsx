import React, { useState, useEffect, useCallback, Fragment, useMemo } from 'react';
import * as api from '../services/api';
import { Produk, TipeProduk } from '../types';
import { FaEdit, FaTrashAlt, FaCheckCircle, FaTimesCircle, FaCube, FaBoxes } from 'react-icons/fa';
import { Dialog, Transition } from '@headlessui/react';
import { PlusIcon, XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import Pagination from '../components/Pagination';

const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    (window as any).addToast?.(message, type);
};

const ProdukFormModal: React.FC<any> = ({ isOpen, onClose, onSubmit, isEditing, initialData, isSubmitting }) => {
    const [namaProduk, setNamaProduk] = useState('');
    const [tipeProduk, setTipeProduk] = useState<TipeProduk>('BAHAN_MENTAH');
    const [satuan, setSatuan] = useState('Kg');
    const [lacakBatch, setLacakBatch] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (isEditing && initialData) {
                setNamaProduk(initialData.nama_produk);
                setTipeProduk(initialData.tipe_produk);
                setSatuan(initialData.satuan);
                setLacakBatch(initialData.lacak_per_batch);
            } else {
                setNamaProduk('');
                setTipeProduk('BAHAN_MENTAH');
                setSatuan('Kg');
                setLacakBatch(false);
            }
        }
    }, [isOpen, isEditing, initialData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload: api.InputProduk = {
            nama_produk: namaProduk,
            tipe_produk: tipeProduk,
            satuan: satuan,
            lacak_per_batch: lacakBatch,
        };
        onSubmit(payload);
    };

    const getTipeIcon = (tipe: TipeProduk) => {
        switch (tipe) {
            case 'BAHAN_MENTAH': return '🌾';
            case 'PRODUK_JADI': return '🍚';
            case 'PRODUK_SAMPINGAN': return '🌾';
            case 'KEMASAN': return '📦';
            default: return '📦';
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
                                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 relative">
                                    <Dialog.Title className="text-xl font-bold text-white flex items-center gap-3">
                                        <div className="p-2 bg-white/20 rounded-lg">
                                            <FaCube className="w-5 h-5" />
                                        </div>
                                        {isEditing ? 'Edit Produk' : 'Tambah Produk Baru'}
                                    </Dialog.Title>
                                    <button
                                        onClick={onClose}
                                        className="absolute top-4 right-4 text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                                    >
                                        <XMarkIcon className="w-5 h-5" />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div className="lg:col-span-2">
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Nama Produk</label>
                                            <input
                                                type="text"
                                                value={namaProduk}
                                                onChange={(e) => setNamaProduk(e.target.value)}
                                                placeholder="Masukkan nama produk"
                                                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Tipe Produk</label>
                                            <select
                                                value={tipeProduk}
                                                onChange={(e) => setTipeProduk(e.target.value as TipeProduk)}
                                                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                                            >
                                                <option value="BAHAN_MENTAH">🌾 Bahan Mentah</option>
                                                <option value="PRODUK_JADI">🍚 Produk Jadi</option>
                                                <option value="PRODUK_SAMPINGAN">🌾 Produk Sampingan</option>
                                                <option value="KEMASAN">📦 Kemasan</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Satuan</label>
                                            <input
                                                type="text"
                                                value={satuan}
                                                onChange={(e) => setSatuan(e.target.value)}
                                                placeholder="Contoh: Kg, Liter, Pcs"
                                                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                        <div className="flex items-center">
                                            <input
                                                id="lacakBatch"
                                                type="checkbox"
                                                className="mr-3 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                checked={lacakBatch}
                                                onChange={(e) => setLacakBatch(e.target.checked)}
                                            />
                                            <div>
                                                <label htmlFor="lacakBatch" className="text-sm font-semibold text-blue-900">
                                                    Lacak per Batch
                                                </label>
                                                <p className="text-xs text-blue-700 mt-1">
                                                    Aktifkan untuk melacak produk berdasarkan batch pembelian
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 rounded-xl p-6 flex flex-col sm:flex-row justify-end gap-3">
                                        <button
                                            type="button"
                                            className="rounded-xl border border-gray-300 bg-white py-3 px-6 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                            onClick={onClose}
                                        >
                                            Batal
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="inline-flex justify-center rounded-xl border border-transparent bg-gradient-to-r from-blue-600 to-indigo-600 py-3 px-6 text-sm font-medium text-white hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isSubmitting ? 'Menyimpan...' : (isEditing ? 'Update Produk' : 'Simpan Produk')}
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

const ProdukPage = () => {
    const [produkList, setProdukList] = useState<Produk[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState<Produk | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // Pagination calculations
    const totalPages = Math.ceil(produkList.length / itemsPerPage);
    const currentItems = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return produkList.slice(startIndex, startIndex + itemsPerPage);
    }, [produkList, currentPage]);

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await api.getAllProduk();
            setProdukList(Array.isArray(data) ? data : []);
            setError(null);
        } catch (err: any) {
            const msg = err.message || 'Gagal memuat data produk.';
            showToast(msg, 'error');
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const showAddForm = () => {
        setIsEditing(false);
        setEditData(null);
        setIsFormVisible(true);
    };

    const handleEditClick = (produk: Produk) => {
        setIsEditing(true);
        setEditData(produk);
        setIsFormVisible(true);
    };

    const confirmDelete = (id: number) => setDeleteId(id);

    const handleDelete = async () => {
        if (deleteId === null) return;
        try {
            await api.deleteProduk(deleteId);
            showToast('Produk berhasil dihapus!', 'success');
            fetchData();
        } catch (err: any) {
            showToast(err.message || 'Gagal menghapus produk.', 'error');
        } finally {
            setDeleteId(null);
        }
    };

    const handleSubmit = async (payload: api.InputProduk) => {
        setIsSubmitting(true);
        try {
            if (isEditing && editData) {
                await api.updateProduk(editData.id, payload);
                showToast('Produk berhasil diperbarui!');
            } else {
                await api.createProduk(payload);
                showToast('Produk berhasil ditambahkan!');
            }
            setIsFormVisible(false);
            await fetchData();
        } catch (err: any) {
            showToast(err.message || 'Gagal menyimpan data produk.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getTipeLabel = (tipe: TipeProduk) => {
        switch (tipe) {
            case 'BAHAN_MENTAH': return 'Bahan Mentah';
            case 'PRODUK_JADI': return 'Produk Jadi';
            case 'PRODUK_SAMPINGAN': return 'Produk Sampingan';
            case 'KEMASAN': return 'Kemasan';
            default: return tipe;
        }
    };

    const getTipeColor = (tipe: TipeProduk) => {
        switch (tipe) {
            case 'BAHAN_MENTAH': return 'bg-green-100 text-green-800';
            case 'PRODUK_JADI': return 'bg-blue-100 text-blue-800';
            case 'PRODUK_SAMPINGAN': return 'bg-yellow-100 text-yellow-800';
            case 'KEMASAN': return 'bg-purple-100 text-purple-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getTipeIcon = (tipe: TipeProduk) => {
        switch (tipe) {
            case 'BAHAN_MENTAH': return '🌾';
            case 'PRODUK_JADI': return '🍚';
            case 'PRODUK_SAMPINGAN': return '🌾';
            case 'KEMASAN': return '📦';
            default: return '📦';
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-lg font-medium text-gray-700">Memuat data produk...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center max-w-md mx-auto">
                    <div className="bg-red-100 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
                        <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
                    </div>
                    <p className="text-lg font-medium text-gray-900 mb-2">Terjadi Kesalahan</p>
                    <p className="text-red-600 mb-4">{error}</p>
                    <button
                        onClick={fetchData}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Coba Lagi
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">Manajemen Produk</h1>
                        <p className="text-gray-600">Kelola produk dengan kategori yang terorganisir</p>
                    </div>

                    <button
                        onClick={showAddForm}
                        className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 font-medium transform hover:-translate-y-0.5"
                    >
                        <PlusIcon className="w-5 h-5" />
                        <span>Tambah Produk Baru</span>
                    </button>
                </div>

                {/* Data Table Section */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
                    <div className="p-6 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <FaBoxes className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Daftar Produk</h2>
                                <p className="text-sm text-gray-600">
                                    Menampilkan {currentItems.length} dari {produkList.length} total produk
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Mobile Cards */}
                    <div className="space-y-4 p-6 md:hidden">
                        {currentItems.length > 0 ? (
                            currentItems.map((produk) => (
                                <div key={produk.id} className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-lg">{getTipeIcon(produk.tipe_produk)}</span>
                                                <h3 className="font-bold text-lg text-gray-900">{produk.nama_produk}</h3>
                                            </div>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTipeColor(produk.tipe_produk)}`}>
                                                {getTipeLabel(produk.tipe_produk)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleEditClick(produk)}
                                                className="p-2 rounded-lg text-blue-600 hover:bg-blue-100 transition-colors"
                                                title="Edit"
                                            >
                                                <FaEdit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => confirmDelete(produk.id)}
                                                className="p-2 rounded-lg text-red-600 hover:bg-red-100 transition-colors"
                                                title="Hapus"
                                            >
                                                <FaTrashAlt className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 text-sm border-t border-blue-200 pt-3">
                                        <div className="bg-white rounded-lg p-3 text-center">
                                            <p className="text-xs text-gray-500 mb-1">Satuan</p>
                                            <p className="font-bold text-gray-900">{produk.satuan}</p>
                                        </div>
                                        <div className="bg-white rounded-lg p-3 text-center">
                                            <p className="text-xs text-gray-500 mb-1">Lacak Batch</p>
                                            <div className="flex justify-center">
                                                {produk.lacak_per_batch ?
                                                    <FaCheckCircle className="w-5 h-5 text-green-500" /> :
                                                    <FaTimesCircle className="w-5 h-5 text-red-500" />
                                                }
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-12">
                                <FaBoxes className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                <p className="text-lg font-medium text-gray-900 mb-2">Tidak ada data produk</p>
                                <p className="text-gray-500">Belum ada produk yang ditambahkan.</p>
                            </div>
                        )}
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden md:block">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Produk</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Tipe</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Satuan</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Lacak Batch</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Aksi</th>
                                </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                {currentItems.length > 0 ? (
                                    currentItems.map((produk, index) => (
                                        <tr key={produk.id} className={`hover:bg-blue-50/50 transition-colors ${
                                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                                        }`}>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xl">{getTipeIcon(produk.tipe_produk)}</span>
                                                    <div className="text-sm font-medium text-gray-900">{produk.nama_produk}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTipeColor(produk.tipe_produk)}`}>
                                                        {getTipeLabel(produk.tipe_produk)}
                                                    </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-medium text-gray-900">{produk.satuan}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {produk.lacak_per_batch ?
                                                    <FaCheckCircle className="h-5 w-5 text-green-500 inline-block" /> :
                                                    <FaTimesCircle className="h-5 w-5 text-red-500 inline-block" />
                                                }
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleEditClick(produk)}
                                                        className="p-2 rounded-lg text-blue-600 hover:bg-blue-100 transition-colors"
                                                        title="Edit"
                                                    >
                                                        <FaEdit className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => confirmDelete(produk.id)}
                                                        className="p-2 rounded-lg text-red-600 hover:bg-red-100 transition-colors"
                                                        title="Hapus"
                                                    >
                                                        <FaTrashAlt className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center">
                                            <FaBoxes className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                            <p className="text-lg font-medium text-gray-900 mb-2">Tidak ada data produk</p>
                                            <p className="text-gray-500">Belum ada produk yang ditambahkan.</p>
                                        </td>
                                    </tr>
                                )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Pagination */}
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    showItemsInfo={true}
                    totalItems={produkList.length}
                    itemsPerPage={itemsPerPage}
                />

                {/* Form Modal */}
                <ProdukFormModal
                    isOpen={isFormVisible}
                    onClose={() => setIsFormVisible(false)}
                    onSubmit={handleSubmit}
                    isEditing={isEditing}
                    initialData={editData}
                    isSubmitting={isSubmitting}
                />

                {/* Delete Confirmation Modal */}
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
                                    <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all border border-red-100">
                                        <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4">
                                            <Dialog.Title className="text-xl font-bold text-white flex items-center gap-3">
                                                <div className="p-2 bg-white/20 rounded-lg">
                                                    <ExclamationTriangleIcon className="w-5 h-5" />
                                                </div>
                                                Konfirmasi Hapus
                                            </Dialog.Title>
                                        </div>

                                        <div className="p-6">
                                            <p className="text-gray-700 mb-6">
                                                Apakah Anda yakin ingin menghapus produk ini? Tindakan ini tidak dapat dibatalkan dan akan mempengaruhi data terkait.
                                            </p>

                                            <div className="flex justify-end gap-3">
                                                <button
                                                    type="button"
                                                    className="rounded-xl border border-gray-300 bg-white py-2.5 px-6 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                                    onClick={() => setDeleteId(null)}
                                                >
                                                    Batal
                                                </button>
                                                <button
                                                    type="button"
                                                    className="rounded-xl border border-transparent bg-gradient-to-r from-red-600 to-red-700 py-2.5 px-6 text-sm font-medium text-white hover:from-red-700 hover:to-red-800 transition-all shadow-lg shadow-red-500/25"
                                                    onClick={handleDelete}
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
            </div>
        </div>
    );
};

export default ProdukPage;