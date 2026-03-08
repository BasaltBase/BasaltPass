# OAuth2流程测试脚本
# 测试BasaltPass OAuth2授权服务器功能

$BASE_URL = "http://localhost:8080"
$ADMIN_TOKEN = ""  # 需要先登录获取管理员token

# 函数：获取管理员token
function Get-AdminToken {
    Write-Host "=== 步骤1：管理员登录 ===" -ForegroundColor Green
    
    $loginData = @{
        identifier = "admin@example.com"
        password = "admin123"
    } | ConvertTo-Json

    try {
        $response = Invoke-RestMethod -Uri "$BASE_URL/api/v1/auth/login" -Method POST -Body $loginData -ContentType "application/json"
        if ($response.access_token) {
            $script:ADMIN_TOKEN = $response.access_token
            Write-Host "✓ 管理员登录成功" -ForegroundColor Green
            return $true
        }
    } catch {
        Write-Host "✗ 管理员登录失败: $_" -ForegroundColor Red
        return $false
    }
}

# 函数：创建OAuth2客户端
function Create-OAuth2Client {
    Write-Host "=== 步骤2：创建OAuth2客户端 ===" -ForegroundColor Green
    
    $clientData = @{
        name = "测试应用"
        description = "用于测试OAuth2流程的示例应用"
        redirect_uris = @("http://localhost:3000/callback", "http://localhost:3000/auth/callback")
        scopes = @("openid", "profile", "email")
        allowed_origins = @("http://localhost:3000")
    } | ConvertTo-Json

    $headers = @{
        "Authorization" = "Bearer $ADMIN_TOKEN"
        "Content-Type" = "application/json"
    }

    try {
        $response = Invoke-RestMethod -Uri "$BASE_URL/api/v1/admin/oauth/clients" -Method POST -Body $clientData -Headers $headers
        if ($response.data.client_id) {
            $script:CLIENT_ID = $response.data.client_id
            $script:CLIENT_SECRET = $response.data.client_secret
            Write-Host "✓ OAuth2客户端创建成功" -ForegroundColor Green
            Write-Host "  Client ID: $($response.data.client_id)" -ForegroundColor Yellow
            Write-Host "  Client Secret: $($response.data.client_secret)" -ForegroundColor Yellow
            return $true
        }
    } catch {
        Write-Host "✗ OAuth2客户端创建失败: $_" -ForegroundColor Red
        return $false
    }
}

# 函数：获取客户端列表
function Get-OAuth2Clients {
    Write-Host "=== 步骤3：获取客户端列表 ===" -ForegroundColor Green
    
    $headers = @{
        "Authorization" = "Bearer $ADMIN_TOKEN"
    }

    try {
        $response = Invoke-RestMethod -Uri "$BASE_URL/api/v1/admin/oauth/clients" -Method GET -Headers $headers
        Write-Host "✓ 客户端列表获取成功" -ForegroundColor Green
        Write-Host "  总数: $($response.data.total)" -ForegroundColor Yellow
        foreach ($client in $response.data.clients) {
            Write-Host "  - $($client.name) ($($client.client_id))" -ForegroundColor Cyan
        }
        return $true
    } catch {
        Write-Host "✗ 获取客户端列表失败: $_" -ForegroundColor Red
        return $false
    }
}

# 函数：测试授权URL生成
function Test-AuthorizeURL {
    Write-Host "=== 步骤4：生成授权URL ===" -ForegroundColor Green
    
    $params = @{
        client_id = $CLIENT_ID
        redirect_uri = "http://localhost:3000/callback"
        response_type = "code"
        scope = "openid profile email"
        state = "test-state-123"
    }
    
    $queryString = ($params.GetEnumerator() | ForEach-Object { "$($_.Key)=$([System.Web.HttpUtility]::UrlEncode($_.Value))" }) -join "&"
    $authorizeURL = "$BASE_URL/oauth/authorize?$queryString"
    
    Write-Host "✓ 授权URL生成成功:" -ForegroundColor Green
    Write-Host "$authorizeURL" -ForegroundColor Yellow
    
    Write-Host ""
    Write-Host "请在浏览器中访问上述URL进行授权测试" -ForegroundColor Magenta
    Write-Host "授权成功后会重定向到: http://localhost:3000/callback?code=XXX&state=test-state-123" -ForegroundColor Cyan
    
    return $true
}

