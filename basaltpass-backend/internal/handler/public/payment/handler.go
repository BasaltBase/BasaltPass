package payment

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"
	payment2 "basaltpass-backend/internal/service/payment"
	"basaltpass-backend/internal/service/wallet"
	"errors"
	"fmt"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

func requireSuperAdmin(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uint)
	if !ok || userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	var user model.User
	if err := common.DB().Select("id", "is_system_admin").First(&user, userID).Error; err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User not found",
		})
	}

	if !user.IsSuperAdmin() {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Basalt super admin access required",
		})
	}
	return nil
}

// CreatePaymentIntentHandler POST /payment/intents - 创建支付意图
func CreatePaymentIntentHandler(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	var req payment2.CreatePaymentIntentRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// 验证必填字段
	if req.Amount <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Amount must be positive",
		})
	}

	paymentIntent, mockResponse, err := payment2.CreatePaymentIntent(userID, req)
	if err != nil {
		if errors.Is(err, wallet.ErrWalletRechargeWithdrawDisabled) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"payment_intent":       paymentIntent,
		"stripe_mock_response": mockResponse,
	})
}

// CreatePaymentSessionHandler POST /payment/sessions - 创建支付会话
func CreatePaymentSessionHandler(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	var req payment2.CreatePaymentSessionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	session, mockResponse, err := payment2.CreatePaymentSession(userID, req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"session":              session,
		"stripe_mock_response": mockResponse,
	})
}

// GetPaymentIntentHandler GET /payment/intents/:id - 获取支付意图
func GetPaymentIntentHandler(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	paymentIntentIDStr := c.Params("id")
	paymentIntentID, err := strconv.ParseUint(paymentIntentIDStr, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid payment intent ID",
		})
	}

	paymentIntent, err := payment2.GetPaymentIntent(userID, uint(paymentIntentID))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "[GetPaymentIntentHandler] Payment intent not found",
		})
	}

	return c.JSON(paymentIntent)
}

// GetPaymentSessionHandler GET /payment/sessions/:session_id - 获取支付会话
func GetPaymentSessionHandler(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	sessionID := c.Params("session_id")

	session, err := payment2.GetPaymentSession(userID, sessionID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Payment session not found",
		})
	}

	return c.JSON(session)
}

// ListPaymentIntentsHandler GET /payment/intents - 获取支付意图列表
func ListPaymentIntentsHandler(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	limitStr := c.Query("limit", "20")
	limit, _ := strconv.Atoi(limitStr)
	if limit > 100 {
		limit = 100 // 限制最大查询数量
	}

	paymentIntents, err := payment2.ListPaymentIntents(userID, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"payment_intents": paymentIntents,
		"count":           len(paymentIntents),
	})
}

// SimulatePaymentHandler POST /payment/simulate/:session_id - 模拟支付处理
func SimulatePaymentHandler(c *fiber.Ctx) error {
	if err := requireSuperAdmin(c); err != nil {
		return err
	}

	sessionID := c.Params("session_id")

	var req struct {
		Success bool `json:"success"`
	}
	if err := c.BodyParser(&req); err != nil {
		// 默认为成功支付
		req.Success = true
	}

	mockResponse, err := payment2.SimulatePayment(sessionID, req.Success)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message":              "Payment simulation completed",
		"success":              req.Success,
		"stripe_mock_response": mockResponse,
	})
}

