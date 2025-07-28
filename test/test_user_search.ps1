# 测试用户搜索API

# 首先登录获取token
$loginResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/auth/login" -Method POST -ContentType "application/json" -Body (@{
    email = "admin@example.com"
    password = "admin123"
} | ConvertTo-Json)

if ($loginResponse.access_token) {
    $token = $loginResponse.access_token
    Write-Host "登录成功，获取到token: $($token.Substring(0, 20))..."
    
    # 测试用户搜索
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    try {
        Write-Host "测试搜索用户..."
        $searchResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/users/search?q=admin&limit=10" -Method GET -Headers $headers
        Write-Host "搜索成功，找到 $($searchResponse.Count) 个用户:"
        $searchResponse | ForEach-Object {
            Write-Host "- ID: $($_.id), Email: $($_.email), Nickname: $($_.nickname)"
        }
    } catch {
        Write-Host "搜索失败: $($_.Exception.Message)"
        Write-Host "响应内容: $($_.Exception.Response)"
    }
} else {
    Write-Host "登录失败"
    $loginResponse
} 