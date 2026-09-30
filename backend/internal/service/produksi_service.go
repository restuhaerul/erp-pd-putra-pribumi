// File: internal/service/produksi_service.go

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

// --- PERBAIKAN: Perbarui signature interface ---
type ServiceProduksi interface {
	CreateProduksi(input InputProduksi, userID uint) (model.BatchProduksi, error)
	GetAllProduksi() ([]model.BatchProduksi, error)
	GetProduksiPaginated(page, limit int, dateFrom, dateTo string) ([]model.BatchProduksi, int64, error)
	GetProduksiSummary(dateFrom, dateTo string) (SummaryData, error)
	UpdateProduksi(id uint, input InputProduksi, userID uint) (model.BatchProduksi, error)
	DeleteProduksi(id uint, userID uint) error
}

type SummaryData struct {
	TotalProduksiDihasilkan float64 `json:"total_produksi_dihasilkan"`
	TotalBahanBakuDigunakan float64 `json:"total_bahan_baku_digunakan"`
	TotalSisaProduksi       float64 `json:"total_sisa_produksi"`
	TotalHPP                float64 `json:"total_hpp"`
	AvgEfficiency           float64 `json:"avg_efficiency"`
}

// --- PERBAIKAN: Tambahkan jasaGilingService di struct ---
type produksiService struct {
	db                       *gorm.DB
	repoProduksi             repository.RepositoryProduksi
	repoPembelian            repository.RepositoryPembelian
	repoKarung               repository.RepositoryKarung
	stokProdukService        ServiceStokProduk
	konfigurasiService       ServiceKonfigurasi
	logService               ServiceLogStok
	logProduksiService       ServiceLogProduksi
	logKarungService         ServiceLogKarung
	logPembelianService      ServiceLogPembelian
	repoJasaGiling           repository.RepositoryJasaGiling
	pembelianLangsungService ServicePembelianLangsung
	jasaGilingService        ServiceJasaGiling // <-- TAMBAHAN
}

// --- PERBAIKAN: Tambahkan jasaGilingService di constructor ---
func NewProduksiService(
	db *gorm.DB,
	repoProduksi repository.RepositoryProduksi,
	repoPembelian repository.RepositoryPembelian,
	repoKarung repository.RepositoryKarung,
	stokProdukService ServiceStokProduk,
	konfigurasiService ServiceKonfigurasi,
	logService ServiceLogStok,
	logProduksiService ServiceLogProduksi,
	logKarungService ServiceLogKarung,
	logPembelianService ServiceLogPembelian,
	repoJasaGiling repository.RepositoryJasaGiling,
	pembelianLangsungService ServicePembelianLangsung,
	jasaGilingService ServiceJasaGiling, // <-- TAMBAHAN
) ServiceProduksi {
	return &produksiService{
		db, repoProduksi, repoPembelian, repoKarung, stokProdukService,
		konfigurasiService, logService, logProduksiService, logKarungService,
		logPembelianService, repoJasaGiling, pembelianLangsungService,
		jasaGilingService, // <-- TAMBAHAN
	}
}

type SumberBahanBaku struct {
	TipeSumber        string  `json:"tipe_sumber"`
	SumberID          uint    `json:"sumber_id" binding:"required"`
	JumlahKgDigunakan float64 `json:"jumlah_kg_digunakan" binding:"required"`
}

type InputKarungDigunakan struct {
	ProdukID uint `json:"produk_id"`
	Jumlah   int  `json:"jumlah"`
}

type InputProduksi struct {
	ProdukID                uint                   `json:"produk_id" binding:"required"`
	JumlahBerasDihasilkanKg float64                `json:"jumlah_beras_dihasilkan_kg" binding:"required"`
	SumberBahanBaku         []SumberBahanBaku      `json:"sumber_bahan_baku" binding:"required"`
	KarungDigunakan         []InputKarungDigunakan `json:"karung_digunakan"`
}

func (s *produksiService) konsumsiStokDenganPrioritas(tx *gorm.DB, produkID uint, jumlahDibutuhkan float64, produksiID uint) error {
	stokInfo, err := s.pembelianLangsungService.CekKetersediaanStok(produkID)
	if err != nil {
		return fmt.Errorf("gagal cek ketersediaan stok: %v", err)
	}

	sisaDariPembelianLangsung := stokInfo.SisaDariPembelianLangsung

	if sisaDariPembelianLangsung > 0 {
		jumlahDariPembelianLangsung := sisaDariPembelianLangsung
		if jumlahDariPembelianLangsung > jumlahDibutuhkan {
			jumlahDariPembelianLangsung = jumlahDibutuhkan
		}

		if err := s.pembelianLangsungService.KonsumsiStok(tx, produkID, jumlahDariPembelianLangsung, TipePenggunaanProduksi, &produksiID); err != nil {
			return fmt.Errorf("gagal konsumsi stok dari pembelian langsung: %v", err)
		}

		jumlahDibutuhkan -= jumlahDariPembelianLangsung
	}

	if jumlahDibutuhkan > 0 {
		var stok model.StokProduk
		if err := tx.Where("produk_id = ?", produkID).First(&stok).Error; err != nil {
			return fmt.Errorf("stok produk tidak ditemukan untuk produk ID %d", produkID)
		}

		if stok.TotalStokKg < jumlahDibutuhkan {
			return fmt.Errorf("stok tidak mencukupi. Tersedia di stok produk: %.2f, Masih dibutuhkan: %.2f",
				stok.TotalStokKg, jumlahDibutuhkan)
		}

		nilaiHppKeluar := stok.HppRataRata * jumlahDibutuhkan
		if err := s.stokProdukService.UpdateStokAndHpp(tx, produkID, -jumlahDibutuhkan, -nilaiHppKeluar); err != nil {
			return fmt.Errorf("gagal update stok produk: %v", err)
		}
	}

	return nil
}

