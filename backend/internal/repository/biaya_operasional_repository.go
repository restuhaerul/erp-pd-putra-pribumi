package repository

import (
	"fmt"
	"putra-pribumi/internal/model"

	"gorm.io/gorm"
)

type RepositoryBiayaOperasional interface {
	Save(biaya model.BiayaOperasional) (model.BiayaOperasional, error)
	FindAll() ([]model.BiayaOperasional, error)
	FindByID(ID uint) (model.BiayaOperasional, error)
	Update(biaya model.BiayaOperasional) (model.BiayaOperasional, error)
	Delete(ID uint) error
	DeleteByForeignKey(tx *gorm.DB, key string, value uint) error
}

type biayaOperasionalRepository struct {
	db *gorm.DB
}

func NewBiayaOperasionalRepository(db *gorm.DB) *biayaOperasionalRepository {
	return &biayaOperasionalRepository{db}
}

func (r *biayaOperasionalRepository) Save(biaya model.BiayaOperasional) (model.BiayaOperasional, error) {
	err := r.db.Create(&biaya).Error
	return biaya, err
}

func (r *biayaOperasionalRepository) FindAll() ([]model.BiayaOperasional, error) {
	var daftarBiaya []model.BiayaOperasional
	err := r.db.Find(&daftarBiaya).Error
	return daftarBiaya, err
}

func (r *biayaOperasionalRepository) FindByID(ID uint) (model.BiayaOperasional, error) {
	var biaya model.BiayaOperasional
	err := r.db.Where("id = ?", ID).First(&biaya).Error
	return biaya, err
}

func (r *biayaOperasionalRepository) Update(biaya model.BiayaOperasional) (model.BiayaOperasional, error) {
	err := r.db.Save(&biaya).Error
	return biaya, err
}

func (r *biayaOperasionalRepository) Delete(ID uint) error {
	err := r.db.Delete(&model.BiayaOperasional{}, ID).Error
	return err
}

// Tambahkan implementasi ini di dalam repository
func (r *biayaOperasionalRepository) DeleteByForeignKey(tx *gorm.DB, key string, value uint) error {
	return tx.Where(fmt.Sprintf("%s = ?", key), value).Delete(&model.BiayaOperasional{}).Error
}
