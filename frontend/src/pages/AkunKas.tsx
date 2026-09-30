// src/pages/AkunKas.tsx
import React, {
    useState,
    useEffect,
    useCallback,
    Fragment,
    useMemo,
    useRef,
} from 'react';
import * as api from '../services/api';
import { AkunKas, TransaksiKas } from '../types';
import { Dialog, Transition, Switch } from '@headlessui/react';
import Pagination from '../components/Pagination';



import {
    XMarkIcon,
    ExclamationTriangleIcon,
    ClockIcon,
    MagnifyingGlassIcon,
    CurrencyDollarIcon,
    ArrowDownTrayIcon,
    ArrowUpTrayIcon,
    PlusIcon,
    MinusIcon,
    PencilSquareIcon,
    TrashIcon,
    BuildingLibraryIcon,
    WalletIcon,
    ChartBarIcon,
    ArrowTrendingUpIcon,
    CalendarDaysIcon,
    FunnelIcon,
    ArrowPathIcon,
    BanknotesIcon,
    DocumentTextIcon,
    ChevronDownIcon,
} from '@heroicons/react/24/solid';

type ToastType = 'success' | 'error' | 'info';
const showToast = (message: string, type: ToastType = 'success') => {
    (window as any).addToast?.(message, type);
};

const formatRupiah = (angka: number) =>
    `Rp ${Math.round(angka).toLocaleString('id-ID')}`;

const fmtDT = (d: string | Date) =>
    new Date(d).toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

const fmtDate = (d: string | Date) =>
    new Date(d).toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });

const fmtTime = (d: string | Date) =>
    new Date(d).toLocaleString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
    });

const classNames = (...xs: Array<string | false | undefined | null>) =>
    xs.filter(Boolean).join(' ');
type Period =
    | 'hari_ini'
    | 'minggu_ini'
    | 'bulan_ini'
    | 'custom';

const PeriodPills = ({
                         value,
                         onChange,
                     }: {
    value: Period;
    onChange: (v: Period) => void;
}) => {
    const items: Array<{ id: Period; label: string }> = [
        { id: 'hari_ini', label: 'Hari Ini' },
        { id: 'minggu_ini', label: 'Minggu Ini' },
        { id: 'bulan_ini', label: 'Bulan Ini' },
        { id: 'custom', label: 'Kustom' },
    ];

    return (
        <div className="inline-flex flex-wrap gap-2">
            {items.map((it) => {
                const active = value === it.id;
                return (
                    <button
                        key={it.id}
                        type="button"
                        onClick={() => onChange(it.id)}
                        className={classNames(
                            'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-all',
                            active
                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                : 'bg-white text-gray-700 border-gray-200 hover:bg-blue-50 hover:border-blue-200'
                        )}
                    >
                        {it.label}
                    </button>
                );
            })}
        </div>
    );
};

const TypePills = ({
                       value,
                       onChange,
                   }: {
    value: 'ALL' | 'KAS_TUNAI' | 'BANK';
    onChange: (v: 'ALL' | 'KAS_TUNAI' | 'BANK') => void;
}) => {
    const items: Array<{
        id: 'ALL' | 'KAS_TUNAI' | 'BANK';
        label: string;
        icon: React.ReactNode;
    }> = [
        { id: 'ALL', label: 'Semua', icon: <CurrencyDollarIcon className="w-4 h-4" /> },
        { id: 'KAS_TUNAI', label: 'Kas', icon: <WalletIcon className="w-4 h-4" /> },
        { id: 'BANK', label: 'Bank', icon: <BuildingLibraryIcon className="w-4 h-4" /> },
    ];

    return (
        <div className="inline-flex flex-wrap gap-2">
            {items.map((it) => {
                const active = value === it.id;
                return (
                    <button
                        key={it.id}
                        type="button"
                        onClick={() => onChange(it.id)}
                        className={classNames(
                            'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-all',
                            active
                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                : 'bg-white text-gray-700 border-gray-200 hover:bg-blue-50 hover:border-blue-200'
                        )}
                    >
                        {it.icon}
                        {it.label}
                    </button>
                );
            })}
        </div>
    );
};

