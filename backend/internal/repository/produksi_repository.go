package repository

import (
	"putra-pribumi/internal/model"
	"time"

	"gorm.io/gorm"
)

type RepositoryProduksi interface {
	Save(produksi model.BatchProduksi) (model.BatchProduksi, error)
	Update(produksi model.BatchProduksi) (model.BatchProduksi, error)
	FindByID(ID uint) (model.BatchProduksi, error)
	FindAll() ([]model.BatchProduksi, error)

	// NEW: Pagination method
	FindPaginated(page, limit int, dateFrom, dateTo string) ([]model.BatchProduksi, int64, error)

	Delete(tx *gorm.DB, ID uint) error
}

type produksiRepository struct {
	db *gorm.DB
}

func NewProduksiRepository(db *gorm.DB) *produksiRepository {
	return &produksiRepository{db}
}

func (r *produksiRepository) Save(produksi model.BatchProduksi) (model.BatchProduksi, error) {
	err := r.db.Create(&produksi).Error
	return produksi, err
}

func (r *produksiRepository) Update(produksi model.BatchProduksi) (model.BatchProduksi, error) {
	err := r.db.Save(&produksi).Error
	return produksi, err
}

// ======================================================================
// FUNGSI FINDALL DAN FINDBYID YANG DIPERBAIKI
// ======================================================================

func (r *produksiRepository) FindAll() ([]model.BatchProduksi, error) {
	var produksi []model.BatchProduksi
	err := r.db.Preload("Produk").
		Preload("SumberDigunakan").
		Preload("SumberDigunakan.BatchPembelian").
		Preload("SumberDigunakan.BatchPembelian.Produk").
		Preload("SumberDigunakan.StokProduk").
		Preload("SumberDigunakan.StokProduk.Produk").
		// ✅ TAMBAHKAN PRELOAD INI - Yang paling penting!
		Preload("SumberDigunakan.BatchProduksiSumber").
		Preload("SumberDigunakan.BatchProduksiSumber.Produk").
		// ✅ TAMBAHKAN PRELOAD UNTUK KARUNG
		Preload("SumberKarung").
		Preload("SumberKarung.BatchKarung").
		Preload("SumberKarung.BatchKarung.Produk").
		Order("tgl_produksi desc").
		Find(&produksi).Error
	return produksi, err
}

func (r *produksiRepository) FindByID(id uint) (model.BatchProduksi, error) {
	var produksi model.BatchProduksi
	err := r.db.Preload("Produk").
		Preload("SumberDigunakan").
		Preload("SumberDigunakan.BatchPembelian").
		Preload("SumberDigunakan.BatchPembelian.Produk").
		Preload("SumberDigunakan.StokProduk").
		Preload("SumberDigunakan.StokProduk.Produk").
		// ✅ TAMBAHKAN PRELOAD INI - Yang paling penting!
		Preload("SumberDigunakan.BatchProduksiSumber").
		Preload("SumberDigunakan.BatchProduksiSumber.Produk").
		// ✅ TAMBAHKAN PRELOAD UNTUK KARUNG
		Preload("SumberKarung").
		Preload("SumberKarung.BatchKarung").
		Preload("SumberKarung.BatchKarung.Produk").
		First(&produksi, id).Error
	return produksi, err
}

func (r *produksiRepository) Delete(tx *gorm.DB, id uint) error {
	// Hapus dulu dari tabel relasi (sumber bahan baku)
	if err := tx.Where("batch_produksi_id = ?", id).Delete(&model.ProduksiSumber{}).Error; err != nil {
		return err
	}
	// Hapus dari tabel utama
	return tx.Delete(&model.BatchProduksi{}, id).Error
}

// Implementasi FindPaginated
func (r *produksiRepository) FindPaginated(page, limit int, dateFrom, dateTo string) ([]model.BatchProduksi, int64, error) {
	var produksi []model.BatchProduksi
	var total int64

	// Build base query
	query := r.db.Model(&model.BatchProduksi{})

	// Apply date filters if provided
	if dateFrom != "" && dateTo != "" {
		// Parse dates
		startDate, err := time.Parse("2006-01-02", dateFrom)
		if err != nil {
			return nil, 0, err
		}

		endDate, err := time.Parse("2006-01-02", dateTo)
		if err != nil {
			return nil, 0, err
		}

		// Set end date to end of day
		endDate = endDate.Add(23*time.Hour + 59*time.Minute + 59*time.Second)

		query = query.Where("tgl_produksi BETWEEN ? AND ?", startDate, endDate)
	} else if dateFrom != "" {
		startDate, err := time.Parse("2006-01-02", dateFrom)
		if err != nil {
			return nil, 0, err
		}
		query = query.Where("tgl_produksi >= ?", startDate)
	} else if dateTo != "" {
		endDate, err := time.Parse("2006-01-02", dateTo)
		if err != nil {
			return nil, 0, err
		}
		endDate = endDate.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
		query = query.Where("tgl_produksi <= ?", endDate)
	}

	// Count total records
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Calculate offset
	offset := (page - 1) * limit

	// Get paginated data with all preloads
	err := query.Preload("Produk").
		Preload("SumberDigunakan").
		Preload("SumberDigunakan.BatchPembelian").
		Preload("SumberDigunakan.BatchPembelian.Produk").
		Preload("SumberDigunakan.StokProduk").
		Preload("SumberDigunakan.StokProduk.Produk").
		Preload("SumberDigunakan.BatchProduksiSumber").
		Preload("SumberDigunakan.BatchProduksiSumber.Produk").
		Preload("SumberKarung").
		Preload("SumberKarung.BatchKarung").
		Preload("SumberKarung.BatchKarung.Produk").
		Order("tgl_produksi desc").
		Offset(offset).
		Limit(limit).
		Find(&produksi).Error

	return produksi, total, err
}
