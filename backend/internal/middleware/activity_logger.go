// middleware/activity_logger.go
package middleware

import (
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"putra-pribumi/internal/model"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func ActivityLogger(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		path := c.Request.URL.Path
		method := c.Request.Method

		// Lanjutkan proses request
		c.Next()

		// Cek user login
		userID, exists := c.Get("user_id")
		if !exists {
			return
		}
		fullName, _ := c.Get("full_name")

		// Mapping action dari method
		action := map[string]string{
			http.MethodPost:   "CREATE",
			http.MethodPut:    "UPDATE",
			http.MethodPatch:  "UPDATE",
			http.MethodDelete: "DELETE",
		}[method]
		if action == "" {
			return
		}

		// Deteksi modul dari URL path
		module := getModuleNameFromPath(path)

		// Ambil record_id dari context
		var recordID *uint
		if id, ok := c.Get("record_id"); ok {
			if rid, ok := id.(uint); ok {
				recordID = &rid
				log.Printf("DEBUG: Found record_id = %d for module %s action %s", *recordID, module, action)
			}
		} else {
			log.Printf("DEBUG: No record_id found for module %s action %s", module, action)
		}

		// Bangun deskripsi detail berdasarkan modul
		description := buildDetailedDescription(db, fullName.(string), module, action, recordID, path)

		log.Printf("DEBUG: Final description = %s", description)

		// Simpan log aktivitas
		db.Create(&model.UserActivityLog{
			UserID:      userID.(uint),
			Action:      action,
			Module:      module,
			RecordID:    recordID,
			Description: description,
			IPAddress:   c.ClientIP(),
			Timestamp:   time.Now(),
		})
	}
}

// buildDetailedDescription membangun deskripsi detail berdasarkan modul dan aksi
func buildDetailedDescription(db *gorm.DB, fullName, module, action string, recordID *uint, path string) string {
	baseDesc := fullName

	switch module {
	case "PENJUALAN":
		return buildPenjualanDescription(db, baseDesc, action, recordID)
	case "PRODUKSI":
		return buildProduksiDescription(db, baseDesc, action, recordID)
	case "PEMBELIAN":
		return buildPembelianDescription(db, baseDesc, action, recordID)
	case "PRODUK":
		return buildProdukDescription(db, baseDesc, action, recordID)
	case "PROFILE":
		return buildProfileDescription(baseDesc, action)
	case "KARUNG":
		return buildKarungDescription(db, baseDesc, action, recordID)
	default:
		return buildDefaultDescription(baseDesc, module, action, recordID)
	}
}

// buildPenjualanDescription untuk modul penjualan
func buildPenjualanDescription(db *gorm.DB, baseDesc, action string, recordID *uint) string {
	if recordID == nil {
		log.Printf("DEBUG: No recordID for penjualan, returning generic description")
		return baseDesc + " " + getActionText(action, "penjualan")
	}

	var penjualan model.TransaksiPenjualan

	// Query dengan debugging
	query := db.Preload("Produk").Preload("BatchProduksi.Produk").First(&penjualan, *recordID)
	if query.Error != nil {
		log.Printf("DEBUG: Error querying penjualan ID %d: %v", *recordID, query.Error)
		return baseDesc + " " + getActionText(action, "penjualan") + " (ID: " + formatID(*recordID) + ")"
	}

	// Log data yang ditemukan
	log.Printf("DEBUG: Found penjualan - ProdukID: %d, BatchProduksiID: %v, JumlahKg: %.1f, NamaPelanggan: %s",
		penjualan.ProdukID, penjualan.BatchProduksiID, penjualan.JumlahKg, penjualan.NamaPelanggan)

	// Tentukan nama produk berdasarkan jenis penjualan
	var namaProduk string
	if penjualan.BatchProduksiID != nil && penjualan.BatchProduksi != nil {
		namaProduk = penjualan.BatchProduksi.Produk.NamaProduk
		log.Printf("DEBUG: Using BatchProduksi.Produk.NamaProduk: %s", namaProduk)
	} else if penjualan.Produk.NamaProduk != "" {
		namaProduk = penjualan.Produk.NamaProduk
		log.Printf("DEBUG: Using Produk.NamaProduk: %s", namaProduk)
	} else {
		namaProduk = "Produk Tidak Diketahui"
		log.Printf("DEBUG: No product name found, using default")
	}

	detail := fmt.Sprintf("%s %s", namaProduk, formatKg(penjualan.JumlahKg))
	log.Printf("DEBUG: Built detail: %s", detail)

	switch action {
	case "CREATE":
		if penjualan.NamaPelanggan != "" {
			return baseDesc + " menjual " + detail + " kepada " + penjualan.NamaPelanggan
		}
		return baseDesc + " menjual " + detail
	case "UPDATE":
		return baseDesc + " mengubah penjualan " + detail
	case "DELETE":
		return baseDesc + " menghapus penjualan " + detail
	}
	return baseDesc + " " + getActionText(action, "penjualan") + " " + detail
}

