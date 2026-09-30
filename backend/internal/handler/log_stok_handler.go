package handler

import (
	"net/http"
	"putra-pribumi/internal/service"
	"strconv"

	"github.com/gin-gonic/gin"
)

type logStokHandler struct{ service service.ServiceLogStok }

func NewLogStokHandler(s service.ServiceLogStok) *logStokHandler { return &logStokHandler{s} }

func (h *logStokHandler) GetHistoryByProdukID(c *gin.Context) {
	produkID, err := strconv.Atoi(c.Param("produk_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID produk tidak valid"})
		return
	}
	history, err := h.service.GetHistory(uint(produkID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil histori"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": history})
}

// Enhanced GetRecentActivity handler with flexible limit parameter
// GET /api/v1/log-stok/activity?limit=100
func (h *logStokHandler) GetRecentActivity(c *gin.Context) {
	// Get limit from query parameter, default to 100 for better pagination support
	limitStr := c.DefaultQuery("limit", "100")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 {
		limit = 100 // Default to 100 if invalid
	}

	// Cap the maximum limit to prevent performance issues
	if limit > 500 {
		limit = 500
	}

	activity, err := h.service.GetRecentActivity(limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil aktivitas terbaru"})
		return
	}

	// Return with additional metadata
	c.JSON(http.StatusOK, gin.H{
		"data": activity,
		"meta": gin.H{
			"total": len(activity),
			"limit": limit,
		},
	})
}
