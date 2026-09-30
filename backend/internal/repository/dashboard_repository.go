package repository

import (
	"fmt"
	"putra-pribumi/internal/model"
	"time"

	"gorm.io/gorm"
)

// Struct yang sudah ada
type RingkasanHarian struct {
	TotalPenjualan float64
	TotalTransaksi int64
	TotalLaba      float64
}

type RingkasanStok struct {
	TipeProduk string
	TotalStok  float64
}

type AktivitasTerbaru struct {
	Timestamp time.Time `json:"timestamp"`
	Tipe      string    `json:"tipe"` // PENJUALAN, PEMBELIAN, PRODUKSI
	Deskripsi string    `json:"deskripsi"`
	LinkID    uint      `json:"link_id"`
}

// Struct tambahan baru
type PerbandinganMingguan struct {
	PenjualanMingguIni  float64 `json:"penjualan_minggu_ini"`
	PenjualanMingguLalu float64 `json:"penjualan_minggu_lalu"`
	LabaMingguIni       float64 `json:"laba_minggu_ini"`
	LabaMingguLalu      float64 `json:"laba_minggu_lalu"`
	PersentasePenjualan float64 `json:"persentase_penjualan"`
	PersentaseLaba      float64 `json:"persentase_laba"`
}

type PergerakanStok struct {
	Tanggal    time.Time `json:"tanggal"`
	NamaProduk string    `json:"nama_produk"`
	TipeAksi   string    `json:"tipe_aksi"` // IN, OUT
	Jumlah     float64   `json:"jumlah"`
	StokAkhir  float64   `json:"stok_akhir"`
	Keterangan string    `json:"keterangan"`
}

type AktivitasUser struct {
	Timestamp time.Time `json:"timestamp"`
	NamaUser  string    `json:"nama_user"`
	Aktivitas string    `json:"aktivitas"`
	Detail    string    `json:"detail"`
	IPAddress string    `json:"ip_address,omitempty"`
}

type TargetHarian struct {
	TargetPenjualan     float64 `json:"target_penjualan"`
	RealisasiPenjualan  float64 `json:"realisasi_penjualan"`
	PersentaseRealisasi float64 `json:"persentase_realisasi"`
	TargetProduksi      float64 `json:"target_produksi"`
	RealisasiProduksi   float64 `json:"realisasi_produksi"`
	PersentaseProduksi  float64 `json:"persentase_produksi"`
}

type ReminderUrgent struct {
	ID        uint      `json:"id"`
	Tipe      string    `json:"tipe"` // STOK_HABIS, MAINTENANCE, PEMBAYARAN
	Judul     string    `json:"judul"`
	Deskripsi string    `json:"deskripsi"`
	Prioritas string    `json:"prioritas"` // HIGH, MEDIUM, LOW
	Deadline  time.Time `json:"deadline"`
	Status    string    `json:"status"`
}

type StatistikBulanan struct {
	TotalPenjualanBulan      float64 `json:"total_penjualan_bulan"`
	TotalLabaBulan           float64 `json:"total_laba_bulan"`
	TotalTransaksiBulan      int64   `json:"total_transaksi_bulan"`
	RataRataPenjualan        float64 `json:"rata_rata_penjualan"`
	PeningkatanDariBulanLalu float64 `json:"peningkatan_dari_bulan_lalu"`
}

type TopProduk struct {
	NamaProduk      string  `json:"nama_produk"`
	TotalTerjual    float64 `json:"total_terjual"`
	TotalPendapatan float64 `json:"total_pendapatan"`
	Persentase      float64 `json:"persentase"`
}

type RepositoryDashboard interface {
	// Method yang sudah ada
	GetRingkasanHarian(date time.Time) (RingkasanHarian, error)
	GetRingkasanStok() ([]RingkasanStok, error)
	GetAktivitasTerbaru(limit int) ([]AktivitasTerbaru, error)

	// Method tambahan baru
	GetPerbandinganMingguan(date time.Time) (PerbandinganMingguan, error)
	GetPergerakanStok(days int) ([]PergerakanStok, error)
	GetAktivitasUser(limit int) ([]AktivitasUser, error)
	GetTargetHarian(date time.Time) (TargetHarian, error)
	GetReminderUrgent() ([]ReminderUrgent, error)
	GetStatistikBulanan(date time.Time) (StatistikBulanan, error)
	GetTopProduk(limit int) ([]TopProduk, error)
}

