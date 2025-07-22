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
}

export interface Plan {
  ID: number
  ProductID?: number
  Code?: string
  DisplayName: string
  Description?: string
  PlanVersion: number
  IsActive?: boolean
  Metadata?: Record<string, any>
  Prices?: Price[]
  CreatedAt?: string
  UpdatedAt?: string
}

export interface Product {
  ID: number
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