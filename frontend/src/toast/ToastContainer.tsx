import React, { useState, useCallback } from 'react';
import Toast from './Toast';

export type ToastType = 'success' | 'error' | 'info';

export type ToastMessage = {
  id: number;
  message: string;
  type?: ToastType;
};

const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, type?: ToastType) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Buat global function supaya mudah panggil dari komponen lain
  (window as any).addToast = addToast;

  return (
    // VVV --- BARIS INI YANG DIUBAH --- VVV
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center space-y-2 max-w-xs w-full">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

export default ToastContainer;