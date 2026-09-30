import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import UserDropdown from './UserDropdown';
import {
    FaHome,
    FaBoxOpen,
    FaCashRegister,
    FaWarehouse,
    FaTools,
    FaMoneyBillWave,
    FaChartBar,
    FaShoppingBag,
    FaShoppingCart,
    FaHistory,
    FaBook,
    FaWallet,
} from 'react-icons/fa';
import { GiWheat } from 'react-icons/gi';
import { FaBowlFood } from 'react-icons/fa6';
import { XMarkIcon, Bars3Icon } from '@heroicons/react/24/solid';

const navLinks = [
    { to: '/', label: 'Dashboard', icon: <FaHome /> },
    { to: '/produk', label: 'Produk', icon: <FaBoxOpen /> },
    { to: '/stok', label: 'Stok Gudang', icon: <FaWarehouse /> },
    { to: '/karung', label: 'Pembelian Karung', icon: <FaShoppingBag /> },
    { to: '/pembelian', label: 'Pembelian Gabah', icon: <GiWheat /> },
    { to: '/pembelian-beras', label: 'Pembelian Beras', icon: <FaBowlFood /> },
    { to: '/produksi', label: 'Produksi', icon: <FaTools /> },
    { to: '/penjualan', label: 'Penjualan', icon: <FaCashRegister /> },
    { to: '/jasa-giling', label: 'Jasa Giling', icon: <FaTools /> },
    { to: '/biaya-operasional', label: 'Biaya Operasional', icon: <FaShoppingCart /> },
    { to: '/kas', label: 'Kas Pemasukan', icon: <FaMoneyBillWave /> },
    { to: '/laporan', label: 'Laporan', icon: <FaChartBar /> },
    { to: '/activity-logs', label: 'Log Aktivitas', icon: <FaHistory />, roleRequired: 'OWNER' as const },
    { to: '/hutang-piutang', label: 'Buku Hutang/Piutang', icon: <FaBook /> },
    { to: '/akun-kas', label: 'Master Akun Kas', icon: <FaWallet /> },
];

type NavItem = (typeof navLinks)[number];

type NavLinkProps = {
    link: NavItem;
    isActive: boolean;
    onClick?: () => void;
};

const NavLink = ({ link, isActive, onClick }: NavLinkProps) => (
    <Link
        to={link.to}
        onClick={onClick}
        className={`group relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm ${
            isActive
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50'
        }`}
    >
        {/* Active bar on the left */}
        <span
            className={`absolute left-0 top-2 bottom-2 w-1 rounded-full transition-all duration-200 ${
                isActive ? 'bg-white' : 'bg-transparent group-hover:bg-blue-200'
            }`}
        />

        {/* Icon */}
        <div
            className={`flex items-center justify-center w-8 h-8 rounded-lg text-lg transition-all duration-200 ${
                isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-700'
            }`}
        >
            {link.icon}
        </div>

        {/* Label */}
        <span className="font-medium truncate">{link.label}</span>

        {/* Active dot */}
        {isActive && (
            <span className="ml-auto w-2 h-2 rounded-full bg-white/90 shadow-sm shadow-blue-200" />
        )}
    </Link>
);

