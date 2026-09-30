package repository

import (
	"gorm.io/gorm"
	"putra-pribumi/internal/model"
)

type RepositoryLogKarung interface {
	Create(tx *gorm.DB, log model.LogKarung) error
	GetHistoryByBatchKarungID(batchKarungID uint) ([]model.LogKarung, error)
	DeleteByProduksiID(tx *gorm.DB, produksiID uint) error
}

type logKarungRepository struct {
	db *gorm.DB
}

func NewLogKarungRepository(db *gorm.DB) *logKarungRepository {
	return &logKarungRepository{db}
}

func (r *logKarungRepository) Create(tx *gorm.DB, log model.LogKarung) error {
	return tx.Create(&log).Error
}

func (r *logKarungRepository) GetHistoryByBatchKarungID(batchKarungID uint) ([]model.LogKarung, error) {
	var logs []model.LogKarung
	err := r.db.Where("batch_karung_id = ?", batchKarungID).Order("timestamp desc").Find(&logs).Error
	return logs, err
}

func (r *logKarungRepository) DeleteByProduksiID(tx *gorm.DB, produksiID uint) error {
	return tx.Where("batch_produksi_id = ?", produksiID).Delete(&model.LogKarung{}).Error
}
