// backend_extracted/internal/repository/pembelian_langsung_repository.go
package repository

import (
	"fmt"
	"log"
	"putra-pribumi/internal/model"

	"gorm.io/gorm"
)

// PERBAIKAN: Melengkapi interface dengan semua method yang dibutuhkan
type RepositoryPembelianLangsung interface {
	Create(pembelian *model.PembelianLangsung) error
	GetByID(id uint) (*model.PembelianLangsung, error)
	GetAll() ([]model.PembelianLangsung, error)
	Update(tx *gorm.DB, id uint, updates map[string]interface{}) error
	Delete(tx *gorm.DB, id uint) error
	GetByProdukID(produkID uint) ([]model.PembelianLangsung, error)

	// Method yang sudah ada sebelumnya
	Save(pembelian model.PembelianLangsung) (model.PembelianLangsung, error)
	FindAll() ([]model.PembelianLangsung, error)
	FindByID(id uint) (model.PembelianLangsung, error)
	FindByIDWithProduk(id uint) (model.PembelianLangsung, error)
	GetFIFOAvailableStok(tx *gorm.DB, produkID uint) ([]model.PembelianLangsung, error)
	UpdateSisaDanDigunakan(tx *gorm.DB, id uint, jumlahDigunakan float64) error
	GetTotalSisaStok(produkID uint) (float64, error)
	FindAvailableByProdukID(produkID uint) ([]model.PembelianLangsung, error)
	// --- METHOD BARU DARI PERBAIKAN SEBELUMNYA ---
	KembalikanSisaStok(tx *gorm.DB, id uint, jumlahDikembalikan float64) error

	// ✅ TAMBAHKAN METHOD INI KE DALAM INTERFACE
	GetByIDWithTx(tx *gorm.DB, id uint) (*model.PembelianLangsung, error)
}

type pembelianLangsungRepository struct {
	db *gorm.DB
}

func NewPembelianLangsungRepository(db *gorm.DB) *pembelianLangsungRepository {
	return &pembelianLangsungRepository{db}
}

// TAMBAHAN: Implementasi method Create
func (r *pembelianLangsungRepository) Create(pembelian *model.PembelianLangsung) error {
	return r.db.Create(pembelian).Error
}

// TAMBAHAN: Implementasi method GetByID
func (r *pembelianLangsungRepository) GetByID(id uint) (*model.PembelianLangsung, error) {
	var pembelian model.PembelianLangsung
	if err := r.db.Preload("Produk").First(&pembelian, id).Error; err != nil {
		return nil, err
	}
	return &pembelian, nil
}

// TAMBAHAN: Implementasi method GetAll
func (r *pembelianLangsungRepository) GetAll() ([]model.PembelianLangsung, error) {
	log.Println("==> [REPO] Akan menjalankan query GORM untuk semua pembelian langsung...")
	var pembelianList []model.PembelianLangsung
	// --- MODIFIKASI DI SINI ---
	// Ditambahkan .Where("status = ?", "AKTIF") untuk hanya mengambil data yang tidak dibatalkan.
	err := r.db.Preload("Produk").Where("status = ?", "AKTIF").Order("tgl_pembelian DESC").Find(&pembelianList).Error
	if err != nil {
		log.Println("==> [REPO] Query GORM GAGAL dengan error:", err)
		return nil, err
	}
	log.Printf("==> [REPO] Query GORM SELESAI, ditemukan %d data.", len(pembelianList))
	return pembelianList, nil
}

// TAMBAHAN: Implementasi method Update
func (r *pembelianLangsungRepository) Update(tx *gorm.DB, id uint, updates map[string]interface{}) error {
	return tx.Model(&model.PembelianLangsung{}).Where("id = ?", id).Updates(updates).Error
}

// TAMBAHAN: Implementasi method Delete
func (r *pembelianLangsungRepository) Delete(tx *gorm.DB, id uint) error {
	return tx.Delete(&model.PembelianLangsung{}, id).Error
}

// TAMBAHAN: Implementasi method GetByProdukID
func (r *pembelianLangsungRepository) GetByProdukID(produkID uint) ([]model.PembelianLangsung, error) {
	var pembelianList []model.PembelianLangsung
	err := r.db.Preload("Produk").Where("produk_id = ?", produkID).Order("tgl_pembelian ASC").Find(&pembelianList).Error
	return pembelianList, err
}

// Method yang sudah ada (dipertahankan untuk kompatibilitas jika masih ada yang memanggil)
func (r *pembelianLangsungRepository) Save(pembelian model.PembelianLangsung) (model.PembelianLangsung, error) {
	if pembelian.ID == 0 {
		pembelian.SisaKg = pembelian.JumlahKg
		pembelian.DigunakanKg = 0
	}
	err := r.db.Create(&pembelian).Error
	return pembelian, err
}

func (r *pembelianLangsungRepository) FindAll() ([]model.PembelianLangsung, error) {
	var daftarPembelian []model.PembelianLangsung
	// --- MODIFIKASI DI SINI JUGA ---
	// Ditambahkan .Where("status = ?", "AKTIF") untuk konsistensi.
	err := r.db.Preload("Produk").Where("status = ?", "AKTIF").Order("id desc").Find(&daftarPembelian).Error
	for i := range daftarPembelian {
		daftarPembelian[i].IsTerpakai = daftarPembelian[i].DigunakanKg > 0
	}
	return daftarPembelian, err
}

func (r *pembelianLangsungRepository) FindByID(id uint) (model.PembelianLangsung, error) {
	var pembelian model.PembelianLangsung
	err := r.db.Preload("Produk").Where("id = ?", id).First(&pembelian).Error
	pembelian.IsTerpakai = pembelian.DigunakanKg > 0
	return pembelian, err
}

