// internal/handler/piutang_handler.go
package handler

import (
	"net/http"
	"putra-pribumi/internal/service"

	"github.com/gin-gonic/gin"
)

type piutangHandler struct {
	service service.ServicePiutang
}

func NewPiutangHandler(s service.ServicePiutang) *piutangHandler {
	return &piutangHandler{s}
}

// GetAllPiutang menangani request GET /api/v1/piutang
func (h *piutangHandler) GetAllPiutang(c *gin.Context) {
	piutangs, err := h.service.GetAllPiutang()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data piutang"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": piutangs})
}
