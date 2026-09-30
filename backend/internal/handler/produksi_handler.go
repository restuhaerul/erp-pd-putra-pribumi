package handler

import (
	"log"
	"net/http"
	"putra-pribumi/internal/service"
	"strconv"

	"github.com/gin-gonic/gin"
)

// Struct untuk pagination response
type PaginationMeta struct {
	CurrentPage  int   `json:"current_page"`
	TotalPages   int   `json:"total_pages"`
	TotalItems   int64 `json:"total_items"`
	ItemsPerPage int   `json:"items_per_page"`
	HasNext      bool  `json:"has_next"`
	HasPrev      bool  `json:"has_prev"`
}

type PaginatedResponse struct {
	Data []interface{}  `json:"data"`
	Meta PaginationMeta `json:"meta"`
}

// Struct untuk summary response
type SummaryData struct {
	TotalProduksiDihasilkan float64 `json:"total_produksi_dihasilkan"`
	TotalBahanBakuDigunakan float64 `json:"total_bahan_baku_digunakan"`
	TotalSisaProduksi       float64 `json:"total_sisa_produksi"`
	TotalHPP                float64 `json:"total_hpp"`
	AvgEfficiency           float64 `json:"avg_efficiency"`
}

type produksiHandler struct {
	produksiService    service.ServiceProduksi
	logProduksiService service.ServiceLogProduksi
}

func NewProduksiHandler(produksiService service.ServiceProduksi, logProduksiService service.ServiceLogProduksi) *produksiHandler {
	return &produksiHandler{produksiService, logProduksiService}
}

func (h *produksiHandler) CreateProduksi(c *gin.Context) {
	var input service.InputProduksi
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Ambil userID dari context
	userIDValue, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User tidak terautentikasi"})
		return
	}
	userID := userIDValue.(uint)

	// Teruskan userID ke service
	hasilProduksi, err := h.produksiService.CreateProduksi(input, userID)
	if err != nil {
		log.Printf("ERROR: Gagal membuat data produksi: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Set("record_id", hasilProduksi.ID)
	c.JSON(http.StatusCreated, gin.H{"message": "Proses produksi berhasil dicatat", "data": hasilProduksi})
}

func (h *produksiHandler) UpdateProduksi(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
		return
	}
	var input service.InputProduksi
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Ambil userID dari context
	userIDValue, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User tidak terautentikasi"})
		return
	}
	userID := userIDValue.(uint)

	// Teruskan userID ke service
	updatedProduksi, err := h.produksiService.UpdateProduksi(uint(id), input, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Data produksi berhasil diperbarui", "data": updatedProduksi})
}

func (h *produksiHandler) DeleteProduksi(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
		return
	}

	// Ambil userID dari context
	userIDValue, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User tidak terautentikasi"})
		return
	}
	userID := userIDValue.(uint)

	// Teruskan userID ke service
	if err := h.produksiService.DeleteProduksi(uint(id), userID); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Data produksi berhasil dihapus"})
}

// 2. Tambahkan fungsi handler baru
// GET /api/v1/produksi/:id/history
func (h *produksiHandler) GetProduksiHistory(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID produksi tidak valid"})
		return
	}

	history, err := h.logProduksiService.GetHistory(uint(id))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil histori produksi"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": history})
}

// UPDATE: Ubah GetAllProduksi untuk mendukung pagination
func (h *produksiHandler) GetAllProduksi(c *gin.Context) {
	// Check if pagination parameters exist
	pageStr := c.DefaultQuery("page", "")
	limitStr := c.DefaultQuery("limit", "")

	// Jika tidak ada parameter pagination, gunakan metode lama
	if pageStr == "" && limitStr == "" {
		produksi, err := h.produksiService.GetAllProduksi()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data produksi"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"data": produksi})
		return
	}

	// Parse pagination parameters
	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 {
		limit = 10
	}

	// Parse date filters
	dateFrom := c.Query("date_from")
	dateTo := c.Query("date_to")

	// Call new paginated service method
	produksi, total, err := h.produksiService.GetProduksiPaginated(page, limit, dateFrom, dateTo)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data produksi"})
		return
	}

	// Calculate pagination metadata
	totalPages := int((total + int64(limit) - 1) / int64(limit))

	// Convert to interface slice for response
	data := make([]interface{}, len(produksi))
	for i, v := range produksi {
		data[i] = v
	}

	meta := PaginationMeta{
		CurrentPage:  page,
		TotalPages:   totalPages,
		TotalItems:   total,
		ItemsPerPage: limit,
		HasNext:      page < totalPages,
		HasPrev:      page > 1,
	}

	response := PaginatedResponse{
		Data: data,
		Meta: meta,
	}

	c.JSON(http.StatusOK, response)
}

// NEW: Endpoint untuk summary data
func (h *produksiHandler) GetProduksiSummary(c *gin.Context) {
	dateFrom := c.Query("date_from")
	dateTo := c.Query("date_to")

	summary, err := h.produksiService.GetProduksiSummary(dateFrom, dateTo)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil summary produksi"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": summary})
}
