package repository

import (
	"putra-pribumi/internal/model"
	"time"

	"gorm.io/gorm"
)

type ActivityLogFilters struct {
	Page     int
	PerPage  int
	Action   string
	Module   string
	UserID   uint
	DateFrom *time.Time
	DateTo   *time.Time
}

type ActivityLogWithUser struct {
	ID          uint           `json:"id"`
	UserID      uint           `json:"user_id"`
	User        *UserBasicInfo `json:"user,omitempty"`
	Action      string         `json:"action"`
	Module      string         `json:"module"`
	RecordID    *uint          `json:"record_id,omitempty"`
	Description string         `json:"description"`
	IPAddress   string         `json:"ip_address"`
	Timestamp   time.Time      `json:"timestamp"`
}

type UserBasicInfo struct {
	ID       uint    `json:"id"`
	Username string  `json:"username"`
	FullName string  `json:"full_name"`
	PhotoURL *string `json:"photo_url,omitempty"`
	Role     string  `json:"role,omitempty"`
	IsActive bool    `json:"is_active,omitempty"`
}

type DailyActivityCount struct {
	Date  string `json:"date"`
	Count int    `json:"count"`
}

type UserActivityCount struct {
	UserID        uint   `json:"user_id"`
	Username      string `json:"username"`
	FullName      string `json:"full_name"`
	ActivityCount int    `json:"activity_count"`
}

type RepositoryActivityLogs interface {
	GetActivityLogsWithPagination(filters ActivityLogFilters) ([]ActivityLogWithUser, int, error)
	GetActivityLogByID(id uint) (ActivityLogWithUser, error)
	GetActivityLogsCount(filters ActivityLogFilters) (int, error)
	GetActivitiesByAction(filters ActivityLogFilters) (map[string]int, error)
	GetActivitiesByModule(filters ActivityLogFilters) (map[string]int, error)
	GetActivitiesByUser(filters ActivityLogFilters) (map[string]int, error)
	GetDailyActivityTrend(filters ActivityLogFilters, days int) ([]DailyActivityCount, error)
	GetMostActiveUsers(filters ActivityLogFilters, limit int) ([]UserActivityCount, error)
	GetAllActivityLogsForExport(filters ActivityLogFilters) ([]ActivityLogWithUser, error)
	GetAllUsers() ([]UserBasicInfo, error)
}

type activityLogsRepository struct {
	db *gorm.DB
}

func NewActivityLogsRepository(db *gorm.DB) *activityLogsRepository {
	return &activityLogsRepository{db}
}

func (r *activityLogsRepository) GetActivityLogsWithPagination(filters ActivityLogFilters) ([]ActivityLogWithUser, int, error) {
	var logs []model.UserActivityLog
	var totalCount int64

	// Build base query
	query := r.db.Model(&model.UserActivityLog{})
	countQuery := r.db.Model(&model.UserActivityLog{})

	// Apply filters
	query = r.applyFilters(query, filters)
	countQuery = r.applyFilters(countQuery, filters)

	// Get total count
	if err := countQuery.Count(&totalCount).Error; err != nil {
		return nil, 0, err
	}

	// Apply pagination and get data with user info
	offset := (filters.Page - 1) * filters.PerPage
	err := query.
		Preload("User").
		Order("timestamp DESC").
		Offset(offset).
		Limit(filters.PerPage).
		Find(&logs).Error

	if err != nil {
		return nil, 0, err
	}

	// Convert to response format
	result := make([]ActivityLogWithUser, len(logs))
	for i, log := range logs {
		result[i] = ActivityLogWithUser{
			ID:          log.ID,
			UserID:      log.UserID,
			Action:      log.Action,
			Module:      log.Module,
			RecordID:    log.RecordID,
			Description: log.Description,
			IPAddress:   log.IPAddress,
			Timestamp:   log.Timestamp,
		}

		if log.User.ID != 0 { // Check if user data is loaded
			result[i].User = &UserBasicInfo{
				ID:       log.User.ID,
				Username: log.User.Username,
				FullName: log.User.FullName,
				PhotoURL: log.User.PhotoURL,
				Role:     log.User.Role,
				IsActive: log.User.IsActive,
			}
		}
	}

	return result, int(totalCount), nil
}

func (r *activityLogsRepository) GetActivityLogByID(id uint) (ActivityLogWithUser, error) {
	var log model.UserActivityLog
	err := r.db.Model(&model.UserActivityLog{}).
		Preload("User").
		Where("id = ?", id).
		First(&log).Error

	if err != nil {
		return ActivityLogWithUser{}, err
	}

	result := ActivityLogWithUser{
		ID:          log.ID,
		UserID:      log.UserID,
		Action:      log.Action,
		Module:      log.Module,
		RecordID:    log.RecordID,
		Description: log.Description,
		IPAddress:   log.IPAddress,
		Timestamp:   log.Timestamp,
	}

	if log.User.ID != 0 {
		result.User = &UserBasicInfo{
			ID:       log.User.ID,
			Username: log.User.Username,
			FullName: log.User.FullName,
			PhotoURL: log.User.PhotoURL,
			Role:     log.User.Role,
			IsActive: log.User.IsActive,
		}
	}

	return result, nil
}

func (r *activityLogsRepository) GetActivityLogsCount(filters ActivityLogFilters) (int, error) {
	var count int64
	query := r.db.Model(&model.UserActivityLog{})
	query = r.applyFilters(query, filters)

	err := query.Count(&count).Error
	return int(count), err
}

