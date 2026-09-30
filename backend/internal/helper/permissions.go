// permissions.go - Updated ADMIN permissions
package helper

import (
	"putra-pribumi/internal/model"
	"time"
)

type Permission struct {
	Create bool
	Read   bool
	Update bool
	Delete bool
}

func GetModulePermissions(role model.UserRole, module string) Permission {
	permissions := map[model.UserRole]map[string]Permission{
		model.RoleOwner: {
			"all": {Create: true, Read: true, Update: true, Delete: true},
		},
		// ✅ ADMIN PERMISSIONS DIREVISI SESUAI PERMINTAAN TERBARU
		model.RoleAdmin: {
			"pembelian":   {Create: true, Read: true, Update: false, Delete: false},  // Read dan create
			"stok":        {Create: false, Read: true, Update: false, Delete: false}, // Hanya view (sudah benar)
			"penjualan":   {Create: true, Read: true, Update: false, Delete: true},   // Read, create dan delete
			"jasa_giling": {Create: true, Read: true, Update: false, Delete: false},  // Read dan create
			"dashboard":   {Create: false, Read: true, Update: false, Delete: false}, // Bisa akses dashboard
			"produk":      {Create: false, Read: true, Update: false, Delete: false}, // ✅ TAMBAH: Read produk untuk reference
			// Sisanya tidak ada akses sama sekali (dihapus dari mapping)
		},
		model.RoleKasir: {
			"penjualan":   {Create: true, Read: true, Update: true, Delete: false},
			"jasa_giling": {Create: true, Read: true, Update: true, Delete: false},
			"stok":        {Create: false, Read: true, Update: false, Delete: false},
			"produk":      {Create: false, Read: true, Update: false, Delete: false},
		},
		model.RoleGudang: {
			"pembelian": {Create: true, Read: true, Update: true, Delete: false},
			"produksi":  {Create: true, Read: true, Update: true, Delete: false},
			"stok":      {Create: true, Read: true, Update: true, Delete: false},
			"karung":    {Create: true, Read: true, Update: true, Delete: false},
		},
		model.RoleViewer: {
			"all": {Create: false, Read: true, Update: false, Delete: false},
		},
	}

	if role == model.RoleOwner || role == model.RoleViewer {
		return permissions[role]["all"]
	}

	if perm, exists := permissions[role][module]; exists {
		return perm
	}

	return Permission{Create: false, Read: false, Update: false, Delete: false}
}

// Check if user can delete based on creation date
func CanDeleteByDate(role model.UserRole, createdAt time.Time) bool {
	if role == model.RoleOwner {
		return true
	}

	if role == model.RoleAdmin {
		// Admin can only delete today's transactions
		today := time.Now().Truncate(24 * time.Hour)
		recordDate := createdAt.Truncate(24 * time.Hour)
		return recordDate.Equal(today)
	}

	return false
}