func (s *produksiService) CreateProduksi(input InputProduksi, userID uint) (model.BatchProduksi, error) {
	var produksiBaru model.BatchProduksi

	err := s.db.Transaction(func(tx *gorm.DB) error {
		// ===================================================================
		// 🔒 LOCK STOK PRODUK OUTPUT (YANG AKAN DIHASILKAN)
		// ===================================================================
		var stokProdukOutput model.StokProduk
		err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("produk_id = ?", input.ProdukID).
			First(&stokProdukOutput).Error

		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("gagal lock stok produk output: %w", err)
		}

		// ===================================================================
		// 🔒 LOCK SEMUA BATCH PEMBELIAN YANG AKAN DIGUNAKAN
		// ===================================================================
		for _, sumber := range input.SumberBahanBaku {
			if sumber.TipeSumber == "BATCH_PEMBELIAN" {
				var batchPembelian model.BatchPembelian
				if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
					Preload("Produk").
					Where("id = ?", sumber.SumberID).
					First(&batchPembelian).Error; err != nil {
					return fmt.Errorf("gagal lock batch pembelian ID %d: %w", sumber.SumberID, err)
				}

				// ✅ VALIDASI STOK (SEKARANG AMAN - ROW SUDAH DI-LOCK)
				if batchPembelian.SisaKg < sumber.JumlahKgDigunakan {
					return fmt.Errorf("stok dari batch %d tidak mencukupi (sisa: %.2f Kg, diminta: %.2f Kg)",
						sumber.SumberID, batchPembelian.SisaKg, sumber.JumlahKgDigunakan)
				}
			}
		}

		// ===================================================================
		// 🔒 LOCK SEMUA BATCH KARUNG YANG AKAN DIGUNAKAN
		// ===================================================================
		for _, karungInput := range input.KarungDigunakan {
			if karungInput.Jumlah > 0 {
				var batchKarung []model.BatchKarung
				if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
					Where("produk_id = ? AND sisa > 0", karungInput.ProdukID).
					Order("tgl_pembelian asc").
					Find(&batchKarung).Error; err != nil {
					return fmt.Errorf("gagal lock batch karung: %w", err)
				}

				// ✅ VALIDASI TOTAL STOK KARUNG
				totalSisa := 0
				for _, batch := range batchKarung {
					totalSisa += batch.Sisa
				}
				if totalSisa < karungInput.Jumlah {
					return fmt.Errorf("stok karung tidak mencukupi (sisa: %d, diminta: %d)", totalSisa, karungInput.Jumlah)
				}
			}
		}

		// ===================================================================
		// LOGIC EXISTING LO (GA DIUBAH SAMA SEKALI)
		// ===================================================================
		konfigurasi, err := s.konfigurasiService.GetKonfigurasi()
		if err != nil {
			return errors.New("gagal mengambil konfigurasi sistem")
		}

		produksiBaru = model.BatchProduksi{
			ProdukID:         input.ProdukID,
			TglProduksi:      time.Now(),
			JumlahProduksiKg: input.JumlahBerasDihasilkanKg,
			SisaKg:           input.JumlahBerasDihasilkanKg,
		}
		if err := tx.Create(&produksiBaru).Error; err != nil {
			return fmt.Errorf("gagal menyimpan batch produksi awal: %w", err)
		}

		if err := tx.Preload("Produk").First(&produksiBaru, produksiBaru.ID).Error; err != nil {
			return err
		}

		var totalBiayaBahanBaku float64
		var totalGabahDigunakan float64
		var daftarSumberUntukDisimpan []model.ProduksiSumber

		// ===================================================================
		// LOGIC KONSUMSI SUMBER (GA DIUBAH - SUDAH DI-LOCK DI ATAS)
		// ===================================================================
		for _, sumber := range input.SumberBahanBaku {
			switch sumber.TipeSumber {
			case "BATCH_PEMBELIAN":
				var batchPembelian model.BatchPembelian
				if err := tx.Preload("Produk").Where("id = ?", sumber.SumberID).First(&batchPembelian).Error; err != nil {
					return fmt.Errorf("sumber BATCH_PEMBELIAN ID %d tidak ditemukan", sumber.SumberID)
				}
				// CATATAN: Validasi sudah dilakukan di atas dengan locking

				sisaKgBaru := batchPembelian.SisaKg - sumber.JumlahKgDigunakan
				if err := tx.Model(&batchPembelian).Update("sisa_kg", sisaKgBaru).Error; err != nil {
					return fmt.Errorf("gagal update sisa_kg batch pembelian: %w", err)
				}

				log.Printf("DEBUG: Akan membuat log penggunaan untuk Batch Pembelian ID: %d", batchPembelian.ID)

				logBatchPembelian := model.LogPembelian{
					BatchPembelianID: batchPembelian.ID,
					TipeLog:          "DIGUNAKAN_PRODUKSI",
					JumlahKg:         -sumber.JumlahKgDigunakan,
					SisaKgSetelah:    sisaKgBaru,
					Deskripsi:        fmt.Sprintf("Digunakan untuk produksi %s (Batch #%d)", produksiBaru.Produk.NamaProduk, produksiBaru.ID),
					BatchProduksiID:  &produksiBaru.ID,
				}

				if err := s.logPembelianService.CatatLog(tx, logBatchPembelian); err != nil {
					return fmt.Errorf("gagal catat log penggunaan batch pembelian: %w", err)
				}

				if batchPembelian.Produk.TipeProduk == TipeProdukBahan {
					totalGabahDigunakan += sumber.JumlahKgDigunakan
				}
				totalBiayaBahanBaku += sumber.JumlahKgDigunakan * batchPembelian.HargaPerKg

				sumberIDCopy := sumber.SumberID
				daftarSumberUntukDisimpan = append(daftarSumberUntukDisimpan, model.ProduksiSumber{
					BatchProduksiID:   produksiBaru.ID,
					BatchPembelianID:  &sumberIDCopy,
					JumlahKgDigunakan: sumber.JumlahKgDigunakan,
				})

			case "STOK_PRODUK":
				var stok model.StokProduk
				if err := tx.Preload("Produk").
					Where("produk_id = ?", sumber.SumberID).
					First(&stok).Error; err != nil {
					return fmt.Errorf("sumber STOK_PRODUK ID %d tidak ditemukan", sumber.SumberID)
				}

				info, err := s.pembelianLangsungService.CekKetersediaanStok(sumber.SumberID)
				if err != nil {
					return fmt.Errorf("gagal cek ketersediaan stok pembelian langsung: %w", err)
				}

				if info.SisaDariPembelianLangsung > 0 {
					if stok.TotalStokKg < sumber.JumlahKgDigunakan {
						return fmt.Errorf("stok %s tidak mencukupi (tersedia: %.2f Kg)",
							stok.Produk.NamaProduk, stok.TotalStokKg)
					}

					log.Printf("[DEBUG] PRODUKSI: Akan konsumsi %.2f kg dari pembelian langsung untuk produk ID %d",
						sumber.JumlahKgDigunakan, sumber.SumberID)

					if err := s.pembelianLangsungService.KonsumsiStok(
						tx, sumber.SumberID, sumber.JumlahKgDigunakan, TipePenggunaanProduksi, &produksiBaru.ID,
					); err != nil {
						return fmt.Errorf("gagal konsumsi stok pembelian langsung: %w", err)
					}

					log.Printf("[DEBUG] PRODUKSI: Konsumsi stok pembelian langsung berhasil")

					nilaiHppKeluar := stok.HppRataRata * sumber.JumlahKgDigunakan
					if err := s.stokProdukService.UpdateStokAndHpp(
						tx, sumber.SumberID, -sumber.JumlahKgDigunakan, -nilaiHppKeluar,
					); err != nil {
						return fmt.Errorf("gagal update stok produk: %w", err)
					}
					totalBiayaBahanBaku += nilaiHppKeluar

					if err := s.logService.CatatStokKeluar(tx, model.LogStokProduk{
						ProdukID:   sumber.SumberID,
						TipeLog:    "KELUAR",
						JumlahKg:   -sumber.JumlahKgDigunakan,
						Deskripsi:  fmt.Sprintf("Digunakan untuk produksi %s (dari pembelian langsung)", produksiBaru.Produk.NamaProduk),
						ProduksiID: &produksiBaru.ID,
					}); err != nil {
						return fmt.Errorf("gagal membuat log stok keluar: %w", err)
					}

					stokIDCopy := stok.ID
					daftarSumberUntukDisimpan = append(daftarSumberUntukDisimpan, model.ProduksiSumber{
						BatchProduksiID:   produksiBaru.ID,
						StokProdukID:      &stokIDCopy,
						JumlahKgDigunakan: sumber.JumlahKgDigunakan,
					})

				} else {
					if stok.Produk.TipeProduk == TipeProdukJadi {
						biayaDariBatch, err := s.konsumsiStokDariBatchLain(
							tx, &produksiBaru, sumber.SumberID, sumber.JumlahKgDigunakan, &daftarSumberUntukDisimpan,
						)
						if err != nil {
							return err
						}
						totalBiayaBahanBaku += biayaDariBatch
					} else {
						if stok.TotalStokKg < sumber.JumlahKgDigunakan {
							return fmt.Errorf("stok %s tidak mencukupi (sisa: %.2f Kg)",
								stok.Produk.NamaProduk, stok.TotalStokKg)
						}
						nilaiHppKeluar := stok.HppRataRata * sumber.JumlahKgDigunakan
						if err := s.stokProdukService.UpdateStokAndHpp(
							tx, sumber.SumberID, -sumber.JumlahKgDigunakan, -nilaiHppKeluar,
						); err != nil {
							return err
						}
						if err := s.logService.CatatStokKeluar(tx, model.LogStokProduk{
							ProdukID:   sumber.SumberID,
							TipeLog:    "KELUAR",
							JumlahKg:   -sumber.JumlahKgDigunakan,
							Deskripsi:  fmt.Sprintf("Digunakan untuk produksi %s (dari stok umum)", produksiBaru.Produk.NamaProduk),
							ProduksiID: &produksiBaru.ID,
						}); err != nil {
							return fmt.Errorf("gagal membuat log stok keluar: %w", err)
						}
						if stok.Produk.TipeProduk == TipeProdukBahan {
							totalGabahDigunakan += sumber.JumlahKgDigunakan
						}
						totalBiayaBahanBaku += nilaiHppKeluar

						stokIDCopy := stok.ID
						daftarSumberUntukDisimpan = append(daftarSumberUntukDisimpan, model.ProduksiSumber{
							BatchProduksiID:   produksiBaru.ID,
							StokProdukID:      &stokIDCopy,
							JumlahKgDigunakan: sumber.JumlahKgDigunakan,
						})
					}
				}

			default:
				return fmt.Errorf("tipe sumber '%s' tidak valid", sumber.TipeSumber)
			}
		}

		// SISANYA SAMA PERSIS DENGAN CODE LO (line 257 - end of function)
		if len(daftarSumberUntukDisimpan) > 0 {
			if err := tx.Create(&daftarSumberUntukDisimpan).Error; err != nil {
				return fmt.Errorf("gagal menyimpan sumber bahan baku: %w", err)
			}
		}

		biayaKarung, totalKarung, err := s.konsumsiStokKarung(tx, &produksiBaru, input.KarungDigunakan)
		if err != nil {
			return err
		}

		biayaProduksiLangsung := totalGabahDigunakan * konfigurasi.BiayaProduksiPerKgGabah
		totalBiayaProduksiBatch := totalBiayaBahanBaku + biayaProduksiLangsung + biayaKarung
		produksiBaru.TotalBiayaProduksi = totalBiayaProduksiBatch
		produksiBaru.KarungDigunakan = totalKarung
		produksiBaru.SisaKarung = totalKarung
		if err := tx.Save(&produksiBaru).Error; err != nil {
			return fmt.Errorf("gagal update final batch produksi: %w", err)
		}

		if totalGabahDigunakan > 0 {
			tagihanInternal := totalGabahDigunakan * konfigurasi.TarifJasaGilingPribadiPerKgGabah
			if tagihanInternal > 0 {
				jasaGilingInternal := model.TransaksiJasaGiling{
					TipeJasaGiling:        "PRIBADI",
					Tanggal:               produksiBaru.TglProduksi,
					NamaPelanggan:         "Produksi Internal",
					BeratGabahAwalKg:      totalGabahDigunakan,
					TotalTagihan:          tagihanInternal,
					TipePembayaran:        "TUNAI",
					JumlahPembayaranTunai: tagihanInternal,
					Deskripsi:             fmt.Sprintf("Otomatis dari Produksi %s Batch #%d", produksiBaru.Produk.NamaProduk, produksiBaru.ID),
					BatchProduksiID:       &produksiBaru.ID,
				}
				if err := tx.Create(&jasaGilingInternal).Error; err != nil {
					return fmt.Errorf("gagal membuat jasa giling internal: %w", err)
				}

				var kasGiling model.AkunKas
				if err := tx.Where("nama_akun = ?", "Kas Giling").First(&kasGiling).Error; err != nil {
					return errors.New("akun 'Kas Giling' tidak ditemukan. Mohon buat terlebih dahulu")
				}

				transaksiKas := model.TransaksiKas{
					AkunKasID:     kasGiling.ID,
					Tanggal:       time.Now(),
					Arah:          ArahKasMasuk,
					Jumlah:        tagihanInternal,
					ReferenceType: SourceJasaGiling,
					ReferenceID:   jasaGilingInternal.ID,
					Memo:          fmt.Sprintf("Pendapatan Jasa Giling Pribadi (Produksi #%d)", produksiBaru.ID),
					CreatedByID:   userID,
				}
				if err := tx.Create(&transaksiKas).Error; err != nil {
					return fmt.Errorf("gagal mencatat kas jasa giling internal: %w", err)
				}
				if err := tx.Model(&kasGiling).Update("saldo", gorm.Expr("saldo + ?", tagihanInternal)).Error; err != nil {
					return fmt.Errorf("gagal update saldo kas giling: %w", err)
				}
			}
		}

		if err := s.stokProdukService.UpdateStokAndHpp(tx, produksiBaru.ProdukID, produksiBaru.JumlahProduksiKg, totalBiayaProduksiBatch); err != nil {
			return err
		}

		logStok := model.LogStokProduk{
			ProdukID:   produksiBaru.ProdukID,
			JumlahKg:   produksiBaru.JumlahProduksiKg,
			Deskripsi:  fmt.Sprintf("Hasil produksi #%d", produksiBaru.ID),
			ProduksiID: &produksiBaru.ID,
		}
		if err := s.logService.CatatStokMasuk(tx, logStok); err != nil {
			return fmt.Errorf("gagal catat log stok masuk: %w", err)
		}

		logProduksiAwal := model.LogProduksi{
			BatchProduksiID:        produksiBaru.ID,
			TipeLog:                "PRODUKSI_AWAL",
			JumlahKg:               produksiBaru.JumlahProduksiKg,
			SisaKgSetelahTransaksi: produksiBaru.SisaKg,
			Deskripsi:              fmt.Sprintf("Batch #%d dihasilkan dari %.2f kg bahan baku", produksiBaru.ID, totalGabahDigunakan),
		}
		if err := s.logProduksiService.CatatLog(tx, logProduksiAwal); err != nil {
			return fmt.Errorf("gagal catat log produksi awal: %w", err)
		}

		return nil
	})

	if err != nil {
		return model.BatchProduksi{}, err
	}

	return s.repoProduksi.FindByID(produksiBaru.ID)
}

