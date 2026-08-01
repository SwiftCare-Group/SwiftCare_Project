@echo off
title SwiftCare Render Services
color 0A

echo ==========================================
echo Waking SwiftCare API Gateway
echo ==========================================

curl.exe -sS --max-time 180 ^
  https://swiftcare-api-gateway.onrender.com/actuator/health

echo.
echo Waiting 10 seconds for the gateway...
timeout /t 10 /nobreak >nul

echo.
echo ==========================================
echo Waking Identity Service
echo ==========================================

curl.exe -sS --max-time 180 ^
  https://swiftcare-project.onrender.com/api/v1/actuator/health

echo.
echo ==========================================
echo Waking Appointment Service
echo ==========================================

curl.exe -sS --max-time 180 ^
  https://swiftcare-appointment-service.onrender.com/api/v1/actuator/health

echo.
echo ==========================================
echo Waking Clinical Service
echo ==========================================

curl.exe -sS --max-time 180 ^
  https://swiftcare-clinical-service.onrender.com/api/v1/actuator/health

echo.
echo ==========================================
echo Waking Symptom Service
echo ==========================================

curl.exe -sS --max-time 180 ^
  https://swiftcare-symptom-service.onrender.com/api/v1/actuator/health

echo.
echo ==========================================
echo Waking Subscription Service
echo ==========================================

curl.exe -sS --max-time 180 ^
  https://swiftcare-subscription-service.onrender.com/api/v1/actuator/health

echo.
echo ==========================================
echo Waking Notification Service
echo ==========================================

curl.exe -sS --max-time 180 ^
  https://swiftcare-notification-service.onrender.com/api/v1/actuator/health

echo.
echo ==========================================
echo Wake-up requests completed
echo ==========================================
echo.
pause