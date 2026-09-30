// internal/service/pembelian_service.go
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

// UBAH KESELURUHAN INTERFACE INI
type ServicePembelian interface {
	CreatePembelian(input InputPembelian, userID uint) (model.BatchPembelian, error)
	GetAllPembelian() ([]model.BatchPembelian, error)
	GetPembelianByID(ID uint) (model.BatchPembelian, error)
	UpdatePembelian(ID uint, input InputUpdatePembelian, userID uint) (model.BatchPembelian, error)
	DeletePembelian(ID uint, userID uint) (model.BatchPembelian, error)
}

// / --- UBAH STRUCT INI ---
type pembelianService struct {
	db                      *gorm.DB
	repo                    repository.RepositoryPembelian
	repoProduk              repository.RepositoryProduk
	logService              ServiceLogStok
	hutangService           ServiceHutang
	akunKasRepo             repository.RepositoryAkunKas
	stokProdukService       ServiceStokProduk
	biayaOperasionalService ServiceBiayaOperasional // <-- TAMBAHKAN BARIS INI
}

// --- UBAH CONSTRUCTOR INI ---
func NewPembelianService(
	db *gorm.DB,
	repo repository.RepositoryPembelian,
	repoProduk repository.RepositoryProduk,
	logService ServiceLogStok,
	hutangService ServiceHutang,
	akunKasRepo repository.RepositoryAkunKas,
	stokProdukService ServiceStokProduk,
	biayaOperasionalService ServiceBiayaOperasional, // <-- TAMBAHKAN PARAMETER INI
) *pembelianService {
	return &pembelianService{
		db:                      db,
		repo:                    repo,
		repoProduk:              repoProduk,
		logService:              logService,
		hutangService:           hutangService,
		akunKasRepo:             akunKasRepo,
		stokProdukService:       stokProdukService,
		biayaOperasionalService: biayaOperasionalService, // <-- TAMBAHKAN BARIS INI
	}
}

type InputPembelian struct {
	ProdukID         uint    `json:"produk_id" binding:"required"`
	NamaPemasok      string  `json:"nama_pemasok"`
	JumlahKg         float64 `json:"jumlah_kg" binding:"required"`
	HargaPerKg       float64 `json:"harga_per_kg" binding:"required"`
	StatusPembayaran string  `json:"status_pembayaran" binding:"required,oneof=LUNAS SEBAGIAN BELUM_LUNAS"`
	NilaiTerbayar    float64 `json:"nilai_terbayar"`
	AkunKasID        uint    `json:"akun_kas_id"`
}

type InputUpdatePembelian struct {
	ProdukID    uint    `json:"produk_id"`
	NamaPemasok string  `json:"nama_pemasok"`
	JumlahKg    float64 `json:"jumlah_kg"`
	HargaPerKg  float64 `json:"harga_per_kg"`
}

