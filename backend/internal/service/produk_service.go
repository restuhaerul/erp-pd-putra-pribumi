// backend_extracted/internal/service/produk_service.go
package service

import (
	"putra-pribumi/internal/model"
	"putra-pribumi/internal/repository"
)

type ServiceProduk interface {
	CreateProduk(input InputProduk) (model.Produk, error)
	GetAllProduk() ([]model.Produk, error)
	GetProdukByID(ID uint) (model.Produk, error)
	UpdateProduk(ID uint, input InputProduk) (model.Produk, error)
	DeleteProduk(ID uint) error
}

type produkService struct {
	repo           repository.RepositoryProduk
	repoStokProduk repository.RepositoryStokProduk
}

func NewProdukService(repo repository.RepositoryProduk, repoStokProduk repository.RepositoryStokProduk) *produkService {
	return &produkService{repo, repoStokProduk}
}

type InputProduk struct {
	NamaProduk    string `json:"nama_produk" binding:"required"`
	TipeProduk    string `json:"tipe_produk" binding:"required"`
	Satuan        string `json:"satuan" binding:"required"`
	LacakPerBatch bool   `json:"lacak_per_batch"`
}

func (s *produkService) CreateProduk(input InputProduk) (model.Produk, error) {
	produkBaru := model.Produk{
		NamaProduk:    input.NamaProduk,
		TipeProduk:    input.TipeProduk,
		Satuan:        input.Satuan,
		LacakPerBatch: input.LacakPerBatch,
	}

	produkTersimpan, err := s.repo.Save(produkBaru)
	if err != nil {
		return model.Produk{}, err
	}

	return produkTersimpan, nil
}

func (s *produkService) GetAllProduk() ([]model.Produk, error) {
	return s.repo.FindAll()
}

func (s *produkService) GetProdukByID(ID uint) (model.Produk, error) {
	return s.repo.FindByID(ID)
}

func (s *produkService) UpdateProduk(ID uint, input InputProduk) (model.Produk, error) {
	produk, err := s.repo.FindByID(ID)
	if err != nil {
		return produk, err
	}
	produk.NamaProduk = input.NamaProduk
	produk.TipeProduk = input.TipeProduk
	produk.Satuan = input.Satuan
	produk.LacakPerBatch = input.LacakPerBatch
	return s.repo.Update(produk)
}

// PERBAIKAN: Menyesuaikan pemanggilan Delete di repository
func (s *produkService) DeleteProduk(ID uint) error {
	_, err := s.repo.FindByID(ID)
	if err != nil {
		return err
	}
	// Memanggil repo.Delete dengan parameter ID (uint)
	return s.repo.Delete(ID)
}
