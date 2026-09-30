// internal/service/penjualan_service.go
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

// Interface ServicePenjualan
type ServicePenjualan interface {
	CreatePenjualan(input InputPenjualan, userID uint) (model.TransaksiPenjualan, error)
	GetAllPenjualan() ([]model.TransaksiPenjualan, error)
	GetPenjualanByID(id uint) (model.TransaksiPenjualan, error)
	UpdatePenjualan(id uint, input InputPenjualan, userID uint) (model.TransaksiPenjualan, error)
	DeletePenjualan(id uint, userID uint) error                                         // ← Tambah parameter userID
	GetPenjualanByDate(date time.Time) ([]model.TransaksiPenjualan, error)              // ← TAMBAH INI
	GetLabaHarian() (float64, error)                                                    // ← TAMBAH INI
	CancelPenjualan(id uint, userID uint) error                                         // ← TAMBAH INI
	GetPenjualanByDateWithCancelled(date time.Time) ([]model.TransaksiPenjualan, error) // ← TAMBAH INI
}

// Struct service
type penjualanService struct {
	db                       *gorm.DB
	repoPenjualan            repository.RepositoryPenjualan
	repoProduk               repository.RepositoryProduk // ← TAMBAH INI
	stokProdukService        ServiceStokProduk
	piutangService           ServicePiutang
	akunKasRepo              repository.RepositoryAkunKas
	logService               ServiceLogStok
	logProduksiService       ServiceLogProduksi       // ← TAMBAH INI
	pembelianLangsungService ServicePembelianLangsung // ← TAMBAH INI
}

// Constructor
func NewPenjualanService(
	db *gorm.DB,
	repoPenjualan repository.RepositoryPenjualan,
	repoProduk repository.RepositoryProduk, // ← TAMBAH INI
	stokProdukService ServiceStokProduk,
	logService ServiceLogStok,
	logProduksiService ServiceLogProduksi, // ← TAMBAH INI
	pembelianLangsungService ServicePembelianLangsung, // ← TAMBAH INI
	piutangService ServicePiutang,
	akunKasRepo repository.RepositoryAkunKas,
) *penjualanService {
	return &penjualanService{
		db,
		repoPenjualan,
		repoProduk, // ← TAMBAH INI
		stokProdukService,
		piutangService,
		akunKasRepo,
		logService,
		logProduksiService,       // ← TAMBAH INI
		pembelianLangsungService, // ← TAMBAH INI
	}
}

// ▼▼▼ GANTI SELURUH STRUCT INI ▼▼▼
type InputPenjualan struct {
	ProdukID         uint    `json:"produk_id" binding:"required"`
	JumlahKg         float64 `json:"jumlah_kg" binding:"required"`
	HargaJualPerKg   float64 `json:"harga_jual_per_kg" binding:"required"`
	NamaPelanggan    string  `json:"nama_pelanggan"`
	StatusPembayaran string  `json:"status_pembayaran" binding:"required,oneof=LUNAS SEBAGIAN BELUM_LUNAS"`
	NilaiTerbayar    float64 `json:"nilai_terbayar"`
	AkunKasID        uint    `json:"akun_kas_id"`
}

// ======================================================================
// 🔥 FUNGSI CREATE PENJUALAN - DENGAN PESSIMISTIC LOCKING
// ======================================================================
func (s *penjualanService) CreatePenjualan(input InputPenjualan, userID uint) (model.TransaksiPenjualan, error) {
	var penjualanTersimpan model.TransaksiPenjualan

	err := s.db.Transaction(func(tx *gorm.DB) error {
		// ===================================================================
		// 🔒 LOCK STOK PRODUK YANG AKAN DIJUAL (RACE CONDITION FIX)
		// ===================================================================
		var stokProduk model.StokProduk
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("produk_id = ?", input.ProdukID).
			First(&stokProduk).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errors.New("stok produk tidak ditemukan")
			}
			return fmt.Errorf("gagal mengakses data stok: %w", err)
		}

		// ===================================================================
		// 🔒 VALIDASI STOK (SEKARANG AMAN - ROW SUDAH DI-LOCK)
		// ===================================================================
		if stokProduk.TotalStokKg < input.JumlahKg {
			return fmt.Errorf("stok tidak mencukupi. Stok tersedia: %.2f kg, diminta: %.2f kg",
				stokProduk.TotalStokKg, input.JumlahKg)
		}

		// ===================================================================
		// STEP 3: Panggil logic existing lo (ga diubah)
		// ===================================================================
		var errCreate error
		penjualanTersimpan, errCreate = s.createPenjualanLogic(tx, input, userID)
		return errCreate
	})

	return penjualanTersimpan, err
}