// UBAH FUNGSI INI
func (s *pembelianService) CreatePembelian(input InputPembelian, userID uint) (model.BatchPembelian, error) {
	var pembelianTersimpan model.BatchPembelian
	totalHarga := input.JumlahKg * input.HargaPerKg

	err := s.db.Transaction(func(tx *gorm.DB) error {
		// 1. Tentukan Nilai Terbayar berdasarkan Status
		nilaiBayar := input.NilaiTerbayar
		if input.StatusPembayaran == "LUNAS" {
			nilaiBayar = totalHarga
		} else if input.StatusPembayaran == "BELUM_LUNAS" {
			nilaiBayar = 0
		}
		if nilaiBayar > totalHarga {
			return errors.New("nilai terbayar tidak boleh melebihi total harga")
		}

		// ===================================================================
		// 🔒 TAMBAHAN: VALIDASI SALDO KAS SEBELUM BAYAR
		// ===================================================================
		if nilaiBayar > 0 {
			if input.AkunKasID == 0 {
				return errors.New("akun kas harus dipilih saat melakukan pembayaran")
			}

			// LOCK & VALIDASI SALDO
			var akunKas model.AkunKas
			if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
				Where("id = ?", input.AkunKasID).
				First(&akunKas).Error; err != nil {
				return errors.New("akun kas tidak ditemukan")
			}

			// ✅ INI YANG PENTING: CEK SALDO DULU!
			if akunKas.Saldo < nilaiBayar {
				return fmt.Errorf("saldo tidak mencukupi. Saldo tersedia: Rp %.0f, dibutuhkan: Rp %.0f",
					akunKas.Saldo, nilaiBayar)
			}
		}
		// ===================================================================

		// 2. Buat record BatchPembelian dengan info pembayaran
		pembelianBaru := model.BatchPembelian{
			ProdukID:         input.ProdukID,
			NamaPemasok:      input.NamaPemasok,
			JumlahKg:         input.JumlahKg,
			HargaPerKg:       input.HargaPerKg,
			SisaKg:           input.JumlahKg,
			TotalHarga:       totalHarga,
			TglPembelian:     time.Now(),
			StatusPembayaran: input.StatusPembayaran,
			NilaiTerbayar:    nilaiBayar,
		}
		hasil, err := s.repo.Save(pembelianBaru)
		if err != nil {
			return err
		}
		pembelianTersimpan = hasil

		// 3. Buat Catatan Hutang
		hutangBaru := model.Hutang{
			NamaPemasok:      pembelianTersimpan.NamaPemasok,
			TanggalTransaksi: pembelianTersimpan.TglPembelian,
			JatuhTempo:       pembelianTersimpan.TglPembelian.AddDate(0, 1, 0),
			NilaiTotal:       pembelianTersimpan.TotalHarga,
			NilaiTerbayar:    pembelianTersimpan.NilaiTerbayar,
			SisaTagihan:      pembelianTersimpan.TotalHarga - pembelianTersimpan.NilaiTerbayar,
			Status:           input.StatusPembayaran,
			SourceType:       "BATCH_PEMBELIAN",
			SourceID:         pembelianTersimpan.ID,
		}
		if _, err := s.hutangService.CreateHutang(hutangBaru); err != nil {
			return fmt.Errorf("gagal membuat catatan hutang: %w", err)
		}

		// 4. Jika ada pembayaran, catat Transaksi Kas
		if nilaiBayar > 0 {
			// Buat catatan pengeluaran kas
			transaksiKas := model.TransaksiKas{
				AkunKasID:     input.AkunKasID,
				Tanggal:       pembelianTersimpan.TglPembelian,
				Arah:          "OUT",
				Jumlah:        nilaiBayar,
				ReferenceType: "BATCH_PEMBELIAN",
				ReferenceID:   pembelianTersimpan.ID,
				Memo:          fmt.Sprintf("Pembayaran pembelian gabah dari %s", pembelianTersimpan.NamaPemasok),
				CreatedByID:   userID,
			}
			if err := tx.Create(&transaksiKas).Error; err != nil {
				return fmt.Errorf("gagal mencatat transaksi kas: %w", err)
			}

			// Kurangi saldo akun kas (SEKARANG UDAH AMAN - UDAH DIVALIDASI DI ATAS)
			if err := tx.Model(&model.AkunKas{}).
				Where("id = ?", input.AkunKasID).
				Update("saldo", gorm.Expr("saldo - ?", nilaiBayar)).Error; err != nil {
				return fmt.Errorf("gagal mengupdate saldo akun kas: %w", err)
			}
		}

		// 5. Buat log stok masuk
		logData := model.LogStokProduk{
			ProdukID:         pembelianTersimpan.ProdukID,
			JumlahKg:         pembelianTersimpan.JumlahKg,
			Deskripsi:        fmt.Sprintf("Pembelian dari %s (Batch #%d)", pembelianTersimpan.NamaPemasok, pembelianTersimpan.ID),
			BatchPembelianID: &pembelianTersimpan.ID,
		}
		if err := s.logService.CatatStokMasuk(tx, logData); err != nil {
			return err
		}

		produk, err := s.repoProduk.FindByID(pembelianTersimpan.ProdukID)
		if err != nil {
			return errors.New("produk terkait pembelian tidak ditemukan")
		}

		biayaInput := InputBiayaOperasional{
			Tanggal:   pembelianTersimpan.TglPembelian.Format("2006-01-02"),
			Kategori:  "PEMBELIAN_BAHAN",
			Deskripsi: fmt.Sprintf("Pembelian Gabah %s dari %s (Batch #%d)", produk.NamaProduk, pembelianTersimpan.NamaPemasok, pembelianTersimpan.ID),
			Jumlah:    pembelianTersimpan.TotalHarga,
		}

		if _, err := s.biayaOperasionalService.CreateBiayaFromPembelian(tx, biayaInput, pembelianTersimpan.ID); err != nil {
			return fmt.Errorf("gagal mencatat biaya operasional untuk pembelian gabah: %w", err)
		}

		return nil
	})

	return pembelianTersimpan, err
}
func (s *pembelianService) GetAllPembelian() ([]model.BatchPembelian, error) {
	daftarPembelian, err := s.repo.FindAll()
	if err != nil {
		return nil, err
	}
	for i := range daftarPembelian {
		jumlahAwal := daftarPembelian[i].JumlahKg
		sisa := daftarPembelian[i].SisaKg
		digunakan := jumlahAwal - sisa
		daftarPembelian[i].JumlahDigunakan = digunakan
		if digunakan > 0 {
			daftarPembelian[i].IsTerpakai = true
		}
	}
	return daftarPembelian, nil
}