const dateKey = (d: string | Date) => {
    const dt = new Date(d);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const addDays = (d: Date, n: number) => {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
};

const daysBetweenInclusive = (fromISO: string, toISO: string) => {
    const a = new Date(fromISO);
    const b = new Date(toISO);
    a.setHours(0, 0, 0, 0);
    b.setHours(0, 0, 0, 0);
    const res: string[] = [];
    if (a > b) return res;
    for (let cur = new Date(a); cur <= b; cur = addDays(cur, 1)) {
        res.push(dateKey(cur));
    }
    return res;
};

const getRangeFromPeriod = (
    period: Period,
    startDate: string,
    endDate: string
) => {
    const today = new Date();
    const to = today.toISOString().split('T')[0];
    let from = '';
    let toUse = to;

    if (period === 'hari_ini') {
        from = to;
    } else if (period === 'minggu_ini') {
        const d = new Date(today);
        d.setDate(d.getDate() - 7);
        from = d.toISOString().split('T')[0];
    } else if (period === 'bulan_ini') {
        const d = new Date(today);
        d.setDate(d.getDate() - 30);
        from = d.toISOString().split('T')[0];
    } else {
        from = startDate;
        toUse = endDate;
    }

    return { from, to: toUse };
};

// ---------- Simple SVG Line Chart (Enhanced with Gradient) ----------
const MiniLineChart = ({
                           points,
                           height = 120,
                       }: {
    points: number[];
    height?: number;
}) => {
    const width = 600;
    const pad = 10;

    const safe = points.length ? points : [0];
    const minV = Math.min(...safe);
    const maxV = Math.max(...safe);
    const span = maxV - minV || 1;

    const n = safe.length;
    const stepX = n > 1 ? (width - pad * 2) / (n - 1) : 0;

    const coords = safe.map((v, i) => {
        const x = pad + i * stepX;
        const y = pad + (height - pad * 2) * (1 - (v - minV) / span);
        return { x, y };
    });

    const d = coords
        .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(2)} ${c.y.toFixed(2)}`)
        .join(' ');

    const areaD = `${d} L ${coords[coords.length - 1].x.toFixed(2)} ${(height - pad).toFixed(
        2
    )} L ${coords[0].x.toFixed(2)} ${(height - pad).toFixed(2)} Z`;

    return (
        <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto"
            role="img"
            aria-label="Grafik tren saldo"
        >
            <defs>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#8B5CF6" />
                </linearGradient>
                <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.05" />
                </linearGradient>
            </defs>
            
            <g opacity="0.35">
                {[0.2, 0.4, 0.6, 0.8].map((t) => (
                    <line
                        key={t}
                        x1={pad}
                        x2={width - pad}
                        y1={pad + (height - pad * 2) * t}
                        y2={pad + (height - pad * 2) * t}
                        stroke="currentColor"
                        className="text-slate-200"
                        strokeWidth="1"
                    />
                ))}
            </g>

            <path d={areaD} fill="url(#areaGradient)" />
            <path
                d={d}
                fill="none"
                stroke="url(#lineGradient)"
                strokeWidth="3"
                strokeLinejoin="round"
                strokeLinecap="round"
            />

            {coords.length > 0 && (
                <>
                    <circle
                        cx={coords[coords.length - 1].x}
                        cy={coords[coords.length - 1].y}
                        r="8"
                        fill="white"
                        stroke="url(#lineGradient)"
                        strokeWidth="3"
                    />
                    <circle
                        cx={coords[coords.length - 1].x}
                        cy={coords[coords.length - 1].y}
                        r="4"
                        fill="#8B5CF6"
                    />
                </>
            )}
        </svg>
    );
};
// ---------- Fetch all transaksi in range (paginate) ----------
const fetchAllTransaksiRange = async (
    akunId: number,
    filters: api.TransaksiKasFilters,
    perPage = 200,
    maxPages = 20
): Promise<TransaksiKas[]> => {
    const all: TransaksiKas[] = [];
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages && page <= maxPages) {
        const res = await api.getAkunKasHistory(akunId, page, perPage, filters);
        all.push(...(res.data || []));
        totalPages = res.pagination?.total_pages || 1;
        page += 1;
    }

    return all;
};

// ----------------------
// MODAL: TRANSAKSI KAS MANUAL
// ----------------------
const TransaksiKasModal = ({
                               isOpen,
                               onClose,
                               akunList,
                               onSuccess,
                               initialAkunId,
                               initialArah,
                           }: {
    isOpen: boolean;
    onClose: () => void;
    akunList: AkunKas[];
    onSuccess: () => void;
    initialAkunId?: number | null;
    initialArah?: 'IN' | 'OUT' | null;
}) => {
    const [akunKasId, setAkunKasId] = useState('');
    const [arah, setArah] = useState<'IN' | 'OUT'>('IN');
    const [jumlah, setJumlah] = useState('');
    const [memo, setMemo] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        const presetAkunId =
            typeof initialAkunId === 'number'
                ? String(initialAkunId)
                : akunList[0]?.id?.toString() || '';
        setAkunKasId(presetAkunId);

        if (initialArah === 'IN' || initialArah === 'OUT') setArah(initialArah);
        else setArah('IN');

        setJumlah('');
        setMemo('');
        setIsSubmitting(false);
    }, [isOpen, akunList, initialAkunId, initialArah]);

    const selectedAkun = useMemo(() => {
        const id = parseInt(akunKasId || '0', 10);
        return akunList.find((a) => a.id === id) || null;
    }, [akunKasId, akunList]);

    const amountNumber = useMemo(() => {
        const n = parseFloat(jumlah || '0');
        return Number.isFinite(n) ? n : 0;
    }, [jumlah]);

    const saldoAfter = useMemo(() => {
        if (!selectedAkun) return 0;
        return arah === 'IN'
            ? selectedAkun.saldo + amountNumber
            : selectedAkun.saldo - amountNumber;
    }, [selectedAkun, arah, amountNumber]);

    const canSubmit = useMemo(() => {
        if (!akunKasId) return false;
        if (!memo.trim()) return false;
        if (amountNumber <= 0) return false;
        return true;
    }, [akunKasId, memo, amountNumber]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;

        setIsSubmitting(true);
        try {
            const payload: api.InputTransaksiKasManual = {
                akun_kas_id: parseInt(akunKasId, 10),
                arah,
                jumlah: amountNumber,
                memo: memo.trim(),
            };
            await api.createTransaksiKasManual(payload);
            showToast('Transaksi kas berhasil dicatat!', 'success');
            onSuccess();
            onClose();
        } catch (err: any) {
            showToast(err.message || 'Gagal menyimpan transaksi.', 'error');
        } finally {
            setIsSubmitting(false);
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
                                {/* Header */}
                                <div className="relative px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600">
                                    <Dialog.Title className="flex items-center gap-3 text-xl font-bold text-white">
                                        <div className="p-2 bg-white/20 rounded-xl">
                                            <CurrencyDollarIcon className="w-5 h-5" />
                                        </div>
                                        Catat Transaksi Kas Manual
                                    </Dialog.Title>
                                    <p className="mt-1 text-xs text-blue-100">
                                        Catat penerimaan/pengeluaran untuk memperbarui saldo akun.
                                    </p>

                                    <button
                                        onClick={onClose}
                                        className="absolute p-2 transition-colors rounded-lg top-4 right-4 text-white/80 hover:text-white hover:bg-white/20"
                                    >
                                        <XMarkIcon className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Body */}
                                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                                    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-5">
                                        {/* Left */}
                                        <div className="space-y-4">
                                            {/* Arah */}
                                            <div className="p-4 border bg-slate-50 border-slate-200 rounded-2xl">
                                                <p className="mb-2 text-sm font-semibold text-gray-900">
                                                    Arah Transaksi
                                                </p>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => setArah('IN')}
                                                        className={classNames(
                                                            'rounded-2xl border p-4 transition-all text-left',
                                                            arah === 'IN'
                                                                ? 'border-emerald-300 bg-emerald-50 shadow-sm'
                                                                : 'border-gray-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/30'
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div
                                                                className={classNames(
                                                                    'w-10 h-10 rounded-xl flex items-center justify-center',
                                                                    arah === 'IN'
                                                                        ? 'bg-emerald-600'
                                                                        : 'bg-gray-100'
                                                                )}
                                                            >
                                                                <ArrowDownTrayIcon
                                                                    className={classNames(
                                                                        'w-5 h-5',
                                                                        arah === 'IN' ? 'text-white' : 'text-gray-500'
                                                                    )}
                                                                />
                                                            </div>
                                                            <div>
                                                                <p
                                                                    className={classNames(
                                                                        'text-sm font-bold',
                                                                        arah === 'IN'
                                                                            ? 'text-emerald-700'
                                                                            : 'text-gray-700'
                                                                    )}
                                                                >
                                                                    Uang Masuk
                                                                </p>
                                                                <p className="text-[11px] text-gray-500">
                                                                    Setoran / Penerimaan
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => setArah('OUT')}
                                                        className={classNames(
                                                            'rounded-2xl border p-4 transition-all text-left',
                                                            arah === 'OUT'
                                                                ? 'border-rose-300 bg-rose-50 shadow-sm'
                                                                : 'border-gray-200 bg-white hover:border-rose-200 hover:bg-rose-50/30'
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div
                                                                className={classNames(
                                                                    'w-10 h-10 rounded-xl flex items-center justify-center',
                                                                    arah === 'OUT'
                                                                        ? 'bg-rose-600'
                                                                        : 'bg-gray-100'
                                                                )}
                                                            >
                                                                <ArrowUpTrayIcon
                                                                    className={classNames(
                                                                        'w-5 h-5',
                                                                        arah === 'OUT' ? 'text-white' : 'text-gray-500'
                                                                    )}
                                                                />
                                                            </div>
                                                            <div>
                                                                <p
                                                                    className={classNames(
                                                                        'text-sm font-bold',
                                                                        arah === 'OUT'
                                                                            ? 'text-rose-700'
                                                                            : 'text-gray-700'
                                                                    )}
                                                                >
                                                                    Uang Keluar
                                                                </p>
                                                                <p className="text-[11px] text-gray-500">
                                                                    Penarikan / Pengeluaran
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Akun */}
                                            <div className="p-4 border bg-slate-50 border-slate-200 rounded-2xl">
                                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                    Pilih Akun
                                                </label>
                                                <select
                                                    value={akunKasId}
                                                    onChange={(e) => setAkunKasId(e.target.value)}
                                                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
                                                    required
                                                >
                                                    {akunList.map((akun) => (
                                                        <option key={akun.id} value={akun.id}>
                                                            {akun.nama_akun} — {formatRupiah(akun.saldo)}
                                                        </option>
                                                    ))}
                                                </select>
                                                <p className="mt-1 text-[11px] text-gray-500">
                                                    Pilih akun tujuan agar saldo ter-update otomatis.
                                                </p>
                                            </div>

                                            {/* Jumlah */}
                                            <div className="p-4 border bg-slate-50 border-slate-200 rounded-2xl">
                                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                    Jumlah (Rp)
                                                </label>
                                                <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-xs font-semibold text-gray-500">
                            Rp
                          </span>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        value={jumlah}
                                                        onChange={(e) => setJumlah(e.target.value)}
                                                        className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white tabular-nums"
                                                        placeholder="0"
                                                        required
                                                    />
                                                </div>
                                                <p className="mt-1 text-[11px] text-gray-500">
                                                    Gunakan angka tanpa titik/koma (contoh: 50000).
                                                </p>
                                            </div>

                                            {/* Memo */}
                                            <div className="p-4 border bg-slate-50 border-slate-200 rounded-2xl">
                                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                    Keterangan / Memo
                                                </label>
                                                <textarea
                                                    rows={3}
                                                    value={memo}
                                                    onChange={(e) => setMemo(e.target.value)}
                                                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white resize-none"
                                                    placeholder="Contoh: Setoran modal / bayar listrik / dll"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        {/* Right: Summary */}
                                        <div className="space-y-4">
                                            <div className="p-4 bg-white border border-blue-100 shadow-sm rounded-2xl">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div>
                                                        <p className="text-sm font-semibold text-blue-900">
                                                            Ringkasan
                                                        </p>
                                                        <p className="text-[11px] text-blue-700">
                                                            Update otomatis saat kamu mengisi.
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-50">
                                                        <CurrencyDollarIcon className="w-5 h-5 text-blue-600" />
                                                    </div>
                                                </div>

                                                <div className="space-y-2 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">Akun</span>
                                                        <span className="font-semibold text-right text-gray-900">
                              {selectedAkun?.nama_akun || '-'}
                            </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">Saldo Sekarang</span>
                                                        <span className="font-semibold tabular-nums">
                              {formatRupiah(selectedAkun?.saldo || 0)}
                            </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">Transaksi</span>
                                                        <span
                                                            className={classNames(
                                                                'font-semibold tabular-nums',
                                                                arah === 'IN'
                                                                    ? 'text-emerald-700'
                                                                    : 'text-rose-700'
                                                            )}
                                                        >
                              {arah === 'IN' ? '+' : '-'}{' '}
                                                            {formatRupiah(amountNumber)}
                            </span>
                                                    </div>

                                                    <hr className="my-2" />

                                                    <div className="flex items-baseline justify-between">
                            <span className="text-xs font-semibold text-gray-500">
                              Saldo Setelah
                            </span>
                                                        <span
                                                            className={classNames(
                                                                'text-xl font-extrabold tabular-nums',
                                                                saldoAfter >= 0
                                                                    ? 'text-blue-700'
                                                                    : 'text-rose-700'
                                                            )}
                                                        >
                              {formatRupiah(saldoAfter)}
                            </span>
                                                    </div>

                                                    {saldoAfter < 0 && (
                                                        <div className="mt-3 text-[11px] bg-rose-50 border border-rose-200 rounded-xl p-3 text-rose-800">
                                                            Saldo setelah transaksi menjadi negatif. Pastikan
                                                            ini memang diperbolehkan.
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-[11px] text-gray-600">
                                                <p className="mb-1 font-semibold text-gray-800">
                                                    Tips cepat:
                                                </p>
                                                <ul className="space-y-1 list-disc list-inside">
                                                    <li>Memo spesifik bikin audit gampang.</li>
                                                    <li>Konsisten penamaan memo untuk transaksi rutin.</li>
                                                    <li>Pilih akun sesuai tujuan biar laporan rapi.</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div className="flex flex-col justify-end gap-3 pt-1 sm:flex-row">
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="rounded-xl border border-gray-300 bg-white py-2.5 px-6 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                        >
                                            Batal
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={!canSubmit || isSubmitting}
                                            className={classNames(
                                                'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-2.5 px-6 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all',
                                                'hover:from-blue-700 hover:to-indigo-700',
                                                (!canSubmit || isSubmitting) &&
                                                'opacity-50 cursor-not-allowed'
                                            )}
                                        >
                                            {isSubmitting && (
                                                <div className="w-4 h-4 border-b-2 border-white rounded-full animate-spin" />
                                            )}
                                            Simpan Transaksi
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
// ----------------------
// MODAL: RIWAYAT TRANSAKSI + FILTER (ENHANCED)
// ----------------------
const HistoryModal = ({
                          isOpen,
                          onClose,
                          akun,
                          onSuccess,
                      }: {
    isOpen: boolean;
    onClose: () => void;
    akun: AkunKas | null;
    onSuccess: () => void;
}) => {
    const [historyData, setHistoryData] = useState<TransaksiKas[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    const [jenisTransaksi, setJenisTransaksi] = useState<'IN' | 'OUT' | ''>('');
    const [search, setSearch] = useState('');

    const [periodeFilter, setPeriodeFilter] = useState<Period>('bulan_ini');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    
    // Summary insight state - collapsible
    const [showInsightSummary, setShowInsightSummary] = useState(true);
    
    // Expanded transaction details
    const [expandedTx, setExpandedTx] = useState<number | null>(null);

    const getDateRange = useCallback(() => {
        const r = getRangeFromPeriod(periodeFilter, startDate, endDate);
        return r;
    }, [periodeFilter, startDate, endDate]);

    const fetchHistory = useCallback(
        async (page: number) => {
            if (!akun) return;
            setIsLoading(true);

            try {
                const dateRange = getDateRange();
                const filters: api.TransaksiKasFilters = {};

                if (dateRange.from) filters.dateFrom = dateRange.from;
                if (dateRange.to) filters.dateTo = dateRange.to;
                if (jenisTransaksi) filters.arah = jenisTransaksi;
                if (search.trim()) filters.search = search.trim();

                const res = await api.getAkunKasHistory(akun.id, page, 10, filters);

                setHistoryData(res.data || []);
                setTotalPages(res.pagination?.total_pages || 1);
                setCurrentPage(res.pagination?.current_page || 1);
                setTotalItems(res.pagination?.total_items || 0);
            } catch (err: any) {
                showToast(err.message || 'Gagal memuat riwayat', 'error');
            } finally {
                setIsLoading(false);
            }
        },
        [akun, getDateRange, jenisTransaksi, search]
    );

    useEffect(() => {
        if (!isOpen) return;

        const today = new Date().toISOString().split('T')[0];
        const d = new Date();
        d.setDate(d.getDate() - 30);
        setStartDate(d.toISOString().split('T')[0]);
        setEndDate(today);

        setPeriodeFilter('bulan_ini');
        setJenisTransaksi('');
        setSearch('');
        setCurrentPage(1);
        setExpandedTx(null);
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && akun) fetchHistory(1);
    }, [
        isOpen,
        akun,
        jenisTransaksi,
        search,
        periodeFilter,
        startDate,
        endDate,
        fetchHistory,
    ]);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        fetchHistory(page);
    };

    const pageSum = useMemo(() => {
        return (historyData || []).reduce(
            (acc, tx) => {
                if (tx.arah === 'IN') acc.in += tx.jumlah;
                else acc.out += tx.jumlah;
                return acc;
            },
            { in: 0, out: 0 }
        );
    }, [historyData]);

    const handleReset = () => {
        const today = new Date().toISOString().split('T')[0];
        const d = new Date();
        d.setDate(d.getDate() - 30);

        setPeriodeFilter('bulan_ini');
        setStartDate(d.toISOString().split('T')[0]);
        setEndDate(today);
        setJenisTransaksi('');
        setSearch('');
        setCurrentPage(1);
    };
    
    const toggleExpanded = (id: number) => {
        setExpandedTx(expandedTx === id ? null : id);
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
                    <div className="fixed inset-0 bg-gradient-to-br from-slate-900/80 via-blue-900/60 to-indigo-900/80 backdrop-blur-md" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-full p-2 sm:p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-400"
                            enterFrom="opacity-0 scale-95 translate-y-4"
                            enterTo="opacity-100 scale-100 translate-y-0"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100 translate-y-0"
                            leaveTo="opacity-0 scale-95 translate-y-4"
                        >
                            <Dialog.Panel className="flex flex-col w-full h-[95vh] sm:h-[90vh] max-w-3xl overflow-hidden transition-all transform bg-slate-50 shadow-2xl rounded-2xl ring-1 ring-white/20">
                                
                                {/* 1. PREMIUM HEADER */}
                                <div className="relative flex-none px-6 py-5 overflow-hidden bg-gradient-to-r from-blue-700 via-indigo-800 to-purple-900 border-b border-white/10">
                                    {/* Decorative glowing orbs */}
                                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                        <div className="absolute top-0 right-0 w-64 h-64 -translate-y-1/2 translate-x-1/3 bg-blue-500 rounded-full opacity-30 blur-3xl mix-blend-screen" />
                                        <div className="absolute bottom-0 left-0 w-48 h-48 translate-y-1/2 -translate-x-1/4 bg-purple-500 rounded-full opacity-30 blur-3xl mix-blend-screen" />
                                    </div>
                                    <div className="relative flex items-center justify-between gap-4 z-10">
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center justify-center w-12 h-12 shadow-lg bg-white/10 rounded-2xl backdrop-blur-md ring-1 ring-white/20">
                                                <ClockIcon className="w-6 h-6 text-white" />
                                            </div>
                                            <div>
                                                <Dialog.Title className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-100 tracking-tight">
                                                    Riwayat Transaksi
                                                </Dialog.Title>
                                                <div className="flex items-center gap-2 mt-1 opacity-90">
                                                    <span className="px-2 py-0.5 text-[10px] font-bold text-blue-900 uppercase tracking-widest bg-blue-100 rounded-md shadow-sm">
                                                        {akun?.nama_akun}
                                                    </span>
                                                    <span className="text-sm font-bold text-white tabular-nums drop-shadow-sm">
                                                        {formatRupiah(akun?.saldo || 0)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={onClose}
                                            className="p-2 transition-all duration-200 rounded-xl text-white/70 hover:text-white hover:bg-white/20 hover:scale-105 active:scale-95"
                                        >
                                            <XMarkIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                {/* 2. REFINED FILTERS */}
                                <div className="flex-none px-6 py-4 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm z-10">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <PeriodPills value={periodeFilter} onChange={setPeriodeFilter} />
                                            
                                            <div className="hidden sm:block w-px h-8 bg-gradient-to-b from-transparent via-gray-300 to-transparent"></div>
                                            
                                            <div className="flex bg-gray-100/80 p-1 rounded-xl shadow-inner border border-gray-200/50">
                                                {[
                                                    { id: '', label: 'Semua' },
                                                    { id: 'IN', label: 'Masuk' },
                                                    { id: 'OUT', label: 'Keluar' },
                                                ].map((t) => (
                                                    <button
                                                        key={t.label}
                                                        onClick={() => setJenisTransaksi(t.id as any)}
                                                        className={classNames(
                                                            'flex-1 px-4 py-1.5 text-xs font-bold rounded-lg transition-all duration-200',
                                                            jenisTransaksi === t.id
                                                                ? 'bg-white text-blue-700 shadow-sm ring-1 ring-gray-200/50'
                                                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
                                                        )}
                                                    >
                                                        {t.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                                <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                            </div>
                                            <input
                                                value={search}
                                                onChange={(e) => setSearch(e.target.value)}
                                                placeholder="Cari transaksi..."
                                                className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all sm:w-56"
                                            />
                                        </div>
                                    </div>

                                    {/* Custom Date Reveal */}
                                    {periodeFilter === 'custom' && (
                                        <div className="flex flex-wrap items-end gap-4 mt-4 p-4 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border border-blue-100/50 rounded-xl shadow-inner animate-in fade-in slide-in-from-top-2">
                                            <div className="flex-1 min-w-[140px]">
                                                <label className="block text-[10px] font-bold text-blue-800 uppercase tracking-wider mb-1">Mulai Dari</label>
                                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-3 py-2 text-sm bg-white border border-blue-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all" />
                                            </div>
                                            <div className="flex-1 min-w-[140px]">
                                                <label className="block text-[10px] font-bold text-blue-800 uppercase tracking-wider mb-1">Sampai Dengan</label>
                                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-3 py-2 text-sm bg-white border border-blue-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all" />
                                            </div>
                                        </div>
                                    )}

                                    {/* Elevated Insight Cards */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                                        <div className="flex items-center gap-3 p-3 bg-white border border-emerald-100 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                                                <ArrowDownTrayIcon className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-emerald-800/60 uppercase tracking-wider">Uang Masuk</p>
                                                <p className="text-sm font-black text-emerald-600 tabular-nums">+{formatRupiah(pageSum.in)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 p-3 bg-white border border-rose-100 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                                            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                                                <ArrowUpTrayIcon className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-rose-800/60 uppercase tracking-wider">Uang Keluar</p>
                                                <p className="text-sm font-black text-rose-600 tabular-nums">-{formatRupiah(pageSum.out)}</p>
                                            </div>
                                        </div>
                                        <div className="hidden sm:flex items-center gap-3 p-3 bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl shadow-sm col-span-2 sm:col-span-1 hover:shadow-md transition-shadow">
                                            <div className={classNames("p-2 rounded-lg", pageSum.in >= pageSum.out ? "bg-indigo-100 text-indigo-600" : "bg-rose-100 text-rose-600")}>
                                                <ClockIcon className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-indigo-800/60 uppercase tracking-wider">Selisih Periode</p>
                                                <p className={classNames("text-sm font-black tabular-nums", pageSum.in >= pageSum.out ? 'text-indigo-700' : 'text-rose-600')}>
                                                    {pageSum.in >= pageSum.out ? '+' : '-'}{formatRupiah(Math.abs(pageSum.in - pageSum.out))}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Action bar */}
                                    <div className="flex items-center justify-end mt-3 gap-2">
                                        { (jenisTransaksi !== '' || search.trim() || periodeFilter !== 'bulan_ini') && (
                                            <button onClick={handleReset} className="text-[11px] font-bold text-rose-500 hover:text-rose-600 px-3 py-1.5 hover:bg-rose-50 rounded-lg shadow-sm border border-transparent hover:border-rose-100 transition-all mr-1">
                                                Hapus Filter
                                            </button>
                                        )}
                                        <button onClick={() => fetchHistory(currentPage)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:shadow-sm transition-all shadow-sm">
                                            <ArrowPathIcon className={classNames("w-3.5 h-3.5", isLoading && "animate-spin")} />
                                            Muat Ulang
                                        </button>
                                    </div>
                                </div>

                                {/* 3. LUXURY TRANSACTION LIST */}
                                <div className="flex-1 overflow-y-auto bg-slate-50/50 p-3 sm:p-5 relative">
                                    {isLoading ? (
                                        <div className="flex flex-col items-center justify-center p-10 h-full text-center">
                                            <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4 shadow-lg shadow-indigo-200/50" />
                                            <p className="text-sm font-bold text-indigo-900/60 animate-pulse">Menyiapkan data transaksi...</p>
                                        </div>
                                    ) : historyData.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center p-10 h-full text-center">
                                            <div className="w-20 h-20 bg-white shadow-xl shadow-gray-200/50 rounded-full flex items-center justify-center mb-5 border border-gray-100">
                                                <DocumentTextIcon className="w-10 h-10 text-gray-300" />
                                            </div>
                                            <p className="text-lg font-bold text-gray-800">Tidak ada riwayat</p>
                                            <p className="text-sm text-gray-500 mt-1">Belum ada transaksi sesuai filter Anda.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {historyData.map((tx) => {
                                                const txDate = (tx as any).tanggal || (tx as any).created_at || new Date();
                                                const isExpanded = expandedTx === tx.id;
                                                const isMasuk = tx.arah === 'IN';
                                                
                                                return (
                                                    <div 
                                                        key={tx.id} 
                                                        className={classNames(
                                                            "group transition-all duration-300 bg-white rounded-2xl border shadow-sm hover:shadow-md overflow-hidden",
                                                            isExpanded ? "ring-2 ring-indigo-500/20 border-indigo-200" : "border-gray-200/60 hover:border-gray-300"
                                                        )}
                                                    >
                                                        <button 
                                                            onClick={() => toggleExpanded(tx.id)} 
                                                            className="w-full relative flex items-center justify-between p-4 text-left focus:outline-none"
                                                        >
                                                            {/* Dynamic side accent */}
                                                            <div className={classNames(
                                                                "absolute left-0 top-0 bottom-0 w-1.5 transition-all duration-300 rounded-l-2xl",
                                                                isMasuk ? "bg-emerald-400 opacity-0 group-hover:opacity-100" : "bg-rose-400 opacity-0 group-hover:opacity-100",
                                                                isExpanded && "opacity-100"
                                                            )} />
                                                            
                                                            <div className="flex items-center gap-4 overflow-hidden pl-1 sm:pl-2">
                                                                <div className={classNames(
                                                                    "flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-105",
                                                                    isMasuk 
                                                                        ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-600 border border-emerald-200/50' 
                                                                        : 'bg-gradient-to-br from-rose-50 to-rose-100 text-rose-600 border border-rose-200/50'
                                                                )}>
                                                                    {isMasuk ? <ArrowDownTrayIcon className="w-5 h-5 drop-shadow-sm" /> : <ArrowUpTrayIcon className="w-5 h-5 drop-shadow-sm" />}
                                                                </div>
                                                                <div className="overflow-hidden">
                                                                    <p className="text-[15px] font-bold text-gray-900 truncate tracking-tight">
                                                                        {(tx as any).memo || (tx as any).keterangan || '-'}
                                                                    </p>
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200/50">
                                                                            {fmtDate(txDate)}
                                                                        </span>
                                                                        <span className="text-[11px] font-medium text-gray-400">
                                                                            {fmtTime(txDate)}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-col items-end flex-shrink-0 ml-3">
                                                                <span className={classNames(
                                                                    "text-[15px] font-black tabular-nums tracking-tight",
                                                                    isMasuk ? 'text-emerald-600' : 'text-rose-600'
                                                                )}>
                                                                    {isMasuk ? '+' : '-'} {formatRupiah(tx.jumlah)}
                                                                </span>
                                                                <span className={classNames(
                                                                    "text-[10px] font-bold uppercase tracking-wider mt-1 opacity-0 group-hover:opacity-100 transition-opacity",
                                                                    isMasuk ? 'text-emerald-500' : 'text-rose-500'
                                                                )}>
                                                                    Lihat Detail
                                                                </span>
                                                            </div>
                                                        </button>
                                                        
                                                        {/* Details Expansion - Fancy Glassmorphism look */}
                                                        {isExpanded && (
                                                            <div className="px-5 pb-5 pt-1 animate-in fade-in slide-in-from-top-2 duration-200 ease-out">
                                                                <div className="pl-14 sm:pl-16 pr-2">
                                                                    <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 border border-gray-100 shadow-inner">
                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                                                            <div>
                                                                                <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                                                                                    ID Ref
                                                                                </span>
                                                                                <span className="inline-block px-2.5 py-1 text-xs font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg shadow-sm">
                                                                                    #{tx.id}
                                                                                </span>
                                                                            </div>
                                                                            <div>
                                                                                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Jenis</span>
                                                                                <span className={classNames("text-sm font-bold flex items-center gap-1.5", isMasuk ? 'text-emerald-700' : 'text-rose-700')}>
                                                                                    {isMasuk ? <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm"></span> : <span className="w-2 h-2 rounded-full bg-rose-500 shadow-sm"></span>}
                                                                                    {isMasuk ? 'Dana Masuk' : 'Dana Keluar'}
                                                                                </span>
                                                                            </div>
                                                                            <div className="sm:col-span-2">
                                                                                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Keterangan Lengkap</span>
                                                                                <p className="text-sm font-medium text-gray-800 break-words leading-relaxed">
                                                                                    {(tx as any).memo || (tx as any).keterangan || '-'}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* 4. ELEGANT PAGINATION */}
                                {totalPages > 1 && !isLoading && (
                                    <div className="flex-none px-6 py-4 bg-white/90 backdrop-blur-xl border-t border-gray-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
                                        <div className="flex items-center justify-between w-full">
                                            <p className="text-xs font-bold text-gray-400 hidden sm:block">
                                                Halaman <span className="text-indigo-600 text-sm mx-1 px-1.5 py-0.5 bg-indigo-50 rounded-md border border-indigo-100">{currentPage}</span> dari {totalPages}
                                            </p>
                                            <div className="w-full sm:w-auto flex justify-center">
                                                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
                                            </div>
                                        </div>
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
// ----------------------
// MAIN PAGE
// ----------------------
const AkunKasPage = () => {
    const [akunList, setAkunList] = useState<AkunKas[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // CRUD modal
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editItem, setEditItem] = useState<AkunKas | null>(null);
    const [itemToDelete, setItemToDelete] = useState<AkunKas | null>(null);

    // transaksi & history modal
    const [isKasModalOpen, setIsKasModalOpen] = useState(false);
    const [transaksiPreset, setTransaksiPreset] = useState<{
        akunId: number | null;
        arah: 'IN' | 'OUT' | null;
    }>({ akunId: null, arah: null });

    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [selectedAkun, setSelectedAkun] = useState<AkunKas | null>(null);

    // form state akun
    const [namaAkun, setNamaAkun] = useState('');
    const [tipeAkun, setTipeAkun] = useState<'KAS_TUNAI' | 'BANK'>('KAS_TUNAI');
    const [isActive, setIsActive] = useState(true);

    // filters/search for list akun
    const [q, setQ] = useState('');
    const [typeFilter, setTypeFilter] = useState<'ALL' | 'KAS_TUNAI' | 'BANK'>(
        'ALL'
    );
    const [showInactive, setShowInactive] = useState(false);

    // --------- Insight Periode (NEW) ----------
    const [insightPeriod, setInsightPeriod] = useState<Period>('bulan_ini');
    const [insightStartDate, setInsightStartDate] = useState('');
    const [insightEndDate, setInsightEndDate] = useState('');
    const [insightAkun, setInsightAkun] = useState<string>('ALL_ACTIVE'); // ALL_ACTIVE | akunId
    const [insightLoading, setInsightLoading] = useState(false);
    const [insightError, setInsightError] = useState<string>('');

    const [insightIn, setInsightIn] = useState(0);
    const [insightOut, setInsightOut] = useState(0);
    const [insightNet, setInsightNet] = useState(0);
    const [insightStartSaldo, setInsightStartSaldo] = useState(0);
    const [insightEndSaldo, setInsightEndSaldo] = useState(0);
    const [insightSeries, setInsightSeries] = useState<number[]>([]);
    const insightReqRef = useRef(0);
    // show/hide Insight card (persist)
    const [showInsight, setShowInsight] = useState<boolean>(() => {
    try {
        const v = localStorage.getItem('akunkas_show_insight');
        return v === null ? true : v === '1';
    } catch {
        return true;
    }
    });

    useEffect(() => {
    try {
        localStorage.setItem('akunkas_show_insight', showInsight ? '1' : '0');
    } catch {}
    }, [showInsight]);


    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await api.getAllAkunKas();
            setAkunList(Array.isArray(data) ? data : []);
        } catch (err: any) {
            showToast(err.message || 'Gagal memuat data akun kas', 'error');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // init insight custom dates
    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        const d = new Date();
        d.setDate(d.getDate() - 30);
        setInsightStartDate(d.toISOString().split('T')[0]);
        setInsightEndDate(today);
    }, []);

    const resetForm = () => {
        setNamaAkun('');
        setTipeAkun('KAS_TUNAI');
        setIsActive(true);
        setIsEditing(false);
        setEditItem(null);
    };

    const handleOpenModal = () => {
        resetForm();
        setIsFormVisible(true);
    };

    const handleEditClick = (item: AkunKas) => {
        setEditItem(item);
        setIsEditing(true);
        setNamaAkun(item.nama_akun);
        setTipeAkun(item.tipe_akun);
        setIsActive(item.is_active);
        setIsFormVisible(true);
    };

    const handleViewHistory = (akun: AkunKas) => {
        setSelectedAkun(akun);
        setIsHistoryModalOpen(true);
    };

    const handleOpenTransaksi = (akunId?: number, arah?: 'IN' | 'OUT') => {
        setTransaksiPreset({
            akunId: typeof akunId === 'number' ? akunId : null,
            arah: arah || null,
        });
        setIsKasModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const payload: api.InputAkunKas = {
            nama_akun: namaAkun.trim(),
            tipe_akun: tipeAkun,
        };
        if (isEditing) payload.is_active = isActive;

        try {
            if (isEditing && editItem) {
                await api.updateAkunKas(editItem.id, payload);
                showToast('Akun berhasil diperbarui!', 'success');
            } else {
                await api.createAkunKas(payload);
                showToast('Akun baru berhasil dibuat!', 'success');
            }
            setIsFormVisible(false);
            fetchData();
        } catch (err: any) {
            showToast(err.message || 'Gagal menyimpan data.', 'error');
        }
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;
        try {
            await api.deleteAkunKas(itemToDelete.id);
            showToast('Akun berhasil dihapus!', 'success');
            fetchData();
        } catch (err: any) {
            showToast(err.message || 'Gagal menghapus akun.', 'error');
        } finally {
            setItemToDelete(null);
        }
    };

    const totalSummary = useMemo(() => {
        return akunList.reduce(
            (acc, akun) => {
                acc.total += akun.saldo;
                if (akun.tipe_akun === 'KAS_TUNAI') acc.kas += akun.saldo;
                else acc.bank += akun.saldo;
                if (akun.is_active) acc.activeCount += 1;
                return acc;
            },
            { total: 0, kas: 0, bank: 0, activeCount: 0 }
        );
    }, [akunList]);

    const filteredAkun = useMemo(() => {
        const qq = q.trim().toLowerCase();
        return akunList
            .filter((a) => (showInactive ? true : a.is_active))
            .filter((a) => (typeFilter === 'ALL' ? true : a.tipe_akun === typeFilter))
            .filter((a) => (qq ? a.nama_akun.toLowerCase().includes(qq) : true))
            .sort((a, b) => b.saldo - a.saldo);
    }, [akunList, q, typeFilter, showInactive]);

    const listMeta = useMemo(() => {
        const total = filteredAkun.length;
        const kas = filteredAkun.filter((a) => a.tipe_akun === 'KAS_TUNAI').length;
        const bank = filteredAkun.filter((a) => a.tipe_akun === 'BANK').length;
        return { total, kas, bank };
    }, [filteredAkun]);

    // ---------- INSIGHT COMPUTE ----------
    const computeInsight = useCallback(async () => {
        const reqId = ++insightReqRef.current;

        const range = getRangeFromPeriod(
            insightPeriod,
            insightStartDate,
            insightEndDate
        );

        if (!range.from || !range.to) {
            setInsightError('Tanggal periode belum lengkap.');
            return;
        }

        // if custom but invalid
        if (insightPeriod === 'custom' && range.from > range.to) {
            setInsightError('Tanggal mulai tidak boleh lebih besar dari tanggal akhir.');
            return;
        }

        const activeAccounts = akunList.filter((a) => a.is_active);
        const selectedIsAll = insightAkun === 'ALL_ACTIVE';

        const selectedAccounts = selectedIsAll
            ? activeAccounts
            : activeAccounts.filter((a) => String(a.id) === insightAkun);

        const endSaldo = selectedIsAll
            ? selectedAccounts.reduce((s, a) => s + a.saldo, 0)
            : (selectedAccounts[0]?.saldo || 0);

        // no account selected
        if (selectedAccounts.length === 0) {
            setInsightError('Tidak ada akun aktif yang bisa dihitung.');
            setInsightSeries([]);
            setInsightIn(0);
            setInsightOut(0);
            setInsightNet(0);
            setInsightStartSaldo(0);
            setInsightEndSaldo(0);
            return;
        }

        setInsightLoading(true);
        setInsightError('');

        try {
            const filters: api.TransaksiKasFilters = {
                dateFrom: range.from,
                dateTo: range.to,
            };

            // fetch transactions
            let txs: TransaksiKas[] = [];

            if (selectedIsAll) {
                // fetch each account; simple sequential to reduce burst
                for (const akun of selectedAccounts) {
                    const part = await fetchAllTransaksiRange(akun.id, filters, 200, 20);
                    txs = txs.concat(part);
                }
            } else {
                txs = await fetchAllTransaksiRange(
                    selectedAccounts[0].id,
                    filters,
                    200,
                    20
                );
            }

            if (reqId !== insightReqRef.current) return;

            const sum = txs.reduce(
                (acc, t) => {
                    if (t.arah === 'IN') acc.in += t.jumlah;
                    else acc.out += t.jumlah;
                    return acc;
                },
                { in: 0, out: 0 }
            );

            const net = sum.in - sum.out;
            const startSaldo = endSaldo - net;

            // daily net
            const map: Record<
                string,
                { in: number; out: number }
            > = Object.create(null);

            for (const t of txs) {
                const k = dateKey((t as any).tanggal || (t as any).created_at || new Date());
                if (!map[k]) map[k] = { in: 0, out: 0 };
                if (t.arah === 'IN') map[k].in += t.jumlah;
                else map[k].out += t.jumlah;
            }

            const days = daysBetweenInclusive(range.from, range.to);
            let running = startSaldo;
            const series: number[] = [];
            for (const d of days) {
                const v = map[d];
                const dayNet = v ? v.in - v.out : 0;
                running += dayNet;
                series.push(running);
            }

            setInsightIn(sum.in);
            setInsightOut(sum.out);
            setInsightNet(net);
            setInsightStartSaldo(startSaldo);
            setInsightEndSaldo(endSaldo);
            setInsightSeries(series.length ? series : [endSaldo]);
        } catch (err: any) {
            if (reqId !== insightReqRef.current) return;
            setInsightError(err.message || 'Gagal memuat insight periode.');
            setInsightSeries([]);
            setInsightIn(0);
            setInsightOut(0);
            setInsightNet(0);
            setInsightStartSaldo(0);
            setInsightEndSaldo(0);
        } finally {
            if (reqId !== insightReqRef.current) return;
            setInsightLoading(false);
        }
    }, [akunList, insightAkun, insightPeriod, insightStartDate, insightEndDate]);

    // auto recompute insight when inputs change + akun loaded
    useEffect(() => {
        if (!akunList.length) return;
        computeInsight();
    }, [akunList, insightAkun, insightPeriod, insightStartDate, insightEndDate, computeInsight]);

    const insightLabel = useMemo(() => {
        if (insightAkun === 'ALL_ACTIVE') return 'Gabungan (Akun Aktif)';
        const id = parseInt(insightAkun || '0', 10);
        const akun = akunList.find((a) => a.id === id);
        return akun ? akun.nama_akun : 'Akun';
    }, [insightAkun, akunList]);

    const insightTrendText = useMemo(() => {
        if (!insightSeries.length) return '';
        const first = insightSeries[0];
        const last = insightSeries[insightSeries.length - 1];
        const diff = last - first;
        return diff >= 0 ? `+ ${formatRupiah(diff)}` : `- ${formatRupiah(Math.abs(diff))}`;
    }, [insightSeries]);

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="px-4 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8">
                {/* HERO */}
                <div className="p-6 mb-6 shadow-lg bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-blue-500/20">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="text-white">
                            <h1 className="text-2xl font-extrabold md:text-3xl">Akun Kas</h1>
                            <p className="mt-1 text-sm text-blue-100">
                                Kelola akun kas & bank. Pantau tren saldo dan ringkasan IN/OUT per periode.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row">
                            <button
                                onClick={() => handleOpenTransaksi(undefined, undefined)}
                                className="inline-flex items-center justify-center gap-2 px-5 py-3 font-semibold text-blue-700 transition-all bg-white shadow-lg rounded-xl hover:bg-blue-50"
                            >
                                <CurrencyDollarIcon className="w-5 h-5" />
                                Transaksi Manual
                            </button>

                            <button
                                onClick={handleOpenModal}
                                className="inline-flex items-center justify-center gap-2 px-5 py-3 font-semibold text-white transition-all border bg-blue-900/20 border-white/30 rounded-xl hover:bg-white/15"
                            >
                                <PlusIcon className="w-5 h-5" />
                                Tambah Akun
                            </button>
                        </div>
                    </div>
                </div>

                {/* SUMMARY */}
                <div className="p-6 mb-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-xl">
                            <CurrencyDollarIcon className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-extrabold text-gray-900">
                                Ringkasan Saldo
                            </h2>
                            <p className="text-sm text-gray-600">
                                Total saldo seluruh akun (kas + bank)
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                        <div className="p-6 transition-all duration-300 transform border border-blue-100 group bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl hover:shadow-lg hover:-translate-y-1">
                            <div className="flex items-center justify-between mb-3">
                                <div className="p-3 transition-transform bg-blue-100 rounded-xl group-hover:scale-110">
                                    <CurrencyDollarIcon className="w-6 h-6 text-blue-600" />
                                </div>
                                <span className="text-[11px] text-blue-700 bg-blue-100 px-3 py-1 rounded-full font-semibold">
                  Total
                </span>
                            </div>
                            <p className="mb-1 text-sm font-medium text-gray-600">
                                Saldo Keseluruhan
                            </p>
                            <p className="text-3xl font-extrabold text-blue-700 tabular-nums">
                                {formatRupiah(totalSummary.total)}
                            </p>
                        </div>

                        <div className="p-6 transition-all duration-300 transform border group bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border-emerald-100 hover:shadow-lg hover:-translate-y-1">
                            <div className="flex items-center justify-between mb-3">
                                <div className="p-3 transition-transform bg-emerald-100 rounded-xl group-hover:scale-110">
                                    <WalletIcon className="w-6 h-6 text-emerald-700" />
                                </div>
                                <span className="text-[11px] text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full font-semibold">
                  Kas
                </span>
                            </div>
                            <p className="mb-1 text-sm font-medium text-gray-600">
                                Saldo Kas Tunai
                            </p>
                            <p className="text-3xl font-extrabold text-emerald-700 tabular-nums">
                                {formatRupiah(totalSummary.kas)}
                            </p>
                        </div>

                        <div className="p-6 transition-all duration-300 transform border border-indigo-100 group bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl hover:shadow-lg hover:-translate-y-1">
                            <div className="flex items-center justify-between mb-3">
                                <div className="p-3 transition-transform bg-indigo-100 rounded-xl group-hover:scale-110">
                                    <BuildingLibraryIcon className="w-6 h-6 text-indigo-700" />
                                </div>
                                <span className="text-[11px] text-indigo-800 bg-indigo-100 px-3 py-1 rounded-full font-semibold">
                  Bank
                </span>
                            </div>
                            <p className="mb-1 text-sm font-medium text-gray-600">
                                Saldo Bank
                            </p>
                            <p className="text-3xl font-extrabold text-indigo-700 tabular-nums">
                                {formatRupiah(totalSummary.bank)}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 mt-5 text-sm sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-gray-600">
                            Akun aktif:{' '}
                            <span className="font-bold text-gray-900">
                {totalSummary.activeCount}
              </span>{' '}
                            /{' '}
                            <span className="font-bold text-gray-900">{akunList.length}</span>
                        </p>

                        <div className="px-4 py-2 text-xs text-gray-600 border bg-slate-50 border-slate-200 rounded-xl">
                            Klik akun untuk buka{' '}
                            <span className="font-semibold text-blue-700">Riwayat Transaksi</span>.
                        </div>
                    </div>
                </div>


                {/* INSIGHT PERIODE - Enhanced with +/- toggle at top right */}
                <div className="relative p-6 mb-6 overflow-hidden bg-white border border-gray-200 shadow-sm rounded-2xl">
                    {/* Toggle Button at top right corner */}
                    <button
                        type="button"
                        onClick={() => setShowInsight((v) => !v)}
                        className={classNames(
                            "absolute top-4 right-4 z-10 inline-flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300",
                            "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30",
                            "hover:from-blue-600 hover:to-indigo-700 hover:scale-110 hover:shadow-xl active:scale-95"
                        )}
                        title={showInsight ? 'Sembunyikan Insight' : 'Tampilkan Insight'}
                    >
                        {showInsight ? (
                            <MinusIcon className="w-5 h-5" />
                        ) : (
                            <PlusIcon className="w-5 h-5" />
                        )}
                    </button>

                    {/* Header - Always visible */}
                    <div className="flex items-start gap-3 mb-4 pr-14">
                        <div className="flex items-center justify-center w-12 h-12 shadow-sm bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl">
                            <ArrowTrendingUpIcon className="text-blue-600 w-7 h-7" />
                        </div>
                        <div>
                            <h2 className="text-xl font-extrabold text-gray-900">
                                Insight Periode
                            </h2>
                            <p className="text-sm text-gray-600">
                                Ringkasan IN/OUT dan tren saldo berdasarkan transaksi
                            </p>
                        </div>
                    </div>

                    {/* Collapsible Content */}
                    <Transition
                        show={showInsight}
                        enter="transition-all duration-500 ease-out"
                        enterFrom="opacity-0 max-h-0"
                        enterTo="opacity-100 max-h-[2000px]"
                        leave="transition-all duration-300 ease-in"
                        leaveFrom="opacity-100 max-h-[2000px]"
                        leaveTo="opacity-0 max-h-0"
                    >
                        <div className="overflow-hidden">
                            {/* Filter Controls */}
                            <div className="flex flex-col gap-4 pt-4 mb-5 border-t border-gray-100 lg:flex-row lg:items-end lg:justify-between">
                                <div className="min-w-[240px]">
                                    <p className="mb-2 text-xs font-bold tracking-wider text-gray-700 uppercase">Target Akun</p>
                                    <select
                                        value={insightAkun}
                                        onChange={(e) => setInsightAkun(e.target.value)}
                                        className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100 bg-white transition-all duration-300"
                                    >
                                        <option value="ALL_ACTIVE">Gabungan (Akun Aktif)</option>
                                        {akunList
                                            .filter((a) => a.is_active)
                                            .map((a) => (
                                                <option key={a.id} value={String(a.id)}>
                                                    {a.nama_akun} — {formatRupiah(a.saldo)}
                                                </option>
                                            ))}
                                    </select>
                                </div>

                                <div>
                                    <p className="mb-2 text-xs font-bold tracking-wider text-gray-700 uppercase">Periode</p>
                                    <PeriodPills value={insightPeriod} onChange={setInsightPeriod} />
                                </div>
                            </div>

                            {insightPeriod === 'custom' && (
                                <div className="grid grid-cols-1 gap-3 p-4 mb-5 border border-blue-100 sm:grid-cols-2 lg:grid-cols-4 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 rounded-xl">
                                    <div>
                                        <p className="mb-2 text-xs font-semibold text-gray-700">Dari</p>
                                        <input
                                            type="date"
                                            value={insightStartDate}
                                            onChange={(e) => setInsightStartDate(e.target.value)}
                                            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100 bg-white"
                                        />
                                    </div>
                                    <div>
                                        <p className="mb-2 text-xs font-semibold text-gray-700">Sampai</p>
                                        <input
                                            type="date"
                                            value={insightEndDate}
                                            onChange={(e) => setInsightEndDate(e.target.value)}
                                            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100 bg-white"
                                        />
                                    </div>
                                    <div className="flex items-end justify-between gap-3 sm:col-span-2">
                                        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-800 flex-1">
                                            <ExclamationTriangleIcon className="inline w-4 h-4 mr-1" />
                                            Periode terlalu panjang bisa memperlambat loading.
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => computeInsight()}
                                            className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-2.5 px-5 text-sm font-semibold shadow-lg shadow-blue-500/25 transition-all duration-300"
                                        >
                                            Refresh
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)] gap-5">
                                {/* Chart */}
                                <div className="p-5 border bg-gradient-to-br from-slate-50 to-blue-50/30 border-slate-200 rounded-2xl">
                                    <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center justify-center w-10 h-10 bg-white border shadow-sm rounded-xl border-slate-200">
                                                <ChartBarIcon className="w-5 h-5 text-blue-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-extrabold text-gray-900">
                                                    Tren Saldo — {insightLabel}
                                                </p>
                                                <p className="text-[11px] text-gray-500">
                                                    Periode: {getRangeFromPeriod(insightPeriod, insightStartDate, insightEndDate).from} s/d{' '}
                                                    {getRangeFromPeriod(insightPeriod, insightStartDate, insightEndDate).to}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="px-4 py-2 text-xs text-gray-600 bg-white border border-blue-100 shadow-sm rounded-xl">
                                            <span className="font-semibold text-gray-700">Perubahan:</span>{' '}
                                            <span
                                                className={classNames(
                                                    'font-extrabold tabular-nums',
                                                    insightNet >= 0 ? 'text-emerald-700' : 'text-rose-700'
                                                )}
                                            >
                                                {insightTrendText}
                                            </span>
                                        </div>
                                    </div>

                                    {insightLoading ? (
                                        <div className="py-10 text-center">
                                            <div className="w-10 h-10 mx-auto mb-3 border-b-2 border-blue-600 rounded-full animate-spin" />
                                            <p className="text-sm text-gray-500">Memuat insight...</p>
                                        </div>
                                    ) : insightError ? (
                                        <div className="p-4 text-sm border bg-rose-50 border-rose-200 rounded-xl text-rose-800">
                                            {insightError}
                                        </div>
                                    ) : (
                                        <div className="p-4 bg-white border border-blue-100 shadow-sm rounded-2xl">
                                            <MiniLineChart points={insightSeries} height={140} />
                                            <div className="grid grid-cols-2 gap-3 mt-4 text-xs sm:grid-cols-4">
                                                <div className="group p-3 border bg-slate-50 border-slate-200 rounded-xl hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                                                    <p className="text-gray-500">Saldo Awal</p>
                                                    <p className="font-extrabold text-gray-900 tabular-nums">
                                                        {formatRupiah(insightStartSaldo)}
                                                    </p>
                                                </div>
                                                <div className="group p-3 border bg-blue-50 border-blue-200 rounded-xl hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                                                    <p className="text-blue-700">Saldo Akhir</p>
                                                    <p className="font-extrabold text-blue-700 tabular-nums">
                                                        {formatRupiah(insightEndSaldo)}
                                                    </p>
                                                </div>
                                                <div className="group p-3 border bg-emerald-50 border-emerald-200 rounded-xl hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                                                    <p className="text-emerald-700">Masuk</p>
                                                    <p className="font-extrabold text-emerald-700 tabular-nums">
                                                        + {formatRupiah(insightIn)}
                                                    </p>
                                                </div>
                                                <div className="group p-3 border bg-rose-50 border-rose-200 rounded-xl hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                                                    <p className="text-rose-700">Keluar</p>
                                                    <p className="font-extrabold text-rose-700 tabular-nums">
                                                        - {formatRupiah(insightOut)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Summary */}
                                <div className="p-5 border border-blue-100 shadow-sm bg-gradient-to-br from-white to-blue-50/50 rounded-2xl">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <p className="text-sm font-extrabold text-blue-900">
                                                Ringkasan IN/OUT
                                            </p>
                                            <p className="text-[11px] text-blue-700">
                                                Fokus: {insightLabel}
                                            </p>
                                        </div>
                                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100">
                                            <CurrencyDollarIcon className="w-5 h-5 text-blue-600" />
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="group p-4 border bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200 rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                                            <p className="text-[11px] text-emerald-700 font-semibold">Uang Masuk</p>
                                            <p className="text-xl font-extrabold text-emerald-700 tabular-nums">
                                                + {formatRupiah(insightIn)}
                                            </p>
                                        </div>

                                        <div className="group p-4 border bg-gradient-to-r from-rose-50 to-pink-50 border-rose-200 rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                                            <p className="text-[11px] text-rose-700 font-semibold">Uang Keluar</p>
                                            <p className="text-xl font-extrabold text-rose-700 tabular-nums">
                                                - {formatRupiah(insightOut)}
                                            </p>
                                        </div>

                                        <div
                                            className={classNames(
                                                'group border rounded-xl p-4 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300',
                                                insightNet >= 0
                                                    ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'
                                                    : 'bg-gradient-to-r from-slate-50 to-gray-50 border-slate-200'
                                            )}
                                        >
                                            <p className="text-[11px] text-gray-600 font-semibold">Net Periode</p>
                                            <p
                                                className={classNames(
                                                    'text-2xl font-extrabold tabular-nums',
                                                    insightNet >= 0 ? 'text-blue-700' : 'text-rose-700'
                                                )}
                                            >
                                                {insightNet >= 0 ? '+' : '-'}{' '}
                                                {formatRupiah(Math.abs(insightNet))}
                                            </p>
                                            <p className="mt-1 text-[11px] text-gray-500">
                                                Net = Masuk - Keluar
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => computeInsight()}
                                            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 hover:from-blue-700 hover:to-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
                                        >
                                            <ArrowPathIcon className="w-4 h-4" />
                                            Refresh Insight
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Transition>
                </div>
                {/* LIST HEADER: SEARCH + FILTER */}
                <div className="overflow-hidden bg-white border border-gray-200 shadow-sm rounded-2xl">
                    <div className="p-6 border-b border-gray-100">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-xl">
                                    <WalletIcon className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-extrabold text-gray-900">
                                        Daftar Akun
                                    </h2>
                                    <p className="text-sm text-gray-600">
                                        Menampilkan{' '}
                                        <span className="font-bold text-blue-700">
                      {listMeta.total}
                    </span>{' '}
                                        akun (Kas: {listMeta.kas}, Bank: {listMeta.bank})
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 md:flex-row md:items-end">
                                <div>
                                    <p className="mb-2 text-xs font-semibold text-gray-700">
                                        Tipe
                                    </p>
                                    <TypePills value={typeFilter} onChange={setTypeFilter} />
                                </div>

                                <div className="min-w-[260px]">
                                    <p className="mb-2 text-xs font-semibold text-gray-700">
                                        Cari Akun
                                    </p>
                                    <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2.5 border border-gray-200">
                                        <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
                                        <input
                                            value={q}
                                            onChange={(e) => setQ(e.target.value)}
                                            placeholder="Contoh: Kas Umum / BCA / Mandiri"
                                            className="flex-1 p-0 text-sm bg-transparent border-0 focus:ring-0"
                                        />
                                        {q.trim() && (
                                            <button
                                                type="button"
                                                onClick={() => setQ('')}
                                                className="text-gray-400 hover:text-gray-600"
                                                title="Clear"
                                            >
                                                <XMarkIcon className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between md:justify-start gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
                                    <div>
                                        <p className="text-xs font-semibold text-gray-800">
                                            Tampilkan Non-Aktif
                                        </p>
                                        <p className="text-[11px] text-gray-500">
                                            Akun non-aktif tetap bisa dilihat
                                        </p>
                                    </div>
                                    <Switch
                                        checked={showInactive}
                                        onChange={setShowInactive}
                                        className={classNames(
                                            showInactive ? 'bg-blue-600' : 'bg-gray-300',
                                            'relative inline-flex h-7 w-12 items-center rounded-full transition-colors'
                                        )}
                                    >
                    <span
                        className={classNames(
                            showInactive ? 'translate-x-6' : 'translate-x-1',
                            'inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-md'
                        )}
                    />
                                    </Switch>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Desktop table */}
                    <div className="hidden overflow-x-auto md:block">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-xs font-semibold tracking-wider text-left text-gray-600 uppercase">
                                    Nama Akun
                                </th>
                                <th className="px-6 py-3 text-xs font-semibold tracking-wider text-right text-gray-600 uppercase">
                                    Saldo
                                </th>
                                <th className="px-6 py-3 text-xs font-semibold tracking-wider text-center text-gray-600 uppercase">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-xs font-semibold tracking-wider text-center text-gray-600 uppercase">
                                    Aksi Cepat
                                </th>
                            </tr>
                            </thead>

                            <tbody className="bg-white divide-y divide-gray-200">
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4">
                                            <div className="h-10 bg-gray-100 rounded-xl" />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="h-6 bg-gray-100 rounded-xl" />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="w-24 h-6 mx-auto bg-gray-100 rounded-xl" />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="h-10 bg-gray-100 rounded-xl" />
                                        </td>
                                    </tr>
                                ))
                            ) : filteredAkun.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={4}
                                        className="px-6 py-12 text-center text-gray-500"
                                    >
                                        <WalletIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                        <p className="font-semibold text-gray-700">
                                            Tidak ada akun yang cocok.
                                        </p>
                                        <p className="mt-1 text-sm text-gray-500">
                                            Coba ubah filter / pencarian.
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                filteredAkun.map((akun) => (
                                    <tr
                                        key={akun.id}
                                        onClick={() => handleViewHistory(akun)}
                                        className={classNames(
                                            'hover:bg-blue-50 cursor-pointer transition-colors',
                                            !akun.is_active && 'opacity-70'
                                        )}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-4">
                                                <div
                                                    className={classNames(
                                                        'p-3 rounded-xl',
                                                        akun.tipe_akun === 'BANK'
                                                            ? 'bg-indigo-100'
                                                            : 'bg-emerald-100'
                                                    )}
                                                >
                                                    {akun.tipe_akun === 'BANK' ? (
                                                        <BuildingLibraryIcon className="w-5 h-5 text-indigo-700" />
                                                    ) : (
                                                        <WalletIcon className="w-5 h-5 text-emerald-700" />
                                                    )}
                                                </div>

                                                <div className="min-w-0">
                                                    <div className="font-extrabold text-gray-900 truncate">
                                                        {akun.nama_akun}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {akun.tipe_akun === 'BANK'
                                                            ? 'Rekening Bank'
                                                            : 'Kas Tunai'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 text-right whitespace-nowrap">
                                            <div className="font-mono text-lg font-extrabold text-gray-900 tabular-nums">
                                                {formatRupiah(akun.saldo)}
                                            </div>
                                            <div
                                                className={classNames(
                                                    'text-[11px] font-semibold',
                                                    akun.saldo < 0 ? 'text-rose-600' : 'text-gray-500'
                                                )}
                                            >
                                                {akun.saldo < 0 ? 'Saldo negatif' : 'Saldo normal'}
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 text-center whitespace-nowrap">
                        <span
                            className={classNames(
                                'inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full',
                                akun.is_active
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-rose-100 text-rose-800'
                            )}
                        >
                          <span
                              className={classNames(
                                  'h-1.5 w-1.5 rounded-full',
                                  akun.is_active ? 'bg-emerald-500' : 'bg-rose-500'
                              )}
                          />
                            {akun.is_active ? 'Aktif' : 'Non-Aktif'}
                        </span>
                                        </td>

                                        <td className="px-6 py-4 text-center whitespace-nowrap">
                                            <div
                                                onClick={(e) => e.stopPropagation()}
                                                className="flex items-center justify-center gap-2"
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenTransaksi(akun.id, 'IN')}
                                                    className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold transition-colors border rounded-xl bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                                                    title="Catat uang masuk"
                                                >
                                                    <ArrowDownTrayIcon className="w-4 h-4" />
                                                    Masuk
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenTransaksi(akun.id, 'OUT')}
                                                    className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold transition-colors border rounded-xl bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100"
                                                    title="Catat uang keluar"
                                                >
                                                    <ArrowUpTrayIcon className="w-4 h-4" />
                                                    Keluar
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => handleEditClick(akun)}
                                                    className="p-2 text-blue-700 transition-colors hover:bg-blue-100 rounded-xl"
                                                    title="Edit akun"
                                                >
                                                    <PencilSquareIcon className="w-5 h-5" />
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => setItemToDelete(akun)}
                                                    className="p-2 transition-colors text-rose-700 hover:bg-rose-100 rounded-xl"
                                                    title="Hapus akun"
                                                >
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="p-4 md:hidden">
                        {isLoading ? (
                            <div className="space-y-4">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
                                ))}
                            </div>
                        ) : filteredAkun.length === 0 ? (
                            <div className="py-12 text-center text-gray-500">
                                <WalletIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                <p className="font-semibold text-gray-700">
                                    Tidak ada akun yang cocok.
                                </p>
                                <p className="mt-1 text-sm text-gray-500">
                                    Coba ubah filter / pencarian.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {filteredAkun.map((akun) => (
                                    <div
                                        key={akun.id}
                                        onClick={() => handleViewHistory(akun)}
                                        className={classNames(
                                            'bg-white rounded-2xl border border-gray-200 p-4 shadow-sm cursor-pointer hover:bg-blue-50 transition-colors',
                                            !akun.is_active && 'opacity-70'
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center min-w-0 gap-3">
                                                <div
                                                    className={classNames(
                                                        'p-2 rounded-xl',
                                                        akun.tipe_akun === 'BANK'
                                                            ? 'bg-indigo-100'
                                                            : 'bg-emerald-100'
                                                    )}
                                                >
                                                    {akun.tipe_akun === 'BANK' ? (
                                                        <BuildingLibraryIcon className="w-5 h-5 text-indigo-700" />
                                                    ) : (
                                                        <WalletIcon className="w-5 h-5 text-emerald-700" />
                                                    )}
                                                </div>

                                                <div className="min-w-0">
                                                    <p className="font-extrabold text-gray-900 truncate">
                                                        {akun.nama_akun}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {akun.tipe_akun === 'BANK' ? 'Bank' : 'Kas'}
                                                    </p>
                                                </div>
                                            </div>

                                            <span
                                                className={classNames(
                                                    'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full',
                                                    akun.is_active
                                                        ? 'bg-emerald-100 text-emerald-800'
                                                        : 'bg-rose-100 text-rose-800'
                                                )}
                                            >
                        <span
                            className={classNames(
                                'h-1.5 w-1.5 rounded-full',
                                akun.is_active ? 'bg-emerald-500' : 'bg-rose-500'
                            )}
                        />
                                                {akun.is_active ? 'Aktif' : 'Non-Aktif'}
                      </span>
                                        </div>

                                        <div className="flex items-center justify-between gap-3 pt-3 mt-3 border-t border-gray-100">
                                            <div>
                                                <p className="text-xs text-gray-500">Saldo</p>
                                                <p className="font-mono text-lg font-extrabold text-gray-900 tabular-nums">
                                                    {formatRupiah(akun.saldo)}
                                                </p>
                                            </div>

                                            <div
                                                onClick={(e) => e.stopPropagation()}
                                                className="flex gap-2"
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenTransaksi(akun.id, 'IN')}
                                                    className="p-2 border rounded-xl bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                                                    title="Masuk"
                                                >
                                                    <ArrowDownTrayIcon className="w-5 h-5" />
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenTransaksi(akun.id, 'OUT')}
                                                    className="p-2 border rounded-xl bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100"
                                                    title="Keluar"
                                                >
                                                    <ArrowUpTrayIcon className="w-5 h-5" />
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => handleEditClick(akun)}
                                                    className="p-2 text-blue-700 border border-blue-200 rounded-xl bg-blue-50 hover:bg-blue-100"
                                                    title="Edit"
                                                >
                                                    <PencilSquareIcon className="w-5 h-5" />
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => setItemToDelete(akun)}
                                                    className="p-2 border rounded-xl bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100"
                                                    title="Hapus"
                                                >
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="mt-3 text-[11px] text-blue-700 flex items-center gap-1">
                                            <span className="font-semibold">Tap</span> untuk lihat riwayat transaksi
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* MODALS */}
                <HistoryModal
                    isOpen={isHistoryModalOpen}
                    onClose={() => setIsHistoryModalOpen(false)}
                    akun={selectedAkun}
                    onSuccess={fetchData}
                />

                <TransaksiKasModal
                    isOpen={isKasModalOpen}
                    onClose={() => setIsKasModalOpen(false)}
                    akunList={akunList.filter((a) => a.is_active)}
                    onSuccess={fetchData}
                    initialAkunId={transaksiPreset.akunId}
                    initialArah={transaksiPreset.arah}
                />

                {/* FORM MODAL: AKUN */}
                <Transition appear show={isFormVisible} as={Fragment}>
                    <Dialog
                        as="div"
                        className="relative z-50"
                        onClose={() => setIsFormVisible(false)}
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
                                    <Dialog.Panel className="w-full max-w-2xl overflow-hidden transition-all transform bg-white border border-blue-100 shadow-2xl rounded-2xl">
                                        <div className="relative px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600">
                                            <Dialog.Title className="flex items-center gap-3 text-xl font-bold text-white">
                                                <div className="p-2 bg-white/20 rounded-xl">
                                                    {isEditing ? (
                                                        <PencilSquareIcon className="w-5 h-5" />
                                                    ) : (
                                                        <PlusIcon className="w-5 h-5" />
                                                    )}
                                                </div>
                                                {isEditing ? 'Edit Akun' : 'Tambah Akun Baru'}
                                            </Dialog.Title>
                                            <p className="mt-1 text-xs text-blue-100">
                                                Buat akun baru untuk kas tunai atau rekening bank.
                                            </p>

                                            <button
                                                onClick={() => setIsFormVisible(false)}
                                                className="absolute p-2 transition-colors rounded-lg top-4 right-4 text-white/80 hover:text-white hover:bg-white/20"
                                            >
                                                <XMarkIcon className="w-5 h-5" />
                                            </button>

                                            
                                        </div>

                                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                                            <div className="p-4 border bg-slate-50 border-slate-200 rounded-2xl">
                                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                                    Nama Akun
                                                </label>
                                                <input
                                                    type="text"
                                                    value={namaAkun}
                                                    onChange={(e) => setNamaAkun(e.target.value)}
                                                    required
                                                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
                                                    placeholder="Contoh: Kas Umum / BCA Cabang Utama"
                                                />
                                                <p className="mt-1 text-[11px] text-gray-500">
                                                    Gunakan nama yang mudah dibedakan.
                                                </p>
                                            </div>

                                            <div className="p-4 border bg-slate-50 border-slate-200 rounded-2xl">
                                                <label className="block mb-2 text-xs font-semibold text-gray-700">
                                                    Tipe Akun
                                                </label>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => setTipeAkun('KAS_TUNAI')}
                                                        className={classNames(
                                                            'rounded-2xl border p-4 transition-all text-left',
                                                            tipeAkun === 'KAS_TUNAI'
                                                                ? 'border-emerald-200 bg-emerald-50 shadow-sm'
                                                                : 'border-gray-200 bg-white hover:bg-emerald-50/30 hover:border-emerald-200'
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div
                                                                className={classNames(
                                                                    'w-10 h-10 rounded-xl flex items-center justify-center',
                                                                    tipeAkun === 'KAS_TUNAI'
                                                                        ? 'bg-emerald-600'
                                                                        : 'bg-gray-100'
                                                                )}
                                                            >
                                                                <WalletIcon
                                                                    className={classNames(
                                                                        'w-5 h-5',
                                                                        tipeAkun === 'KAS_TUNAI'
                                                                            ? 'text-white'
                                                                            : 'text-gray-500'
                                                                    )}
                                                                />
                                                            </div>
                                                            <div>
                                                                <p
                                                                    className={classNames(
                                                                        'text-sm font-extrabold',
                                                                        tipeAkun === 'KAS_TUNAI'
                                                                            ? 'text-emerald-700'
                                                                            : 'text-gray-700'
                                                                    )}
                                                                >
                                                                    Kas Tunai
                                                                </p>
                                                                <p className="text-[11px] text-gray-500">
                                                                    Untuk cash di tangan
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => setTipeAkun('BANK')}
                                                        className={classNames(
                                                            'rounded-2xl border p-4 transition-all text-left',
                                                            tipeAkun === 'BANK'
                                                                ? 'border-indigo-200 bg-indigo-50 shadow-sm'
                                                                : 'border-gray-200 bg-white hover:bg-indigo-50/30 hover:border-indigo-200'
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div
                                                                className={classNames(
                                                                    'w-10 h-10 rounded-xl flex items-center justify-center',
                                                                    tipeAkun === 'BANK'
                                                                        ? 'bg-indigo-600'
                                                                        : 'bg-gray-100'
                                                                )}
                                                            >
                                                                <BuildingLibraryIcon
                                                                    className={classNames(
                                                                        'w-5 h-5',
                                                                        tipeAkun === 'BANK'
                                                                            ? 'text-white'
                                                                            : 'text-gray-500'
                                                                    )}
                                                                />
                                                            </div>
                                                            <div>
                                                                <p
                                                                    className={classNames(
                                                                        'text-sm font-extrabold',
                                                                        tipeAkun === 'BANK'
                                                                            ? 'text-indigo-700'
                                                                            : 'text-gray-700'
                                                                    )}
                                                                >
                                                                    Bank
                                                                </p>
                                                                <p className="text-[11px] text-gray-500">
                                                                    Untuk rekening bank
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </button>
                                                </div>
                                            </div>

                                            {isEditing && (
                                                <div className="p-4 border bg-slate-50 border-slate-200 rounded-2xl">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div>
                              <span className="text-sm font-semibold text-gray-800">
                                Status Aktif
                              </span>
                                                            <p className="text-[11px] text-gray-500 mt-1">
                                                                Akun non-aktif tidak bisa dipakai transaksi baru.
                                                            </p>
                                                        </div>
                                                        <Switch
                                                            checked={isActive}
                                                            onChange={setIsActive}
                                                            className={classNames(
                                                                isActive ? 'bg-blue-600' : 'bg-gray-300',
                                                                'relative inline-flex h-7 w-12 items-center rounded-full transition-colors'
                                                            )}
                                                        >
                              <span
                                  className={classNames(
                                      isActive
                                          ? 'translate-x-6'
                                          : 'translate-x-1',
                                      'inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-md'
                                  )}
                              />
                                                        </Switch>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex flex-col justify-end gap-3 pt-1 sm:flex-row">
                                                <button
                                                    type="button"
                                                    onClick={() => setIsFormVisible(false)}
                                                    className="rounded-xl border border-gray-300 bg-white py-2.5 px-6 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                                >
                                                    Batal
                                                </button>
                                                <button
                                                    type="submit"
                                                    className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-2.5 px-6 text-sm font-semibold shadow-lg shadow-blue-500/25 transition-all"
                                                >
                                                    {isEditing ? 'Perbarui Akun' : 'Simpan Akun'}
                                                </button>
                                            </div>
                                        </form>
                                    </Dialog.Panel>
                                </Transition.Child>
                            </div>
                        </div>
                    </Dialog>
                </Transition>

                {/* DELETE MODAL */}
                <Transition appear show={!!itemToDelete} as={Fragment}>
                    <Dialog
                        as="div"
                        className="relative z-50"
                        onClose={() => setItemToDelete(null)}
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
                            <div className="flex items-center justify-center min-h-full p-4 text-center">
                                <Transition.Child
                                    as={Fragment}
                                    enter="ease-out duration-300"
                                    enterFrom="opacity-0 scale-95"
                                    enterTo="opacity-100 scale-100"
                                    leave="ease-in duration-200"
                                    leaveFrom="opacity-100 scale-100"
                                    leaveTo="opacity-0 scale-95"
                                >
                                    <Dialog.Panel className="w-full max-w-md overflow-hidden transition-all transform bg-white border shadow-2xl rounded-2xl border-rose-100">
                                        <div className="px-6 py-4 bg-rose-600">
                                            <Dialog.Title className="flex items-center gap-3 text-xl font-bold text-white">
                                                <div className="p-2 bg-white/20 rounded-xl">
                                                    <ExclamationTriangleIcon className="w-5 h-5" />
                                                </div>
                                                Konfirmasi Hapus Akun
                                            </Dialog.Title>
                                        </div>

                                        <div className="p-6">
                                            <p className="mb-4 leading-relaxed text-gray-700">
                                                Yakin ingin menghapus akun{' '}
                                                <span className="font-bold">
                          "{itemToDelete?.nama_akun}"
                        </span>
                                                ?
                                            </p>

                                            <div className="p-3 mb-6 text-left border border-yellow-200 bg-yellow-50 rounded-xl">
                                                <p className="text-sm text-yellow-800">
                                                    Tindakan ini tidak dapat dibatalkan.
                                                </p>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    type="button"
                                                    className="rounded-xl border border-gray-300 bg-white py-2.5 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                                    onClick={() => setItemToDelete(null)}
                                                >
                                                    Batal
                                                </button>
                                                <button
                                                    type="button"
                                                    className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white py-2.5 px-4 text-sm font-semibold transition-colors"
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


export default AkunKasPage;