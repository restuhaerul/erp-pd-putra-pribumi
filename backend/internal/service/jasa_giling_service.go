package service

import (
	"errors"
	"fmt"
	"log"
	"putra-pribumi/internal/model"
	"putra-pribumi/internal/repository"
	"time"

	"gorm.io/gorm"
)

// Interface (pastikan signature-nya sesuai)
type ServiceJasaGiling interface {
	CreateJasaGiling(input InputJasaGiling, userID uint) (model.TransaksiJasaGiling, error)
	GetAllJasaGiling() ([]model.TransaksiJasaGiling, error)
	GetJasaGilingByID(ID uint) (model.TransaksiJasaGiling, error)
	UpdateJasaGiling(ID uint, input InputJasaGiling, userID uint) (model.TransaksiJasaGiling, error)
	DeleteJasaGiling(ID uint, userID uint) error
}

// Struct Service (tidak berubah)
type jasaGilingService struct {
	db                 *gorm.DB
	repo               repository.RepositoryJasaGiling
	stokProdukService  ServiceStokProduk
	logService         ServiceLogStok
	konfigurasiService ServiceKonfigurasi
	piutangService     ServicePiutang
	akunKasRepo        repository.RepositoryAkunKas
}

// Constructor (tidak berubah)
func NewJasaGilingService(
	db *gorm.DB,
	repo repository.RepositoryJasaGiling,
	stokProdukService ServiceStokProduk,
	logService ServiceLogStok,
	konfigurasiService ServiceKonfigurasi,
	piutangService ServicePiutang,
	akunKasRepo repository.RepositoryAkunKas,
) *jasaGilingService {
	return &jasaGilingService{
		db, repo, stokProdukService, logService, konfigurasiService, piutangService, akunKasRepo,
	}
}

// Input struct (tidak berubah)
type InputJasaGiling struct {
	NamaPelanggan           string  `json:"nama_pelanggan" binding:"required"`
	BeratBerasHasilKg       float64 `json:"berat_beras_hasil_kg" binding:"required"`
	TipePembayaran          string  `json:"tipe_pembayaran" binding:"required,oneof=TUNAI BERAS"`
	ProdukPembayaranID      uint    `json:"produk_pembayaran_id,omitempty"`
	JumlahPembayaranTunai   float64 `json:"jumlah_pembayaran_tunai,omitempty"`
	JumlahPembayaranBerasKg float64 `json:"jumlah_pembayaran_beras_kg,omitempty"`
	Deskripsi               string  `json:"deskripsi"`
	TipeJasaGiling          string  `json:"tipe_jasa_giling"`
	BeratGabahAwalKg        float64 `json:"berat_gabah_awal_kg"`
}

// --- FUNGSI UTAMA (Wrapper) ---
func (s *jasaGilingService) CreateJasaGiling(input InputJasaGiling, userID uint) (model.TransaksiJasaGiling, error) {
	var jasa model.TransaksiJasaGiling
	err := s.db.Transaction(func(tx *gorm.DB) error {
		var err error
		jasa, err = s.createJasaGilingLogic(tx, input, userID)
		return err
	})
	return jasa, err
}

func (s *jasaGilingService) UpdateJasaGiling(ID uint, input InputJasaGiling, userID uint) (model.TransaksiJasaGiling, error) {
	var jasaDiperbarui model.TransaksiJasaGiling
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := s.deleteJasaGilingLogic(tx, ID, userID); err != nil {
			return err
		}
		var err error
		jasaDiperbarui, err = s.createJasaGilingLogic(tx, input, userID)
		return err
	})
	return jasaDiperbarui, err
}

func (s *jasaGilingService) DeleteJasaGiling(ID uint, userID uint) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		return s.deleteJasaGilingLogic(tx, ID, userID)
	})
}

// --- FUNGSI HELPER ---