type dashboardRepository struct {
	db *gorm.DB
}

func NewDashboardRepository(db *gorm.DB) *dashboardRepository {
	return &dashboardRepository{db}
}

// Method yang sudah ada
func (r *dashboardRepository) GetRingkasanHarian(date time.Time) (RingkasanHarian, error) {
	var ringkasan RingkasanHarian
	startOfDay := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	endOfDay := time.Date(date.Year(), date.Month(), date.Day(), 23, 59, 59, 0, date.Location())

	err := r.db.Model(&model.TransaksiPenjualan{}).
		Where("tgl_transaksi BETWEEN ? AND ?", startOfDay, endOfDay).
		Select("COALESCE(SUM(jumlah_kg * harga_jual_per_kg), 0) as total_penjualan, COUNT(id) as total_transaksi, COALESCE(SUM(laba), 0) as total_laba").
		Row().Scan(&ringkasan.TotalPenjualan, &ringkasan.TotalTransaksi, &ringkasan.TotalLaba)

	return ringkasan, err
}

func (r *dashboardRepository) GetRingkasanStok() ([]RingkasanStok, error) {
	var ringkasan []RingkasanStok
	err := r.db.Model(&model.StokProduk{}).
		Joins("JOIN produk ON produk.id = stok_produk.produk_id").
		Where("produk.tipe_produk IN (?, ?)", "PRODUK_JADI", "BAHAN_MENTAH").
		Group("produk.tipe_produk").
		Select("produk.tipe_produk, SUM(stok_produk.total_stok_kg) as total_stok").
		Scan(&ringkasan).Error
	return ringkasan, err
}

func (r *dashboardRepository) GetAktivitasTerbaru(limit int) ([]AktivitasTerbaru, error) {
	var aktivitas []AktivitasTerbaru

	query := `
		(SELECT tgl_transaksi as timestamp, 'PENJUALAN' as tipe, CONCAT('Penjualan ', p.nama_produk, ' kepada ', tp.nama_pelanggan) as deskripsi, tp.id as link_id
		FROM transaksi_penjualan tp JOIN produk p ON tp.produk_id = p.id
		ORDER BY tp.tgl_transaksi DESC LIMIT ?)
		UNION ALL
		(SELECT tgl_pembelian as timestamp, 'PEMBELIAN' as tipe, CONCAT('Pembelian ', p.nama_produk, ' dari ', bp.nama_pemasok) as deskripsi, bp.id as link_id
		FROM batch_pembelian bp JOIN produk p ON bp.produk_id = p.id
		ORDER BY bp.tgl_pembelian DESC LIMIT ?)
		UNION ALL
		(SELECT tgl_produksi as timestamp, 'PRODUKSI' as tipe, CONCAT('Produksi ', p.nama_produk, ' sebanyak ', bpr.jumlah_produksi_kg, ' Kg') as deskripsi, bpr.id as link_id
		FROM batch_produksi bpr JOIN produk p ON bpr.produk_id = p.id
		ORDER BY bpr.tgl_produksi DESC LIMIT ?)
		ORDER BY timestamp DESC
		LIMIT ?
	`
	err := r.db.Raw(query, limit, limit, limit, limit).Scan(&aktivitas).Error
	return aktivitas, err
}

