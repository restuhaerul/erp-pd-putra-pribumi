package service

import (
	"gorm.io/gorm"
	"putra-pribumi/internal/model"
	"putra-pribumi/internal/repository"
	"time"
)

type ServiceLogKarung interface {
	CatatLog(tx *gorm.DB, log model.LogKarung) error
	GetHistory(batchKarungID uint) ([]model.LogKarung, error)
	DeleteLogByProduksiID(tx *gorm.DB, produksiID uint) error
}

type logKarungService struct {
	repo repository.RepositoryLogKarung
}

func NewLogKarungService(repo repository.RepositoryLogKarung) *logKarungService {
	return &logKarungService{repo}
}

func (s *logKarungService) CatatLog(tx *gorm.DB, log model.LogKarung) error {
	log.Timestamp = time.Now()
	return s.repo.Create(tx, log)
}

func (s *logKarungService) GetHistory(batchKarungID uint) ([]model.LogKarung, error) {
	return s.repo.GetHistoryByBatchKarungID(batchKarungID)
}

func (s *logKarungService) DeleteLogByProduksiID(tx *gorm.DB, produksiID uint) error {
	return s.repo.DeleteByProduksiID(tx, produksiID)
}