export default function Layout() {
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const location = useLocation();
    const navigate = useNavigate();

    // cari label halaman aktif
    const activeNav = navLinks.find((link) => link.to === location.pathname);
    const activeLabel = activeNav?.label || 'Dashboard';

    // Tampilkan toast kalau ada accessError di state route
    useEffect(() => {
        if (location.state && (location.state as any).accessError) {
            const msg = (location.state as any).accessError;
            (window as any).addToast?.(msg, 'error');
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location, navigate]);

    return (
        <div className="relative min-h-screen flex bg-slate-50 text-slate-900">
            {/* Mobile overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* SIDEBAR */}
            <aside
                className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 shadow-xl flex flex-col transform transition-transform duration-300 ease-out ${
                    isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
                }`}
            >
                {/* Brand */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-sky-400 flex items-center justify-center shadow-md shadow-blue-500/30">
                            <span className="text-white font-extrabold text-lg tracking-tight">PR</span>
                            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-white" />
                        </div>
                        <div className="leading-tight">
                            <p className="text-sm font-semibold text-slate-900">Putra Pribumi</p>
                            <p className="text-xs text-slate-500">Rice Mill ERP</p>
                        </div>
                    </div>

                    {/* Close button (mobile) */}
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="md:hidden p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                        aria-label="Tutup sidebar"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Navigation */}
                <div className="flex-1 overflow-y-auto py-4 sidebar-scroll">
                    <nav className="px-4 space-y-3">
                        <div className="px-2">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                Navigasi
                            </p>
                        </div>

                        <ul className="space-y-1">
                            {navLinks.map((link) => (
                                <li key={link.to}>
                                    <NavLink
                                        link={link}
                                        isActive={location.pathname === link.to}
                                        onClick={() => {
                                            // auto tutup sidebar di mobile
                                            if (window.innerWidth < 768) {
                                                setSidebarOpen(false);
                                            }
                                        }}
                                    />
                                </li>
                            ))}
                        </ul>
                    </nav>
                </div>

                {/* Footer sidebar kecil */}
                <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/60">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-medium">Putra Pribumi System</span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-200/60 text-slate-700 font-semibold">
              v1.0
            </span>
                    </div>
                </div>

                {/* Custom scrollbar style */}
                <style>{`
          .sidebar-scroll::-webkit-scrollbar {
            width: 5px;
          }
          .sidebar-scroll::-webkit-scrollbar-track {
            background: transparent;
          }
          .sidebar-scroll::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 999px;
          }
          .sidebar-scroll::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
        `}</style>
            </aside>

            {/* MAIN AREA */}
            <div
                className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-out ${
                    isSidebarOpen ? 'md:ml-64' : 'md:ml-64 md:translate-x-0'
                }`}
            >
                {/* HEADER */}
                <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
                    <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            {/* Hamburger */}
                            <button
                                onClick={() => setSidebarOpen((prev) => !prev)}
                                className="inline-flex md:hidden items-center justify-center p-2 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                aria-label="Toggle sidebar"
                            >
                                <Bars3Icon className="w-6 h-6" />
                            </button>

                            {/* Breadcrumb + page chip */}
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <span>Putra Pribumi</span>
                                    <span className="w-1 h-1 rounded-full bg-slate-400" />
                                    <span className="capitalize">
                    {location.pathname === '/' ? 'dashboard' : activeLabel.toLowerCase()}
                  </span>
                                </div>
                                <div className="mt-1 inline-flex items-center gap-2">
                  <span className="text-sm sm:text-base font-semibold text-slate-900">
                    {activeLabel}
                  </span>
                                    <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Aktif
                  </span>
                                </div>
                            </div>
                        </div>

                        {/* Right header section */}
                        <div className="flex items-center gap-3">
                            {/* Small quick info (hidden on very small) */}
                            <div className="hidden sm:flex flex-col items-end text-[11px] text-slate-500">
                <span className="font-medium">
                  {new Date().toLocaleDateString('id-ID', {
                      weekday: 'short',
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                  })}
                </span>
                                <span className="text-[10px] text-slate-400">
                  {new Date().toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                  })}{' '}
                                    WIB
                </span>
                            </div>
                            {/* User dropdown */}
                            <UserDropdown />
                        </div>
                    </div>
                </header>

                {/* CONTENT */}
                <main className="flex-1">
                    {/* Background band for depth */}
                    <div className="bg-gradient-to-b from-slate-50 to-slate-100/60 min-h-screen">
                        <div className="px-3 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8">
                            <div className="max-w-7xl mx-auto">
                                {/* Optional top info banner on mobile */}
                                <div className="mb-4 md:hidden">
                                    <div className="rounded-2xl bg-white border border-slate-200/80 px-4 py-3 shadow-sm flex items-center justify-between gap-3">
                                        <div className="text-xs text-slate-600">
                                            <p className="font-semibold text-slate-800">{activeLabel}</p>
                                            <p className="text-[11px] text-slate-500">
                                                Geser dari kiri untuk membuka menu.
                                            </p>
                                        </div>
                                        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                                            <Bars3Icon className="w-4 h-4" />
                                        </div>
                                    </div>
                                </div>

                                {/* Real page content */}
                                <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80">
                                    <div className="p-4 sm:p-6 md:p-8">
                                        <Outlet />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
