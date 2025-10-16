# 启动深地矿井健康监测系统
# 同时启动后端服务器和前端开发服务器

Write-Host "========================================"  -ForegroundColor Cyan
Write-Host "  深地矿井健康监测系统 - 启动中..."  -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Node.js
Write-Host "检查 Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version
if ($LASTEXITCODE -eq 0) {
    Write-Host "  Node.js 版本: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "  错误: 未安装 Node.js" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 安装后端依赖
Write-Host "检查后端依赖..." -ForegroundColor Yellow
Push-Location server
if (!(Test-Path "node_modules")) {
    Write-Host "  安装后端依赖..." -ForegroundColor Yellow
    npm install
}
Pop-Location
Write-Host ""

# 安装前端依赖
Write-Host "检查前端依赖..." -ForegroundColor Yellow
Push-Location frontend
if (!(Test-Path "node_modules")) {
    Write-Host "  安装前端依赖..." -ForegroundColor Yellow
    npm install
}
Pop-Location
Write-Host ""

# 初始化数据库
Write-Host "初始化数据库..." -ForegroundColor Yellow
Push-Location server
npm run init-db
Pop-Location
Write-Host ""

Write-Host "========================================"  -ForegroundColor Green
Write-Host "  启动服务器..."  -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Write-Host "后端服务器将在 3000 端口运行" -ForegroundColor Cyan
Write-Host "前端服务器将在 8080 端口运行" -ForegroundColor Cyan
Write-Host ""
Write-Host "启动后请访问: http://localhost:8080" -ForegroundColor Green
Write-Host "API 地址: http://localhost:3000" -ForegroundColor Green
Write-Host ""
Write-Host "按 Ctrl+C 停止所有服务" -ForegroundColor Yellow
Write-Host ""

# 启动后端服务器（后台）
$serverPath = Join-Path $PWD "server"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$serverPath'; npm start"

# 等待 2 秒
Start-Sleep -Seconds 2

# 启动前端服务器（前台）
Push-Location frontend
npm run dev
Pop-Location

