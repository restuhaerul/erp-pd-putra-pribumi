// FILE: internal/service/karung_service.go
package service

import (
	"errors"
	"fmt"
	"log"
	"putra-pribumi/internal/model"
	"putra-pribumi/internal/repository"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// --- Interface Service (Signature diubah untuk userID) ---
type ServiceKarung interface {
	CreatePembelianKarung(input InputPembelianKarung, userID uint) (model.BatchKarung, error)
	GetAllKarung() ([]model.BatchKarung, error)
	UpdatePembelianKarung(id uint, input InputPembelianKarung, userID uint) (model.BatchKarung, error)
	DeletePembelianKarung(id uint, userID uint) error
}

// --- Struct Input (AkunKasID tidak wajib jika BELUM_LUNAS) ---
type InputPembelianKarung struct {
	ProdukID         uint    `json:"produk_id" binding:"required"`
	NamaPemasok      string  `json:"nama_pemasok"`
	Jumlah           int     `json:"jumlah" binding:"required"`
	HargaSatuan      float64 `json:"harga_satuan" binding:"required"`
	AkunKasID        uint    `json:"akun_kas_id"`                          // Tidak wajib jika hutang
	StatusPembayaran string  `json:"status_pembayaran" binding:"required"` // LUNAS, SEBAGIAN, BELUM_LUNAS
	NilaiTerbayar    float64 `json:"nilai_terbayar"`                       // Untuk DP/Sebagian
}

// --- Struct Service (Dependensi disesuaikan) ---
type karungService struct {
	db                      *gorm.DB
	repo                    repository.RepositoryKarung
	repoProduk              repository.RepositoryProduk
	biayaOperasionalService ServiceBiayaOperasional
	akunKasRepo             repository.RepositoryAkunKas
	hutangService           ServiceHutang
}

// --- Constructor (Dependensi disesuaikan) ---
func NewKarungService(
	db *gorm.DB,
	repo repository.RepositoryKarung,
	repoProduk repository.RepositoryProduk,
	biayaOperasionalService ServiceBiayaOperasional,
	akunKasRepo repository.RepositoryAkunKas,
	hutangService ServiceHutang,
) *karungService {
	return &karungService{db, repo, repoProduk, biayaOperasionalService, akunKasRepo, hutangService}
}

// --- FUNGSI CREATE (Dengan Logika Kas & Status Pembayaran) ---
func (s *karungService) CreatePembelianKarung(input InputPembelianKarung, userID uint) (model.BatchKarung, error) {
	var karungBaru model.BatchKarung
	err := s.db.Transaction(func(tx *gorm.DB) error {
		var err error
		karungBaru, err = s.createKarungLogic(tx, input, userID)
		return err
	})
	return karungBaru, err
}

func (s *karungService) createKarungLogic(tx *gorm.DB, input InputPembelianKarung, userID uint) (model.BatchKarung, error) {
	totalHarga := float64(input.Jumlah) * input.HargaSatuan

	// ===================================================================
	// 🔥 TENTUKAN NILAI TERBAYAR
	// ===================================================================
	nilaiBayar := input.NilaiTerbayar
	if input.StatusPembayaran == "LUNAS" {
		nilaiBayar = totalHarga
	} else if input.StatusPembayaran == "BELUM_LUNAS" {
		nilaiBayar = 0
	}
	if nilaiBayar > totalHarga {
		return model.BatchKarung{}, errors.New("nilai terbayar tidak boleh melebihi total harga")
	}

	// ===================================================================
	// ✅ FIX: VALIDASI AKUN KAS HANYA KALAU ADA PEMBAYARAN
	// ===================================================================
	if nilaiBayar > 0 && input.AkunKasID == 0 {
		return model.BatchKarung{}, errors.New("akun kas harus dipilih saat melakukan pembayaran")
	}
	// ===================================================================

	karungBaru := model.BatchKarung{
		ProdukID:         input.ProdukID,
		TglPembelian:     time.Now(),
		NamaPemasok:      input.NamaPemasok,
		Jumlah:           input.Jumlah,
		HargaSatuan:      input.HargaSatuan,
		Sisa:             input.Jumlah,
		TotalHarga:       totalHarga,
		Status:           "AKTIF",
		StatusPembayaran: input.StatusPembayaran,
		NilaiTerbayar:    nilaiBayar,
	}
	hasil, err := s.repo.Save(tx, karungBaru)
	if err != nil {
		return model.BatchKarung{}, err
	}

	// ===================================================================
	// BUAT CATATAN HUTANG
	// ===================================================================
	hutangBaru := model.Hutang{
		NamaPemasok:      hasil.NamaPemasok,
		TanggalTransaksi: hasil.TglPembelian,
		JatuhTempo:       hasil.TglPembelian.AddDate(0, 1, 0),
		NilaiTotal:       hasil.TotalHarga,
		NilaiTerbayar:    hasil.NilaiTerbayar,
		SisaTagihan:      hasil.TotalHarga - hasil.NilaiTerbayar,
		Status:           input.StatusPembayaran,
		SourceType:       "BATCH_KARUNG",
		SourceID:         hasil.ID,
	}
	if _, err := s.hutangService.CreateHutang(hutangBaru); err != nil {
		return model.BatchKarung{}, fmt.Errorf("gagal membuat catatan hutang: %w", err)
	}

	produk, err := s.repoProduk.FindByID(input.ProdukID)
	if err != nil {
		return model.BatchKarung{}, errors.New("produk karung tidak ditemukan")
	}

	biaya := model.BiayaOperasional{
		Tanggal:       hasil.TglPembelian,
		Kategori:      "KEMASAN",
		Deskripsi:     fmt.Sprintf("Pembelian %s dari %s (Batch Karung #%d)", produk.NamaProduk, input.NamaPemasok, hasil.ID),
		Jumlah:        totalHarga,
		BatchKarungID: &hasil.ID,
	}
	if err := tx.Create(&biaya).Error; err != nil {
		return model.BatchKarung{}, err
	}

	// ===================================================================
	// 🔥 HANYA CATAT KAS JIKA ADA PEMBAYARAN
	// ===================================================================
	if nilaiBayar > 0 {
		// ✅ LOCK & VALIDASI SALDO KAS
		var akunKas model.AkunKas
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ?", input.AkunKasID).
			First(&akunKas).Error; err != nil {
			return model.BatchKarung{}, errors.New("akun kas tidak ditemukan")
		}

		// ✅ CEK SALDO DULU!
		if akunKas.Saldo < nilaiBayar {
			return model.BatchKarung{}, fmt.Errorf("saldo tidak mencukupi. Saldo tersedia: Rp %.0f, dibutuhkan: Rp %.0f",
				akunKas.Saldo, nilaiBayar)
		}

		kas := model.TransaksiKas{
			AkunKasID:     input.AkunKasID,
			Tanggal:       hasil.TglPembelian,
			Arah:          "OUT",
			Jumlah:        nilaiBayar,
			ReferenceType: "BATCH_KARUNG",
			ReferenceID:   hasil.ID,
			Memo:          fmt.Sprintf("Pembayaran pembelian karung dari %s", hasil.NamaPemasok),
			CreatedByID:   userID,
		}
		if err := tx.Create(&kas).Error; err != nil {
			return model.BatchKarung{}, err
		}
		if err := tx.Model(&model.AkunKas{}).Where("id = ?", input.AkunKasID).Update("saldo", gorm.Expr("saldo - ?", nilaiBayar)).Error; err != nil {
			return model.BatchKarung{}, err
		}
	}
	// ===================================================================

	return hasil, nil
}

// --- FUNGSI DELETE (Dengan Logika Refund Kas) ---
func (s *karungService) DeletePembelianKarung(id uint, userID uint) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		return s.deleteKarungLogic(tx, id, userID)
	})
}

