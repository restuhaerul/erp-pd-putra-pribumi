import React, { useState, useEffect, useCallback, Fragment, useMemo } from 'react';
import * as api from '../services/api';
import { StokProduk, Produk, LogStokProduk, LogPembelian, LogKarung } from '../types';
import { Dialog, Transition } from '@headlessui/react';
import {
  PlusIcon,
  XMarkIcon,
  EyeIcon,
  ClockIcon,
  TruckIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/solid';
import { GiWheat, GiPowder, GiStonePile } from 'react-icons/gi';
import { FaBowlFood, FaBox, FaWarehouse } from 'react-icons/fa6';
import Pagination from '../components/Pagination';

// Tipe data gabungan untuk menyeragamkan semua jenis stok
interface UnifiedStokItem {
  id: string;
  produk: Produk;
  total_stok: number;
  isBatch: boolean;
  unit: 'Kg' | 'Pcs';
}

// Filter interface for activity
interface ActivityFilter {
  tipeProduk: string;
  startDate: string;
  endDate: string;
}

/**
 * ✅ REUSABLE SHELL: Nested Modal (dipakai untuk semua histori)
 * Tujuan: bikin semua nested modal (gabah-beras-menirdedak-karung) tampilannya PERSIS sama.
 */
const NestedModalShell = ({
  isOpen,
  onClose,
  icon,
  title,
  subtitle,
  headerGradientClass = 'from-cyan-500 via-blue-500 to-indigo-500',
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  headerGradientClass?: string;
  children: React.ReactNode;
}) => {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      {/* z-[60] biar bener-bener di atas detail modal */}
      <Dialog as="div" className="relative z-[60]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          {/* ✅ Sama persis kayak Karung */}
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
              {/* ✅ Panel sama persis */}
              <Dialog.Panel className="w-full max-w-5xl overflow-hidden transition-all transform bg-white shadow-2xl rounded-3xl ring-1 ring-black/5">
                {/* ✅ Header sama persis */}
                <div className={`relative px-6 py-5 overflow-hidden bg-gradient-to-r ${headerGradientClass}`}>
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_50%_120%,white,transparent)]" />
                  <div className="absolute top-0 right-0 w-64 h-64 translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 blur-3xl" />

                  <div className="relative flex items-center gap-4">
                    <div className="p-3 shadow-lg bg-white/20 rounded-2xl backdrop-blur-sm ring-1 ring-white/30">
                      {icon}
                    </div>
                    <div>
                      <Dialog.Title className="text-xl font-bold tracking-tight text-white">{title}</Dialog.Title>
                      {subtitle ? (
                        <p className="text-white/80 text-sm mt-0.5">{subtitle}</p>
                      ) : (
                        <p className="text-white/80 text-sm mt-0.5">&nbsp;</p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2.5 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95"
                    aria-label="Tutup"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>

                {/* Body content */}
                {children}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

// Komponen Modal untuk menampilkan detail stok
const StokDetailModal = ({
  isOpen,
  onClose,
  title,
  items,
  onViewHistory,
  onViewKarungHistory,
  onViewPembelianHistory,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  items: UnifiedStokItem[];
  onViewHistory: (stok: UnifiedStokItem) => void;
  onViewKarungHistory: (stok: UnifiedStokItem) => void;
  onViewPembelianHistory: (stok: UnifiedStokItem) => void;
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  useEffect(() => {
    setCurrentPage(1);
  }, [items]);

  const summary = useMemo(() => {
    if (!items || items.length === 0) return { total: 0, unit: '' };
    const total = items.reduce((sum, item) => sum + item.total_stok, 0);
    const unit = items[0].unit;
    return { total, unit };
  }, [items]);

  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
  const currentItems = useMemo(() => {
    const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
    const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
    return items.slice(indexOfFirstItem, indexOfLastItem);
  }, [currentPage, items]);

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
          <div className="flex items-stretch justify-center min-h-full p-0 md:items-center md:p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-400"
              enterFrom="opacity-0 md:scale-90 translate-y-8"
              enterTo="opacity-100 md:scale-100 translate-y-0"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 md:scale-100 translate-y-0"
              leaveTo="opacity-0 md:scale-90 translate-y-8"
            >
              <Dialog.Panel className="w-full md:max-w-5xl h-[100dvh] md:h-auto md:max-h-[85vh] overflow-hidden rounded-none md:rounded-3xl bg-white shadow-2xl ring-1 ring-black/5 flex flex-col">
                {/* Header dengan gradient */}
                <div className="relative sticky top-0 z-10 px-5 py-5 overflow-hidden md:px-6 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600">
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_50%_120%,white,transparent)]" />
                  <div className="absolute top-0 right-0 w-64 h-64 translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 blur-3xl" />

                  <div className="relative flex items-center gap-4">
                    <div className="p-3 shadow-lg bg-white/20 rounded-2xl backdrop-blur-sm ring-1 ring-white/30">
                      <FaBox className="w-5 h-5 text-white md:w-6 md:h-6" />
                    </div>
                    <div>
                      <Dialog.Title className="text-xl font-bold tracking-tight text-white md:text-2xl">
                        {title}
                      </Dialog.Title>
                      <p className="text-blue-100 text-sm mt-0.5">Detail stok per batch/produk</p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2.5 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95"
                    aria-label="Tutup"
                  >
                    <XMarkIcon className="w-5 h-5 md:w-6 md:h-6" />
                  </button>
                </div>

                <div className="flex-1 p-4 overflow-y-auto md:p-6">
                  {items.length > 0 ? (
                    <>
                      <div className="p-5 mb-4 border-2 border-blue-200 shadow-sm bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-50 rounded-2xl md:mb-6">
                        <div className="text-center">
                          <p className="text-xs md:text-sm font-semibold text-blue-600 mb-1.5">Total Keseluruhan</p>
                          <p className="text-3xl font-extrabold text-blue-700 md:text-4xl tabular-nums">
                            {summary.total.toLocaleString('id-ID')}{' '}
                            <span className="text-base font-semibold md:text-lg">{summary.unit}</span>
                          </p>
                          <p className="text-xs md:text-sm text-blue-500 mt-1.5 font-medium">
                            {items.length} item produk
                          </p>
                        </div>
                      </div>

                      <div className="overflow-hidden bg-white border border-gray-200 shadow-sm rounded-xl">
                        <div className="hidden overflow-x-auto md:block">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-4 text-xs font-semibold tracking-wider text-left text-gray-600 uppercase">
                                  Nama Produk
                                </th>
                                <th className="px-6 py-4 text-xs font-semibold tracking-wider text-right text-gray-600 uppercase">
                                  Total Stok
                                </th>
                                <th className="px-6 py-4 text-xs font-semibold tracking-wider text-center text-gray-600 uppercase">
                                  Aksi
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                              {currentItems.map((stok, index) => (
                                <tr
                                  key={stok.id}
                                  className={`hover:bg-blue-50/50 transition-colors ${
                                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                                  }`}
                                >
                                  <td className="px-6 py-4">
                                    <div className="flex items-center">
                                      <div className="flex-shrink-0 w-10 h-10">
                                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100">
                                          <FaBox className="w-5 h-5 text-blue-600" />
                                        </div>
                                      </div>
                                      <div className="ml-4">
                                        <div className="text-sm font-semibold text-gray-900">
                                          {stok.produk.nama_produk}
                                        </div>
                                        {stok.isBatch && (
                                          <div className="text-xs font-medium text-blue-600">
                                            {stok.id.startsWith('pembelian-')
                                              ? '📦 Batch Pembelian'
                                              : stok.id.startsWith('karung-')
                                              ? '🛍️ Batch Karung'
                                              : '📋 Batch Produksi'}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <span className="text-lg font-bold text-gray-900">
                                      {stok.total_stok.toLocaleString('id-ID')}
                                    </span>
                                    <span className="ml-1 text-sm font-medium text-gray-500">{stok.unit}</span>
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                    {(!stok.isBatch ||
                                      stok.id.startsWith('pembelian-') ||
                                      stok.id.startsWith('karung-')) && (
                                      <button
                                        onClick={() => {
                                          if (stok.id.startsWith('karung-')) onViewKarungHistory(stok);
                                          else if (stok.id.startsWith('pembelian-')) onViewPembelianHistory(stok);
                                          else onViewHistory(stok);
                                        }}
                                        className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-700 transition-colors bg-blue-100 rounded-lg hover:bg-blue-200 hover:text-blue-800"
                                        title="Lihat Histori"
                                      >
                                        <EyeIcon className="w-4 h-4 mr-1" />
                                        Histori
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="divide-y divide-gray-100 md:hidden">
                          {currentItems.map((stok) => (
                            <div key={stok.id} className="p-4">
                              <div className="flex items-start gap-3">
                                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100">
                                  <FaBox className="w-5 h-5 text-blue-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-semibold text-gray-900 truncate">
                                    {stok.produk.nama_produk}
                                  </div>
                                  {stok.isBatch && (
                                    <div className="text-[11px] text-blue-600 font-medium">
                                      {stok.id.startsWith('pembelian-')
                                        ? '📦 Batch Pembelian'
                                        : stok.id.startsWith('karung-')
                                        ? '🛍️ Batch Karung'
                                        : '📋 Batch Produksi'}
                                    </div>
                                  )}
                                </div>
                                <div className="text-right">
                                  <div className="text-base font-bold text-gray-900">
                                    {stok.total_stok.toLocaleString('id-ID')}
                                    <span className="ml-1 text-sm font-medium text-gray-500">{stok.unit}</span>
                                  </div>
                                </div>
                              </div>

                              {(!stok.isBatch ||
                                stok.id.startsWith('pembelian-') ||
                                stok.id.startsWith('karung-')) && (
                                <div className="mt-3">
                                  <button
                                    onClick={() => {
                                      if (stok.id.startsWith('karung-')) onViewKarungHistory(stok);
                                      else if (stok.id.startsWith('pembelian-')) onViewPembelianHistory(stok);
                                      else onViewHistory(stok);
                                    }}
                                    className="inline-flex items-center justify-center w-full gap-2 py-2 text-sm font-medium text-blue-700 transition-colors bg-blue-100 rounded-lg hover:bg-blue-200 hover:text-blue-800"
                                  >
                                    <EyeIcon className="w-4 h-4" />
                                    Lihat Histori
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="py-12 text-center">
                      <FaBox className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p className="mb-2 text-lg font-medium text-gray-900">Tidak ada data stok</p>
                      <p className="text-gray-500">Belum ada data stok untuk kategori ini.</p>
                    </div>
                  )}
                </div>

                {items.length > 0 && totalPages > 1 && (
                  <div className="sticky bottom-0 px-4 py-3 bg-white border-t border-gray-200 md:px-6">
                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

// Enhanced Summary Card dengan desain gradient yang menarik
const SummaryCardButton = ({
  title,
  value,
  icon,
  onClick,
  colorScheme = 'blue',
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  onClick: () => void;
  colorScheme?: 'blue' | 'emerald' | 'amber' | 'violet' | 'cyan';
}) => {
  const colorClasses = {
    blue: {
      bg: 'from-blue-50 via-indigo-50 to-blue-50',
      border: 'border-blue-100 hover:border-blue-300',
      iconBg: 'from-blue-500 to-indigo-500',
      iconShadow: 'shadow-blue-500/30',
      text: 'text-blue-600',
      valueText: 'text-blue-700',
    },
    emerald: {
      bg: 'from-emerald-50 via-green-50 to-emerald-50',
      border: 'border-emerald-100 hover:border-emerald-300',
      iconBg: 'from-emerald-500 to-green-500',
      iconShadow: 'shadow-emerald-500/30',
      text: 'text-emerald-600',
      valueText: 'text-emerald-700',
    },
    amber: {
      bg: 'from-amber-50 via-yellow-50 to-amber-50',
      border: 'border-amber-100 hover:border-amber-300',
      iconBg: 'from-amber-500 to-yellow-500',
      iconShadow: 'shadow-amber-500/30',
      text: 'text-amber-600',
      valueText: 'text-amber-700',
    },
    violet: {
      bg: 'from-violet-50 via-purple-50 to-violet-50',
      border: 'border-violet-100 hover:border-violet-300',
      iconBg: 'from-violet-500 to-purple-500',
      iconShadow: 'shadow-violet-500/30',
      text: 'text-violet-600',
      valueText: 'text-violet-700',
    },
    cyan: {
      bg: 'from-cyan-50 via-sky-50 to-cyan-50',
      border: 'border-cyan-100 hover:border-cyan-300',
      iconBg: 'from-cyan-500 to-sky-500',
      iconShadow: 'shadow-cyan-500/30',
      text: 'text-cyan-600',
      valueText: 'text-cyan-700',
    },
  };

  const colors = colorClasses[colorScheme];

  return (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden bg-gradient-to-br ${colors.bg} p-5 rounded-2xl shadow-lg border-2 ${colors.border} hover:shadow-xl transition-all duration-300 w-full text-left transform hover:-translate-y-1`}
    >
      {/* Decorative blob */}
      <div className="absolute w-32 h-32 rounded-full -top-10 -right-10 bg-gradient-to-br from-white/40 to-transparent blur-2xl" />

      <div className="relative flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${colors.text} mb-1`}>{title}</p>
          <p className={`text-2xl font-extrabold ${colors.valueText} truncate leading-tight tabular-nums`}>
            {value}
          </p>
        </div>
        <div
          className={`bg-gradient-to-br ${colors.iconBg} p-3.5 rounded-xl shadow-lg ${colors.iconShadow} group-hover:scale-110 transition-transform duration-300`}
        >
          <div className="text-xl text-white">{icon}</div>
        </div>
      </div>

      {/* Click indicator */}
      <div
        className={`mt-3 flex items-center gap-1 text-xs font-medium ${colors.text} opacity-60 group-hover:opacity-100 transition-opacity`}
      >
        <EyeIcon className="w-3.5 h-3.5" />
        <span>Klik untuk detail</span>
      </div>
    </button>
  );
};

// Enhanced Activity Filter Component
const ActivityFilterComponent = ({
  filter,
  onFilterChange,
  onReset,
}: {
  filter: ActivityFilter;
  onFilterChange: (filter: ActivityFilter) => void;
  onReset: () => void;
}) => {
  const produkTypes = [
    { value: '', label: 'Semua Produk' },
    { value: 'BAHAN_MENTAH', label: 'Bahan Mentah' },
    { value: 'PRODUK_JADI', label: 'Produk Jadi' },
    { value: 'PRODUK_SAMPINGAN', label: 'Produk Sampingan' },
    { value: 'KEMASAN', label: 'Kemasan' },
  ];

  const hasActiveFilter = filter.tipeProduk || filter.startDate || filter.endDate;

  return (
    <div className="p-5 border border-blue-100 shadow-sm bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 rounded-2xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-lg shadow-blue-500/20">
            <FunnelIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Filter Aktivitas</h3>
            <p className="text-xs text-gray-500">Saring data berdasarkan kriteria</p>
          </div>
        </div>
        {hasActiveFilter && (
          <span className="px-3 py-1 text-xs font-semibold text-blue-700 bg-blue-100 rounded-full">
            Filter Aktif
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className="block mb-2 text-sm font-semibold text-gray-700">Tipe Produk</label>
          <select
            value={filter.tipeProduk}
            onChange={(e) => onFilterChange({ ...filter, tipeProduk: e.target.value })}
            className="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all bg-white"
          >
            {produkTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-2 text-sm font-semibold text-gray-700">Tanggal Mulai</label>
          <input
            type="date"
            value={filter.startDate}
            onChange={(e) => onFilterChange({ ...filter, startDate: e.target.value })}
            className="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all bg-white"
          />
        </div>

        <div>
          <label className="block mb-2 text-sm font-semibold text-gray-700">Tanggal Akhir</label>
          <input
            type="date"
            value={filter.endDate}
            onChange={(e) => onFilterChange({ ...filter, endDate: e.target.value })}
            className="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all bg-white"
          />
        </div>
      </div>

      <div className="flex justify-end mt-4">
        <button
          onClick={onReset}
          disabled={!hasActiveFilter}
          className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all ${
            hasActiveFilter ? 'text-blue-600 bg-blue-100 hover:bg-blue-200' : 'text-gray-400 bg-gray-100 cursor-not-allowed'
          }`}
        >
          Reset Filter
        </button>
      </div>
    </div>
  );
};

const StokProdukPage = () => {
  const [unifiedStokList, setUnifiedStokList] = useState<UnifiedStokItem[]>([]);
  const [produkManualList, setProdukManualList] = useState<Produk[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('semua');
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [activityLog, setActivityLog] = useState<LogStokProduk[]>([]);
  const [isKarungHistoryVisible, setIsKarungHistoryVisible] = useState(false);
  const [karungHistoryData, setKarungHistoryData] = useState<LogKarung[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [selectedProdukId, setSelectedProdukId] = useState<string>('');
  const [jumlahTambah, setJumlahTambah] = useState<string>('');
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);
  const [isPembelianHistoryVisible, setIsPembelianHistoryVisible] = useState(false);
  const [historyData, setHistoryData] = useState<LogStokProduk[]>([]);
  const [logPembelianData, setLogPembelianData] = useState<LogPembelian[]>([]);
  const [selectedStok, setSelectedStok] = useState<UnifiedStokItem | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [stokProdukList, setStokProdukList] = useState<StokProduk[]>([]);

  // New state for enhanced activity features
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>({
    tipeProduk: '',
    startDate: '',
    endDate: '',
  });
  const [activityPage, setActivityPage] = useState(1);
  const [isActivityLoading, setIsActivityLoading] = useState(false);
  const [totalActivityPages, setTotalActivityPages] = useState(1);
  const ACTIVITY_ITEMS_PER_PAGE = 10;

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    (window as any).addToast?.(message, type);
  };

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [stokData, pembelianData, produkData, karungData] = await Promise.all([
        api.getAllStokProduk(),
        api.getAllPembelian(),
        api.getAllProduk(),
        api.getAllKarung(),
      ]);

      // Simpan data stok agregat
      setStokProdukList(Array.isArray(stokData) ? stokData : []);

      const allProduk = Array.isArray(produkData) ? produkData : [];
      setProdukManualList(allProduk.filter((p) => p.tipe_produk === 'PRODUK_SAMPINGAN'));

      // combinedList berisi data batch untuk modal rincian
      const combinedList: UnifiedStokItem[] = [];

      if (Array.isArray(pembelianData)) {
        pembelianData.forEach((batch: any) => {
          if (batch.produk && batch.sisa_kg > 0) {
            const deskriptifProduk: Produk = {
              ...batch.produk,
              nama_produk: `${batch.produk.nama_produk} (Pembelian dari ${batch.nama_pemasok})`,
            };
            combinedList.push({
              id: `pembelian-${batch.id}`,
              produk: deskriptifProduk,
              total_stok: batch.sisa_kg,
              isBatch: true,
              unit: 'Kg',
            });
          }
        });
      }

      if (Array.isArray(karungData)) {
        karungData.forEach((batch: any) => {
          if (batch.produk && batch.sisa > 0) {
            combinedList.push({
              id: `karung-${batch.id}`,
              produk: batch.produk,
              total_stok: batch.sisa,
              isBatch: true,
              unit: 'Pcs',
            });
          }
        });
      }

      setUnifiedStokList(combinedList);
      setError(null);
    } catch (err: any) {
      const errorMessage = err.message || 'Gagal memuat data.';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Enhanced fetch activity with filtering and pagination
  const fetchActivity = useCallback(
    async (page: number = 1) => {
      try {
        setIsActivityLoading(true);
        const data = await api.getRecentStockActivity(ACTIVITY_ITEMS_PER_PAGE);

        let filteredData = Array.isArray(data) ? data : [];

        if (activityFilter.tipeProduk) {
          filteredData = filteredData.filter((log: any) => log.produk?.tipe_produk === activityFilter.tipeProduk);
        }

        if (activityFilter.startDate) {
          const startDate = new Date(activityFilter.startDate);
          filteredData = filteredData.filter((log: any) => new Date(log.timestamp) >= startDate);
        }

        if (activityFilter.endDate) {
          const endDate = new Date(activityFilter.endDate);
          endDate.setHours(23, 59, 59, 999);
          filteredData = filteredData.filter((log: any) => new Date(log.timestamp) <= endDate);
        }

        const totalPages = Math.ceil(filteredData.length / ACTIVITY_ITEMS_PER_PAGE);
        const startIndex = (page - 1) * ACTIVITY_ITEMS_PER_PAGE;
        const paginatedData = filteredData.slice(startIndex, startIndex + ACTIVITY_ITEMS_PER_PAGE);

        setActivityLog(paginatedData);
        setTotalActivityPages(totalPages);
        setActivityPage(page);
      } catch (err: any) {
        const errorMessage = err.message || 'Gagal memuat aktivitas.';
        showToast(errorMessage, 'error');
      } finally {
        setIsActivityLoading(false);
      }
    },
    [activityFilter]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchActivity(1);
  }, [fetchActivity]);

  const summaryPerKategori = useMemo(() => {
    const totals = { gabah: 0, beras: 0, menir: 0, dedak: 0, karung: 0 };

    // Hitung total untuk Beras, Menir, Dedak dari stok agregat
    stokProdukList.forEach((item) => {
      if (!item.produk) return;

      const tipe = item.produk.tipe_produk;
      const nama = item.produk.nama_produk.toLowerCase();

      if (tipe === 'PRODUK_JADI') {
        totals.beras += item.total_stok_kg;
      } else if (tipe === 'PRODUK_SAMPINGAN') {
        if (nama.includes('menir')) totals.menir += item.total_stok_kg;
        else if (nama.includes('dedak')) totals.dedak += item.total_stok_kg;
      }
    });

    // Hitung total Gabah dan Karung dari batch aktif
    unifiedStokList.forEach((item) => {
      const tipe = item.produk.tipe_produk;
      if (tipe === 'BAHAN_MENTAH') totals.gabah += item.total_stok;
      else if (tipe === 'KEMASAN') totals.karung += item.total_stok;
    });

    return totals;
  }, [stokProdukList, unifiedStokList]);

  const filteredStokList = useMemo<UnifiedStokItem[]>(() => {
    const cat = activeCategory.toLowerCase();

    if (cat === 'gabah') return unifiedStokList.filter((i) => i.produk.tipe_produk === 'BAHAN_MENTAH');
    if (cat === 'karung') return unifiedStokList.filter((i) => i.produk.tipe_produk === 'KEMASAN');

    if (cat === 'beras') {
      return stokProdukList
        .filter((sp) => sp.produk?.tipe_produk === 'PRODUK_JADI' && sp.total_stok_kg > 0)
        .map((sp) => ({
          id: `produk-${sp.produk!.id}`,
          produk: sp.produk!,
          total_stok: sp.total_stok_kg,
          isBatch: false,
          unit: 'Kg',
        }));
    }

    if (cat === 'menir' || cat === 'dedak') {
      return stokProdukList
        .filter(
          (sp) =>
            sp.produk?.tipe_produk === 'PRODUK_SAMPINGAN' &&
            sp.produk?.nama_produk.toLowerCase().includes(cat) &&
            sp.total_stok_kg > 0
        )
        .map((sp) => ({
          id: `produk-${sp.produk!.id}`,
          produk: sp.produk!,
          total_stok: sp.total_stok_kg,
          isBatch: false,
          unit: 'Kg',
        }));
    }

    return [];
  }, [activeCategory, unifiedStokList, stokProdukList]);

  const handleViewHistory = async (stok: UnifiedStokItem) => {
    setSelectedStok(stok);
    setIsHistoryVisible(true);
    setIsHistoryLoading(true);
    try {
      const data = await api.getStokHistory(stok.produk.id);
      setHistoryData(data);
    } catch (err: any) {
      showToast(err.message || 'Gagal memuat histori.', 'error');
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleViewPembelianHistory = async (stok: UnifiedStokItem) => {
    const batchId = parseInt(stok.id.replace('pembelian-', ''), 10);
    if (isNaN(batchId)) return;

    setSelectedStok(stok);
    setIsPembelianHistoryVisible(true);
    setIsHistoryLoading(true);
    try {
      const data = await api.getPembelianHistory(batchId);
      setLogPembelianData(data);
    } catch (err: any) {
      showToast(err.message || 'Gagal memuat histori pembelian', 'error');
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleViewKarungHistory = async (stok: UnifiedStokItem) => {
    const batchId = parseInt(stok.id.replace('karung-', ''), 10);
    if (isNaN(batchId)) return;

    setSelectedStok(stok);
    setIsKarungHistoryVisible(true);
    setIsHistoryLoading(true);
    try {
      const data = await api.getKarungHistory(batchId);
      setKarungHistoryData(data);
    } catch (err: any) {
      showToast(err.message || 'Gagal memuat histori karung.', 'error');
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProdukId || !jumlahTambah) {
      showToast('Produk dan Jumlah harus diisi.', 'error');
      return;
    }
    const payload: api.InputTambahStok = {
      produk_id: parseInt(selectedProdukId, 10),
      jumlah_kg: parseFloat(jumlahTambah),
    };
    try {
      await api.tambahStokManual(payload);
      showToast('Stok berhasil ditambahkan!');
      setIsFormVisible(false);
      resetForm();
      fetchData();
      fetchActivity(1);
    } catch (err: any) {
      showToast(err.message || 'Gagal menambah stok.', 'error');
    }
  };

  const handleSummaryCardClick = (category: string) => {
    setActiveCategory(category);
    setIsDetailModalVisible(true);
  };

  const handleFilterChange = (newFilter: ActivityFilter) => setActivityFilter(newFilter);

  const handleFilterReset = () => {
    setActivityFilter({
      tipeProduk: '',
      startDate: '',
      endDate: '',
    });
  };

  const handleActivityPageChange = (page: number) => fetchActivity(page);

  const resetForm = () => {
    setSelectedProdukId('');
    setJumlahTambah('');
  };

  const handleOpenModal = () => {
    resetForm();
    setIsFormVisible(true);
  };

  const handleCloseModal = () => setIsFormVisible(false);

  // ✅ CLOSE HANDLERS (rapi + reset data) biar nested modal clean
  const handleCloseHistoryModal = () => {
    setIsHistoryVisible(false);
    setHistoryData([]);
    setSelectedStok(null);
    setIsHistoryLoading(false);
  };

  const handleClosePembelianHistoryModal = () => {
    setIsPembelianHistoryVisible(false);
    setLogPembelianData([]);
    setSelectedStok(null);
    setIsHistoryLoading(false);
  };

  const handleCloseKarungHistoryModal = () => {
    setIsKarungHistoryVisible(false);
    setKarungHistoryData([]);
    setSelectedStok(null);
    setIsHistoryLoading(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto border-b-2 border-blue-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-lg font-medium text-gray-700">Memuat data stok...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="max-w-md mx-auto text-center">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full">
            <XMarkIcon className="w-8 h-8 text-red-600" />
          </div>
          <p className="mb-2 text-lg font-medium text-gray-900">Terjadi Kesalahan</p>
          <p className="mb-4 text-red-600">{error}</p>
          <button onClick={fetchData} className="px-4 py-2 text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700">
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 mx-auto space-y-6 sm:p-6 max-w-7xl">
        {/* 🎨 HERO HEADER */}
        <div className="relative px-6 py-6 overflow-hidden text-white shadow-lg bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600 rounded-2xl">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <FaWarehouse className="w-32 h-32" />
          </div>

          <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 mb-2 text-xs font-medium border rounded-full bg-white/20 backdrop-blur-sm border-white/10">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                Modul Inventaris
              </div>

              <h1 className="text-3xl font-bold tracking-tight">Manajemen Stok Gudang</h1>

              <p className="max-w-lg mt-1 text-sm text-blue-100">
                Kelola dan pantau stok produk dengan mudah. Lihat detail batch dan riwayat aktivitas.
              </p>
            </div>

            <button
              onClick={handleOpenModal}
              className="group flex items-center gap-2 px-5 py-3 bg-white text-blue-600 rounded-xl font-bold shadow-lg hover:shadow-xl hover:bg-blue-50 transition-all transform hover:-translate-y-0.5"
            >
              <PlusIcon className="w-5 h-5 transition-transform duration-300 group-hover:rotate-90" />
              <span>Tambah Stok Manual</span>
            </button>
          </div>
        </div>

        {/* Add Stock Modal */}
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
                  <Dialog.Panel className="w-full max-w-md overflow-hidden transition-all transform bg-white shadow-2xl rounded-3xl ring-1 ring-black/5">
                    <div className="relative px-6 py-5 overflow-hidden bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600">
                      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_50%_120%,white,transparent)]" />
                      <div className="absolute top-0 right-0 w-64 h-64 translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 blur-3xl" />

                      <div className="relative flex items-center gap-4">
                        <div className="p-3 shadow-lg bg-white/20 rounded-2xl backdrop-blur-sm ring-1 ring-white/30">
                          <PlusIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <Dialog.Title className="text-xl font-bold text-white">Tambah Stok Manual</Dialog.Title>
                          <p className="text-blue-100 text-sm mt-0.5">Tambah stok produk sampingan</p>
                        </div>
                      </div>

                      <button
                        onClick={handleCloseModal}
                        className="absolute top-4 right-4 p-2.5 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95"
                      >
                        <XMarkIcon className="w-6 h-6" />
                      </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                      <div>
                        <label className="block mb-2 text-sm font-semibold text-gray-700">Pilih Produk</label>
                        <select
                          value={selectedProdukId}
                          onChange={(e) => setSelectedProdukId(e.target.value)}
                          className="w-full px-4 py-3 text-sm transition-all border-2 border-gray-200 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                          required
                        >
                          <option value="" disabled>
                            -- Pilih Produk Sampingan --
                          </option>
                          {produkManualList.map((produk) => (
                            <option key={produk.id} value={produk.id}>
                              {produk.nama_produk}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block mb-2 text-sm font-semibold text-gray-700">Jumlah Tambahan (Kg)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={jumlahTambah}
                          onChange={(e) => setJumlahTambah(e.target.value)}
                          className="w-full px-4 py-3 text-sm transition-all border-2 border-gray-200 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                          placeholder="Contoh: 50.5"
                          required
                        />
                      </div>

                      <div className="flex gap-3 pt-4">
                        <button
                          type="button"
                          onClick={handleCloseModal}
                          className="flex-1 px-4 py-3 text-sm font-semibold text-gray-700 transition-all bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          className="flex-1 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 py-3 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:from-blue-600 hover:to-indigo-600 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
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

        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
          <SummaryCardButton
            title="Total Gabah"
            value={`${summaryPerKategori.gabah.toLocaleString('id-ID')} Kg`}
            icon={<GiWheat />}
            onClick={() => handleSummaryCardClick('gabah')}
            colorScheme="amber"
          />
          <SummaryCardButton
            title="Total Beras"
            value={`${summaryPerKategori.beras.toLocaleString('id-ID')} Kg`}
            icon={<FaBowlFood />}
            onClick={() => handleSummaryCardClick('beras')}
            colorScheme="emerald"
          />
          <SummaryCardButton
            title="Total Menir"
            value={`${summaryPerKategori.menir.toLocaleString('id-ID')} Kg`}
            icon={<GiStonePile />}
            onClick={() => handleSummaryCardClick('menir')}
            colorScheme="violet"
          />
          <SummaryCardButton
            title="Total Dedak"
            value={`${summaryPerKategori.dedak.toLocaleString('id-ID')} Kg`}
            icon={<GiPowder />}
            onClick={() => handleSummaryCardClick('dedak')}
            colorScheme="cyan"
          />
          <SummaryCardButton
            title="Total Karung"
            value={`${summaryPerKategori.karung.toLocaleString('id-ID')} Pcs`}
            icon={<FaBox />}
            onClick={() => handleSummaryCardClick('karung')}
            colorScheme="blue"
          />
        </div>

        {/* Enhanced Activity Section */}
        <div className="space-y-6">
          <ActivityFilterComponent filter={activityFilter} onFilterChange={handleFilterChange} onReset={handleFilterReset} />

          <div className="overflow-hidden bg-white border border-gray-200 shadow-lg rounded-2xl">
            <div className="px-6 py-6 border-b border-gray-100 bg-gradient-to-r from-slate-50 via-blue-50/50 to-indigo-50/50 lg:px-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 shadow-lg bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-blue-500/20">
                    <ClockIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Riwayat Aktivitas Stok</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Menampilkan <span className="font-semibold text-blue-600">{activityLog.length}</span> aktivitas
                      {activityFilter.tipeProduk || activityFilter.startDate || activityFilter.endDate ? (
                        <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                          Filtered
                        </span>
                      ) : (
                        ''
                      )}
                    </p>
                  </div>
                </div>
                {totalActivityPages > 1 && (
                  <div className="items-center hidden gap-2 text-sm text-gray-500 md:flex">
                    <span>
                      Halaman {activityPage} dari {totalActivityPages}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 lg:p-8">
              {isActivityLoading ? (
                <div className="py-16 text-center">
                  <div className="mx-auto mb-4 border-4 border-blue-200 rounded-full animate-spin h-14 w-14 border-t-blue-600"></div>
                  <p className="text-lg font-semibold text-gray-700">Memuat aktivitas...</p>
                  <p className="mt-1 text-sm text-gray-500">Mohon tunggu sebentar</p>
                </div>
              ) : activityLog.length > 0 ? (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block">
                    <div className="overflow-hidden bg-white border border-gray-200 shadow-sm rounded-xl">
                      <table className="min-w-full">
                        <thead className="bg-gradient-to-r from-gray-50 to-slate-50">
                          <tr>
                            <th className="px-6 py-4 text-xs font-bold tracking-wider text-left text-gray-600 uppercase">Tanggal</th>
                            <th className="px-6 py-4 text-xs font-bold tracking-wider text-left text-gray-600 uppercase">Produk</th>
                            <th className="px-6 py-4 text-xs font-bold tracking-wider text-right text-gray-600 uppercase">Jumlah</th>
                            <th className="px-6 py-4 text-xs font-bold tracking-wider text-left text-gray-600 uppercase">Deskripsi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {activityLog.map((log, index) => (
                            <tr
                              key={log.id}
                              className="transition-colors hover:bg-blue-50/50"
                              style={{ animationDelay: `${index * 30}ms` }}
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                      log.tipe_log === 'MASUK'
                                        ? 'bg-gradient-to-br from-emerald-100 to-green-100'
                                        : 'bg-gradient-to-br from-rose-100 to-red-100'
                                    }`}
                                  >
                                    {log.tipe_log === 'MASUK' ? (
                                      <ArrowDownTrayIcon className="w-5 h-5 text-emerald-600" />
                                    ) : (
                                      <ArrowUpTrayIcon className="w-5 h-5 text-rose-600" />
                                    )}
                                  </div>
                                  <div>
                                    <div className="text-sm font-semibold text-gray-900">
                                      {new Date(log.timestamp).toLocaleDateString('id-ID', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric',
                                      })}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {new Date(log.timestamp).toLocaleTimeString('id-ID', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div>
                                  <div className="text-sm font-semibold text-gray-900">{log.produk?.nama_produk || 'Produk tidak diketahui'}</div>
                                  <span
                                    className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium mt-1 ${
                                      log.produk?.tipe_produk === 'BAHAN_MENTAH'
                                        ? 'bg-amber-100 text-amber-700'
                                        : log.produk?.tipe_produk === 'PRODUK_JADI'
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : log.produk?.tipe_produk === 'PRODUK_SAMPINGAN'
                                        ? 'bg-violet-100 text-violet-700'
                                        : 'bg-blue-100 text-blue-700'
                                    }`}
                                  >
                                    {log.produk?.tipe_produk?.replace('_', ' ') || 'Tipe tidak diketahui'}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right whitespace-nowrap">
                                <span
                                  className={`text-lg font-extrabold tabular-nums ${
                                    log.tipe_log === 'MASUK' ? 'text-emerald-600' : 'text-rose-600'
                                  }`}
                                >
                                  {log.tipe_log === 'MASUK' ? '+' : ''}
                                  {Math.abs(log.jumlah_kg).toLocaleString('id-ID')}
                                </span>
                                <span className="ml-1 text-sm text-gray-500">Kg</span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="max-w-xs text-sm text-gray-600 truncate">{log.deskripsi}</div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Mobile Cards */}
                  <div className="space-y-3 md:hidden">
                    {activityLog.map((log, index) => (
                      <div
                        key={log.id}
                        className={`rounded-2xl border-2 p-4 transition-all hover:shadow-md ${
                          log.tipe_log === 'MASUK'
                            ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200'
                            : 'bg-gradient-to-br from-rose-50 to-red-50 border-rose-200'
                        }`}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`p-2.5 rounded-xl flex-shrink-0 shadow-sm ${
                              log.tipe_log === 'MASUK'
                                ? 'bg-gradient-to-br from-emerald-500 to-green-500'
                                : 'bg-gradient-to-br from-rose-500 to-red-500'
                            }`}
                          >
                            {log.tipe_log === 'MASUK' ? (
                              <ArrowDownTrayIcon className="w-5 h-5 text-white" />
                            ) : (
                              <ArrowUpTrayIcon className="w-5 h-5 text-white" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="min-w-0">
                                <p className="font-bold text-gray-900 truncate">{log.produk?.nama_produk || 'Produk tidak diketahui'}</p>
                                <p
                                  className={`text-xs font-medium mt-0.5 ${
                                    log.tipe_log === 'MASUK' ? 'text-emerald-600' : 'text-rose-600'
                                  }`}
                                >
                                  {log.produk?.tipe_produk?.replace('_', ' ')}
                                </p>
                                <p className="mt-1 text-sm text-gray-600 line-clamp-2">{log.deskripsi}</p>
                              </div>
                              <div className="flex-shrink-0 ml-3 text-right">
                                <p
                                  className={`font-extrabold text-lg tabular-nums ${
                                    log.tipe_log === 'MASUK' ? 'text-emerald-600' : 'text-rose-600'
                                  }`}
                                >
                                  {log.tipe_log === 'MASUK' ? '+' : ''}
                                  {Math.abs(log.jumlah_kg).toLocaleString('id-ID')} Kg
                                </p>
                                <p className="mt-1 text-xs text-gray-500">
                                  {new Date(log.timestamp).toLocaleString('id-ID', {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {totalActivityPages > 1 && (
                    <div className="mt-6">
                      <Pagination
                        currentPage={activityPage}
                        totalPages={totalActivityPages}
                        onPageChange={handleActivityPageChange}
                        showItemsInfo={true}
                        totalItems={activityLog.length * totalActivityPages}
                        itemsPerPage={ACTIVITY_ITEMS_PER_PAGE}
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="py-12 text-center">
                  <div className="flex items-center justify-center w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full">
                    <ClockIcon className="w-12 h-12 text-gray-400" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-gray-900">Tidak ada aktivitas</h3>
                  <p className="mb-6 text-gray-600">
                    {activityFilter.tipeProduk || activityFilter.startDate || activityFilter.endDate
                      ? 'Tidak ada aktivitas yang sesuai dengan filter yang dipilih.'
                      : 'Aktivitas stok akan muncul di sini setelah ada transaksi.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Detail Modal */}
        <StokDetailModal
          isOpen={isDetailModalVisible}
          onClose={() => setIsDetailModalVisible(false)}
          title={`Rincian Stok ${activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)}`}
          items={filteredStokList}
          onViewHistory={handleViewHistory}
          onViewKarungHistory={handleViewKarungHistory}
          onViewPembelianHistory={handleViewPembelianHistory}
        />

        {/* ✅ Nested Modal: Histori Stok (GABAH/BERAS/MENIR/DEDAK) - sekarang sama persis kayak Karung */}
        <NestedModalShell
          isOpen={isHistoryVisible}
          onClose={handleCloseHistoryModal}
          icon={<ClockIcon className="w-6 h-6 text-white" />}
          title="Histori Stok"
          subtitle={selectedStok?.produk?.nama_produk}
          headerGradientClass="from-cyan-500 via-blue-500 to-indigo-500"
        >
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {isHistoryLoading ? (
              <div className="py-16 text-center">
                <div className="mx-auto mb-4 border-4 rounded-full animate-spin h-14 w-14 border-cyan-200 border-t-cyan-600"></div>
                <p className="text-lg font-semibold text-gray-700">Memuat histori...</p>
                <p className="mt-1 text-sm text-gray-500">Mohon tunggu sebentar</p>
              </div>
            ) : historyData.length > 0 ? (
              <div className="overflow-hidden bg-white border border-gray-200 shadow-sm rounded-2xl">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-slate-50">
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold tracking-wider text-left text-gray-600 uppercase">Tanggal & Waktu</th>
                        <th className="px-6 py-4 text-xs font-bold tracking-wider text-right text-gray-600 uppercase">Jumlah</th>
                        <th className="px-6 py-4 text-xs font-bold tracking-wider text-left text-gray-600 uppercase">Deskripsi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {historyData.map((log, index) => (
                        <tr key={log.id} className="transition-colors hover:bg-cyan-50/50" style={{ animationDelay: `${index * 30}ms` }}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-100 to-blue-100">
                                <ClockIcon className="w-5 h-5 text-cyan-600" />
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-gray-900">
                                  {new Date(log.timestamp).toLocaleDateString('id-ID', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {new Date(log.timestamp).toLocaleTimeString('id-ID', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <span className={`text-lg font-extrabold tabular-nums ${log.jumlah_kg >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {log.jumlah_kg >= 0 ? '+' : ''}
                              {Math.abs(log.jumlah_kg).toLocaleString('id-ID')}
                            </span>
                            <span className="ml-1 text-sm text-gray-500">Kg</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-700">{log.deskripsi}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center">
                <div className="flex items-center justify-center w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-cyan-100 to-blue-100">
                  <ClockIcon className="w-10 h-10 text-cyan-300" />
                </div>
                <p className="mb-2 text-lg font-bold text-gray-900">Tidak ada histori</p>
                <p className="text-gray-500">Belum ada histori untuk produk ini.</p>
              </div>
            )}
          </div>

          <div className="flex justify-end px-6 py-4 border-t border-gray-100 bg-gradient-to-r from-gray-50 to-slate-50">
            <button
              type="button"
              onClick={handleCloseHistoryModal}
              className="rounded-xl border-2 border-gray-200 bg-white py-2.5 px-6 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all"
            >
              Tutup
            </button>
          </div>
        </NestedModalShell>

        {/* ✅ Nested Modal: Riwayat Batch Pembelian - sekarang sama persis kayak Karung */}
        <NestedModalShell
          isOpen={isPembelianHistoryVisible}
          onClose={handleClosePembelianHistoryModal}
          icon={<EyeIcon className="w-6 h-6 text-white" />}
          title="Riwayat Batch Pembelian"
          subtitle={selectedStok?.produk?.nama_produk}
          headerGradientClass="from-cyan-500 via-blue-500 to-indigo-500"
        >
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {isHistoryLoading ? (
              <div className="py-16 text-center">
                <div className="mx-auto mb-4 border-4 rounded-full animate-spin h-14 w-14 border-cyan-200 border-t-cyan-600"></div>
                <p className="text-lg font-semibold text-gray-700">Memuat histori...</p>
                <p className="mt-1 text-sm text-gray-500">Mohon tunggu sebentar</p>
              </div>
            ) : logPembelianData.length > 0 ? (
              <div className="overflow-hidden bg-white border border-gray-200 shadow-sm rounded-2xl">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-slate-50">
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold tracking-wider text-left text-gray-600 uppercase">Tanggal & Waktu</th>
                        <th className="px-6 py-4 text-xs font-bold tracking-wider text-left text-gray-600 uppercase">Tipe</th>
                        <th className="px-6 py-4 text-xs font-bold tracking-wider text-right text-gray-600 uppercase">Jumlah</th>
                        <th className="px-6 py-4 text-xs font-bold tracking-wider text-left text-gray-600 uppercase">Deskripsi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {logPembelianData.map((log, index) => (
                        <tr key={log.id} className="transition-colors hover:bg-cyan-50/50" style={{ animationDelay: `${index * 30}ms` }}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-100 to-blue-100">
                                <ClockIcon className="w-5 h-5 text-cyan-600" />
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-gray-900">
                                  {new Date(log.timestamp).toLocaleDateString('id-ID', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${
                                log.tipe_log.includes('MASUK') ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {log.tipe_log.replace('_', ' ')}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <span className={`text-lg font-extrabold tabular-nums ${log.jumlah_kg >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {log.jumlah_kg >= 0 ? '+' : ''}
                              {Math.abs(log.jumlah_kg).toLocaleString('id-ID')}
                            </span>
                            <span className="ml-1 text-sm text-gray-500">Kg</span>
                          </td>

                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-700">{log.deskripsi}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center">
                <div className="flex items-center justify-center w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-cyan-100 to-blue-100">
                  <EyeIcon className="w-10 h-10 text-cyan-300" />
                </div>
                <p className="mb-2 text-lg font-bold text-gray-900">Tidak ada histori</p>
                <p className="text-gray-500">Belum ada histori untuk batch pembelian ini.</p>
              </div>
            )}
          </div>

          <div className="flex justify-end px-6 py-4 border-t border-gray-100 bg-gradient-to-r from-gray-50 to-slate-50">
            <button
              type="button"
              onClick={handleClosePembelianHistoryModal}
              className="rounded-xl border-2 border-gray-200 bg-white py-2.5 px-6 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all"
            >
              Tutup
            </button>
          </div>
        </NestedModalShell>

        {/* ✅ Nested Modal: Karung History (udah bagus) - sekarang juga lewat shell yang sama */}
        <NestedModalShell
          isOpen={isKarungHistoryVisible}
          onClose={handleCloseKarungHistoryModal}
          icon={<TruckIcon className="w-6 h-6 text-white" />}
          title="Histori Penggunaan"
          subtitle={selectedStok?.produk?.nama_produk}
          headerGradientClass="from-cyan-500 via-blue-500 to-indigo-500"
        >
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {isHistoryLoading ? (
              <div className="py-16 text-center">
                <div className="mx-auto mb-4 border-4 rounded-full animate-spin h-14 w-14 border-cyan-200 border-t-cyan-600"></div>
                <p className="text-lg font-semibold text-gray-700">Memuat histori...</p>
                <p className="mt-1 text-sm text-gray-500">Mohon tunggu sebentar</p>
              </div>
            ) : karungHistoryData.length > 0 ? (
              <div className="overflow-hidden bg-white border border-gray-200 shadow-sm rounded-2xl">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-slate-50">
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold tracking-wider text-left text-gray-600 uppercase">Tanggal & Waktu</th>
                        <th className="px-6 py-4 text-xs font-bold tracking-wider text-left text-gray-600 uppercase">Deskripsi</th>
                        <th className="px-6 py-4 text-xs font-bold tracking-wider text-right text-gray-600 uppercase">Jumlah Digunakan</th>
                        <th className="px-6 py-4 text-xs font-bold tracking-wider text-right text-gray-600 uppercase">Sisa Setelah</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {karungHistoryData.map((log, index) => (
                        <tr key={log.id} className="transition-colors hover:bg-cyan-50/50" style={{ animationDelay: `${index * 30}ms` }}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-100 to-blue-100">
                                <ClockIcon className="w-5 h-5 text-cyan-600" />
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-gray-900">
                                  {new Date(log.timestamp).toLocaleDateString('id-ID', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {new Date(log.timestamp).toLocaleTimeString('id-ID', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-700">{log.deskripsi}</span>
                          </td>
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <span className="text-lg font-extrabold text-rose-600 tabular-nums">
                              -{log.jumlah_digunakan.toLocaleString('id-ID')} Pcs
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <span className="text-lg font-bold text-gray-900 tabular-nums">
                              {log.sisa_setelah.toLocaleString('id-ID')} Pcs
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center">
                <div className="flex items-center justify-center w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-cyan-100 to-blue-100">
                  <TruckIcon className="w-10 h-10 text-cyan-300" />
                </div>
                <p className="mb-2 text-lg font-bold text-gray-900">Tidak ada histori penggunaan</p>
                <p className="text-gray-500">Belum ada histori penggunaan untuk batch karung ini.</p>
              </div>
            )}
          </div>

          <div className="flex justify-end px-6 py-4 border-t border-gray-100 bg-gradient-to-r from-gray-50 to-slate-50">
            <button
              type="button"
              onClick={handleCloseKarungHistoryModal}
              className="rounded-xl border-2 border-gray-200 bg-white py-2.5 px-6 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all"
            >
              Tutup
            </button>
          </div>
        </NestedModalShell>
      </div>
    </div>
  );
};

export default StokProdukPage;