func (s *penjualanService) GetAllPenjualan() ([]model.TransaksiPenjualan, error) {
	return s.repoPenjualan.FindByDateWithCancelled(time.Now())
}

func (s *penjualanService) GetPenjualanByID(id uint) (model.TransaksiPenjualan, error) {
	return s.repoPenjualan.FindByID(id)
}

func (s *penjualanService) UpdatePenjualan(id uint, input InputPenjualan, userID uint) (model.TransaksiPenjualan, error) {
	var penjualanDiperbarui model.TransaksiPenjualan
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := s.deletePenjualanLogic(tx, id); err != nil {
			if !errors.Is(err, gorm.ErrRecordNotFound) {
				return fmt.Errorf("gagal membatalkan penjualan lama saat update: %w", err)
			}
			return errors.New("data penjualan yang akan diupdate tidak ditemukan")
		}
		var err error
		penjualanDiperbarui, err = s.createPenjualanLogic(tx, input, userID)
		if err != nil {
			return fmt.Errorf("gagal membuat ulang data penjualan saat update: %w", err)
		}
		return nil
	})
	if err != nil {
		return model.TransaksiPenjualan{}, err
	}
	return s.repoPenjualan.FindByID(penjualanDiperbarui.ID)
}

func (s *penjualanService) DeletePenjualan(id uint, userID uint) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		return s.deletePenjualanLogic(tx, id)
	})
}

