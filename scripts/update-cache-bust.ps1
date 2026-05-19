param(
  [string]$Version
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$versionFile = Join-Path $root "js\site-version.js"

if (-not $Version) {
  if (Test-Path $versionFile) {
    $versionContent = [System.IO.File]::ReadAllText($versionFile)
    $match = [regex]::Match($versionContent, 'const\s+SITE_VERSION\s*=\s*"(?<ver>[^"]+)"')
    if ($match.Success) {
      $Version = $match.Groups["ver"].Value
    }
  }
}

if (-not $Version) {
  throw "SITE_VERSION not found. Pass -Version or set js/site-version.js first."
}

$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
$htmlFiles = Get-ChildItem -Path $root -Recurse -File -Filter "*.html"

foreach ($file in $htmlFiles) {
  $content = [System.IO.File]::ReadAllText($file.FullName)

  $content = [regex]::Replace(
    $content,
    'href="(?<path>[^"]+\.css)(?:\?v=[^"]+)?"',
    {
      param($m)
      $path = $m.Groups["path"].Value
      if ($path -match '^https?://') {
        return $m.Value
      }
      return 'href="' + $path + '?v=' + $Version + '"'
    }
  )

  $content = [regex]::Replace(
    $content,
    'src="(?<path>[^"]+\.js)(?:\?v=[^"]+)?"',
    {
      param($m)
      $path = $m.Groups["path"].Value
      if ($path -match '^https?://') {
        return $m.Value
      }
      return 'src="' + $path + '?v=' + $Version + '"'
    }
  )

  [System.IO.File]::WriteAllText($file.FullName, $content, $utf8NoBom)
}

Write-Output ("Updated cache-busting version to " + $Version + " in " + $htmlFiles.Count + " HTML files.")