// Tambahkan dua fungsi helper ini di dalam file yang sama
// ✅ FIXED: Fungsi helper ini sekarang di-recode untuk menangani dua sumber stok
func (s *produksiService) konsumsiStokDariBatchLain(tx *gorm.DB, produksiBaru *model.BatchProduksi, produkID uint, jumlahDibutuhkan float64, daftarSumber *[]model.ProduksiSumber) (float64, error) {
	var totalBiaya float64
	sisaKebutuhan := jumlahDibutuhkan

	// Tahap 1: Habiskan stok dari batch_produksi yang tersedia (FIFO)
	var batchTersedia []model.BatchProduksi
	if err := tx.Where("produk_id = ? AND sisa_kg > 0", produkID).Order("tgl_produksi asc").Find(&batchTersedia).Error; err != nil {
		return 0, fmt.Errorf("gagal mencari batch tersedia untuk produk ID %d: %w", produkID, err)
	}

	for i := range batchTersedia {
		if sisaKebutuhan <= 0 {
			break
		}
		batchAsal := &batchTersedia[i]
		kgDiambil := minFloat(batchAsal.SisaKg, sisaKebutuhan)
		sisaKgBaru := batchAsal.SisaKg - kgDiambil

		// Update sisa_kg di batch asal
		if err := tx.Model(batchAsal).Update("sisa_kg", sisaKgBaru).Error; err != nil {
			return 0, err
		}
		// ✅ PERBAIKAN KRITIS: Update is_terpakai jika sisa_kg <= 0
		if sisaKgBaru <= 0 {
			if err := tx.Model(batchAsal).Update("is_terpakai", true).Error; err != nil {
				return 0, fmt.Errorf("gagal update is_terpakai untuk batch %d: %w", batchAsal.ID, err)
			}
		}

		hppBatchAsal := 0.0
		if batchAsal.JumlahProduksiKg > 0 {
			hppBatchAsal = batchAsal.TotalBiayaProduksi / batchAsal.JumlahProduksiKg
		}
		totalBiaya += kgDiambil * hppBatchAsal
		sisaKebutuhan -= kgDiambil

		// ✅ PERBAIKAN KUNCI: Simpan ProduksiSumber dengan benar
		*daftarSumber = append(*daftarSumber, model.ProduksiSumber{
			BatchProduksiID:       produksiBaru.ID,
			BatchProduksiSumberID: &batchAsal.ID, // ✅ Ini yang penting!
			JumlahKgDigunakan:     kgDiambil,
		})

		// Log produksi untuk batch yang dikonsumsi
		logProduksi := model.LogProduksi{
			BatchProduksiID:        batchAsal.ID,
			TipeLog:                "DIGUNAKAN_PRODUKSI_LAIN",
			JumlahKg:               -kgDiambil,
			SisaKgSetelahTransaksi: sisaKgBaru,
			Deskripsi:              fmt.Sprintf("Digunakan untuk produksi %s (Batch #%d)", produksiBaru.Produk.NamaProduk, produksiBaru.ID),
			DigunakanDiProduksiID:  &produksiBaru.ID,
		}

		// ✅ PERBAIKAN KRITIS: Error handling untuk log produksi
		if err := s.logProduksiService.CatatLog(tx, logProduksi); err != nil {
			return 0, fmt.Errorf("gagal catat log produksi untuk batch yang dikonsumsi (BatchID=%d): %w", batchAsal.ID, err)
		}

		// Update stok_produk untuk mengurangi total stok
		nilaiHppKeluar := hppBatchAsal * kgDiambil
		if err := s.stokProdukService.UpdateStokAndHpp(tx, produkID, -kgDiambil, -nilaiHppKeluar); err != nil {
			return 0, fmt.Errorf("gagal update stok produk saat konsumsi batch: %v", err)
		}

		// Log stok produk juga
		logStok := model.LogStokProduk{
			ProdukID:   produkID,
			TipeLog:    "KELUAR",
			JumlahKg:   kgDiambil,
			Deskripsi:  fmt.Sprintf("Digunakan dalam produksi %s (dari batch #%d)", produksiBaru.Produk.NamaProduk, batchAsal.ID),
			ProduksiID: &produksiBaru.ID,
		}
		if err := s.logService.CatatStokKeluar(tx, logStok); err != nil {
			return 0, fmt.Errorf("gagal catat log stok keluar: %v", err)
		}
	}

	// Tahap 2: Jika masih ada sisa kebutuhan, ambil dari stok_produk umum (non-batch)
	if sisaKebutuhan > 0 {
		var stokUmum model.StokProduk
		if err := tx.Where("produk_id = ?", produkID).First(&stokUmum).Error; err != nil {
			return 0, fmt.Errorf("gagal mencari stok umum untuk produk ID %d: %w", produkID, err)
		}

		// Hitung stok umum yang tidak terikat batch
		var totalSisaDiBatch float64
		tx.Model(&model.BatchProduksi{}).Where("produk_id = ?", produkID).Select("COALESCE(SUM(sisa_kg), 0)").Row().Scan(&totalSisaDiBatch)
		stokUmumNonBatch := stokUmum.TotalStokKg - totalSisaDiBatch

		if stokUmumNonBatch < sisaKebutuhan {
			return 0, fmt.Errorf("stok umum tidak mencukupi. Dibutuhkan sisa: %.2f, Tersedia di stok umum: %.2f", sisaKebutuhan, stokUmumNonBatch)
		}

		// Kurangi dari stok umum dan tambahkan biayanya
		nilaiHppKeluar := stokUmum.HppRataRata * sisaKebutuhan
		if err := s.stokProdukService.UpdateStokAndHpp(tx, produkID, -sisaKebutuhan, -nilaiHppKeluar); err != nil {
			return 0, err
		}
		totalBiaya += nilaiHppKeluar

		// ✅ PERBAIKAN: Simpan dengan benar untuk stok umum
		stokIDCopy := stokUmum.ID
		*daftarSumber = append(*daftarSumber, model.ProduksiSumber{
			BatchProduksiID:   produksiBaru.ID,
			StokProdukID:      &stokIDCopy,
			JumlahKgDigunakan: sisaKebutuhan, // ✅ Gunakan sisaKebutuhan yang tepat
		})

		// Log untuk penggunaan stok umum
		logStokUmum := model.LogStokProduk{
			ProdukID:   produkID,
			TipeLog:    "KELUAR",
			JumlahKg:   sisaKebutuhan,
			Deskripsi:  fmt.Sprintf("Digunakan dalam produksi %s (dari stok umum)", produksiBaru.Produk.NamaProduk),
			ProduksiID: &produksiBaru.ID,
		}
		if err := s.logService.CatatStokKeluar(tx, logStokUmum); err != nil {
			return 0, fmt.Errorf("gagal catat log stok umum keluar: %v", err)
		}

		sisaKebutuhan = 0 // ✅ Set ke 0 setelah terpenuhi
	}

	if sisaKebutuhan > 0 {
		return 0, fmt.Errorf("stok total produk jadi tidak mencukupi. Dibutuhkan: %.2f, Terpenuhi: %.2f", jumlahDibutuhkan, jumlahDibutuhkan-sisaKebutuhan)
	}

	return totalBiaya, nil
}

