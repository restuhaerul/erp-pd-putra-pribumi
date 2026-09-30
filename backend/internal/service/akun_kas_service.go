// internal/service/akun_kas_service.go
package service

import (
	"putra-pribumi/internal/model"
	"putra-pribumi/internal/repository"
)

type ServiceAkunKas interface {
	CreateAkunKas(input InputAkunKas) (model.AkunKas, error)
	GetAllAkunKas() ([]model.AkunKas, error)
	GetAkunKasByID(id uint) (model.AkunKas, error)
	UpdateAkunKas(id uint, input InputAkunKas) (model.AkunKas, error)
	DeleteAkunKas(id uint) error
	GetTransaksiHistory(akunID uint, page, limit int, filter repository.TransaksiKasFilter) ([]model.TransaksiKas, int64, error)
}

type akunKasService struct {
	repo repository.RepositoryAkunKas
}

func NewAkunKasService(repo repository.RepositoryAkunKas) *akunKasService {
	return &akunKasService{repo}
}

type InputAkunKas struct {
	NamaAkun string `json:"nama_akun" binding:"required"`
	TipeAkun string `json:"tipe_akun" binding:"required,oneof=KAS_TUNAI BANK"`
	IsActive *bool  `json:"is_active"`
}

func (s *akunKasService) CreateAkunKas(input InputAkunKas) (model.AkunKas, error) {
	akun := model.AkunKas{
		NamaAkun: input.NamaAkun,
		TipeAkun: input.TipeAkun,
		IsActive: true, // Default active saat dibuat
	}
	return s.repo.Save(akun)
}

func (s *akunKasService) GetAllAkunKas() ([]model.AkunKas, error) {
	return s.repo.FindAll()
}

func (s *akunKasService) GetAkunKasByID(id uint) (model.AkunKas, error) {
	return s.repo.FindByID(id)
}

func (s *akunKasService) UpdateAkunKas(id uint, input InputAkunKas) (model.AkunKas, error) {
	akun, err := s.repo.FindByID(id)
	if err != nil {
		return akun, err
	}

	akun.NamaAkun = input.NamaAkun
	akun.TipeAkun = input.TipeAkun
	if input.IsActive != nil {
		akun.IsActive = *input.IsActive
	}

	return s.repo.Update(akun)
}

func (s *akunKasService) DeleteAkunKas(id uint) error {
	_, err := s.repo.FindByID(id)
	if err != nil {
		return err
	}
	return s.repo.Delete(id)
}

// Tambahkan fungsi baru ini di implementasi
func (s *akunKasService) GetTransaksiHistory(
	akunID uint,
	page, limit int,
	filter repository.TransaksiKasFilter,
) ([]model.TransaksiKas, int64, error) {
	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 10
	}
	offset := (page - 1) * limit
	return s.repo.FindTransaksiByAkunKasID(akunID, filter, limit, offset)
}
