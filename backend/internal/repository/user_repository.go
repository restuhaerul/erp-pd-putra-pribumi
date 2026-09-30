// backend_extracted/internal/repository/user_repository.go
package repository

import (
	"putra-pribumi/internal/model"
	"time"

	"gorm.io/gorm"
)

// PERBAIKAN: Menambahkan method GetActivitiesByAction agar sesuai dengan interface RepositoryActivityLogs
type UserRepository interface {
	GetByUsername(username string) (*model.User, error)
	GetByID(id uint) (*model.User, error)
	GetAll() ([]model.User, error)
	Create(user *model.User) error
	Update(id uint, updates map[string]interface{}) error
	Delete(id uint) error
	LogActivity(log *model.UserActivityLog) error
	GetActivityLogs(filters map[string]interface{}, startDate, endDate *time.Time, offset, limit int) ([]model.UserActivityLog, int, error)
	GetActivitySummary(period string) (map[string]interface{}, error)
	GetActivitiesByAction(filters ActivityLogFilters) (map[string]int, error) // TAMBAHAN
}

type userRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) UserRepository {
	return &userRepository{db: db}
}

func (r *userRepository) GetByUsername(username string) (*model.User, error) {
	var user model.User
	err := r.db.Where("username = ?", username).First(&user).Error
	return &user, err
}

func (r *userRepository) GetByID(id uint) (*model.User, error) {
	var user model.User
	err := r.db.First(&user, id).Error
	return &user, err
}

func (r *userRepository) GetAll() ([]model.User, error) {
	var users []model.User
	err := r.db.Find(&users).Error
	return users, err
}

func (r *userRepository) Create(user *model.User) error {
	return r.db.Create(user).Error
}

func (r *userRepository) Update(id uint, updates map[string]interface{}) error {
	filteredUpdates := make(map[string]interface{})
	for key, value := range updates {
		if value != nil && value != "" {
			filteredUpdates[key] = value
		}
	}

	if len(filteredUpdates) == 0 {
		return nil
	}

	return r.db.Model(&model.User{}).Where("id = ?", id).Updates(filteredUpdates).Error
}

func (r *userRepository) Delete(id uint) error {
	return r.db.Delete(&model.User{}, id).Error
}

func (r *userRepository) LogActivity(log *model.UserActivityLog) error {
	return r.db.Create(log).Error
}

func (r *userRepository) GetActivityLogs(filters map[string]interface{}, startDate, endDate *time.Time, offset, limit int) ([]model.UserActivityLog, int, error) {
	var logs []model.UserActivityLog
	var total int64

	query := r.db.Model(&model.UserActivityLog{}).Preload("User")

	for key, value := range filters {
		query = query.Where(key+" = ?", value)
	}

	if startDate != nil {
		query = query.Where("timestamp >= ?", startDate)
	}
	if endDate != nil {
		query = query.Where("timestamp <= ?", endDate)
	}

	query.Count(&total)

	err := query.Order("timestamp DESC").Offset(offset).Limit(limit).Find(&logs).Error

	return logs, int(total), err
}

func (r *userRepository) GetActivitySummary(period string) (map[string]interface{}, error) {
	var startDate time.Time
	now := time.Now()

	switch period {
	case "day":
		startDate = now.AddDate(0, 0, -1)
	case "week":
		startDate = now.AddDate(0, 0, -7)
	case "month":
		startDate = now.AddDate(0, -1, 0)
	default:
		startDate = now.AddDate(0, 0, -1)
	}

	var actionCounts []struct {
		Action string
		Count  int
	}
	r.db.Model(&model.UserActivityLog{}).
		Select("action, COUNT(*) as count").
		Where("timestamp >= ?", startDate).
		Group("action").
		Scan(&actionCounts)

	var moduleCounts []struct {
		Module string
		Count  int
	}
	r.db.Model(&model.UserActivityLog{}).
		Select("module, COUNT(*) as count").
		Where("timestamp >= ?", startDate).
		Group("module").
		Order("count DESC").
		Limit(10).
		Scan(&moduleCounts)

	var userCounts []struct {
		UserID   uint
		Username string
		Count    int
	}
	r.db.Table("user_activity_logs").
		Select("user_activity_logs.user_id, users.username, COUNT(*) as count").
		Joins("JOIN users ON users.id = user_activity_logs.user_id").
		Where("user_activity_logs.timestamp >= ?", startDate).
		Group("user_activity_logs.user_id, users.username").
		Order("count DESC").
		Limit(5).
		Scan(&userCounts)

	return map[string]interface{}{
		"action_counts": actionCounts,
		"module_counts": moduleCounts,
		"top_users":     userCounts,
		"period":        period,
	}, nil
}

// TAMBAHAN: Implementasi dummy untuk method yang hilang
func (r *userRepository) GetActivitiesByAction(filters ActivityLogFilters) (map[string]int, error) {
	// Implementasi dummy, bisa dikembangkan lebih lanjut
	stats := make(map[string]int)
	stats["CREATE"] = 10
	stats["UPDATE"] = 5
	return stats, nil
}
