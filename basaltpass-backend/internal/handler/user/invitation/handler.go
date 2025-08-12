package invitation

import (
	"basaltpass-backend/internal/service/invitation"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

// POST /teams/:id/invitations
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
	if err := invitation.Create(uint(teamID), inviterID, body.InviteeIDs, body.Remark); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(fiber.StatusCreated)
}

// GET /invitations (incoming)
func ListIncomingHandler(c *fiber.Ctx) error {
	uid := c.Locals("userID").(uint)
	list, err := invitation.ListIncoming(uid)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(list)
}

// GET /teams/:id/invitations (outgoing)
func ListOutgoingHandler(c *fiber.Ctx) error {
	teamID, _ := strconv.Atoi(c.Params("id"))
	list, err := invitation.ListOutgoing(uint(teamID))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(list)
}

// PUT /invitations/:id/accept
func AcceptHandler(c *fiber.Ctx) error {
	uid := c.Locals("userID").(uint)
	invID, _ := strconv.Atoi(c.Params("id"))
	if err := invitation.Accept(uid, uint(invID)); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// PUT /invitations/:id/reject
func RejectHandler(c *fiber.Ctx) error {
	uid := c.Locals("userID").(uint)
	invID, _ := strconv.Atoi(c.Params("id"))
	if err := invitation.Reject(uid, uint(invID)); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// DELETE /teams/:id/invitations/:inv_id
func RevokeHandler(c *fiber.Ctx) error {
	inviterID := c.Locals("userID").(uint)
	invID, _ := strconv.Atoi(c.Params("inv_id"))
	if err := invitation.Revoke(inviterID, uint(invID)); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(fiber.StatusNoContent)
}
