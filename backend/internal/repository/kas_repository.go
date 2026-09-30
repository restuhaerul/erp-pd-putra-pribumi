package repository

import (
	"putra-pribumi/internal/model"
	"time"

	"gorm.io/gorm"
)

type KasPenjualan struct {
	Tanggal        time.Time `json:"tanggal"`
	JumlahKg       float64   `json:"jumlah_kg"`
	TotalPemasukan float64   `json:"total_pemasukan"`
	NamaProduk     string    `json:"nama_produk"`
	NamaPelanggan  string    `json:"nama_pelanggan"`
	TransaksiID    uint      `json:"transaksi_id"`
}

type KasJasaGiling struct {
	Tanggal        time.Time `json:"tanggal"`
	TipeJasa       string    `json:"tipe_jasa"`
	TipePembayaran string    `json:"tipe_pembayaran"`
	TotalPemasukan float64   `json:"total_pemasukan"`
	NamaPelanggan  string    `json:"nama_pelanggan"`
	TransaksiID    uint      `json:"transaksi_id"`
}

type RingkasanKas struct {
	TotalPenjualan   float64 `json:"total_penjualan"`
	TotalJasaGiling  float64 `json:"total_jasa_giling"`
	TotalKeseluruhan float64 `json:"total_keseluruhan"`
}

type RepositoryKas interface {
	GetKasPenjualan(startDate, endDate time.Time) ([]KasPenjualan, error)
	GetKasJasaGiling(startDate, endDate time.Time) ([]KasJasaGiling, error)
	GetRingkasanKas(startDate, endDate time.Time) (RingkasanKas, error)
}

type kasRepository struct {
	db *gorm.DB
}

func NewKasRepository(db *gorm.DB) *kasRepository {
	return &kasRepository{db}
}

func (r *kasRepository) GetKasPenjualan(startDate, endDate time.Time) ([]KasPenjualan, error) {
	var result []KasPenjualan
	err := r.db.Table("transaksi_penjualan").
		Select(`
            transaksi_penjualan.tgl_transaksi as tanggal,
            transaksi_penjualan.jumlah_kg,
            (transaksi_penjualan.jumlah_kg * transaksi_penjualan.harga_jual_per_kg) as total_pemasukan,
            produk.nama_produk,
            transaksi_penjualan.nama_pelanggan,
            transaksi_penjualan.id as transaksi_id
        `).
		Joins("JOIN produk ON produk.id = transaksi_penjualan.produk_id").
		Where("transaksi_penjualan.tgl_transaksi BETWEEN ? AND ?", startDate, endDate).
		Order("transaksi_penjualan.tgl_transaksi DESC").
		Scan(&result).Error
	return result, err
}

func (r *kasRepository) GetKasJasaGiling(startDate, endDate time.Time) ([]KasJasaGiling, error) {
	var result []KasJasaGiling
	err := r.db.Table("transaksi_jasa_giling").
		Select(`
            tanggal,
            tipe_jasa_giling as tipe_jasa,
            tipe_pembayaran,
            CASE 
                WHEN tipe_pembayaran = 'TUNAI' THEN jumlah_pembayaran_tunai
                ELSE 0
            END as total_pemasukan,
            nama_pelanggan,
            id as transaksi_id
        `).
		Where("tanggal BETWEEN ? AND ?", startDate, endDate).
		Order("tanggal DESC").
		Scan(&result).Error
	return result, err
}

func (r *kasRepository) GetRingkasanKas(startDate, endDate time.Time) (RingkasanKas, error) {
	var ringkasan RingkasanKas

	// Total dari penjualan
	err := r.db.Model(&model.TransaksiPenjualan{}).
		Where("tgl_transaksi BETWEEN ? AND ?", startDate, endDate).
		Select("COALESCE(SUM(jumlah_kg * harga_jual_per_kg), 0)").
		Row().Scan(&ringkasan.TotalPenjualan)
	if err != nil {
		return ringkasan, err
	}

	// Total dari jasa giling (hanya yang tunai)
	err = r.db.Model(&model.TransaksiJasaGiling{}).
		Where("tanggal BETWEEN ? AND ?", startDate, endDate).
		Where("tipe_pembayaran = ?", "TUNAI").
		Select("COALESCE(SUM(jumlah_pembayaran_tunai), 0)").
		Row().Scan(&ringkasan.TotalJasaGiling)
	if err != nil {
		return ringkasan, err
	}

	ringkasan.TotalKeseluruhan = ringkasan.TotalPenjualan + ringkasan.TotalJasaGiling
	return ringkasan, nil
}
