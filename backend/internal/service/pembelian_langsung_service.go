// internal/service/pembelian_langsung_service.go
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

type ServicePembelianLangsung interface {
	GetAll() ([]model.PembelianLangsung, error)
	Create(produkID uint, namaPemasok string, jumlahKg, hargaPerKg float64) (*model.PembelianLangsung, error)
	Update(id uint, input InputUpdatePembelian, userID uint) (*model.PembelianLangsung, error) // <-- Diperbaiki
	Delete(id uint, userID uint) error                                                         // <-- Diperbaiki
	CekStok(produkID uint) (float64, error)
	GetStokTersedia(produkID uint) ([]model.PembelianLangsung, error)
	UseStok(pembelianID uint, jumlahDigunakan float64, deskripsi string) error
	CekKetersediaanStok(produkID uint) (StokInfo, error)
	KonsumsiStok(tx *gorm.DB, produkID uint, jumlahDibutuhkan float64, tipePenggunaan string, referensiID *uint) error
	GetPenggunaanLogByPenjualanID(tx *gorm.DB, penjualanID uint) ([]model.LogPembelianLangsung, error)
	KembalikanStok(tx *gorm.DB, pembelianID uint, jumlahDikembalikan float64) error
	DeletePenggunaanLogByPenjualanID(tx *gorm.DB, penjualanID uint) error
	GetPembelianLangsungByID(tx *gorm.DB, id uint) (*model.PembelianLangsung, error)
	GetHistory(pembelianID uint) ([]model.LogPembelianLangsung, error)
	CreateWithPayment(input InputCreatePembelianLangsung, userID uint) (model.PembelianLangsung, error)
	CancelPembelian(id uint, userID uint) error
}

// Struct untuk return value CekKetersediaanStok (tidak berubah)
type StokInfo struct {
	TotalSisaStok             float64
	SisaDariPembelianLangsung float64
	SisaDariStokProduk        float64
}

// --- UBAH STRUCT INI ---
type pembelianLangsungService struct {
	db                       *gorm.DB
	repo                     repository.RepositoryPembelianLangsung
	stokProdukService        ServiceStokProduk
	produkRepo               repository.RepositoryProduk
	logStokService           ServiceLogStok
	logPembelianLangsungRepo repository.RepositoryLogPembelianLangsung
	hutangService            ServiceHutang
	akunKasRepo              repository.RepositoryAkunKas
	biayaOperasionalService  ServiceBiayaOperasional // <-- TAMBAHKAN BARIS INI
}

// --- UBAH CONSTRUCTOR INI ---
func NewPembelianLangsungService(
	db *gorm.DB,
	repo repository.RepositoryPembelianLangsung,
	stokProdukService ServiceStokProduk,
	produkRepo repository.RepositoryProduk,
	logStokService ServiceLogStok,
	logPembelianLangsungRepo repository.RepositoryLogPembelianLangsung,
	hutangService ServiceHutang,
	akunKasRepo repository.RepositoryAkunKas,
	biayaOperasionalService ServiceBiayaOperasional, // <-- TAMBAHKAN PARAMETER INI
) ServicePembelianLangsung { // Pastikan return type-nya adalah interface
	return &pembelianLangsungService{
		db:                       db,
		repo:                     repo,
		stokProdukService:        stokProdukService,
		produkRepo:               produkRepo,
		logStokService:           logStokService,
		logPembelianLangsungRepo: logPembelianLangsungRepo,
		hutangService:            hutangService,
		akunKasRepo:              akunKasRepo,
		biayaOperasionalService:  biayaOperasionalService, // <-- TAMBAHKAN BARIS INI
	}
}

type InputCreatePembelianLangsung struct {
	ProdukID         uint    `json:"produk_id" binding:"required"`
	NamaPemasok      string  `json:"nama_pemasok"`
	JumlahKg         float64 `json:"jumlah_kg" binding:"required"`
	HargaPerKg       float64 `json:"harga_per_kg" binding:"required"`
	StatusPembayaran string  `json:"status_pembayaran" binding:"required,oneof=LUNAS SEBAGIAN BELUM_LUNAS"`
	NilaiTerbayar    float64 `json:"nilai_terbayar"`
	AkunKasID        uint    `json:"akun_kas_id"`
}

