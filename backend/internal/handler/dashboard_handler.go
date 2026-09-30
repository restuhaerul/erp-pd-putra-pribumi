package handler

import (
	"github.com/gin-gonic/gin"
	"net/http"
	"putra-pribumi/internal/service"
)

type dashboardHandler struct {
	service service.ServiceDashboard
}

func NewDashboardHandler(s service.ServiceDashboard) *dashboardHandler {
	return &dashboardHandler{s}
}

// GET /api/v1/dashboard
func (h *dashboardHandler) GetDashboardData(c *gin.Context) {
	data, err := h.service.GetDashboardData()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data dashboard"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": data})
}
