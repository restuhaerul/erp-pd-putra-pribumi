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

type ServiceBiayaOperasional interface {
	GetBiayaByID(ID uint) (model.BiayaOperasional, error)
	UpdateBiaya(ID uint, input InputBiayaOperasional, userID uint) (model.BiayaOperasional, error)  // userID ditambahkan di sini juga
	DeleteBiaya(ID uint, userID uint) error                                                         // userID ditambahkan di sini juga
	UpdateBiayaByPembelianID(tx *gorm.DB, pembelianID uint, deskripsi string, jumlah float64) error // <-- Pastikan ini juga ada
	CreateBiaya(input InputBiayaOperasional, userID uint) (model.BiayaOperasional, error)           // <-- TAMBAHKAN userID DI SINI

	// Untuk Service lain (butuh transaksi dan ID)
	CreateBiayaFromPembelian(tx *gorm.DB, input InputBiayaOperasional, pembelianID uint) (model.BiayaOperasional, error)

	GetAllBiaya() ([]model.BiayaOperasional, error)
	DeleteByPembelianID(tx *gorm.DB, pembelianID uint) error
	DeleteByPembelianLangsungID(tx *gorm.DB, pembelianLangsungID uint) error
	DeleteByKarungID(tx *gorm.DB, karungID uint) error // <-- TAMBAHKAN BARIS INI
}

type biayaOperasionalService struct {
	repo        repository.RepositoryBiayaOperasional
	akunKasRepo repository.RepositoryAkunKas // <-- TAMBAHKAN
	db          *gorm.DB                     // <-- TAMBAHKAN
}

func NewBiayaOperasionalService(
	repo repository.RepositoryBiayaOperasional,
	akunKasRepo repository.RepositoryAkunKas, // <-- TAMBAHKAN
	db *gorm.DB, // <-- TAMBAHKAN
) *biayaOperasionalService {
	return &biayaOperasionalService{repo, akunKasRepo, db}
}

type InputBiayaOperasional struct {
	Tanggal   string  `json:"tanggal" binding:"required"` // Format: "YYYY-MM-DD"
	Kategori  string  `json:"kategori" binding:"required"`
	Deskripsi string  `json:"deskripsi"`
	Jumlah    float64 `json:"jumlah" binding:"required"`
	AkunKasID uint    `json:"akun_kas_id" binding:"required"` // <-- TAMBAHKAN INI
}

// --- IMPLEMENTASI FUNGSI CreateBiaya (Untuk Handler) ---
func (s *biayaOperasionalService) CreateBiaya(input InputBiayaOperasional, userID uint) (model.BiayaOperasional, error) {
	var biaya model.BiayaOperasional

	err := s.db.Transaction(func(tx *gorm.DB) error {
		// ===================================================================
		// ✅ LOCK & VALIDASI SALDO KAS
		// ===================================================================
		var akunKas model.AkunKas
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ?", input.AkunKasID).
			First(&akunKas).Error; err != nil {
			return errors.New("akun kas tidak ditemukan")
		}

		// ✅ CEK SALDO DULU!
		if akunKas.Saldo < input.Jumlah {
			return fmt.Errorf("saldo tidak mencukupi. Saldo tersedia: Rp %.0f, dibutuhkan: Rp %.0f",
				akunKas.Saldo, input.Jumlah)
		}

		// 2. Buat entri BiayaOperasional
		tanggal, _ := time.Parse("2006-01-02", input.Tanggal)
		biaya = model.BiayaOperasional{
			Tanggal:   tanggal,
			Kategori:  input.Kategori,
			Deskripsi: input.Deskripsi,
			Jumlah:    input.Jumlah,
		}
		if err := tx.Create(&biaya).Error; err != nil {
			return err
		}

		// 3. Buat entri TransaksiKas (uang keluar)
		transaksiKas := model.TransaksiKas{
			AkunKasID:     input.AkunKasID,
			Tanggal:       time.Now(),
			Arah:          "OUT",
			Jumlah:        input.Jumlah,
			ReferenceType: "BIAYA_OPERASIONAL",
			ReferenceID:   biaya.ID,
			Memo:          fmt.Sprintf("Biaya Operasional: %s", biaya.Deskripsi),
			CreatedByID:   userID,
		}
		if err := tx.Create(&transaksiKas).Error; err != nil {
			return err
		}

		// 4. Kurangi saldo AkunKas
		if err := tx.Model(&model.AkunKas{}).Where("id = ?", input.AkunKasID).Update("saldo", gorm.Expr("saldo - ?", input.Jumlah)).Error; err != nil {
			return err
		}

		return nil
	})

	return biaya, err
}

// --- IMPLEMENTASI FUNGSI BARU: CreateBiayaFromPembelian (Untuk Service lain) ---
func (s *biayaOperasionalService) CreateBiayaFromPembelian(tx *gorm.DB, input InputBiayaOperasional, pembelianID uint) (model.BiayaOperasional, error) {
	tanggal, err := time.Parse("2006-01-02", input.Tanggal)
	if err != nil {
		return model.BiayaOperasional{}, errors.New("format tanggal tidak valid")
	}

	idPembelian := pembelianID // Buat salinan untuk pointer
	biaya := model.BiayaOperasional{
		Tanggal:          tanggal,
		Kategori:         input.Kategori,
		Deskripsi:        input.Deskripsi,
		Jumlah:           input.Jumlah,
		BatchPembelianID: &idPembelian, // Simpan ID pembelian
	}

	// Gunakan 'tx' yang diteruskan untuk operasi database
	if err := tx.Create(&biaya).Error; err != nil {
		return model.BiayaOperasional{}, err
	}

	return biaya, nil
}

