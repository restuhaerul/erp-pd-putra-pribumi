package repository

import (
	"putra-pribumi/internal/model"

	"gorm.io/gorm"
)

type RepositoryPembelian interface {
	Save(pembelian model.BatchPembelian) (model.BatchPembelian, error)
	FindAll() ([]model.BatchPembelian, error)
	FindByID(ID uint) (model.BatchPembelian, error)
	Update(pembelian model.BatchPembelian) (model.BatchPembelian, error)
	Delete(pembelian model.BatchPembelian) (model.BatchPembelian, error)
}

type pembelianRepository struct {
	db *gorm.DB
}

// Nama fungsi disesuaikan menjadi NewPembelianRepository
func NewPembelianRepository(db *gorm.DB) *pembelianRepository {
	return &pembelianRepository{db}
}

func (r *pembelianRepository) Save(pembelian model.BatchPembelian) (model.BatchPembelian, error) {
	err := r.db.Create(&pembelian).Error
	return pembelian, err
}

func (r *pembelianRepository) FindAll() ([]model.BatchPembelian, error) {
	var daftarPembelian []model.BatchPembelian
	// Kembalikan ke versi sederhana yang hanya Preload produk
	err := r.db.Preload("Produk").Where("status = ?", "AKTIF").Order("id desc").Find(&daftarPembelian).Error
	return daftarPembelian, err
}

func (r *pembelianRepository) FindByID(ID uint) (model.BatchPembelian, error) {
	var pembelian model.BatchPembelian
	// Tambahkan Preload("Produk") di sini juga untuk konsistensi
	err := r.db.Preload("Produk").Where("id = ?", ID).First(&pembelian).Error
	return pembelian, err
}

func (r *pembelianRepository) Update(pembelian model.BatchPembelian) (model.BatchPembelian, error) {
	err := r.db.Save(&pembelian).Error
	return pembelian, err
}

func (r *pembelianRepository) Delete(pembelian model.BatchPembelian) (model.BatchPembelian, error) {
	err := r.db.Delete(&pembelian).Error
	return pembelian, err
}
