package service

import (
	"errors"
	"fmt"
	"putra-pribumi/internal/model"
	"putra-pribumi/internal/repository"
	"time"

	"gorm.io/gorm"
)

type ServicePayment interface {
	CreatePayment(input InputPembayaran, userID uint) (model.Payment, error)
}

type paymentService struct {
	paymentRepo repository.RepositoryPayment
	hutangRepo  repository.RepositoryHutang
	piutangRepo repository.RepositoryPiutang
	akunKasRepo repository.RepositoryAkunKas
	db          *gorm.DB
}

func NewPaymentService(
	paymentRepo repository.RepositoryPayment,
	hutangRepo repository.RepositoryHutang,
	piutangRepo repository.RepositoryPiutang,
	akunKasRepo repository.RepositoryAkunKas,
	db *gorm.DB,
) *paymentService {
	return &paymentService{paymentRepo, hutangRepo, piutangRepo, akunKasRepo, db}
}

type AlokasiInput struct {
	TargetID           uint    `json:"target_id" binding:"required"`
	JumlahDialokasikan float64 `json:"jumlah_dialokasikan" binding:"required"`
}

type InputPembayaran struct {
	TanggalBayar string         `json:"tanggal_bayar" binding:"required"`
	AkunKasID    uint           `json:"akun_kas_id" binding:"required"`
	JumlahTotal  float64        `json:"jumlah_total" binding:"required"`
	Metode       string         `json:"metode"`
	Memo         string         `json:"memo"`
	TargetType   string         `json:"target_type" binding:"required,oneof=PIUTANG HUTANG"`
	Alokasi      []AlokasiInput `json:"alokasi" binding:"required,dive"`
}