// *** FUNGSI INI DIPERBAIKI TOTAL ***
func (s *jasaGilingService) createJasaGilingLogic(tx *gorm.DB, input InputJasaGiling, userID uint) (model.TransaksiJasaGiling, error) {
	var kasGiling model.AkunKas
	if err := tx.Where("nama_akun = ?", "Kas Giling").First(&kasGiling).Error; err != nil {
		return model.TransaksiJasaGiling{}, errors.New("akun 'Kas Giling' tidak ditemukan")
	}
	konfigurasi, err := s.konfigurasiService.GetKonfigurasi()
	if err != nil {
		return model.TransaksiJasaGiling{}, err
	}

	var totalTagihan float64
	if input.TipeJasaGiling == "UMUM" {
		totalTagihan = input.BeratBerasHasilKg * konfigurasi.TarifJasaGilingUmumPerKgBeras
	} else {
		totalTagihan = input.BeratGabahAwalKg * konfigurasi.TarifJasaGilingPribadiPerKgGabah
	}

	jasa := model.TransaksiJasaGiling{
		TipeJasaGiling:    input.TipeJasaGiling,
		Tanggal:           time.Now(),
		NamaPelanggan:     input.NamaPelanggan,
		BeratBerasHasilKg: input.BeratBerasHasilKg,
		BeratGabahAwalKg:  input.BeratGabahAwalKg,
		TotalTagihan:      totalTagihan,
		TipePembayaran:    input.TipePembayaran,
		Deskripsi:         input.Deskripsi,
		Status:            "AKTIF",
	}

	// 1. SIMPAN DULU RECORD UTAMA UNTUK MENDAPATKAN ID
	if err := tx.Create(&jasa).Error; err != nil {
		return model.TransaksiJasaGiling{}, fmt.Errorf("gagal menyimpan record jasa giling: %w", err)
	}

	// 2. PROSES LOGIKA SETELAH ID DIDAPATKAN
	if input.TipePembayaran == "BERAS" {
		if input.ProdukPembayaranID == 0 || input.JumlahPembayaranBerasKg <= 0 {
			return model.TransaksiJasaGiling{}, errors.New("produk dan jumlah beras wajib diisi")
		}
		jasa.ProdukPembayaranID = &input.ProdukPembayaranID
		jasa.JumlahPembayaranBerasKg = input.JumlahPembayaranBerasKg
		jasa.JumlahPembayaranTunai = 0

		if err := s.stokProdukService.UpdateStokAndHpp(tx, *jasa.ProdukPembayaranID, jasa.JumlahPembayaranBerasKg, 0); err != nil {
			return model.TransaksiJasaGiling{}, fmt.Errorf("gagal menambah stok beras dari pembayaran: %w", err)
		}

		logData := model.LogStokProduk{
			ProdukID:     *jasa.ProdukPembayaranID,
			JumlahKg:     jasa.JumlahPembayaranBerasKg,
			Deskripsi:    fmt.Sprintf("Stok masuk dari pembayaran jasa giling oleh %s", jasa.NamaPelanggan),
			JasaGilingID: &jasa.ID, // jasa.ID sekarang sudah valid
		}
		if err := s.logService.CatatStokMasuk(tx, logData); err != nil {
			return model.TransaksiJasaGiling{}, fmt.Errorf("gagal catat log stok: %w", err)
		}

	} else { // Pembayaran TUNAI
		jasa.JumlahPembayaranTunai = totalTagihan
		if totalTagihan > 0 {
			memo := fmt.Sprintf("Pendapatan Jasa Giling Umum dari %s", jasa.NamaPelanggan)
			if jasa.TipeJasaGiling == "PRIBADI" {
				memo = "Pendapatan Jasa Giling Pribadi"
			}

			transaksiKas := model.TransaksiKas{
				AkunKasID: kasGiling.ID, Tanggal: time.Now(), Arah: "IN", Jumlah: totalTagihan,
				ReferenceType: "JASA_GILING", ReferenceID: jasa.ID, Memo: memo, CreatedByID: userID,
			}
			if err := tx.Create(&transaksiKas).Error; err != nil {
				return model.TransaksiJasaGiling{}, err
			}
			if err := tx.Model(&kasGiling).Update("saldo", gorm.Expr("saldo + ?", totalTagihan)).Error; err != nil {
				return model.TransaksiJasaGiling{}, err
			}
		}
	}

	if jasa.TipeJasaGiling == "UMUM" {
		piutangBaru := model.Piutang{
			NamaPelanggan: jasa.NamaPelanggan, TanggalTransaksi: jasa.Tanggal, JatuhTempo: jasa.Tanggal.AddDate(0, 1, 0),
			NilaiTotal: jasa.TotalTagihan, SourceType: "JASA_GILING", SourceID: jasa.ID,
		}
		if _, err := s.piutangService.CreatePiutang(piutangBaru); err != nil {
			return model.TransaksiJasaGiling{}, err
		}
	}

	// 3. SIMPAN PERUBAHAN TERAKHIR (seperti ProdukPembayaranID)
	if err := tx.Save(&jasa).Error; err != nil {
		return model.TransaksiJasaGiling{}, fmt.Errorf("gagal finalisasi data jasa giling: %w", err)
	}

	return jasa, nil
}

// *** FUNGSI INI JUGA DIPERBAIKI ***
func (s *jasaGilingService) deleteJasaGilingLogic(tx *gorm.DB, ID uint, userID uint) error {
	jasa, err := s.repo.FindByID(ID)
	if err != nil {
		return errors.New("transaksi jasa giling tidak ditemukan")
	}

	if jasa.TipePembayaran == "BERAS" && jasa.ProdukPembayaranID != nil && jasa.JumlahPembayaranBerasKg > 0 {
		if err := s.stokProdukService.UpdateStokAndHpp(tx, *jasa.ProdukPembayaranID, -jasa.JumlahPembayaranBerasKg, 0); err != nil {
			return fmt.Errorf("gagal mengembalikan stok beras: %w", err)
		}
		if err := s.logService.DeleteLogBySource(tx, "JASA_GILING", jasa.ID); err != nil {
			log.Printf("Peringatan: Gagal hapus log stok jasa giling #%d: %v", jasa.ID, err)
		}
	}

	if jasa.TipePembayaran == "TUNAI" && jasa.TotalTagihan > 0 {
		var kasAsal model.TransaksiKas
		if err := tx.Where("reference_type = ? AND reference_id = ?", "JASA_GILING", ID).First(&kasAsal).Error; err == nil {
			refund := model.TransaksiKas{
				AkunKasID: kasAsal.AkunKasID, Tanggal: time.Now(), Arah: "OUT", Jumlah: jasa.TotalTagihan,
				Memo: fmt.Sprintf("Refund/Pembatalan Jasa Giling #%d", ID), CreatedByID: userID,
			}
			if err := tx.Create(&refund).Error; err != nil {
				return err
			}
			if err := tx.Model(&model.AkunKas{}).Where("id = ?", kasAsal.AkunKasID).Update("saldo", gorm.Expr("saldo - ?", jasa.TotalTagihan)).Error; err != nil {
				return err
			}
		}
	}

	if err := tx.Where("source_type = ? AND source_id = ?", "JASA_GILING", ID).Delete(&model.Piutang{}).Error; err != nil {
		return err
	}

	return tx.Delete(&model.TransaksiJasaGiling{}, ID).Error
}

func (s *jasaGilingService) GetAllJasaGiling() ([]model.TransaksiJasaGiling, error) {
	return s.repo.FindAll()
}
func (s *jasaGilingService) GetJasaGilingByID(ID uint) (model.TransaksiJasaGiling, error) {
	return s.repo.FindByID(ID)
}
