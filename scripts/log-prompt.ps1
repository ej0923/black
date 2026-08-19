# UserPromptSubmit 훅. 사용자 프롬프트를 PROMPT_LOG.txt 에 덧붙인다.
#
# 훅 입력(JSON)은 stdin 으로 들어온다: { "prompt": "...", "session_id": "...", ... }
# 어떤 경우에도 프롬프트를 막지 않는다 — 실패해도 조용히 exit 0.

$ErrorActionPreference = 'Stop'

try {
    # stdin 을 UTF-8 로 명시해서 읽는다. [Console]::In 은 콘솔 코드페이지를
    # 따라가서 한글 프롬프트가 깨진다.
    $reader = New-Object System.IO.StreamReader(
        [Console]::OpenStandardInput(), (New-Object System.Text.UTF8Encoding($false)))
    $raw = $reader.ReadToEnd()
    if ([string]::IsNullOrWhiteSpace($raw)) { exit 0 }

    $prompt = ($raw | ConvertFrom-Json).prompt
    if ([string]::IsNullOrWhiteSpace($prompt)) { exit 0 }

    $log = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\PROMPT_LOG.txt'))
    $stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'

    $block = "`r`n--- $stamp ---------------------------------------------`r`n" +
             "[PROMPT]`r`n$prompt`r`n"

    # BOM 없는 UTF-8 로 append. PS 5.1 의 Add-Content -Encoding utf8 은
    # 인코딩이 상황에 따라 달라져서 .NET 을 직접 쓴다.
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::AppendAllText($log, $block, $utf8)
}
catch {
    # 로깅 실패가 대화를 방해해서는 안 된다.
}

exit 0
