package service

import (
	"putra-pribumi/internal/repository"
	"time"
)

// Struct untuk format laporan keuangan
type LaporanKeuangan struct {
	Periode            string                   `json:"periode"`
	TotalPemasukan     float64                  `json:"total_pemasukan"`
	TotalPengeluaran   float64                  `json:"total_pengeluaran"`
	DetailPengeluaran  map[string]float64       `json:"detail_pengeluaran"`
	LabaBersih         float64                  `json:"laba_bersih"`
	RincianPemasukan   []repository.RincianGrup `json:"rincian_pemasukan"`
	RincianPengeluaran []repository.RincianGrup `json:"rincian_pengeluaran"`
}

type ServiceLaporan interface {
	GetLaporanBulanan(bulan, tahun int) (LaporanKeuangan, error)
}

type laporanService struct {
	repo repository.RepositoryLaporan
}

func NewLaporanService(repo repository.RepositoryLaporan) *laporanService {
	return &laporanService{repo}
}

func (s *laporanService) GetLaporanBulanan(bulan, tahun int) (LaporanKeuangan, error) {
	startDate := time.Date(tahun, time.Month(bulan), 1, 0, 0, 0, 0, time.Local)
	endDate := startDate.AddDate(0, 1, 0).Add(-1 * time.Second) // Cara lebih akurat untuk akhir bulan

	// Mengambil semua data dari repository
	totalPemasukan, err := s.repo.GetTotalPemasukan(startDate, endDate)
	if err != nil {
		return LaporanKeuangan{}, err
	}

	totalBiayaBahanBaku, err := s.repo.GetTotalBiayaBahanBaku(startDate, endDate)
	if err != nil {
		return LaporanKeuangan{}, err
	}

	totalBiayaOperasional, err := s.repo.GetTotalBiayaOperasional(startDate, endDate)
	if err != nil {
		return LaporanKeuangan{}, err
	}

	// --- AMBIL DATA RINCIAN BARU ---
	rincianPemasukan, err := s.repo.GetRincianPemasukan(startDate, endDate)
	if err != nil {
		return LaporanKeuangan{}, err
	}

	rincianOperasional, err := s.repo.GetRincianPengeluaranOperasional(startDate, endDate)
	if err != nil {
		return LaporanKeuangan{}, err
	}

	// Gabungkan rincian pengeluaran
	var rincianPengeluaran []repository.RincianGrup
	if totalBiayaBahanBaku > 0 {
		rincianPengeluaran = append(rincianPengeluaran, repository.RincianGrup{Nama: "Pembelian Bahan Baku", Total: totalBiayaBahanBaku})
	}
	rincianPengeluaran = append(rincianPengeluaran, rincianOperasional...)

	// Kalkulasi
	totalPengeluaran := totalBiayaBahanBaku + totalBiayaOperasional
	labaBersih := totalPemasukan - totalPengeluaran

	// Menyusun laporan lengkap
	laporan := LaporanKeuangan{
		Periode:            startDate.Format("January 2006"),
		TotalPemasukan:     totalPemasukan,
		TotalPengeluaran:   totalPengeluaran,
		LabaBersih:         labaBersih,
		RincianPemasukan:   rincianPemasukan,
		RincianPengeluaran: rincianPengeluaran,
	}

	return laporan, nil
}
