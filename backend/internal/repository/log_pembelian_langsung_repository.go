// backend/internal/repository/log_pembelian_langsung_repository.go
package repository

import (
	"putra-pribumi/internal/model"

	"gorm.io/gorm"
)

// ✅ INTERFACE YANG SUDAH LENGKAP
type RepositoryLogPembelianLangsung interface {
	Create(tx *gorm.DB, log model.LogPembelianLangsung) error
	FindByPembelianID(pembelianID uint) ([]model.LogPembelianLangsung, error)
	FindByProdukID(produkID uint) ([]model.LogPembelianLangsung, error)
	DeleteByPembelianID(tx *gorm.DB, pembelianID uint) error

	// Method baru yang dibutuhkan untuk membatalkan penjualan
	FindByPenjualanID(tx *gorm.DB, penjualanID uint) ([]model.LogPembelianLangsung, error)
	DeleteByPenjualanID(tx *gorm.DB, penjualanID uint) error
}

type logPembelianLangsungRepository struct {
	db *gorm.DB
}

func NewLogPembelianLangsungRepository(db *gorm.DB) RepositoryLogPembelianLangsung {
	return &logPembelianLangsungRepository{db}
}

// --- IMPLEMENTASI LENGKAP ---

func (r *logPembelianLangsungRepository) Create(tx *gorm.DB, log model.LogPembelianLangsung) error {
	return tx.Create(&log).Error
}

func (r *logPembelianLangsungRepository) FindByPembelianID(pembelianID uint) ([]model.LogPembelianLangsung, error) {
	var logs []model.LogPembelianLangsung
	err := r.db.Where("pembelian_langsung_id = ?", pembelianID).
		Order("tanggal DESC").
		Find(&logs).Error
	return logs, err
}

func (r *logPembelianLangsungRepository) FindByProdukID(produkID uint) ([]model.LogPembelianLangsung, error) {
	var logs []model.LogPembelianLangsung
	err := r.db.Where("produk_id = ?", produkID).
		Order("tanggal DESC").
		Find(&logs).Error
	return logs, err
}

// ✅ IMPLEMENTASI UNTUK METHOD YANG HILANG
// Fungsi ini menghapus log berdasarkan ID pembelian (saat pembelian dihapus)
func (r *logPembelianLangsungRepository) DeleteByPembelianID(tx *gorm.DB, pembelianID uint) error {
	return tx.Where("pembelian_langsung_id = ?", pembelianID).Delete(&model.LogPembelianLangsung{}).Error
}

// ✅ IMPLEMENTASI UNTUK METHOD BARU
// Fungsi ini mencari log berdasarkan ID penjualan (saat penjualan dibatalkan)
func (r *logPembelianLangsungRepository) FindByPenjualanID(tx *gorm.DB, penjualanID uint) ([]model.LogPembelianLangsung, error) {
	var logs []model.LogPembelianLangsung
	err := tx.Where("penjualan_id = ?", penjualanID).Find(&logs).Error
	return logs, err
}

// Fungsi ini menghapus log berdasarkan ID penjualan (saat penjualan dibatalkan)
func (r *logPembelianLangsungRepository) DeleteByPenjualanID(tx *gorm.DB, penjualanID uint) error {
	return tx.Where("penjualan_id = ?", penjualanID).Delete(&model.LogPembelianLangsung{}).Error
}
