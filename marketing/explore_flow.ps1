$ErrorActionPreference = 'Continue'
$sdk = "$env:LOCALAPPDATA\Android\Sdk"
$env:Path = "$sdk\platform-tools;$env:Path"
$out = 'C:\Users\maxes\RiftTrades\marketing\frames'
New-Item -ItemType Directory -Force -Path $out | Out-Null

function Shot([string]$Name) {
  $p = Join-Path $out "$Name.png"
  cmd /c "adb shell screencap -p /sdcard/s.png"
  cmd /c "adb pull /sdcard/s.png `"$p`""
  Write-Host "SHOT $Name"
}

function Tap([int]$X, [int]$Y, [int]$Ms = 700) {
  adb shell input tap $X $Y | Out-Null
  Start-Sleep -Milliseconds $Ms
}

# Bring app to front
adb shell monkey -p com.rifttrades.myapp -c android.intent.category.LAUNCHER 1 | Out-Null
Start-Sleep -Seconds 2
# Clear any overlays / back to root
1..3 | ForEach-Object { adb shell input keyevent 4; Start-Sleep -Milliseconds 200 }
Tap 135 2248 600  # Browse
Shot '01_browse'

# Open Vendetta
Tap 540 641 1500
Shot '02_set'

# Tap a card (approx first row under filters)
Tap 540 750 1400
Shot '03_detail'

# Scroll prices
adb shell input swipe 540 1700 540 900 400 | Out-Null
Start-Sleep -Milliseconds 900
Shot '04_detail_prices'

# Want button is usually bottom action bar ~ y 2100
Tap 270 2100 900
Shot '05_after_want'

# Back twice
adb shell input keyevent 4; Start-Sleep -Milliseconds 400
adb shell input keyevent 4; Start-Sleep -Milliseconds 500
Tap 135 2248 500

# Search Ahri
Tap 540 362 500
adb shell input text 'Ahri' | Out-Null
Start-Sleep -Milliseconds 2000
Shot '06_search'
Tap 540 650 1400
Shot '07_ahri_detail'
adb shell input keyevent 4; Start-Sleep -Milliseconds 400
adb shell input keyevent 4; Start-Sleep -Milliseconds 400
# clear via back or clear icon ~ right of search
Tap 980 362 400
Tap 135 2248 400

# Trade
Tap 405 2248 900
Shot '08_trade_empty'
Tap 540 500 900  # Add their cards (top list when empty may be centered)
Shot '09_picker_or_trade'
# If picker, search
Tap 540 280 400
adb shell input text 'Jinx' | Out-Null
Start-Sleep -Milliseconds 1800
Shot '10_picker_jinx'
Tap 540 700 1000
Shot '11_trade_with_jinx'

# Add my cards - look for button lower
Tap 540 1700 900
Tap 540 280 400
adb shell input text 'Teemo' | Out-Null
Start-Sleep -Milliseconds 1800
Tap 540 700 1000
Shot '12_trade_balanced'

# Want list
Tap 675 2248 1200
Shot '13_wantlist'

# Lend
Tap 945 2248 1100
Shot '14_lend'

Write-Host 'Explore complete'
Get-ChildItem $out | Format-Table Name, Length
