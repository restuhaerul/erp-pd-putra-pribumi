import React, { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, CameraIcon } from '@heroicons/react/24/outline';
import * as api from '../services/api';
import { useAuth} from "../contexts/AuthContexts";

interface EditProfileModalProps {
    user: any;
    onClose: () => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ user, onClose }) => {
    const [fullName, setFullName] = useState(user.full_name);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const { refreshUser } = useAuth();

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        (window as any).addToast?.(message, type);
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                showToast('Ukuran file maksimal 2MB', 'error');
                return;
            }

            setPhotoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            // Hanya update nama jika berubah
            if (fullName !== user.full_name) {
                await api.updateProfile(fullName);
            }

            // Upload photo hanya jika ada file baru
            if (photoFile) {
                const formData = new FormData();
                formData.append('photo', photoFile);
                await api.uploadProfilePhoto(formData);
            }

            // Change password if provided
            if (oldPassword && newPassword) {
                if (newPassword !== confirmPassword) {
                    setError('Password baru tidak cocok');
                    setIsLoading(false);
                    return;
                }

                if (newPassword.length < 6) {
                    setError('Password minimal 6 karakter');
                    setIsLoading(false);
                    return;
                }

                await api.changePassword(oldPassword, newPassword);
            }

            showToast('Profile berhasil diupdate', 'success');

            // Refresh user data
            await refreshUser();

            // Close modal
            onClose();

        } catch (err: any) {
            setError(err.message || 'Gagal update profile');
            showToast(err.message || 'Gagal update profile', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <Transition appear show={true} as={Fragment}>
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
                    <div className="fixed inset-0 bg-black bg-opacity-50" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-xl bg-white p-4 sm:p-6 text-left align-middle shadow-2xl transition-all mx-4">
                                <Dialog.Title as="h3" className="text-xl font-semibold leading-6 text-gray-900">
                                    Edit Profile
                                </Dialog.Title>
                                <button
                                    onClick={onClose}
                                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                                >
                                    <XMarkIcon className="w-6 h-6" />
                                </button>

                                <form onSubmit={handleSubmit} className="mt-6 space-y-6">
                                    {error && (
                                        <div className="rounded-md bg-red-50 p-3">
                                            <p className="text-sm text-red-800">{error}</p>
                                        </div>
                                    )}

                                    {/* Photo Upload */}
                                    <div className="flex flex-col items-center">
                                        <div className="relative">
                                            {photoPreview || user.photo_url ? (
                                                <img
                                                    src={photoPreview || `${process.env.REACT_APP_API_URL || 'http://localhost:8081'}${user.photo_url}`}
                                                    alt="Profile"
                                                    className="w-24 h-24 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-24 h-24 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-2xl">
                                                    {getInitials(fullName)}
                                                </div>
                                            )}
                                            <label
                                                htmlFor="photo-upload"
                                                className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-2 cursor-pointer hover:bg-blue-700 transition-colors"
                                            >
                                                <CameraIcon className="w-4 h-4 text-white" />
                                                <input
                                                    id="photo-upload"
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handlePhotoChange}
                                                    className="hidden"
                                                />
                                            </label>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2">JPG atau PNG. Max 2MB</p>
                                    </div>

                                    {/* Full Name */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            Nama Lengkap
                                        </label>
                                        <input
                                            type="text"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm py-2 px-3"
                                            required
                                        />
                                    </div>

                                    {/* Change Password Section */}
                                    <div className="space-y-4 border-t pt-4">
                                        <h4 className="text-sm font-medium text-gray-900">Ubah Password (Opsional)</h4>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">
                                                Password Lama
                                            </label>
                                            <input
                                                type="password"
                                                value={oldPassword}
                                                onChange={(e) => setOldPassword(e.target.value)}
                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm py-2 px-3"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">
                                                Password Baru
                                            </label>
                                            <input
                                                type="password"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm py-2 px-3"
                                                disabled={!oldPassword}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">
                                                Konfirmasi Password Baru
                                            </label>
                                            <input
                                                type="password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm py-2 px-3"
                                                disabled={!oldPassword || !newPassword}
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-6 flex justify-end gap-3">
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                                        >
                                            Batal
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className={`inline-flex justify-center rounded-md border border-transparent py-2 px-4 text-sm font-medium text-white shadow-sm ${
                                                isLoading
                                                    ? 'bg-gray-400 cursor-not-allowed'
                                                    : 'bg-blue-600 hover:bg-blue-700'
                                            }`}
                                        >
                                            {isLoading ? 'Menyimpan...' : 'Simpan'}
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

export default EditProfileModal;