// buildProduksiDescription untuk modul produksi
func buildProduksiDescription(db *gorm.DB, baseDesc, action string, recordID *uint) string {
	if recordID == nil {
		return baseDesc + " " + getActionText(action, "produksi")
	}

	var produksi model.BatchProduksi
	if err := db.Preload("Produk").First(&produksi, *recordID).Error; err != nil {
		log.Printf("DEBUG: Error querying produksi ID %d: %v", *recordID, err)
		return baseDesc + " " + getActionText(action, "produksi") + " (ID: " + formatID(*recordID) + ")"
	}

	detail := fmt.Sprintf("%s %s", produksi.Produk.NamaProduk, formatKg(produksi.JumlahProduksiKg))

	switch action {
	case "CREATE":
		return baseDesc + " menambahkan produksi " + detail
	case "UPDATE":
		return baseDesc + " mengubah produksi " + detail
	case "DELETE":
		return baseDesc + " menghapus produksi " + detail
	}
	return baseDesc + " " + getActionText(action, "produksi") + " " + detail
}

// buildPembelianDescription untuk modul pembelian
func buildPembelianDescription(db *gorm.DB, baseDesc, action string, recordID *uint) string {
	if recordID == nil {
		return baseDesc + " " + getActionText(action, "pembelian")
	}

	var pembelian model.BatchPembelian
	if err := db.Preload("Produk").First(&pembelian, *recordID).Error; err != nil {
		log.Printf("DEBUG: Error querying pembelian ID %d: %v", *recordID, err)
		return baseDesc + " " + getActionText(action, "pembelian") + " (ID: " + formatID(*recordID) + ")"
	}

	detail := fmt.Sprintf("%s %s", pembelian.Produk.NamaProduk, formatKg(pembelian.JumlahKg))

	switch action {
	case "CREATE":
		return baseDesc + " menambahkan pembelian " + detail + " dari " + pembelian.NamaPemasok
	case "UPDATE":
		return baseDesc + " mengubah pembelian " + detail
	case "DELETE":
		return baseDesc + " menghapus pembelian " + detail
	}
	return baseDesc + " " + getActionText(action, "pembelian") + " " + detail
}

// buildProdukDescription untuk modul produk
func buildProdukDescription(db *gorm.DB, baseDesc, action string, recordID *uint) string {
	if recordID == nil {
		return baseDesc + " " + getActionText(action, "produk")
	}

	var produk model.Produk
	if err := db.First(&produk, *recordID).Error; err != nil {
		log.Printf("DEBUG: Error querying produk ID %d: %v", *recordID, err)
		return baseDesc + " " + getActionText(action, "produk") + " (ID: " + formatID(*recordID) + ")"
	}

	switch action {
	case "CREATE":
		return baseDesc + " menambahkan produk " + produk.NamaProduk
	case "UPDATE":
		return baseDesc + " mengubah produk " + produk.NamaProduk
	case "DELETE":
		return baseDesc + " menghapus produk " + produk.NamaProduk
	}
	return baseDesc + " " + getActionText(action, "produk") + " " + produk.NamaProduk
}