// Method tambahan baru
func (r *dashboardRepository) GetPerbandinganMingguan(date time.Time) (PerbandinganMingguan, error) {
	var perbandingan PerbandinganMingguan

	// Minggu ini (Senin sampai hari ini)
	startOfWeek := date.AddDate(0, 0, -int(date.Weekday()-1))
	startOfWeek = time.Date(startOfWeek.Year(), startOfWeek.Month(), startOfWeek.Day(), 0, 0, 0, 0, startOfWeek.Location())

	// Minggu lalu
	startOfLastWeek := startOfWeek.AddDate(0, 0, -7)
	endOfLastWeek := startOfWeek.AddDate(0, 0, -1)
	endOfLastWeek = time.Date(endOfLastWeek.Year(), endOfLastWeek.Month(), endOfLastWeek.Day(), 23, 59, 59, 0, endOfLastWeek.Location())

	// Query minggu ini
	err := r.db.Model(&model.TransaksiPenjualan{}).
		Where("tgl_transaksi BETWEEN ? AND ?", startOfWeek, date).
		Select("COALESCE(SUM(jumlah_kg * harga_jual_per_kg), 0) as penjualan_minggu_ini, COALESCE(SUM(laba), 0) as laba_minggu_ini").
		Row().Scan(&perbandingan.PenjualanMingguIni, &perbandingan.LabaMingguIni)

	if err != nil {
		return perbandingan, err
	}

	// Query minggu lalu
	err = r.db.Model(&model.TransaksiPenjualan{}).
		Where("tgl_transaksi BETWEEN ? AND ?", startOfLastWeek, endOfLastWeek).
		Select("COALESCE(SUM(jumlah_kg * harga_jual_per_kg), 0) as penjualan_minggu_lalu, COALESCE(SUM(laba), 0) as laba_minggu_lalu").
		Row().Scan(&perbandingan.PenjualanMingguLalu, &perbandingan.LabaMingguLalu)

	// Hitung persentase
	if perbandingan.PenjualanMingguLalu > 0 {
		perbandingan.PersentasePenjualan = ((perbandingan.PenjualanMingguIni - perbandingan.PenjualanMingguLalu) / perbandingan.PenjualanMingguLalu) * 100
	}
	if perbandingan.LabaMingguLalu > 0 {
		perbandingan.PersentaseLaba = ((perbandingan.LabaMingguIni - perbandingan.LabaMingguLalu) / perbandingan.LabaMingguLalu) * 100
	}

	return perbandingan, err
}

func (r *dashboardRepository) GetPergerakanStok(days int) ([]PergerakanStok, error) {
	var pergerakan []PergerakanStok
	since := time.Now().AddDate(0, 0, -days)

	// ✅ FIXED: Changed 'created_at' to 'tgl_pembelian'
	query := `
		SELECT DATE(tgl_pembelian) as tanggal, p.nama_produk, 'IN' as tipe_aksi, 
			   jumlah_kg as jumlah, 0 as stok_akhir, 'Pembelian dari supplier' as keterangan
		FROM batch_pembelian bp 
		JOIN produk p ON bp.produk_id = p.id
		WHERE bp.tgl_pembelian >= ?
		UNION ALL
		SELECT DATE(tgl_transaksi) as tanggal, p.nama_produk, 'OUT' as tipe_aksi,
			   jumlah_kg as jumlah, 0 as stok_akhir, CONCAT('Penjualan kepada ', nama_pelanggan) as keterangan
		FROM transaksi_penjualan tp
		JOIN produk p ON tp.produk_id = p.id
		WHERE tp.tgl_transaksi >= ?
		ORDER BY tanggal DESC, tipe_aksi
		LIMIT 20
	`
	err := r.db.Raw(query, since, since).Scan(&pergerakan).Error
	return pergerakan, err
}

func (r *dashboardRepository) GetAktivitasUser(limit int) ([]AktivitasUser, error) {
	var aktivitas []AktivitasUser

	// ✅ FIXED: Changed query to use the actual activity log table and columns
	query := `
		SELECT ual.timestamp, u.full_name as nama_user, 
			   ual.action as aktivitas, ual.description as detail, ual.ip_address
		FROM user_activity_log ual
		JOIN user u ON ual.user_id = u.id
		ORDER BY ual.timestamp DESC 
		LIMIT ?
	`
	err := r.db.Raw(query, limit).Scan(&aktivitas).Error
	return aktivitas, err
}

