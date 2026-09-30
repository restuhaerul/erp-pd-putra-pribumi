package model

import (
	"log"
	"time"

	"golang.org/x/crypto/bcrypt"
)

type UserRole string

const (
	RoleOwner  UserRole = "OWNER"
	RoleAdmin  UserRole = "ADMIN"
	RoleKasir  UserRole = "KASIR"
	RoleGudang UserRole = "GUDANG"
	RoleViewer UserRole = "VIEWER"
)

type User struct {
	ID        uint      `json:"id" gorm:"primaryKey;autoIncrement"`
	Username  string    `json:"username" gorm:"type:varchar(50);unique;not null"`
	Password  string    `json:"-" gorm:"type:varchar(255);not null"`
	FullName  string    `json:"full_name" gorm:"type:varchar(100);not null"`
	PhotoURL  *string   `json:"photo_url" gorm:"type:varchar(255);default:null"` // ← TAMBAHAN
	Role      string    `json:"role" gorm:"type:enum('OWNER','ADMIN','KASIR','GUDANG','VIEWER');not null"`
	IsActive  bool      `json:"is_active" gorm:"type:boolean;default:true"`
	CreatedAt time.Time `json:"created_at" gorm:"type:timestamp;default:CURRENT_TIMESTAMP"`
	UpdatedAt time.Time `json:"updated_at" gorm:"type:timestamp;default:CURRENT_TIMESTAMP on update CURRENT_TIMESTAMP"`
}

type UserActivityLog struct {
	ID          uint      `json:"id" gorm:"primaryKey;autoIncrement"`
	UserID      uint      `json:"user_id" gorm:"not null;index"`
	Action      string    `json:"action" gorm:"type:varchar(50);not null"`
	Module      string    `json:"module" gorm:"type:varchar(50);not null"`
	RecordID    *uint     `json:"record_id"`
	Description string    `json:"description" gorm:"type:text"`
	IPAddress   string    `json:"ip_address" gorm:"type:varchar(45)"`
	Timestamp   time.Time `json:"timestamp" gorm:"type:timestamp;default:CURRENT_TIMESTAMP"`

	User User `json:"user" gorm:"foreignKey:UserID;references:ID"`
}

func (u *User) HashPassword(password string) error {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 10)
	if err != nil {
		return err
	}
	u.Password = string(bytes)
	return nil
}

func (u *User) CheckPassword(password string) bool {
	log.Println("CheckPassword() -> comparing:", password, "with hash:", u.Password)
	err := bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(password))
	if err != nil {
		log.Println("bcrypt error:", err)
	}
	return err == nil
}
