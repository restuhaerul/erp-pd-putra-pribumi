package handler

import (
	"net/http"
	"putra-pribumi/internal/service"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

type laporanHandler struct {
	service service.ServiceLaporan
}

func NewLaporanHandler(s service.ServiceLaporan) *laporanHandler {
	return &laporanHandler{s}
}

// GET /api/v1/laporan/bulanan?bulan=7&tahun=2025
func (h *laporanHandler) GetLaporanBulanan(c *gin.Context) {
	// Ambil parameter bulan dan tahun dari query URL
	bulanStr := c.DefaultQuery("bulan", strconv.Itoa(int(time.Now().Month())))
	tahunStr := c.DefaultQuery("tahun", strconv.Itoa(time.Now().Year()))

	bulan, err := strconv.Atoi(bulanStr)
	if err != nil || bulan < 1 || bulan > 12 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Parameter 'bulan' tidak valid"})
		return
	}

	tahun, err := strconv.Atoi(tahunStr)
	currentYear := time.Now().Year()
	if err != nil || tahun < 2025 || tahun > currentYear {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Parameter 'tahun' tidak valid"})
		return
	}

	laporan, err := h.service.GetLaporanBulanan(bulan, tahun)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat laporan"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": laporan})
}
