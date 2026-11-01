# One-time setup before GitHub can build Card Reader:
#  1. saves your Expo access token as the EXPO_TOKEN secret in theprojectmaker/card-reader
#  2. opens EAS credentials so you can log in to Apple and create the signing certificate/profile
$gh = 'C:\Program Files\GitHub CLI\gh.exe'
$repo = 'theprojectmaker/card-reader'
Set-Location (Join-Path $PSScriptRoot '..')

Write-Host ''
Write-Host 'STEP 1 of 2: Expo token (expo.dev > Account settings > Access tokens > Create)' -ForegroundColor Cyan
$secure = Read-Host 'Paste your Expo access token (it will not show) and press Enter' -AsSecureString
$token = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
if ($token) {
  $token | & $gh secret set EXPO_TOKEN --repo $repo
  if ($LASTEXITCODE -eq 0) { Write-Host 'EXPO_TOKEN saved' -ForegroundColor Green } else { Write-Host 'EXPO_TOKEN FAILED' -ForegroundColor Red }
} else { Write-Host 'No Expo token entered, skipped.' -ForegroundColor Yellow }
$token = $null

Write-Host ''
Write-Host 'STEP 2 of 2: Apple signing. Pick: production > Build Credentials > "Set up all the required credentials", then log in to Apple and say Yes to everything.' -ForegroundColor Cyan
npx --yes eas-cli@latest credentials -p ios
Write-Host ''
Write-Host 'Done. Tell Claude "done" in the chat.' -ForegroundColor Green
