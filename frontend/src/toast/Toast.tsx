import React, { useEffect } from 'react';

type ToastProps = {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  onClose: () => void;
};

const Toast: React.FC<ToastProps> = ({ message, type = 'info', duration = 3000, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  let bgColor = 'bg-blue-500';
  if (type === 'success') bgColor = 'bg-green-500';
  else if (type === 'error') bgColor = 'bg-red-500';

  return (
    <div
      className={`${bgColor} text-white px-4 py-2 rounded shadow-lg mb-2 max-w-sm w-full animate-fade-in-down`}
      role="alert"
    >
      {message}
    </div>
  );
};

export default Toast;
