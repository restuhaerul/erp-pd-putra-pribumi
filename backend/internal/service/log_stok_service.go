package service

import (
	"errors"
	"putra-pribumi/internal/model"
	"putra-pribumi/internal/repository"
	"time"

	"gorm.io/gorm"
)

type ServiceLogStok interface {
	CatatStokMasuk(tx *gorm.DB, log model.LogStokProduk) error
	CatatStokKeluar(tx *gorm.DB, log model.LogStokProduk) error
	GetHistory(produkID uint) ([]model.LogStokProduk, error)
	DeleteLogBySource(tx *gorm.DB, sourceType string, sourceID uint) error
	GetRecentActivity(limit int) ([]model.LogStokProduk, error)
	GetHistoryByBatchPembelianID(batchID uint) ([]model.LogStokProduk, error)
}

type logStokService struct{ repo repository.RepositoryLogStok }

func NewLogStokService(repo repository.RepositoryLogStok) *logStokService {
	return &logStokService{repo}
}

func (s *logStokService) CatatStokMasuk(tx *gorm.DB, log model.LogStokProduk) error {
	log.TipeLog = "MASUK"
	log.Timestamp = time.Now()

	// Ensure positive value for MASUK
	if log.JumlahKg < 0 {
		log.JumlahKg = -log.JumlahKg
	}

	return s.repo.Create(tx, log)
}

func (s *logStokService) CatatStokKeluar(tx *gorm.DB, log model.LogStokProduk) error {
	log.TipeLog = "KELUAR"
	log.Timestamp = time.Now()

	// Store as negative value for KELUAR
	if log.JumlahKg > 0 {
		log.JumlahKg = -log.JumlahKg
	}

	return s.repo.Create(tx, log)
}

func (s *logStokService) GetHistory(produkID uint) ([]model.LogStokProduk, error) {
	return s.repo.GetHistoryByProdukID(produkID)
}

func (s *logStokService) DeleteLogBySource(tx *gorm.DB, sourceType string, sourceID uint) error {
	var foreignKeyColumn string
	switch sourceType {
	case "PRODUKSI":
		foreignKeyColumn = "produksi_id"
	case "PENJUALAN":
		foreignKeyColumn = "penjualan_id"
	case "JASA_GILING":
		foreignKeyColumn = "jasa_giling_id"
	case "PEMBELIAN_BATCH":
		foreignKeyColumn = "batch_pembelian_id"
	case "PEMBELIAN_LANGSUNG":
		foreignKeyColumn = "pembelian_langsung_id"
	default:
		return errors.New("tipe sumber log tidak valid")
	}
	return s.repo.DeleteByForeignID(tx, foreignKeyColumn, sourceID)
}

// Enhanced GetRecentActivity with better data handling
func (s *logStokService) GetRecentActivity(limit int) ([]model.LogStokProduk, error) {
	// Validate limit
	if limit <= 0 {
		limit = 10
	}
	if limit > 500 {
		limit = 500
	}

	return s.repo.FindRecentActivity(limit)
}

// Get history for batch pembelian
func (s *logStokService) GetHistoryByBatchPembelianID(batchID uint) ([]model.LogStokProduk, error) {
	return s.repo.GetHistoryByBatchPembelianID(batchID)
}