func (s *produksiService) konsumsiStokKarung(tx *gorm.DB, produksiBaru *model.BatchProduksi, karungInputs []InputKarungDigunakan) (float64, int, error) {
	biayaKarung := 0.0
	totalKarung := 0
	var karungSumberUntukDisimpan []model.ProduksiKarungSumber

	for _, karungInput := range karungInputs {
		if karungInput.Jumlah <= 0 || karungInput.ProdukID == 0 {
			continue
		}
		totalKarung += karungInput.Jumlah
		jumlahDibutuhkan := karungInput.Jumlah
		var batchKarungTersedia []model.BatchKarung
		tx.Where("produk_id = ? AND sisa > 0", karungInput.ProdukID).Order("tgl_pembelian asc").Find(&batchKarungTersedia)

		jumlahTerpenuhi := 0
		for _, batchKarung := range batchKarungTersedia {
			if jumlahTerpenuhi >= jumlahDibutuhkan {
				break
			}
			diambilDariBatch := 0
			sisaKebutuhan := jumlahDibutuhkan - jumlahTerpenuhi
			if batchKarung.Sisa >= sisaKebutuhan {
				diambilDariBatch = sisaKebutuhan
			} else {
				diambilDariBatch = batchKarung.Sisa
			}
			sisaBaru := batchKarung.Sisa - diambilDariBatch
			if err := tx.Model(&batchKarung).Update("sisa", sisaBaru).Error; err != nil {
				return 0, 0, err
			}

			log := model.LogKarung{
				BatchKarungID: batchKarung.ID, BatchProduksiID: produksiBaru.ID, JumlahDigunakan: -diambilDariBatch,
				SisaSetelah: sisaBaru, Deskripsi: fmt.Sprintf("Digunakan di produksi #%d", produksiBaru.ID),
			}
			if err := s.logKarungService.CatatLog(tx, log); err != nil {
				return 0, 0, err
			}

			biayaKarung += float64(diambilDariBatch) * batchKarung.HargaSatuan
			karungSumberUntukDisimpan = append(karungSumberUntukDisimpan, model.ProduksiKarungSumber{
				BatchProduksiID: produksiBaru.ID, BatchKarungID: batchKarung.ID, JumlahDigunakan: diambilDariBatch,
			})
			jumlahTerpenuhi += diambilDariBatch
		}

		if jumlahTerpenuhi < jumlahDibutuhkan {
			return 0, 0, fmt.Errorf("stok karung untuk produk ID %d tidak mencukupi", karungInput.ProdukID)
		}
	}

	if len(karungSumberUntukDisimpan) > 0 {
		if err := tx.Create(&karungSumberUntukDisimpan).Error; err != nil {
			return 0, 0, fmt.Errorf("gagal menyimpan sumber karung: %w", err)
		}
	}

	return biayaKarung, totalKarung, nil
}

