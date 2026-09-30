package service

import (
	"errors"
	"log"
	"putra-pribumi/internal/model"
	"putra-pribumi/internal/repository"
)

type UserService interface {
	Authenticate(username, password string) (*model.User, error)
	GetByID(id uint) (*model.User, error)
	GetAll() ([]model.User, error)
	Create(user *model.User) error
	Update(id uint, updates map[string]interface{}) error
	Delete(id uint) error
	ChangePassword(userID uint, oldPassword, newPassword string) error
	LogActivity(userID uint, action, module string, recordID *uint, description, ipAddress string)
}

type userService struct {
	userRepo repository.UserRepository
}

func NewUserService(userRepo repository.UserRepository) UserService {
	return &userService{userRepo: userRepo}
}

func (s *userService) Authenticate(username, password string) (*model.User, error) {
	user, err := s.userRepo.GetByUsername(username)
	if err != nil {
		log.Println("Login gagal: user tidak ditemukan", username)
		return nil, errors.New("user tidak ditemukan")
	}

	log.Println("Mencoba login:", username)
	log.Println("Password input:", password)

	if !user.CheckPassword(password) {
		log.Println("Login gagal: password salah")
		return nil, errors.New("password salah")
	}

	if !user.IsActive {
		log.Println("Login gagal: user tidak aktif")
		return nil, errors.New("akun tidak aktif")
	}

	return user, nil
}

func (s *userService) GetByID(id uint) (*model.User, error) {
	return s.userRepo.GetByID(id)
}

func (s *userService) GetAll() ([]model.User, error) {
	return s.userRepo.GetAll()
}

func (s *userService) Create(user *model.User) error {
	// Hash password before saving
	if err := user.HashPassword(user.Password); err != nil {
		return err
	}
	return s.userRepo.Create(user)
}

func (s *userService) Update(id uint, updates map[string]interface{}) error {
	return s.userRepo.Update(id, updates)
}

func (s *userService) Delete(id uint) error {
	return s.userRepo.Delete(id)
}

func (s *userService) ChangePassword(userID uint, oldPassword, newPassword string) error {
	user, err := s.userRepo.GetByID(userID)
	if err != nil {
		return err
	}

	if !user.CheckPassword(oldPassword) {
		return errors.New("password lama salah")
	}

	user.Password = newPassword
	if err := user.HashPassword(newPassword); err != nil {
		return err
	}

	return s.userRepo.Update(userID, map[string]interface{}{
		"password": user.Password,
	})
}

func (s *userService) LogActivity(userID uint, action, module string, recordID *uint, description, ipAddress string) {
	log := &model.UserActivityLog{
		UserID:      userID,
		Action:      action,
		Module:      module,
		RecordID:    recordID,
		Description: description,
		IPAddress:   ipAddress,
	}
	s.userRepo.LogActivity(log)
}
