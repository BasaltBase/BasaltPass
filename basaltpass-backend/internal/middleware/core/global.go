package core

import (
	"basaltpass-backend/internal/config"
	"basaltpass-backend/internal/middleware/transport"
	"errors"
	"log"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/helmet"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/gofiber/fiber/v2/middleware/requestid"
)

func ErrorHandler(c *fiber.Ctx, err error) error {
	status := fiber.StatusInternalServerError
	errCode := transport.InternalServerErrorCode
	message := "internal server error"
	var e *fiber.Error
	if errors.As(err, &e) {
		status = e.Code
		errCode = "http_" + strconv.Itoa(status)
		if status < fiber.StatusInternalServerError && strings.TrimSpace(e.Message) != "" {
			message = e.Message
		}
	}

	log.Printf("[middleware][error] status=%d code=%s path=%s request=%s err=%v", status, errCode, c.Path(), transport.RequestIDFromCtx(c), err)
	return transport.APIErrorResponse(c, status, errCode, message)
}

func RegisterMiddlewares(app *fiber.App) {
	app.Use(requestid.New())
	app.Use(recover.New())
	app.Use(logger.New())

	helmetCfg := helmet.Config{
		ContentTypeNosniff:        "nosniff",
		XFrameOptions:             "DENY",
		XSSProtection:             "0",
		ReferrerPolicy:            "strict-origin-when-cross-origin",
		PermissionPolicy:          "camera=(), microphone=(), geolocation=(), payment=()",
		ContentSecurityPolicy:     "default-src 'none'; frame-ancestors 'none'",
		CrossOriginEmbedderPolicy: "require-corp",
		CrossOriginOpenerPolicy:   "same-origin",
		CrossOriginResourcePolicy: "same-origin",
	}
	if !config.IsDevelop() {
		helmetCfg.HSTSMaxAge = 31536000
		helmetCfg.HSTSExcludeSubdomains = false
		helmetCfg.HSTSPreloadEnabled = true
	}
	app.Use(helmet.New(helmetCfg))

	c := config.Get().CORS
	corsCfg := cors.Config{
		AllowMethods:     strings.Join(c.AllowMethods, ","),
		AllowHeaders:     strings.Join(c.AllowHeaders, ","),
		AllowCredentials: c.AllowCredentials,
		ExposeHeaders:    strings.Join(c.ExposeHeaders, ","),
		MaxAge:           c.MaxAgeSeconds,
	}

	if config.IsDevelop() {
		corsCfg.AllowOriginsFunc = func(origin string) bool {
			return origin != ""
		}
	} else {
		corsCfg.AllowOrigins = strings.Join(c.AllowOrigins, ",")
	}

	app.Use(cors.New(corsCfg))
}
