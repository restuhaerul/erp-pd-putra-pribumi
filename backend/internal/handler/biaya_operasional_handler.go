// internal/handler/biaya_operasional_handler.go
package handler

import (
	"net/http"
	"putra-pribumi/internal/service"
	"strconv"

	"github.com/gin-gonic/gin"
)

type biayaOperasionalHandler struct {
	service service.ServiceBiayaOperasional
}

func NewBiayaOperasionalHandler(s service.ServiceBiayaOperasional) *biayaOperasionalHandler {
	return &biayaOperasionalHandler{s}
}

func (h *biayaOperasionalHandler) CreateBiaya(c *gin.Context) {
	var input service.InputBiayaOperasional
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, _ := c.Get("user_id")
	biaya, err := h.service.CreateBiaya(input, userID.(uint)) // Ini sudah benar
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"message": "Biaya operasional berhasil dicatat", "data": biaya})
}

func (h *biayaOperasionalHandler) GetAllBiaya(c *gin.Context) {
	daftarBiaya, err := h.service.GetAllBiaya()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data biaya"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": daftarBiaya})
}

func (h *biayaOperasionalHandler) GetBiayaByID(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	// PERBAIKAN 3: Gunakan variabel 'id' yang sudah diambil
	biaya, err := h.service.GetBiayaByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Data biaya tidak ditemukan"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": biaya})
}

func (h *biayaOperasionalHandler) UpdateBiaya(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var input service.InputBiayaOperasional
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, _ := c.Get("user_id")
	// PERBAIKAN 1: Tambahkan 'id' sebagai argumen pertama
	biaya, err := h.service.UpdateBiaya(uint(id), input, userID.(uint))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Data biaya berhasil diperbarui", "data": biaya})
}

func (h *biayaOperasionalHandler) DeleteBiaya(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))

	userID, _ := c.Get("user_id")
	// PERBAIKAN 2: Tambahkan 'userID' sebagai argumen kedua
	if err := h.service.DeleteBiaya(uint(id), userID.(uint)); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Gagal menghapus, data tidak ditemukan"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Data biaya berhasil dihapus"})
}
