package invitation

// AdminListInvitationsRequest 管理员查询邀请列表
type AdminListInvitationsRequest struct {
	Page      int    `query:"page"`
	Limit     int    `query:"limit"`
	Status    string `query:"status"` // pending / accepted / rejected / revoked / all
	TeamID    uint   `query:"team_id"`
	InviterID uint   `query:"inviter_id"`
	InviteeID uint   `query:"invitee_id"`
	Keyword   string `query:"keyword"` // 备注或团队名模糊
}

type AdminInvitationBrief struct {
	ID        uint   `json:"id"`
	TeamID    uint   `json:"team_id"`
	TeamName  string `json:"team_name"`
	InviterID uint   `json:"inviter_id"`
	InviteeID uint   `json:"invitee_id"`
	Status    string `json:"status"`
	Remark    string `json:"remark"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

type AdminListInvitationsResponse struct {
	Invitations []AdminInvitationBrief `json:"invitations"`
	Total       int                    `json:"total"`
}

// AdminCreateInvitationRequest 管理员创建邀请
type AdminCreateInvitationRequest struct {
	TeamID     uint   `json:"team_id"`
	InviterID  uint   `json:"inviter_id"` // 可选，不填则使用系统(0)
	InviteeIDs []uint `json:"invitee_ids"`
	Remark     string `json:"remark"`
}

// AdminUpdateInvitationStatusRequest 强制修改邀请状态
type AdminUpdateInvitationStatusRequest struct {
	Status string `json:"status"` // pending / accepted / rejected / revoked
}