func (s *pembelianService) GetPembelianByID(ID uint) (model.BatchPembelian, error) {
	return s.repo.FindByID(ID)
}

// UBAH FUNGSI INI
func (s *pembelianService) UpdatePembelian(ID uint, input InputUpdatePembelian, userID uint) (model.BatchPembelian, error) {
	var pembelianDiperbarui model.BatchPembelian

	err := s.db.Transaction(func(tx *gorm.DB) error {
		// ... (logika reverse tetap sama) ...
		pembelianLama, err := s.repo.FindByID(ID)
		if err != nil {
			return errors.New("data pembelian tidak ditemukan")
		}
		if pembelianLama.JumlahKg != pembelianLama.SisaKg {
			return errors.New("tidak bisa mengubah pembelian yang stoknya sudah terpakai dalam produksi")
		}
		if pembelianLama.NilaiTerbayar > 0 {
			return errors.New("tidak bisa mengubah pembelian yang sudah memiliki pembayaran")
		}
		if err := tx.Where("source_type = ? AND source_id = ?", "BATCH_PEMBELIAN", ID).Delete(&model.Hutang{}).Error; err != nil {
			return fmt.Errorf("gagal membatalkan hutang lama: %w", err)
		}
		if err := s.logService.DeleteLogBySource(tx, "PEMBELIAN_BATCH", ID); err != nil {
			return fmt.Errorf("gagal membatalkan log stok lama: %w", err)
		}
		if _, err := s.repo.Delete(pembelianLama); err != nil {
			return fmt.Errorf("gagal menghapus data pembelian lama: %w", err)
		}

		// --- FASE 2: REPLAY (BUAT ULANG) ---
		inputBaru := InputPembelian{
			ProdukID:         input.ProdukID,
			NamaPemasok:      input.NamaPemasok,
			JumlahKg:         input.JumlahKg,
			HargaPerKg:       input.HargaPerKg,
			StatusPembayaran: "BELUM_LUNAS", // Diasumsikan update kembali menjadi hutang
		}
		// Teruskan userID ke CreatePembelian
		pembelianDiperbarui, err = s.CreatePembelian(inputBaru, userID)
		if err != nil {
			return fmt.Errorf("gagal membuat ulang data pembelian saat update: %w", err)
		}

		return nil
	})

	if err != nil {
		return model.BatchPembelian{}, err
	}
	return s.repo.FindByID(pembelianDiperbarui.ID)
}

// Ganti fungsi DeletePembelian yang lama dengan ini
// FILE: internal/service/pembelian_service.go