func (r *pembelianLangsungRepository) FindByIDWithProduk(id uint) (model.PembelianLangsung, error) {
	var pembelian model.PembelianLangsung
	err := r.db.Preload("Produk").Where("id = ?", id).First(&pembelian).Error
	pembelian.IsTerpakai = pembelian.DigunakanKg > 0
	return pembelian, err
}

// Tambahkan/perbarui method ini di repository pembelian_langsung
func (r *pembelianLangsungRepository) GetFIFOAvailableStok(tx *gorm.DB, produkID uint) ([]model.PembelianLangsung, error) {
	var stokList []model.PembelianLangsung

	// Debug: Cari semua record untuk produk ini
	var allRecords []model.PembelianLangsung
	tx.Where("produk_id = ?", produkID).Find(&allRecords)
	log.Printf("[DEBUG FIFO] Total records untuk produk ID %d: %d", produkID, len(allRecords))

	for i, record := range allRecords {
		log.Printf("[DEBUG FIFO] Record #%d: ID=%d, Status=%s, SisaKg=%.2f",
			i+1, record.ID, record.Status, record.SisaKg)
	}

	// Query yang benar untuk FIFO
	err := tx.Where("produk_id = ? AND status = 'AKTIF' AND sisa_kg > 0", produkID).
		Order("tgl_pembelian ASC").
		Find(&stokList).Error

	if err != nil {
		return nil, fmt.Errorf("gagal query FIFO stok: %w", err)
	}

	log.Printf("[DEBUG FIFO] Available stok untuk produk ID %d: %d records", produkID, len(stokList))
	for i, stok := range stokList {
		log.Printf("[DEBUG FIFO] Available #%d: ID=%d, SisaKg=%.2f, TglPembelian=%s",
			i+1, stok.ID, stok.SisaKg, stok.TglPembelian.Format("2006-01-02"))
	}

	return stokList, nil
}

// Tambahkan di repository pembelian_langsung
func (r *pembelianLangsungRepository) UpdateSisaDanDigunakan(tx *gorm.DB, id uint, jumlahDigunakan float64) error {
	// Debug: Log sebelum update
	var before model.PembelianLangsung
	if err := tx.Where("id = ?", id).First(&before).Error; err != nil {
		return fmt.Errorf("gagal ambil data sebelum update: %w", err)
	}

	log.Printf("[DEBUG REPO] BEFORE UPDATE ID %d: digunakan_kg=%.2f, sisa_kg=%.2f",
		id, before.DigunakanKg, before.SisaKg)

	// Hitung nilai baru
	newDigunakanKg := before.DigunakanKg + jumlahDigunakan
	newSisaKg := before.SisaKg - jumlahDigunakan

	log.Printf("[DEBUG REPO] WILL UPDATE TO: digunakan_kg=%.2f, sisa_kg=%.2f",
		newDigunakanKg, newSisaKg)

	// Lakukan update
	result := tx.Model(&model.PembelianLangsung{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"digunakan_kg": newDigunakanKg,
			"sisa_kg":      newSisaKg,
		})

	if result.Error != nil {
		return fmt.Errorf("gagal update database: %w", result.Error)
	}

	log.Printf("[DEBUG REPO] ROWS AFFECTED: %d", result.RowsAffected)

	if result.RowsAffected == 0 {
		return fmt.Errorf("tidak ada row yang diupdate, kemungkinan ID %d tidak ditemukan", id)
	}

	// Verifikasi update berhasil
	var after model.PembelianLangsung
	if err := tx.Where("id = ?", id).First(&after).Error; err != nil {
		return fmt.Errorf("gagal verifikasi setelah update: %w", err)
	}

	log.Printf("[DEBUG REPO] AFTER UPDATE ID %d: digunakan_kg=%.2f, sisa_kg=%.2f",
		id, after.DigunakanKg, after.SisaKg)

	return nil
}

func (r *pembelianLangsungRepository) GetTotalSisaStok(produkID uint) (float64, error) {
	var total float64
	err := r.db.Model(&model.PembelianLangsung{}).
		Where("produk_id = ?", produkID).
		Select("COALESCE(SUM(sisa_kg), 0)").
		Scan(&total).Error
	return total, err
}

func (r *pembelianLangsungRepository) FindAvailableByProdukID(produkID uint) ([]model.PembelianLangsung, error) {
	var daftarPembelian []model.PembelianLangsung
	err := r.db.Preload("Produk").
		Where("produk_id = ? AND sisa_kg > 0", produkID).
		Order("tgl_pembelian ASC").
		Find(&daftarPembelian).Error

	for i := range daftarPembelian {
		daftarPembelian[i].IsTerpakai = daftarPembelian[i].DigunakanKg > 0
	}
	return daftarPembelian, err
}

// --- IMPLEMENTASI FUNGSI BARU ---
func (r *pembelianLangsungRepository) KembalikanSisaStok(tx *gorm.DB, id uint, jumlahDikembalikan float64) error {
	// Logika ini akan menambah kembali sisa_kg dan mengurangi digunakan_kg
	return tx.Model(&model.PembelianLangsung{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"sisa_kg":      gorm.Expr("sisa_kg + ?", jumlahDikembalikan),
			"digunakan_kg": gorm.Expr("digunakan_kg - ?", jumlahDikembalikan),
		}).Error
}

func (r *pembelianLangsungRepository) GetByIDWithTx(tx *gorm.DB, id uint) (*model.PembelianLangsung, error) {
	var pembelian model.PembelianLangsung
	if err := tx.First(&pembelian, id).Error; err != nil {
		return nil, err
	}
	return &pembelian, nil
}
