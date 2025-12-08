# Start Node.js server with Java and Gradle in PATH
$env:JAVA_HOME = "C:\Java\jdk-11.0.29+7"
$env:PATH = "C:\Java\jdk-11.0.29+7\bin;C:\Gradle\gradle-8.7\bin;$env:PATH"

Write-Host "JAVA_HOME set to: $env:JAVA_HOME" -ForegroundColor Green
Write-Host "PATH includes Gradle and Java" -ForegroundColor Green
Write-Host ""

npm start