// Di file: internal/service/produksi_service.go

func (s *produksiService) DeleteProduksi(id uint, userID uint) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		produksi, err := s.repoProduksi.FindByID(id)
		if err != nil {
			return errors.New("data produksi tidak ditemukan")
		}
		if produksi.SisaKg != produksi.JumlahProduksiKg {
			return errors.New("tidak bisa menghapus produksi yang hasilnya sudah terjual/terpakai")
		}

		// Kembalikan stok dari semua sumber yang digunakan
		for _, sumber := range produksi.SumberDigunakan {
			if sumber.BatchPembelianID != nil {
				// ✅ EXISTING LOGIC: Kembalikan ke batch pembelian
				if err := tx.Model(&model.BatchPembelian{}).Where("id = ?", *sumber.BatchPembelianID).Update("sisa_kg", gorm.Expr("sisa_kg + ?", sumber.JumlahKgDigunakan)).Error; err != nil {
					return err
				}

				// ✅ TAMBAHAN: Catat log pengembalian batch pembelian
				var batchPembelian model.BatchPembelian
				if err := tx.Where("id = ?", *sumber.BatchPembelianID).First(&batchPembelian).Error; err == nil {
					logBatchPembelian := model.LogPembelian{
						BatchPembelianID: batchPembelian.ID,
						TipeLog:          "DIKEMBALIKAN_DARI_PRODUKSI",
						JumlahKg:         sumber.JumlahKgDigunakan, // Positif karena masuk kembali
						SisaKgSetelah:    batchPembelian.SisaKg + sumber.JumlahKgDigunakan,
						Deskripsi:        fmt.Sprintf("Dikembalikan dari penghapusan produksi #%d", id),
						BatchProduksiID:  &id,
					}
					// Safe call dengan error handling
					if err := s.logPembelianService.CatatLog(tx, logBatchPembelian); err != nil {
						// Log error tapi jangan gagalkan transaksi
						fmt.Printf("⚠️ Gagal catat log pengembalian batch pembelian: %v\n", err)
					}
				}

			} else if sumber.StokProdukID != nil {
				// ✅ EXISTING LOGIC: Kembalikan ke stok umum
				// ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
				// --- TAMBAHKAN LOGIKA BARU DI DALAM BLOK INI ---
				// Tujuannya adalah mengecek apakah stok ini berasal dari Pembelian Langsung
				// ---
				var stok model.StokProduk
				if err := tx.Preload("Produk").Where("id = ?", *sumber.StokProdukID).First(&stok).Error; err == nil {

					// Cek jika ini adalah Produk Jadi yang tidak dilacak per batch (ciri khas Pembelian Langsung)
					if stok.Produk.TipeProduk == TipeProdukJadi && !stok.Produk.LacakPerBatch {
						// KEMBALIKAN STOK KE PEMBELIAN LANGSUNG BATCH
						var logsPenggunaan []model.LogPembelianLangsung
						// Cari log penggunaan yang terhubung dengan ID Produksi yang dihapus
						if err := tx.Where("produksi_id = ?", id).Find(&logsPenggunaan).Error; err == nil {
							for _, logPakai := range logsPenggunaan {
								// Kembalikan stok ke masing-masing batch pembelian langsung yang digunakan
								s.pembelianLangsungService.KembalikanStok(tx, logPakai.PembelianLangsungID, logPakai.JumlahDigunakanKg)
							}
							// Hapus log penggunaan setelah stok dikembalikan
							tx.Where("produksi_id = ?", id).Delete(&model.LogPembelianLangsung{})
						}
					}

					// Kembalikan juga HPP ke stok umum (logika ini tetap diperlukan untuk semua jenis stok)
					hppDibalikkan := sumber.JumlahKgDigunakan * stok.HppRataRata
					if err := s.stokProdukService.UpdateStokAndHpp(tx, stok.ProdukID, sumber.JumlahKgDigunakan, hppDibalikkan); err != nil {
						return err
					}
				}
				// --- BATAS PENAMBAHAN KODE ---
				// ▲▲▲▲▲

			} else if sumber.BatchProduksiSumberID != nil {
				// ✅ EXISTING LOGIC: Kembalikan ke batch produksi sumber
				if err := tx.Model(&model.BatchProduksi{}).Where("id = ?", *sumber.BatchProduksiSumberID).Update("sisa_kg", gorm.Expr("sisa_kg + ?", sumber.JumlahKgDigunakan)).Error; err != nil {
					return err
				}
				if err := tx.Model(&model.BatchProduksi{}).Where("id = ?", *sumber.BatchProduksiSumberID).Update("is_terpakai", false).Error; err != nil {
					return err
				}

				// ✅ EXISTING LOGIC: Kembalikan juga ke stok_produk
				var batchSumber model.BatchProduksi
				if err := tx.Preload("Produk").Where("id = ?", *sumber.BatchProduksiSumberID).First(&batchSumber).Error; err == nil {
					hppBatch := 0.0
					if batchSumber.JumlahProduksiKg > 0 {
						hppBatch = batchSumber.TotalBiayaProduksi / batchSumber.JumlahProduksiKg
					}
					nilaiHppDikembalikan := sumber.JumlahKgDigunakan * hppBatch
					if err := s.stokProdukService.UpdateStokAndHpp(tx, batchSumber.ProdukID, sumber.JumlahKgDigunakan, nilaiHppDikembalikan); err != nil {
						return err
					}
				}
			}
		}

		// ======================================================================
		// --- PERBAIKAN: Panggil service jasa giling untuk reversal, BUKAN hard delete ---
		// ======================================================================
		var jasaGilingTerkait model.TransaksiJasaGiling
		if err := tx.Where("batch_produksi_id = ?", id).First(&jasaGilingTerkait).Error; err == nil {
			// Panggil fungsi delete dari service-nya agar logika reversal kas berjalan
			if err := s.jasaGilingService.DeleteJasaGiling(jasaGilingTerkait.ID, userID); err != nil {
				return fmt.Errorf("gagal membatalkan jasa giling internal terkait: %w", err)
			}
		}
		// --- BATAS PERBAIKAN ---

		// ✅ EXISTING LOGIC: Kembalikan karung
		var sumberKarung []model.ProduksiKarungSumber
		tx.Where("batch_produksi_id = ?", id).Find(&sumberKarung)
		for _, sumber := range sumberKarung {
			tx.Model(&model.BatchKarung{}).Where("id = ?", sumber.BatchKarungID).Update("sisa", gorm.Expr("sisa + ?", sumber.JumlahDigunakan))
		}

		// ✅ EXISTING LOGIC: Hapus semua log terkait
		s.logService.DeleteLogBySource(tx, TipePenggunaanProduksi, id)
		s.logProduksiService.DeleteLogBySource(tx, SourceBatchProduksi, id)
		s.logKarungService.DeleteLogByProduksiID(tx, id)

		// ✅ TAMBAHAN: Hapus log pembelian terkait (safe call)
		if err := s.logPembelianService.DeleteLogBySource(tx, SourceBatchProduksi, id); err != nil {
			// Log error tapi jangan gagalkan transaksi
			fmt.Printf("⚠️ Gagal hapus log pembelian terkait: %v\n", err)
		}

		// ✅ EXISTING LOGIC: Hapus log terkait produksi lain
		if err := tx.Where("digunakan_di_produksi_id = ?", id).Delete(&model.LogProduksi{}).Error; err != nil {
			return err
		}

		// ✅ EXISTING LOGIC: Hapus jasa giling internal dan relasi karung
		if err := tx.Where("batch_produksi_id = ?", id).Delete(&model.TransaksiJasaGiling{}).Error; err != nil {
			return err
		}
		if err := tx.Where("batch_produksi_id = ?", id).Delete(&model.ProduksiKarungSumber{}).Error; err != nil {
			return err
		}

		// ✅ EXISTING LOGIC: Kurangi stok produk jadi yang dihasilkan
		if err := s.stokProdukService.UpdateStokAndHpp(tx, produksi.ProdukID, -produksi.JumlahProduksiKg, -produksi.TotalBiayaProduksi); err != nil {
			return err
		}

		// ✅ EXISTING LOGIC: Delete record
		return s.repoProduksi.Delete(tx, id)
	})
}