// ======================================================================
// FUNGSI HELPER BARU UNTUK KONSUMSI STOK
// ======================================================================
// ▼▼▼ GANTI FUNGSI HELPER INI SECARA KESELURUHAN ▼▼▼
func (s *penjualanService) konsumsiStokUntukPenjualan(tx *gorm.DB, produk *model.Produk, jumlahKg float64, namaPelanggan string, transaksiID uint) (float64, error) {
	totalHPPKeluar := 0.0

	if !produk.LacakPerBatch || produk.TipeProduk == TipeProdukSampingan {
		stok, err := s.stokProdukService.GetStokByProdukID(produk.ID)
		if err != nil || stok == nil {
			return 0, fmt.Errorf("stok untuk produk %s tidak ditemukan", produk.NamaProduk)
		}
		if stok.TotalStokKg < jumlahKg {
			return 0, fmt.Errorf("stok %s tidak mencukupi, hanya tersisa %.2f Kg", produk.NamaProduk, stok.TotalStokKg)
		}
		totalHPPKeluar = stok.HppRataRata * jumlahKg
		// --- PERBAIKAN LOGIKA DI SINI ---
		// Jangan langsung panggil KonsumsiStok (FIFO Pembelian Langsung) jika ini Produk Sampingan
		// Karena Produk Sampingan biasanya hanya ada di stok_produk (hasil produksi), bukan beli langsung.

		isStokDariPembelianLangsung := false

		// Cek dulu apakah ada stok di pembelian_langsung untuk produk ini
		stokInfo, err := s.pembelianLangsungService.CekKetersediaanStok(produk.ID)
		if err == nil && stokInfo.SisaDariPembelianLangsung >= jumlahKg {
			isStokDariPembelianLangsung = true
		}

		// Jika produk ini berasal dari pembelian langsung (trading), gunakan logika FIFO
		if isStokDariPembelianLangsung {
			err = s.pembelianLangsungService.KonsumsiStok(tx, produk.ID, jumlahKg, "PENJUALAN", &transaksiID)
			if err != nil {
				return 0, err
			}
		}
		// Jika BUKAN dari pembelian langsung (misal Dedak hasil giling), tidak perlu panggil KonsumsiStok.
		// Stok total nanti akan dikurangi di langkah selanjutnya (updateStokAndHpp) di fungsi pemanggil (createPenjualanLogic).
	} else if produk.TipeProduk == TipeProdukJadi {
		stok, err := s.stokProdukService.GetStokByProdukID(produk.ID)
		if err != nil || stok == nil {
			return 0, fmt.Errorf("stok untuk produk %s tidak ditemukan", produk.NamaProduk)
		}
		if stok.TotalStokKg < jumlahKg {
			return 0, fmt.Errorf("total stok %s tidak mencukupi, hanya tersisa %.2f Kg", produk.NamaProduk, stok.TotalStokKg)
		}
		var batchTersedia []model.BatchProduksi
		tx.Where("produk_id = ? AND sisa_kg > 0", produk.ID).Order("tgl_produksi asc").Find(&batchTersedia)
		sisaKebutuhan := jumlahKg
		for i := range batchTersedia {
			if sisaKebutuhan <= 0 {
				break
			}
			batch := &batchTersedia[i]
			kgDiambil := min(batch.SisaKg, sisaKebutuhan)
			sisaKgBaru := batch.SisaKg - kgDiambil
			tx.Model(batch).Update("sisa_kg", sisaKgBaru)
			if sisaKgBaru <= 0 {
				tx.Model(batch).Update("is_terpakai", true)
			}
			hppBatch := 0.0
			if batch.JumlahProduksiKg > 0 {
				hppBatch = batch.TotalBiayaProduksi / batch.JumlahProduksiKg
			}
			totalHPPKeluar += kgDiambil * hppBatch
			logProduksi := model.LogProduksi{
				BatchProduksiID: batch.ID, TipeLog: "PENJUALAN", JumlahKg: -kgDiambil,
				SisaKgSetelahTransaksi: sisaKgBaru, Deskripsi: fmt.Sprintf("Terjual kepada %s (Transaksi ID: %d)", namaPelanggan, transaksiID),
				PenjualanID: &transaksiID,
			}
			s.logProduksiService.CatatLog(tx, logProduksi)
			sisaKebutuhan -= kgDiambil
		}
		if sisaKebutuhan > 0 {
			return 0, fmt.Errorf("stok dari batch produksi tidak mencukupi, kurang %.2f Kg", sisaKebutuhan)
		}
	}
	return totalHPPKeluar, nil
}

