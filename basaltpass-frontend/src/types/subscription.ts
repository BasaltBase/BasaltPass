export interface SubscriptionResponse {
  ID: number
  Status: string
  CurrentPeriodEnd: string
  CurrentPrice?: {
    Plan?: {
      DisplayName: string
      Product?: {
        Name: string
      }
    }
  }
  TenantID?: number // 新增：租户ID
}

export interface Plan {
  ID: number
  TenantID?: number // 新增：租户ID
  ProductID?: number
  Code?: string
  DisplayName: string
  Description?: string
  PlanVersion: number
  IsActive?: boolean
  Metadata?: Record<string, any>
  Prices?: Price[]
  Features?: PlanFeature[]
  CreatedAt?: string
  UpdatedAt?: string
}

export interface PlanFeature {
  ID: number
  PlanID: number
  FeatureKey: string
  ValueNumeric?: number
  ValueText?: string
  Unit?: string
  IsUnlimited: boolean
  Metadata?: Record<string, any>
}

export interface Product {
  ID: number
  TenantID?: number // 新增：租户ID
  Code: string
  Name: string
  Description?: string
  IsActive?: boolean
  Metadata?: Record<string, any>
  Plans?: Plan[]
  CreatedAt?: string
  UpdatedAt?: string
}

export interface Price {
  ID: number
  TenantID?: number // 新增：租户ID
  PlanID?: number
  AmountCents: number
  Currency: string
  BillingPeriod: string
  BillingInterval: number
  UsageType: string
  TrialDays?: number
  IsActive?: boolean
  Metadata?: Record<string, any>
  Plan?: Plan
  CreatedAt?: string
  UpdatedAt?: string
}

export interface Coupon {
  ID: number
  Code: string
  Name: string
  DiscountType: string
  DiscountValue: number
  Duration: string
  DurationInCycles?: number
  MaxRedemptions?: number
  RedeemedCount: number
  ExpiresAt?: string
  IsActive: boolean
  Metadata?: Record<string, any>
  CreatedAt: string
  UpdatedAt: string
  DeletedAt?: string | null
  Subscriptions?: any
}