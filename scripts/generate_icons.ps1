Add-Type -AssemblyName System.Drawing

$srcPath = "c:\code\tanod\static\images\tanod-logo.jpg"
$src = [System.Drawing.Image]::FromFile($srcPath)

function Save-Resized($w, $h, $dest) {
    $bmp = New-Object System.Drawing.Bitmap($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($src, 0, 0, $w, $h)
    $bmp.Save($dest, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}

Save-Resized 32 32 "c:\code\tanod\static\favicon.png"
Save-Resized 32 32 "c:\code\tanod\src-tauri\icons\32x32.png"
Save-Resized 128 128 "c:\code\tanod\src-tauri\icons\128x128.png"
Save-Resized 256 256 "c:\code\tanod\src-tauri\icons\128x128@2x.png"
Save-Resized 512 512 "c:\code\tanod\src-tauri\icons\icon.png"
Save-Resized 30 30 "c:\code\tanod\src-tauri\icons\Square30x30Logo.png"
Save-Resized 44 44 "c:\code\tanod\src-tauri\icons\Square44x44Logo.png"
Save-Resized 71 71 "c:\code\tanod\src-tauri\icons\Square71x71Logo.png"
Save-Resized 89 89 "c:\code\tanod\src-tauri\icons\Square89x89Logo.png"
Save-Resized 107 107 "c:\code\tanod\src-tauri\icons\Square107x107Logo.png"
Save-Resized 142 142 "c:\code\tanod\src-tauri\icons\Square142x142Logo.png"
Save-Resized 150 150 "c:\code\tanod\src-tauri\icons\Square150x150Logo.png"
Save-Resized 284 284 "c:\code\tanod\src-tauri\icons\Square284x284Logo.png"
Save-Resized 310 310 "c:\code\tanod\src-tauri\icons\Square310x310Logo.png"
Save-Resized 50 50 "c:\code\tanod\src-tauri\icons\StoreLogo.png"

$icoBmp = New-Object System.Drawing.Bitmap($src, 256, 256)
$hIcon = $icoBmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)

$stream1 = [System.IO.File]::Create("c:\code\tanod\src-tauri\icons\icon.ico")
$icon.Save($stream1)
$stream1.Close()
$stream1.Dispose()

$stream2 = [System.IO.File]::Create("c:\code\tanod\static\favicon.ico")
$icon.Save($stream2)
$stream2.Close()
$stream2.Dispose()

$icon.Dispose()
$icoBmp.Dispose()
$src.Dispose()

Write-Output "Successfully updated all icons and favicons from tanod-logo.jpg"
