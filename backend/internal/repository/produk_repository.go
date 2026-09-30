// backend_extracted/internal/repository/produk_repository.go
package repository

import (
	"putra-pribumi/internal/model"

	"gorm.io/gorm"
)

// PERBAIKAN: Melengkapi interface
type RepositoryProduk interface {
	Save(produk model.Produk) (model.Produk, error)
	FindAll() ([]model.Produk, error)
	FindByID(ID uint) (model.Produk, error)
	Update(produk model.Produk) (model.Produk, error)
	Delete(ID uint) error                                // PERBAIKAN: Menerima ID (uint) bukan objek model
	GetByIdWithoutPreload(ID uint) (model.Produk, error) // TAMBAHAN
}

type produkRepository struct {
	db *gorm.DB
}

func NewProdukRepository(db *gorm.DB) *produkRepository {
	return &produkRepository{db}
}

func (r *produkRepository) Save(produk model.Produk) (model.Produk, error) {
	err := r.db.Create(&produk).Error
	return produk, err
}

func (r *produkRepository) FindAll() ([]model.Produk, error) {
	var daftarProduk []model.Produk
	err := r.db.Find(&daftarProduk).Error
	return daftarProduk, err
}

func (r *produkRepository) FindByID(ID uint) (model.Produk, error) {
	var produk model.Produk
	err := r.db.Where("id = ?", ID).First(&produk).Error
	return produk, err
}

func (r *produkRepository) Update(produk model.Produk) (model.Produk, error) {
	err := r.db.Save(&produk).Error
	return produk, err
}

// PERBAIKAN: Implementasi Delete berdasarkan ID
func (r *produkRepository) Delete(ID uint) error {
	return r.db.Delete(&model.Produk{}, ID).Error
}

// TAMBAHAN: Implementasi GetByIdWithoutPreload
func (r *produkRepository) GetByIdWithoutPreload(ID uint) (model.Produk, error) {
	var produk model.Produk
	err := r.db.First(&produk, ID).Error
	return produk, err
}
