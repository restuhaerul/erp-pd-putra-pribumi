package handler

import (
	"net/http"
	"putra-pribumi/internal/service"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

type PembelianLangsungHandler struct {
	service service.ServicePembelianLangsung
}

func NewPembelianLangsungHandler(service service.ServicePembelianLangsung) *PembelianLangsungHandler {
	return &PembelianLangsungHandler{service: service}
}

func (h *PembelianLangsungHandler) Create(c *gin.Context) {
	var input service.InputCreatePembelianLangsung
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Binding error: " + err.Error()})
		return
	}

	userID, _ := c.Get("user_id")

	pembelian, err := h.service.CreateWithPayment(input, userID.(uint))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Set("record_id", pembelian.ID)
	c.JSON(http.StatusCreated, gin.H{"message": "Pembelian berhasil dicatat", "data": pembelian})
}

func (h *PembelianLangsungHandler) Update(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
		return
	}

	// --- PERBAIKAN DIMULAI DI SINI ---

	// 1. Gunakan struct InputUpdatePembelian dari service
	var input service.InputUpdatePembelian
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data input tidak valid: " + err.Error()})
		return
	}

	// 2. Ambil userID dari context
	userIDValue, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User tidak terautentikasi"})
		return
	}
	userID, ok := userIDValue.(uint)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Tipe userID tidak valid"})
		return
	}

	// 3. Panggil service dengan argumen yang benar
	pembelian, err := h.service.Update(uint(id), input, userID)
	if err != nil {
		// Kirim error dari service ke frontend
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// --- BATAS PERBAIKAN ---

	c.JSON(http.StatusOK, gin.H{"message": "Pembelian langsung berhasil diperbarui", "data": pembelian})
}

func (h *PembelianLangsungHandler) Delete(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
		return
	}

	userID, _ := c.Get("user_id")
	c.Set("record_id", uint(id))

	// --- PERUBAHAN DI SINI: Panggil CancelPembelian, BUKAN Delete ---
	err = h.service.CancelPembelian(uint(id), userID.(uint))
	if err != nil {
		if strings.Contains(err.Error(), "tidak dapat") || strings.Contains(err.Error(), "tidak ditemukan") {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	// Ubah pesan sukses agar lebih sesuai
	c.JSON(http.StatusOK, gin.H{"message": "Pembelian langsung berhasil dibatalkan"})
}

func (h *PembelianLangsungHandler) GetHistory(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
		return
	}
	history, err := h.service.GetHistory(uint(id))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil history penggunaan"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": history})
}

func (h *PembelianLangsungHandler) GetAll(c *gin.Context) {
	pembelianList, err := h.service.GetAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": pembelianList})
}
