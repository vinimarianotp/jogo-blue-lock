param([string]$teste = 'saves', [string]$arquivo = '', [string]$saida = '', [int]$w = 1280, [int]$h = 720, [int]$timeout = 2400, [string]$page = 'testes/vazio.html')
# Como o rodar.ps1, para os testes de save: troca no JS do teste
#   __SAVES__    pelos saves sintéticos de testes/saves/*.json   ({ nome: texto do save })
#   __ESPERADO__ pelos estados de testes/saves/esperado/*.json  ({ nome: texto do estado })
#   powershell -File testes\rodar_saves.ps1 -teste saves -saida <pasta dos prints>
# O teste roda numa página vazia (testes/vazio.html) e abre o jogo em iframes: assim dá para
# preparar o localStorage e "recarregar" o jogo quantas vezes quiser. Os erros e avisos do
# console de dentro dos iframes também aparecem no fim. -arquivo roda outro .js (caminho
# completo) com as mesmas trocas; -page index.html roda o teste dentro do próprio jogo.
$aqui = $PSScriptRoot
if (-not $saida) { $saida = Join-Path $env:TEMP ('bl_teste_' + $teste) }
New-Item -ItemType Directory -Force $saida | Out-Null
if (-not $arquivo) { $arquivo = Join-Path $aqui ($teste + '.js') }
$js = [IO.File]::ReadAllText($arquivo, [Text.Encoding]::UTF8)
function Mapa($pasta) {
  $m = [ordered]@{}
  Get-ChildItem (Join-Path $pasta '*.json') | Where-Object { $_.BaseName -ne 'antes' } | Sort-Object Name | ForEach-Object {
    $m[$_.BaseName] = [IO.File]::ReadAllText($_.FullName, [Text.Encoding]::UTF8)
  }
  return ($m | ConvertTo-Json -Compress -Depth 3)
}
$js = $js.Replace('__SAVES__', (Mapa (Join-Path $aqui 'saves')))
$js = $js.Replace('__ESPERADO__', (Mapa (Join-Path $aqui 'saves\esperado')))
$ready = if ($page -eq 'index.html') { 'window.App && window.MatchEngine' } else { 'document.readyState === ''complete''' }
& (Join-Path $aqui 'harness.ps1') -expr $js -outDir $saida -timeout $timeout -w $w -h $h -page $page -ready $ready
