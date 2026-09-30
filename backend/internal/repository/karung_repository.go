package repository

import (
	"gorm.io/gorm"
	"putra-pribumi/internal/model"
)

type RepositoryKarung interface {
	Save(tx *gorm.DB, karung model.BatchKarung) (model.BatchKarung, error)
	FindAll() ([]model.BatchKarung, error)
	FindByID(id uint) (model.BatchKarung, error)
	Update(tx *gorm.DB, karung model.BatchKarung) (model.BatchKarung, error)
	Delete(tx *gorm.DB, id uint) error
}

type karungRepository struct {
	db *gorm.DB
}

func NewKarungRepository(db *gorm.DB) *karungRepository {
	return &karungRepository{db}
}

func (r *karungRepository) Save(tx *gorm.DB, karung model.BatchKarung) (model.BatchKarung, error) {
	err := tx.Create(&karung).Error
	return karung, err
}

func (r *karungRepository) FindAll() ([]model.BatchKarung, error) {
	var daftarKarung []model.BatchKarung
	err := r.db.Preload("Produk").Order("tgl_pembelian desc").Find(&daftarKarung).Error
	return daftarKarung, err
}

func (r *karungRepository) FindByID(id uint) (model.BatchKarung, error) {
	var karung model.BatchKarung
	err := r.db.Preload("Produk").Where("id = ?", id).First(&karung).Error
	return karung, err
}

func (r *karungRepository) Update(tx *gorm.DB, karung model.BatchKarung) (model.BatchKarung, error) {
	err := tx.Save(&karung).Error
	return karung, err
}

func (r *karungRepository) Delete(tx *gorm.DB, id uint) error {
	return tx.Delete(&model.BatchKarung{}, id).Error
}
