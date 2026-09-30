package repository

import (
	"gorm.io/gorm"
	"putra-pribumi/internal/model"
)

type RepositoryJasaGiling interface {
	Save(jasa model.TransaksiJasaGiling) (model.TransaksiJasaGiling, error)
	FindAll() ([]model.TransaksiJasaGiling, error)
	FindByID(ID uint) (model.TransaksiJasaGiling, error)
	Update(jasa model.TransaksiJasaGiling) (model.TransaksiJasaGiling, error) // <-- TAMBAHKAN INI
	Delete(ID uint) error                                                     // <-- TAMBAHKAN INI
}

type jasaGilingRepository struct {
	db *gorm.DB
}

func NewJasaGilingRepository(db *gorm.DB) *jasaGilingRepository {
	return &jasaGilingRepository{db}
}

func (r *jasaGilingRepository) Save(jasa model.TransaksiJasaGiling) (model.TransaksiJasaGiling, error) {
	err := r.db.Create(&jasa).Error
	return jasa, err
}

func (r *jasaGilingRepository) FindAll() ([]model.TransaksiJasaGiling, error) {
	var daftarJasa []model.TransaksiJasaGiling
	err := r.db.Order("tanggal desc").Find(&daftarJasa).Error
	return daftarJasa, err
}

func (r *jasaGilingRepository) FindByID(ID uint) (model.TransaksiJasaGiling, error) {
	var jasa model.TransaksiJasaGiling
	err := r.db.Where("id = ?", ID).First(&jasa).Error
	return jasa, err
}

// Method baru untuk update
func (r *jasaGilingRepository) Update(jasa model.TransaksiJasaGiling) (model.TransaksiJasaGiling, error) {
	err := r.db.Save(&jasa).Error
	return jasa, err
}

// Method baru untuk delete
func (r *jasaGilingRepository) Delete(ID uint) error {
	return r.db.Delete(&model.TransaksiJasaGiling{}, ID).Error
}
