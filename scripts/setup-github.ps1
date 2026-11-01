# One-time: puts this folder on GitHub as PUBLIC theprojectmaker/card-reader (private
# repos can't get free macOS builds on this account) and saves EXPO_TOKEN as a secret.
# The repo holds no secrets: just code, app.json and the EAS project id.
$gh = 'C:\Program Files\GitHub CLI\gh.exe'
$repo = 'theprojectmaker/card-reader'
Set-Location (Join-Path $PSScriptRoot '..')

if (-not (Test-Path .git)) {
  git init -b main | Out-Null
  git config user.name 'theprojectmaker'
  git config user.email '197445453+theprojectmaker@users.noreply.github.com'
}
git add -A
git commit -m 'Card Reader: NFC card info app' | Out-Null
& $gh repo view $repo 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  & $gh repo create $repo --public --source . --remote origin --push
} else {
  git push -u origin main
}

$secure = Read-Host 'Paste your Expo access token (it will not show) and press Enter' -AsSecureString
$token = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
if ($token) {
  $token | & $gh secret set EXPO_TOKEN --repo $repo
  if ($LASTEXITCODE -eq 0) { Write-Host 'EXPO_TOKEN saved' } else { Write-Host 'EXPO_TOKEN FAILED' }
} else { Write-Host 'No Expo token entered, skipped.' }
$token = $null
