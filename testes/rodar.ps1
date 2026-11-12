param([string]$teste = 'cenas_2x', [string]$saida = '', [int]$w = 1280, [int]$h = 720, [int]$timeout = 3000, [string]$mobile = '')
# Roda um teste de testes/ no Chrome sem janela e mostra o resultado + o console.
#   powershell -File testes\rodar.ps1 -teste cenas_2x
# Os prints (window.__shot) e imagens vão para -saida (padrão: pasta temporária).
$aqui = $PSScriptRoot
if (-not $saida) { $saida = Join-Path $env:TEMP ('bl_teste_' + $teste) }
New-Item -ItemType Directory -Force $saida | Out-Null
$js = Get-Content -Raw -Encoding UTF8 (Join-Path $aqui ($teste + '.js'))
$cenas = Get-Content -Raw -Encoding UTF8 (Join-Path $aqui 'cenas.json')
$js = $js.Replace('__CENAS__', $cenas)
& (Join-Path $aqui 'harness.ps1') -expr $js -outDir $saida -timeout $timeout -w $w -h $h -mobile $mobile