// PaymentCheckoutHandler GET /payment/checkout/:session_id - 支付页面
func PaymentCheckoutHandler(c *fiber.Ctx) error {
	if err := requireSuperAdmin(c); err != nil {
		return err
	}

	sessionID := c.Params("session_id")

	// 获取session信息以获取success_url
	session, err := payment2.GetPaymentSessionByStripeID(sessionID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Payment session not found",
		})
	}

	// 这里可以返回一个简单的HTML页面用于演示
	// 在实际应用中，这里会重定向到Stripe的支付页面

	html := `
<!DOCTYPE html>
<html>
<head>
    <title>BasaltPass 支付模拟器</title>
    <meta charset="utf-8">
    <style>
        body { 
            font-family: Arial, sans-serif; 
            max-width: 600px; 
            margin: 50px auto; 
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container { 
            background: white; 
            padding: 30px; 
            border-radius: 8px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .title { 
            color: #333; 
            text-align: center; 
            margin-bottom: 30px;
        }
        .session-info {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        .buttons { 
            text-align: center; 
            margin-top: 20px;
        }
        button { 
            padding: 12px 25px; 
            margin: 10px; 
            border: none; 
            border-radius: 5px; 
            cursor: pointer;
            font-size: 16px;
        }
        .success { 
            background-color: #28a745; 
            color: white; 
        }
        .cancel { 
            background-color: #dc3545; 
            color: white; 
        }
        .info { 
            background-color: #007bff; 
            color: white; 
        }
        .response { 
            margin-top: 20px; 
            padding: 15px; 
            background: #f8f9fa; 
            border-radius: 5px;
            display: none;
        }
        pre { 
            white-space: pre-wrap; 
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1 class="title">BasaltPass 支付模拟器</h1>
        <div class="session-info">
            <p><strong>会话ID:</strong> ` + sessionID + `</p>
            <p><strong>金额:</strong> ¥` + fmt.Sprintf("%.2f", float64(session.Amount)/100) + ` ` + session.Currency + `</p>
            <p><strong>状态:</strong> 等待支付</p>
            <p><strong>说明:</strong> 这是一个模拟的Stripe支付页面。在实际环境中，这里会显示真实的Stripe支付表单。</p>
        </div>
        
        <div class="buttons">
            <button class="success" onclick="simulatePayment(true)">✓ 模拟支付成功</button>
            <button class="cancel" onclick="simulatePayment(false)">✗ 模拟支付失败</button>
            <button class="info" onclick="showStripeInfo()">📋 显示Stripe请求信息</button>
        </div>
        
        <div id="response" class="response">
            <h3>模拟响应信息：</h3>
            <pre id="responseContent"></pre>
        </div>
    </div>

    <script>
        // 嵌入的success_url
        const successUrl = '` + session.SuccessURL + `';

        function showModal(message, onConfirm) {
            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;inset:0;background:rgba(17,24,39,.45);display:flex;align-items:center;justify-content:center;z-index:9999;';

            const panel = document.createElement('div');
            panel.style.cssText = 'width:min(92vw,420px);background:#fff;border-radius:12px;box-shadow:0 20px 50px rgba(0,0,0,.25);padding:20px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;';

            const text = document.createElement('p');
            text.style.cssText = 'margin:0 0 16px;color:#111827;line-height:1.6;';
            text.textContent = message;

            const actions = document.createElement('div');
            actions.style.cssText = 'display:flex;justify-content:flex-end;';

            const okBtn = document.createElement('button');
            okBtn.textContent = '确定';
            okBtn.style.cssText = 'border:none;background:#2563eb;color:#fff;border-radius:8px;padding:8px 14px;cursor:pointer;';
            okBtn.onclick = () => {
                document.body.removeChild(overlay);
                if (onConfirm) onConfirm();
            };

            actions.appendChild(okBtn);
            panel.appendChild(text);
            panel.appendChild(actions);
            overlay.appendChild(panel);
            document.body.appendChild(overlay);
        }

        async function simulatePayment(success) {
            try {
                const response = await fetch('/payment/simulate/` + sessionID + `', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ success: success })
                });
                
                const data = await response.json();
                
                document.getElementById('responseContent').textContent = JSON.stringify(data, null, 2);
                document.getElementById('response').style.display = 'block';
                
                if (success && data.stripe_mock_response) {
                    setTimeout(() => {
                        showModal('支付成功！正在跳转...', () => {
                            // 跳转到成功页面
                            window.location.href = successUrl || 'http://localhost:5173/dashboard';
                        });
                    }, 2000);
                }
                
            } catch (error) {
                showModal('请求失败: ' + error.message);
            }
        }
        
        function showStripeInfo() {
            const info = {
                "模拟Stripe信息": {
                    "会话ID": "` + sessionID + `",
                    "说明": "在真实环境中，这里会发送以下请求到Stripe:",
                    "请求URL": "https://api.stripe.com/v1/checkout/sessions/" + "` + sessionID + `",
                    "请求头": {
                        "Authorization": "Bearer sk_live_...",
                        "Content-Type": "application/x-www-form-urlencoded"
                    },
                    "功能": [
                        "创建支付意图",
                        "处理支付方法",
                        "验证支付信息",
                        "触发webhook事件",
                        "更新支付状态"
                    ]
                }
            };
            
            document.getElementById('responseContent').textContent = JSON.stringify(info, null, 2);
            document.getElementById('response').style.display = 'block';
        }
    </script>
</body>
</html>`

	c.Set("Content-Type", "text/html")
	return c.SendString(html)
}
