package invitation

import (
	"basaltpass-backend/internal/public/notification"
	"errors"
	"time"

	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"
)

var ErrAlreadyInvited = errors.New("user already invited to this team")

// Create 创建邀请，可批量 inviteeIDs
func Create(teamID, inviterID uint, inviteeIDs []uint, remark string) error {
	db := common.DB()

	var team model.Team
	if err := db.First(&team, teamID).Error; err != nil {
		return err
	}

	now := time.Now()
	var invites []model.Invitation
	for _, uid := range inviteeIDs {
		// 检查是否已存在待处理邀请
		var count int64
		db.Model(&model.Invitation{}).Where("team_id=? AND invitee_id=? AND status='pending'", teamID, uid).Count(&count)
		if count > 0 {
			return ErrAlreadyInvited
		}
		invites = append(invites, model.Invitation{
			TeamID:    teamID,
			InviterID: inviterID,
			InviteeID: uid,
			Remark:    remark,
			CreatedAt: now,
			UpdatedAt: now,
		})
	}
	if err := db.Create(&invites).Error; err != nil {
		return err
	}

	// 发送通知
	for _, inv := range invites {
		notification.Send("Team Center", "Team Invitation", "you are invited to the team "+team.Name, "info", &inv.InviterID, "团队", []uint{inv.InviteeID})
	}
	return nil
}

// ListIncoming 当前用户收到的邀请
func ListIncoming(userID uint) ([]model.Invitation, error) {
	var list []model.Invitation
	err := common.DB().Preload("Team").Preload("Inviter").Where("invitee_id=? AND status='pending'", userID).Find(&list).Error
	return list, err
}

// ListOutgoing 某团队发出的邀请
func ListOutgoing(teamID uint) ([]model.Invitation, error) {
	var list []model.Invitation
	err := common.DB().Preload("Invitee").Where("team_id=? AND status='pending'", teamID).Find(&list).Error
	return list, err
}

// Accept 接受邀请
func Accept(userID, invitationID uint) error {
	db := common.DB()
	var inv model.Invitation
	if err := db.First(&inv, invitationID).Error; err != nil {
		return err
	}
	if inv.InviteeID != userID || inv.Status != "pending" {
		return errors.New("无效邀请")
	}
	// 更新状态
	inv.Status = "accepted"
	inv.UpdatedAt = time.Now()
	if err := db.Save(&inv).Error; err != nil {
		return err
	}
	// 把用户加入团队
	db.Create(&model.TeamMember{TeamID: inv.TeamID, UserID: userID, Role: model.TeamRoleMember, Status: "active", JoinedAt: time.Now().Unix()})
	// 通知邀请人
	notification.Send("团队", "邀请已接受", "用户已接受加入团队", "success", &userID, "系统", []uint{inv.InviterID})
	return nil
}

// Reject 拒绝
func Reject(userID, invitationID uint) error {
	db := common.DB()
	var inv model.Invitation
	if err := db.First(&inv, invitationID).Error; err != nil {
		return err
	}
	if inv.InviteeID != userID || inv.Status != "pending" {
		return errors.New("无效邀请")
	}
	inv.Status = "rejected"
	inv.UpdatedAt = time.Now()
	if err := db.Save(&inv).Error; err != nil {
		return err
	}
	notification.Send("团队", "邀请被拒绝", "用户拒绝加入团队", "warning", &userID, "系统", []uint{inv.InviterID})
	return nil
}

// Revoke 撤回邀请
func Revoke(inviterID, invitationID uint) error {
	db := common.DB()
	var inv model.Invitation
	if err := db.First(&inv, invitationID).Error; err != nil {
		return err
	}
	if inv.InviterID != inviterID || inv.Status != "pending" {
		return errors.New("无法撤回")
	}
	inv.Status = "revoked"
	inv.UpdatedAt = time.Now()
	if err := db.Save(&inv).Error; err != nil {
		return err
	}
	notification.Send("团队", "邀请已撤回", "团队邀请已被撤回", "warning", &inv.InviterID, "系统", []uint{inv.InviteeID})
	return nil
}
