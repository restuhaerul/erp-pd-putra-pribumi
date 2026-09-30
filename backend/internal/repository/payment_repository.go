// internal/repository/payment_repository.go
package repository

import (
	"putra-pribumi/internal/model"

	"gorm.io/gorm"
)

type RepositoryPayment interface {
	CreatePayment(tx *gorm.DB, payment model.Payment) (model.Payment, error)
	CreateAllocation(tx *gorm.DB, allocation model.PaymentAllocation) (model.PaymentAllocation, error)
}

type paymentRepository struct {
	db *gorm.DB
}

func NewPaymentRepository(db *gorm.DB) *paymentRepository {
	return &paymentRepository{db}
}

func (r *paymentRepository) CreatePayment(tx *gorm.DB, payment model.Payment) (model.Payment, error) {
	err := tx.Create(&payment).Error
	return payment, err
}

func (r *paymentRepository) CreateAllocation(tx *gorm.DB, allocation model.PaymentAllocation) (model.PaymentAllocation, error) {
	err := tx.Create(&allocation).Error
	return allocation, err
}
