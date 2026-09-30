package handler

import (
	"net/http"
	"putra-pribumi/internal/service"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

type kasHandler struct {
	service service.ServiceKas
}

func NewKasHandler(s service.ServiceKas) *kasHandler {
	return &kasHandler{s}
}

// GET /api/v1/kas?bulan=11&tahun=2024
func (h *kasHandler) GetKasBulanan(c *gin.Context) {
	bulanStr := c.DefaultQuery("bulan", strconv.Itoa(int(time.Now().Month())))
	tahunStr := c.DefaultQuery("tahun", strconv.Itoa(time.Now().Year()))

	bulan, err := strconv.Atoi(bulanStr)
	if err != nil || bulan < 1 || bulan > 12 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Parameter 'bulan' tidak valid"})
		return
	}

	tahun, err := strconv.Atoi(tahunStr)
	if err != nil || tahun < 2020 || tahun > time.Now().Year() {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Parameter 'tahun' tidak valid"})
		return
	}

	kasData, err := h.service.GetKasBulanan(bulan, tahun)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memuat data kas"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": kasData})
}

// --- TAMBAHAN: Handler baru untuk transaksi manual ---
func (h *kasHandler) CreateTransaksiManual(c *gin.Context) {
	var input service.InputTransaksiKasManual
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Ambil userID dari context yang sudah di-set oleh middleware
	userID, _ := c.Get("user_id")

	transaksi, err := h.service.CreateTransaksiKasManual(input, userID.(uint))
	if err != nil {
		// Kirim status 400 jika error validasi (spt. saldo tidak cukup)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": transaksi})
}
