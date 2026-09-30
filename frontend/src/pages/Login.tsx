import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContexts';
import {Link, Navigate, useNavigate} from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { EyeIcon, EyeSlashIcon, UserIcon, LockClosedIcon } from '@heroicons/react/24/outline';

const LoginPage = () => {

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const { login, user } = useAuth();
    const navigate = useNavigate();

    // Jika objek 'user' ada (tidak null), berarti pengguna sudah login.
    // Alihkan mereka ke halaman utama ('/').
    if (user) {
        return <Navigate to="/" replace />;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await login(username, password);
        } catch (err: any) {
            setError(err.message || 'Login gagal. Silakan coba lagi.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-white relative overflow-hidden flex items-center justify-center px-4">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-blue-200/30 to-indigo-200/30 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-r from-indigo-200/20 to-blue-200/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
                <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-blue-300/20 rounded-full blur-2xl animate-float"></div>
                <div className="absolute bottom-1/3 right-1/3 w-24 h-24 bg-indigo-300/20 rounded-full blur-xl animate-float" style={{animationDelay: '2s'}}></div>
            </div>

            {/* Login Card */}
            <div className="relative w-full max-w-md">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-3xl blur-xl transform rotate-1"></div>
                <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-8 transform transition-all duration-500 hover:scale-[1.02]">

                    {/* Header with Logo */}
                    <div className="text-center mb-8">
                        <div className="relative inline-block mb-4">
                            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg transform transition-all duration-300 hover:rotate-3">
                                <span className="text-white font-bold text-2xl">PR</span>
                            </div>
                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-400 rounded-full animate-ping"></div>
                        </div>

                        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-800 bg-clip-text text-transparent mb-2">
                            Putra Pribumi
                        </h1>
                        <p className="text-gray-600">Rice Mill Management System</p>
                        <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 mx-auto mt-3 rounded-full"></div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-sm text-center animate-in slide-in-from-top-2 duration-300">
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 bg-red-500 rounded-full flex-shrink-0"></div>
                                    {error}
                                </div>
                            </div>
                        )}

                        {/* Username Field */}
                        <div className="relative group">
                            <label className="block text-sm font-semibold text-gray-700 mb-2 transition-colors group-focus-within:text-blue-600">
                                Username
                            </label>
                            <div className="relative">
                                <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 ${
                                    focusedField === 'username' ? 'text-blue-500' : 'text-gray-400'
                                }`}>
                                    <UserIcon className="w-5 h-5" />
                                </div>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    onFocus={() => setFocusedField('username')}
                                    onBlur={() => setFocusedField(null)}
                                    disabled={isLoading}
                                    required
                                    className={`w-full pl-12 pr-4 py-4 border-2 rounded-2xl focus:ring-0 focus:outline-none text-sm font-medium transition-all duration-300 ${
                                        focusedField === 'username'
                                            ? 'border-blue-500 bg-blue-50/50 shadow-lg shadow-blue-500/20'
                                            : 'border-gray-200 bg-gray-50/50 hover:border-gray-300'
                                    }`}
                                    placeholder="Masukkan username Anda"
                                />
                                <div className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300 ${
                                    focusedField === 'username' ? 'w-full' : 'w-0'
                                }`}></div>
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="relative group">
                            <label className="block text-sm font-semibold text-gray-700 mb-2 transition-colors group-focus-within:text-blue-600">
                                Password
                            </label>
                            <div className="relative">
                                <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 ${
                                    focusedField === 'password' ? 'text-blue-500' : 'text-gray-400'
                                }`}>
                                    <LockClosedIcon className="w-5 h-5" />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onFocus={() => setFocusedField('password')}
                                    onBlur={() => setFocusedField(null)}
                                    disabled={isLoading}
                                    required
                                    className={`w-full pl-12 pr-12 py-4 border-2 rounded-2xl focus:ring-0 focus:outline-none text-sm font-medium transition-all duration-300 ${
                                        focusedField === 'password'
                                            ? 'border-blue-500 bg-blue-50/50 shadow-lg shadow-blue-500/20'
                                            : 'border-gray-200 bg-gray-50/50 hover:border-gray-300'
                                    }`}
                                    placeholder="Masukkan password Anda"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500 transition-colors"
                                >
                                    {showPassword ? (
                                        <EyeSlashIcon className="w-5 h-5" />
                                    ) : (
                                        <EyeIcon className="w-5 h-5" />
                                    )}
                                </button>
                                <div className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300 ${
                                    focusedField === 'password' ? 'w-full' : 'w-0'
                                }`}></div>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`group relative w-full flex items-center justify-center gap-3 py-4 px-6 text-white text-sm font-bold rounded-2xl transition-all duration-300 transform ${
                                isLoading
                                    ? 'bg-blue-400 cursor-not-allowed scale-95'
                                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/25'
                            }`}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-indigo-700 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="relative flex items-center gap-3">
                                {isLoading && (
                                    <Loader2 className="animate-spin h-5 w-5" />
                                )}
                                {isLoading ? 'Sedang masuk...' : 'Masuk ke Dashboard'}
                            </div>

                            {/* Button shine effect */}
                            <div className="absolute inset-0 -top-2 -bottom-2 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="mt-8 text-center">
                        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                            <p className="text-xs font-semibold text-blue-700 mb-2">
                                <Link to="/register">Belum Punya Akun? Silahkan Daftar</Link>
                            </p>

                        </div>
                    </div>
                </div>
            </div>

            {/* Custom Animations CSS */}
            <style >{`
                @keyframes float {
                    0%, 100% {
                        transform: translateY(0px) rotate(0deg);
                    }
                    33% {
                        transform: translateY(-10px) rotate(1deg);
                    }
                    66% {
                        transform: translateY(-5px) rotate(-1deg);
                    }
                }

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

                .animate-float {
                    animation: float 6s ease-in-out infinite;
                }

                .animate-in {
                    animation-fill-mode: both;
                }

                .slide-in-from-top-2 {
                    animation-name: slide-in-from-top;
                }

                /* Custom scrollbar if needed */
                * {
                    scrollbar-width: thin;
                    scrollbar-color: #3B82F6 #E5E7EB;
                }

                *::-webkit-scrollbar {
                    width: 4px;
                }

                *::-webkit-scrollbar-track {
                    background: #E5E7EB;
                }

                *::-webkit-scrollbar-thumb {
                    background: #3B82F6;
                    border-radius: 2px;
                }
            `}</style>
        </div>
    );
};

export default LoginPage;