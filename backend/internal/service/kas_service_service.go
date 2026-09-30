package service

import (
	"errors"
	"fmt"
	"putra-pribumi/internal/model"
	"putra-pribumi/internal/repository"
	"time"

	"gorm.io/gorm"
)

// --- TAMBAHAN: Struct untuk input dari frontend ---
type InputTransaksiKasManual struct {
	AkunKasID uint    `json:"akun_kas_id" binding:"required"`
	Arah      string  `json:"arah" binding:"required,oneof=IN OUT"`
	Jumlah    float64 `json:"jumlah" binding:"required,gt=0"`
	Memo      string  `json:"memo" binding:"required"`
}

type KasData struct {
	Ringkasan     repository.RingkasanKas    `json:"ringkasan"`
	KasPenjualan  []repository.KasPenjualan  `json:"kas_penjualan"`
	KasJasaGiling []repository.KasJasaGiling `json:"kas_jasa_giling"`
}

// --- MODIFIKASI: Tambahkan fungsi baru ke interface ---
type ServiceKas interface {
	GetKasBulanan(bulan, tahun int) (KasData, error)
	CreateTransaksiKasManual(input InputTransaksiKasManual, userID uint) (model.TransaksiKas, error)
}

// --- MODIFIKASI: Tambahkan dependensi baru ---
type kasService struct {
	db          *gorm.DB
	repo        repository.RepositoryKas
	akunKasRepo repository.RepositoryAkunKas // Untuk validasi & update saldo
}

// --- MODIFIKASI: Perbarui constructor ---
func NewKasService(db *gorm.DB, repo repository.RepositoryKas, akunKasRepo repository.RepositoryAkunKas) *kasService {
	return &kasService{db, repo, akunKasRepo}
}

func (s *kasService) GetKasBulanan(bulan, tahun int) (KasData, error) {
	startDate := time.Date(tahun, time.Month(bulan), 1, 0, 0, 0, 0, time.Local)
	endDate := startDate.AddDate(0, 1, 0).Add(-1 * time.Second)

	var data KasData

	// Get ringkasan
	ringkasan, err := s.repo.GetRingkasanKas(startDate, endDate)
	if err != nil {
		return data, err
	}
	data.Ringkasan = ringkasan

	// Get detail kas penjualan
	kasPenjualan, err := s.repo.GetKasPenjualan(startDate, endDate)
	if err != nil {
		return data, err
	}
	data.KasPenjualan = kasPenjualan

	// Get detail kas jasa giling
	kasJasaGiling, err := s.repo.GetKasJasaGiling(startDate, endDate)
	if err != nil {
		return data, err
	}
	data.KasJasaGiling = kasJasaGiling

	return data, nil
}

// --- TAMBAHAN: Implementasi fungsi baru untuk transaksi manual ---
func (s *kasService) CreateTransaksiKasManual(input InputTransaksiKasManual, userID uint) (model.TransaksiKas, error) {
	var transaksiKas model.TransaksiKas

	err := s.db.Transaction(func(tx *gorm.DB) error {
		// 1. Validasi apakah Akun Kas ada dan aktif
		akun, err := s.akunKasRepo.FindByID(input.AkunKasID)
		if err != nil {
			return errors.New("akun kas tidak ditemukan")
		}
		if !akun.IsActive {
			return errors.New("akun kas tidak aktif")
		}

		// 2. Buat record TransaksiKas
		transaksiKas = model.TransaksiKas{
			AkunKasID:     input.AkunKasID,
			Tanggal:       time.Now(),
			Arah:          input.Arah,
			Jumlah:        input.Jumlah,
			ReferenceType: "MANUAL_INPUT",
			Memo:          input.Memo,
			CreatedByID:   userID,
			Status:        "AKTIF",
		}
		if err := tx.Create(&transaksiKas).Error; err != nil {
			return fmt.Errorf("gagal membuat record transaksi kas: %w", err)
		}

		// 3. Update saldo AkunKas
		saldoChange := input.Jumlah
		if input.Arah == "OUT" {
			if akun.Saldo < input.Jumlah {
				return fmt.Errorf("saldo tidak mencukupi. Saldo saat ini: %s", formatRupiah(akun.Saldo))
			}
			saldoChange = -input.Jumlah
		}
		if err := tx.Model(&model.AkunKas{}).Where("id = ?", input.AkunKasID).Update("saldo", gorm.Expr("saldo + ?", saldoChange)).Error; err != nil {
			return fmt.Errorf("gagal mengupdate saldo akun kas: %w", err)
		}

		return nil
	})

	return transaksiKas, err
}

// Helper kecil untuk format rupiah di error message
func formatRupiah(angka float64) string {
	return fmt.Sprintf("Rp %.0f", angka)
}