func (s *produksiService) UpdateProduksi(id uint, input InputProduksi, userID uint) (model.BatchProduksi, error) {
	var produksiDiperbarui model.BatchProduksi
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := s.DeleteProduksi(id, userID); err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errors.New("data produksi yang akan diupdate tidak ditemukan")
			}
			return fmt.Errorf("gagal menghapus data lama saat update: %w", err)
		}
		produksiBaru, err := s.CreateProduksi(input, userID)
		if err != nil {
			return fmt.Errorf("gagal membuat data baru saat update: %w", err)
		}
		produksiDiperbarui = produksiBaru
		return nil
	})
	return produksiDiperbarui, err
}

func (s *produksiService) GetAllProduksi() ([]model.BatchProduksi, error) {
	return s.repoProduksi.FindAll()
}

//Helper

func minFloat(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}

func (s *produksiService) debugLogProduksi(tx *gorm.DB, batchProduksiID uint) {
	var logs []model.LogProduksi
	if err := tx.Where("batch_produksi_id = ?", batchProduksiID).Find(&logs).Error; err != nil {
		fmt.Printf("❌ DEBUG: Gagal cek log untuk BatchID=%d: %v\n", batchProduksiID, err)
		return
	}

	fmt.Printf("🔍 DEBUG: Ditemukan %d log untuk BatchID=%d:\n", len(logs), batchProduksiID)
	for i, log := range logs {
		fmt.Printf("  [%d] TipeLog=%s, JumlahKg=%.2f, Deskripsi=%s\n",
			i+1, log.TipeLog, log.JumlahKg, log.Deskripsi)
	}
}

