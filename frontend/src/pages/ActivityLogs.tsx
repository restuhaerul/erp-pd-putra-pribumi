// src/pages/ActivityLogs.tsx
import React, { useState, useEffect, useCallback } from 'react';
import * as api from '../services/api';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import Pagination from '../components/Pagination';
import {
    FunnelIcon,
    ArrowPathIcon,
    UserIcon,
    ClockIcon,
    ComputerDesktopIcon,
    DocumentTextIcon,
    EyeIcon,
    XMarkIcon,
    CalendarIcon,
    BuildingOfficeIcon
} from '@heroicons/react/24/outline';

// Helper aman untuk label modul agar tidak error saat null/undefined
const moduleLabel = (m?: string) =>
    (m && typeof m === 'string' && m.length > 0) ? m.replace(/_/g, ' ') : '–';

// Types
interface ActivityLog {
    id: number;
    user_id: number;
    user?: {
        id: number;
        username: string;
        full_name: string;
        photo_url?: string;
        role?: string;
        is_active?: boolean;
    };
    action: string;
    // dibikin opsional karena bisa kosong dari backend
    module?: string;
    record_id?: number;
    description: string;
    ip_address: string;
    timestamp: string;
}

interface User {
    id: number;
    username: string;
    full_name: string;
    photo_url?: string;
    role?: string;
    is_active?: boolean;
}

interface PaginatedResponse {
    data: ActivityLog[];
    pagination: {
        current_page: number;
        total_pages: number;
        total_items: number;
        items_per_page: number;
        has_next: boolean;
        has_prev: boolean;
    };
}

// Modal Component
interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

const Modal = ({ isOpen, onClose, title, children }: ModalProps) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-white bg-opacity-20 rounded-xl">
                                <EyeIcon className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">{title}</h2>
                                <p className="text-blue-100 text-sm">Informasi lengkap aktivitas pengguna</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-88px)]">{children}</div>
            </div>
        </div>
    );
};

