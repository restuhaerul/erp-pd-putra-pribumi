package handler

import (
	"net/http"
	"putra-pribumi/internal/service"
	"strconv"

	"github.com/gin-gonic/gin"
)

type stokProdukHandler struct {
	stokProdukService service.ServiceStokProduk
}

func NewStokProdukHandler(s service.ServiceStokProduk) *stokProdukHandler {
	return &stokProdukHandler{s}
}

// ... (GetAllStokProduk dan GetStokByProdukID tidak berubah) ...
func (h *stokProdukHandler) GetAllStokProduk(c *gin.Context) {
	daftarStok, err := h.stokProdukService.GetAllStokProduk()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data stok produk"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": daftarStok})
}

func (h *stokProdukHandler) GetStokByProdukID(c *gin.Context) {
	produkID, err := strconv.Atoi(c.Param("produk_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID produk tidak valid"})
		return
	}
	stok, err := h.stokProdukService.GetStokByProdukID(uint(produkID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Stok untuk produk tersebut tidak ditemukan"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": stok})
}

// Handler baru untuk menambah stok
// POST /api/v1/stok-produk/tambah
func (h *stokProdukHandler) TambahStok(c *gin.Context) {
	var input service.InputTambahStok
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	stokTerbaru, err := h.stokProdukService.TambahStok(input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Stok berhasil ditambahkan", "data": stokTerbaru})
}

// HANDLER BARU
// POST /api/v1/stok-produk/pembelian-langsung
func (h *stokProdukHandler) TambahStokDenganBiaya(c *gin.Context) {
	var input service.InputTambahStokDenganBiaya
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	stokTerbaru, err := h.stokProdukService.TambahStokDenganBiaya(input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Pembelian langsung berhasil dicatat dan stok diperbarui", "data": stokTerbaru})
}

// Handler baru untuk menambah stok manual
// POST /api/v1/stok-produk/manual
func (h *stokProdukHandler) TambahStokManual(c *gin.Context) {
	var input service.InputTambahStok
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	stokTerbaru, err := h.stokProdukService.TambahStokManual(input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Stok manual berhasil ditambahkan", "data": stokTerbaru})
}

// ✅ TAMBAHKAN HANDLER BARU
func (h *stokProdukHandler) TambahStokKemasan(c *gin.Context) {
	var input service.InputTambahStokKemasan
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	stok, err := h.stokProdukService.TambahStokKemasan(input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Stok kemasan berhasil ditambahkan dan biaya dicatat", "data": stok})
}