// ======================================================================
// FUNGSI PUBLIK (WRAPPERS)
// ======================================================================

func (s *pembelianLangsungService) Create(produkID uint, namaPemasok string, jumlahKg, hargaPerKg float64) (*model.PembelianLangsung, error) {
	var pembelianBaru *model.PembelianLangsung
	err := s.db.Transaction(func(tx *gorm.DB) error {
		var err error
		pembelianBaru, err = s.createPembelianLangsungLogic(tx, produkID, namaPemasok, jumlahKg, hargaPerKg)
		return err
	})
	if err != nil {
		return nil, err
	}
	return s.repo.GetByID(pembelianBaru.ID)
}

// PERBAIKAN: Fungsi Update sekarang menerima userID
func (s *pembelianLangsungService) Update(id uint, input InputUpdatePembelian, userID uint) (*model.PembelianLangsung, error) {
	var pembelianDiperbarui model.PembelianLangsung
	err := s.db.Transaction(func(tx *gorm.DB) error {
		// FASE 1: REVERSE (Batalkan yang lama)
		// PERBAIKAN: Teruskan userID ke logika delete
		if err := s.deletePembelianLangsungLogic(tx, id, userID); err != nil {
			if !errors.Is(err, gorm.ErrRecordNotFound) {
				return fmt.Errorf("gagal membatalkan pembelian lama saat update: %w", err)
			}
			return errors.New("data pembelian yang akan diupdate tidak ditemukan")
		}

		// FASE 2: REPLAY (Buat ulang dengan data baru)
		inputBaru := InputCreatePembelianLangsung{
			ProdukID:    input.ProdukID,
			NamaPemasok: input.NamaPemasok,
			JumlahKg:    input.JumlahKg,
			HargaPerKg:  input.HargaPerKg,
			// Asumsikan update kembali menjadi hutang, bisa disesuaikan jika perlu
			StatusPembayaran: StatusBelumLunas,
		}

		var err error
		pembelianDiperbarui, err = s.CreateWithPayment(inputBaru, userID) // Panggil fungsi create yang sudah lengkap
		if err != nil {
			return fmt.Errorf("gagal membuat ulang data pembelian saat update: %w", err)
		}

		return nil
	})

	if err != nil {
		return nil, err
	}
	return &pembelianDiperbarui, nil
}

// Ganti fungsi Delete Anda menjadi seperti ini
func (s *pembelianLangsungService) Delete(id uint, userID uint) error { // <-- Terima userID
	return s.db.Transaction(func(tx *gorm.DB) error {
		return s.deletePembelianLangsungLogic(tx, id, userID) // <-- Kirim userID
	})
}

// ======================================================================
// HELPER LOGIC (Private functions)
// ======================================================================

