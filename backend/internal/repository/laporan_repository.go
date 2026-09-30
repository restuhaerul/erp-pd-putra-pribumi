package repository

import (
	"gorm.io/gorm"
	"putra-pribumi/internal/model"
	"time"
)

// Struct untuk menampung hasil query rincian
type RincianGrup struct {
	Nama  string  `json:"nama"`
	Total float64 `json:"total"`
}

type RepositoryLaporan interface {
	GetTotalPemasukan(startDate, endDate time.Time) (float64, error)
	GetTotalBiayaBahanBaku(startDate, endDate time.Time) (float64, error)
	GetTotalBiayaOperasional(startDate, endDate time.Time) (float64, error)
	// --- TAMBAHAN FUNGSI BARU ---
	GetRincianPemasukan(startDate, endDate time.Time) ([]RincianGrup, error)
	GetRincianPengeluaranOperasional(startDate, endDate time.Time) ([]RincianGrup, error)
}

type laporanRepository struct {
	db *gorm.DB
}

func NewLaporanRepository(db *gorm.DB) *laporanRepository {
	return &laporanRepository{db}
}

// GetTotalPemasukan sekarang menghitung dari DUA sumber
func (r *laporanRepository) GetTotalPemasukan(startDate, endDate time.Time) (float64, error) {
	var totalPenjualan float64
	err := r.db.Model(&model.TransaksiPenjualan{}).
		Where("tgl_transaksi BETWEEN ? AND ?", startDate, endDate).
		Select("COALESCE(sum(jumlah_kg * harga_jual_per_kg), 0)").
		Row().
		Scan(&totalPenjualan)
	if err != nil {
		return 0, err
	}

	var totalJasaTunai float64
	err = r.db.Model(&model.TransaksiJasaGiling{}).
		Where("tanggal BETWEEN ? AND ?", startDate, endDate).
		Where("tipe_pembayaran = ?", "TUNAI").
		Select("COALESCE(sum(jumlah_pembayaran_tunai), 0)").
		Row().
		Scan(&totalJasaTunai)
	if err != nil {
		return 0, err
	}

	return totalPenjualan + totalJasaTunai, nil
}

// ... (GetTotalBiayaBahanBaku dan GetTotalBiayaOperasional tidak berubah) ...
func (r *laporanRepository) GetTotalBiayaBahanBaku(startDate, endDate time.Time) (float64, error) {
	var totalBiayaBahanBaku float64
	err := r.db.Model(&model.BatchPembelian{}).
		Where("tgl_pembelian BETWEEN ? AND ?", startDate, endDate).
		Select("COALESCE(sum(total_harga), 0)").
		Row().
		Scan(&totalBiayaBahanBaku)
	return totalBiayaBahanBaku, err
}

func (r *laporanRepository) GetTotalBiayaOperasional(startDate, endDate time.Time) (float64, error) {
	var totalBiayaOperasional float64
	err := r.db.Model(&model.BiayaOperasional{}).
		Where("tanggal BETWEEN ? AND ?", startDate, endDate).
		Select("COALESCE(sum(jumlah), 0)").
		Row().
		Scan(&totalBiayaOperasional)
	return totalBiayaOperasional, err
}

// --- FUNGSI BARU: GetRincianPemasukan ---
func (r *laporanRepository) GetRincianPemasukan(startDate, endDate time.Time) ([]RincianGrup, error) {
	var rincian []RincianGrup

	// 1. Ambil dari Penjualan Produk (dikelompokkan berdasarkan nama produk)
	err := r.db.Model(&model.TransaksiPenjualan{}).
		Joins("JOIN produk ON produk.id = transaksi_penjualan.produk_id").
		Where("transaksi_penjualan.tgl_transaksi BETWEEN ? AND ?", startDate, endDate).
		Group("produk.nama_produk").
		Select("produk.nama_produk as nama, SUM(transaksi_penjualan.jumlah_kg * transaksi_penjualan.harga_jual_per_kg) as total").
		Scan(&rincian).Error
	if err != nil {
		return nil, err
	}

	// 2. Ambil dari Jasa Giling (hanya yang tunai)
	var totalJasaGiling float64
	err = r.db.Model(&model.TransaksiJasaGiling{}).
		Where("tanggal BETWEEN ? AND ?", startDate, endDate).
		Where("tipe_pembayaran = ?", "TUNAI").
		Select("COALESCE(SUM(jumlah_pembayaran_tunai), 0)").
		Row().Scan(&totalJasaGiling)
	if err != nil {
		return nil, err
	}

	// Tambahkan Jasa Giling ke rincian jika ada
	if totalJasaGiling > 0 {
		rincian = append(rincian, RincianGrup{Nama: "Jasa Giling", Total: totalJasaGiling})
	}

	return rincian, nil
}

// --- FUNGSI BARU: GetRincianPengeluaranOperasional ---
func (r *laporanRepository) GetRincianPengeluaranOperasional(startDate, endDate time.Time) ([]RincianGrup, error) {
	var rincian []RincianGrup
	err := r.db.Model(&model.BiayaOperasional{}).
		Where("tanggal BETWEEN ? AND ?", startDate, endDate).
		Group("kategori").
		Select("kategori as nama, SUM(jumlah) as total").
		Scan(&rincian).Error
	return rincian, err
}
