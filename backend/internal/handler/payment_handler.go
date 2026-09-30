// internal/handler/payment_handler.go
package handler

import (
	"net/http"
	"putra-pribumi/internal/service"

	"github.com/gin-gonic/gin"
)

type paymentHandler struct {
	service service.ServicePayment
}

func NewPaymentHandler(s service.ServicePayment) *paymentHandler {
	return &paymentHandler{s}
}

func (h *paymentHandler) CreatePayment(c *gin.Context) {
	var input service.InputPembayaran
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, _ := c.Get("user_id")

	payment, err := h.service.CreatePayment(input, userID.(uint))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Pembayaran berhasil dicatat", "data": payment})
}