func (s *pembelianLangsungService) createPembelianLangsungLogic(tx *gorm.DB, produkID uint, namaPemasok string, jumlahKg, hargaPerKg float64) (*model.PembelianLangsung, error) {
	produk, err := s.produkRepo.GetByIdWithoutPreload(produkID)
	if err != nil {
		return nil, fmt.Errorf("produk tidak ditemukan: %v", err)
	}

	totalHarga := jumlahKg * hargaPerKg
	pembelian := &model.PembelianLangsung{
		ProdukID:         produkID,
		TglPembelian:     time.Now(),
		NamaPemasok:      namaPemasok,
		JumlahKg:         jumlahKg,
		HargaPerKg:       hargaPerKg,
		TotalHarga:       totalHarga,
		DigunakanKg:      0,
		SisaKg:           jumlahKg,
		Status:           StatusAktif,
		StatusPembayaran: StatusBelumLunas,
		NilaiTerbayar:    0,
	}

	if err := tx.Create(pembelian).Error; err != nil {
		return nil, err
	}

	hutangBaru := model.Hutang{
		NamaPemasok:      pembelian.NamaPemasok,
		TanggalTransaksi: pembelian.TglPembelian,
		JatuhTempo:       pembelian.TglPembelian.AddDate(0, 1, 0),
		NilaiTotal:       pembelian.TotalHarga,
		SourceType:       SourcePembelianLangsung,
		SourceID:         pembelian.ID,
	}
	if _, err := s.hutangService.CreateHutang(hutangBaru); err != nil {
		return nil, fmt.Errorf("gagal membuat catatan hutang: %w", err)
	}

	if err := s.stokProdukService.UpdateStokAndHpp(tx, produkID, jumlahKg, totalHarga); err != nil {
		return nil, err
	}

	logStok := model.LogStokProduk{
		ProdukID:            produkID,
		JumlahKg:            jumlahKg,
		Deskripsi:           fmt.Sprintf("Pembelian langsung %s dari %s", produk.NamaProduk, namaPemasok),
		PembelianLangsungID: &pembelian.ID,
	}
	if err := s.logStokService.CatatStokMasuk(tx, logStok); err != nil {
		return nil, err
	}

	logPembelian := model.LogPembelianLangsung{
		PembelianLangsungID: pembelian.ID,
		Tanggal:             time.Now(),
		TipePenggunaan:      TipePenggunaanBeliAwal,
		JumlahDigunakanKg:   jumlahKg,
		Deskripsi:           "Pencatatan awal pembelian",
	}
	if err := s.logPembelianLangsungRepo.Create(tx, logPembelian); err != nil {
		return nil, fmt.Errorf("gagal membuat log pembelian langsung: %w", err)
	}

	return pembelian, nil
}

func (s *pembelianLangsungService) deletePembelianLangsungLogic(tx *gorm.DB, id uint, userID uint) error {
	// 1. Ambil data pembelian yang akan dibatalkan
	pembelian, err := s.repo.GetByIDWithTx(tx, id)
	if err != nil {
		return errors.New("pembelian tidak ditemukan")
	}

	// Validasi: Jangan batalkan jika sudah pernah dibatalkan
	if pembelian.Status == StatusDibatalkan {
		return errors.New("pembelian ini sudah pernah dibatalkan")
	}

	// 2. Logika Pengembalian Dana (jika ada pembayaran)
	if err := s.handleRefundKas(tx, id, pembelian.NilaiTerbayar, userID); err != nil {
		return err
	}

	// 3. Hapus Hutang, Biaya, dan Log terkait
	tx.Where("source_type = ? AND source_id = ?", SourcePembelianLangsung, id).Delete(&model.Hutang{})
	s.biayaOperasionalService.DeleteByPembelianLangsungID(tx, id)
	s.logStokService.DeleteLogBySource(tx, SourcePembelianLangsung, id)
	s.logPembelianLangsungRepo.DeleteByPembelianID(tx, id)

	// 4. Hitung HPP dari Sisa Stok yang akan dikembalikan
	hppSisa := pembelian.SisaKg * pembelian.HargaPerKg

	// 5. Kembalikan/kurangi stok umum HANYA SEBANYAK SISA STOK
	if err := s.stokProdukService.UpdateStokAndHpp(tx, pembelian.ProdukID, -pembelian.SisaKg, -hppSisa); err != nil {
		return fmt.Errorf("gagal mengembalikan stok umum: %w", err)
	}

	// 6. UBAH STATUS PEMBELIAN (SOFT DELETE), JANGAN DIHAPUS PERMANEN
	// Ini akan membuat record tersebut hilang dari daftar riwayat pembelian aktif di UI
	pembelian.Status = StatusDibatalkan
	// SisaKg di-nolkan karena sudah tidak relevan setelah dibatalkan
	pembelian.SisaKg = 0
	return tx.Save(pembelian).Error
}

