# 스모크 테스트
#
# 로컬 파일 DB(USE_LOCAL_DB=true) 로 개발 서버를 임시 포트에 띄우고
# 주요 화면과 API 가 200 을 주는지 확인한 뒤 서버를 내린다.
#
#   smoke.bat        -> 3311 포트
#   smoke.bat 3999   -> 3999 포트
#
# .env.local 은 건드리지 않는다. USE_LOCAL_DB 는 띄우는 프로세스에만 준다.

param([int]$Port = 3311)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [Text.Encoding]::UTF8

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$base = "http://localhost:$Port"
$server = $null
$failed = 0

function Stop-Server {
    if ($script:server -and -not $script:server.HasExited) {
        # npm 이 낀 프로세스 트리라 자식까지 같이 내려야 next 가 안 남는다.
        & taskkill.exe /pid $script:server.Id /t /f 2>&1 | Out-Null
    }
    # 혹시 트리에서 빠진 리스너가 있으면 포트로 잡아서 정리한다.
    try {
        Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop |
            Select-Object -ExpandProperty OwningProcess -Unique |
            ForEach-Object { & taskkill.exe /pid $_ /t /f 2>&1 | Out-Null }
    } catch {}
}

function Test-Route([string]$path) {
    $url = "$base$path"
    try {
        $res = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 30
        $code = [int]$res.StatusCode
    } catch [System.Net.WebException] {
        $code = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
    } catch {
        $code = 0
    }
    if ($code -eq 200) {
        Write-Host ("  [  OK  ] {0,3}  {1}" -f $code, $path) -ForegroundColor Green
    } else {
        Write-Host ("  [ FAIL ] {0,3}  {1}" -f $code, $path) -ForegroundColor Red
        $script:failed++
    }
}

