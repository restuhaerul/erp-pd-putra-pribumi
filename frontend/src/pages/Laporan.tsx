import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as api from '../services/api';
import { LaporanKeuangan } from '../types';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Warna-warni untuk grafik
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1943'];

// Komponen helper untuk menampilkan rincian dalam bentuk tabel
const RincianTable = ({ title, data, colorClass }: { title: string, data: {nama: string, total: number}[], colorClass: string }) => (
    <div>
        <h3 className={`text-lg font-medium text-gray-700 border-b pb-2 mb-4`}>{title}</h3>
        <div className="space-y-3">
            {data.map((item, index) => (
                <div key={index} className="flex justify-between items-center">
                    <div className="flex items-center">
                        <span className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                        <span className="text-gray-600">{item.nama}</span>
                    </div>
                    <span className={`font-semibold ${colorClass}`}>Rp {item.total.toLocaleString('id-ID')}</span>
                </div>
            ))}
             {data.length === 0 && <p className="text-sm text-gray-400">Tidak ada data.</p>}
        </div>
    </div>
);

const LaporanPage = () => {
  const [laporan, setLaporan] = useState<LaporanKeuangan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [bulan, setBulan] = useState(new Date().getMonth() + 1);

  const showToast = (message: string, type: 'error' = 'error') => {
    (window as any).addToast?.(message, type);
  };

  const fetchData = useCallback(async (b: number, t: number) => {
    try {
      setIsLoading(true);
      const laporanData = await api.getLaporanBulanan(b, t);
      setLaporan(laporanData);
      setError(null);
    } catch (err: any) {
      const msg = err.message || "Gagal memuat data laporan.";
      showToast(msg);
      setError(msg);
      setLaporan(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(bulan, tahun);
  }, [bulan, tahun, fetchData]);
  
  const tahunOptions = useMemo(() => {
    const tahunSekarang = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => tahunSekarang - i);
  }, []);

  const formatRupiah = (angka: number) => `Rp ${angka.toLocaleString('id-ID')}`;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Laporan Keuangan Bulanan</h1>

      <div className="flex items-center gap-4 mb-8 p-4 bg-white rounded-lg shadow-md">
        <div>
          <label htmlFor="bulan-select" className="block text-sm font-medium text-gray-700">Bulan</label>
          <select id="bulan-select" value={bulan} onChange={e => setBulan(parseInt(e.target.value))} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm py-2 px-3">
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('id-ID', { month: 'long' })}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="tahun-select" className="block text-sm font-medium text-gray-700">Tahun</label>
          <select id="tahun-select" value={tahun} onChange={e => setTahun(parseInt(e.target.value))} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm py-2 px-3">
            {tahunOptions.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {isLoading && <div className="p-6 text-center">Memuat data laporan...</div>}
      {error && <div className="p-6 text-center text-red-500">Error: {error}</div>}
      
      {!isLoading && !error && laporan && (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-green-100 p-6 rounded-lg shadow"><h3 className="text-lg font-medium text-green-800">Total Pemasukan</h3><p className="text-3xl font-bold text-green-600 mt-2">{formatRupiah(laporan.total_pemasukan)}</p></div>
                <div className="bg-red-100 p-6 rounded-lg shadow"><h3 className="text-lg font-medium text-red-800">Total Pengeluaran</h3><p className="text-3xl font-bold text-red-600 mt-2">{formatRupiah(laporan.total_pengeluaran)}</p></div>
                <div className={`${laporan.laba_bersih >= 0 ? 'bg-blue-100' : 'bg-orange-100'} p-6 rounded-lg shadow`}><h3 className={`text-lg font-medium ${laporan.laba_bersih >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>Laba / Rugi Bersih</h3><p className={`text-3xl font-bold ${laporan.laba_bersih >= 0 ? 'text-blue-600' : 'text-orange-600'} mt-2`}>{formatRupiah(laporan.laba_bersih)}</p></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Kolom Pemasukan */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800">Rincian Pemasukan</h2>
                    <div style={{ width: '100%', height: 250 }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie data={laporan.rincian_pemasukan} dataKey="total" nameKey="nama" cx="50%" cy="50%" outerRadius={80} label>
                                    {laporan.rincian_pemasukan.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                                </Pie>
                                <Tooltip formatter={(value: number) => formatRupiah(value)}/>
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-6 border-t pt-4">
                        <RincianTable title="Detail Pemasukan" data={laporan.rincian_pemasukan} colorClass="text-green-600" />
                    </div>
                </div>
                {/* Kolom Pengeluaran */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800">Rincian Pengeluaran</h2>
                    <div style={{ width: '100%', height: 250 }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie data={laporan.rincian_pengeluaran} dataKey="total" nameKey="nama" cx="50%" cy="50%" outerRadius={80} label>
                                    {laporan.rincian_pengeluaran.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                                </Pie>
                                <Tooltip formatter={(value: number) => formatRupiah(value)}/>
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-6 border-t pt-4">
                        <RincianTable title="Detail Pengeluaran" data={laporan.rincian_pengeluaran} colorClass="text-red-600" />
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default LaporanPage;