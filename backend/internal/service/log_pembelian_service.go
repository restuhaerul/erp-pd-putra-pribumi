// backend_extracted/internal/service/log_pembelian_service.go
package service

import (
	"fmt"
	"log"
	"putra-pribumi/internal/model"
	"putra-pribumi/internal/repository"
	"time"

	"gorm.io/gorm"
)

type ServiceLogPembelian interface {
	CatatLog(tx *gorm.DB, logData model.LogPembelian) error
	GetHistory(batchPembelianID uint) ([]model.LogPembelian, error)
	DeleteLogBySource(tx *gorm.DB, sourceType string, sourceID uint) error
	GetAllLogs(limit, offset int) ([]model.LogPembelian, error)
}

type logPembelianService struct {
	repo repository.RepositoryLogPembelian
}

func NewLogPembelianService(repo repository.RepositoryLogPembelian) ServiceLogPembelian {
	return &logPembelianService{repo}
}

func (s *logPembelianService) CatatLog(tx *gorm.DB, logData model.LogPembelian) error {
	if logData.BatchPembelianID == 0 {
		return fmt.Errorf("BatchPembelianID tidak boleh kosong")
	}
	if logData.TipeLog == "" {
		return fmt.Errorf("TipeLog tidak boleh kosong")
	}
	if logData.Deskripsi == "" {
		return fmt.Errorf("Deskripsi tidak boleh kosong")
	}

	if logData.Timestamp.IsZero() {
		logData.Timestamp = time.Now()
	}

	if err := s.repo.Create(tx, logData); err != nil {
		log.Printf("❌ GAGAL MENYIMPAN LOG PEMBELIAN: BatchID=%d, TipeLog=%s, Error=%v",
			logData.BatchPembelianID, logData.TipeLog, err)
		return fmt.Errorf("gagal menyimpan log pembelian (BatchID=%d, TipeLog=%s): %w",
			logData.BatchPembelianID, logData.TipeLog, err)
	}

	log.Printf("✅ LOG PEMBELIAN BERHASIL: BatchID=%d, TipeLog=%s, JumlahKg=%.2f",
		logData.BatchPembelianID, logData.TipeLog, logData.JumlahKg)

	return nil
}

func (s *logPembelianService) GetHistory(batchPembelianID uint) ([]model.LogPembelian, error) {
	return s.repo.GetHistoryByBatchID(batchPembelianID)
}

func (s *logPembelianService) DeleteLogBySource(tx *gorm.DB, sourceType string, sourceID uint) error {
	switch sourceType {
	case "BATCH_PRODUKSI":
		return s.repo.DeleteByProduksiID(tx, sourceID)
	default:
		return fmt.Errorf("tipe sumber log pembelian tidak valid: %s", sourceType)
	}
}

// PERBAIKAN: Fungsi ini sekarang akan memanggil method repo yang sudah ada
func (s *logPembelianService) GetAllLogs(limit, offset int) ([]model.LogPembelian, error) {
	return s.repo.GetAllLogs(limit, offset)
}
