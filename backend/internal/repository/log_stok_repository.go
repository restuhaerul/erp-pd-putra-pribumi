package repository

import (
	"fmt"
	"putra-pribumi/internal/model"

	"gorm.io/gorm"
)

type RepositoryLogStok interface {
	Create(tx *gorm.DB, log model.LogStokProduk) error
	GetHistoryByProdukID(produkID uint) ([]model.LogStokProduk, error)
	DeleteByForeignID(tx *gorm.DB, foreignKeyColumn string, id uint) error
	// Enhanced function for getting recent activities with better information
	FindRecentActivity(limit int) ([]model.LogStokProduk, error)
	// Additional function for batch pembelian history
	GetHistoryByBatchPembelianID(batchID uint) ([]model.LogStokProduk, error)
}

type logStokRepository struct{ db *gorm.DB }

func NewLogStokRepository(db *gorm.DB) *logStokRepository { return &logStokRepository{db} }

func (r *logStokRepository) Create(tx *gorm.DB, log model.LogStokProduk) error {
	return tx.Create(&log).Error
}

func (r *logStokRepository) GetHistoryByProdukID(produkID uint) ([]model.LogStokProduk, error) {
	var logs []model.LogStokProduk
	err := r.db.Where("produk_id = ?", produkID).Order("timestamp desc").Find(&logs).Error
	return logs, err
}

func (r *logStokRepository) DeleteByForeignID(tx *gorm.DB, foreignKeyColumn string, id uint) error {
	return tx.Where(fmt.Sprintf("%s = ?", foreignKeyColumn), id).Delete(&model.LogStokProduk{}).Error
}

// Enhanced FindRecentActivity with richer information
func (r *logStokRepository) FindRecentActivity(limit int) ([]model.LogStokProduk, error) {
	var results []model.LogStokProduk

	// Enhanced query to get recent activities with complete product information
	// This now properly loads all necessary relationships and data
	err := r.db.
		Preload("Produk").       // Load related product data
		Order("timestamp desc"). // Order by most recent first
		Limit(limit).            // Limit the results
		Find(&results).Error

	if err != nil {
		return nil, err
	}

	// Ensure all activities have proper descriptions
	for i := range results {
		// If description is empty, generate a default one based on the activity type
		if results[i].Deskripsi == "" {
			if results[i].TipeLog == "MASUK" {
				results[i].Deskripsi = "Penambahan stok"
			} else {
				results[i].Deskripsi = "Pengurangan stok"
			}
		}

		// Ensure absolute value for display purposes while keeping the sign in tipe_log
		if results[i].TipeLog == "KELUAR" && results[i].JumlahKg > 0 {
			results[i].JumlahKg = -results[i].JumlahKg
		}
	}

	return results, nil
}

// Get history for batch pembelian
func (r *logStokRepository) GetHistoryByBatchPembelianID(batchID uint) ([]model.LogStokProduk, error) {
	var logs []model.LogStokProduk
	// Get all logs related to a specific batch_pembelian_id, ordered by most recent
	err := r.db.
		Preload("Produk").
		Where("batch_pembelian_id = ?", batchID).
		Order("timestamp desc").
		Find(&logs).Error
	return logs, err
}
