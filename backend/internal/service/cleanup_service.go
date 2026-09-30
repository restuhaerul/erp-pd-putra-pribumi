package service

import (
	"log"
	"putra-pribumi/internal/model"
	"time"

	"gorm.io/gorm"
)

type CleanupService struct {
	db *gorm.DB
}

func NewCleanupService(db *gorm.DB) *CleanupService {
	return &CleanupService{db: db}
}

// StartCleanupScheduler runs cleanup every day at midnight
func (s *CleanupService) StartCleanupScheduler() {
	go func() {
		for {
			// Calculate time until next midnight
			now := time.Now()
			nextMidnight := time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, now.Location())
			duration := nextMidnight.Sub(now)

			// Wait until midnight
			time.Sleep(duration)

			// Run cleanup
			if err := s.CleanupOldLogs(); err != nil {
				log.Printf("Error cleaning up old logs: %v", err)
			}

			// Sleep for 1 minute to avoid running multiple times
			time.Sleep(time.Minute)
		}
	}()
}

// CleanupOldLogs removes logs older than 90 days
func (s *CleanupService) CleanupOldLogs() error {
	cutoffDate := time.Now().AddDate(0, 0, -90) // 90 days ago

	result := s.db.Where("timestamp < ?", cutoffDate).Delete(&model.UserActivityLog{})
	if result.Error != nil {
		return result.Error
	}

	log.Printf("Cleaned up %d old activity logs", result.RowsAffected)
	return nil
}

// Manual cleanup function (can be called via API endpoint)
func (s *CleanupService) ManualCleanup(days int) (int64, error) {
	cutoffDate := time.Now().AddDate(0, 0, -days)

	result := s.db.Where("timestamp < ?", cutoffDate).Delete(&model.UserActivityLog{})
	if result.Error != nil {
		return 0, result.Error
	}

	return result.RowsAffected, nil
}
