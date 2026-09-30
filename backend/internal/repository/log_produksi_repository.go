// putra-pribumi/internal/repository/log_produksi_repository.go
package repository

import (
	"fmt"
	"putra-pribumi/internal/model"

	"gorm.io/gorm"
)

type RepositoryLogProduksi interface {
	Create(tx *gorm.DB, log model.LogProduksi) error
	GetHistoryByBatchProduksiID(batchProduksiID uint) ([]model.LogProduksi, error)
	DeleteByForeignID(tx *gorm.DB, foreignKeyColumn string, id uint) error
	ExistsByBatchAndType(tx *gorm.DB, batchProduksiID uint, tipeLog string) (bool, error)
}

type logProduksiRepository struct{ db *gorm.DB }

func NewLogProduksiRepository(db *gorm.DB) *logProduksiRepository {
	return &logProduksiRepository{db}
}

// ✅ PERBAIKAN: Hilangkan kondisi yang tidak mungkin
func (r *logProduksiRepository) Create(tx *gorm.DB, log model.LogProduksi) error {
	if tx == nil {
		return fmt.Errorf("transaksi database tidak boleh nil")
	}

	// ✅ FIXED: Langsung gunakan tx, tidak perlu kondisi lagi
	if err := tx.Create(&log).Error; err != nil {
		return fmt.Errorf("gagal insert log produksi ke database: %w", err)
	}

	return nil
}

// ✅ PERBAIKAN: Hilangkan kondisi yang tidak mungkin
func (r *logProduksiRepository) ExistsByBatchAndType(tx *gorm.DB, batchProduksiID uint, tipeLog string) (bool, error) {
	if tx == nil {
		return false, fmt.Errorf("transaksi database tidak boleh nil")
	}

	var count int64
	err := tx.Model(&model.LogProduksi{}).
		Where("batch_produksi_id = ? AND tipe_log = ?", batchProduksiID, tipeLog).
		Count(&count).Error

	return count > 0, err
}

func (r *logProduksiRepository) GetHistoryByBatchProduksiID(batchProduksiID uint) ([]model.LogProduksi, error) {
	var logs []model.LogProduksi
	err := r.db.Where("batch_produksi_id = ?", batchProduksiID).Order("timestamp desc").Find(&logs).Error
	return logs, err
}

func (r *logProduksiRepository) DeleteByForeignID(tx *gorm.DB, foreignKeyColumn string, id uint) error {
	if tx == nil {
		return fmt.Errorf("transaksi database tidak boleh nil")
	}
	return tx.Where(fmt.Sprintf("%s = ?", foreignKeyColumn), id).Delete(&model.LogProduksi{}).Error
}
