$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$services = @(
  @{Name="identity"; Task=":identity-service:bootRun"},
  @{Name="appointment"; Task=":appointment-service:bootRun"},
  @{Name="clinical"; Task=":clinical-service:bootRun"},
  @{Name="symptom"; Task=":symptom-service:bootRun"},
  @{Name="subscription"; Task=":subscription-service:bootRun"},
  @{Name="notification"; Task=":notification-service:bootRun"},
  @{Name="gateway"; Task=":api-gateway:bootRun"}
)

& "$root\gradlew.bat" :database-migration-runner:bootRun
foreach ($service in $services) {
  Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root'; .\gradlew.bat $($service.Task)"
}
