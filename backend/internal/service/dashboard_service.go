package service

import (
	"putra-pribumi/internal/repository"
	"time"
)

type DashboardData struct {
	RingkasanHarian  repository.RingkasanHarian    `json:"ringkasan_harian"`
	StokProdukJadi   float64                       `json:"stok_produk_jadi"`
	StokBahanMentah  float64                       `json:"stok_bahan_mentah"`
	AktivitasTerbaru []repository.AktivitasTerbaru `json:"aktivitas_terbaru"`

	// Data tambahan untuk dashboard yang lebih informatif
	PerbandinganMingguan repository.PerbandinganMingguan `json:"perbandingan_mingguan"`
	PergerakanStok       []repository.PergerakanStok     `json:"pergerakan_stok"`
	AktivitasUser        []repository.AktivitasUser      `json:"aktivitas_user"`
	TargetHarian         repository.TargetHarian         `json:"target_harian"`
	ReminderUrgent       []repository.ReminderUrgent     `json:"reminder_urgent"`
	StatistikBulanan     repository.StatistikBulanan     `json:"statistik_bulanan"`
	TopProduk            []repository.TopProduk          `json:"top_produk"`
}

type ServiceDashboard interface {
	GetDashboardData() (DashboardData, error)
}

type dashboardService struct {
	repo repository.RepositoryDashboard
}

func NewDashboardService(repo repository.RepositoryDashboard) *dashboardService {
	return &dashboardService{repo}
}

func (s *dashboardService) GetDashboardData() (DashboardData, error) {
	var data DashboardData
	now := time.Now()

	// Data yang sudah ada
	ringkasanHarian, err := s.repo.GetRingkasanHarian(now)
	if err != nil {
		return DashboardData{}, err
	}
	data.RingkasanHarian = ringkasanHarian

	ringkasanStok, err := s.repo.GetRingkasanStok()
	if err != nil {
		return DashboardData{}, err
	}
	for _, rs := range ringkasanStok {
		if rs.TipeProduk == "PRODUK_JADI" {
			data.StokProdukJadi = rs.TotalStok
		} else if rs.TipeProduk == "BAHAN_MENTAH" {
			data.StokBahanMentah = rs.TotalStok
		}
	}

	aktivitas, err := s.repo.GetAktivitasTerbaru(5)
	if err != nil {
		return DashboardData{}, err
	}
	data.AktivitasTerbaru = aktivitas

	// Data tambahan baru
	perbandinganMingguan, err := s.repo.GetPerbandinganMingguan(now)
	if err != nil {
		return DashboardData{}, err
	}
	data.PerbandinganMingguan = perbandinganMingguan

	pergerakanStok, err := s.repo.GetPergerakanStok(7) // 7 hari terakhir
	if err != nil {
		return DashboardData{}, err
	}
	data.PergerakanStok = pergerakanStok

	aktivitasUser, err := s.repo.GetAktivitasUser(10)
	if err != nil {
		return DashboardData{}, err
	}
	data.AktivitasUser = aktivitasUser

	targetHarian, err := s.repo.GetTargetHarian(now)
	if err != nil {
		return DashboardData{}, err
	}
	data.TargetHarian = targetHarian

	reminderUrgent, err := s.repo.GetReminderUrgent()
	if err != nil {
		return DashboardData{}, err
	}
	data.ReminderUrgent = reminderUrgent

	statistikBulanan, err := s.repo.GetStatistikBulanan(now)
	if err != nil {
		return DashboardData{}, err
	}
	data.StatistikBulanan = statistikBulanan

	topProduk, err := s.repo.GetTopProduk(5)
	if err != nil {
		return DashboardData{}, err
	}
	data.TopProduk = topProduk

	return data, nil
}