# 函数：交换授权码为访问令牌（需要手动输入授权码）
function Exchange-AuthorizationCode {
    param([string]$AuthCode)
    
    Write-Host "=== 步骤5：交换授权码为访问令牌 ===" -ForegroundColor Green
    
    if (-not $AuthCode) {
        $AuthCode = Read-Host "请输入授权码"
    }
    
    $tokenData = @{
        grant_type = "authorization_code"
        code = $AuthCode
        redirect_uri = "http://localhost:3000/callback"
        client_id = $CLIENT_ID
        client_secret = $CLIENT_SECRET
    }
    
    try {
        $response = Invoke-RestMethod -Uri "$BASE_URL/oauth/token" -Method POST -Body $tokenData -ContentType "application/x-www-form-urlencoded"
        if ($response.access_token) {
            $script:ACCESS_TOKEN = $response.access_token
            Write-Host "✓ 访问令牌获取成功" -ForegroundColor Green
            Write-Host "  Access Token: $($response.access_token)" -ForegroundColor Yellow
            Write-Host "  Token Type: $($response.token_type)" -ForegroundColor Yellow
            Write-Host "  Expires In: $($response.expires_in) seconds" -ForegroundColor Yellow
            if ($response.refresh_token) {
                $script:REFRESH_TOKEN = $response.refresh_token
                Write-Host "  Refresh Token: $($response.refresh_token)" -ForegroundColor Yellow
            }
            return $true
        }
    } catch {
        Write-Host "✗ 访问令牌获取失败: $_" -ForegroundColor Red
        return $false
    }
}

# 函数：获取用户信息
function Get-UserInfo {
    Write-Host "=== 步骤6：获取用户信息 ===" -ForegroundColor Green
    
    $headers = @{
        "Authorization" = "Bearer $ACCESS_TOKEN"
    }
    
    try {
        $response = Invoke-RestMethod -Uri "$BASE_URL/oauth/userinfo" -Method GET -Headers $headers
        Write-Host "✓ 用户信息获取成功" -ForegroundColor Green
        Write-Host "  User ID: $($response.sub)" -ForegroundColor Yellow
        Write-Host "  Name: $($response.name)" -ForegroundColor Yellow
        Write-Host "  Email: $($response.email)" -ForegroundColor Yellow
        Write-Host "  Email Verified: $($response.email_verified)" -ForegroundColor Yellow
        return $true
    } catch {
        Write-Host "✗ 用户信息获取失败: $_" -ForegroundColor Red
        return $false
    }
}

# 函数：令牌内省
function Introspect-Token {
    Write-Host "=== 步骤7：令牌内省 ===" -ForegroundColor Green
    
    $introspectData = @{
        token = $ACCESS_TOKEN
    }
    
    try {
        $response = Invoke-RestMethod -Uri "$BASE_URL/oauth/introspect" -Method POST -Body $introspectData -ContentType "application/x-www-form-urlencoded"
        Write-Host "✓ 令牌内省成功" -ForegroundColor Green
        Write-Host "  Active: $($response.active)" -ForegroundColor Yellow
        if ($response.active) {
            Write-Host "  Client ID: $($response.client_id)" -ForegroundColor Yellow
            Write-Host "  Username: $($response.username)" -ForegroundColor Yellow
            Write-Host "  Scope: $($response.scope)" -ForegroundColor Yellow
            Write-Host "  Expires At: $([DateTimeOffset]::FromUnixTimeSeconds($response.exp).ToString())" -ForegroundColor Yellow
        }
        return $true
    } catch {
        Write-Host "✗ 令牌内省失败: $_" -ForegroundColor Red
        return $false
    }
}

# 主测试流程
function Start-OAuth2Test {
    Write-Host "===========================================" -ForegroundColor Magenta
    Write-Host "        BasaltPass OAuth2 流程测试        " -ForegroundColor Magenta
    Write-Host "===========================================" -ForegroundColor Magenta
    Write-Host ""
    
    # 步骤1：管理员登录
    if (-not (Get-AdminToken)) {
        Write-Host "测试终止：无法获取管理员token" -ForegroundColor Red
        return
    }
    
    # 步骤2：创建OAuth2客户端
    if (-not (Create-OAuth2Client)) {
        Write-Host "测试终止：无法创建OAuth2客户端" -ForegroundColor Red
        return
    }
    
    # 步骤3：获取客户端列表
    Get-OAuth2Clients | Out-Null
    
    # 步骤4：生成授权URL
    Test-AuthorizeURL | Out-Null
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Magenta
    Write-Host "手动测试部分 - 需要用户交互" -ForegroundColor Magenta
    Write-Host "========================================" -ForegroundColor Magenta
    Write-Host ""
    
    Write-Host "接下来需要手动完成以下步骤：" -ForegroundColor Yellow
    Write-Host "1. 复制上面的授权URL到浏览器" -ForegroundColor Cyan
    Write-Host "2. 使用用户账户登录（如果未登录）" -ForegroundColor Cyan
    Write-Host "3. 在授权同意页面点击'授权'" -ForegroundColor Cyan
    Write-Host "4. 从重定向URL中复制授权码" -ForegroundColor Cyan
    Write-Host ""
    
    $continueTest = Read-Host "是否继续手动测试？(y/N)"
    if ($continueTest -eq "y" -or $continueTest -eq "Y") {
        # 步骤5：交换授权码
        if (Exchange-AuthorizationCode) {
            # 步骤6：获取用户信息
            Get-UserInfo | Out-Null
            
            # 步骤7：令牌内省
            Introspect-Token | Out-Null
        }
    }
    
    Write-Host ""
    Write-Host "===========================================" -ForegroundColor Magenta
    Write-Host "           OAuth2 测试完成               " -ForegroundColor Magenta
    Write-Host "===========================================" -ForegroundColor Magenta
}

# 运行测试
Start-OAuth2Test 