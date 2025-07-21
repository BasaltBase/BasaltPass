package user

import (
	"strconv"
	"github.com/gofiber/fiber/v2"
)

var svc = Service{}

// GetProfileHandler handles GET /user/profile
func GetProfileHandler(c *fiber.Ctx) error {
	uid := c.Locals("userID").(uint)
	profile, err := svc.GetProfile(uid)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(profile)
}

// UpdateProfileHandler handles PUT /user/profile
func UpdateProfileHandler(c *fiber.Ctx) error {
	uid := c.Locals("userID").(uint)
	var req UpdateProfileRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	if err := svc.UpdateProfile(uid, req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// SearchHandler handles GET /users/search
func SearchHandler(c *fiber.Ctx) error {
	query := c.Query("q")
	if query == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "search query is required"})
	}
	
	limitStr := c.Query("limit", "10")
	limit, err := strconv.Atoi(limitStr)
	if err != nil {
		limit = 10
	}
	
	results, err := svc.SearchUsers(query, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	
	return c.JSON(results)
}