// Helper untuk merefund uang kas ketika pembelian dibatalkan atau dihapus
func (s *pembelianLangsungService) handleRefundKas(tx *gorm.DB, pembelianID uint, nilaiTerbayar float64, userID uint) error {
	if nilaiTerbayar <= 0 {
		return nil
	}
	
	var kasAsal model.TransaksiKas
	if err := tx.Where("reference_type = ? AND reference_id = ? AND arah = ?", SourcePembelianLangsung, pembelianID, ArahKasKeluar).First(&kasAsal).Error; err == nil {
		refund := model.TransaksiKas{
			AkunKasID:   kasAsal.AkunKasID,
			Tanggal:     time.Now(),
			Arah:        ArahKasMasuk,
			Jumlah:      nilaiTerbayar,
			Memo:        fmt.Sprintf("Refund pembatalan pembelian beras ID: %d", pembelianID),
			CreatedByID: userID,
		}
		if err := tx.Create(&refund).Error; err != nil {
			return fmt.Errorf("gagal membuat transaksi refund: %w", err)
		}
		if err := tx.Model(&model.AkunKas{}).Where("id = ?", kasAsal.AkunKasID).Update("saldo", gorm.Expr("saldo + ?", nilaiTerbayar)).Error; err != nil {
			return fmt.Errorf("gagal mengembalikan saldo ke akun kas: %w", err)
		}
	}
	return nil
}

// ======================================================================
// FUNGSI PUBLIK LAINNYA (tidak berubah)
// ======================================================================

func (s *pembelianLangsungService) GetAll() ([]model.PembelianLangsung, error) {
	return s.repo.GetAll()
}

func (s *pembelianLangsungService) KonsumsiStok(tx *gorm.DB, produkID uint, jumlahDibutuhkan float64, tipePenggunaan string, referensiID *uint) error {
	log.Printf("[DEBUG] KONSUMSI STOK: Mulai konsumsi stok untuk produk ID %d, jumlah: %.2f kg", produkID, jumlahDibutuhkan)

	sisaKebutuhan := jumlahDibutuhkan
	stokTersedia, err := s.repo.GetFIFOAvailableStok(tx, produkID)
	if err != nil {
		return fmt.Errorf("gagal mengambil stok batch pembelian langsung: %w", err)
	}

	log.Printf("[DEBUG] KONSUMSI STOK: Ditemukan %d batch tersedia", len(stokTersedia))

	for i, stok := range stokTersedia {
		if sisaKebutuhan <= 0 {
			break
		}

		jumlahDiambilDariBatch := stok.SisaKg
		if jumlahDiambilDariBatch > sisaKebutuhan {
			jumlahDiambilDariBatch = sisaKebutuhan
		}

		log.Printf("[DEBUG] KONSUMSI STOK: Batch #%d (ID:%d) - Sisa: %.2f kg, Akan diambil: %.2f kg",
			i+1, stok.ID, stok.SisaKg, jumlahDiambilDariBatch)

		// ✅ PERBAIKAN: Update dengan logging yang lebih detail
		if err := s.repo.UpdateSisaDanDigunakan(tx, stok.ID, jumlahDiambilDariBatch); err != nil {
			return fmt.Errorf("gagal update sisa batch pembelian langsung #%d: %w", stok.ID, err)
		}

		// ✅ PERBAIKAN: Verifikasi update berhasil
		var updatedStok model.PembelianLangsung
		if err := tx.Where("id = ?", stok.ID).First(&updatedStok).Error; err == nil {
			log.Printf("[DEBUG] KONSUMSI STOK: Batch ID %d berhasil diupdate - Digunakan: %.2f kg, Sisa: %.2f kg",
				stok.ID, updatedStok.DigunakanKg, updatedStok.SisaKg)
		}

		deskripsiLog := fmt.Sprintf("Digunakan untuk %s", tipePenggunaan)
		if referensiID != nil {
			deskripsiLog = fmt.Sprintf("Digunakan untuk %s #%d (dari batch #%d)", tipePenggunaan, *referensiID, stok.ID)
		}

		logEntry := model.LogPembelianLangsung{
			PembelianLangsungID: stok.ID,
			Tanggal:             time.Now(),
			TipePenggunaan:      tipePenggunaan,
			JumlahDigunakanKg:   jumlahDiambilDariBatch,
			Deskripsi:           deskripsiLog,
		}

		if tipePenggunaan == TipePenggunaanPenjualan {
			logEntry.PenjualanID = referensiID
		} else if tipePenggunaan == TipePenggunaanProduksi {
			logEntry.ProduksiID = referensiID
		}

		if err := s.logPembelianLangsungRepo.Create(tx, logEntry); err != nil {
			return fmt.Errorf("gagal membuat log penggunaan batch: %w", err)
		}

		sisaKebutuhan -= jumlahDiambilDariBatch

		log.Printf("[DEBUG] KONSUMSI STOK: Sisa kebutuhan: %.2f kg", sisaKebutuhan)
	}

	if sisaKebutuhan > 0 {
		return fmt.Errorf("stok pembelian langsung tidak mencukupi. Masih dibutuhkan: %.2f kg", sisaKebutuhan)
	}

	log.Printf("[DEBUG] KONSUMSI STOK: Konsumsi berhasil diselesaikan")
	return nil
}

