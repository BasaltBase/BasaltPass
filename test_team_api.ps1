# 团队功能API测试脚本

Write-Host "=== BasaltPass 团队功能测试 ===" -ForegroundColor Green

# 设置基础URL
$baseUrl = "http://localhost:8080/api/v1"

# 测试用户登录获取token
Write-Host "`n1. 用户登录..." -ForegroundColor Yellow
$loginBody = @{
    email = "admin@example.com"
    password = "password123"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$token = $loginResponse.access_token

Write-Host "登录成功，获取到token" -ForegroundColor Green

# 设置请求头
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# 2. 创建团队
Write-Host "`n2. 创建团队..." -ForegroundColor Yellow
$createTeamBody = @{
    name = "测试团队"
    description = "这是一个测试团队"
    avatar_url = "https://example.com/avatar.png"
} | ConvertTo-Json

try {
    $createResponse = Invoke-RestMethod -Uri "$baseUrl/teams" -Method POST -Body $createTeamBody -Headers $headers
    Write-Host "团队创建成功: $($createResponse.data.team.name)" -ForegroundColor Green
    $teamId = $createResponse.data.team.id
} catch {
    Write-Host "团队创建失败: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 3. 获取用户的所有团队
Write-Host "`n3. 获取用户的所有团队..." -ForegroundColor Yellow
try {
    $teamsResponse = Invoke-RestMethod -Uri "$baseUrl/teams" -Method GET -Headers $headers
    Write-Host "获取团队列表成功，共 $($teamsResponse.data.Count) 个团队" -ForegroundColor Green
    foreach ($team in $teamsResponse.data) {
        Write-Host "  - $($team.team_name) (角色: $($team.role))" -ForegroundColor Cyan
    }
} catch {
    Write-Host "获取团队列表失败: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. 获取团队详情
Write-Host "`n4. 获取团队详情..." -ForegroundColor Yellow
try {
    $teamDetailResponse = Invoke-RestMethod -Uri "$baseUrl/teams/$teamId" -Method GET -Headers $headers
    Write-Host "获取团队详情成功: $($teamDetailResponse.data.name)" -ForegroundColor Green
    Write-Host "  描述: $($teamDetailResponse.data.description)" -ForegroundColor Cyan
    Write-Host "  成员数: $($teamDetailResponse.data.member_count)" -ForegroundColor Cyan
    Write-Host "  用户角色: $($teamDetailResponse.data.user_role)" -ForegroundColor Cyan
} catch {
    Write-Host "获取团队详情失败: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. 获取团队成员列表
Write-Host "`n5. 获取团队成员列表..." -ForegroundColor Yellow
try {
    $membersResponse = Invoke-RestMethod -Uri "$baseUrl/teams/$teamId/members" -Method GET -Headers $headers
    Write-Host "获取团队成员列表成功，共 $($membersResponse.data.Count) 个成员" -ForegroundColor Green
    foreach ($member in $membersResponse.data) {
        Write-Host "  - $($member.user.email) (角色: $($member.role))" -ForegroundColor Cyan
    }
} catch {
    Write-Host "获取团队成员列表失败: $($_.Exception.Message)" -ForegroundColor Red
}

# 6. 更新团队信息
Write-Host "`n6. 更新团队信息..." -ForegroundColor Yellow
$updateTeamBody = @{
    name = "更新后的测试团队"
    description = "这是更新后的团队描述"
} | ConvertTo-Json

try {
    $updateResponse = Invoke-RestMethod -Uri "$baseUrl/teams/$teamId" -Method PUT -Body $updateTeamBody -Headers $headers
    Write-Host "团队信息更新成功: $($updateResponse.message)" -ForegroundColor Green
} catch {
    Write-Host "团队信息更新失败: $($_.Exception.Message)" -ForegroundColor Red
}

# 7. 再次获取团队详情验证更新
Write-Host "`n7. 验证团队信息更新..." -ForegroundColor Yellow
try {
    $teamDetailResponse = Invoke-RestMethod -Uri "$baseUrl/teams/$teamId" -Method GET -Headers $headers
    Write-Host "验证成功: $($teamDetailResponse.data.name)" -ForegroundColor Green
    Write-Host "  新描述: $($teamDetailResponse.data.description)" -ForegroundColor Cyan
} catch {
    Write-Host "验证失败: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== 团队功能测试完成 ===" -ForegroundColor Green
Write-Host "注意: 团队删除功能需要谨慎测试，这里暂不执行" -ForegroundColor Yellow 