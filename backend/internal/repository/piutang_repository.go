// internal/repository/piutang_repository.go
package repository

import (
	"putra-pribumi/internal/model"

	"gorm.io/gorm"
)

type RepositoryPiutang interface {
	Save(piutang model.Piutang) (model.Piutang, error)
	FindAll() ([]model.Piutang, error)
	FindByID(id uint) (model.Piutang, error)
	Update(piutang model.Piutang) (model.Piutang, error)
}

type piutangRepository struct {
	db *gorm.DB
}

func NewPiutangRepository(db *gorm.DB) *piutangRepository {
	return &piutangRepository{db}
}

func (r *piutangRepository) Save(piutang model.Piutang) (model.Piutang, error) {
	err := r.db.Create(&piutang).Error
	return piutang, err
}

func (r *piutangRepository) FindAll() ([]model.Piutang, error) {
	var piutangs []model.Piutang
	err := r.db.Where("status <> ?", "DIBATALKAN").Order("tanggal_transaksi desc").Find(&piutangs).Error
	return piutangs, err
}

func (r *piutangRepository) FindByID(id uint) (model.Piutang, error) {
	var piutang model.Piutang
	err := r.db.Where("id = ?", id).First(&piutang).Error
	return piutang, err
}

func (r *piutangRepository) Update(piutang model.Piutang) (model.Piutang, error) {
	err := r.db.Save(&piutang).Error
	return piutang, err
}
