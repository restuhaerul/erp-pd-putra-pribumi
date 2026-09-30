package handler

import (
	"net/http"
	"putra-pribumi/internal/model"
	"putra-pribumi/internal/service"
	"strconv"

	"github.com/gin-gonic/gin"
)

type userHandler struct {
	userService service.UserService
}

func NewUserHandler(userService service.UserService) *userHandler {
	return &userHandler{userService: userService}
}

// Get all users
func (h *userHandler) GetAll(c *gin.Context) {
	users, err := h.userService.GetAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": users})
}

// Create user
func (h *userHandler) Create(c *gin.Context) {
	var user model.User
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data tidak valid"})
		return
	}

	if err := h.userService.Create(&user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat user"})
		return
	}

	// Log activity
	userID, _ := c.Get("user_id")
	h.userService.LogActivity(userID.(uint), "CREATE", "USER", &user.ID, "Created new user: "+user.Username, c.ClientIP())

	c.JSON(http.StatusCreated, gin.H{"data": user})
}

// Update user
func (h *userHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
		return
	}

	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data tidak valid"})
		return
	}

	// Remove password from updates if exists
	delete(updates, "password")

	if err := h.userService.Update(uint(id), updates); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal update user"})
		return
	}

	// Log activity
	userID, _ := c.Get("user_id")
	recordID := uint(id)
	h.userService.LogActivity(userID.(uint), "UPDATE", "USER", &recordID, "Updated user", c.ClientIP())

	c.JSON(http.StatusOK, gin.H{"message": "User berhasil diupdate"})
}

// Delete user
func (h *userHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
		return
	}

	if err := h.userService.Delete(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal hapus user"})
		return
	}

	// Log activity
	userID, _ := c.Get("user_id")
	recordID := uint(id)
	h.userService.LogActivity(userID.(uint), "DELETE", "USER", &recordID, "Deleted user", c.ClientIP())

	c.JSON(http.StatusOK, gin.H{"message": "User berhasil dihapus"})
}

// Reset password
func (h *userHandler) ResetPassword(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
		return
	}

	var req struct {
		NewPassword string `json:"new_password" binding:"required,min=6"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Password minimal 6 karakter"})
		return
	}

	user := &model.User{Password: req.NewPassword}
	if err := user.HashPassword(req.NewPassword); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal hash password"})
		return
	}

	if err := h.userService.Update(uint(id), map[string]interface{}{
		"password": user.Password,
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal reset password"})
		return
	}

	// Log activity
	userID, _ := c.Get("user_id")
	recordID := uint(id)
	h.userService.LogActivity(userID.(uint), "UPDATE", "USER", &recordID, "Reset user password", c.ClientIP())

	c.JSON(http.StatusOK, gin.H{"message": "Password berhasil direset"})
}
