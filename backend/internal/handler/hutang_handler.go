// internal/handler/hutang_handler.go
package handler

import (
	"net/http"
	"putra-pribumi/internal/service"
	"strconv"

	"github.com/gin-gonic/gin"
)

type hutangHandler struct {
	service service.ServiceHutang
}

func NewHutangHandler(s service.ServiceHutang) *hutangHandler {
	return &hutangHandler{s}
}

// GetAllHutang menangani request GET /api/v1/hutang
func (h *hutangHandler) GetAllHutang(c *gin.Context) {
	hutangs, err := h.service.GetAllHutang()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data hutang"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": hutangs})
}

// DELETE /api/v1/hutang/:id
func (h *hutangHandler) CancelHutang(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID hutang tidak valid"})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User tidak terautentikasi"})
		return
	}

	err = h.service.CancelHutang(uint(id), userID.(uint))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Hutang berhasil dibatalkan dan dana (jika ada) telah dikembalikan ke kas"})
}