const EnhancedActivityLogsPage = () => {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
    const itemsPerPage = 10;

    const [filters, setFilters] = useState({
        action: '',
        module: '',
        user_id: '',
        date_from: '',
        date_to: '',
    });

    const [showFilters, setShowFilters] = useState(false);

    // Helper functions for user photo
    const getUserPhoto = (log: ActivityLog) => {
        if (log.user?.photo_url && log.user.photo_url.trim() !== '') {
            if (log.user.photo_url.startsWith('http')) {
                return log.user.photo_url;
            } else {
                return `/uploads/users/${log.user.photo_url}`;
            }
        }
        return null;
    };

    const getUserDisplayName = (log: ActivityLog) => {
        return log.user?.full_name || log.user?.username || 'User Tidak Dikenal';
    };

    const getUserUsername = (log: ActivityLog) => {
        return log.user?.username || 'unknown';
    };

    const getUserInitial = (log: ActivityLog) => {
        const name = log.user?.full_name || log.user?.username || 'U';
        return name.charAt(0).toUpperCase();
    };

    // Image error handler
    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        e.currentTarget.style.display = 'none';
        const parent = e.currentTarget.parentElement;
        if (parent) {
            const fallback = parent.querySelector('.user-avatar-fallback') as HTMLElement;
            if (fallback) {
                fallback.style.display = 'flex';
            }
        }
    };

    // User Avatar Component
    const UserAvatar = ({ log, size = 'md' }: { log: ActivityLog; size?: 'sm' | 'md' | 'lg' }) => {
        const sizeClasses = {
            sm: 'w-8 h-8 text-xs',
            md: 'w-10 h-10 text-sm',
            lg: 'w-16 h-16 text-xl',
        };

        const photoUrl = getUserPhoto(log);

        return (
            <div className={`relative ${sizeClasses[size]} rounded-xl overflow-hidden border-2 border-blue-200`}>
                {photoUrl && (
                    <img
                        src={photoUrl}
                        alt={getUserDisplayName(log)}
                        className="w-full h-full object-cover"
                        onError={handleImageError}
                    />
                )}
                <div
                    className={`user-avatar-fallback absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold ${
                        !photoUrl ? 'flex' : 'hidden'
                    }`}
                >
                    {getUserInitial(log)}
                </div>
            </div>
        );
    };

    // Fetch users for filter dropdown
    const fetchUsers = useCallback(async () => {
        try {
            setIsLoadingUsers(true);
            const usersData = await api.getUsersFixed();
            setUsers(usersData);
        } catch (error) {
            console.error('Failed to fetch users:', error);
            setUsers([
                { id: 1, username: 'admin', full_name: 'Admin Utama' },
                { id: 2, username: 'operator1', full_name: 'Operator Gudang 1' },
                { id: 3, username: 'sales1', full_name: 'Sales Manager' },
                { id: 4, username: 'finance1', full_name: 'Staff Keuangan' },
            ]);
        } finally {
            setIsLoadingUsers(false);
        }
    }, []);

    const fetchLogs = useCallback(async () => {
        try {
            setIsLoading(true);

            const queryParams = {
                page: currentPage,
                per_page: itemsPerPage,
                ...filters,
            };

            const response = await api.getActivityLogsFixed(queryParams);

            if (response && typeof response === 'object') {
                if (Array.isArray(response)) {
                    setLogs(response);
                    setTotalPages(1);
                    setTotalItems(response.length);
                } else if ((response as PaginatedResponse).data && Array.isArray((response as PaginatedResponse).data)) {
                    const paginatedResponse = response as PaginatedResponse;
                    setLogs(paginatedResponse.data);
                    setTotalPages(paginatedResponse.pagination?.total_pages || 1);
                    setTotalItems(paginatedResponse.pagination?.total_items || 0);
                } else {
                    setLogs([]);
                    setTotalPages(1);
                    setTotalItems(0);
                }
            } else {
                setLogs([]);
                setTotalPages(1);
                setTotalItems(0);
            }
        } catch (error) {
            console.error('Failed to fetch logs:', error);
            setLogs([]);
            setTotalPages(1);
            setTotalItems(0);
        } finally {
            setIsLoading(false);
        }
    }, [currentPage, filters]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const getActionBadgeColor = (action?: string) => {
        switch ((action || '').toLowerCase()) {
            case 'create':
                return 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200';
            case 'update':
                return 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border border-blue-200';
            case 'delete':
                return 'bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border border-red-200';
            case 'login':
                return 'bg-gradient-to-r from-purple-100 to-violet-100 text-purple-800 border border-purple-200';
            case 'logout':
                return 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 border border-gray-200';
            default:
                return 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 border border-gray-200';
        }
    };

    // ❗Tambahkan fallback bila modul kosong/unknown
    const getModuleBadgeColor = (module?: string) => {
        const colors = {
            'PRODUK': 'bg-blue-50 text-blue-700 border-blue-200',
            'PEMBELIAN': 'bg-orange-50 text-orange-700 border-orange-200',
            'PRODUKSI': 'bg-green-50 text-green-700 border-green-200',
            'PENJUALAN': 'bg-indigo-50 text-indigo-700 border-indigo-200',
            'JASA_GILING': 'bg-purple-50 text-purple-700 border-purple-200',
            'BIAYA': 'bg-red-50 text-red-700 border-red-200',
            'KARUNG': 'bg-yellow-50 text-yellow-700 border-yellow-200',
            'STOK': 'bg-teal-50 text-teal-700 border-teal-200',
        };
        if (!module) return 'bg-gray-50 text-gray-700 border-gray-200';
        return colors[module as keyof typeof colors] || 'bg-gray-50 text-gray-700 border-gray-200';
    };

    const handleFilterChange = (key: string, value: string) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
        setCurrentPage(1);
    };

    const resetFilters = () => {
        setFilters({
            action: '',
            module: '',
            user_id: '',
            date_from: '',
            date_to: '',
        });
        setCurrentPage(1);
    };

    const getActiveFiltersCount = () => {
        return Object.values(filters).filter((value) => value !== '').length;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6 lg:mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-2">Log Aktivitas System</h1>
                            <p className="text-gray-600 flex items-center space-x-2 text-sm lg:text-base">
                                <ClockIcon className="w-4 h-4" />
                                <span>Pantau semua aktivitas pengguna secara real-time</span>
                            </p>
                        </div>
                        <div className="flex items-center space-x-3">
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`relative px-3 py-2 lg:px-4 lg:py-2 rounded-xl font-medium transition-all duration-300 flex items-center space-x-2 text-sm lg:text-base ${
                                    showFilters || getActiveFiltersCount() > 0
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                                        : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-300 hover:bg-blue-50'
                                }`}
                            >
                                <FunnelIcon className="w-4 h-4 lg:w-5 lg:h-5" />
                                <span>Filter</span>
                                {getActiveFiltersCount() > 0 && (
                                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 lg:w-6 lg:h-6 flex items-center justify-center font-bold">
                                        {getActiveFiltersCount()}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={fetchLogs}
                                className="p-2 lg:p-3 text-gray-600 hover:text-blue-600 hover:bg-white rounded-xl border border-gray-300 hover:border-blue-300 transition-all duration-300 shadow-sm hover:shadow-md"
                                title="Refresh Data"
                            >
                                <ArrowPathIcon className="w-4 h-4 lg:w-5 lg:h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Enhanced Filter Section */}
                {showFilters && (
                    <div className="bg-white rounded-xl lg:rounded-2xl shadow-lg lg:shadow-xl border border-gray-100 mb-4 lg:mb-8 overflow-hidden animate-in slide-in-from-top-5 duration-300">
                        {/* Filter Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 lg:px-6 lg:py-5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2 lg:space-x-4">
                                    <div className="p-1.5 lg:p-3 bg-white bg-opacity-20 rounded-lg lg:rounded-xl">
                                        <FunnelIcon className="w-4 h-4 lg:w-6 lg:h-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-base lg:text-xl font-bold text-white">Filter & Pencarian</h3>
                                        <p className="text-blue-100 text-xs lg:text-sm hidden sm:block">
                                            Saring data aktivitas sesuai kriteria yang diinginkan
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowFilters(false)}
                                    className="text-white hover:bg-white hover:bg-opacity-20 p-1.5 lg:p-2 rounded-lg lg:rounded-xl transition-colors"
                                >
                                    <XMarkIcon className="w-4 h-4 lg:w-5 lg:h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Filter Content */}
                        <div className="p-3 lg:p-6">
                            <div className="space-y-3 lg:space-y-0 lg:grid lg:grid-cols-3 xl:grid-cols-5 lg:gap-6">
                                {/* User Filter */}
                                <div className="space-y-1.5 lg:space-y-2">
                                    <label className="block text-xs lg:text-sm font-semibold text-gray-700 flex items-center space-x-1.5 lg:space-x-2">
                                        <UserIcon className="w-3 h-3 lg:w-4 lg:h-4 text-blue-600" />
                                        <span>Pengguna</span>
                                    </label>
                                    <select
                                        value={filters.user_id}
                                        onChange={(e) => handleFilterChange('user_id', e.target.value)}
                                        disabled={isLoadingUsers}
                                        className="w-full px-3 py-2.5 lg:px-4 lg:py-3 bg-white border border-gray-300 rounded-lg lg:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-xs lg:text-sm shadow-sm hover:shadow-md"
                                    >
                                        <option value="">Semua Pengguna</option>
                                        {users.map((user) => (
                                            <option key={user.id} value={user.id}>
                                                {user.full_name} ({user.username})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Action Filter */}
                                <div className="space-y-1.5 lg:space-y-2">
                                    <label className="block text-xs lg:text-sm font-semibold text-gray-700">Aksi</label>
                                    <select
                                        value={filters.action}
                                        onChange={(e) => handleFilterChange('action', e.target.value)}
                                        className="w-full px-3 py-2.5 lg:px-4 lg:py-3 bg-white border border-gray-300 rounded-lg lg:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-xs lg:text-sm shadow-sm hover:shadow-md"
                                    >
                                        <option value="">Semua Aksi</option>
                                        <option value="CREATE">Create</option>
                                        <option value="UPDATE">Update</option>
                                        <option value="DELETE">Delete</option>
                                        <option value="LOGIN">Login</option>
                                        <option value="LOGOUT">Logout</option>
                                    </select>
                                </div>

                                {/* Module Filter */}
                                <div className="space-y-1.5 lg:space-y-2">
                                    <label className="block text-xs lg:text-sm font-semibold text-gray-700">Modul</label>
                                    <select
                                        value={filters.module}
                                        onChange={(e) => handleFilterChange('module', e.target.value)}
                                        className="w-full px-3 py-2.5 lg:px-4 lg:py-3 bg-white border border-gray-300 rounded-lg lg:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-xs lg:text-sm shadow-sm hover:shadow-md"
                                    >
                                        <option value="">Semua Modul</option>
                                        <option value="PRODUK">Produk</option>
                                        <option value="PEMBELIAN">Pembelian</option>
                                        <option value="PRODUKSI">Produksi</option>
                                        <option value="PENJUALAN">Penjualan</option>
                                        <option value="JASA_GILING">Jasa Giling</option>
                                        <option value="BIAYA">Biaya Operasional</option>
                                        <option value="KARUNG">Karung</option>
                                        <option value="STOK">Stok Produk</option>
                                    </select>
                                </div>

                                {/* Date From */}
                                <div className="space-y-1.5 lg:space-y-2">
                                    <label className="block text-xs lg:text-sm font-semibold text-gray-700">Tanggal Dari</label>
                                    <input
                                        type="date"
                                        value={filters.date_from}
                                        onChange={(e) => handleFilterChange('date_from', e.target.value)}
                                        className="w-full px-3 py-2.5 lg:px-4 lg:py-3 bg-white border border-gray-300 rounded-lg lg:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-xs lg:text-sm shadow-sm hover:shadow-md"
                                    />
                                </div>

                                {/* Date To */}
                                <div className="space-y-1.5 lg:space-y-2 lg:col-span-1 xl:col-span-1">
                                    <label className="block text-xs lg:text-sm font-semibold text-gray-700">Tanggal Sampai</label>
                                    <input
                                        type="date"
                                        value={filters.date_to}
                                        onChange={(e) => handleFilterChange('date_to', e.target.value)}
                                        className="w-full px-3 py-2.5 lg:px-4 lg:py-3 bg-white border border-gray-300 rounded-lg lg:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-xs lg:text-sm shadow-sm hover:shadow-md"
                                    />
                                </div>
                            </div>

                            {/* Active Filters Display & Reset */}
                            {getActiveFiltersCount() > 0 && (
                                <div className="mt-3 lg:mt-6 pt-3 lg:pt-4 border-t border-gray-200">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 lg:gap-4">
                                        <div className="flex flex-wrap items-center gap-1.5 lg:gap-2">
                                            <span className="text-xs lg:text-sm font-semibold text-gray-600">Filter aktif:</span>

                                            {filters.user_id && (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full border border-blue-200">
                                                    User: {users.find((u) => u.id.toString() === filters.user_id)?.full_name || filters.user_id}
                                                    <button
                                                        onClick={() => handleFilterChange('user_id', '')}
                                                        className="ml-1 hover:text-blue-600 text-sm"
                                                    >
                                                        ×
                                                    </button>
                                                </span>
                                            )}

                                            {filters.action && (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full border border-green-200">
                                                    Aksi: {filters.action}
                                                    <button
                                                        onClick={() => handleFilterChange('action', '')}
                                                        className="ml-1 hover:text-green-600 text-sm"
                                                    >
                                                        ×
                                                    </button>
                                                </span>
                                            )}

                                            {filters.module && (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full border border-purple-200">
                                                    Modul: {moduleLabel(filters.module)}
                                                    <button
                                                        onClick={() => handleFilterChange('module', '')}
                                                        className="ml-1 hover:text-purple-600 text-sm"
                                                    >
                                                        ×
                                                    </button>
                                                </span>
                                            )}

                                            {filters.date_from && (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded-full border border-orange-200">
                                                    Dari: {format(new Date(filters.date_from), 'dd/MM/yyyy')}
                                                    <button
                                                        onClick={() => handleFilterChange('date_from', '')}
                                                        className="ml-1 hover:text-orange-600 text-sm"
                                                    >
                                                        ×
                                                    </button>
                                                </span>
                                            )}

                                            {filters.date_to && (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full border border-red-200">
                                                    Sampai: {format(new Date(filters.date_to), 'dd/MM/yyyy')}
                                                    <button
                                                        onClick={() => handleFilterChange('date_to', '')}
                                                        className="ml-1 hover:text-red-600 text-sm"
                                                    >
                                                        ×
                                                    </button>
                                                </span>
                                            )}
                                        </div>

                                        <button
                                            onClick={resetFilters}
                                            className="px-3 py-1.5 lg:px-4 lg:py-2 text-xs lg:text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg lg:rounded-xl transition-colors border border-red-200 hover:border-red-300 whitespace-nowrap"
                                        >
                                            Reset Semua Filter
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Loading State */}
                {isLoading && (
                    <div className="bg-white rounded-xl lg:rounded-2xl shadow-lg lg:shadow-xl p-6 lg:p-12 text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 lg:h-12 lg:w-12 border-4 border-blue-600 border-t-transparent"></div>
                        <p className="text-gray-600 mt-3 lg:mt-4 font-medium text-sm lg:text-base">Memuat log aktivitas...</p>
                    </div>
                )}

                {/* Mobile Cards */}
                {!isLoading && (
                    <div className="block lg:hidden space-y-3">
                        {logs.map((log) => (
                            <div
                                key={log.id}
                                className="bg-white shadow-md rounded-xl p-3 border border-gray-100 hover:shadow-lg transition-all duration-300"
                            >
                                {/* Header */}
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                                        <UserAvatar log={log} size="sm" />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-800 truncate text-sm">{getUserDisplayName(log)}</p>
                                            <p className="text-xs text-gray-500 truncate">@{getUserUsername(log)}</p>
                                            {log.user?.role && (
                                                <span className="inline-block mt-0.5 px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">
                                                    {log.user.role}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-center space-x-1 text-xs text-gray-400 mb-1">
                                            <CalendarIcon className="w-3 h-3" />
                                            <span>{format(new Date(log.timestamp), 'dd/MM', { locale: id })}</span>
                                        </div>
                                        <div className="flex items-center space-x-1 text-xs text-gray-400">
                                            <ClockIcon className="w-3 h-3" />
                                            <span>{format(new Date(log.timestamp), 'HH:mm', { locale: id })}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Badges */}
                                <div className="flex flex-wrap gap-2 mb-3">
                                    <span
                                        className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-lg ${getActionBadgeColor(
                                            log.action
                                        )}`}
                                    >
                                        {log.action}
                                    </span>
                                    <span
                                        className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-lg border ${getModuleBadgeColor(
                                            log.module
                                        )}`}
                                    >
                                        {moduleLabel(log.module)}
                                    </span>
                                </div>

                                {/* Description */}
                                <p className="text-gray-700 mb-3 leading-relaxed text-sm line-clamp-2">{log.description}</p>

                                {/* Footer */}
                                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                                        <ComputerDesktopIcon className="w-3 h-3" />
                                        <span className="truncate max-w-[120px]">{log.ip_address}</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        {log.record_id && (
                                            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">ID: {log.record_id}</span>
                                        )}
                                        <button
                                            onClick={() => setSelectedLog(log)}
                                            className="text-blue-600 hover:text-blue-700 text-xs font-medium bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors"
                                        >
                                            Detail
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Desktop Table */}
                {!isLoading && (
                    <div className="hidden lg:block bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold text-gray-800 flex items-center space-x-2">
                                    <DocumentTextIcon className="w-5 h-5 text-blue-600" />
                                    <span>Data Log Aktivitas</span>
                                </h2>
                                {totalItems > 0 && (
                                    <span className="text-sm text-gray-600 bg-white px-3 py-1 rounded-xl border border-gray-200">
                                        {totalItems} total aktivitas
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                        Waktu
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                        Pengguna
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                        Aksi
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                        Modul
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                        Deskripsi
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                        IP Address
                                    </th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                {logs.map((log, index) => (
                                    <tr
                                        key={log.id}
                                        className={`hover:bg-blue-50 transition-colors duration-200 cursor-pointer ${
                                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                                        }`}
                                        onClick={() => setSelectedLog(log)}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center space-x-2">
                                                <ClockIcon className="w-4 h-4 text-gray-400" />
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {format(new Date(log.timestamp), 'dd MMM yyyy', { locale: id })}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {format(new Date(log.timestamp), 'HH:mm:ss', { locale: id })}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center space-x-3">
                                                <UserAvatar log={log} size="sm" />
                                                <div>
                                                    <div className="text-sm font-semibold text-gray-900">{getUserDisplayName(log)}</div>
                                                    <div className="text-xs text-gray-500 flex items-center space-x-2">
                                                        <span>@{getUserUsername(log)}</span>
                                                        {log.user?.role && (
                                                            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                                                                    {log.user.role}
                                                                </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                                <span
                                                    className={`inline-flex px-3 py-1 text-xs font-semibold rounded-xl ${getActionBadgeColor(
                                                        log.action
                                                    )}`}
                                                >
                                                    {log.action}
                                                </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                                <span
                                                    className={`inline-flex px-3 py-1 text-xs font-medium rounded-xl border ${getModuleBadgeColor(
                                                        log.module
                                                    )}`}
                                                >
                                                    {moduleLabel(log.module)}
                                                </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900 max-w-xs truncate">{log.description}</div>
                                            {log.record_id && (
                                                <div className="text-xs text-gray-500 mt-1">ID Terkait: {log.record_id}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center space-x-2 text-sm text-gray-500">
                                                <ComputerDesktopIcon className="w-4 h-4" />
                                                <span>{log.ip_address}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {logs.length === 0 && !isLoading && (
                    <div className="bg-white rounded-2xl shadow-xl p-8 lg:p-12 text-center">
                        <div className="mx-auto w-20 h-20 lg:w-24 lg:h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-6">
                            <DocumentTextIcon className="w-10 h-10 lg:w-12 lg:h-12 text-gray-400" />
                        </div>
                        <h3 className="text-lg lg:text-xl font-semibold text-gray-900 mb-2">Tidak ada log aktivitas</h3>
                        <p className="text-gray-600 mb-6 text-sm lg:text-base">
                            {getActiveFiltersCount() > 0
                                ? 'Coba ubah filter untuk melihat data yang berbeda'
                                : 'Belum ada aktivitas yang tercatat dalam sistem'}
                        </p>
                        {getActiveFiltersCount() > 0 && (
                            <button
                                onClick={resetFilters}
                                className="px-4 py-2 lg:px-6 lg:py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium text-sm lg:text-base"
                            >
                                Reset Filter
                            </button>
                        )}
                    </div>
                )}

                {/* Enhanced Pagination */}
                {totalPages > 1 && (
                    <div className="mt-6 lg:mt-8">
                        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 px-4 py-3 lg:px-6 lg:py-4">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                                showItemsInfo={true}
                                totalItems={totalItems}
                                itemsPerPage={itemsPerPage}
                                maxPageNumbersToShow={5}
                            />
                        </div>
                    </div>
                )}

                {/* Detail Modal */}
                {selectedLog && (
                    <Modal isOpen={!!selectedLog} onClose={() => setSelectedLog(null)} title="Detail Log Aktivitas">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* User Info */}
                            <div className="space-y-4">
                                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                                    <h3 className="text-sm font-bold text-blue-900 mb-3 flex items-center space-x-2">
                                        <UserIcon className="w-4 h-4" />
                                        <span>Informasi Pengguna</span>
                                    </h3>
                                    <div className="flex items-center space-x-4 mb-4">
                                        <UserAvatar log={selectedLog} size="lg" />
                                        <div className="flex-1">
                                            <h4 className="text-lg font-bold text-blue-900">{getUserDisplayName(selectedLog)}</h4>
                                            <p className="text-blue-700">@{getUserUsername(selectedLog)}</p>
                                            {selectedLog.user?.role && (
                                                <span className="inline-block mt-1 px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded-full font-medium">
                                                    {selectedLog.user.role}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div>
                                            <label className="text-xs text-blue-700 font-medium">User ID</label>
                                            <p className="text-sm text-blue-800">#{selectedLog.user_id}</p>
                                        </div>
                                        {selectedLog.user?.is_active !== undefined && (
                                            <div>
                                                <label className="text-xs text-blue-700 font-medium">Status</label>
                                                <div className="flex items-center space-x-2 mt-1">
                                                    <div
                                                        className={`w-2 h-2 rounded-full ${
                                                            selectedLog.user.is_active ? 'bg-green-500' : 'bg-red-500'
                                                        }`}
                                                    ></div>
                                                    <span
                                                        className={`text-sm font-medium ${
                                                            selectedLog.user.is_active ? 'text-green-700' : 'text-red-700'
                                                        }`}
                                                    >
                                                        {selectedLog.user.is_active ? 'Aktif' : 'Tidak Aktif'}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Activity Info */}
                            <div className="space-y-4">
                                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                                    <h3 className="text-sm font-bold text-green-900 mb-3 flex items-center space-x-2">
                                        <ClockIcon className="w-4 h-4" />
                                        <span>Detail Aktivitas</span>
                                    </h3>
                                    <div className="space-y-2">
                                        <div>
                                            <label className="text-xs text-green-700 font-medium">Waktu</label>
                                            <p className="text-sm font-semibold text-green-900">
                                                {format(new Date(selectedLog.timestamp), 'dd MMMM yyyy, HH:mm:ss', { locale: id })}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="text-xs text-green-700 font-medium">Aksi</label>
                                            <div className="mt-1">
                                                <span
                                                    className={`inline-flex px-3 py-1 text-xs font-semibold rounded-xl ${getActionBadgeColor(
                                                        selectedLog.action
                                                    )}`}
                                                >
                                                    {selectedLog.action}
                                                </span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs text-green-700 font-medium">Modul</label>
                                            <div className="mt-1">
                                                <span
                                                    className={`inline-flex px-3 py-1 text-xs font-medium rounded-xl border ${getModuleBadgeColor(
                                                        selectedLog.module
                                                    )}`}
                                                >
                                                    {moduleLabel(selectedLog.module)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="mt-6">
                            <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-4 border border-purple-100">
                                <h3 className="text-sm font-bold text-purple-900 mb-3 flex items-center space-x-2">
                                    <DocumentTextIcon className="w-4 h-4" />
                                    <span>Deskripsi Lengkap</span>
                                </h3>
                                <p className="text-sm text-purple-800 leading-relaxed">{selectedLog.description}</p>
                            </div>
                        </div>

                        {/* Technical Info */}
                        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-4 border border-orange-100">
                                <h3 className="text-sm font-bold text-orange-900 mb-2 flex items-center space-x-2">
                                    <ComputerDesktopIcon className="w-4 h-4" />
                                    <span>IP Address</span>
                                </h3>
                                <p className="text-sm font-mono text-orange-800 bg-orange-100 px-2 py-1 rounded-lg">
                                    {selectedLog.ip_address}
                                </p>
                            </div>

                            {selectedLog.record_id && (
                                <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-4 border border-teal-100">
                                    <h3 className="text-sm font-bold text-teal-900 mb-2">Record ID</h3>
                                    <p className="text-sm font-mono text-teal-800 bg-teal-100 px-2 py-1 rounded-lg">#{selectedLog.record_id}</p>
                                </div>
                            )}
                        </div>

                        {/* Log ID */}
                        <div className="mt-6">
                            <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-4 border border-gray-200">
                                <h3 className="text-sm font-bold text-gray-900 mb-2">Log ID</h3>
                                <p className="text-sm font-mono text-gray-700 bg-gray-100 px-2 py-1 rounded-lg">#{selectedLog.id}</p>
                            </div>
                        </div>
                    </Modal>
                )}
            </div>
        </div>
    );
};

export default EnhancedActivityLogsPage;
