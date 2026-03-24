package wallet

import (
	"errors"

	settingssvc "basaltpass-backend/internal/service/settings"
)

// ErrWalletRechargeWithdrawDisabled 前台钱包充值/提现关闭时返回
var ErrWalletRechargeWithdrawDisabled = errors.New("钱包充值与提现功能暂未开放")

// RechargeWithdrawEnabled 用户钱包充值与提现总开关，默认关闭（未配置时为 false）
func RechargeWithdrawEnabled() bool {
	return settingssvc.GetBool("features.wallet_recharge_withdraw_enabled", false)
}