try {
    if (-not (Test-Path "node_modules")) {
        Write-Host "[준비] node_modules 가 없다. npm install 부터 한다."
        & npm install
        if ($LASTEXITCODE -ne 0) { throw "npm install 실패" }
    }

    Write-Host ""
    Write-Host "[1/4] 로컬 DB 모드로 개발 서버를 $Port 포트에 띄운다."

    $env:USE_LOCAL_DB = "true"
    $server = Start-Process -FilePath "cmd.exe" `
        -ArgumentList "/c", "npm run dev -- --port $Port" `
        -WindowStyle Hidden -PassThru

    Write-Host "      기동 대기 중 (최대 120초)..." -NoNewline
    $ready = $false
    foreach ($i in 1..60) {
        if ($server.HasExited) { break }
        try {
            Invoke-WebRequest -Uri "$base/" -UseBasicParsing -TimeoutSec 3 | Out-Null
            $ready = $true
            break
        } catch [System.Net.WebException] {
            # HTTP 응답이 왔다면 서버는 살아 있는 것이다 (500 이어도 기동은 끝났다).
            if ($_.Exception.Response) { $ready = $true; break }
        } catch {}
        Start-Sleep -Seconds 2
        Write-Host "." -NoNewline
    }
    Write-Host ""

    if (-not $ready) {
        Write-Host "[실패] 서버가 기동하지 않았다. dev.bat 으로 직접 띄워 로그를 볼 것." -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "[2/4] 라우트 확인"
    "/", "/roster", "/register", "/parties", "/admin", "/api/members", "/api/parties", "/api/posts" |
        ForEach-Object { Test-Route $_ }

    # 파티 상세는 id 를 모르니 목록에서 첫 번째를 뽑아 쓴다.
    $partyId = $null
    try { $partyId = (Invoke-RestMethod "$base/api/parties" -TimeoutSec 30).parties[0].id } catch {}
    if ($partyId) {
        Test-Route "/parties/$partyId"
    } else {
        Write-Host "  [ SKIP ]       /parties/[id]  - 파티 목록이 비어 있다" -ForegroundColor DarkGray
    }

    # ── 홈 글 쓰기 흐름 ─────────────────────────────────────────
    # 비관리자는 막히는지, 관리자는 되는지, 그리고 본문의 위험한 태그가
    # 저장·조회를 거치며 실제로 걸러지는지까지 확인한다.
    Write-Host ""
    Write-Host "[3/4] 홈 글 쓰기 흐름"

    $dirty = '<p><b>공대 모집</b></p><script>alert(1)</script><img src=x onerror=alert(1)>'
    $body = @{ category = "notice"; title = "스모크 테스트 글"; body_html = $dirty } | ConvertTo-Json -Compress

    # 1) 로그인 없이 쓰기 -> 401 이어야 한다
    $code = 0
    try {
        Invoke-WebRequest "$base/api/posts" -Method Post -Body $body -ContentType "application/json" `
            -UseBasicParsing -TimeoutSec 30 | Out-Null
    } catch [System.Net.WebException] {
        if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }
    } catch {}
    if ($code -eq 401) {
        Write-Host "  [  OK  ] 401  비관리자 글쓰기 차단" -ForegroundColor Green
    } else {
        Write-Host "  [ FAIL ] $code  비관리자 글쓰기가 차단되지 않았다" -ForegroundColor Red
        $script:failed++
    }

    # 2) 관리자로 로그인
    $session = $null
    $pw = (Get-Content ".env.local" | Where-Object { $_ -match '^ADMIN_PASSWORD=' }) -replace '^ADMIN_PASSWORD=', ''
    try {
        Invoke-WebRequest "$base/api/admin" -Method Post -Body (@{ password = $pw } | ConvertTo-Json -Compress) `
            -ContentType "application/json" -SessionVariable session -UseBasicParsing -TimeoutSec 30 | Out-Null
        Write-Host "  [  OK  ] 200  관리자 로그인" -ForegroundColor Green
    } catch {
        Write-Host "  [ FAIL ]      관리자 로그인 실패 (ADMIN_PASSWORD 확인)" -ForegroundColor Red
        $script:failed++
    }

    # 3) 관리자로 글 등록 -> 본문이 정제되어 저장되는지
    $postId = $null
    if ($session) {
        try {
            $created = Invoke-RestMethod "$base/api/posts" -Method Post -Body $body -ContentType "application/json" `
                -WebSession $session -TimeoutSec 30
            $postId = $created.post.id
            $saved = $created.post.body_html

            if ($saved -match "script|onerror|alert") {
                Write-Host "  [ FAIL ]      저장된 본문에 위험한 내용이 남았다: $saved" -ForegroundColor Red
                $script:failed++
            } elseif ($saved -notmatch "<b>") {
                Write-Host "  [ FAIL ]      정상 서식(<b>)까지 사라졌다: $saved" -ForegroundColor Red
                $script:failed++
            } else {
                Write-Host "  [  OK  ] 200  글 등록 + 본문 정제 ($saved)" -ForegroundColor Green
            }
        } catch {
            Write-Host "  [ FAIL ]      관리자 글 등록 실패: $($_.Exception.Message)" -ForegroundColor Red
            $script:failed++
        }
    }

    # 4) 목록 조회에도 위험한 내용이 없어야 한다
    try {
        $listed = (Invoke-RestMethod "$base/api/posts?category=notice" -TimeoutSec 30).posts
        $bad = $listed | Where-Object { $_.body_html -match "script|onerror|alert" }
        if ($bad) {
            Write-Host "  [ FAIL ]      목록 조회에 위험한 본문이 섞였다" -ForegroundColor Red
            $script:failed++
        } else {
            Write-Host "  [  OK  ] 200  목록 조회 정제 확인 ($($listed.Count)건)" -ForegroundColor Green
        }
    } catch {
        Write-Host "  [ FAIL ]      글 목록 조회 실패" -ForegroundColor Red
        $script:failed++
    }

    # 5) 뒷정리 — 테스트로 만든 글은 지운다
    if ($postId -and $session) {
        try {
            Invoke-RestMethod "$base/api/posts/$postId" -Method Delete -WebSession $session -TimeoutSec 30 | Out-Null
            Write-Host "  [  OK  ] 200  글 삭제 (뒷정리)" -ForegroundColor Green
        } catch {
            Write-Host "  [ FAIL ]      글 삭제 실패" -ForegroundColor Red
            $script:failed++
        }
    }
}
finally {
    Write-Host ""
    Write-Host "[4/4] 서버 종료"
    Stop-Server
}

Write-Host ""
Write-Host "============================================================"
if ($failed -eq 0) {
    Write-Host "  스모크 테스트 통과." -ForegroundColor Green
    exit 0
}
Write-Host "  실패 $failed 건." -ForegroundColor Red
exit 1
