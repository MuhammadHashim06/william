$outputFile = "repo_dump.txt"

if (Test-Path $outputFile) {
    Remove-Item $outputFile
}

$folders = @("src", "workers", "prisma")

foreach ($folder in $folders) {
    if (Test-Path $folder) {
        Get-ChildItem $folder -Recurse -File |
        Sort-Object FullName |
        ForEach-Object {
            Add-Content $outputFile "=================================================="
            Add-Content $outputFile "FILE: $($_.FullName)"
            Add-Content $outputFile "=================================================="
            Get-Content $_.FullName | Add-Content $outputFile
            Add-Content $outputFile "`n`n"
        }
    }
}

Write-Host "Dump complete: $outputFile"
