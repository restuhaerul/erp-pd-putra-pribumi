// internal/repository/akun_kas_repository.go
package repository

import (
	"putra-pribumi/internal/model"
	"time"

	"gorm.io/gorm"
)

type RepositoryAkunKas interface {
	Save(akun model.AkunKas) (model.AkunKas, error)
	FindAll() ([]model.AkunKas, error)
	FindByID(id uint) (model.AkunKas, error)
	Update(akun model.AkunKas) (model.AkunKas, error)
	Delete(id uint) error

	FindTransaksiByAkunKasID(akunID uint, filter TransaksiKasFilter, limit, offset int) ([]model.TransaksiKas, int64, error)
}

// Tambahkan setelah interface RepositoryAkunKas
type TransaksiKasFilter struct {
	DateFrom      *time.Time
	DateTo        *time.Time
	Arah          string // "IN", "OUT", atau empty untuk semua
	ReferenceType string // untuk filter jenis transaksi spesifik
	Search        string // untuk search di memo
}

type akunKasRepository struct {
	db *gorm.DB
}

func NewAkunKasRepository(db *gorm.DB) *akunKasRepository {
	return &akunKasRepository{db}
}

func (r *akunKasRepository) Save(akun model.AkunKas) (model.AkunKas, error) {
	err := r.db.Create(&akun).Error
	return akun, err
}

func (r *akunKasRepository) FindAll() ([]model.AkunKas, error) {
	var akuns []model.AkunKas
	err := r.db.Find(&akuns).Error
	return akuns, err
}

func (r *akunKasRepository) FindByID(id uint) (model.AkunKas, error) {
	var akun model.AkunKas
	err := r.db.Where("id = ?", id).First(&akun).Error
	return akun, err
}

func (r *akunKasRepository) Update(akun model.AkunKas) (model.AkunKas, error) {
	err := r.db.Save(&akun).Error
	return akun, err
}

func (r *akunKasRepository) Delete(id uint) error {
	return r.db.Delete(&model.AkunKas{}, id).Error
}

// Tambahkan fungsi baru ini di implementasi
func (r *akunKasRepository) FindTransaksiByAkunKasID(
	akunID uint,
	filter TransaksiKasFilter,
	limit, offset int,
) ([]model.TransaksiKas, int64, error) {
	var transaksis []model.TransaksiKas
	var total int64

	// Build query dengan filter
	query := r.db.Model(&model.TransaksiKas{}).Where("akun_kas_id = ?", akunID)

	// Apply filters
	if filter.DateFrom != nil {
		query = query.Where("tanggal >= ?", filter.DateFrom)
	}
	if filter.DateTo != nil {
		// Set ke akhir hari
		endOfDay := filter.DateTo.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
		query = query.Where("tanggal <= ?", endOfDay)
	}
	if filter.Arah != "" {
		query = query.Where("arah = ?", filter.Arah)
	}
	if filter.ReferenceType != "" {
		query = query.Where("reference_type = ?", filter.ReferenceType)
	}
	if filter.Search != "" {
		query = query.Where("memo LIKE ?", "%"+filter.Search+"%")
	}

	// Count total
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated data
	err := query.
		Order("tanggal DESC, id DESC").
		Limit(limit).
		Offset(offset).
		Find(&transaksis).Error

	return transaksis, total, err
}
