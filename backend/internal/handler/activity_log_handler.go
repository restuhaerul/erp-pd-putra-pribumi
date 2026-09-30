// internal/handler/activity_log_handler.go
package handler

import (
	"net/http"
	"strconv"
	"time"

	"putra-pribumi/internal/service"

	"github.com/gin-gonic/gin"
)

type activityLogsHandler struct {
	service service.ServiceActivityLogs
}

func NewActivityLogsHandler(s service.ServiceActivityLogs) *activityLogsHandler {
	return &activityLogsHandler{s}
}

type ActivityLogFilters struct {
	Page     int    `form:"page" binding:"omitempty,min=1"`
	PerPage  int    `form:"per_page" binding:"omitempty,min=1,max=100"`
	Action   string `form:"action"`
	Module   string `form:"module"`
	UserID   uint   `form:"user_id"`
	DateFrom string `form:"date_from"`
	DateTo   string `form:"date_to"`
}

func (h *activityLogsHandler) GetActivityLogs(c *gin.Context) {
	var filters ActivityLogFilters

	if err := c.ShouldBindQuery(&filters); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid query parameters"})
		return
	}

	if filters.Page == 0 {
		filters.Page = 1
	}
	if filters.PerPage == 0 {
		filters.PerPage = 10
	}

	var dateFrom, dateTo *time.Time
	if filters.DateFrom != "" {
		if parsed, err := time.Parse("2006-01-02", filters.DateFrom); err == nil {
			dateFrom = &parsed
		}
	}
	if filters.DateTo != "" {
		if parsed, err := time.Parse("2006-01-02", filters.DateTo); err == nil {
			endOfDay := time.Date(parsed.Year(), parsed.Month(), parsed.Day(), 23, 59, 59, 999999999, parsed.Location())
			dateTo = &endOfDay
		}
	}

	serviceFilters := service.ActivityLogFilters{
		Page:     filters.Page,
		PerPage:  filters.PerPage,
		Action:   filters.Action,
		Module:   filters.Module,
		UserID:   filters.UserID,
		DateFrom: dateFrom,
		DateTo:   dateTo,
	}

	result, err := h.service.GetActivityLogs(serviceFilters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch activity logs"})
		return
	}

	c.JSON(http.StatusOK, result)
}

func (h *activityLogsHandler) GetActivityLogDetail(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid activity log ID"})
		return
	}

	log, err := h.service.GetActivityLogByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Activity log not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": log})
}

// PERBAIKAN: Mengganti nama method dari GetActivityLogStats menjadi GetActivitySummary
func (h *activityLogsHandler) GetActivitySummary(c *gin.Context) {
	var filters ActivityLogFilters

	if err := c.ShouldBindQuery(&filters); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid query parameters"})
		return
	}

	var dateFrom, dateTo *time.Time
	if filters.DateFrom != "" {
		if parsed, err := time.Parse("2006-01-02", filters.DateFrom); err == nil {
			dateFrom = &parsed
		}
	}
	if filters.DateTo != "" {
		if parsed, err := time.Parse("2006-01-02", filters.DateTo); err == nil {
			endOfDay := time.Date(parsed.Year(), parsed.Month(), parsed.Day(), 23, 59, 59, 999999999, parsed.Location())
			dateTo = &endOfDay
		}
	}

	serviceFilters := service.ActivityLogFilters{
		Action:   filters.Action,
		Module:   filters.Module,
		UserID:   filters.UserID,
		DateFrom: dateFrom,
		DateTo:   dateTo,
	}

	stats, err := h.service.GetActivityLogStats(serviceFilters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch activity log statistics"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": stats})
}

func (h *activityLogsHandler) ExportActivityLogs(c *gin.Context) {
	var filters ActivityLogFilters

	if err := c.ShouldBindQuery(&filters); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid query parameters"})
		return
	}

	var dateFrom, dateTo *time.Time
	if filters.DateFrom != "" {
		if parsed, err := time.Parse("2006-01-02", filters.DateFrom); err == nil {
			dateFrom = &parsed
		}
	}
	if filters.DateTo != "" {
		if parsed, err := time.Parse("2006-01-02", filters.DateTo); err == nil {
			endOfDay := time.Date(parsed.Year(), parsed.Month(), parsed.Day(), 23, 59, 59, 999999999, parsed.Location())
			dateTo = &endOfDay
		}
	}

	serviceFilters := service.ActivityLogFilters{
		Action:   filters.Action,
		Module:   filters.Module,
		UserID:   filters.UserID,
		DateFrom: dateFrom,
		DateTo:   dateTo,
	}

	csvData, err := h.service.ExportActivityLogsToCSV(serviceFilters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to export activity logs"})
		return
	}

	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", "attachment; filename=activity_logs_export.csv")
	c.Data(http.StatusOK, "text/csv", csvData)
}

func (h *activityLogsHandler) GetUsers(c *gin.Context) {
	users, err := h.service.GetAllUsers()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": users})
}