// ======================================================================
// --- GANTI SELURUH FUNGSI INI DENGAN VERSI FINAL ---
// ======================================================================
func (s *paymentService) CreatePayment(input InputPembayaran, userID uint) (model.Payment, error) {
	var payment model.Payment

	tanggalBayar, err := time.Parse("2006-01-02", input.TanggalBayar)
	if err != nil {
		return model.Payment{}, errors.New("format tanggal tidak valid")
	}

	var totalAlokasi float64
	for _, alok := range input.Alokasi {
		totalAlokasi += alok.JumlahDialokasikan
	}
	if totalAlokasi > input.JumlahTotal {
		return model.Payment{}, errors.New("total alokasi melebihi total pembayaran")
	}

	err = s.db.Transaction(func(tx *gorm.DB) error {
		// ===================================================================
		// 🔥 VALIDASI SALDO DULU SEBELUM MULAI TRANSAKSI
		// ===================================================================
		var akunKas model.AkunKas
		if err := tx.Where("id = ?", input.AkunKasID).First(&akunKas).Error; err != nil {
			return errors.New("akun kas tidak ditemukan")
		}

		// CEK APAKAH PEMBAYARAN HUTANG (uang keluar)
		if input.TargetType == "HUTANG" {
			if akunKas.Saldo < input.JumlahTotal {
				return fmt.Errorf("saldo tidak mencukupi. Saldo tersedia: Rp %.0f, dibutuhkan: Rp %.0f",
					akunKas.Saldo, input.JumlahTotal)
			}
		}
		// ===================================================================

		newPayment := model.Payment{
			TanggalBayar: tanggalBayar,
			AkunKasID:    input.AkunKasID,
			JumlahTotal:  input.JumlahTotal,
			Metode:       input.Metode,
			Memo:         input.Memo,
			CreatedByID:  userID,
		}
		payment, err = s.paymentRepo.CreatePayment(tx, newPayment)
		if err != nil {
			return err
		}

		for _, alok := range input.Alokasi {
			if alok.JumlahDialokasikan <= 0 {
				continue
			}

			newAllocation := model.PaymentAllocation{
				PaymentID:          payment.ID,
				TargetType:         input.TargetType,
				TargetID:           alok.TargetID,
				JumlahDialokasikan: alok.JumlahDialokasikan,
			}
			if _, err := s.paymentRepo.CreateAllocation(tx, newAllocation); err != nil {
				return err
			}

			if input.TargetType == "HUTANG" {
				var hutang model.Hutang
				if err := tx.Where("id = ?", alok.TargetID).First(&hutang).Error; err != nil {
					return fmt.Errorf("hutang dengan ID %d tidak ditemukan", alok.TargetID)
				}

				// 1. Update Hutang
				hutang.NilaiTerbayar += alok.JumlahDialokasikan
				hutang.SisaTagihan = hutang.NilaiTotal - hutang.NilaiTerbayar
				if hutang.SisaTagihan <= 0.01 {
					hutang.Status = "LUNAS"
					hutang.SisaTagihan = 0
				} else {
					hutang.Status = "SEBAGIAN"
				}
				if err := tx.Save(&hutang).Error; err != nil {
					return err
				}

				// 2. Buat Catatan Riwayat Kas
				memoKas := fmt.Sprintf("Pembayaran Hutang (%s #%d)", hutang.SourceType, hutang.SourceID)
				transaksiKas := model.TransaksiKas{
					AkunKasID:     input.AkunKasID,
					Tanggal:       tanggalBayar,
					Arah:          "OUT",
					Jumlah:        alok.JumlahDialokasikan,
					ReferenceType: "PAYMENT_HUTANG",
					ReferenceID:   hutang.ID,
					Memo:          memoKas,
					CreatedByID:   userID,
				}
				if err := tx.Create(&transaksiKas).Error; err != nil {
					return err
				}

				// 3. Update Saldo Akun Kas (sudah pasti cukup karena udah dicek di atas)
				if err := tx.Model(&model.AkunKas{}).
					Where("id = ?", input.AkunKasID).
					Update("saldo", gorm.Expr("saldo - ?", alok.JumlahDialokasikan)).Error; err != nil {
					return err
				}

				// 4. Update Status di Transaksi Asli
				updates := map[string]interface{}{
					"status_pembayaran": hutang.Status,
					"nilai_terbayar":    gorm.Expr("nilai_terbayar + ?", alok.JumlahDialokasikan),
				}
				switch hutang.SourceType {
				case "BATCH_PEMBELIAN":
					if err := tx.Model(&model.BatchPembelian{}).Where("id = ?", hutang.SourceID).Updates(updates).Error; err != nil {
						return fmt.Errorf("gagal update status di batch pembelian: %w", err)
					}
				case "PEMBELIAN_LANGSUNG":
					if err := tx.Model(&model.PembelianLangsung{}).Where("id = ?", hutang.SourceID).Updates(updates).Error; err != nil {
						return fmt.Errorf("gagal update status di pembelian langsung: %w", err)
					}
				case "BATCH_KARUNG":
					if err := tx.Model(&model.BatchKarung{}).Where("id = ?", hutang.SourceID).Updates(updates).Error; err != nil {
						return fmt.Errorf("gagal update status di batch karung: %w", err)
					}
				}

			} else if input.TargetType == "PIUTANG" {
				var piutang model.Piutang
				if err := tx.Where("id = ?", alok.TargetID).First(&piutang).Error; err != nil {
					return fmt.Errorf("piutang dengan ID %d tidak ditemukan", alok.TargetID)
				}

				piutang.NilaiTerbayar += alok.JumlahDialokasikan
				piutang.SisaTagihan = piutang.NilaiTotal - piutang.NilaiTerbayar
				if piutang.SisaTagihan <= 0.01 {
					piutang.Status = "LUNAS"
					piutang.SisaTagihan = 0
				} else {
					piutang.Status = "SEBAGIAN"
				}
				if err := tx.Save(&piutang).Error; err != nil {
					return err
				}

				memoKas := fmt.Sprintf("Penerimaan Piutang (%s #%d)", piutang.SourceType, piutang.SourceID)
				transaksiKas := model.TransaksiKas{
					AkunKasID:     input.AkunKasID,
					Tanggal:       tanggalBayar,
					Arah:          "IN",
					Jumlah:        alok.JumlahDialokasikan,
					ReferenceType: "PAYMENT_PIUTANG",
					ReferenceID:   piutang.ID,
					Memo:          memoKas,
					CreatedByID:   userID,
				}
				if err := tx.Create(&transaksiKas).Error; err != nil {
					return err
				}
				if err := tx.Model(&model.AkunKas{}).
					Where("id = ?", input.AkunKasID).
					Update("saldo", gorm.Expr("saldo + ?", alok.JumlahDialokasikan)).Error; err != nil {
					return err
				}

				updates := map[string]interface{}{
					"status_pembayaran": piutang.Status,
					"nilai_terbayar":    gorm.Expr("nilai_terbayar + ?", alok.JumlahDialokasikan),
				}
				switch piutang.SourceType {
				case "TRANSAKSI_PENJUALAN":
					if err := tx.Model(&model.TransaksiPenjualan{}).Where("id = ?", piutang.SourceID).Updates(updates).Error; err != nil {
						return fmt.Errorf("gagal update status di transaksi penjualan: %w", err)
					}
				case "JASA_GILING":
					if err := tx.Model(&model.TransaksiJasaGiling{}).Where("id = ?", piutang.SourceID).Updates(updates).Error; err != nil {
						return fmt.Errorf("gagal update status di transaksi jasa giling: %w", err)
					}
				}
			}
		}
		return nil
	})
	return payment, err
}
