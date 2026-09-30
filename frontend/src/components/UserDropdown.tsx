import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContexts';
import { useNavigate } from 'react-router-dom';
import {
    UserCircleIcon,
    CogIcon,
    ArrowRightOnRectangleIcon,
    ChevronDownIcon,
    UserIcon
} from '@heroicons/react/24/outline';
import EditProfileModal from './EditProfileModal';

const UserDropdown = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const { user, logout } = useAuth();
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const getRoleBadgeColor = (role: string) => {
        // Konsisten dengan theme biru-putih saja
        const colors = {
            OWNER: 'bg-blue-100 text-blue-800',
            ADMIN: 'bg-blue-100 text-blue-700',
            KASIR: 'bg-blue-50 text-blue-700',
            GUDANG: 'bg-blue-50 text-blue-600',
            VIEWER: 'bg-gray-100 text-gray-700',
        };
        return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-700';
    };

    if (!user) return null;

    return (
        <>
            <div className="relative" ref={dropdownRef}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="group flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 transition-all duration-200 border border-transparent hover:border-blue-200"
                >
                    {/* Enhanced Profile Photo or Initials */}
                    <div className="relative flex-shrink-0">
                        {user.photo_url ? (
                            <div className="relative">
                                <img
                                    src={`${process.env.REACT_APP_API_URL || 'http://localhost:8081'}${user.photo_url}`}
                                    alt={user.full_name}
                                    className="w-10 h-10 rounded-xl object-cover border-2 border-blue-200 group-hover:border-blue-300 transition-colors"
                                />
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-600 rounded-full border-2 border-white flex items-center justify-center">
                                    <div className="w-2 h-2 bg-white rounded-full"></div>
                                </div>
                            </div>
                        ) : (
                            <div className="relative">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm group-hover:shadow-md transition-shadow">
                                    {getInitials(user.full_name)}
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-600 rounded-full border-2 border-white flex items-center justify-center">
                                    <div className="w-2 h-2 bg-white rounded-full"></div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Enhanced User Info - Hidden on mobile */}
                    <div className="hidden sm:block text-left min-w-0">
                        <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors truncate">
                            {user.full_name}
                        </p>
                        <p className="text-xs text-gray-500 group-hover:text-blue-600 transition-colors">
                            @{user.username}
                        </p>
                    </div>

                    <ChevronDownIcon className={`w-4 h-4 text-gray-500 group-hover:text-blue-600 transition-all duration-200 ${
                        isOpen ? 'rotate-180' : ''
                    }`} />
                </button>

                {/* Enhanced Dropdown Menu */}
                {isOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 py-2 z-50 transform origin-top-right animate-in slide-in-from-top-2 duration-200">
                        {/* Enhanced User Info Section */}
                        <div className="px-6 py-4 border-b border-gray-100">
                            <div className="flex items-center gap-4">
                                <div className="relative flex-shrink-0">
                                    {user.photo_url ? (
                                        <div className="relative">
                                            <img
                                                src={`${process.env.REACT_APP_API_URL || 'http://localhost:8081'}${user.photo_url}`}
                                                alt={user.full_name}
                                                className="w-14 h-14 rounded-xl object-cover border-2 border-blue-200"
                                            />
                                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-600 rounded-full border-2 border-white flex items-center justify-center">
                                                <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                                {getInitials(user.full_name)}
                                            </div>
                                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-600 rounded-full border-2 border-white flex items-center justify-center">
                                                <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <h3 className="text-base font-bold text-gray-900 truncate">
                                        {user.full_name}
                                    </h3>
                                    <p className="text-sm text-gray-600 mt-0.5">
                                        @{user.username}
                                    </p>
                                    <div className="mt-2">
                                        <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                                            <UserIcon className="w-3 h-3 mr-1" />
                                            {user.role}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Enhanced Menu Items */}
                        <div className="py-2">
                            <button
                                onClick={() => {
                                    setShowEditModal(true);
                                    setIsOpen(false);
                                }}
                                className="group w-full px-6 py-3 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-3 transition-colors duration-200"
                            >
                                <div className="w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                                    <CogIcon className="w-4 h-4 text-gray-500 group-hover:text-blue-600 transition-colors" />
                                </div>
                                <div>
                                    <span className="font-medium">Edit Profile</span>
                                    <p className="text-xs text-gray-500 group-hover:text-blue-600 transition-colors">
                                        Ubah informasi akun Anda
                                    </p>
                                </div>
                            </button>

                            <div className="mx-6 my-2 border-t border-gray-100"></div>

                            <button
                                onClick={handleLogout}
                                className="group w-full px-6 py-3 text-left text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 flex items-center gap-3 transition-colors duration-200"
                            >
                                <div className="w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-red-100 flex items-center justify-center transition-colors">
                                    <ArrowRightOnRectangleIcon className="w-4 h-4 text-gray-500 group-hover:text-red-600 transition-colors" />
                                </div>
                                <div>
                                    <span className="font-medium">Logout</span>
                                    <p className="text-xs text-gray-500 group-hover:text-red-500 transition-colors">
                                        Keluar dari sistem
                                    </p>
                                </div>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Edit Profile Modal */}
            {showEditModal && (
                <EditProfileModal
                    user={user}
                    onClose={() => setShowEditModal(false)}
                />
            )}

            {/* CSS untuk animasi */}
            <style >{`
                @keyframes slide-in-from-top {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .animate-in {
                    animation-fill-mode: both;
                }
                
                .slide-in-from-top-2 {
                    animation-name: slide-in-from-top;
                }
                
                .duration-200 {
                    animation-duration: 200ms;
                }
            `}</style>
        </>
    );
};

export default UserDropdown;