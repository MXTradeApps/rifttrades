# Record a RiftTrades marketing walkthrough on the Android emulator.
$ErrorActionPreference = 'Stop'
$sdk = "$env:LOCALAPPDATA\Android\Sdk"
$env:Path = "$sdk\platform-tools;$env:Path"
$outDir = 'C:\Users\maxes\RiftTrades\marketing'
$uiXml = '/sdcard/ui.xml'
$localUi = Join-Path $outDir 'ui_live.xml'

function Get-NodeCenter([string]$ContentDesc) {
  adb shell uiautomator dump $uiXml 2>&1 | Out-Null
  cmd /c "adb pull $uiXml `"$localUi`" >nul 2>&1"
  if (-not (Test-Path $localUi)) { return $null }
  $xml = Get-Content -Raw $localUi
  # Match content-desc that equals or starts with the label (tabs include newlines)
  $escaped = [regex]::Escape($ContentDesc)
  $pattern = 'content-desc="' + $escaped + '[^"]*"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"'
  $m = [regex]::Match($xml, $pattern)
  if (-not $m.Success) {
    # Flutter sometimes puts bounds before content-desc
    $pattern2 = 'bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"[^>]*content-desc="' + $escaped + '[^"]*"'
    $m = [regex]::Match($xml, $pattern2)
  }
  if (-not $m.Success) { return $null }
  $x1 = [int]$m.Groups[1].Value
  $y1 = [int]$m.Groups[2].Value
  $x2 = [int]$m.Groups[3].Value
  $y2 = [int]$m.Groups[4].Value
  return @{ X = [int](($x1 + $x2) / 2); Y = [int](($y1 + $y2) / 2) }
}

function Tap-Desc([string]$Desc, [int]$WaitMs = 800) {
  $c = Get-NodeCenter $Desc
  if ($null -eq $c) { Write-Host "MISS: $Desc"; return $false }
  Write-Host "TAP $Desc @ $($c.X),$($c.Y)"
  adb shell input tap $c.X $c.Y | Out-Null
  Start-Sleep -Milliseconds $WaitMs
  return $true
}

function Tap-XY([int]$X, [int]$Y, [int]$WaitMs = 600) {
  Write-Host "TAP $X,$Y"
  adb shell input tap $X $Y | Out-Null
  Start-Sleep -Milliseconds $WaitMs
}

function Wait-Desc([string]$Desc, [int]$TimeoutSec = 12) {
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  while ((Get-Date) -lt $deadline) {
    $c = Get-NodeCenter $Desc
    if ($null -ne $c) { return $c }
    Start-Sleep -Milliseconds 400
  }
  return $null
}

function Type-Text([string]$Text) {
  # adb input text: space = %s
  $encoded = $Text -replace ' ', '%s'
  adb shell input text $encoded | Out-Null
}

Write-Host '=== Preparing demo state ==='
# Ensure we're on Browse (home). Press back a few times to clear stacks.
1..4 | ForEach-Object { adb shell input keyevent 4; Start-Sleep -Milliseconds 250 }
Tap-Desc 'Browse' 600 | Out-Null

# Dismiss update dialog if present
if (Get-NodeCenter 'Later') { Tap-Desc 'Later' 500 | Out-Null }
if (Get-NodeCenter 'Not now') { Tap-Desc 'Not now' 500 | Out-Null }
if (Get-NodeCenter 'Dismiss') { Tap-Desc 'Dismiss' 500 | Out-Null }

Write-Host '=== Starting screenrecord ==='
adb shell rm -f /sdcard/rifttrades_demo.mp4 | Out-Null
# screenrecord runs until killed; start in background
$recJob = Start-Job -ScriptBlock {
  $sdk = "$env:LOCALAPPDATA\Android\Sdk"
  $env:Path = "$sdk\platform-tools;$env:Path"
  adb shell screenrecord --bit-rate 8M --time-limit 45 /sdcard/rifttrades_demo.mp4
}
Start-Sleep -Seconds 1.2

# --- SCENE 1: Browse sets ---
Start-Sleep -Milliseconds 900
Tap-Desc 'Vendetta' 1400 | Out-Null
Start-Sleep -Milliseconds 800
# Scroll a bit through the set
adb shell input swipe 540 1600 540 900 350 | Out-Null
Start-Sleep -Milliseconds 700
# Tap roughly first visible card row (below app bar / filters)
Tap-XY 540 700 1200
# If we landed on detail, great; else try another tap
if (-not (Get-NodeCenter 'Want')) {
  Tap-XY 540 900 1200
}

# --- SCENE 2: Card detail prices ---
$want = Wait-Desc 'Want' 8
if ($null -ne $want) {
  Start-Sleep -Milliseconds 1200
  # Scroll down to show price chart area
  adb shell input swipe 540 1700 540 900 400 | Out-Null
  Start-Sleep -Milliseconds 1000
  adb shell input swipe 540 900 540 1600 350 | Out-Null
  Start-Sleep -Milliseconds 600
  Tap-Desc 'Want' 900 | Out-Null
}

# Back to set, then Browse
adb shell input keyevent 4
Start-Sleep -Milliseconds 500
adb shell input keyevent 4
Start-Sleep -Milliseconds 600

# --- SCENE 3: Global search ---
Tap-XY 540 362 500  # search field
Type-Text 'Ahri'
Start-Sleep -Milliseconds 1800
# Tap first result area
Tap-XY 540 650 1400
if (Get-NodeCenter 'Want') {
  Start-Sleep -Milliseconds 900
  Tap-Desc 'Want' 700 | Out-Null
}
adb shell input keyevent 4
Start-Sleep -Milliseconds 400
# Clear search via back / clear
adb shell input keyevent 4
Start-Sleep -Milliseconds 400
1..2 | ForEach-Object { adb shell input keyevent 4; Start-Sleep -Milliseconds 250 }
Tap-Desc 'Browse' 500 | Out-Null
# Clear search if still focused
$clear = Get-NodeCenter 'Clear'
if ($null -ne $clear) { Tap-Desc 'Clear' 400 | Out-Null }

# --- SCENE 4: Trade balancer ---
Tap-Desc 'Trade' 900 | Out-Null
Tap-Desc 'Add their cards' 1000 | Out-Null
# Card picker search
$pickerSearch = Get-NodeCenter 'Search'
if ($null -eq $pickerSearch) {
  # tap likely search field near top
  Tap-XY 540 280 500
} else {
  Tap-Desc 'Search' 400 | Out-Null
}
Type-Text 'Jinx'
Start-Sleep -Milliseconds 1600
Tap-XY 540 700 900
# Confirm add if there's a button
if (Get-NodeCenter 'Add') { Tap-Desc 'Add' 800 | Out-Null }
elseif (Get-NodeCenter 'Done') { Tap-Desc 'Done' 800 | Out-Null }
else {
  # some pickers add on tap and close; wait
  Start-Sleep -Milliseconds 600
  adb shell input keyevent 4
  Start-Sleep -Milliseconds 400
}

# Add my cards
if (Get-NodeCenter 'Add my cards') {
  Tap-Desc 'Add my cards' 1000 | Out-Null
} elseif (Get-NodeCenter 'Add your cards') {
  Tap-Desc 'Add your cards' 1000 | Out-Null
} else {
  # empty-state alternate labels
  Tap-XY 540 1800 900
}
Tap-XY 540 280 400
Type-Text 'Teemo'
Start-Sleep -Milliseconds 1600
Tap-XY 540 700 900
if (Get-NodeCenter 'Add') { Tap-Desc 'Add' 800 | Out-Null }
elseif (Get-NodeCenter 'Done') { Tap-Desc 'Done' 800 | Out-Null }
else { Start-Sleep -Milliseconds 500; adb shell input keyevent 4; Start-Sleep -Milliseconds 400 }

# Let trade delta settle on screen
Start-Sleep -Milliseconds 1800

# --- SCENE 5: Want List collage ---
Tap-Desc 'Want List' 1200 | Out-Null
Start-Sleep -Milliseconds 1600
adb shell input swipe 540 1600 540 1100 300 | Out-Null
Start-Sleep -Milliseconds 1000

# --- SCENE 6: Lend ---
Tap-Desc 'Lend' 1100 | Out-Null
Start-Sleep -Milliseconds 1200

# End on Browse for a clean loop feel
Tap-Desc 'Browse' 900 | Out-Null
Start-Sleep -Milliseconds 800

Write-Host '=== Stopping screenrecord ==='
# Give screenrecord a moment, then kill it cleanly
adb shell pkill -INT screenrecord 2>$null
Start-Sleep -Seconds 2
# Wait for job
Wait-Job $recJob -Timeout 20 | Out-Null
Receive-Job $recJob | Out-Null
Remove-Job $recJob -Force -ErrorAction SilentlyContinue

$mp4 = Join-Path $outDir 'rifttrades_demo.mp4'
cmd /c "adb pull /sdcard/rifttrades_demo.mp4 `"$mp4`""
Write-Host 'Done recording.'
if (Test-Path $mp4) { Get-Item $mp4 | Format-List Name, Length } else { Write-Host 'ERROR: mp4 missing' }
