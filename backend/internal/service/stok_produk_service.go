// putra-pribumi/internal/service/stok_produk_service.go
package service

import (
	"errors"
	"fmt"
	"putra-pribumi/internal/model"
	"putra-pribumi/internal/repository"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type ServiceStokProduk interface {
	GetAllStokProduk() ([]model.StokProduk, error)
	GetStokByProdukID(produkID uint) (*model.StokProduk, error)
	UpdateStokAndHpp(tx *gorm.DB, produkID uint, jumlahTambah float64, nilaiTambah float64) error
	TambahStok(input InputTambahStok) (model.StokProduk, error)
	TambahStokDenganBiaya(input InputTambahStokDenganBiaya) (model.StokProduk, error)
	TambahStokManual(input InputTambahStok) (model.StokProduk, error)
	TambahStokKemasan(input InputTambahStokKemasan) (model.StokProduk, error)
	GetByProdukID(produkID uint) (*model.StokProduk, error) // Pointer return
}

type stokProdukService struct {
	repo       repository.RepositoryStokProduk
	repoBiaya  repository.RepositoryBiayaOperasional
	repoProduk repository.RepositoryProduk
	db         *gorm.DB
	logService ServiceLogStok
}

type InputTambahStok struct {
	ProdukID uint    `json:"produk_id" binding:"required"`
	JumlahKg float64 `json:"jumlah_kg" binding:"required"`
}

type InputTambahStokDenganBiaya struct {
	ProdukID    uint    `json:"produk_id" binding:"required"`
	JumlahKg    float64 `json:"jumlah_kg" binding:"required"`
	HargaPerKg  float64 `json:"harga_per_kg" binding:"required"`
	NamaPemasok string  `json:"nama_pemasok"`
}

// ✅ TAMBAHKAN STRUCT INPUT BARU INI
type InputTambahStokKemasan struct {
	ProdukID    uint    `json:"produk_id" binding:"required"`
	Jumlah      int     `json:"jumlah" binding:"required"`
	HargaSatuan float64 `json:"harga_satuan" binding:"required"`
	NamaPemasok string  `json:"nama_pemasok"`
}

func NewStokProdukService(repo repository.RepositoryStokProduk, repoBiaya repository.RepositoryBiayaOperasional, repoProduk repository.RepositoryProduk, db *gorm.DB, logService ServiceLogStok) *stokProdukService {
	return &stokProdukService{repo, repoBiaya, repoProduk, db, logService}
}

func (s *stokProdukService) GetAllStokProduk() ([]model.StokProduk, error) {
	return s.repo.FindAll()
}

// ======================================================================
// FUNGSI INI YANG DIPERBAIKI
// ======================================================================
func (s *stokProdukService) GetStokByProdukID(produkID uint) (*model.StokProduk, error) {
	// Ganti dari s.repo.FindByProdukID menjadi s.repo.FirstOrCreateByProdukID
	// Ini akan otomatis membuat record stok baru jika belum ada,
	// sehingga mencegah error "record not found".
	var stok model.StokProduk
	if err := s.db.Where("produk_id = ?", produkID).First(&stok).Error; err != nil {
		return nil, err
	}
	return &stok, nil
}

// ======================================================================

func (s *stokProdukService) UpdateStokAndHpp(tx *gorm.DB, produkID uint, jumlahTambah float64, nilaiTambah float64) error {
	// ===================================================================
	// 🔒 LOCK ROW STOK PRODUK - RACE CONDITION FIX
	// ===================================================================
	var stok model.StokProduk

	// Coba lock row yang sudah ada
	err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("produk_id = ?", produkID).
		First(&stok).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// Kalau belum ada, buat baru (FirstOrCreate ga bisa pake locking)
			stok = model.StokProduk{
				ProdukID:    produkID,
				TotalStokKg: 0,
				HppRataRata: 0,
			}
			if err := tx.Create(&stok).Error; err != nil {
				return fmt.Errorf("gagal membuat record stok baru: %w", err)
			}

			// Lock record yang baru dibuat
			if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
				Where("produk_id = ?", produkID).
				First(&stok).Error; err != nil {
				return fmt.Errorf("gagal mengunci record stok: %w", err)
			}
		} else {
			return fmt.Errorf("gagal mengakses stok produk: %w", err)
		}
	}

	// ===================================================================
	// KALKULASI HPP RATA-RATA (SEKARANG AMAN - ROW SUDAH DI-LOCK)
	// ===================================================================
	nilaiStokLama := stok.TotalStokKg * stok.HppRataRata
	totalStokBaru := stok.TotalStokKg + jumlahTambah

	var hppRataRataBaru float64
	if totalStokBaru > 0 {
		hppRataRataBaru = (nilaiStokLama + nilaiTambah) / totalStokBaru
	} else {
		hppRataRataBaru = 0
	}

	// Update nilai
	stok.TotalStokKg = totalStokBaru
	stok.HppRataRata = hppRataRataBaru

	// ===================================================================
	// SAVE (ATOMIC - DALAM TRANSACTION YANG SAMA)
	// ===================================================================
	if err := tx.Save(&stok).Error; err != nil {
		return fmt.Errorf("gagal menyimpan perubahan stok: %w", err)
	}

	return nil
}