func (s *karungService) deleteKarungLogic(tx *gorm.DB, id uint, userID uint) error {
	karung, err := s.repo.FindByID(id)
	if err != nil {
		return errors.New("batch karung tidak ditemukan")
	}
	if karung.Jumlah != karung.Sisa {
		return errors.New("tidak bisa membatalkan pembelian karung yang sudah terpakai")
	}

	// Refund hanya jika ada transaksi kas sebelumnya (ada pembayaran)
	var kasAsal model.TransaksiKas
	if err := tx.Where("reference_type = ? AND reference_id = ? AND arah = 'OUT'", "BATCH_KARUNG", id).First(&kasAsal).Error; err == nil {
		refund := model.TransaksiKas{
			AkunKasID:   kasAsal.AkunKasID,
			Tanggal:     time.Now(),
			Arah:        "IN",
			Jumlah:      kasAsal.Jumlah, // Refund sesuai yang dibayar, bukan total
			Memo:        fmt.Sprintf("Refund pembatalan pembelian karung #%d", id),
			CreatedByID: userID,
		}
		if err := tx.Create(&refund).Error; err != nil {
			return fmt.Errorf("gagal membuat transaksi refund: %w", err)
		}
		if err := tx.Model(&model.AkunKas{}).Where("id = ?", kasAsal.AkunKasID).Update("saldo", gorm.Expr("saldo + ?", kasAsal.Jumlah)).Error; err != nil {
			return fmt.Errorf("gagal mengembalikan saldo kas: %w", err)
		}
	} else {
		log.Printf("Info: Tidak ada transaksi kas untuk Batch Karung #%d (kemungkinan hutang penuh). Tidak ada refund.", id)
	}

	if err := s.biayaOperasionalService.DeleteByKarungID(tx, id); err != nil {
		return fmt.Errorf("gagal menghapus biaya operasional terkait: %w", err)
	}

	return s.repo.Delete(tx, id)
}

// --- FUNGSI UPDATE (Menyesuaikan dengan userID) ---
func (s *karungService) UpdatePembelianKarung(id uint, input InputPembelianKarung, userID uint) (model.BatchKarung, error) {
	var karungDiperbarui model.BatchKarung
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := s.deleteKarungLogic(tx, id, userID); err != nil {
			if !errors.Is(err, gorm.ErrRecordNotFound) {
				return fmt.Errorf("gagal membatalkan pembelian karung lama saat update: %w", err)
			}
			return errors.New("data pembelian karung yang akan diupdate tidak ditemukan")
		}
		var err error
		karungDiperbarui, err = s.createKarungLogic(tx, input, userID)
		if err != nil {
			return fmt.Errorf("gagal membuat ulang data pembelian karung saat update: %w", err)
		}
		return nil
	})
	return karungDiperbarui, err
}

// --- FUNGSI GetAllKarung (Tidak Berubah) ---
func (s *karungService) GetAllKarung() ([]model.BatchKarung, error) {
	daftarKarung, err := s.repo.FindAll()
	if err != nil {
		return nil, err
	}
	for i := range daftarKarung {
		if daftarKarung[i].Jumlah != daftarKarung[i].Sisa {
			daftarKarung[i].IsTerpakai = true
		}
	}
	return daftarKarung, nil
}
