$url = "https://binaries.prisma.sh/all_commits/0c8ef2ce45c83248ab3df073180d5eda9e8be7a3/windows/query-engine.exe.gz"
$output = "query-engine.exe.gz"
$final = "query-engine.exe"
$dest = "node_modules\@prisma\engines\query-engine-windows.exe"

Write-Host "Downloading query engine from $url..."
Invoke-WebRequest -Uri $url -OutFile $output
Write-Host "Download complete. Size: $( (Get-Item $output).Length ) bytes"

function DeGZip-File{
    param($infile, $outfile)
    $input = New-Object System.IO.FileStream $infile, ([IO.FileMode]::Open), ([IO.FileAccess]::Read), ([IO.FileShare]::Read)
    $output = New-Object System.IO.FileStream $outfile, ([IO.FileMode]::Create), ([IO.FileAccess]::Write), ([IO.FileShare]::None)
    $gzipStream = New-Object System.IO.Compression.GZipStream $input, ([IO.Compression.CompressionMode]::Decompress)
    $gzipStream.CopyTo($output)
    $gzipStream.Dispose()
    $output.Dispose()
    $input.Dispose()
}

Write-Host "Decompressing to $final..."
DeGZip-File $output $final
Write-Host "Decompressed Size: $( (Get-Item $final).Length ) bytes"

Write-Host "Moving to $dest..."
Move-Item -Path $final -Destination $dest -Force
Remove-Item $output
Write-Host "Done."