func (r *dashboardRepository) GetTargetHarian(date time.Time) (TargetHarian, error) {
	var target TargetHarian
	startOfDay := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	endOfDay := time.Date(date.Year(), date.Month(), date.Day(), 23, 59, 59, 0, date.Location())

	// Set target harian (bisa dari tabel konfigurasi)
	target.TargetPenjualan = 10000000 // 10 juta rupiah
	target.TargetProduksi = 1000      // 1000 kg

	// Ambil realisasi
	err := r.db.Model(&model.TransaksiPenjualan{}).
		Where("tgl_transaksi BETWEEN ? AND ?", startOfDay, endOfDay).
		Select("COALESCE(SUM(jumlah_kg * harga_jual_per_kg), 0)").
		Row().Scan(&target.RealisasiPenjualan)

	if err == nil && target.TargetPenjualan > 0 {
		target.PersentaseRealisasi = (target.RealisasiPenjualan / target.TargetPenjualan) * 100
	}

	// Realisasi produksi
	err = r.db.Model(&model.BatchProduksi{}).
		Where("tgl_produksi BETWEEN ? AND ?", startOfDay, endOfDay).
		Select("COALESCE(SUM(jumlah_produksi_kg), 0)").
		Row().Scan(&target.RealisasiProduksi)

	if target.TargetProduksi > 0 {
		target.PersentaseProduksi = (target.RealisasiProduksi / target.TargetProduksi) * 100
	}

	return target, err
}

func (r *dashboardRepository) GetReminderUrgent() ([]ReminderUrgent, error) {
	var reminders []ReminderUrgent

	// Cek stok rendah
	var stokRendah []struct {
		NamaProduk string
		TotalStok  float64
	}

	err := r.db.Model(&model.StokProduk{}).
		Joins("JOIN produk ON produk.id = stok_produk.produk_id").
		Where("stok_produk.total_stok_kg < 100"). // Ambang batas 100kg
		Select("produk.nama_produk, stok_produk.total_stok_kg").
		Scan(&stokRendah).Error

	for i, stok := range stokRendah {
		reminders = append(reminders, ReminderUrgent{
			ID:        uint(i + 1),
			Tipe:      "STOK_HABIS",
			Judul:     "Stok Rendah",
			Deskripsi: fmt.Sprintf("Stok %s tersisa %.1f kg", stok.NamaProduk, stok.TotalStok),
			Prioritas: "HIGH",
			Status:    "ACTIVE",
		})
	}

	return reminders, err
}

func (r *dashboardRepository) GetStatistikBulanan(date time.Time) (StatistikBulanan, error) {
	var stats StatistikBulanan
	startOfMonth := time.Date(date.Year(), date.Month(), 1, 0, 0, 0, 0, date.Location())

	err := r.db.Model(&model.TransaksiPenjualan{}).
		Where("tgl_transaksi >= ?", startOfMonth).
		Select("COALESCE(SUM(jumlah_kg * harga_jual_per_kg), 0) as total_penjualan_bulan, "+
			"COALESCE(SUM(laba), 0) as total_laba_bulan, "+
			"COUNT(id) as total_transaksi_bulan").
		Row().Scan(&stats.TotalPenjualanBulan, &stats.TotalLabaBulan, &stats.TotalTransaksiBulan)

	// Hitung rata-rata per hari
	daysInMonth := time.Now().Day()
	if daysInMonth > 0 {
		stats.RataRataPenjualan = stats.TotalPenjualanBulan / float64(daysInMonth)
	}

	return stats, err
}

func (r *dashboardRepository) GetTopProduk(limit int) ([]TopProduk, error) {
	var topProduk []TopProduk

	// Ambil dalam 30 hari terakhir
	since := time.Now().AddDate(0, 0, -30)

	err := r.db.Model(&model.TransaksiPenjualan{}).
		Joins("JOIN produk ON produk.id = transaksi_penjualan.produk_id").
		Where("transaksi_penjualan.tgl_transaksi >= ?", since).
		Group("produk.id, produk.nama_produk").
		Select("produk.nama_produk, " +
			"SUM(transaksi_penjualan.jumlah_kg) as total_terjual, " +
			"SUM(transaksi_penjualan.jumlah_kg * transaksi_penjualan.harga_jual_per_kg) as total_pendapatan").
		Order("total_pendapatan DESC").
		Limit(limit).
		Scan(&topProduk).Error

	// Hitung persentase (opsional, berdasarkan total keseluruhan)
	var totalKeseluruhan float64
	for _, produk := range topProduk {
		totalKeseluruhan += produk.TotalPendapatan
	}

	for i := range topProduk {
		if totalKeseluruhan > 0 {
			topProduk[i].Persentase = (topProduk[i].TotalPendapatan / totalKeseluruhan) * 100
		}
	}

	return topProduk, err
}
