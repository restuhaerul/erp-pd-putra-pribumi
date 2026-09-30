package repository

import (
	"gorm.io/gorm"
	"putra-pribumi/internal/model"
)

type RepositoryStokProduk interface {
	FindAll() ([]model.StokProduk, error)
	FindByProdukID(produkID uint) (model.StokProduk, error)
	// --- TAMBAHKAN DUA METHOD BARU INI ---
	FirstOrCreateByProdukID(produkID uint) (model.StokProduk, error)
	Update(stok model.StokProduk) (model.StokProduk, error)
}

type stokProdukRepository struct {
	db *gorm.DB
}

func NewStokProdukRepository(db *gorm.DB) *stokProdukRepository {
	return &stokProdukRepository{db}
}

func (r *stokProdukRepository) FindAll() ([]model.StokProduk, error) {
	var stok []model.StokProduk
	// Pastikan Preload ada agar data produk ikut terambil
	err := r.db.Preload("Produk").Find(&stok).Error
	return stok, err
}

func (r *stokProdukRepository) FindByProdukID(produkID uint) (model.StokProduk, error) {
	var stok model.StokProduk
	err := r.db.Where("produk_id = ?", produkID).First(&stok).Error
	return stok, err
}

// --- IMPLEMENTASI METHOD BARU ---
// Method ini akan mencari stok, jika tidak ada, akan membuatnya.
func (r *stokProdukRepository) FirstOrCreateByProdukID(produkID uint) (model.StokProduk, error) {
	var stok model.StokProduk
	err := r.db.Where(model.StokProduk{ProdukID: produkID}).FirstOrCreate(&stok).Error
	return stok, err
}

// Method ini untuk menyimpan perubahan pada data stok.
func (r *stokProdukRepository) Update(stok model.StokProduk) (model.StokProduk, error) {
	err := r.db.Save(&stok).Error
	return stok, err
}
