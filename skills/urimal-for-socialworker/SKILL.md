---
name: urimal-for-socialworker
description: 사회복지사가 쓴 계획서·주간업무보고서 등 문서를 한덕연 선생님의 우리말 36항목 기준으로 윤문해주는 에이전트 파이프라인 스킬. 트리거 — "이 문서 윤문해줘", "계획서 다듬어줘", "보고서 우리말 교정", "사회복지 문서 윤문", "우리말 답게 고쳐줘".
---
# urimal-for-socialworker — 사회복지 문서 전문 윤문 하네스

## 프로젝트 개요

사회복지사가 직접 작성한 한글 문서를 **한덕연 선생님의 우리말 36개 항목** + **AI 티 탐지** 두 레이어로 정밀 분석하여 자연스럽고 바른 문체로 다듬는 6인 파이프라인 하네스.

- 호응 오류, 논리 오류, `관계하다`·`고민하다`·`해 주다` 오남용, 사업화 문체, 수동태 남발 등 사회복지 문서에 자주 나타나는 36가지 패턴을 탐지·교정한다.
- **내용은 한 글자도 건드리지 않고** 문체·표현·호응만 재작성한다.
- 최종 결과물에 **무엇을 왜 바꿨는지** 변경 이유 표를 함께 제공하여 교육 효과를 높인다.

## 철칙

1. **의미 불변 (Fidelity First)** — 사실·주장·수치·날짜·고유명사·인용은 100% 원문 보존.
2. **근거 기반 (Span-Grounded)** — 모든 변경은 탐지 finding에 연결. 탐지 없는 구간은 건드리지 않음.
3. **장르 유지 (Tone Match)** — 계획서를 에세이로, 보고서를 칼럼으로 옮기지 않음.
4. **과윤문 금지 (No Over-Polish)** — 변경률 30% 초과 시 경고, 50% 초과 시 강제 중단.
5. **교육 목적 유지** — summary.md에 우리말 항목 번호와 변경 이유를 반드시 포함.

## 디렉토리 구조

```
im-not-ai-for-socialworker/
├── SKILL.md                              # 본 파일 — 진입점
├── resources/
│   ├── agents/
│   │   ├── sw-pattern-detector.md        # [신규] 우리말 36항목 탐지기
│   │   ├── ai-tell-detector.md           # AI 티 탐지기
│   │   ├── korean-style-rewriter.md      # 윤문가 (사회복지 확장)
│   │   ├── content-fidelity-auditor.md   # 의미 감사관
│   │   ├── naturalness-reviewer.md       # 자연스러움 리뷰어
│   │   ├── korean-ai-tell-taxonomist.md  # 분류 체계 관리자
│   │   └── humanize-web-architect.md     # (확장용)
│   └── references/
│       ├── sw-tell-taxonomy.md           # [신규] 사회복지 패턴 분류 SSOT
│       ├── sw-rewriting-playbook.md      # [신규] 사회복지 윤문 처방
│       ├── urimal-source.md              # [신규] 우리말 36항목 원천 자료
│       ├── ai-tell-taxonomy.md           # AI 티 패턴 분류 SSOT
│       ├── rewriting-playbook.md         # 일반 윤문 처방
│       └── (기타 레퍼런스)
├── skills/humanize-korean/
│   └── orchestrator.md                   # 오케스트레이터 (파이프라인 재설계)
└── _workspace/                           # 런타임 산출물 (run_id별)
    └── {YYYY-MM-DD-NNN}/
        ├── 01_input.txt
        ├── 02_sw_detection.json          # 우리말 탐지 결과
        ├── 02_ai_detection.json          # AI 티 탐지 결과
        ├── 03_rewrite.md
        ├── 03_rewrite_diff.json
        ├── 04_fidelity_audit.json
        ├── 05_naturalness_review.json
        ├── final.md                      # 최종 윤문 결과
        └── summary.md                    # 변경 이유 설명 표
```

## 파이프라인

```
입력 (사회복지사가 쓴 초안)
    ↓
[sw-pattern-detector]       — 우리말 36항목 기반 사회복지 특화 오류 탐지
    ↓
[ai-tell-detector]          — 딱딱한 문어체·번역투 탐지
    ↓
[두 finding 목록 합산]
    ↓
[korean-style-rewriter]     — 통합 finding 기반 수술적 윤문
    ↓
[병렬 팀]
    ├─ [content-fidelity-auditor]   — 의미 동등성 감사 (13항)
    └─ [naturalness-reviewer]       — 잔존·과윤문 판정
    ↓
[오케스트레이터 종합 판정]
    ├─ accept → final.md + summary.md
    ├─ rewrite_round_2 → 윤문가 재호출 (최대 3회)
    ├─ rollback_and_rewrite → 문제 edit 롤백
    └─ hold_and_report → 사람 검토 권고
```