func (s *pembelianLangsungService) CekStok(produkID uint) (float64, error) {
	stokList, err := s.repo.GetByProdukID(produkID)
	if err != nil {
		return 0, err
	}
	var totalStok float64
	for _, stok := range stokList {
		totalStok += stok.SisaKg
	}
	return totalStok, nil
}

func (s *pembelianLangsungService) GetStokTersedia(produkID uint) ([]model.PembelianLangsung, error) {
	return s.repo.FindAvailableByProdukID(produkID)
}

func (s *pembelianLangsungService) UseStok(pembelianID uint, jumlahDigunakan float64, deskripsi string) error {
	existing, err := s.repo.GetByID(pembelianID)
	if err != nil {
		return err
	}
	if existing.SisaKg < jumlahDigunakan {
		return fmt.Errorf("stok tidak mencukupi. Tersedia: %.2f kg, diminta: %.2f kg", existing.SisaKg, jumlahDigunakan)
	}
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()
	if err := tx.Error; err != nil {
		return err
	}
	newDigunakanKg := existing.DigunakanKg + jumlahDigunakan
	newSisaKg := existing.JumlahKg - newDigunakanKg
	updateData := map[string]interface{}{"digunakan_kg": newDigunakanKg, "sisa_kg": newSisaKg}
	err = s.repo.Update(tx, pembelianID, updateData)
	if err != nil {
		tx.Rollback()
		return err
	}
	now := time.Now()
	logData := model.LogPembelianLangsung{
		PembelianLangsungID: pembelianID, Tanggal: time.Now(), TipePenggunaan: TipePenggunaanProduksi,
		JumlahDigunakanKg: jumlahDigunakan, Deskripsi: deskripsi, ProdukID: existing.ProdukID,
		JumlahKg: jumlahDigunakan, Sumber: SourcePembelianLangsung, SumberID: &pembelianID,
		TglKonsumsi: &now,
	}
	err = s.logPembelianLangsungRepo.Create(tx, logData)
	if err != nil {
		tx.Rollback()
		return err
	}
	return tx.Commit().Error
}

func (s *pembelianLangsungService) CekKetersediaanStok(produkID uint) (StokInfo, error) {
	var info StokInfo
	totalSisa, err := s.repo.GetTotalSisaStok(produkID)
	if err != nil {
		return info, err
	}
	info.SisaDariPembelianLangsung = totalSisa
	stokProduk, err := s.stokProdukService.GetByProdukID(produkID)
	if err != nil && err != gorm.ErrRecordNotFound {
		return info, err
	}
	if stokProduk != nil {
		info.SisaDariStokProduk = stokProduk.TotalStokKg
	}
	info.TotalSisaStok = info.SisaDariPembelianLangsung + info.SisaDariStokProduk
	return info, nil
}

func (s *pembelianLangsungService) GetPenggunaanLogByPenjualanID(tx *gorm.DB, penjualanID uint) ([]model.LogPembelianLangsung, error) {
	return s.logPembelianLangsungRepo.FindByPenjualanID(tx, penjualanID)
}

