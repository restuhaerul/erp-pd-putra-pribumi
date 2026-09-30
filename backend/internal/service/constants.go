package service

const (
	// Status Pembayaran & Transaksi
	StatusAktif      = "AKTIF"
	StatusDibatalkan = "DIBATALKAN"
	StatusLunas      = "LUNAS"
	StatusBelumLunas = "BELUM_LUNAS"

	// Tipe Produk
	TipeProdukSampingan = "PRODUK_SAMPINGAN"
	TipeProdukJadi      = "PRODUK_JADI"
	TipeProdukBahan     = "BAHAN_MENTAH"

	// Source Type / Reference Type
	SourceTransaksiPenjualan = "TRANSAKSI_PENJUALAN"
	SourcePembelianLangsung  = "PEMBELIAN_LANGSUNG"
	SourceBatchProduksi      = "BATCH_PRODUKSI"
	SourceJasaGiling         = "JASA_GILING"

	// Arah Kas
	ArahKasMasuk  = "IN"
	ArahKasKeluar = "OUT"

	// Tipe Penggunaan Log
	TipePenggunaanBeliAwal  = "PEMBELIAN_AWAL"
	TipePenggunaanProduksi  = "PRODUKSI"
	TipePenggunaanPenjualan = "PENJUALAN"
)
