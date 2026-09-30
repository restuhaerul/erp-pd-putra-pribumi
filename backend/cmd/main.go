package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"putra-pribumi/internal/handler"
	"putra-pribumi/internal/middleware"
	"putra-pribumi/internal/model"
	"putra-pribumi/internal/repository"
	"putra-pribumi/internal/service"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/schema"
)

func main() {
	// =================================================================
	//  KONFIGURASI & KONEKSI DATABASE
	// =================================================================
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_HOST"),
		os.Getenv("DB_PORT"),
		os.Getenv("DB_NAME"),
	)
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
		NamingStrategy: schema.NamingStrategy{
			SingularTable: true,
		},
	})
	if err != nil {
		log.Fatal("Failed to connect to database!")
	}
	log.Println("Database connection successful.")

	// =================================================================
	//  MIGRASI DATABASE
	// =================================================================
	err = db.AutoMigrate(
		&model.Produk{},
		&model.BatchPembelian{},
		&model.BatchProduksi{},
		&model.TransaksiPenjualan{},
		&model.Konfigurasi{},
		&model.StokProduk{},
		&model.ProduksiSumber{},
		&model.BiayaOperasional{},
		&model.TransaksiJasaGiling{},
		&model.PembelianLangsung{},
		&model.LogPembelianLangsung{},
		&model.LogStokProduk{},
		&model.LogProduksi{},
		&model.BatchKarung{},
		&model.LogKarung{},
		&model.ProduksiKarungSumber{},
		&model.User{},
		&model.UserActivityLog{},
		&model.LogPembelian{},
		&model.AkunKas{},
		&model.Piutang{},
		&model.Hutang{},
		&model.Payment{},
		&model.PaymentAllocation{},
		&model.TransaksiKas{},
	)
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}
	log.Println("Database migration successful.")

	// =================================================================
	//  INISIALISASI SEMUA BAGIAN (DEPENDENCY INJECTION)
	// =================================================================

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		log.Fatal("JWT_SECRET not set in .env file")
	}

	// 1. REPOSITORIES (Lapisan Akses Data)
	paymentRepo := repository.NewPaymentRepository(db)
	akunKasRepo := repository.NewAkunKasRepository(db)
	produkRepo := repository.NewProdukRepository(db)
	stokProdukRepo := repository.NewStokProdukRepository(db)
	pembelianRepo := repository.NewPembelianRepository(db)
	pembelianLangsungRepo := repository.NewPembelianLangsungRepository(db)
	produksiRepo := repository.NewProduksiRepository(db)
	penjualanRepo := repository.NewPenjualanRepository(db)
	jasaGilingRepo := repository.NewJasaGilingRepository(db)
	biayaOperasionalRepo := repository.NewBiayaOperasionalRepository(db)
	karungRepo := repository.NewKarungRepository(db)
	konfigurasiRepo := repository.NewKonfigurasiRepository(db)
	laporanRepo := repository.NewLaporanRepository(db)
	kasRepo := repository.NewKasRepository(db)
	dashboardRepo := repository.NewDashboardRepository(db)
	userRepo := repository.NewUserRepository(db)
	// Repositori untuk Log
	logStokRepo := repository.NewLogStokRepository(db)
	logProduksiRepo := repository.NewLogProduksiRepository(db)
	logKarungRepo := repository.NewLogKarungRepository(db)
	logPembelianRepo := repository.NewLogPembelianRepository(db)
	logPembelianLangsungRepo := repository.NewLogPembelianLangsungRepository(db)
	activityLogRepo := repository.NewActivityLogsRepository(db) // ✅ BARU
	hutangRepo := repository.NewHutangRepository(db)
	piutangRepo := repository.NewPiutangRepository(db)

	// 2. SERVICES (Lapisan Logika Bisnis)
	hutangService := service.NewHutangService(hutangRepo, akunKasRepo, db)
	piutangService := service.NewPiutangService(piutangRepo)
	paymentService := service.NewPaymentService(paymentRepo, hutangRepo, piutangRepo, akunKasRepo, db)
	akunKasService := service.NewAkunKasService(akunKasRepo)
	logStokService := service.NewLogStokService(logStokRepo)
	logProduksiService := service.NewLogProduksiService(logProduksiRepo)
	logKarungService := service.NewLogKarungService(logKarungRepo)
	logPembelianService := service.NewLogPembelianService(logPembelianRepo)
	konfigurasiSvc := service.NewKonfigurasiService(konfigurasiRepo)
	stokProdukService := service.NewStokProdukService(stokProdukRepo, biayaOperasionalRepo, produkRepo, db, logStokService)
	biayaOperasionalService := service.NewBiayaOperasionalService(biayaOperasionalRepo, akunKasRepo, db)
	// ✅ PERBAIKAN: Urutan parameter untuk NewPembelianLangsungService disesuaikan
	jasaGilingService := service.NewJasaGilingService(db, jasaGilingRepo, stokProdukService, logStokService, konfigurasiSvc, piutangService, akunKasRepo)
	pembelianLangsungSvc := service.NewPembelianLangsungService(
		db,
		pembelianLangsungRepo,
		stokProdukService,
		produkRepo,
		logStokService,
		logPembelianLangsungRepo,
		hutangService,
		akunKasRepo,
		biayaOperasionalService,
	)
	// ✅ PERBAIKAN: Parameter yang hilang (logPembelianService) ditambahkan
	produksiService := service.NewProduksiService(
		db, produksiRepo, pembelianRepo, karungRepo, stokProdukService,
		konfigurasiSvc, logStokService, logProduksiService, logKarungService,
		logPembelianService, jasaGilingRepo, pembelianLangsungSvc, jasaGilingService,
	)
	// Dengan baris ini (tambahkan piutangService di akhir):
	penjualanService := service.NewPenjualanService(
		db,
		penjualanRepo,
		produkRepo,
		stokProdukService,
		logStokService,
		logProduksiService,
		pembelianLangsungSvc,
		piutangService,
		akunKasRepo,
	)
	// Dengan baris ini (tambahkan hutangService di akhir):
	pembelianService := service.NewPembelianService(db, pembelianRepo, produkRepo, logStokService, hutangService, akunKasRepo, stokProdukService, biayaOperasionalService)
	produkService := service.NewProdukService(produkRepo, stokProdukRepo)
	karungService := service.NewKarungService(db, karungRepo, produkRepo, biayaOperasionalService, akunKasRepo, hutangService)
	laporanService := service.NewLaporanService(laporanRepo)
	kasService := service.NewKasService(db, kasRepo, akunKasRepo)
	dashboardSvc := service.NewDashboardService(dashboardRepo)
	userService := service.NewUserService(userRepo)
	activityLogService := service.NewActivityLogsService(activityLogRepo) // ✅ BARU
	cleanupService := service.NewCleanupService(db)
	cleanupService.StartCleanupScheduler()

	// 3. HANDLERS (Lapisan Presentasi/Controller)
	hutangHandler := handler.NewHutangHandler(hutangService)
	piutangHandler := handler.NewPiutangHandler(piutangService)
	paymentHandler := handler.NewPaymentHandler(paymentService)
	akunKasHandler := handler.NewAkunKasHandler(akunKasService)
	authHandler := handler.NewAuthHandler(userService, jwtSecret)
	userHandler := handler.NewUserHandler(userService)
	dashboardHandler := handler.NewDashboardHandler(dashboardSvc)
	produkHandler := handler.NewProdukHandler(produkService)
	pembelianHandler := handler.NewPembelianHandler(pembelianService, logPembelianService)
	pembelianLangsungHandler := handler.NewPembelianLangsungHandler(pembelianLangsungSvc)
	produksiHandler := handler.NewProduksiHandler(produksiService, logProduksiService)
	penjualanHandler := handler.NewPenjualanHandler(penjualanService)
	stokProdukHandler := handler.NewStokProdukHandler(stokProdukService)
	logStokHandler := handler.NewLogStokHandler(logStokService)
	karungHandler := handler.NewKarungHandler(karungService, logKarungService)
	biayaOperasionalHandler := handler.NewBiayaOperasionalHandler(biayaOperasionalService)
	jasaGilingHandler := handler.NewJasaGilingHandler(jasaGilingService)
	konfigurasiHandler := handler.NewKonfigurasiHandler(konfigurasiSvc)
	laporanHandler := handler.NewLaporanHandler(laporanService)
	kasHandler := handler.NewKasHandler(kasService)
	activityLogHandler := handler.NewActivityLogsHandler(activityLogService) // ✅ PERBAIKAN: Inisialisasi yang benar

	// =================================================================
	//  SETUP ROUTER & ENDPOINTS (API)
	// =================================================================
	router := gin.Default()

	config := cors.DefaultConfig()
	config.AllowOrigins = []string{"http://localhost:3000"}
	config.AllowMethods = []string{"GET", "POST", "PATCH", "DELETE", "PUT", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization"}
	config.AllowCredentials = true
	router.Use(cors.New(config))

	apiV1 := router.Group("/api/v1")
	{
		apiV1.POST("/login", authHandler.Login)

		protected := apiV1.Group("/")
		protected.Use(middleware.AuthMiddleware(jwtSecret, userRepo))
		protected.Use(middleware.ActivityLogger(db)) // ✅ PERBAIKAN: Inisialisasi logger langsung di sini
		{
			// ... (SEMUA RUTE ANDA DI DALAM SINI, TIDAK ADA PERUBAHAN) ...
			// Auth routes
			protected.GET("/me", authHandler.GetMe)
			protected.POST("/change-password", authHandler.ChangePassword)

			// Dashboard
			protected.GET("/dashboard", dashboardHandler.GetDashboardData)

			// User Management (OWNER only)
			userGroup := protected.Group("/users")
			userGroup.Use(middleware.RequireRole(model.RoleOwner))
			{
				userGroup.GET("", userHandler.GetAll)
				userGroup.POST("", userHandler.Create)
				userGroup.PATCH("/:id", userHandler.Update)
				userGroup.DELETE("/:id", userHandler.Delete)
				userGroup.POST("/:id/reset-password", userHandler.ResetPassword)
			}

			// Produk (Master Data)
			produkGroup := protected.Group("/produk")
			{
				produkGroup.GET("",
					middleware.RequireRole(model.RoleOwner, model.RoleAdmin),
					produkHandler.GetAllProduk)

				produkGroup.GET("/:id", produkHandler.GetProdukByID)
				produkGroup.POST("",
					middleware.RequireRole(model.RoleOwner),
					produkHandler.CreateProduk,
				)
				produkGroup.PATCH("/:id",
					middleware.RequireRole(model.RoleOwner),
					produkHandler.UpdateProduk,
				)
				produkGroup.DELETE("/:id",
					middleware.RequireRole(model.RoleOwner),
					produkHandler.DeleteProduk,
				)
			}

			// --- TAMBAHAN: Daftarkan semua rute keuangan di sini ---

			// Akun Kas (Master Data Keuangan) - Hanya Owner
			akunKasGroup := protected.Group("/akun-kas")
			akunKasGroup.Use(middleware.RequireRole(model.RoleOwner))
			{
				akunKasGroup.POST("", akunKasHandler.CreateAkunKas)
				akunKasGroup.GET("", akunKasHandler.GetAllAkunKas)
				akunKasGroup.PATCH("/:id", akunKasHandler.UpdateAkunKas)
				akunKasGroup.DELETE("/:id", akunKasHandler.DeleteAkunKas)
				akunKasGroup.GET("/:id/history", akunKasHandler.GetAkunKasHistory) // <-- TAMBAHKAN ROUTE INI
			}

			// Hutang & Piutang (Lihat Data) - Owner & Admin
			hutangPiutangGroup := protected.Group("")
			hutangPiutangGroup.Use(middleware.RequireRole(model.RoleOwner, model.RoleAdmin))
			{
				hutangPiutangGroup.GET("/hutang", hutangHandler.GetAllHutang)
				hutangPiutangGroup.GET("/piutang", piutangHandler.GetAllPiutang)
				hutangPiutangGroup.DELETE("/hutang/:id", hutangHandler.CancelHutang) // <-- TAMBAHKAN INI
			}

			// Pembayaran (Transaksi) - Owner & Admin
			pembayaranGroup := protected.Group("/payments")
			pembayaranGroup.Use(middleware.RequireRole(model.RoleOwner, model.RoleAdmin))
			{
				pembayaranGroup.POST("", paymentHandler.CreatePayment)
			}

			// --- Batas Penambahan Rute Keuangan ---

			// Pembelian (Bahan Baku)
			pembelianGroup := protected.Group("/pembelian")
			pembelianGroup.Use(middleware.RequireRole(model.RoleOwner, model.RoleAdmin, model.RoleGudang))
			{
				pembelianGroup.GET("", pembelianHandler.GetAllPembelian)
				pembelianGroup.GET("/:id", pembelianHandler.GetPembelianByID)
				pembelianGroup.GET("/:id/history", pembelianHandler.GetPembelianHistory)
				pembelianGroup.POST("", pembelianHandler.CreatePembelian)
				pembelianGroup.PATCH("/:id", pembelianHandler.UpdatePembelian)
				pembelianGroup.DELETE("/:id",
					middleware.RequireRole(model.RoleOwner),
					pembelianHandler.DeletePembelian,
				)
			}

			// Pembelian Langsung
			pembelianLangsungGroup := protected.Group("/pembelian-langsung")
			pembelianLangsungGroup.Use(middleware.RequireRole(model.RoleOwner))
			{
				pembelianLangsungGroup.GET("", pembelianLangsungHandler.GetAll)
				pembelianLangsungGroup.POST("", pembelianLangsungHandler.Create)
				pembelianLangsungGroup.PATCH("/:id", pembelianLangsungHandler.Update)
				pembelianLangsungGroup.DELETE("/:id",
					middleware.RequireRole(model.RoleOwner),
					pembelianLangsungHandler.Delete,
				)
				// DAFTARKAN RUTE BARU DI SINI
				pembelianLangsungGroup.GET("/:id/history", pembelianLangsungHandler.GetHistory)
			}

			// Produksi (Proses Giling)
			produksiGroup := protected.Group("/produksi")
			produksiGroup.Use(middleware.RequireRole(model.RoleOwner, model.RoleAdmin, model.RoleGudang))
			{
				produksiGroup.GET("", produksiHandler.GetAllProduksi)
				produksiGroup.GET("/:id/history", produksiHandler.GetProduksiHistory)
				produksiGroup.POST("", produksiHandler.CreateProduksi)
				produksiGroup.PATCH("/:id", produksiHandler.UpdateProduksi)
				produksiGroup.DELETE("/:id",
					middleware.RequireRole(model.RoleOwner),
					produksiHandler.DeleteProduksi,
				)
				// Tambahkan route ini ke router setup
				produksiGroup.GET("/summary", produksiHandler.GetProduksiSummary)
			}

			// Penjualan
			penjualanGroup := protected.Group("/penjualan")
			penjualanGroup.Use(middleware.RequireRole(model.RoleOwner, model.RoleAdmin, model.RoleKasir))
			{
				penjualanGroup.GET("", penjualanHandler.GetPenjualanByDate)
				penjualanGroup.POST("", penjualanHandler.CreatePenjualan)
				penjualanGroup.PATCH("/:id", penjualanHandler.UpdatePenjualan)
				penjualanGroup.DELETE("/:id",
					middleware.RequireRole(model.RoleOwner, model.RoleAdmin),
					penjualanHandler.DeletePenjualan,
				)
				penjualanGroup.DELETE("/:id/cancel", penjualanHandler.CancelPenjualan) // ← Tambahkan ini
			}

			// Stok Produk
			stokGroup := protected.Group("/stok-produk")
			{
				stokGroup.GET("", stokProdukHandler.GetAllStokProduk)
				stokGroup.GET("/:produk_id", stokProdukHandler.GetStokByProdukID)
				stokGroup.GET("/:produk_id/history", logStokHandler.GetHistoryByProdukID)
				stokGroup.POST("/tambah",
					middleware.RequireRole(model.RoleOwner, model.RoleAdmin, model.RoleGudang),
					stokProdukHandler.TambahStok,
				)
				stokGroup.POST("/manual",
					middleware.RequireRole(model.RoleOwner, model.RoleAdmin, model.RoleGudang),
					stokProdukHandler.TambahStokManual,
				)
				stokGroup.POST("/kemasan",
					middleware.RequireRole(model.RoleOwner, model.RoleAdmin, model.RoleGudang),
					stokProdukHandler.TambahStokKemasan,
				)
			}

			// Log Stok Activity
			protected.GET("/log-stok/activity", logStokHandler.GetRecentActivity)

			// Karung
			karungGroup := protected.Group("/karung")
			karungGroup.Use(middleware.RequireRole(model.RoleOwner, model.RoleAdmin, model.RoleGudang))
			{
				karungGroup.GET("", karungHandler.GetAll)
				karungGroup.GET("/:id/history", karungHandler.GetHistory)
				karungGroup.POST("", karungHandler.Create)
				karungGroup.PATCH("/:id", karungHandler.Update)
				karungGroup.DELETE("/:id",
					middleware.RequireRole(model.RoleOwner),
					karungHandler.Delete,
				)
			}

			// Biaya Operasional
			biayaGroup := protected.Group("/biaya-operasional")
			biayaGroup.Use(middleware.RequireRole(model.RoleOwner, model.RoleAdmin))
			{
				biayaGroup.GET("", biayaOperasionalHandler.GetAllBiaya)
				biayaGroup.GET("/:id", biayaOperasionalHandler.GetBiayaByID)
				biayaGroup.POST("", biayaOperasionalHandler.CreateBiaya)
				biayaGroup.PATCH("/:id", biayaOperasionalHandler.UpdateBiaya)
				biayaGroup.DELETE("/:id",
					middleware.RequireRole(model.RoleOwner),
					biayaOperasionalHandler.DeleteBiaya,
				)
			}

			// Jasa Giling
			jasaGilingGroup := protected.Group("/jasa-giling")
			jasaGilingGroup.Use(middleware.RequireRole(model.RoleOwner, model.RoleAdmin, model.RoleKasir))
			{
				jasaGilingGroup.GET("", jasaGilingHandler.GetAllJasaGiling)
				jasaGilingGroup.POST("", jasaGilingHandler.CreateJasaGiling)
				jasaGilingGroup.PATCH("/:id", jasaGilingHandler.UpdateJasaGiling)
				jasaGilingGroup.DELETE("/:id",
					middleware.RequireRole(model.RoleOwner, model.RoleAdmin),
					jasaGilingHandler.DeleteJasaGiling,
				)
			}

			// Konfigurasi Sistem (Admin & Owner only)
			konfigGroup := protected.Group("/konfigurasi")
			konfigGroup.Use(middleware.RequireRole(model.RoleOwner, model.RoleAdmin))
			{
				konfigGroup.GET("", konfigurasiHandler.GetKonfigurasi)
				konfigGroup.PUT("",
					middleware.RequireRole(model.RoleOwner),
					konfigurasiHandler.UpdateKonfigurasi,
				)
			}

			// Laporan
			laporanGroup := protected.Group("/laporan")
			laporanGroup.Use(middleware.RequireRole(model.RoleOwner, model.RoleAdmin, model.RoleViewer))
			{
				laporanGroup.GET("/laba-harian", penjualanHandler.GetLabaHarian)
				laporanGroup.GET("/bulanan", laporanHandler.GetLaporanBulanan)
			}

			// Kas
			kasGroup := protected.Group("/kas")
			kasGroup.Use(middleware.RequireRole(model.RoleOwner, model.RoleAdmin))
			{
				kasGroup.GET("", kasHandler.GetKasBulanan)
				// --- TAMBAHAN: Rute baru untuk transaksi manual ---
				kasGroup.POST("/manual", kasHandler.CreateTransaksiManual)
			}

			// Profile management
			protected.GET("/profile", authHandler.GetMe)
			protected.PATCH("/profile", authHandler.UpdateProfile)
			protected.POST("/profile/photo", authHandler.UploadPhoto)

			// Add activity log routes (Owner only)
			activityGroup := protected.Group("/activity-logs")
			activityGroup.Use(middleware.RequireRole(model.RoleOwner))
			{
				// ✅ PERBAIKAN: Gunakan activityLogHandler yang sudah benar
				activityGroup.GET("", activityLogHandler.GetActivityLogs)
				activityGroup.GET("/summary", activityLogHandler.GetActivitySummary)
			}

			// Serve static files for photos
			router.Static("/uploads", "./uploads")
		}
	}

	router.GET("/ping", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "pong"})
	})

	createTestAdmin(db)
	seedAkunKas(db)

	log.Println("Starting server on port 8081")
	router.Run(":8081")
}

func createTestAdmin(db *gorm.DB) {
	var count int64
	db.Model(&model.User{}).Where("username = ?", "oriza").Count(&count)
	if count == 0 {
		u := &model.User{
			Username: "oriza",
			FullName: "Admin Oriza",
			Role:     "ADMIN",
			IsActive: true,
		}
		u.HashPassword("admin123")
		if err := db.Create(u).Error; err != nil {
			log.Println("Gagal buat akun admin oriza:", err)
		} else {
			log.Println("Berhasil buat akun admin oriza (admin123)")
		}
	}

}

func seedAkunKas(db *gorm.DB) {
	var count int64
	db.Model(&model.AkunKas{}).Count(&count)

	if count == 0 {
		kasTunai := model.AkunKas{
			NamaAkun: "Kas Tunai",
			TipeAkun: "KAS_TUNAI",
			Saldo:    0, // Saldo awal
			IsActive: true,
		}
		if err := db.Create(&kasTunai).Error; err != nil {
			log.Printf("Failed to seed AkunKas: %v", err)
		} else {
			log.Println("Default 'Kas Tunai' account created.")
		}
	}
}
