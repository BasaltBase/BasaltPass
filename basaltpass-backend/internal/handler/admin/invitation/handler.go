package invitation

import (
	admindto "basaltpass-backend/internal/dto/invitation"
	adminsvc "basaltpass-backend/internal/service/invitation"
	"strconv"

	"basaltpass-backend/internal/common"

	"github.com/gofiber/fiber/v2"
)

var svc = adminsvc.NewAdminService(common.DB())

func ListInvitationsHandler(c *fiber.Ctx) error {
	var req admindto.AdminListInvitationsRequest
	if err := c.QueryParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "查询参数错误"})
	}
	res, err := svc.List(req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(res)
}

func CreateInvitationHandler(c *fiber.Ctx) error {
	var body admindto.AdminCreateInvitationRequest
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "请求参数错误"})
	}
	if err := svc.Create(body); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "创建成功"})
}

func UpdateInvitationStatusHandler(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无效ID"})
	}
	var body admindto.AdminUpdateInvitationStatusRequest
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "请求参数错误"})
	}
	if body.Status == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "状态不能为空"})
	}
	if err := svc.UpdateStatus(uint(id), body.Status); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "更新成功"})
}

func DeleteInvitationHandler(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无效ID"})
	}
	if err := svc.Delete(uint(id)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "删除成功"})
}