// ======================================================================
// FUNGSI UTAMA YANG LEBIH BERSIH
// ======================================================================
// ▼▼▼ GANTI FUNGSI LAMA DENGAN VERSI BARU INI SECARA KESELURUHAN ▼▼▼
func (s *penjualanService) createPenjualanLogic(tx *gorm.DB, input InputPenjualan, userID uint) (model.TransaksiPenjualan, error) {
	var transaksiBaru model.TransaksiPenjualan
	totalHarga := input.JumlahKg * input.HargaJualPerKg

	// 1. Validasi pembayaran
	nilaiBayar := input.NilaiTerbayar
	if input.StatusPembayaran == StatusLunas {
		nilaiBayar = totalHarga
	} else if input.StatusPembayaran == StatusBelumLunas {
		nilaiBayar = 0
	}
	if nilaiBayar > totalHarga {
		return transaksiBaru, errors.New("nilai terbayar tidak boleh melebihi total harga")
	}

	// 2. Ambil data produk (variabel 'produk' sekarang akan digunakan)
	produk, err := s.repoProduk.FindByID(input.ProdukID)
	if err != nil {
		return transaksiBaru, fmt.Errorf("produk yang dijual tidak ditemukan: %w", err)
	}

	// 3. Buat record TransaksiPenjualan terlebih dahulu
	transaksiBaru = model.TransaksiPenjualan{
		TglTransaksi:     time.Now(),
		NamaPelanggan:    input.NamaPelanggan,
		ProdukID:         input.ProdukID,
		JumlahKg:         input.JumlahKg,
		HargaJualPerKg:   input.HargaJualPerKg,
		Laba:             0,
		StatusPembayaran: input.StatusPembayaran,
		NilaiTerbayar:    nilaiBayar,
	}
	if err := tx.Create(&transaksiBaru).Error; err != nil {
		return transaksiBaru, err
	}

	// 4. Panggil fungsi helper untuk konsumsi stok dan dapatkan HPP
	totalHPPKeluar, err := s.konsumsiStokUntukPenjualan(tx, &produk, input.JumlahKg, input.NamaPelanggan, transaksiBaru.ID)
	if err != nil {
		return transaksiBaru, err
	}

	// 5. Update Laba, Stok Umum, dan catat Log
	laba := totalHarga - totalHPPKeluar
	if err := tx.Model(&transaksiBaru).Update("laba", laba).Error; err != nil {
		return transaksiBaru, err
	}
	if err := s.stokProdukService.UpdateStokAndHpp(tx, input.ProdukID, -input.JumlahKg, -totalHPPKeluar); err != nil {
		return transaksiBaru, err
	}
	logData := model.LogStokProduk{
		ProdukID:    transaksiBaru.ProdukID,
		JumlahKg:    -transaksiBaru.JumlahKg,
		Deskripsi:   fmt.Sprintf("Penjualan kepada %s", transaksiBaru.NamaPelanggan),
		PenjualanID: &transaksiBaru.ID,
	}
	if err := s.logService.CatatStokKeluar(tx, logData); err != nil {
		return transaksiBaru, err
	}

	// 6. Jika ada pembayaran, catat Transaksi Kas
	if nilaiBayar > 0 {
		if input.AkunKasID == 0 {
			return transaksiBaru, errors.New("akun kas harus dipilih saat ada pembayaran")
		}
		transaksiKas := model.TransaksiKas{
			AkunKasID:     input.AkunKasID,
			Tanggal:       transaksiBaru.TglTransaksi,
			Arah:          "IN",
			Jumlah:        nilaiBayar,
			ReferenceType: "TRANSAKSI_PENJUALAN",
			ReferenceID:   transaksiBaru.ID,
			Memo:          fmt.Sprintf("Penerimaan dari penjualan kpd %s", transaksiBaru.NamaPelanggan),
			CreatedByID:   userID,
		}
		if err := tx.Create(&transaksiKas).Error; err != nil {
			return transaksiBaru, fmt.Errorf("gagal mencatat transaksi kas: %w", err)
		}
		if err := tx.Model(&model.AkunKas{}).Where("id = ?", input.AkunKasID).Update("saldo", gorm.Expr("saldo + ?", nilaiBayar)).Error; err != nil {
			return transaksiBaru, fmt.Errorf("gagal mengupdate saldo akun kas: %w", err)
		}
	}

	// 7. Buat Catatan Piutang
	piutangBaru := model.Piutang{
		NamaPelanggan:    transaksiBaru.NamaPelanggan,
		TanggalTransaksi: transaksiBaru.TglTransaksi,
		JatuhTempo:       transaksiBaru.TglTransaksi.AddDate(0, 1, 0),
		NilaiTotal:       totalHarga,
		NilaiTerbayar:    nilaiBayar,
		SisaTagihan:      totalHarga - nilaiBayar,
		Status:           input.StatusPembayaran,
		SourceType:       SourceTransaksiPenjualan,
		SourceID:         transaksiBaru.ID,
	}
	if _, err := s.piutangService.CreatePiutang(piutangBaru); err != nil {
		return transaksiBaru, fmt.Errorf("gagal membuat catatan piutang: %w", err)
	}

	return transaksiBaru, nil
}

