# Polished RiftTrades marketing capture — fixed coords from verified dry runs.
$ErrorActionPreference = 'Continue'
$sdk = "$env:LOCALAPPDATA\Android\Sdk"
$env:Path = "$sdk\platform-tools;$env:USERPROFILE\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.2-full_build\bin;$env:Path"
# Also try common ffmpeg locations
$ffCmd = Get-Command ffmpeg -ErrorAction SilentlyContinue
$ff = $null
if ($ffCmd) { $ff = $ffCmd.Source }
if (-not $ff) {
  $cand = Get-ChildItem -Path "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Recurse -Filter ffmpeg.exe -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($cand) { $ff = $cand.FullName }
}
Write-Host "ffmpeg: $ff"

$outDir = 'C:\Users\maxes\RiftTrades\marketing'
function Tap([int]$X, [int]$Y, [int]$Ms = 700) {
  adb shell input tap $X $Y | Out-Null
  Start-Sleep -Milliseconds $Ms
}
function TypeText([string]$T) {
  adb shell input text ($T -replace ' ', '%s') | Out-Null
}

# Foreground app without killing state
adb shell am start -n com.rifttrades.myapp/com.rifttrades.rifttrades.MainActivity | Out-Null
Start-Sleep -Seconds 1.5

# Navigate home via bottom nav (never system BACK — it leaves the app)
Tap 135 2248 600
# Pop any pushed routes with in-app back (top-left) a few times if needed
1..3 | ForEach-Object {
  # Only tap back if we're not on a root tab — check by trying; harmless on Browse
  Tap 70 200 350
}
Tap 135 2248 500
# Clear search if focused
Tap 980 362 300
Tap 135 2248 400

# Clear trade if leftover (Trade tab → trash if visible)
Tap 405 2248 700
Tap 891 210 500  # approx trash icon when trade non-empty (between save and settings)
# Confirm dialog if any — tap "Clear" / positive around center-bottom of dialog
Tap 700 1400 400
Tap 540 1450 400
Tap 135 2248 500

Write-Host 'Starting screenrecord...'
adb shell rm -f /sdcard/rifttrades_demo.mp4 | Out-Null
$rec = Start-Process -FilePath 'adb' -ArgumentList 'shell','screenrecord','--bit-rate','10M','--time-limit','40','/sdcard/rifttrades_demo.mp4' -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 1.0

# === 1. Browse ===
Start-Sleep -Milliseconds 1100

# === 2. Open Vendetta set ===
Tap 540 641 1300
Start-Sleep -Milliseconds 600
adb shell input swipe 540 1600 540 1000 300 | Out-Null
Start-Sleep -Milliseconds 700

# === 3. Search priced card in set ===
Tap 540 320 450
TypeText 'Baccai'
Start-Sleep -Milliseconds 1500
Tap 540 620 1400
Start-Sleep -Milliseconds 1000
# Want
Tap 540 2180 900
Start-Sleep -Milliseconds 700

# === 4. Back to Browse, global search Ahri (hero card w/ chart) ===
Tap 70 200 600
Tap 70 200 700
Tap 540 362 450
TypeText 'Ahri'
Start-Sleep -Milliseconds 1700
# Second result = foil Epic with chart (~y 820 based on list)
Tap 540 820 1500
Start-Sleep -Milliseconds 1200
# Scroll to show price history chart
adb shell input swipe 540 1600 540 1100 350 | Out-Null
Start-Sleep -Milliseconds 1100
Tap 540 2180 800
Start-Sleep -Milliseconds 600

# === 5. Trade balancer ===
Tap 70 200 500
Tap 980 362 350
Tap 405 2248 900
Tap 540 351 900   # Add their cards
Tap 540 372 400   # search field
TypeText 'Jinx'
Start-Sleep -Milliseconds 1600
# Pick a mid-value Jinx — second row (~820) often Loose Cannon
Tap 540 820 1100
Start-Sleep -Milliseconds 700
Tap 540 1457 900  # Add my cards
Tap 540 372 400
TypeText 'Teemo'
Start-Sleep -Milliseconds 1600
Tap 540 700 1100
Start-Sleep -Milliseconds 1600

# === 6. Want List collage ===
Tap 675 2248 1300
Start-Sleep -Milliseconds 1500

# === 7. Lend ===
Tap 945 2248 1100
Start-Sleep -Milliseconds 1000

# === 8. End on Browse ===
Tap 135 2248 900
Start-Sleep -Milliseconds 800

Write-Host 'Stopping screenrecord...'
adb shell pkill -INT screenrecord 2>$null
Start-Sleep -Seconds 2
try { Stop-Process -Id $rec.Id -Force -ErrorAction SilentlyContinue } catch {}
Start-Sleep -Seconds 1

$mp4 = Join-Path $outDir 'rifttrades_demo.mp4'
cmd /c "adb pull /sdcard/rifttrades_demo.mp4 `"$mp4`""
if (-not (Test-Path $mp4)) { throw 'Recording missing' }
Write-Host "Pulled MP4: $((Get-Item $mp4).Length) bytes"

# Convert to social-friendly GIF (phone aspect, ~480px wide, optimized palette)
$gif = Join-Path $outDir 'rifttrades_marketing.gif'
$palette = Join-Path $outDir 'palette.png'
if ($ff) {
  & $ff -y -i $mp4 -vf 'fps=12,scale=480:-1:flags=lanczos,palettegen=stats_mode=diff' -update 1 $palette
  & $ff -y -i $mp4 -i $palette -lavfi 'fps=12,scale=480:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5' $gif
  Write-Host "GIF: $gif ($((Get-Item $gif).Length) bytes)"
} else {
  Write-Host 'ffmpeg not found — MP4 only'
}
