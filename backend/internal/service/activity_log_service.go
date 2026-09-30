package service

import (
	"bytes"
	"encoding/csv"
	"fmt"
	"time"

	"putra-pribumi/internal/repository"
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

type PaginatedActivityLogsResponse struct {
	Data       []repository.ActivityLogWithUser `json:"data"`
	Pagination PaginationInfo                   `json:"pagination"`
}

type PaginationInfo struct {
	CurrentPage  int  `json:"current_page"`
	TotalPages   int  `json:"total_pages"`
	TotalItems   int  `json:"total_items"`
	ItemsPerPage int  `json:"items_per_page"`
	HasNext      bool `json:"has_next"`
	HasPrev      bool `json:"has_prev"`
}

type ActivityLogStats struct {
	TotalActivities    int                  `json:"total_activities"`
	ActivitiesByAction map[string]int       `json:"activities_by_action"`
	ActivitiesByModule map[string]int       `json:"activities_by_module"`
	ActivitiesByUser   map[string]int       `json:"activities_by_user"`
	ActivityTrend      []DailyActivityCount `json:"activity_trend"`
	MostActiveUsers    []UserActivityCount  `json:"most_active_users"`
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

type ServiceActivityLogs interface {
	GetActivityLogs(filters ActivityLogFilters) (PaginatedActivityLogsResponse, error)
	GetActivityLogByID(id uint) (repository.ActivityLogWithUser, error)
	GetActivityLogStats(filters ActivityLogFilters) (ActivityLogStats, error)
	ExportActivityLogsToCSV(filters ActivityLogFilters) ([]byte, error)
	GetAllUsers() ([]repository.UserBasicInfo, error)
}

type activityLogsService struct {
	repo repository.RepositoryActivityLogs
}

func NewActivityLogsService(repo repository.RepositoryActivityLogs) *activityLogsService {
	return &activityLogsService{repo}
}

func (s *activityLogsService) GetActivityLogs(filters ActivityLogFilters) (PaginatedActivityLogsResponse, error) {
	// Set default pagination
	if filters.Page == 0 {
		filters.Page = 1
	}
	if filters.PerPage == 0 {
		filters.PerPage = 10
	}

	// Convert to repository filters
	repoFilters := repository.ActivityLogFilters{
		Page:     filters.Page,
		PerPage:  filters.PerPage,
		Action:   filters.Action,
		Module:   filters.Module,
		UserID:   filters.UserID,
		DateFrom: filters.DateFrom,
		DateTo:   filters.DateTo,
	}

	// Get logs from repository
	logs, totalItems, err := s.repo.GetActivityLogsWithPagination(repoFilters)
	if err != nil {
		return PaginatedActivityLogsResponse{}, err
	}

	// Calculate pagination info
	totalPages := (totalItems + filters.PerPage - 1) / filters.PerPage
	if totalPages == 0 {
		totalPages = 1
	}

	paginationInfo := PaginationInfo{
		CurrentPage:  filters.Page,
		TotalPages:   totalPages,
		TotalItems:   totalItems,
		ItemsPerPage: filters.PerPage,
		HasNext:      filters.Page < totalPages,
		HasPrev:      filters.Page > 1,
	}

	return PaginatedActivityLogsResponse{
		Data:       logs,
		Pagination: paginationInfo,
	}, nil
}

func (s *activityLogsService) GetActivityLogByID(id uint) (repository.ActivityLogWithUser, error) {
	return s.repo.GetActivityLogByID(id)
}

func (s *activityLogsService) GetActivityLogStats(filters ActivityLogFilters) (ActivityLogStats, error) {
	repoFilters := repository.ActivityLogFilters{
		Action:   filters.Action,
		Module:   filters.Module,
		UserID:   filters.UserID,
		DateFrom: filters.DateFrom,
		DateTo:   filters.DateTo,
	}

	// Get total count
	totalCount, err := s.repo.GetActivityLogsCount(repoFilters)
	if err != nil {
		return ActivityLogStats{}, err
	}

	// Get activities by action
	actionStats, err := s.repo.GetActivitiesByAction(repoFilters)
	if err != nil {
		return ActivityLogStats{}, err
	}

	// Get activities by module
	moduleStats, err := s.repo.GetActivitiesByModule(repoFilters)
	if err != nil {
		return ActivityLogStats{}, err
	}

	// Get activities by user
	userStats, err := s.repo.GetActivitiesByUser(repoFilters)
	if err != nil {
		return ActivityLogStats{}, err
	}

	// Get daily activity trend (last 7 days)
	trendData, err := s.repo.GetDailyActivityTrend(repoFilters, 7)
	if err != nil {
		return ActivityLogStats{}, err
	}

	// Get most active users
	mostActiveUsers, err := s.repo.GetMostActiveUsers(repoFilters, 5)
	if err != nil {
		return ActivityLogStats{}, err
	}

	return ActivityLogStats{
		TotalActivities:    totalCount,
		ActivitiesByAction: actionStats,
		ActivitiesByModule: moduleStats,
		ActivitiesByUser:   userStats,
		ActivityTrend:      convertToDailyActivityCount(trendData),
		MostActiveUsers:    convertToUserActivityCount(mostActiveUsers),
	}, nil
}

func (s *activityLogsService) ExportActivityLogsToCSV(filters ActivityLogFilters) ([]byte, error) {
	// Remove pagination for export (get all data)
	repoFilters := repository.ActivityLogFilters{
		Action:   filters.Action,
		Module:   filters.Module,
		UserID:   filters.UserID,
		DateFrom: filters.DateFrom,
		DateTo:   filters.DateTo,
	}

	logs, err := s.repo.GetAllActivityLogsForExport(repoFilters)
	if err != nil {
		return nil, err
	}

	// Create CSV buffer
	var buf bytes.Buffer
	writer := csv.NewWriter(&buf)

	// Write CSV header
	header := []string{
		"ID",
		"Timestamp",
		"User ID",
		"Username",
		"Full Name",
		"Action",
		"Module",
		"Description",
		"Record ID",
		"IP Address",
	}
	if err := writer.Write(header); err != nil {
		return nil, fmt.Errorf("error writing CSV header: %w", err)
	}

	// Write data rows
	for _, log := range logs {
		username := ""
		fullName := ""
		if log.User != nil {
			username = log.User.Username
			fullName = log.User.FullName
		}

		recordID := ""
		if log.RecordID != nil {
			recordID = fmt.Sprintf("%d", *log.RecordID)
		}

		record := []string{
			fmt.Sprintf("%d", log.ID),
			log.Timestamp.Format("2006-01-02 15:04:05"),
			fmt.Sprintf("%d", log.UserID),
			username,
			fullName,
			log.Action,
			log.Module,
			log.Description,
			recordID,
			log.IPAddress,
		}
		if err := writer.Write(record); err != nil {
			return nil, fmt.Errorf("error writing CSV record: %w", err)
		}
	}

	writer.Flush()
	if err := writer.Error(); err != nil {
		return nil, fmt.Errorf("error flushing CSV writer: %w", err)
	}

	return buf.Bytes(), nil
}

func (s *activityLogsService) GetAllUsers() ([]repository.UserBasicInfo, error) {
	return s.repo.GetAllUsers()
}

// Helper functions
func getStringValue(ptr *string) string {
	if ptr == nil {
		return ""
	}
	return *ptr
}

func getUintValue(ptr *uint) uint {
	if ptr == nil {
		return 0
	}
	return *ptr
}

// Convert repository types to service types
func convertToDailyActivityCount(repoData []repository.DailyActivityCount) []DailyActivityCount {
	result := make([]DailyActivityCount, len(repoData))
	for i, item := range repoData {
		result[i] = DailyActivityCount{
			Date:  item.Date,
			Count: item.Count,
		}
	}
	return result
}

func convertToUserActivityCount(repoData []repository.UserActivityCount) []UserActivityCount {
	result := make([]UserActivityCount, len(repoData))
	for i, item := range repoData {
		result[i] = UserActivityCount{
			UserID:        item.UserID,
			Username:      item.Username,
			FullName:      item.FullName,
			ActivityCount: item.ActivityCount,
		}
	}
	return result
}