// ... (Fungsi deletePenjualanLogic, GetPenjualanByDate, GetLabaHarian, dan min tidak berubah) ...
func (s *penjualanService) deletePenjualanLogic(tx *gorm.DB, id uint) error {
	penjualan, err := s.repoPenjualan.FindByID(id)
	if err != nil {
		log.Printf("ERROR: Penjualan tidak ditemukan: %v", err)
		return errors.New("transaksi penjualan tidak ditemukan")
	}
	produk, err := s.repoProduk.FindByID(penjualan.ProdukID)
	if err != nil {
		return errors.New("produk terkait penjualan tidak ditemukan")
	}
	log.Printf("DEBUG: Penjualan found - ID: %d, NilaiTerbayar: %.2f, Status: %s",
		penjualan.ID, penjualan.NilaiTerbayar, penjualan.StatusPembayaran)
	if penjualan.NilaiTerbayar > 0 {
		log.Printf("ERROR: Tidak bisa hapus penjualan dengan pembayaran. NilaiTerbayar: %.2f", penjualan.NilaiTerbayar)
		return errors.New("tidak bisa menghapus penjualan yang sudah memiliki pembayaran")
	}
	if err := tx.Where("source_type = ? AND source_id = ?", SourceTransaksiPenjualan, id).Delete(&model.Piutang{}).Error; err != nil {
		return fmt.Errorf("gagal menghapus piutang terkait: %w", err)
	}

	if err := s.kembalikanStokDanHapusLog(tx, id, &produk, penjualan.JumlahKg); err != nil {
		return err
	}

	return s.repoPenjualan.Delete(tx, id)
}

func (s *penjualanService) GetPenjualanByDate(date time.Time) ([]model.TransaksiPenjualan, error) {
	return s.repoPenjualan.FindByDate(date)
}

func (s *penjualanService) GetLabaHarian() (float64, error) {
	return s.repoPenjualan.SumLabaHarian()
}

func (s *penjualanService) CancelPenjualan(id uint, userID uint) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		penjualan, err := s.repoPenjualan.FindByID(id)
		if err != nil {
			return errors.New("transaksi penjualan tidak ditemukan")
		}

		if penjualan.Status == StatusDibatalkan {
			return errors.New("penjualan ini sudah dibatalkan")
		}

		// REFUND KAS - FIX: Handle 2 skenario pembayaran
		if penjualan.NilaiTerbayar > 0 {
			// Skenario 1: Cari transaksi kas tunai langsung
			var kasAsal model.TransaksiKas
			err := tx.Where("reference_type = ? AND reference_id = ? AND arah = ?",
				SourceTransaksiPenjualan, id, ArahKasMasuk).First(&kasAsal).Error

			if err == nil {
				// Tunai ditemukan - hapus transaksi kas
				tx.Delete(&kasAsal)
				tx.Model(&model.AkunKas{}).Where("id = ?", kasAsal.AkunKasID).
					Update("saldo", gorm.Expr("saldo - ?", penjualan.NilaiTerbayar))
			} else if errors.Is(err, gorm.ErrRecordNotFound) {
				// Skenario 2: Cari pembayaran via piutang (INI YANG DIPERBAIKI!)
				var piutang model.Piutang
				err := tx.Where("source_type = ? AND source_id = ?",
					SourceTransaksiPenjualan, id).First(&piutang).Error

				if err == nil && piutang.NilaiTerbayar > 0 {
					// Cari transaksi kas dari pembayaran piutang
					var kasFromPiutang model.TransaksiKas
					err := tx.Where("reference_type = ? AND reference_id = ? AND arah = 'IN'",
						"PAYMENT_PIUTANG", piutang.ID).First(&kasFromPiutang).Error

					if err == nil {
						// Hapus transaksi kas piutang
						tx.Delete(&kasFromPiutang)
						tx.Model(&model.AkunKas{}).Where("id = ?", kasFromPiutang.AkunKasID).
							Update("saldo", gorm.Expr("saldo - ?", piutang.NilaiTerbayar))

						// Hapus payment allocation
						tx.Where("target_type = ? AND target_id = ?", "PIUTANG", piutang.ID).
							Delete(&model.PaymentAllocation{})
					}
				}
			}
		}

		// KEMBALIKAN STOK
		produk, err := s.repoProduk.FindByID(penjualan.ProdukID)
		if err != nil {
			return errors.New("produk tidak ditemukan")
		}

		if err := s.kembalikanStokDanHapusLog(tx, id, &produk, penjualan.JumlahKg); err != nil {
			return err
		}

		// Update piutang
		tx.Model(&model.Piutang{}).Where("source_type = ? AND source_id = ?", SourceTransaksiPenjualan, id).
			Update("status", StatusDibatalkan)

		// Update status penjualan
		penjualan.Status = StatusDibatalkan
		if err := tx.Save(&penjualan).Error; err != nil {
			return fmt.Errorf("gagal mengubah status: %v", err)
		}

		return nil
	})
}

