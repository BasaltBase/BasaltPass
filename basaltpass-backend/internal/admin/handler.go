package admin

import (
    "basaltpass-backend/internal/common"
    "basaltpass-backend/internal/model"

    "github.com/gofiber/fiber/v2"
)

// ListUsersHandler GET /admin/users
func ListUsersHandler(c *fiber.Ctx) error {
    q := c.Query("q")
    var users []model.User
    db := common.DB()
    if q != "" {
        db = db.Where("email LIKE ? OR phone LIKE ? OR nickname LIKE ?", "%"+q+"%", "%"+q+"%", "%"+q+"%")
    }
    db.Find(&users)
    return c.JSON(users)
}

// BanUserHandler POST /admin/user/:id/ban {banned}
func BanUserHandler(c *fiber.Ctx) error {
    id := c.Params("id")
    var body struct{ Banned bool `json:"banned"` }
    if err := c.BodyParser(&body); err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
    }
    if err := common.DB().Model(&model.User{}).Where("id = ?", id).Update("banned", body.Banned).Error; err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
    }
    return c.SendStatus(fiber.StatusNoContent)
} 