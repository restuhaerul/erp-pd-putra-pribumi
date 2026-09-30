// internal/handler/akun_kas_handler.go
package handler

import (
	"net/http"
	"putra-pribumi/internal/repository"
	"putra-pribumi/internal/service"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

type akunKasHandler struct {
	service service.ServiceAkunKas
}

type TransaksiKasQueryParams struct {
	Page          int    `form:"page"`
	Limit         int    `form:"limit"`
	DateFrom      string `form:"date_from"` // Format: YYYY-MM-DD
	DateTo        string `form:"date_to"`   // Format: YYYY-MM-DD
	Arah          string `form:"arah"`      // IN, OUT
	ReferenceType string `form:"reference_type"`
	Search        string `form:"search"`
}

func NewAkunKasHandler(s service.ServiceAkunKas) *akunKasHandler {
	return &akunKasHandler{s}
}

func (h *akunKasHandler) CreateAkunKas(c *gin.Context) {
	var input service.InputAkunKas
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	akun, err := h.service.CreateAkunKas(input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan akun kas"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": akun})
}

func (h *akunKasHandler) GetAllAkunKas(c *gin.Context) {
	akuns, err := h.service.GetAllAkunKas()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data akun kas"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": akuns})
}

func (h *akunKasHandler) UpdateAkunKas(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
		return
	}
	var input service.InputAkunKas
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	akun, err := h.service.UpdateAkunKas(uint(id), input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui akun kas"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": akun})
}

func (h *akunKasHandler) DeleteAkunKas(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
		return
	}
	err = h.service.DeleteAkunKas(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Akun kas berhasil dihapus"})
}

// Tambahkan fungsi baru ini di file
func (h *akunKasHandler) GetAkunKasHistory(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID akun kas tidak valid"})
		return
	}

	// Parse query parameters
	var params TransaksiKasQueryParams
	if err := c.ShouldBindQuery(&params); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Parameter tidak valid"})
		return
	}

	// Set defaults
	if params.Page == 0 {
		params.Page = 1
	}
	if params.Limit == 0 {
		params.Limit = 10
	}

	// Build filter
	filter := repository.TransaksiKasFilter{
		Arah:          params.Arah,
		ReferenceType: params.ReferenceType,
		Search:        params.Search,
	}

	// Parse dates
	if params.DateFrom != "" {
		if dateFrom, err := time.Parse("2006-01-02", params.DateFrom); err == nil {
			filter.DateFrom = &dateFrom
		}
	}
	if params.DateTo != "" {
		if dateTo, err := time.Parse("2006-01-02", params.DateTo); err == nil {
			filter.DateTo = &dateTo
		}
	}

	// Get history with filters
	transaksis, total, err := h.service.GetTransaksiHistory(
		uint(id),
		params.Page,
		params.Limit,
		filter,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil riwayat transaksi"})
		return
	}

	totalPages := (total + int64(params.Limit) - 1) / int64(params.Limit)

	c.JSON(http.StatusOK, gin.H{
		"data": transaksis,
		"pagination": gin.H{
			"current_page": params.Page,
			"total_pages":  totalPages,
			"total_items":  total,
			"per_page":     params.Limit,
		},
	})
}
