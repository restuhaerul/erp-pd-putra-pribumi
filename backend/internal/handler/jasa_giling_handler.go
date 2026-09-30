// FILE: internal/handler/jasa_giling_handler.go
package handler

import (
	"net/http"
	"putra-pribumi/internal/service"
	"strconv"

	"github.com/gin-gonic/gin"
)

type jasaGilingHandler struct {
	service service.ServiceJasaGiling
}

func NewJasaGilingHandler(s service.ServiceJasaGiling) *jasaGilingHandler {
	return &jasaGilingHandler{s}
}

func (h *jasaGilingHandler) CreateJasaGiling(c *gin.Context) {
	var input service.InputJasaGiling
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// --- PERBAIKAN: Ambil dan teruskan userID ---
	userIDValue, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User tidak terautentikasi"})
		return
	}
	userID := userIDValue.(uint)

	jasa, err := h.service.CreateJasaGiling(input, userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"message": "Transaksi jasa giling berhasil dicatat", "data": jasa})
}

func (h *jasaGilingHandler) UpdateJasaGiling(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var input service.InputJasaGiling
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// --- PERBAIKAN: Ambil dan teruskan userID ---
	userIDValue, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User tidak terautentikasi"})
		return
	}
	userID := userIDValue.(uint)

	jasa, err := h.service.UpdateJasaGiling(uint(id), input, userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Transaksi berhasil diperbarui", "data": jasa})
}

func (h *jasaGilingHandler) DeleteJasaGiling(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))

	// --- PERBAIKAN: Ambil dan teruskan userID ---
	userIDValue, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User tidak terautentikasi"})
		return
	}
	userID := userIDValue.(uint)

	if err := h.service.DeleteJasaGiling(uint(id), userID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Gagal menghapus, transaksi tidak ditemukan"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Transaksi berhasil dihapus"})
}

// --- FUNGSI DI BAWAH INI TIDAK BERUBAH ---
func (h *jasaGilingHandler) GetAllJasaGiling(c *gin.Context) {
	daftarJasa, err := h.service.GetAllJasaGiling()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data jasa giling"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": daftarJasa})
}

func (h *jasaGilingHandler) GetJasaGilingByID(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	jasa, err := h.service.GetJasaGilingByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Transaksi tidak ditemukan"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": jasa})
}
