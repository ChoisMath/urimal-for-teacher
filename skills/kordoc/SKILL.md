---
name: kordoc
description: HWP, HWPX, PDF, XLSX, DOCX 공문서 포맷을 Markdown으로 파싱하고 양식을 채우는 스킬
---

# kordoc 문서 파싱 스킬

## 개요
이 스킬은 한국 공공기관 및 업무 환경에서 주로 사용되는 HWP 5.x, HWPX 문서를 비롯해 PDF, XLSX, DOCX 파일을 Markdown 형식으로 변환해 줍니다. 
또한 문서 양식의 빈칸을 자동으로 채워넣는 기능(Form Filler)을 제공하여 서식을 100% 보존한 채로 새로운 문서를 생성할 수 있습니다.

## 핵심 기능 및 에이전트 사용법

kordoc은 Node.js 기반 CLI 도구로 동작하며, 에이전트는 `run_command` 도구를 사용해 터미널에서 직접 파서를 실행해야 합니다.

### 1. 일반 문서 파싱 (Markdown 변환)
어떤 포맷이든 지정된 파일을 마크다운 형식으로 읽어옵니다.
```powershell
# 스킬 디렉토리 내부에서 실행하거나 절대경로 사용
node d:\app\urimal\.agents\skills\kordoc\scripts\kordoc\dist\cli.js <입력파일_절대경로> -o <출력파일_절대경로.md>
```
*Tip: 출력 파일 경로 없이 실행하면 stdout으로 마크다운 결과가 바로 출력됩니다.*

### 2. 양식 채우기 (Form Filler)
공문서 양식(HWPX 등)에 특정 값을 채워넣고 새로운 파일로 저장합니다.
```powershell
node d:\app\urimal\.agents\skills\kordoc\scripts\kordoc\dist\cli.js fill <원본양식_절대경로.hwpx> <출력_절대경로.hwpx> --data "{\"이름\":\"홍길동\", \"날짜\":\"2026-04-26\"}"
```

### 3. 신구조문 대비표 (문서 비교)
두 개의 HWP/HWPX 문서의 변경 사항을 파악합니다.
```powershell
node d:\app\urimal\.agents\skills\kordoc\scripts\kordoc\dist\cli.js diff <구버전.hwpx> <신버전.hwpx>
```

## 에이전트 주의사항 (Agent Guidelines)
1. **절대경로 사용 권장**: `kordoc` CLI를 사용할 때는 파일 입출력 경로를 절대 경로로 지정하는 것이 가장 안전합니다.
2. **의존성 상태**: 이 스킬을 실행하기 위해서는 `d:\app\urimal\.agents\skills\kordoc` 경로 내에 `node_modules`가 설치되어 있고 `dist/cli.js`가 빌드되어 있어야 합니다. (최초 설치 시 이미 수행됨)
3. HWP 문서 중 "배포용 문서"의 경우에도 Windows 환경이라면 COM 객체 폴백(Fallback)을 통해 자동으로 텍스트가 추출됩니다.
