// internal/service/piutang_service.go
package service

import (
	"putra-pribumi/internal/model"
	"putra-pribumi/internal/repository"
)

type ServicePiutang interface {
	CreatePiutang(piutang model.Piutang) (model.Piutang, error)
	GetAllPiutang() ([]model.Piutang, error)
	GetPiutangByID(id uint) (model.Piutang, error)
}

type piutangService struct {
	repo repository.RepositoryPiutang
}

func NewPiutangService(repo repository.RepositoryPiutang) *piutangService {
	return &piutangService{repo}
}

func (s *piutangService) CreatePiutang(piutang model.Piutang) (model.Piutang, error) {
	// Logika kalkulasi bisa ditambahkan di sini
	piutang.SisaTagihan = piutang.NilaiTotal - piutang.NilaiTerbayar
	return s.repo.Save(piutang)
}

func (s *piutangService) GetAllPiutang() ([]model.Piutang, error) {
	return s.repo.FindAll()
}

func (s *piutangService) GetPiutangByID(id uint) (model.Piutang, error) {
	return s.repo.FindByID(id)
}
