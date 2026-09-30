import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';

// Enhanced Pagination Component dengan UI yang dipercantik
interface EnhancedPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  maxPageNumbersToShow?: number;
  showItemsInfo?: boolean;
  totalItems?: number;
  itemsPerPage?: number;
}

const Pagination: React.FC<EnhancedPaginationProps> = ({
                                                                 currentPage,
                                                                 totalPages,
                                                                 onPageChange,
                                                                 maxPageNumbersToShow = 5,
                                                                 showItemsInfo = false,
                                                                 totalItems = 0,
                                                                 itemsPerPage = 5,
                                                               }) => {
  // Jangan tampilkan pagination jika hanya ada satu halaman atau kurang
  if (totalPages <= 1) return null;

  // Logika untuk menentukan rentang nomor halaman yang akan ditampilkan
  const getPageNumbers = (): (number | string)[] => {
    const pageNumbers: (number | string)[] = [];

    // Kasus 1: Jumlah total halaman lebih sedikit atau sama dengan batas maksimal
    if (totalPages <= maxPageNumbersToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    }
    // Kasus 2: Jumlah total halaman lebih banyak, perlu logika elipsis (...)
    else {
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, start + maxPageNumbersToShow - 1);

      if (end - start < maxPageNumbersToShow - 1) {
        start = Math.max(1, end - maxPageNumbersToShow + 1);
      }

      // Selalu tampilkan halaman pertama dan elipsis jika perlu
      if (start > 1) {
        pageNumbers.push(1);
        if (start > 2) pageNumbers.push('...');
      }

      // Tambahkan nomor halaman dalam rentang
      for (let i = start; i <= end; i++) {
        pageNumbers.push(i);
      }

      // Tampilkan elipsis dan halaman terakhir jika perlu
      if (end < totalPages) {
        if (end < totalPages - 1) pageNumbers.push('...');
        pageNumbers.push(totalPages);
      }
    }

    return pageNumbers;
  };

  const pageNumbers = getPageNumbers();

  // Hitung informasi item yang ditampilkan
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 px-4">
        {/* Info Item (Optional) */}
        {showItemsInfo && totalItems > 0 && (
            <div className="text-sm text-gray-600 order-2 sm:order-1">
              Menampilkan <span className="font-medium text-gray-900">{startItem}</span> sampai{' '}
              <span className="font-medium text-gray-900">{endItem}</span> dari{' '}
              <span className="font-medium text-gray-900">{totalItems}</span> item
            </div>
        )}

        {/* Pagination Controls */}
        <nav className="flex items-center justify-center gap-2 order-1 sm:order-2" aria-label="Pagination">
          {/* Tombol Previous */}
          <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <ChevronLeftIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Previous</span>
          </button>

          {/* Tombol Nomor Halaman */}
          <div className="flex items-center gap-1">
            {pageNumbers.map((page, index) =>
                typeof page === 'string' ? (
                    // Elipsis (...)
                    <span
                        key={`ellipsis-${index}`}
                        className="px-3 py-2 text-sm text-gray-400 select-none"
                    >
                {page}
              </span>
                ) : (
                    // Tombol Angka
                    <button
                        key={page}
                        onClick={() => onPageChange(page)}
                        className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 shadow-sm hover:shadow-md ${
                            currentPage === page
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 transform scale-105'
                                : 'bg-white text-gray-600 border border-gray-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 hover:scale-105'
                        }`}
                        aria-current={currentPage === page ? 'page' : undefined}
                    >
                      {page}
                    </button>
                )
            )}
          </div>

          {/* Tombol Next */}
          <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </nav>

        {/* Quick Jump (untuk halaman yang banyak) */}
        {totalPages > 10 && (
            <div className="flex items-center gap-2 text-sm text-gray-600 order-3">
              <span>Jump to:</span>
              <select
                  value={currentPage}
                  onChange={(e) => onPageChange(Number(e.target.value))}
                  className="rounded-lg border border-gray-300 px-3 py-1 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors bg-white"
              >
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <option key={pageNum} value={pageNum}>
                      Page {pageNum}
                    </option>
                ))}
              </select>
            </div>
        )}
      </div>
  );
};

  export default Pagination;