func (s *pembelianService) DeletePembelian(pembelianID uint, userID uint) (model.BatchPembelian, error) {
	var pembelianDibatalkan model.BatchPembelian

	err := s.db.Transaction(func(tx *gorm.DB) error {
		pembelian, err := s.repo.FindByID(pembelianID)
		if err != nil {
			return errors.New("data pembelian tidak ditemukan")
		}
		pembelianDibatalkan = pembelian

		if pembelian.Status == "DIBATALKAN" {
			return errors.New("pembelian ini sudah pernah dibatalkan")
		}
		if pembelian.JumlahKg != pembelian.SisaKg {
			return errors.New("tidak bisa membatalkan pembelian yang stoknya sudah terpakai")
		}

		if pembelian.NilaiTerbayar > 0 {
			var transaksiKasAsal model.TransaksiKas
			var errKas error

			// Cara 1: Cari transaksi kas yang dibuat saat pembelian (direct payment)
			errKas = tx.Where("reference_type = ? AND reference_id = ? AND arah = ?", "BATCH_PEMBELIAN", pembelianID, "OUT").First(&transaksiKasAsal).Error

			// Cara 2 (Fallback): Jika tidak ketemu, cari transaksi kas dari pembayaran hutang
			if errKas != nil {
				var hutang model.Hutang
				if errHutang := tx.Where("source_type = ? AND source_id = ?", "BATCH_PEMBELIAN", pembelianID).First(&hutang).Error; errHutang == nil {
					// **KUNCI**: Cari kas dengan referensi ke HUTANG ID dan tipe yang BENAR
					errKas = tx.Where("reference_type = ? AND reference_id = ? AND arah = ?", "PAYMENT_HUTANG", hutang.ID, "OUT").First(&transaksiKasAsal).Error
				}
			}

			if errKas == nil {
				transaksiKasPembalikan := model.TransaksiKas{
					AkunKasID:     transaksiKasAsal.AkunKasID,
					Tanggal:       time.Now(),
					Arah:          "IN",
					Jumlah:        pembelian.NilaiTerbayar,
					ReferenceType: "PEMBATALAN_PEMBELIAN",
					ReferenceID:   pembelianID,
					Memo:          fmt.Sprintf("Pengembalian dana dari pembatalan pembelian gabah Batch #%d", pembelianID),
					CreatedByID:   userID,
					Status:        "AKTIF",
				}
				if err := tx.Create(&transaksiKasPembalikan).Error; err != nil {
					return fmt.Errorf("gagal membuat transaksi kas pembalikan: %w", err)
				}

				// ======================================================================
				// --- PERBAIKAN UTAMA: BARIS INI YANG MENGEMBALIKAN UANG KE SALDO ---
				// ======================================================================
				if err := tx.Model(&model.AkunKas{}).Where("id = ?", transaksiKasAsal.AkunKasID).Update("saldo", gorm.Expr("saldo + ?", pembelian.NilaiTerbayar)).Error; err != nil {
					return fmt.Errorf("gagal mengembalikan saldo ke akun kas: %w", err)
				}
				// --- BATAS PERBAIKAN ---

			} else {
				return fmt.Errorf("transaksi kas asli untuk pembelian #%d tidak dapat ditemukan. Proses dibatalkan", pembelianID)
			}
		}

		// Sisa fungsi (pembalikan stok, dll) tidak berubah
		nilaiHppDibalikkan := pembelian.JumlahKg * pembelian.HargaPerKg
		if err := s.stokProdukService.UpdateStokAndHpp(tx, pembelian.ProdukID, -pembelian.JumlahKg, -nilaiHppDibalikkan); err != nil {
			return err
		}
		if err := s.logService.DeleteLogBySource(tx, "PEMBELIAN_BATCH", pembelianID); err != nil {
			return err
		}
		if err := tx.Model(&model.Hutang{}).Where("source_type = ? AND source_id = ?", "BATCH_PEMBELIAN", pembelianID).Update("status", "DIBATALKAN").Error; err != nil {
			return err
		}
		if err := s.biayaOperasionalService.DeleteByPembelianID(tx, pembelianID); err != nil {
			log.Printf("Peringatan: Gagal menghapus biaya operasional: %v", err)
		}

		pembelian.Status = "DIBATALKAN"
		if err := tx.Save(&pembelian).Error; err != nil {
			return err
		}

		return nil
	})
	return pembelianDibatalkan, err
}
