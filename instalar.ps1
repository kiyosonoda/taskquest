# Creates "TaskQuest" shortcuts (Desktop + Start Menu) that open this folder's
# index.html as a small Microsoft Edge app window. Run via "Instalar TaskQuest.cmd".
$ErrorActionPreference = 'Stop'
$dir = $PSScriptRoot
$page = Join-Path $dir 'index.html'
if (-not (Test-Path $page)) { throw "index.html nao encontrado em $dir. Extraia o .zip antes de instalar." }

# Find Microsoft Edge (it ships with Windows 10/11).
$edge = @(
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "$env:LOCALAPPDATA\Microsoft\Edge\Application\msedge.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $edge) { throw 'Microsoft Edge nao encontrado neste computador.' }

$url = ([System.Uri]$page).AbsoluteUri   # file:///... with spaces/accents encoded
$sh = New-Object -ComObject WScript.Shell
foreach ($folder in [Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('Programs')) {
  $l = $sh.CreateShortcut((Join-Path $folder 'TaskQuest.lnk'))
  $l.TargetPath = $edge
  $l.Arguments = "--app=`"$url`" --window-size=376,528"
  $l.WorkingDirectory = $dir
  $l.IconLocation = (Join-Path $dir 'icon.ico') + ',0'
  $l.Description = 'TaskQuest'
  $l.Save()
}
Write-Host ''
Write-Host 'Pronto! O atalho TaskQuest foi criado na Area de Trabalho e no Menu Iniciar.'
Write-Host 'Nao mova nem apague esta pasta: o TaskQuest roda a partir dela.'