// buildKarungDescription untuk modul karung
func buildKarungDescription(db *gorm.DB, baseDesc, action string, recordID *uint) string {
	if recordID == nil {
		return baseDesc + " " + getActionText(action, "karung")
	}

	var karung model.BatchKarung
	// ✅ Preload Produk untuk mendapatkan nama produk
	if err := db.Preload("Produk").First(&karung, *recordID).Error; err != nil {
		log.Printf("DEBUG: Error querying karung ID %d: %v", *recordID, err)
		return baseDesc + " " + getActionText(action, "karung") + " (ID: " + formatID(*recordID) + ")"
	}

	// Log data yang ditemukan untuk debugging
	log.Printf("DEBUG: Found karung - ProdukID: %d, Jumlah: %d", karung.ProdukID, karung.Jumlah)

	// ✅ Ambil nama produk dari relasi, bukan JenisKarung
	var namaProduk string
	if karung.Produk.NamaProduk != "" {
		namaProduk = karung.Produk.NamaProduk
		log.Printf("DEBUG: Using Produk.NamaProduk: %s", namaProduk)
	} else {
		namaProduk = "Produk Tidak Diketahui"
		log.Printf("DEBUG: No product name found, using default")
	}

	// ✅ Format detail dengan nama produk dan jumlah karung
	detail := fmt.Sprintf("karung %s (%d pcs)", namaProduk, karung.Jumlah)

	switch action {
	case "CREATE":
		return baseDesc + " menambahkan " + detail
	case "UPDATE":
		return baseDesc + " mengubah " + detail
	case "DELETE":
		return baseDesc + " menghapus " + detail
	}
	return baseDesc + " " + getActionText(action, "karung") + " " + detail
}

// buildProfileDescription untuk modul profile/user
func buildProfileDescription(baseDesc, action string) string {
	switch action {
	case "CREATE":
		return baseDesc + " membuat user baru"
	case "UPDATE":
		return baseDesc + " mengubah profil"
	case "DELETE":
		return baseDesc + " menghapus user"
	}
	return baseDesc + " " + getActionText(action, "profil")
}

// buildDefaultDescription untuk modul lainnya
func buildDefaultDescription(baseDesc, module, action string, recordID *uint) string {
	moduleLower := strings.ToLower(module)
	actionText := getActionText(action, moduleLower)

	if recordID != nil && action == "DELETE" {
		return baseDesc + " " + actionText + " dengan ID " + formatID(*recordID)
	}

	return baseDesc + " " + actionText
}

// getActionText helper untuk mendapatkan teks aksi dalam bahasa Indonesia
func getActionText(action, module string) string {
	switch action {
	case "CREATE":
		return "menambahkan " + module
	case "UPDATE":
		return "mengubah " + module
	case "DELETE":
		return "menghapus " + module
	default:
		return "melakukan " + action + " pada " + module
	}
}

func getModuleNameFromPath(path string) string {
	// PERBAIKAN: Cek rute yang lebih spesifik terlebih dahulu
	if strings.Contains(path, "/pembelian-langsung") {
		return "PEMBELIAN_LANGSUNG"
	}
	if strings.Contains(path, "/penjualan") {
		return "PENJUALAN"
	}
	if strings.Contains(path, "/produksi") {
		return "PRODUKSI"
	}
	if strings.Contains(path, "/pembelian") {
		return "PEMBELIAN"
	}
	if strings.Contains(path, "/auth") {
		return "AUTH"
	}
	if strings.Contains(path, "/user") {
		return "PROFILE"
	}
	if strings.Contains(path, "/produk") {
		return "PRODUK"
	}
	if strings.Contains(path, "/biaya-operasional") {
		return "BIAYA"
	}
	if strings.Contains(path, "/jasa-giling") {
		return "JASA_GILING"
	}
	if strings.Contains(path, "/karung") {
		return "KARUNG"
	}
	if strings.Contains(path, "/stok-produk") {
		return "STOK"
	}
	return "UNKNOWN"
}

// formatKg helper untuk format berat
func formatKg(kg float64) string {
	if kg == float64(int(kg)) {
		return fmt.Sprintf("%.0f kg", kg)
	}
	return fmt.Sprintf("%.1f kg", kg)
}

// formatID helper untuk tampilkan ID
func formatID(id uint) string {
	return fmt.Sprintf("%d", id)
}