func (r *activityLogsRepository) GetActivitiesByAction(filters ActivityLogFilters) (map[string]int, error) {
	var results []struct {
		Action string
		Count  int
	}

	query := r.db.Model(&model.UserActivityLog{})
	query = r.applyFilters(query, filters)

	err := query.
		Select("action, COUNT(*) as count").
		Group("action").
		Order("count DESC").
		Scan(&results).Error

	if err != nil {
		return nil, err
	}

	actionStats := make(map[string]int)
	for _, result := range results {
		actionStats[result.Action] = result.Count
	}

	return actionStats, nil
}

func (r *activityLogsRepository) GetActivitiesByModule(filters ActivityLogFilters) (map[string]int, error) {
	var results []struct {
		Module string
		Count  int
	}

	query := r.db.Model(&model.UserActivityLog{})
	query = r.applyFilters(query, filters)

	err := query.
		Select("module, COUNT(*) as count").
		Group("module").
		Order("count DESC").
		Scan(&results).Error

	if err != nil {
		return nil, err
	}

	moduleStats := make(map[string]int)
	for _, result := range results {
		moduleStats[result.Module] = result.Count
	}

	return moduleStats, nil
}

func (r *activityLogsRepository) GetActivitiesByUser(filters ActivityLogFilters) (map[string]int, error) {
	var results []struct {
		FullName string
		Count    int
	}

	query := r.db.Model(&model.UserActivityLog{})
	query = r.applyFilters(query, filters)

	err := query.
		Joins("LEFT JOIN user ON user.id = user_activity_log.user_id").
		Select("COALESCE(user.full_name, 'Unknown User') as full_name, COUNT(*) as count").
		Group("user.full_name").
		Order("count DESC").
		Scan(&results).Error

	if err != nil {
		return nil, err
	}

	userStats := make(map[string]int)
	for _, result := range results {
		userStats[result.FullName] = result.Count
	}

	return userStats, nil
}

func (r *activityLogsRepository) GetDailyActivityTrend(filters ActivityLogFilters, days int) ([]DailyActivityCount, error) {
	var results []DailyActivityCount

	// Set date range for trend if not provided
	endDate := time.Now()
	startDate := endDate.AddDate(0, 0, -days+1)

	if filters.DateTo == nil {
		filters.DateTo = &endDate
	}
	if filters.DateFrom == nil {
		filters.DateFrom = &startDate
	}

	query := r.db.Model(&model.UserActivityLog{})
	query = r.applyFilters(query, filters)

	err := query.
		Select("DATE(timestamp) as date, COUNT(*) as count").
		Group("DATE(timestamp)").
		Order("date ASC").
		Scan(&results).Error

	return results, err
}

func (r *activityLogsRepository) GetMostActiveUsers(filters ActivityLogFilters, limit int) ([]UserActivityCount, error) {
	var results []UserActivityCount

	query := r.db.Model(&model.UserActivityLog{})
	query = r.applyFilters(query, filters)

	err := query.
		Joins("LEFT JOIN user ON user.id = user_activity_log.user_id").
		Select("user_activity_log.user_id, COALESCE(user.username, '') as username, COALESCE(user.full_name, 'Unknown User') as full_name, COUNT(*) as activity_count").
		Group("user_activity_log.user_id, user.username, user.full_name").
		Order("activity_count DESC").
		Limit(limit).
		Scan(&results).Error

	return results, err
}

func (r *activityLogsRepository) GetAllActivityLogsForExport(filters ActivityLogFilters) ([]ActivityLogWithUser, error) {
	var logs []model.UserActivityLog

	query := r.db.Model(&model.UserActivityLog{})
	query = r.applyFilters(query, filters)

	err := query.
		Preload("User").
		Order("timestamp DESC").
		Find(&logs).Error

	if err != nil {
		return nil, err
	}

	// Convert to response format
	result := make([]ActivityLogWithUser, len(logs))
	for i, log := range logs {
		result[i] = ActivityLogWithUser{
			ID:          log.ID,
			UserID:      log.UserID,
			Action:      log.Action,
			Module:      log.Module,
			RecordID:    log.RecordID,
			Description: log.Description,
			IPAddress:   log.IPAddress,
			Timestamp:   log.Timestamp,
		}

		if log.User.ID != 0 {
			result[i].User = &UserBasicInfo{
				ID:       log.User.ID,
				Username: log.User.Username,
				FullName: log.User.FullName,
				PhotoURL: log.User.PhotoURL,
				Role:     log.User.Role,
				IsActive: log.User.IsActive,
			}
		}
	}

	return result, nil
}

func (r *activityLogsRepository) GetAllUsers() ([]UserBasicInfo, error) {
	var users []model.User

	err := r.db.Model(&model.User{}).
		Where("is_active = ?", true).
		Order("full_name ASC").
		Find(&users).Error

	if err != nil {
		return nil, err
	}

	// Convert to response format
	result := make([]UserBasicInfo, len(users))
	for i, user := range users {
		result[i] = UserBasicInfo{
			ID:       user.ID,
			Username: user.Username,
			FullName: user.FullName,
			PhotoURL: user.PhotoURL,
			Role:     user.Role,
			IsActive: user.IsActive,
		}
	}

	return result, nil
}

// Helper function to apply filters to query
func (r *activityLogsRepository) applyFilters(query *gorm.DB, filters ActivityLogFilters) *gorm.DB {
	if filters.Action != "" {
		query = query.Where("action = ?", filters.Action)
	}

	if filters.Module != "" {
		query = query.Where("module = ?", filters.Module)
	}

	if filters.UserID != 0 {
		query = query.Where("user_id = ?", filters.UserID)
	}

	if filters.DateFrom != nil {
		query = query.Where("timestamp >= ?", *filters.DateFrom)
	}

	if filters.DateTo != nil {
		query = query.Where("timestamp <= ?", *filters.DateTo)
	}

	return query
}
