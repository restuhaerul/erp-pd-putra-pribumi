// Salin dan ganti seluruh konten file ini

package service

import (
	"putra-pribumi/internal/model"
	"putra-pribumi/internal/repository"
)

type ServiceKonfigurasi interface {
	GetKonfigurasi() (model.Konfigurasi, error)
	UpdateKonfigurasi(input InputUpdateKonfigurasi) (model.Konfigurasi, error)
}

type konfigurasiService struct {
	repo repository.RepositoryKonfigurasi
}

func NewKonfigurasiService(repo repository.RepositoryKonfigurasi) *konfigurasiService {
	return &konfigurasiService{repo}
}

// Input untuk update data konfigurasi dari API
type InputUpdateKonfigurasi struct {
	// PENJELASAN: Field baru ditambahkan di sini agar bisa diupdate melalui API.
	// Nilai binding:"required" memastikan frontend harus mengirimkan semua nilai ini.
	BiayaProduksiPerKgGabah          float64 `json:"biaya_produksi_per_kg_gabah" binding:"required"`
	HargaJualDedakPerKg              float64 `json:"harga_jual_dedak_per_kg" binding:"required"`
	HargaJualMenirPerKg              float64 `json:"harga_jual_menir_per_kg" binding:"required"`
	TarifJasaGilingUmumPerKgBeras    float64 `json:"tarif_jasa_giling_umum_per_kg_beras" binding:"required"`
	TarifJasaGilingPribadiPerKgGabah float64 `json:"tarif_jasa_giling_pribadi_per_kg_gabah" binding:"required"` // <-- BARU
}

func (s *konfigurasiService) GetKonfigurasi() (model.Konfigurasi, error) {
	return s.repo.FindOrCreate()
}

func (s *konfigurasiService) UpdateKonfigurasi(input InputUpdateKonfigurasi) (model.Konfigurasi, error) {
	// PENJELASAN: Fungsi update disesuaikan untuk menyertakan field baru.
	// Saat repo.Update dipanggil, GORM akan memperbarui semua field yang ada di struct ini.
	konfigurasiToUpdate := model.Konfigurasi{
		BiayaProduksiPerKgGabah:          input.BiayaProduksiPerKgGabah,
		HargaJualDedakPerKg:              input.HargaJualDedakPerKg,
		HargaJualMenirPerKg:              input.HargaJualMenirPerKg,
		TarifJasaGilingUmumPerKgBeras:    input.TarifJasaGilingUmumPerKgBeras,
		TarifJasaGilingPribadiPerKgGabah: input.TarifJasaGilingPribadiPerKgGabah, // <-- BARU
	}

	return s.repo.Update(konfigurasiToUpdate)
}
