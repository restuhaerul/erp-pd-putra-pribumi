// File: putra-pribumi/internal/handler/penjualan_handler.go
// UPDATED: Tambah field Status di response dan endpoint baru untuk include cancelled

package handler

import (
	"log"
	"net/http"
	"putra-pribumi/internal/model"
	"putra-pribumi/internal/service"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type penjualanHandler struct {
	penjualanService service.ServicePenjualan
}

func NewPenjualanHandler(penjualanService service.ServicePenjualan) *penjualanHandler {
	return &penjualanHandler{penjualanService}
}

// UPDATED: Struct respons dengan field Status
type PenjualanDetailResponse struct {
	ID               uint      `json:"id"`
	TglTransaksi     time.Time `json:"tgl_transaksi"`
	NamaPelanggan    string    `json:"nama_pelanggan"`
	ProdukID         uint      `json:"produk_id"`
	NamaProduk       string    `json:"nama_produk"`
	TipeProduk       string    `json:"tipe_produk"`
	JumlahKg         float64   `json:"jumlah_kg"`
	HargaJualPerKg   float64   `json:"harga_jual_per_kg"`
	Laba             float64   `json:"laba"`
	StatusPembayaran string    `json:"status_pembayaran"`
	NilaiTerbayar    float64   `json:"nilai_terbayar"`
	Status           string    `json:"status"` // NEW: AKTIF atau DIBATALKAN
}

// UPDATED: Fungsi format dengan Status
func formatPenjualanDetail(penjualan model.TransaksiPenjualan) PenjualanDetailResponse {
	var namaProduk, tipeProduk string

	if penjualan.BatchProduksiID != nil && penjualan.BatchProduksi != nil {
		namaProduk = penjualan.BatchProduksi.Produk.NamaProduk
		tipeProduk = penjualan.BatchProduksi.Produk.TipeProduk
	} else {
		namaProduk = penjualan.Produk.NamaProduk
		tipeProduk = penjualan.Produk.TipeProduk
	}

	// Default status ke AKTIF jika kosong
	status := penjualan.Status
	if status == "" {
		status = "AKTIF"
	}

	return PenjualanDetailResponse{
		ID:               penjualan.ID,
		TglTransaksi:     penjualan.TglTransaksi,
		NamaPelanggan:    penjualan.NamaPelanggan,
		ProdukID:         penjualan.ProdukID,
		NamaProduk:       namaProduk,
		TipeProduk:       tipeProduk,
		JumlahKg:         penjualan.JumlahKg,
		HargaJualPerKg:   penjualan.HargaJualPerKg,
		Laba:             penjualan.Laba,
		StatusPembayaran: penjualan.StatusPembayaran,
		NilaiTerbayar:    penjualan.NilaiTerbayar,
		Status:           status, // NEW
	}
}

// POST /api/v1/penjualan
func (h *penjualanHandler) CreatePenjualan(c *gin.Context) {
	var input service.InputPenjualan
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format input tidak valid"})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User tidak terautentikasi"})
		return
	}

	penjualan, err := h.penjualanService.CreatePenjualan(input, userID.(uint))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.Set("record_id", penjualan.ID)
	c.JSON(http.StatusCreated, gin.H{"message": "Transaksi penjualan berhasil dicatat", "data": formatPenjualanDetail(penjualan)})
}

// GET /api/v1/penjualan?tanggal=2025-07-27&include_cancelled=true
func (h *penjualanHandler) GetPenjualanByDate(c *gin.Context) {
	dateStr := c.Query("tanggal")
	if dateStr == "" {
		dateStr = time.Now().Format("2006-01-02")
	}

	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format tanggal tidak valid, gunakan YYYY-MM-DD"})
		return
	}

	// NEW: Check if should include cancelled
	includeCancelled := c.Query("include_cancelled") == "true"

	var daftarPenjualan []model.TransaksiPenjualan
	if includeCancelled {
		daftarPenjualan, err = h.penjualanService.GetPenjualanByDateWithCancelled(date)
	} else {
		daftarPenjualan, err = h.penjualanService.GetPenjualanByDate(date)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data penjualan"})
		return
	}

	var response []PenjualanDetailResponse
	for _, p := range daftarPenjualan {
		response = append(response, formatPenjualanDetail(p))
	}

	c.JSON(http.StatusOK, gin.H{"data": response})
}

// GET /laporan/laba-harian
func (h *penjualanHandler) GetLabaHarian(c *gin.Context) {
	totalLaba, err := h.penjualanService.GetLabaHarian()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghitung laba harian"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"total_laba_hari_ini": totalLaba})
}

// PATCH /api/v1/penjualan/:id
func (h *penjualanHandler) UpdatePenjualan(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
		return
	}

	c.Set("record_id", uint(id))

	var input service.InputPenjualan
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format input tidak valid"})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User tidak terautentikasi"})
		return
	}

	updatedPenjualan, err := h.penjualanService.UpdatePenjualan(uint(id), input, userID.(uint))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Penjualan berhasil diperbarui", "data": formatPenjualanDetail(updatedPenjualan)})
}

// DELETE /api/v1/penjualan/:id
// DELETE /api/v1/penjualan/:id
func (h *penjualanHandler) DeletePenjualan(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32) // ← Parse langsung ke uint
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
		return
	}

	userID := c.GetUint("user_id") // ← Pastikan nama key-nya sama (user_id atau UserID)
	err = h.penjualanService.DeletePenjualan(uint(id), userID)
	if err != nil {
		log.Printf("ERROR DeletePenjualan: %v", err)

		if strings.Contains(err.Error(), "pembayaran") {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":      err.Error(),
				"suggestion": "Gunakan fitur 'Batalkan Penjualan' untuk transaksi yang sudah dibayar",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Penjualan berhasil dihapus"})
}

// DELETE /api/v1/penjualan/:id/cancel
func (h *penjualanHandler) CancelPenjualan(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	userID := c.MustGet("user_id").(uint)

	if err := h.penjualanService.CancelPenjualan(uint(id), userID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Penjualan berhasil dibatalkan"})
}
