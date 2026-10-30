$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
Set-Location $projectRoot
node tools/check.js
if ($LASTEXITCODE -ne 0) { throw 'Static checks failed' }
$manifest = Get-Content -Raw extension/manifest.json | ConvertFrom-Json
New-Item -ItemType Directory -Force dist | Out-Null
$archive = Join-Path $projectRoot "dist/ai-bookmark-organizer-$($manifest.version).zip"
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$extensionRoot = (Resolve-Path extension).Path
$stream = [IO.File]::Open($archive, [IO.FileMode]::Create)
$zip = New-Object IO.Compression.ZipArchive($stream, [IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($file in Get-ChildItem -LiteralPath $extensionRoot -File -Recurse) {
        $entry = $file.FullName.Substring($extensionRoot.Length + 1).Replace('\', '/')
        [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $file.FullName, $entry) | Out-Null
    }
} finally { $zip.Dispose(); $stream.Dispose() }
$hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $archive).Hash.ToLowerInvariant()
Set-Content -Encoding ascii -LiteralPath "$archive.sha256" -Value "$hash  $([IO.Path]::GetFileName($archive))"
Write-Output $archive
