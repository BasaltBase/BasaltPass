param(
  [string]$Email,
  [string]$Password,
  [string]$Nickname
)

$ErrorActionPreference = 'Stop'

if (-not $Email)    { $Email    = 'admin@basalt.local' }
if (-not $Password) { $Password = 'Admin@12345' }
if (-not $Nickname) { $Nickname = 'AdminUser' }

$BaseUrl = 'http://localhost:8080'

function Invoke-Json {
  param(
    [ValidateSet('GET','POST','PUT','DELETE')]
    [string]$Method,
    [string]$Path,
    [object]$Body = $null,
    [string]$Token = $null
  )
  $headers = @{'Content-Type'='application/json'}
  if ($Token) { $headers['Authorization'] = "Bearer $Token" }
  $uri = "$BaseUrl$Path"
  $options = @{ Method=$Method; Uri=$uri; Headers=$headers }
  if ($Body -ne $null) { $options['Body'] = ($Body | ConvertTo-Json -Depth 10) }
  $resp = Invoke-RestMethod @options
  return $resp
}

function TryLogin {
  param([string]$Identifier,[string]$Pass)
  try {
    $res = Invoke-Json -Method 'POST' -Path '/api/v1/auth/login' -Body @{ identifier=$Identifier; password=$Pass }
    if ($res.refresh_token) { return $res.access_token }
    if ($res.TokenPair -and $res.TokenPair.access_token) { return $res.TokenPair.access_token }
  } catch { return $null }
  return $null
}

Write-Host 'Step 1: acquire admin token (dev superadmin or first user)' -ForegroundColor Cyan
$adminToken = TryLogin 'a@.a' '123456'

if (-not $adminToken) {
  Write-Host 'Dev superadmin not found, try registering first user as global admin...' -ForegroundColor Yellow
  try {
    $u = Invoke-Json -Method 'POST' -Path '/api/v1/auth/register' -Body @{ email=$Email; password=$Password }
    Write-Host ("Registered first user id={0}" -f $u.id) -ForegroundColor Green
  } catch {
    Write-Host ("Register failed (maybe users exist): {0}" -f $_.Exception.Message) -ForegroundColor Yellow
  }
  $adminToken = TryLogin $Email $Password
}

if (-not $adminToken) { throw 'Cannot get admin token. Ensure backend is running and credentials are valid.' }

Write-Host 'Step 2: get admin role id (code=tenant)' -ForegroundColor Cyan
$roles = Invoke-Json -Method 'GET' -Path '/api/v1/tenant/roles' -Token $adminToken
if (-not $roles) { throw 'Cannot list roles (need admin permission).' }

$adminRole = $roles | Where-Object { $_.code -eq 'tenant' } | Select-Object -First 1
if (-not $adminRole) { throw 'Admin role not found (code=tenant).' }
Write-Host ("Using role id={0} code={1}" -f $adminRole.id,$adminRole.code) -ForegroundColor Green

Write-Host 'Step 3: create or upsert target admin user' -ForegroundColor Cyan
$existing = Invoke-Json -Method 'GET' -Path ("/api/v1/tenant/users?search={0}" -f [uri]::EscapeDataString($Email)) -Token $adminToken
$userId = $null
if ($existing -and $existing.users) {
  $match = $existing.users | Where-Object { $_.email -eq $Email } | Select-Object -First 1
  if ($match) { $userId = $match.id }
}

if (-not $userId) {
  $newUser = Invoke-Json -Method 'POST' -Path '/api/v1/tenant/users' -Token $adminToken -Body @{ 
    email=$Email; password=$Password; nickname=$Nickname; email_verified=$true; role_ids=@($adminRole.id) 
  }
  $userId = $newUser.id
  Write-Host ("Created user id={0}" -f $userId) -ForegroundColor Green
} else {
  Write-Host ("User exists id={0}, ensure admin role..." -f $userId) -ForegroundColor Yellow
  Invoke-Json -Method 'POST' -Path ("/api/v1/tenant/users/{0}/roles" -f $userId) -Token $adminToken -Body @{ role_id = $adminRole.id } | Out-Null
}

Write-Host 'Step 4: verify login' -ForegroundColor Cyan
$token = TryLogin $Email $Password
if ($token) {
  $result = [pscustomobject]@{ email=$Email; password=$Password; user_id=$userId; role_id=$adminRole.id }
  $result | ConvertTo-Json -Depth 5 | Write-Output
  Write-Host 'Admin account is ready.' -ForegroundColor Green
} else {
  throw 'Created but cannot login.'
}