func (s *stokProdukService) TambahStok(input InputTambahStok) (model.StokProduk, error) {
	stok, err := s.repo.FirstOrCreateByProdukID(input.ProdukID)
	if err != nil {
		return model.StokProduk{}, err
	}
	stok.TotalStokKg += input.JumlahKg
	return s.repo.Update(stok)
}

func (s *stokProdukService) TambahStokManual(input InputTambahStok) (model.StokProduk, error) {
	var stokTerbaru model.StokProduk
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := s.UpdateStokAndHpp(tx, input.ProdukID, input.JumlahKg, 0); err != nil {
			return err
		}
		logData := model.LogStokProduk{
			ProdukID:  input.ProdukID,
			JumlahKg:  input.JumlahKg,
			Deskripsi: "Penambahan stok manual",
		}
		if err := s.logService.CatatStokMasuk(tx, logData); err != nil {
			return err
		}
		if err := tx.Preload("Produk").Where("produk_id = ?", input.ProdukID).First(&stokTerbaru).Error; err != nil {
			return err
		}
		return nil
	})
	return stokTerbaru, err
}

func (s *stokProdukService) TambahStokDenganBiaya(input InputTambahStokDenganBiaya) (model.StokProduk, error) {
	var stokDiperbarui model.StokProduk
	err := s.db.Transaction(func(tx *gorm.DB) error {
		totalHarga := input.JumlahKg * input.HargaPerKg
		if err := s.UpdateStokAndHpp(tx, input.ProdukID, input.JumlahKg, totalHarga); err != nil {
			return err
		}
		produk, _ := s.repoProduk.FindByID(input.ProdukID)
		biayaBaru := model.BiayaOperasional{
			Tanggal:   time.Now(),
			Kategori:  "PEMBELIAN_BAHAN",
			Deskripsi: fmt.Sprintf("Pembelian %s dari %s", produk.NamaProduk, input.NamaPemasok),
			Jumlah:    totalHarga,
		}
		if _, err := s.repoBiaya.Save(biayaBaru); err != nil {
			return err
		}
		var err error
		stokDiperbarui, err = s.repo.FindByProdukID(input.ProdukID)
		return err
	})
	return stokDiperbarui, err
}

// ✅ TAMBAHKAN FUNGSI BARU INI
func (s *stokProdukService) TambahStokKemasan(input InputTambahStokKemasan) (model.StokProduk, error) {
	var stokDiperbarui model.StokProduk
	totalBiaya := float64(input.Jumlah) * input.HargaSatuan

	err := s.db.Transaction(func(tx *gorm.DB) error {
		// 1. Tambah/update stok
		if err := s.UpdateStokAndHpp(tx, input.ProdukID, float64(input.Jumlah), totalBiaya); err != nil {
			return err
		}

		// 2. Buat log stok masuk
		logData := model.LogStokProduk{
			ProdukID:  input.ProdukID,
			JumlahKg:  float64(input.Jumlah), // Dianggap sebagai jumlah pcs
			Deskripsi: fmt.Sprintf("Pembelian dari %s", input.NamaPemasok),
		}
		if err := s.logService.CatatStokMasuk(tx, logData); err != nil {
			return err
		}

		// 3. Catat sebagai Biaya Operasional
		produk, _ := s.repoProduk.FindByID(input.ProdukID)
		biaya := model.BiayaOperasional{
			Tanggal:   time.Now(),
			Kategori:  "KEMASAN", // Kategori baru
			Deskripsi: fmt.Sprintf("Pembelian %s dari %s", produk.NamaProduk, input.NamaPemasok),
			Jumlah:    totalBiaya,
		}
		if err := tx.Create(&biaya).Error; err != nil {
			return err
		}

		var err error
		stokDiperbarui, err = s.repo.FindByProdukID(input.ProdukID)
		return err
	})

	return stokDiperbarui, err
}

func (s *stokProdukService) GetByProdukID(produkID uint) (*model.StokProduk, error) {
	var stok model.StokProduk
	err := s.db.Where("produk_id = ?", produkID).First(&stok).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil // Return nil pointer
		}
		return nil, err
	}
	return &stok, nil // Return pointer ke struct
}