// ======================================================================
// FUNGSI HELPER BARU MENGEMBALIKAN STOK DAN MENGHAPUS LOGNYA SECARA BERSAMAAN
// ======================================================================
func (s *penjualanService) kembalikanStokDanHapusLog(tx *gorm.DB, penjualanID uint, produk *model.Produk, jumlahKg float64) error {
	totalHPPDikembalikan := 0.0

	if !produk.LacakPerBatch || produk.TipeProduk == TipeProdukSampingan {
		penggunaanLogs, err := s.pembelianLangsungService.GetPenggunaanLogByPenjualanID(tx, penjualanID)
		if err == nil && len(penggunaanLogs) > 0 {
			for _, log := range penggunaanLogs {
				if err := s.pembelianLangsungService.KembalikanStok(tx, log.PembelianLangsungID, log.JumlahDigunakanKg); err != nil {
					return fmt.Errorf("gagal mengembalikan stok ke batch pembelian langsung #%d: %w", log.PembelianLangsungID, err)
				}
				batch, err := s.pembelianLangsungService.GetPembelianLangsungByID(tx, log.PembelianLangsungID)
				if err == nil && batch != nil {
					totalHPPDikembalikan += log.JumlahDigunakanKg * batch.HargaPerKg
				}
			}
			if err := s.pembelianLangsungService.DeletePenggunaanLogByPenjualanID(tx, penjualanID); err != nil {
				return fmt.Errorf("gagal menghapus log penggunaan batch: %w", err)
			}
		}
	} else if produk.TipeProduk == TipeProdukJadi {
		var logsProduksi []model.LogProduksi
		if err := tx.Where("penjualan_id = ?", penjualanID).Find(&logsProduksi).Error; err == nil && len(logsProduksi) > 0 {
			for _, log := range logsProduksi {
				kgDikembalikan := -log.JumlahKg
				if err := tx.Model(&model.BatchProduksi{}).Where("id = ?", log.BatchProduksiID).
					Updates(map[string]interface{}{"sisa_kg": gorm.Expr("sisa_kg + ?", kgDikembalikan), "is_terpakai": false}).Error; err != nil {
					return fmt.Errorf("gagal mengembalikan stok batch produksi: %w", err)
				}
				
				var batch model.BatchProduksi
				if err := tx.First(&batch, log.BatchProduksiID).Error; err == nil {
					hppPerKg := 0.0
					if batch.JumlahProduksiKg > 0 {
						hppPerKg = batch.TotalBiayaProduksi / batch.JumlahProduksiKg
					}
					totalHPPDikembalikan += hppPerKg * kgDikembalikan
				}
			}
			s.logProduksiService.DeleteLogBySource(tx, "PENJUALAN", penjualanID)
		}
	}

	// Update stok umum
	if err := s.stokProdukService.UpdateStokAndHpp(tx, produk.ID, jumlahKg, totalHPPDikembalikan); err != nil {
		return fmt.Errorf("gagal mengembalikan stok umum: %w", err)
	}

	// Hapus log stok keluar regulernya
	if err := s.logService.DeleteLogBySource(tx, "PENJUALAN", penjualanID); err != nil {
		return fmt.Errorf("gagal menghapus log stok umum: %w", err)
	}

	return nil
}


func (s *penjualanService) GetPenjualanByDateWithCancelled(date time.Time) ([]model.TransaksiPenjualan, error) {
	return s.repoPenjualan.FindByDateWithCancelled(date)
}
