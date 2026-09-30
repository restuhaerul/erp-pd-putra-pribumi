package repository

import (
	"errors"
	"gorm.io/gorm"
	"putra-pribumi/internal/model"
)

type RepositoryKonfigurasi interface {
	FindOrCreate() (model.Konfigurasi, error)
	Update(konfigurasi model.Konfigurasi) (model.Konfigurasi, error)
}

type konfigurasiRepository struct {
	db *gorm.DB
}

func NewKonfigurasiRepository(db *gorm.DB) *konfigurasiRepository {
	return &konfigurasiRepository{db}
}

// FindOrCreate yang sudah diperbaiki
func (r *konfigurasiRepository) FindOrCreate() (model.Konfigurasi, error) {
	var konfigurasi model.Konfigurasi

	// 1. Coba cari data dengan ID 1
	err := r.db.First(&konfigurasi, 1).Error

	// 2. Cek apakah errornya adalah "data tidak ditemukan"
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// Jika tidak ditemukan, BUAT BARU secara manual
			initialData := model.Konfigurasi{
				ID:                      1,
				BiayaProduksiPerKgGabah: 300.0,
				HargaJualDedakPerKg:     5000.0,
				HargaJualMenirPerKg:     3000.0,
			}
			if createErr := r.db.Create(&initialData).Error; createErr != nil {
				return model.Konfigurasi{}, createErr // Gagal membuat
			}
			return initialData, nil // Berhasil dibuat
		}
		return model.Konfigurasi{}, err // Error lain selain "tidak ditemukan"
	}

	// 3. Jika tidak ada error, berarti data ditemukan. Kembalikan.
	return konfigurasi, nil
}

// Update akan menyimpan perubahan pada baris konfigurasi.
func (r *konfigurasiRepository) Update(konfigurasi model.Konfigurasi) (model.Konfigurasi, error) {
	konfigurasi.ID = 1
	err := r.db.Save(&konfigurasi).Error
	return konfigurasi, err
}
