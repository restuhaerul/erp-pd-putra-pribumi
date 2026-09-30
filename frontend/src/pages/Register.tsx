import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContexts';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import {
    UserIcon,
    LockClosedIcon,
    EyeIcon,
    EyeSlashIcon,
    UserPlusIcon,
    ShieldCheckIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon
} from '@heroicons/react/24/outline';

// API Service untuk register
const registerUser = async (userData: RegisterData) => {
    const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8081'}/api/v1/users`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(userData)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Gagal mendaftarkan user');
    }

    return response.json();
};

interface RegisterData {
    username: string;
    password: string;
    full_name: string;
    role: string;
    is_active: boolean;
}

const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    (window as any).addToast?.(message, type);
};

const RegisterPage = () => {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        confirmPassword: '',
        full_name: '',
        role: 'VIEWER'
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);

    const { user } = useAuth();
    const navigate = useNavigate();

    // Check if user is OWNER
    React.useEffect(() => {
        if (!user || user.role !== 'OWNER') {
            navigate('/');
            showToast('Access denied. Only OWNER can register new users.', 'error');
        }
    }, [user, navigate]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        setError('');
        setSuccess('');
    };

    const validateForm = () => {
        if (!formData.username.trim()) {
            setError('Username harus diisi');
            return false;
        }
        if (formData.username.length < 3) {
            setError('Username minimal 3 karakter');
            return false;
        }
        if (!formData.full_name.trim()) {
            setError('Nama lengkap harus diisi');
            return false;
        }
        if (!formData.password) {
            setError('Password harus diisi');
            return false;
        }
        if (formData.password.length < 6) {
            setError('Password minimal 6 karakter');
            return false;
        }
        if (formData.password !== formData.confirmPassword) {
            setError('Konfirmasi password tidak cocok');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setIsLoading(true);
        setError('');

        try {
            const userData: RegisterData = {
                username: formData.username.trim(),
                password: formData.password,
                full_name: formData.full_name.trim(),
                role: formData.role,
                is_active: true
            };

            await registerUser(userData);

            setSuccess(`User ${formData.username} berhasil didaftarkan!`);
            showToast(`User ${formData.username} berhasil didaftarkan sebagai ${formData.role}!`, 'success');

            // Reset form
            setFormData({
                username: '',
                password: '',
                confirmPassword: '',
                full_name: '',
                role: 'VIEWER'
            });

        } catch (err: any) {
            setError(err.message || 'Gagal mendaftarkan user');
            showToast(err.message || 'Gagal mendaftarkan user', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const roleOptions = [
        { value: 'ADMIN', label: 'Admin', desc: 'Akses penuh kecuali user management' },
        { value: 'KASIR', label: 'Kasir', desc: 'Akses penjualan dan transaksi' },
        { value: 'GUDANG', label: 'Gudang', desc: 'Akses stok dan inventory' },
        { value: 'VIEWER', label: 'Viewer', desc: 'Hanya dapat melihat data' }
    ];

    if (!user || user.role !== 'OWNER') {
        return null;
    }
    console.log("Token:", localStorage.getItem("token"));
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-white relative overflow-hidden">
            {/* Animated Background */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-blue-200/30 to-indigo-200/30 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-r from-indigo-200/20 to-blue-200/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
            </div>

            <div className="relative max-w-4xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                            <UserPlusIcon className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-800 bg-clip-text text-transparent">
                                Register New User
                            </h1>
                            <p className="text-sm text-gray-600">Owner Access Only</p>
                        </div>
                    </div>
                    <div className="w-20 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 mx-auto rounded-full"></div>
                </div>

                {/* Main Form Card */}
                <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-3xl blur-xl transform rotate-1"></div>
                    <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-8">

                        {/* Owner Badge */}
                        <div className="flex items-center justify-between mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200/50">
                            <div className="flex items-center gap-3">
                                <ShieldCheckIcon className="w-6 h-6 text-blue-600" />
                                <div>
                                    <p className="text-sm font-semibold text-blue-900">Authenticated as Owner</p>
                                    <p className="text-xs text-blue-600">{user.full_name} (@{user.username})</p>
                                </div>
                            </div>
                            <button
                                onClick={() => navigate('/')}
                                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                            >
                                ← Back to Dashboard
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Error Message */}
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-sm animate-in slide-in-from-top-2 duration-300">
                                    <div className="flex items-center gap-2">
                                        <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
                                        {error}
                                    </div>
                                </div>
                            )}

                            {/* Success Message */}
                            {success && (
                                <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-2xl text-sm animate-in slide-in-from-top-2 duration-300">
                                    <div className="flex items-center gap-2">
                                        <CheckCircleIcon className="w-5 h-5 flex-shrink-0" />
                                        {success}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Left Column */}
                                <div className="space-y-6">
                                    {/* Username Field */}
                                    <div className="relative group">
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Username
                                        </label>
                                        <div className="relative">
                                            <UserIcon className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                                                focusedField === 'username' ? 'text-blue-500' : 'text-gray-400'
                                            }`} />
                                            <input
                                                type="text"
                                                name="username"
                                                value={formData.username}
                                                onChange={handleInputChange}
                                                onFocus={() => setFocusedField('username')}
                                                onBlur={() => setFocusedField(null)}
                                                disabled={isLoading}
                                                required
                                                className={`w-full pl-12 pr-4 py-4 border-2 rounded-2xl focus:ring-0 focus:outline-none text-sm font-medium transition-all duration-300 ${
                                                    focusedField === 'username'
                                                        ? 'border-blue-500 bg-blue-50/50 shadow-lg shadow-blue-500/20'
                                                        : 'border-gray-200 bg-gray-50/50 hover:border-gray-300'
                                                }`}
                                                placeholder="Enter username (min. 3 characters)"
                                            />
                                            <div className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300 ${
                                                focusedField === 'username' ? 'w-full' : 'w-0'
                                            }`}></div>
                                        </div>
                                    </div>

                                    {/* Full Name Field */}
                                    <div className="relative group">
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Full Name
                                        </label>
                                        <div className="relative">
                                            <UserIcon className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                                                focusedField === 'full_name' ? 'text-blue-500' : 'text-gray-400'
                                            }`} />
                                            <input
                                                type="text"
                                                name="full_name"
                                                value={formData.full_name}
                                                onChange={handleInputChange}
                                                onFocus={() => setFocusedField('full_name')}
                                                onBlur={() => setFocusedField(null)}
                                                disabled={isLoading}
                                                required
                                                className={`w-full pl-12 pr-4 py-4 border-2 rounded-2xl focus:ring-0 focus:outline-none text-sm font-medium transition-all duration-300 ${
                                                    focusedField === 'full_name'
                                                        ? 'border-blue-500 bg-blue-50/50 shadow-lg shadow-blue-500/20'
                                                        : 'border-gray-200 bg-gray-50/50 hover:border-gray-300'
                                                }`}
                                                placeholder="Enter full name"
                                            />
                                            <div className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300 ${
                                                focusedField === 'full_name' ? 'w-full' : 'w-0'
                                            }`}></div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column */}
                                <div className="space-y-6">
                                    {/* Password Field */}
                                    <div className="relative group">
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Password
                                        </label>
                                        <div className="relative">
                                            <LockClosedIcon className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                                                focusedField === 'password' ? 'text-blue-500' : 'text-gray-400'
                                            }`} />
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                name="password"
                                                value={formData.password}
                                                onChange={handleInputChange}
                                                onFocus={() => setFocusedField('password')}
                                                onBlur={() => setFocusedField(null)}
                                                disabled={isLoading}
                                                required
                                                className={`w-full pl-12 pr-12 py-4 border-2 rounded-2xl focus:ring-0 focus:outline-none text-sm font-medium transition-all duration-300 ${
                                                    focusedField === 'password'
                                                        ? 'border-blue-500 bg-blue-50/50 shadow-lg shadow-blue-500/20'
                                                        : 'border-gray-200 bg-gray-50/50 hover:border-gray-300'
                                                }`}
                                                placeholder="Enter password (min. 6 characters)"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500 transition-colors"
                                            >
                                                {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                            </button>
                                            <div className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300 ${
                                                focusedField === 'password' ? 'w-full' : 'w-0'
                                            }`}></div>
                                        </div>
                                    </div>

                                    {/* Confirm Password Field */}
                                    <div className="relative group">
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Confirm Password
                                        </label>
                                        <div className="relative">
                                            <LockClosedIcon className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                                                focusedField === 'confirmPassword' ? 'text-blue-500' : 'text-gray-400'
                                            }`} />
                                            <input
                                                type={showConfirmPassword ? 'text' : 'password'}
                                                name="confirmPassword"
                                                value={formData.confirmPassword}
                                                onChange={handleInputChange}
                                                onFocus={() => setFocusedField('confirmPassword')}
                                                onBlur={() => setFocusedField(null)}
                                                disabled={isLoading}
                                                required
                                                className={`w-full pl-12 pr-12 py-4 border-2 rounded-2xl focus:ring-0 focus:outline-none text-sm font-medium transition-all duration-300 ${
                                                    focusedField === 'confirmPassword'
                                                        ? 'border-blue-500 bg-blue-50/50 shadow-lg shadow-blue-500/20'
                                                        : 'border-gray-200 bg-gray-50/50 hover:border-gray-300'
                                                }`}
                                                placeholder="Confirm password"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500 transition-colors"
                                            >
                                                {showConfirmPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                            </button>
                                            <div className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300 ${
                                                focusedField === 'confirmPassword' ? 'w-full' : 'w-0'
                                            }`}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Role Selection */}
                            <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl p-6 border border-blue-100">
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <ShieldCheckIcon className="w-5 h-5 text-blue-600" />
                                    User Role Selection
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {roleOptions.map((option) => (
                                        <label key={option.value} className="relative cursor-pointer">
                                            <input
                                                type="radio"
                                                name="role"
                                                value={option.value}
                                                checked={formData.role === option.value}
                                                onChange={handleInputChange}
                                                className="sr-only"
                                            />
                                            <div className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                                                formData.role === option.value
                                                    ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-500/20'
                                                    : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/30'
                                            }`}>
                                                <div className="text-center">
                                                    <p className="font-semibold text-gray-900">{option.label}</p>
                                                    <p className="text-xs text-gray-600 mt-1">{option.desc}</p>
                                                    {formData.role === option.value && (
                                                        <CheckCircleIcon className="w-5 h-5 text-blue-600 mx-auto mt-2" />
                                                    )}
                                                </div>
                                            </div>
                                        </label>
                                    ))}
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
                                    {isLoading && <Loader2 className="animate-spin h-5 w-5" />}
                                    <UserPlusIcon className="w-5 h-5" />
                                    {isLoading ? 'Registering User...' : 'Register New User'}
                                </div>

                                {/* Button shine effect */}
                                <div className="absolute inset-0 -top-2 -bottom-2 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {/* Custom CSS */}
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
            `}</style>
        </div>
    );
};

export default RegisterPage;