func (s *pembelianLangsungService) KembalikanStok(tx *gorm.DB, pembelianID uint, jumlahDikembalikan float64) error {
	return s.repo.KembalikanSisaStok(tx, pembelianID, jumlahDikembalikan)
}

func (s *pembelianLangsungService) DeletePenggunaanLogByPenjualanID(tx *gorm.DB, penjualanID uint) error {
	return s.logPembelianLangsungRepo.DeleteByPenjualanID(tx, penjualanID)
}

func (s *pembelianLangsungService) GetPembelianLangsungByID(tx *gorm.DB, id uint) (*model.PembelianLangsung, error) {
	return s.repo.GetByIDWithTx(tx, id)
}

func (s *pembelianLangsungService) GetHistory(pembelianID uint) ([]model.LogPembelianLangsung, error) {
	return s.logPembelianLangsungRepo.FindByPembelianID(pembelianID)
}

// --- 4. TAMBAHKAN FUNGSI BARU `CreateWithPayment` ---
// Fungsi ini yang akan dipanggil dari UI dan mengandung logika keuangan.
func (s *pembelianLangsungService) CreateWithPayment(input InputCreatePembelianLangsung, userID uint) (model.PembelianLangsung, error) {
	var pembelianTersimpan model.PembelianLangsung
	totalHarga := input.JumlahKg * input.HargaPerKg

	err := s.db.Transaction(func(tx *gorm.DB) error {
		nilaiBayar := input.NilaiTerbayar
		if input.StatusPembayaran == StatusLunas {
			nilaiBayar = totalHarga
		} else if input.StatusPembayaran == StatusBelumLunas {
			nilaiBayar = 0
		}

		pembelianBaru := &model.PembelianLangsung{
			ProdukID:         input.ProdukID,
			TglPembelian:     time.Now(),
			NamaPemasok:      input.NamaPemasok,
			JumlahKg:         input.JumlahKg,
			HargaPerKg:       input.HargaPerKg,
			TotalHarga:       totalHarga,
			SisaKg:           input.JumlahKg,
			Status:           StatusAktif,
			StatusPembayaran: input.StatusPembayaran,
			NilaiTerbayar:    nilaiBayar,
		}
		if err := tx.Create(pembelianBaru).Error; err != nil {
			return err
		}

		hutangBaru := model.Hutang{
			NamaPemasok:      pembelianBaru.NamaPemasok,
			TanggalTransaksi: pembelianBaru.TglPembelian,
			JatuhTempo:       pembelianBaru.TglPembelian.AddDate(0, 1, 0),
			NilaiTotal:       totalHarga,
			NilaiTerbayar:    nilaiBayar,
			SisaTagihan:      totalHarga - nilaiBayar,
			Status:           input.StatusPembayaran,
			SourceType:       SourcePembelianLangsung,
			SourceID:         pembelianBaru.ID,
		}
		if _, err := s.hutangService.CreateHutang(hutangBaru); err != nil {
			return err
		}
		if err := tx.Model(pembelianBaru).Update("hutang_id", hutangBaru.ID).Error; err != nil {
			return err
		}

		if nilaiBayar > 0 {
			if input.AkunKasID == 0 {
				return errors.New("akun kas harus dipilih")
			}

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
			if akunKas.Saldo < nilaiBayar { // ← INI YANG DIPERBAIKI (dari jumlahBayar)
				return fmt.Errorf("saldo tidak mencukupi. Saldo tersedia: Rp %.0f, dibutuhkan: Rp %.0f",
					akunKas.Saldo, nilaiBayar) // ← INI JUGA DIPERBAIKI
			}

			// Buat transaksi kas
			kas := model.TransaksiKas{
				AkunKasID:     input.AkunKasID,
				Tanggal:       pembelianBaru.TglPembelian,
				Arah:          ArahKasKeluar,
				Jumlah:        nilaiBayar,
				ReferenceType: SourcePembelianLangsung,
				ReferenceID:   pembelianBaru.ID,
				Memo:          fmt.Sprintf("Pembayaran pembelian beras dari %s", pembelianBaru.NamaPemasok),
				CreatedByID:   userID,
			}
			if err := tx.Create(&kas).Error; err != nil {
				return err
			}

			// Update saldo kas
			if err := tx.Model(&model.AkunKas{}).
				Where("id = ?", input.AkunKasID).
				Update("saldo", gorm.Expr("saldo - ?", nilaiBayar)).Error; err != nil {
				return err
			}
		}

		if err := s.stokProdukService.UpdateStokAndHpp(tx, input.ProdukID, input.JumlahKg, totalHarga); err != nil {
			return err
		}

		produk, err := s.produkRepo.GetByIdWithoutPreload(input.ProdukID)
		if err != nil {
			return fmt.Errorf("produk tidak ditemukan: %v", err)
		}

		logStok := model.LogStokProduk{
			ProdukID:            input.ProdukID,
			JumlahKg:            input.JumlahKg,
			Deskripsi:           fmt.Sprintf("Pembelian %s dari %s (ID: %d)", produk.NamaProduk, input.NamaPemasok, pembelianBaru.ID),
			PembelianLangsungID: &pembelianBaru.ID,
		}
		if err := s.logStokService.CatatStokMasuk(tx, logStok); err != nil {
			return err
		}

		biaya := model.BiayaOperasional{
			Tanggal:             pembelianBaru.TglPembelian,
			Kategori:            "PEMBELIAN_BAHAN",
			Deskripsi:           fmt.Sprintf("Pembelian Beras %s dari %s (ID: %d)", produk.NamaProduk, pembelianBaru.NamaPemasok, pembelianBaru.ID),
			Jumlah:              totalHarga,
			PembelianLangsungID: &pembelianBaru.ID,
		}
		if err := tx.Create(&biaya).Error; err != nil {
			return fmt.Errorf("gagal mencatat biaya: %w", err)
		}

		pembelianTersimpan = *pembelianBaru
		return nil
	})
	return pembelianTersimpan, err
}

