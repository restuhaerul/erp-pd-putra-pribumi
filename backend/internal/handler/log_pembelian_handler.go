// File: internal/handler/log_pembelian_handler.go
package handler

import (
	"net/http"
	"strconv"

	"putra-pribumi/internal/service"

	"github.com/gin-gonic/gin"
)

type LogPembelianHandler struct {
	logPembelianService service.ServiceLogPembelian
}

func NewLogPembelianHandler(logPembelianService service.ServiceLogPembelian) *LogPembelianHandler {
	return &LogPembelianHandler{
		logPembelianService: logPembelianService,
	}
}

// GetHistoryByBatchID - GET /api/v1/log-pembelian/:batch_id/history
func (h *LogPembelianHandler) GetHistoryByBatchID(c *gin.Context) {
	batchIDStr := c.Param("batch_id")
	batchID, err := strconv.ParseUint(batchIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   true,
			"message": "ID batch pembelian tidak valid",
		})
		return
	}

	logs, err := h.logPembelianService.GetHistory(uint(batchID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   true,
			"message": "Gagal mengambil riwayat batch pembelian: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"error":   false,
		"message": "Riwayat batch pembelian berhasil diambil",
		"data":    logs,
	})
}

// GetAllLogs - GET /api/v1/log-pembelian (opsional, jika butuh semua log)
func (h *LogPembelianHandler) GetAllLogs(c *gin.Context) {
	// Query parameters untuk filtering (opsional)
	limitStr := c.DefaultQuery("limit", "100")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 100
	}

	offset, err := strconv.Atoi(offsetStr)
	if err != nil || offset < 0 {
		offset = 0
	}

	logs, err := h.logPembelianService.GetAllLogs(limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   true,
			"message": "Gagal mengambil semua log pembelian: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"error":   false,
		"message": "Semua log pembelian berhasil diambil",
		"data":    logs,
	})
}
