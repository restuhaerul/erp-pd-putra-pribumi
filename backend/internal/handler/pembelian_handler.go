// internal/handler/pembelian_handler.go
package handler

import (
	"log"
	"net/http"
	"putra-pribumi/internal/model"
	"putra-pribumi/internal/service"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

type pembelianHandler struct {
	pembelianService    service.ServicePembelian
	logPembelianService service.ServiceLogPembelian
}

func NewPembelianHandler(pembelianService service.ServicePembelian, logPembelianService service.ServiceLogPembelian) *pembelianHandler {
	return &pembelianHandler{pembelianService, logPembelianService}
}

type PembelianResponse struct {
	ID              uint      `json:"id"`
	ProdukID        uint      `json:"produk_id"`
	NamaPemasok     string    `json:"nama_pemasok"`
	JumlahKg        float64   `json:"jumlah_kg"`
	HargaPerKg      float64   `json:"harga_per_kg"`
	SisaKg          float64   `json:"sisa_kg"`
	TglPembelian    time.Time `json:"tgl_pembelian"`
	JumlahDigunakan float64   `json:"jumlah_digunakan"`
	IsTerpakai      bool      `json:"is_terpakai"`
}

func formatPembelianResponse(pembelian model.BatchPembelian) PembelianResponse {
	return PembelianResponse{
		ID:           pembelian.ID,
		ProdukID:     pembelian.ProdukID,
		NamaPemasok:  pembelian.NamaPemasok,
		JumlahKg:     pembelian.JumlahKg,
		HargaPerKg:   pembelian.HargaPerKg,
		SisaKg:       pembelian.SisaKg,
		TglPembelian: pembelian.TglPembelian,
	}
}

// PERBAIKAN: Mengambil dan meneruskan userID
func (h *pembelianHandler) CreatePembelian(c *gin.Context) {
	var input service.InputPembelian
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format input tidak valid"})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User tidak terautentikasi"})
		return
	}

	pembelianBaru, err := h.pembelianService.CreatePembelian(input, userID.(uint))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Set("record_id", pembelianBaru.ID)
	c.JSON(http.StatusCreated, gin.H{"message": "Pembelian berhasil dicatat", "data": pembelianBaru})
}

func (h *pembelianHandler) GetAllPembelian(c *gin.Context) {
	daftarPembelian, err := h.pembelianService.GetAllPembelian()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data pembelian"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": daftarPembelian})
}

func (h *pembelianHandler) GetPembelianByID(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
		return
	}
	pembelian, err := h.pembelianService.GetPembelianByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Data pembelian tidak ditemukan"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": formatPembelianResponse(pembelian)})
}

// PERBAIKAN: Mengambil dan meneruskan userID
func (h *pembelianHandler) UpdatePembelian(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
		return
	}

	var input service.InputUpdatePembelian
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format input tidak valid"})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User tidak terautentikasi"})
		return
	}

	pembelianUpdate, err := h.pembelianService.UpdatePembelian(uint(id), input, userID.(uint))
	if err != nil {
		log.Printf("Error updating data: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Data berhasil diperbarui", "data": formatPembelianResponse(pembelianUpdate)})
}

func (h *pembelianHandler) DeletePembelian(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User tidak terautentikasi"})
		return
	}

	c.Set("record_id", uint(id))

	_, err = h.pembelianService.DeletePembelian(uint(id), userID.(uint))
	if err != nil {
		// Kembalikan 400 Bad Request untuk error validasi (cth: stok sudah terpakai)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Data pembelian berhasil dibatalkan"})
}

func (h *pembelianHandler) GetPembelianHistory(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID pembelian tidak valid"})
		return
	}

	log.Printf("DEBUG: Menerima permintaan histori untuk batch_pembelian_id: %d", id)
	history, err := h.logPembelianService.GetHistory(uint(id))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil histori pembelian"})
		return
	}

	log.Printf("DEBUG: Query ke log_pembelian menemukan %d data.", len(history))
	c.JSON(http.StatusOK, gin.H{"data": history})
}
