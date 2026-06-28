$ErrorActionPreference = "Stop"

$baseUrl = $args[0]
if (!$baseUrl) {
  $baseUrl = "http://localhost:8000"
}
$baseUrl = $baseUrl.TrimEnd("/")

Write-Host "Testing $baseUrl/"
Invoke-RestMethod "$baseUrl/"

Write-Host "Testing $baseUrl/status"
Invoke-RestMethod "$baseUrl/status"

Write-Host ""
Write-Host "Manual connect test example:"
Write-Host '$body = @{ login="474033941"; password="PASSWORD"; server="Exness-MT5Trial15"; user_id="SUPABASE_USER_ID" } | ConvertTo-Json'
Write-Host "Invoke-RestMethod -Uri '$baseUrl/connect' -Method Post -ContentType 'application/json' -Body `$body"
