// ProtectedRoute.tsx - Updated untuk menangani permissions yang lebih strict
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContexts';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredRole?: 'OWNER' | 'ADMIN' | 'KASIR' | 'GUDANG' | 'VIEWER';
    requiredPermission?: {
        module: string;
        action: 'create' | 'read' | 'update' | 'delete';
    };
    allowedRoles?: ('OWNER' | 'ADMIN' | 'KASIR' | 'GUDANG' | 'VIEWER')[]; // ✅ TAMBAHAN: untuk multiple roles
}

const ProtectedRoute = ({
                            children,
                            requiredRole,
                            requiredPermission,
                            allowedRoles
                        }: ProtectedRouteProps) => {
    const { user, hasPermission } = useAuth();
    const location = useLocation();

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // ✅ PENGECEKAN MULTIPLE ROLES
    if (allowedRoles && allowedRoles.length > 0) {
        if (!allowedRoles.includes(user.role)) {
            alert(
                `Akses Ditolak!\n\nHalaman ini hanya bisa diakses oleh user dengan role: ${allowedRoles.join(', ')}.`
            );
            return <Navigate to="/" replace />;
        }
    }

    // 1. Pengecekan berdasarkan Role tunggal
    if (requiredRole && user.role !== requiredRole) {
        alert(
            `Akses Ditolak!\n\nHalaman ini hanya bisa diakses oleh user dengan role '${requiredRole}'.`
        );
        return <Navigate to="/" replace />;
    }

    // 2. Pengecekan berdasarkan Izin per Modul
    if (requiredPermission && !hasPermission(requiredPermission.module, requiredPermission.action)) {
        alert(
            `Akses Ditolak!\n\nAnda tidak memiliki izin untuk '${requiredPermission.action}' pada modul '${requiredPermission.module}'.`
        );
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;