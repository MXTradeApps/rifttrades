# Clean marketing capture — reset state first, then record a tight flow.
$ErrorActionPreference = 'Continue'
$sdk = "$env:LOCALAPPDATA\Android\Sdk"
$env:Path = "$sdk\platform-tools;" + [System.Environment]::GetEnvironmentVariable('Path','User') + ';' + [System.Environment]::GetEnvironmentVariable('Path','Machine')
$ff = (Get-Command ffmpeg -ErrorAction SilentlyContinue).Source
$outDir = 'C:\Users\maxes\RiftTrades\marketing'

function Tap([int]$X, [int]$Y, [int]$Ms = 700) {
  adb shell input tap $X $Y | Out-Null
  Start-Sleep -Milliseconds $Ms
}
function TypeText([string]$T) {
  adb shell input text ($T -replace ' ', '%s') | Out-Null
}
function Shot([string]$Name) {
  $p = Join-Path $outDir "check_$Name.png"
  cmd /c "adb shell screencap -p /sdcard/s.png"
  cmd /c "adb pull /sdcard/s.png `"$p`""
}

Write-Host '=== Reset app to clean Browse ==='
adb shell am force-stop com.rifttrades.myapp | Out-Null
Start-Sleep -Seconds 1
adb shell am start -n com.rifttrades.myapp/com.rifttrades.rifttrades.MainActivity | Out-Null
Start-Sleep -Seconds 4
# Dismiss update dialog if any
Tap 540 1500 400
Tap 540 1600 400
Tap 135 2248 800  # Browse tab
Shot 'start'
Write-Host 'Ready — starting record'

adb shell rm -f /sdcard/rifttrades_demo.mp4 | Out-Null
$rec = Start-Process -FilePath 'adb' -ArgumentList @('shell','screenrecord','--bit-rate','12M','--time-limit','35','/sdcard/rifttrades_demo.mp4') -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 1.2

# 1) Browse hold
Start-Sleep -Milliseconds 1200

# 2) Open Vendetta
Tap 540 641 1400
Start-Sleep -Milliseconds 800

# 3) Search Baccai in set → detail → Want
Tap 540 320 450
TypeText 'Baccai'
Start-Sleep -Milliseconds 1600
Tap 540 620 1500
Start-Sleep -Milliseconds 1100
Tap 540 2180 900
Start-Sleep -Milliseconds 800

# 4) Back to Browse, search Ahri foil with chart
Tap 70 200 600
Tap 70 200 700
Tap 540 362 450
TypeText 'Ahri'
Start-Sleep -Milliseconds 1800
# Second result (foil epic ~$13) — avoid metal promo further down
Tap 540 750 1600
Start-Sleep -Milliseconds 1000
adb shell input swipe 540 1700 540 1050 320 | Out-Null
Start-Sleep -Milliseconds 1200
Tap 540 2180 800
Start-Sleep -Milliseconds 600

# 5) Trade: add their + my cards
Tap 70 200 500
Tap 980 362 350
Tap 405 2248 1000
Tap 540 351 900
Tap 540 372 400
TypeText 'Jinx'
Start-Sleep -Milliseconds 1600
Tap 540 820 1100
Start-Sleep -Milliseconds 800
Tap 540 1457 900
Tap 540 372 400
TypeText 'Teemo'
Start-Sleep -Milliseconds 1600
Tap 540 700 1200
Start-Sleep -Milliseconds 1800

# 6) Want List collage
Tap 675 2248 1400
Start-Sleep -Milliseconds 1600

# 7) End on Browse
Tap 135 2248 1000
Start-Sleep -Milliseconds 900

Write-Host 'Stopping...'
adb shell pkill -INT screenrecord 2>$null
Start-Sleep -Seconds 2
try { if ($rec -and -not $rec.HasExited) { Stop-Process -Id $rec.Id -Force -ErrorAction SilentlyContinue } } catch {}
Start-Sleep -Seconds 1

$mp4 = Join-Path $outDir 'rifttrades_demo.mp4'
cmd /c "adb pull /sdcard/rifttrades_demo.mp4 `"$mp4`""
Write-Host "MP4 bytes: $((Get-Item $mp4).Length)"

$gif = Join-Path $outDir 'rifttrades_marketing.gif'
$palette = Join-Path $outDir 'palette.png'
& $ff -y -i $mp4 -vf 'fps=11,scale=450:-1:flags=lanczos,palettegen=stats_mode=diff' -update 1 $palette 2>&1 | Select-Object -Last 3
& $ff -y -i $mp4 -i $palette -lavfi 'fps=11,scale=450:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5' $gif 2>&1 | Select-Object -Last 5
Write-Host "GIF: $gif ($((Get-Item $gif).Length) bytes)"
