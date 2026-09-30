// File: putra-pribumi/internal/repository/penjualan_repository.go
// UPDATED: Tambah filter status dan method baru untuk include cancelled

package repository

import (
	"putra-pribumi/internal/model"
	"time"

	"gorm.io/gorm"
)

type RepositoryPenjualan interface {
	Save(penjualan model.TransaksiPenjualan) (model.TransaksiPenjualan, error)
	FindByDate(date time.Time) ([]model.TransaksiPenjualan, error)
	FindByDateWithCancelled(date time.Time) ([]model.TransaksiPenjualan, error) // NEW: Include cancelled
	SumLabaHarian() (float64, error)
	FindByID(id uint) (model.TransaksiPenjualan, error)
	Update(penjualan model.TransaksiPenjualan) (model.TransaksiPenjualan, error)
	Delete(tx *gorm.DB, id uint) error
}

type penjualanRepository struct {
	db *gorm.DB
}

func NewPenjualanRepository(db *gorm.DB) *penjualanRepository {
	return &penjualanRepository{db}
}

func (r *penjualanRepository) Save(penjualan model.TransaksiPenjualan) (model.TransaksiPenjualan, error) {
	err := r.db.Create(&penjualan).Error
	return penjualan, err
}

// FindByDate - UPDATED: Hanya tampilkan yang AKTIF (exclude DIBATALKAN)
func (r *penjualanRepository) FindByDate(date time.Time) ([]model.TransaksiPenjualan, error) {
	var daftarPenjualan []model.TransaksiPenjualan

	dateString := date.Format("2006-01-02")

	// PERUBAHAN: Tambah filter status != 'DIBATALKAN'
	err := r.db.Preload("Produk").
		Preload("BatchProduksi.Produk").
		Order("id desc").
		Where("DATE(tgl_transaksi) = ? AND (status IS NULL OR status != ?)", dateString, "DIBATALKAN").
		Find(&daftarPenjualan).Error

	return daftarPenjualan, err
}

// NEW: FindByDateWithCancelled - Tampilkan semua termasuk yang dibatalkan
func (r *penjualanRepository) FindByDateWithCancelled(date time.Time) ([]model.TransaksiPenjualan, error) {
	var daftarPenjualan []model.TransaksiPenjualan

	dateString := date.Format("2006-01-02")

	err := r.db.Preload("Produk").
		Preload("BatchProduksi.Produk").
		Order("id desc").
		Where("DATE(tgl_transaksi) = ?", dateString).
		Find(&daftarPenjualan).Error

	return daftarPenjualan, err
}

func (r *penjualanRepository) SumLabaHarian() (float64, error) {
	var totalLaba float64
	// PERUBAHAN: Exclude yang dibatalkan dari perhitungan laba
	err := r.db.Model(&model.TransaksiPenjualan{}).
		Where("DATE(tgl_transaksi) = CURDATE() AND (status IS NULL OR status != ?)", "DIBATALKAN").
		Select("COALESCE(sum(laba), 0)").
		Row().
		Scan(&totalLaba)
	return totalLaba, err
}

func (r *penjualanRepository) FindByID(ID uint) (model.TransaksiPenjualan, error) {
	var penjualan model.TransaksiPenjualan
	err := r.db.Preload("Produk").Preload("BatchProduksi.Produk").Where("id = ?", ID).First(&penjualan).Error
	return penjualan, err
}

func (r *penjualanRepository) Update(penjualan model.TransaksiPenjualan) (model.TransaksiPenjualan, error) {
	err := r.db.Save(&penjualan).Error
	return penjualan, err
}

func (r *penjualanRepository) Delete(tx *gorm.DB, id uint) error {
	err := tx.Delete(&model.TransaksiPenjualan{}, id).Error
	return err
}
