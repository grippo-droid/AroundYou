$baseUrl = "http://localhost:8000"

# Test 1: Valid Login (assuming user exists)
$body = @{
    phone = "1234567890" 
    password = "password123"
} | ConvertTo-Json

Write-Host "Test 1: JSON Login"
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $body -ContentType "application/json"
    Write-Host "Success: " ($response | ConvertTo-Json -Depth 2)
} catch {
    Write-Error "Failed: $_"
    $stream = $_.Exception.Response.GetResponseStream()
    if ($stream) {
        $reader = New-Object System.IO.StreamReader($stream)
        Write-Host "Response: " $reader.ReadToEnd()
    }
}

# Test 2: Invalid JSON (Missing field)
$bodyBad = @{
    phone = "1234567890"
} | ConvertTo-Json

Write-Host "`nTest 2: Missing Password"
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $bodyBad -ContentType "application/json"
    Write-Host "Success (Unexpected)"
} catch {
    Write-Host "Failed as expected: $($_.Exception.Message)"
    $stream = $_.Exception.Response.GetResponseStream()
    if ($stream) {
        $reader = New-Object System.IO.StreamReader($stream)
        Write-Host "Response: " $reader.ReadToEnd()
    }
}