// --- 5. TAMBAHKAN FUNGSI BARU `CancelPembelian` ---

// GANTI FUNGSI INI SECARA KESELURUHAN
// Ganti seluruh fungsi ini di internal/service/pembelian_langsung_service.go
func (s *pembelianLangsungService) CancelPembelian(id uint, userID uint) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		// 1. Ambil data pembelian yang akan dibatalkan
		pembelian, err := s.repo.GetByIDWithTx(tx, id)
		if err != nil {
			return errors.New("pembelian tidak ditemukan")
		}
		if pembelian.Status == StatusDibatalkan {
			return errors.New("pembelian ini sudah pernah dibatalkan")
		}

		// --- BAGIAN REFUND JIKA SUDAH ADA PEMBAYARAN ---
		if err := s.handleRefundKas(tx, id, pembelian.NilaiTerbayar, userID); err != nil {
			return err
		}

		// --- LOGIKA UTAMA PERBAIKAN STOK ---
		// 2. Hitung HPP dari sisa stok yang akan dihapus
		hppSisa := pembelian.SisaKg * pembelian.HargaPerKg

		// 3. Kurangi stok umum HANYA SEBANYAK SISA KG
		if err := s.stokProdukService.UpdateStokAndHpp(tx, pembelian.ProdukID, -pembelian.SisaKg, -hppSisa); err != nil {
			return err
		}

		// 4. Hapus log-log terkait
		s.logStokService.DeleteLogBySource(tx, SourcePembelianLangsung, id)
		s.biayaOperasionalService.DeleteByPembelianLangsungID(tx, id)
		tx.Where("source_type = ? AND source_id = ?", SourcePembelianLangsung, id).Delete(&model.Hutang{})

		// 5. UPDATE status menjadi "DIBATALKAN" (Soft Delete)
		return tx.Model(&model.PembelianLangsung{}).Where("id = ?", id).Update("status", StatusDibatalkan).Error
	})
}
