# Test fixed coupon creation API
$baseUrl = "http://localhost:8080"

Write-Host "Testing fixed coupon creation API..." -ForegroundColor Green

# Step 1: Admin login
Write-Host "Step 1: Admin login..." -ForegroundColor Yellow

$loginData = @{
    email = "admin@basaltpass.com"
    password = "admin123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/login" -Method POST -ContentType "application/json" -Body $loginData
    $token = $loginResponse.data.access_token
    Write-Host "Admin login successful" -ForegroundColor Green
} catch {
    Write-Host "Admin login failed:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# Step 2: Create coupon
Write-Host "Step 2: Create coupon..." -ForegroundColor Yellow

$couponData = @{
    code = "SAVE20_FIXED"
    name = "Fixed test coupon"
    discount_type = "percentage"
    discount_value = 17
    max_redemptions = $null
    expires_at = "2025-08-02T00:00:00Z"
    is_active = $true
} | ConvertTo-Json

Write-Host "Sending data:" -ForegroundColor Cyan
Write-Host $couponData

try {
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/admin/coupons" -Method POST -Headers $headers -Body $couponData
    
    Write-Host "Coupon created successfully!" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Blue
    $response | ConvertTo-Json -Depth 10 | Write-Host
    
} catch {
    Write-Host "Coupon creation failed:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $errorBody = $reader.ReadToEnd()
            Write-Host "Error details: $errorBody" -ForegroundColor Red
        } catch {
            Write-Host "Could not read error details" -ForegroundColor Red
        }
    }
}

Write-Host "Test completed." -ForegroundColor Green 