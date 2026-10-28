$ErrorActionPreference = 'Stop'
$address = 'http://localhost:5173'
$expected = '2026-10-27-context-playtest'
function Read-Release {
    try { return (Invoke-RestMethod -Uri "$address/release.json" -TimeoutSec 2).id } catch { return $null }
}
try {
    if ((Read-Release) -ne $expected) {
        if (Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue) {
            throw 'Another app is using port 5173. Close that server before starting this release.'
        }
        $node = (Get-Command node -ErrorAction Stop).Source
        $env:PORT = '5173'
        $server = Join-Path $PSScriptRoot 'tools\serve.js'
        Start-Process -FilePath $node -ArgumentList ('"' + $server + '"') -WorkingDirectory $PSScriptRoot -WindowStyle Hidden
        for ($attempt = 0; $attempt -lt 20; $attempt++) {
            if ((Read-Release) -eq $expected) { break }
            Start-Sleep -Milliseconds 250
        }
        if ((Read-Release) -ne $expected) { throw 'Quillbound did not start. Run npm start in this folder to see the server error.' }
    }
    Start-Process $address
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