func (s *biayaOperasionalService) GetAllBiaya() ([]model.BiayaOperasional, error) {
	return s.repo.FindAll()
}

func (s *biayaOperasionalService) GetBiayaByID(ID uint) (model.BiayaOperasional, error) {
	return s.repo.FindByID(ID)
}

// GANTI FUNGSI UpdateBiaya YANG LAMA DENGAN INI (metode reverse-and-replay)
func (s *biayaOperasionalService) UpdateBiaya(ID uint, input InputBiayaOperasional, userID uint) (model.BiayaOperasional, error) {
	var biayaBaru model.BiayaOperasional

	err := s.db.Transaction(func(tx *gorm.DB) error {
		// 1. Batalkan biaya lama (logika ini sama seperti DeleteBiaya)
		if err := s.DeleteBiaya(ID, userID); err != nil {
			return err
		}

		// 2. Buat biaya baru dengan data yang diperbarui
		var err error
		biayaBaru, err = s.CreateBiaya(input, userID)
		if err != nil {
			return err // Transaksi akan otomatis di-rollback
		}

		return nil
	})

	return biayaBaru, err
}

// GANTI FUNGSI DeleteBiaya YANG LAMA DENGAN INI
func (s *biayaOperasionalService) DeleteBiaya(ID uint, userID uint) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		// 1. Cari biaya yang akan dihapus
		biaya, err := s.repo.FindByID(ID)
		if err != nil {
			return errors.New("biaya tidak ditemukan")
		}

		// 2. Cari transaksi kas terkait
		var transaksiKas model.TransaksiKas
		err = tx.Where("reference_type = ? AND reference_id = ?", "BIAYA_OPERASIONAL", ID).First(&transaksiKas).Error

		// Jika ada transaksi kas terkait, kembalikan saldonya
		if err == nil {
			// 3. Buat transaksi kas pembalikan (uang masuk)
			pembalikan := model.TransaksiKas{
				AkunKasID:     transaksiKas.AkunKasID,
				Tanggal:       time.Now(),
				Arah:          "IN",
				Jumlah:        biaya.Jumlah,
				ReferenceType: "PEMBATALAN_BIAYA",
				ReferenceID:   ID,
				Memo:          fmt.Sprintf("Pembatalan Biaya: %s", biaya.Deskripsi),
				CreatedByID:   userID,
			}
			if err := tx.Create(&pembalikan).Error; err != nil {
				return err
			}

			// 4. Tambahkan kembali saldo ke akun kas
			if err := tx.Model(&model.AkunKas{}).Where("id = ?", transaksiKas.AkunKasID).Update("saldo", gorm.Expr("saldo + ?", biaya.Jumlah)).Error; err != nil {
				return err
			}
		}

		// 5. Hapus biaya operasional itu sendiri
		return s.repo.Delete(ID)
	})
}

// Tambahkan implementasi fungsi baru ini
func (s *biayaOperasionalService) UpdateBiayaByPembelianID(tx *gorm.DB, pembelianID uint, deskripsi string, jumlah float64) error {
	var biaya model.BiayaOperasional

	// Cari biaya operasional yang terkait dengan pembelian ini
	result := tx.Where("pembelian_langsung_id = ?", pembelianID).First(&biaya)
	if result.Error != nil {
		// Jika tidak ketemu, mungkin ini data lama. Bisa dibuatkan saja.
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			biayaBaru := model.BiayaOperasional{
				Tanggal:          time.Now(),
				Kategori:         "PEMBELIAN_BAHAN",
				Deskripsi:        deskripsi,
				Jumlah:           jumlah,
				BatchPembelianID: &pembelianID,
			}
			return tx.Create(&biayaBaru).Error
		}
		return result.Error // Error lain
	}

	// Jika ketemu, update datanya
	biaya.Deskripsi = deskripsi
	biaya.Jumlah = jumlah
	return tx.Save(&biaya).Error
}

// Tambahkan implementasi ini di dalam service
func (s *biayaOperasionalService) DeleteByPembelianID(tx *gorm.DB, pembelianID uint) error {
	return s.repo.DeleteByForeignKey(tx, "batch_pembelian_id", pembelianID)
}

func (s *biayaOperasionalService) DeleteByPembelianLangsungID(tx *gorm.DB, pembelianLangsungID uint) error {
	return s.repo.DeleteByForeignKey(tx, "pembelian_langsung_id", pembelianLangsungID)
}

func (s *biayaOperasionalService) DeleteByKarungID(tx *gorm.DB, karungID uint) error {
	// Memanggil fungsi repository generik dengan nama kolom yang benar
	return s.repo.DeleteByForeignKey(tx, "batch_karung_id", karungID)
}
