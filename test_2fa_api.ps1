# 测试2FA API的PowerShell脚本
$loginData = @{
    identifier = "test@example.com"
    password = "password123"
} | ConvertTo-Json

Write-Host "Testing login API..."
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/auth/login" -Method POST -Body $loginData -ContentType "application/json"
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    Write-Host "Response: $($_.Exception.Response)"
    exit 1
}

Write-Host "Response:"
$response | ConvertTo-Json -Depth 10

if ($response.need_2fa) {
    Write-Host "`n2FA Methods found:"
    Write-Host "Available methods: $($response.available_2fa_methods -join ', ')"
    Write-Host "Default method: $($response.'2fa_type')"
    Write-Host "User ID: $($response.user_id)"
} 