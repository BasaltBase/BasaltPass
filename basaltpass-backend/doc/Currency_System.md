# 货币系统 (Currency System)

## 概述

BasaltPass 项目现在支持多货币钱包系统，包括法币、加密货币和积分系统。

## 数据表结构

### currencies 表

| 字段名 | 类型 | 描述 | 示例 |
|--------|------|------|------|
| id | uint | 主键 | 1 |
| code | string | 货币代码（唯一） | USD, CNY, BTC |
| name | string | 货币名称 | US Dollar, Chinese Yuan, Bitcoin |
| name_cn | string | 中文名称 | 美元, 人民币, 比特币 |
| symbol | string | 货币符号 | $, ¥, ₿ |
| decimal_places | int | 小数位数 | 2, 8 |
| type | string | 货币类型 | fiat, crypto, points |
| is_active | bool | 是否启用 | true |
| sort_order | int | 排序顺序 | 1, 2, 3 |
| description | string | 描述 | United States Dollar |
| icon_url | string | 图标URL | /icons/usd.png |

### wallets 表变更

原来的 `currency` 字段已改为 `currency_id`，现在通过外键关联到 `currencies` 表的 `id` 字段。

| 字段名 | 类型 | 描述 |
|--------|------|------|
| currency_id | uint | 关联到currencies表的id字段 |

## 默认货币

系统会自动初始化以下默认货币：

- **USD** - 美元 (法币)
- **CNY** - 人民币 (法币)
- **EUR** - 欧元 (法币)
- **BTC** - 比特币 (加密货币)
- **ETH** - 以太坊 (加密货币)
- **POINTS** - 系统积分 (积分)

## API 接口

### 获取所有货币

```http
GET /api/v1/currencies
```

响应：
```json
[
  {
    "id": 1,
    "code": "USD",
    "name": "US Dollar",
    "name_cn": "美元",
    "symbol": "$",
    "decimal_places": 2,
    "type": "fiat",
    "is_active": true,
    "sort_order": 1,
    "description": "United States Dollar",
    "icon_url": ""
  }
]
```

### 获取特定货币

```http
GET /api/v1/currencies/:code
```

示例：
```http
GET /api/v1/currencies/USD
```

### 钱包相关API

```http
GET /api/v1/wallet/balance?currency=USD
```

响应：
```json
{
  "balance": 10000,
  "currency_id": 1
}
```

## 服务层函数

### 货币服务 (currency.Service)

```go
// 获取所有启用的货币
currencies, err := currency.GetAllCurrencies()

// 根据代码获取货币
currency, err := currency.GetCurrencyByCode("USD")

// 创建新货币
err := currency.CreateCurrency(&newCurrency)

// 更新货币
err := currency.UpdateCurrency(&currency)

// 删除货币（软删除）
err := currency.DeleteCurrency(currencyID)

// 初始化默认货币
err := currency.InitDefaultCurrencies()
```

### 钱包服务更新

钱包服务现在提供两套函数：
- 使用货币ID的核心函数（更高效）
- 使用货币代码的便利函数（向后兼容）

```go
// 使用货币ID（推荐）
balance, err := wallet.GetBalance(userID, currencyID)
err := wallet.Recharge(userID, currencyID, 10000)
err := wallet.Withdraw(userID, currencyID, 5000)
history, err := wallet.History(userID, currencyID, 20)

// 使用货币代码（便利函数）
balance, err := wallet.GetBalanceByCode(userID, "USD")
err := wallet.RechargeByCode(userID, "USD", 10000)
err := wallet.WithdrawByCode(userID, "USD", 5000)
history, err := wallet.HistoryByCode(userID, "USD", 20)
```

## 数据迁移

系统会自动处理现有数据的迁移：

1. 创建 `currencies` 表
2. 初始化默认货币数据
3. 将现有钱包的 `currency` 或 `currency_code` 字段迁移到 `currency_id` 字段
4. 删除旧的货币字段

## 货币类型

- **fiat** - 法定货币（如 USD, CNY, EUR）
- **crypto** - 加密货币（如 BTC, ETH）
- **points** - 积分系统（如系统积分、奖励积分）

## 小数位数处理

不同货币有不同的小数位数：
- 法币通常是 2 位小数
- 比特币是 8 位小数
- 以太坊是 18 位小数
- 积分通常是 0 位小数

在前端显示时需要根据 `decimal_places` 字段正确格式化金额。

## 注意事项

1. 货币代码必须唯一
2. 删除货币时使用软删除（设置 `is_active = false`）
3. 创建钱包时会验证货币代码是否存在且启用
4. 金额存储使用最小单位（如美分、聪等）
