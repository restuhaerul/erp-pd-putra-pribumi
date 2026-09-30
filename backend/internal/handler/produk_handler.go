package handler

import (
	"net/http"
	"putra-pribumi/internal/service"
	"strconv"

	"github.com/gin-gonic/gin"
)

type produkHandler struct {
	produkService service.ServiceProduk
}

func NewProdukHandler(produkService service.ServiceProduk) *produkHandler {
	return &produkHandler{produkService}
}

func (h *produkHandler) CreateProduk(c *gin.Context) {
	var input service.InputProduk
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format input tidak valid"})
		return
	}
	_, err := h.produkService.CreateProduk(input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan produk"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"message": "Produk berhasil dibuat"})
}

func (h *produkHandler) GetAllProduk(c *gin.Context) {
	produk, err := h.produkService.GetAllProduk()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data produk"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": produk})
}

func (h *produkHandler) GetProdukByID(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
		return
	}
	produk, err := h.produkService.GetProdukByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Produk tidak ditemukan"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": produk})
}

func (h *produkHandler) UpdateProduk(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
		return
	}
	var input service.InputProduk
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format input tidak valid"})
		return
	}
	_, err = h.produkService.UpdateProduk(uint(id), input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui produk"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Produk berhasil diperbarui"})
}

// ======================================================================
//
//	FUNGSI INI DIPERBAIKI
//
// ======================================================================
func (h *produkHandler) DeleteProduk(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
		return
	}
	// Sekarang kita hanya menampung satu hasil (error) ke dalam satu variabel (err)
	err = h.produkService.DeleteProduk(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Gagal menghapus, produk tidak ditemukan"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Produk berhasil dihapus"})
}
