// frontend/src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContexts';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/Login';

// Import all your pages
import Dashboard from './pages/Dashboard';
import Produk from './pages/Produk';
import Pembelian from './pages/Pembelian';
import PembelianBeras from './pages/PembelianBeras';
import Produksi from './pages/Produksi';
import Penjualan from './pages/Penjualan';
import JasaGiling from './pages/JasaGiling';
import BiayaOperasional from './pages/BiayaOperasional';
import StokProduk from './pages/StokProduk';
import Karung from './pages/Karung';
import Laporan from './pages/Laporan';
import Kas from './pages/Kas';
import ActivityLogs from "./pages/ActivityLogs";
import Register from './pages/Register';
import HutangPiutang from "./pages/HutangPiutang";
import AkunKas from './pages/AkunKas'; // <-- 1. IMPORT HALAMAN BARU


// ✅ BUAT KOMPONEN BARU UNTUK MENANGANI LOGIKA LOADING
const AppRoutes = () => {
  const { isLoading } = useAuth();

  // Tampilkan loading screen saat sesi sedang diverifikasi
  if (isLoading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-lg font-medium text-gray-700">Memverifikasi sesi...</p>
          </div>
        </div>
    );
  }

  // Setelah loading selesai, tampilkan Routes seperti biasa
  return (
      <Routes>
        {/* Public Route */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={
          <ProtectedRoute requiredRole="OWNER">
            <Register />
          </ProtectedRoute>
        } />


        {/* Protected Routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />

          <Route path="produk" element={
            <ProtectedRoute requiredPermission={{ module: 'produk', action: 'read' }}>
              <Produk />
            </ProtectedRoute>
          } />

          <Route path="pembelian" element={
            <ProtectedRoute requiredPermission={{ module: 'pembelian', action: 'read' }}>
              <Pembelian />
            </ProtectedRoute>
          } />

          <Route path="pembelian-beras" element={
            <ProtectedRoute requiredPermission={{ module: 'pembelian', action: 'read' }}>
              <PembelianBeras />
            </ProtectedRoute>
          } />

          <Route path="produksi" element={
            <ProtectedRoute requiredPermission={{ module: 'produksi', action: 'read' }}>
              <Produksi />
            </ProtectedRoute>
          } />

          <Route path="penjualan" element={
            <ProtectedRoute requiredPermission={{ module: 'penjualan', action: 'read' }}>
              <Penjualan />
            </ProtectedRoute>
          } />

          <Route path="jasa-giling" element={
            <ProtectedRoute requiredPermission={{ module: 'jasa_giling', action: 'read' }}>
              <JasaGiling />
            </ProtectedRoute>
          } />

          <Route path="biaya-operasional" element={
            <ProtectedRoute requiredPermission={{ module: 'biaya_operasional', action: 'read' }}>
              <BiayaOperasional />
            </ProtectedRoute>
          } />

          <Route path="stok" element={
            <ProtectedRoute requiredPermission={{ module: 'stok', action: 'read' }}>
              <StokProduk />
            </ProtectedRoute>
          } />

          <Route path="karung" element={
            <ProtectedRoute requiredPermission={{ module: 'karung', action: 'read' }}>
              <Karung />
            </ProtectedRoute>
          } />

          <Route path="laporan" element={
            <ProtectedRoute requiredPermission={{ module: 'laporan', action: 'read' }}>
              <Laporan />
            </ProtectedRoute>
          } />

          <Route path="kas" element={
            <ProtectedRoute requiredPermission={{ module: 'kas', action: 'read' }}>
              <Kas />
            </ProtectedRoute>
          } />

          <Route path="activity-logs" element={
            <ProtectedRoute requiredRole="OWNER">
              <ActivityLogs />
            </ProtectedRoute>
          } />

          {/* --- TAMBAHKAN RUTE BARU DI SINI --- */}
          <Route path="hutang-piutang" element={
            <ProtectedRoute requiredRole="OWNER"> {/* Atau role lain yang sesuai */}
              <HutangPiutang />
            </ProtectedRoute>
          } />


          {/* --- 2. TAMBAHKAN RUTE BARU DI SINI --- */}
          <Route path="akun-kas" element={
            <ProtectedRoute requiredRole="OWNER"> {/* Atau role lain yang sesuai */}
              <AkunKas />
            </ProtectedRoute>
          } />

        </Route>

        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
  );
}

function App() {
  return (
      <Router>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </Router>
  );
}

export default App;