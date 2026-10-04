# Exports the deck to PDF with PowerPoint itself (fonts rendered exactly as the jury will see them).
#   powershell -ExecutionPolicy Bypass -File docs/deck_to_pdf.ps1
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$out = Join-Path (Split-Path -Parent (Split-Path -Parent $here)) '04_LIVRABLES'
$pptx = Join-Path $out 'Mishkat_presentation.pptx'
$pdf = Join-Path $out 'Mishkat_presentation.pdf'
$app = New-Object -ComObject PowerPoint.Application
try {
  $p = $app.Presentations.Open($pptx, $true, $false, $false)
  $p.SaveAs($pdf, 32)   # ppSaveAsPDF
  $p.Close()
  Write-Output "saved $pdf"
} finally { $app.Quit() }
