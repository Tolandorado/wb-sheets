# Script to encode Google Service Account JSON to base64
# Usage: .\encode-google-account.ps1 [path_to_json_file]

param(
    [string]$JsonFile = "service-account.json"
)

if (-not (Test-Path $JsonFile)) {
    Write-Host "Error: File '$JsonFile' not found!" -ForegroundColor Red
    Write-Host "Usage: .\encode-google-account.ps1 [path_to_json_file]" -ForegroundColor Yellow
    exit 1
}

Write-Host "Reading file: $JsonFile" -ForegroundColor Green
$jsonContent = Get-Content $JsonFile -Raw -Encoding UTF8

Write-Host "Encoding to base64..." -ForegroundColor Green
$base64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($jsonContent))

Write-Host "`nResult (copy to .env file):" -ForegroundColor Yellow
Write-Host "GOOGLE_SERVICE_ACCOUNT=$base64" -ForegroundColor Cyan
Write-Host "`nDone!" -ForegroundColor Green

