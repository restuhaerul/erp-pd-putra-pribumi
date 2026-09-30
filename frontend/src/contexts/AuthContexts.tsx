// AuthContexts.tsx - Updated with new ADMIN permissions
import React, { createContext, useContext, useState, useEffect } from 'react';
import * as api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { User } from '../types'

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (username: string, password: string) => Promise<void>;
    logout: () => void;
    hasPermission: (module: string, action: 'create' | 'read' | 'update' | 'delete') => boolean;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const checkUserSession = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const userData = await api.getMe();
                    setUser(userData);
                } catch (error) {
                    console.error("Session restore failed:", error);
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    setUser(null);
                }
            }
            setIsLoading(false);
        };

        checkUserSession();
    }, []);

    const login = async (username: string, password: string) => {
        try {
            const response = await api.login(username, password);
            localStorage.setItem('token', response.token);
            localStorage.setItem('user', JSON.stringify(response.user));
            setUser(response.user);
            navigate('/');
        } catch (error) {
            throw error;
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        navigate('/login');
    };

    // ✅ UPDATED PERMISSIONS - ADMIN permissions direvisi sesuai kebutuhan baru
    const hasPermission = (module: string, action: 'create' | 'read' | 'update' | 'delete'): boolean => {
        if (!user) return false;

        const permissions: Record<string, Record<string, Partial<Record<'create' | 'read' | 'update' | 'delete', boolean>>>> = {
            OWNER: {
                all: { create: true, read: true, update: true, delete: true }
            },
            // ✅ ADMIN PERMISSIONS DIREVISI SESUAI PERMINTAAN TERBARU
            ADMIN: {
                pembelian:   { create: true, read: true },                           // Read dan create
                stok:        { read: true },                                         // Hanya view/read (sudah benar)
                penjualan:   { create: true, read: true, delete: true },            // Read, create dan delete
                jasa_giling: { create: true, read: true },                          // Read dan create
                dashboard:   { read: true },                                        // ✅ TAMBAH: Read produk untuk dropdown
                // Sisanya tidak ada akses (dihapus dari mapping)
            },
            KASIR: {
                penjualan:   { create: true, read: true, update: true, delete: false },
                jasa_giling: { create: true, read: true, update: true, delete: false },
                stok:        { read: true },
                produk:      { read: true },
            },
            GUDANG: {
                pembelian: { create: true, read: true, update: true, delete: false },
                produksi:  { create: true, read: true, update: true, delete: false },
                stok:      { create: true, read: true, update: true, delete: false },
                karung:    { create: true, read: true, update: true, delete: false },
            },
            VIEWER: {
                all: { read: true }
            }
        };

        const rolePerms = permissions[user.role];
        if (!rolePerms) return false;

        // Owner dan Viewer punya akses 'all'
        if (rolePerms.all) {
            return !!rolePerms.all[action];
        }

        // Cek izin spesifik per modul
        const modulePerms = rolePerms[module];
        if (modulePerms) {
            return !!modulePerms[action];
        }

        return false;
    };

    const refreshUser = async () => {
        try {
            const currentUser = await api.getMe();
            setUser(currentUser);
            localStorage.setItem('user', JSON.stringify(currentUser));
        } catch (error) {
            console.error('Failed to refresh user data');
        }
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout, hasPermission, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
};