## 6+1인 팀

1. **sw-pattern-detector** — [신규] 우리말 36항목 탐지기. 사회복지 문서 특화 오류를 span 단위 JSON으로 출력.
2. **ai-tell-detector** — AI 티 탐지기. 40+ 패턴을 span 단위 JSON으로 출력.
3. **korean-style-rewriter** — 윤문가. 두 탐지기의 합산 finding 기반 수술적 재작성. 변경률 모니터링.
4. **content-fidelity-auditor** — 내용 감사관. 13항 체크리스트로 의미 훼손 탐지 → 롤백 지시.
5. **naturalness-reviewer** — 자연스러움 리뷰어. 탐지기 재실행으로 잔존·과윤문 계측. 품질 등급 판정.
6. **korean-ai-tell-taxonomist** — 분류 체계 SSOT 관리. 미분류 패턴 승격.
7. **humanize-web-architect** (확장용) — 웹 서비스 요청 시 아키텍처 설계.

## 심각도 기준

- **S1 결정적**: 한 번만 나와도 오류라고 확신. 무조건 수정.
- **S2 강함**: 1~2회 허용, 3회+ 반복 시 수정.
- **S3 약함**: 다른 패턴과 중첩될 때만 수정.

## 품질 등급

- **A**: S1 0건, S2 2건 이하, score 개선 70%+
- **B**: S1 0건, S2 4건 이하, score 개선 50%+
- **C**: S1 1~2건 또는 과윤문 시그널 2개 — 2차 윤문
- **D**: S1 3건 이상 또는 심각한 과윤문 — 사람 검토

## 결과물 형식

### final.md
윤문된 최종 텍스트. 원문과 동일한 구조·형식 유지.

### summary.md
```markdown
## 윤문 요약

**원문 변경률**: X%  |  **품질 등급**: A/B/C/D

### 변경 내역

| # | 원문 | 수정문 | 탐지 근거 | 우리말 항목 |
|---|---|---|---|---|
| 1 | 고민하다가 결정했습니다 | 숙고한 끝에 결정했습니다 | `고민하다` 오남용 | 5항 |
| 2 | 참여해 주셨습니다 | 참여하셨습니다 | `해 주다` 과잉 | 7항 |
| 3 | 관계하며 지냈습니다 | 어울려 지냈습니다 | `관계하다` 오남용 | 6항 |

### 특이사항
(롤백, 재윤문 이력 등)
```

## 사용 방법

1. 새 세션에서 스킬 트리거:
   ```
   이 문서 윤문해줘:
   ```
   (사회복지사가 작성한 계획서·보고서 텍스트 첨부)

2. 오케스트레이터가 run_id 생성하고 파이프라인 실행.
3. 결과 `final.md` + `summary.md` 반환.

### 슬래시 커맨드

- `/윤문 [텍스트 또는 파일 경로]` — 윤문 실행
- `/윤문-redo [지시사항]` — 직전 결과를 사용자 지시에 따라 재처리

### 모델 정책

- **기본값**: `claude-sonnet-4-6` (6에이전트 파이프라인 비용 효율)
- **정밀 모드**: `claude-opus-4-7` — 외부 제출 보고서·중요 문서. 트리거: "정밀 모드", "opus로", "최고 품질로 윤문"

### HWP·HWPX 입력

본 리포의 `kordoc` 스킬이 HWP·HWPX·PDF·XLSX·DOCX를 마크다운으로 변환한다. 사회복지 현장에서 HWP가 표준이므로 같이 설치하길 권장.

## 주요 금기

- 수치·단위·날짜 변경 금지.
- 고유명사·기관명·사업명 변경 금지.
- 큰따옴표 인용문 내부 변경 금지.
- 법률 조문·학술 개념어 임의 치환 금지.
- 새로운 주장·사실·예시 추가 금지.
- 원문에 있던 정보 누락 금지.

## 참고

- 사회복지 패턴 분류: `resources/references/sw-tell-taxonomy.md`
- 사회복지 윤문 처방: `resources/references/sw-rewriting-playbook.md`
- 우리말 원천 자료: `resources/references/urimal-source.md`
- AI 티 패턴 분류: `resources/references/ai-tell-taxonomy.md`
- 일반 윤문 처방: `resources/references/rewriting-playbook.md`
