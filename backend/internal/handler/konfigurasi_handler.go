package handler

import (
	"github.com/gin-gonic/gin"
	"net/http"
	"putra-pribumi/internal/service"
)

type konfigurasiHandler struct {
	konfigurasiService service.ServiceKonfigurasi
}

func NewKonfigurasiHandler(s service.ServiceKonfigurasi) *konfigurasiHandler {
	return &konfigurasiHandler{s}
}

// GET /api/v1/konfigurasi
func (h *konfigurasiHandler) GetKonfigurasi(c *gin.Context) {
	konfigurasi, err := h.konfigurasiService.GetKonfigurasi()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil konfigurasi"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": konfigurasi})
}

// PUT /api/v1/konfigurasi
func (h *konfigurasiHandler) UpdateKonfigurasi(c *gin.Context) {
	var input service.InputUpdateKonfigurasi
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format input tidak valid"})
		return
	}

	updatedKonfigurasi, err := h.konfigurasiService.UpdateKonfigurasi(input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui konfigurasi"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Konfigurasi berhasil diperbarui", "data": updatedKonfigurasi})
}
