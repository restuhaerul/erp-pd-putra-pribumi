// internal/repository/hutang_repository.go
package repository

import (
	"putra-pribumi/internal/model"

	"gorm.io/gorm"
)

type RepositoryHutang interface {
	Save(hutang model.Hutang) (model.Hutang, error)
	FindAll() ([]model.Hutang, error)
	FindByID(id uint) (model.Hutang, error)
	Update(hutang model.Hutang) (model.Hutang, error)
}

type hutangRepository struct {
	db *gorm.DB
}

func NewHutangRepository(db *gorm.DB) *hutangRepository {
	return &hutangRepository{db}
}

func (r *hutangRepository) Save(hutang model.Hutang) (model.Hutang, error) {
	err := r.db.Create(&hutang).Error
	return hutang, err
}

func (r *hutangRepository) FindAll() ([]model.Hutang, error) {
	var hutangs []model.Hutang
	// Klausa Where ini sudah ada dan berfungsi menyembunyikan hutang yang dibatalkan
	err := r.db.Where("status <> ?", "DIBATALKAN").Order("tanggal_transaksi desc").Find(&hutangs).Error
	return hutangs, err
}

func (r *hutangRepository) FindByID(id uint) (model.Hutang, error) {
	var hutang model.Hutang
	err := r.db.Where("id = ?", id).First(&hutang).Error
	return hutang, err
}

func (r *hutangRepository) Update(hutang model.Hutang) (model.Hutang, error) {
	err := r.db.Save(&hutang).Error
	return hutang, err
}
