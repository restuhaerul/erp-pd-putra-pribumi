// internal/service/hutang_service.go
package service

import (
	"errors"
	"fmt"
	"putra-pribumi/internal/model"
	"putra-pribumi/internal/repository"
	"time"

	"gorm.io/gorm"
)

type ServiceHutang interface {
	CreateHutang(hutang model.Hutang) (model.Hutang, error)
	GetAllHutang() ([]model.Hutang, error)
	GetHutangByID(id uint) (model.Hutang, error)
	CancelHutang(hutangID uint, userID uint) error // <-- TAMBAHKAN INI
}

type hutangService struct {
	repo        repository.RepositoryHutang
	akunKasRepo repository.RepositoryAkunKas
	db          *gorm.DB
}

// Tambahkan parameter baru di constructor
func NewHutangService(
	repo repository.RepositoryHutang,
	akunKasRepo repository.RepositoryAkunKas,
	db *gorm.DB,
) *hutangService {
	return &hutangService{repo, akunKasRepo, db}
}

func (s *hutangService) CreateHutang(hutang model.Hutang) (model.Hutang, error) {
	// Di masa depan, logika kalkulasi sisa_tagihan dll bisa ditambahkan di sini
	hutang.SisaTagihan = hutang.NilaiTotal - hutang.NilaiTerbayar
	return s.repo.Save(hutang)
}

func (s *hutangService) GetAllHutang() ([]model.Hutang, error) {
	return s.repo.FindAll()
}

func (s *hutangService) GetHutangByID(id uint) (model.Hutang, error) {
	return s.repo.FindByID(id)
}

func (s *hutangService) CancelHutang(hutangID uint, userID uint) error {
	// Lakukan semua operasi dalam satu transaksi database
	return s.db.Transaction(func(tx *gorm.DB) error {
		// 1. Ambil data hutang
		var hutang model.Hutang
		if err := tx.First(&hutang, hutangID).Error; err != nil {
			return errors.New("data hutang tidak ditemukan")
		}

		if hutang.Status == "DIBATALKAN" {
			return errors.New("hutang ini sudah pernah dibatalkan")
		}

		// 2. Logika Pembalikan Dana (jika ada pembayaran)
		if hutang.NilaiTerbayar > 0 {
			// 2a. Cari transaksi kas keluar yang asli terkait pembayaran hutang ini
			var transaksiKasAsal model.TransaksiKas
			// Kita cari berdasarkan referensi ke payment yang terkait dengan hutang
			// Ini asumsi alur pembayaran yang akan kita buat
			// Untuk sementara, kita cari berdasarkan memo atau referensi langsung jika ada
			// NOTE: Logika pencarian ini mungkin perlu disesuaikan tergantung implementasi `paymentService`
			err := tx.Where("reference_type = ? AND reference_id = ? AND arah = ?", "BATCH_PEMBELIAN", hutang.SourceID, "OUT").First(&transaksiKasAsal).Error
			if err != nil {
				// Jika tidak ketemu, berarti data tidak konsisten. Hentikan proses.
				return fmt.Errorf("tidak dapat menemukan transaksi kas asli untuk hutang #%d", hutangID)
			}

			// 2b. Buat transaksi kas pembalikan (uang masuk kembali)
			transaksiKasPembalikan := model.TransaksiKas{
				AkunKasID:     transaksiKasAsal.AkunKasID,
				Tanggal:       time.Now(),
				Arah:          "IN", // Uang masuk kembali ke kas
				Jumlah:        hutang.NilaiTerbayar,
				ReferenceType: "PEMBATALAN_HUTANG",
				ReferenceID:   hutangID,
				Memo:          fmt.Sprintf("Pengembalian dana dari pembatalan hutang #%d", hutangID),
				CreatedByID:   userID,
				Status:        "AKTIF",
			}
			if err := tx.Create(&transaksiKasPembalikan).Error; err != nil {
				return fmt.Errorf("gagal membuat transaksi kas pembalikan: %w", err)
			}

			// 2c. Update saldo akun kas (saldo bertambah)
			if err := tx.Model(&model.AkunKas{}).Where("id = ?", transaksiKasAsal.AkunKasID).Update("saldo", gorm.Expr("saldo + ?", hutang.NilaiTerbayar)).Error; err != nil {
				return fmt.Errorf("gagal mengembalikan saldo akun kas: %w", err)
			}
		}

		// 3. Update status hutang menjadi "DIBATALKAN"
		hutang.Status = "DIBATALKAN"
		hutang.SisaTagihan = hutang.NilaiTotal // Sisa tagihan kembali utuh
		if err := tx.Save(&hutang).Error; err != nil {
			return fmt.Errorf("gagal mengubah status hutang: %w", err)
		}

		// 4. (Sangat Penting) Update juga status di transaksi sumbernya
		switch hutang.SourceType {
		case "BATCH_PEMBELIAN":
			if err := tx.Model(&model.BatchPembelian{}).Where("id = ?", hutang.SourceID).Updates(map[string]interface{}{"status_pembayaran": "BELUM_LUNAS", "nilai_terbayar": 0}).Error; err != nil {
				return fmt.Errorf("gagal update status di batch pembelian: %w", err)
			}
		case "BATCH_KARUNG":
			if err := tx.Model(&model.BatchKarung{}).Where("id = ?", hutang.SourceID).Updates(map[string]interface{}{"status_pembayaran": "BELUM_LUNAS", "nilai_terbayar": 0}).Error; err != nil {
				return fmt.Errorf("gagal update status di batch karung: %w", err)
			}
		}

		return nil // Commit transaksi jika semua berhasil
	})
}