// ✅ TAMBAHAN: Helper function untuk update is_terpakai
func (s *produksiService) UpdateStatusTerpakai(tx *gorm.DB, batchProduksiID uint) error {
	var batch model.BatchProduksi
	if err := tx.Where("id = ?", batchProduksiID).First(&batch).Error; err != nil {
		return fmt.Errorf("batch produksi ID %d tidak ditemukan: %w", batchProduksiID, err)
	}

	// Jika sisa_kg <= 0, set is_terpakai = true
	if batch.SisaKg <= 0 {
		if err := tx.Model(&batch).Update("is_terpakai", true).Error; err != nil {
			return fmt.Errorf("gagal update is_terpakai untuk batch %d: %w", batchProduksiID, err)
		}

		// Log untuk tracking
		fmt.Printf("✅ BATCH #%d SEKARANG TERPAKAI PENUH (SisaKg=%.2f)\n", batchProduksiID, batch.SisaKg)
	}

	return nil
}

// ✅ TAMBAHAN: Public method yang bisa dipanggil dari service lain
func (s *produksiService) MarkBatchAsUsedIfEmpty(tx *gorm.DB, batchProduksiID uint) error {
	return s.UpdateStatusTerpakai(tx, batchProduksiID)
}

// Implementasi method baru di produksiService
func (s *produksiService) GetProduksiPaginated(page, limit int, dateFrom, dateTo string) ([]model.BatchProduksi, int64, error) {
	return s.repoProduksi.FindPaginated(page, limit, dateFrom, dateTo)
}

