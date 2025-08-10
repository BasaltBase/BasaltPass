package invitation

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
)

// team invitation handlers

// CreateHandler POST /teams/:id/invitations
func CreateHandler(c *fiber.Ctx) error {
	teamID, _ := strconv.Atoi(c.Params("id"))
	inviterID := c.Locals("userID").(uint)
	var body struct {
		InviteeIDs []uint `json:"invitee_ids"`
		Remark     string `json:"remark"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	if len(body.InviteeIDs) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invitee_ids 不能为空"})
	}
	if err := Create(uint(teamID), inviterID, body.InviteeIDs, body.Remark); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(fiber.StatusCreated)
}

// ListIncomingHandler GET /invitations
func ListIncomingHandler(c *fiber.Ctx) error {
	uid := c.Locals("userID").(uint)
	list, err := ListIncoming(uid)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(list)
}

// ListOutgoingHandler GET /teams/:id/invitations
func ListOutgoingHandler(c *fiber.Ctx) error {
	teamID, _ := strconv.Atoi(c.Params("id"))
	list, err := ListOutgoing(uint(teamID))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(list)
}

// AcceptHandler PUT /invitations/:id/accept
func AcceptHandler(c *fiber.Ctx) error {
	uid := c.Locals("userID").(uint)
	invID, _ := strconv.Atoi(c.Params("id"))
	if err := Accept(uid, uint(invID)); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// RejectHandler PUT /invitations/:id/reject
func RejectHandler(c *fiber.Ctx) error {
	uid := c.Locals("userID").(uint)
	invID, _ := strconv.Atoi(c.Params("id"))
	if err := Reject(uid, uint(invID)); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// RevokeHandler DELETE /teams/:id/invitations/:inv_id
func RevokeHandler(c *fiber.Ctx) error {
	inviterID := c.Locals("userID").(uint)
	invID, _ := strconv.Atoi(c.Params("inv_id"))
	if err := Revoke(inviterID, uint(invID)); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(fiber.StatusNoContent)
}
