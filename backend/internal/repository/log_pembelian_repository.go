// backend_extracted/internal/repository/log_pembelian_repository.go
package repository

import (
	"putra-pribumi/internal/model"

	"gorm.io/gorm"
)

// PERBAIKAN: Menambahkan method GetAllLogs
type RepositoryLogPembelian interface {
	Create(tx *gorm.DB, log model.LogPembelian) error
	GetHistoryByBatchID(batchPembelianID uint) ([]model.LogPembelian, error)
	DeleteByProduksiID(tx *gorm.DB, produksiID uint) error
	GetAllLogs(limit, offset int) ([]model.LogPembelian, error) // TAMBAHAN
}

type logPembelianRepository struct {
	db *gorm.DB
}

func NewLogPembelianRepository(db *gorm.DB) RepositoryLogPembelian {
	return &logPembelianRepository{db}
}

func (r *logPembelianRepository) Create(tx *gorm.DB, log model.LogPembelian) error {
	if tx == nil {
		return r.db.Create(&log).Error
	}
	return tx.Create(&log).Error
}

func (r *logPembelianRepository) GetHistoryByBatchID(batchPembelianID uint) ([]model.LogPembelian, error) {
	var logs []model.LogPembelian
	err := r.db.Where("batch_pembelian_id = ?", batchPembelianID).
		Order("timestamp desc").
		Find(&logs).Error
	return logs, err
}

func (r *logPembelianRepository) DeleteByProduksiID(tx *gorm.DB, produksiID uint) error {
	return tx.Where("batch_produksi_id = ?", produksiID).Delete(&model.LogPembelian{}).Error
}

// TAMBAHAN: Implementasi method GetAllLogs
func (r *logPembelianRepository) GetAllLogs(limit, offset int) ([]model.LogPembelian, error) {
	var logs []model.LogPembelian
	err := r.db.
		Preload("BatchPembelian.Produk").
		Preload("BatchProduksi.Produk").
		Order("timestamp DESC").
		Limit(limit).
		Offset(offset).
		Find(&logs).Error
	return logs, err
}