func (s *produksiService) GetProduksiSummary(dateFrom, dateTo string) (SummaryData, error) {
	// Parse dates if provided
	var dateStart, dateEnd *time.Time

	if dateFrom != "" {
		if parsed, err := time.Parse("2006-01-02", dateFrom); err == nil {
			dateStart = &parsed
		}
	}

	if dateTo != "" {
		if parsed, err := time.Parse("2006-01-02", dateTo); err == nil {
			// Set to end of day
			endOfDay := parsed.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
			dateEnd = &endOfDay
		}
	}

	// Build query conditions
	query := s.db.Model(&model.BatchProduksi{})

	if dateStart != nil && dateEnd != nil {
		query = query.Where("tgl_produksi BETWEEN ? AND ?", dateStart, dateEnd)
	} else if dateStart != nil {
		query = query.Where("tgl_produksi >= ?", dateStart)
	} else if dateEnd != nil {
		query = query.Where("tgl_produksi <= ?", dateEnd)
	}

	// Calculate summary
	var result struct {
		TotalProduksi float64 `json:"total_produksi"`
		TotalSisa     float64 `json:"total_sisa"`
		TotalHPP      float64 `json:"total_hpp"`
		Count         int64   `json:"count"`
	}

	err := query.Select(
		"COALESCE(SUM(jumlah_produksi_kg), 0) as total_produksi",
		"COALESCE(SUM(sisa_kg), 0) as total_sisa",
		"COALESCE(SUM(total_biaya_produksi), 0) as total_hpp",
		"COUNT(*) as count",
	).Scan(&result).Error

	if err != nil {
		return SummaryData{}, err
	}

	// Calculate total bahan baku digunakan (approximate from HPP)
	// This could be made more accurate by joining with sumber tables
	totalBahanBaku := float64(0)

	// Get all produksi in date range to calculate bahan baku
	var produksiList []model.BatchProduksi
	if err := query.Preload("SumberDigunakan").Find(&produksiList).Error; err == nil {
		for _, produksi := range produksiList {
			for _, sumber := range produksi.SumberDigunakan {
				totalBahanBaku += sumber.JumlahKgDigunakan
			}
		}
	}

	// Calculate efficiency
	efficiency := float64(0)
	if totalBahanBaku > 0 {
		efficiency = (result.TotalProduksi / totalBahanBaku) * 100
	}

	summary := SummaryData{
		TotalProduksiDihasilkan: result.TotalProduksi,
		TotalBahanBakuDigunakan: totalBahanBaku,
		TotalSisaProduksi:       result.TotalSisa,
		TotalHPP:                result.TotalHPP,
		AvgEfficiency:           efficiency,
	}

	return summary, nil
}
