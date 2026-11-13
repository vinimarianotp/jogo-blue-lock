param([string]$expr = '1', [string]$outDir = '', [string]$page = 'index.html', [string]$query = '', [int]$w = 1366, [int]$h = 768, [string]$ready = 'window.App && window.MatchEngine', [int]$timeout = 300, [string]$mobile = '', [string]$base = '')
# Abre o jogo no Chrome sem janela (via DevTools, faz o papel do Playwright), registra
# erros do console desde o carregamento, avalia $expr (async) e salva as imagens que
# voltarem em { imgs: { nome: dataURL } }. window.__shot('nome') tira print da tela.
# Sem -base, abre o jogo da pasta acima de testes/ (a cópia em que o script está).
# ATENÇÃO: se o JS terminar logo depois de um __shot, a resposta se perde: espere ~6 s.
if (-not $base) { $base = ([Uri](Join-Path $PSScriptRoot '..\')).AbsoluteUri }
$chrome = 'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe'
$prof = 'C:\Users\Public\cdp_game_' + [guid]::NewGuid().ToString('N')
$port = 9300 + (Get-Random -Maximum 500)
$url = $base + $page + $query
# $env:BL_GPU = '1' usa a placa de vídeo de verdade (para medir o tempo dos quadros); o padrão é o SwiftShader
$gl = if ($env:BL_GPU -eq '1') { '--use-angle=d3d11' } else { '--use-angle=swiftshader' }
$proc = Start-Process -FilePath $chrome -ArgumentList @('--headless=new', $gl, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required', "--window-size=$w,$h", "--remote-debugging-port=$port", "--user-data-dir=`"$prof`"", 'about:blank') -PassThru
$script:c = $null
$script:nid = 0
$script:events = New-Object System.Collections.ArrayList
function Send($method, $params) {
  $script:nid++
  $msg = @{ id = $script:nid; method = $method; params = $params } | ConvertTo-Json -Depth 8 -Compress
  $bytes = [Text.Encoding]::UTF8.GetBytes($msg)
  $script:c.SendAsync((New-Object ArraySegment[byte] -ArgumentList @(, $bytes)), [System.Net.WebSockets.WebSocketMessageType]::Text, $true, [Threading.CancellationToken]::None).Wait()
  return $script:nid
}
$script:stash = @{}
function WaitFor($id, $secs) {
  # resposta que chegou enquanto esperava outra coisa (ex.: durante um print)
  if ($id -ne 'load' -and $script:stash.ContainsKey($id)) { $s = $script:stash[$id]; $script:stash.Remove($id); return $s }
  $buf = New-Object byte[] 8388608
  $ms = New-Object System.IO.MemoryStream
  $deadline = (Get-Date).AddSeconds($secs)
  while ((Get-Date) -lt $deadline) {
    $seg = New-Object ArraySegment[byte] -ArgumentList @(, $buf)
    $task = $script:c.ReceiveAsync($seg, [Threading.CancellationToken]::None)
    while (-not $task.IsCompleted -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 20 }
    if (-not $task.IsCompleted) { return $null }
    $r = $task.Result
    $ms.Write($buf, 0, $r.Count)
    if (-not $r.EndOfMessage) { continue }
    $txt = [Text.Encoding]::UTF8.GetString($ms.ToArray())
    $ms.SetLength(0)
    $j = $txt | ConvertFrom-Json
    if ($j.method -eq 'Runtime.exceptionThrown') { [void]$script:events.Add('EXCEÇÃO: ' + $j.params.exceptionDetails.exception.description) }
    elseif ($j.method -eq 'Runtime.consoleAPICalled' -and ($j.params.type -eq 'error' -or $j.params.type -eq 'warning')) { [void]$script:events.Add($j.params.type.ToUpper() + ': ' + (($j.params.args | ForEach-Object { if ($_.value) { $_.value } else { $_.description } }) -join ' ')) }
    elseif ($j.method -eq 'Log.entryAdded' -and $j.params.entry.level -eq 'error') { [void]$script:events.Add('LOG: ' + $j.params.entry.text + ' ' + $j.params.entry.url) }
    if ($j.method -eq 'Runtime.bindingCalled' -and $j.params.name -eq '__shot') {
      # a página pediu um print da tela inteira: window.__shot('nome')
      $sid = Send 'Page.captureScreenshot' @{ format = 'png' }
      $sr = WaitFor $sid 60
      if ($sr -and $sr.result.data -and $outDir) {
        $p = Join-Path $outDir ($j.params.payload + '.png')
        [IO.File]::WriteAllBytes($p, [Convert]::FromBase64String($sr.result.data))
        [void]$script:events.Add("print: $p")
      }
      continue
    }
    if ($id -eq 'load' -and $j.method -eq 'Page.loadEventFired') { return $j }
    if ($j.id -eq $id) { return $j }
    if ($j.id) { $script:stash[[int]$j.id] = $j }
  }
  return $null
}
try {
  $ws = $null
  for ($i = 0; $i -lt 40 -and -not $ws; $i++) {
    Start-Sleep -Milliseconds 400
    try { $tabs = Invoke-RestMethod "http://127.0.0.1:$port/json"; $ws = ($tabs | Where-Object { $_.type -eq 'page' } | Select-Object -First 1).webSocketDebuggerUrl } catch {}
  }
  if (-not $ws) { 'sem conexão com o Chrome'; return }
  $script:c = New-Object System.Net.WebSockets.ClientWebSocket
  $script:c.ConnectAsync([Uri]$ws, [Threading.CancellationToken]::None).Wait()
  [void](WaitFor (Send 'Runtime.enable' @{}) 10)
  [void](WaitFor (Send 'Log.enable' @{}) 10)
  [void](WaitFor (Send 'Page.enable' @{}) 10)
  [void](WaitFor (Send 'Runtime.addBinding' @{ name = '__shot' }) 10)
  if ($mobile) {
    # celular emulado: 'largura,altura,dpr' (ex.: 844,390,3) com toque
    $m = $mobile.Split(',')
    [void](WaitFor (Send 'Emulation.setDeviceMetricsOverride' @{ width = [int]$m[0]; height = [int]$m[1]; deviceScaleFactor = [double]$m[2]; mobile = $true }) 10)
    [void](WaitFor (Send 'Emulation.setTouchEmulationEnabled' @{ enabled = $true; maxTouchPoints = 5 }) 10)
    [void](WaitFor (Send 'Emulation.setCPUThrottlingRate' @{ rate = 4 }) 10)
  }
  [void](Send 'Page.navigate' @{ url = $url })
  [void](WaitFor 'load' 60)
  $wrapped = '(async () => { for (let i = 0; i < 150 && !(' + $ready + '); i++) await new Promise((r) => setTimeout(r, 100)); const __r = await (' + $expr + '); return typeof __r === "string" ? __r : JSON.stringify(__r); })()'
  $res = WaitFor (Send 'Runtime.evaluate' @{ expression = $wrapped; awaitPromise = $true; returnByValue = $true }) $timeout
  if (-not $res) { 'tempo esgotado' }
  elseif ($res.result.exceptionDetails) { 'EXCEÇÃO NA AVALIAÇÃO: ' + ($res.result.exceptionDetails | ConvertTo-Json -Depth 6) }
  else {
    $val = $res.result.result.value
    try { $obj = $val | ConvertFrom-Json } catch { $obj = $null }
    if ($obj -and $obj.imgs) {
      $obj.imgs.PSObject.Properties | ForEach-Object {
        $nm = $_.Name; if ($nm -notmatch '\.') { $nm += '.png' }; $p = Join-Path $outDir $nm
        [IO.File]::WriteAllBytes($p, [Convert]::FromBase64String($_.Value.Substring($_.Value.IndexOf(',') + 1)))
        "salvo: $p"
      }
      $obj.PSObject.Properties.Remove('imgs')
      $obj | ConvertTo-Json -Depth 6
    } else { $val }
  }
  "--- eventos (prints, erros e avisos do console): $($script:events.Count)"
  $script:events | Select-Object -First 60
} finally {
  try { Stop-Process -Id $proc.Id -Force } catch {}
  Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object { $_.CommandLine -like "*$prof*" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  Start-Sleep -Milliseconds 400
  Remove-Item -Recurse -Force $prof -ErrorAction SilentlyContinue
}
