# Locate icons in silip and dpa-mastery
Write-Host "--- SILIP FILES ---"
Get-ChildItem -Path "C:\code\silip\src" -Recurse -Include *.ico,*.png,*.svg,*.webp -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host $_.FullName
}
Get-ChildItem -Path "C:\code\silip\public" -Recurse -Include *.ico,*.png,*.svg,*.webp -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host $_.FullName
}

Write-Host "--- DPA-MASTERY ICONS ---"
Get-ChildItem -Path "C:\code\dpa-mastery\landing\public" -Recurse -Include *.ico,*.png,*.svg,*.webp -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host $_.FullName
}
Get-ChildItem -Path "C:\code\dpa-mastery\web" -Recurse -Include *.ico,*.png,*.svg,*.webp -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host $_.FullName
}
