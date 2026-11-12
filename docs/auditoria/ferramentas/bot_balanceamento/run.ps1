param([string]$name, [int]$timeout = 600, [string]$extra = '')
$d = 'C:\Users\USURIO~2\AppData\Local\Temp\claude\89391ab5feac08f8\ddd56ff4-27b5-4e23-81d7-b68fdd201010\scratchpad'
$g = "$d\audit0\gp"
$parts = @()
if (Test-Path "$g\lib.js") { $parts += (Get-Content "$g\lib.js" -Raw -Encoding UTF8) }
if ($extra) { $parts += (Get-Content "$g\$extra" -Raw -Encoding UTF8) }
$parts += (Get-Content "$g\$name.js" -Raw -Encoding UTF8)
$expr = '(async () => { try {' + ($parts -join "`n") + "`n} catch (__e) { return { FATAL: String(__e && __e.stack || __e), errs: (typeof errs !== 'undefined' ? errs.slice(0, 8) : []) }; } })()"
$out = & "$d\run_game_gl2.ps1" -expr $expr -outDir $g -timeout $timeout -w 1366 -h 768
$out | Out-File -Encoding utf8 "$g\$($name)_out.txt"
$out | Where-Object { $_ -notmatch 'musica/' }
