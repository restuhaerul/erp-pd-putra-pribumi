// putra-pribumi/internal/service/log_produksi_service.go
package service

import (
	"errors"
	"fmt"
	"log"
	"putra-pribumi/internal/model"
	"putra-pribumi/internal/repository"
	"time"

	"gorm.io/gorm"
)

type ServiceLogProduksi interface {
	CatatLog(tx *gorm.DB, logData model.LogProduksi) error
	GetHistory(batchProduksiID uint) ([]model.LogProduksi, error)
	DeleteLogBySource(tx *gorm.DB, sourceType string, sourceID uint) error
	// ✅ TAMBAHAN: Method untuk validasi log berhasil disimpan
	ValidateLogExists(tx *gorm.DB, batchProduksiID uint, tipeLog string) (bool, error)
}

type logProduksiService struct {
	repo repository.RepositoryLogProduksi
}

func NewLogProduksiService(repo repository.RepositoryLogProduksi) *logProduksiService {
	return &logProduksiService{repo}
}

// ✅ PERBAIKAN: CatatLog dengan error handling yang lebih baik
func (s *logProduksiService) CatatLog(tx *gorm.DB, logData model.LogProduksi) error {
	// Validasi data input
	if logData.BatchProduksiID == 0 {
		return errors.New("BatchProduksiID tidak boleh kosong")
	}
	if logData.TipeLog == "" {
		return errors.New("TipeLog tidak boleh kosong")
	}
	if logData.Deskripsi == "" {
		return errors.New("Deskripsi tidak boleh kosong")
	}

	// Set timestamp jika belum ada
	if logData.Timestamp.IsZero() {
		logData.Timestamp = time.Now()
	}

	// ✅ CRITICAL: Simpan log dengan error handling yang ketat
	if err := s.repo.Create(tx, logData); err != nil {
		// Log error untuk debugging
		log.Printf("❌ GAGAL MENYIMPAN LOG PRODUKSI: BatchID=%d, TipeLog=%s, Error=%v",
			logData.BatchProduksiID, logData.TipeLog, err)
		return fmt.Errorf("gagal menyimpan log produksi (BatchID=%d, TipeLog=%s): %w",
			logData.BatchProduksiID, logData.TipeLog, err)
	}

	// ✅ VALIDASI: Pastikan data benar-benar tersimpan
	exists, err := s.ValidateLogExists(tx, logData.BatchProduksiID, logData.TipeLog)
	if err != nil {
		log.Printf("⚠️ GAGAL VALIDASI LOG: BatchID=%d, TipeLog=%s, Error=%v",
			logData.BatchProduksiID, logData.TipeLog, err)
		return fmt.Errorf("gagal validasi log tersimpan: %w", err)
	}
	if !exists {
		return fmt.Errorf("log tidak ditemukan setelah penyimpanan (BatchID=%d, TipeLog=%s)",
			logData.BatchProduksiID, logData.TipeLog)
	}

	// ✅ SUCCESS LOG
	log.Printf("✅ LOG PRODUKSI BERHASIL: BatchID=%d, TipeLog=%s, JumlahKg=%.2f",
		logData.BatchProduksiID, logData.TipeLog, logData.JumlahKg)

	return nil
}

// ✅ TAMBAHAN: Validasi log berhasil disimpan
func (s *logProduksiService) ValidateLogExists(tx *gorm.DB, batchProduksiID uint, tipeLog string) (bool, error) {
	return s.repo.ExistsByBatchAndType(tx, batchProduksiID, tipeLog)
}

func (s *logProduksiService) GetHistory(batchProduksiID uint) ([]model.LogProduksi, error) {
	return s.repo.GetHistoryByBatchProduksiID(batchProduksiID)
}

func (s *logProduksiService) DeleteLogBySource(tx *gorm.DB, sourceType string, sourceID uint) error {
	var foreignKeyColumn string
	switch sourceType {
	case "BATCH_PRODUKSI":
		foreignKeyColumn = "batch_produksi_id"
	case "PENJUALAN":
		foreignKeyColumn = "penjualan_id"
	default:
		return errors.New("tipe sumber log produksi tidak valid")
	}
	return s.repo.DeleteByForeignID(tx, foreignKeyColumn, sourceID)
}
