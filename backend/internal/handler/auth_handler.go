package handler

import (
	"fmt"
	"net/http"
	"os"
	"putra-pribumi/internal/model"
	"putra-pribumi/internal/service"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

type authHandler struct {
	userService service.UserService
	jwtSecret   string
}

func NewAuthHandler(userService service.UserService, jwtSecret string) *authHandler {
	return &authHandler{
		userService: userService,
		jwtSecret:   jwtSecret,
	}
}

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type LoginResponse struct {
	Token string     `json:"token"`
	User  model.User `json:"user"`
}

// Login handler
func (h *authHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Username dan password harus diisi"})
		return
	}

	// Authenticate user
	user, err := h.userService.Authenticate(req.Username, req.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Username atau password salah"})
		return
	}

	// Check if user is active
	if !user.IsActive {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Akun tidak aktif"})
		return
	}

	// Generate JWT token
	token, err := h.generateToken(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat token"})
		return
	}

	// Log activity
	h.userService.LogActivity(user.ID, "LOGIN", "AUTH", nil, "User login", c.ClientIP())

	c.JSON(http.StatusOK, gin.H{
		"data": LoginResponse{
			Token: token,
			User:  *user,
		},
	})
}

// Get current user
func (h *authHandler) GetMe(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User tidak ditemukan"})
		return
	}

	user, err := h.userService.GetByID(userID.(uint))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User tidak ditemukan"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": user})
}

// Change password
func (h *authHandler) ChangePassword(c *gin.Context) {
	userID, _ := c.Get("user_id")

	var req struct {
		OldPassword string `json:"old_password" binding:"required"`
		NewPassword string `json:"new_password" binding:"required,min=6"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data tidak valid"})
		return
	}

	err := h.userService.ChangePassword(userID.(uint), req.OldPassword, req.NewPassword)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Log activity
	h.userService.LogActivity(userID.(uint), "UPDATE", "AUTH", nil, "User changed password", c.ClientIP())

	c.JSON(http.StatusOK, gin.H{"message": "Password berhasil diubah"})
}

// Generate JWT token
func (h *authHandler) generateToken(user *model.User) (string, error) {
	claims := jwt.MapClaims{
		"user_id":  user.ID,
		"username": user.Username,
		"role":     user.Role,
		"exp":      time.Now().Add(time.Hour * 24 * 7).Unix(), // 7 days
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(h.jwtSecret))
}

// Update profile (name only, photo handled separately)
func (h *authHandler) UpdateProfile(c *gin.Context) {
	userID, _ := c.Get("user_id")

	var req struct {
		FullName string `json:"full_name" binding:"required"`
		// Hapus PhotoURL dari sini
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data tidak valid"})
		return
	}

	// Hanya update full_name
	updates := map[string]interface{}{
		"full_name": req.FullName,
	}

	err := h.userService.Update(userID.(uint), updates)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal update profile"})
		return
	}

	// Get updated user data
	user, _ := h.userService.GetByID(userID.(uint))

	// Log activity
	h.userService.LogActivity(userID.(uint), "UPDATE", "PROFILE", nil, "User updated profile", c.ClientIP())

	c.JSON(http.StatusOK, gin.H{
		"message": "Profile berhasil diupdate",
		"data":    user,
	})
}

// Upload photo endpoint
func (h *authHandler) UploadPhoto(c *gin.Context) {
	userID, _ := c.Get("user_id")

	file, err := c.FormFile("photo")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File tidak ditemukan"})
		return
	}

	// Validate file type
	if file.Header.Get("Content-Type") != "image/jpeg" &&
		file.Header.Get("Content-Type") != "image/png" &&
		file.Header.Get("Content-Type") != "image/jpg" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format file harus JPG atau PNG"})
		return
	}

	// Validate file size (max 2MB)
	if file.Size > 2*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ukuran file maksimal 2MB"})
		return
	}

	// Create unique filename
	filename := fmt.Sprintf("user_%d_%d.jpg", userID, time.Now().Unix())
	filepath := fmt.Sprintf("./uploads/photos/%s", filename)

	// Create uploads directory if not exists
	os.MkdirAll("./uploads/photos", os.ModePerm)

	// Save file
	if err := c.SaveUploadedFile(file, filepath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan file"})
		return
	}

	// Update user photo URL
	photoURL := fmt.Sprintf("/uploads/photos/%s", filename)
	err = h.userService.Update(userID.(uint), map[string]interface{}{
		"photo_url": photoURL,
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal update foto"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":   "Foto berhasil diupload",
		"photo_url": photoURL,
	})
}
