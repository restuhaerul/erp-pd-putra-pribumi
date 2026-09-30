// FILE: internal/handler/karung_handler.go
package handler

import (
	"net/http"
	"putra-pribumi/internal/service"
	"strconv"

	"github.com/gin-gonic/gin"
)

type karungHandler struct {
	service    service.ServiceKarung
	logService service.ServiceLogKarung
}

func NewKarungHandler(s service.ServiceKarung, ls service.ServiceLogKarung) *karungHandler {
	return &karungHandler{s, ls}
}

// ======================================================================
// --- FUNGSI CREATE DIPERBAIKI ---
// ======================================================================
func (h *karungHandler) Create(c *gin.Context) {
	var input service.InputPembelianKarung
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// --- PERBAIKAN: Pengecekan userID yang aman ---
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
	// --- BATAS PERBAIKAN ---

	result, err := h.service.CreatePembelianKarung(input, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Set("record_id", result.ID)
	c.JSON(http.StatusCreated, gin.H{"data": result})
}

// ======================================================================
// --- FUNGSI UPDATE DIPERBAIKI ---
// ======================================================================
func (h *karungHandler) Update(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var input service.InputPembelianKarung
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// --- PERBAIKAN: Pengecekan userID yang aman ---
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
	// --- BATAS PERBAIKAN ---

	result, err := h.service.UpdatePembelianKarung(uint(id), input, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Set("record_id", result.ID)
	c.JSON(http.StatusOK, gin.H{"data": result})
}

// ======================================================================
// --- FUNGSI DELETE DIPERBAIKI ---
// ======================================================================
func (h *karungHandler) Delete(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	c.Set("record_id", uint(id))

	// --- PERBAIKAN: Pengecekan userID yang aman ---
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
	// --- BATAS PERBAIKAN ---

	if err := h.service.DeletePembelianKarung(uint(id), userID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Pembelian karung berhasil dibatalkan"})
}

// --- FUNGSI-FUNGSI DI BAWAH INI TIDAK BERUBAH ---
func (h *karungHandler) GetAll(c *gin.Context) {
	result, err := h.service.GetAllKarung()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": result})
}

func (h *karungHandler) GetHistory(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID batch karung tidak valid"})
		return
	}

	history, err := h.logService.GetHistory(uint(id))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil histori"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": history})
}
