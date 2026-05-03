---
name: urimal-for-socialworker
version: "2.0.0"
description: 사회복지사가 직접 쓴 계획서·주간업무보고서 등 문서를 한덕연 선생님의 우리말 36개 항목 + AI 티 탐지 두 레이어로 정밀 분석하여 자연스럽고 바른 문체로 윤문하는 6인 파이프라인. 내용은 한 글자도 건드리지 않고 문체·호응·표현만 재작성하며, 최종 결과물에 변경 이유 표를 함께 제공한다. 트리거 — "윤문해줘", "문서 다듬어줘", "이 보고서 다듬어줘", "계획서 윤문", "우리말 오류 잡아줘", "사회복지 문서 교정". 후속 작업 — "특정 항목만 다시", "이 문단만", "2차 윤문" 도 모두 이 스킬.
---

# urimal-for-socialworker — 사회복지 문서 윤문 오케스트레이터

사회복지사가 직접 쓴 문서를 **우리말 36항목 탐지 → AI 티 탐지 → 통합 윤문 → 검증**의 6인 파이프라인으로 정밀 교정한다.

**실행 모드:** 하이브리드 — 주 흐름은 파이프라인(순차), 검증 단계만 팀(병렬 리뷰).

## Phase 0: 컨텍스트 확인

**실행 모드:** 단일 (오케스트레이터)

작업 시작 시 가장 먼저 다음 한 줄을 사용자에게 출력한 뒤 실행 모드를 판정한다.

```
urimal-for-socialworker v2.0.0 — model: {sonnet|opus} / voice profile {미주입|주입(<author-context.yaml 경로>)} / run_id: {YYYY-MM-DD-NNN}
```

- 버전(`v2.0.0`)은 SKILL.md frontmatter `version` 필드를 그대로 노출. 사용자가 어떤 버전이 동작 중인지 첫 응답에서 즉시 확인할 수 있게 한다.
- voice profile 상태는 Phase 0 단계 4(아래)의 탐색 결과를 그대로 표시.
- 후속 단계는 같은 응답 안에서 이어서 진행.

이후 컨텍스트 판정:

1. **작업 디렉토리(cwd) 정책**: 산출물은 항상 cwd 기준 `_workspace/{run_id}/`에 누적된다. 스킬이 어디에 설치돼 있든(글로벌 `~/skills/humanize-korean/` 또는 프로젝트 `skills/humanize-korean/`) 윤문 결과는 사용자가 명령을 실행한 디렉토리에 떨어진다. cwd의 `_workspace/` 존재 여부 확인.
2. 분기:
   - `_workspace/` 없음 또는 사용자가 새 입력 제공 → **새 실행**. `run_id`를 `YYYY-MM-DD-NNN` 형식으로 생성.
   - 사용자가 "특정 카테고리만 다시" / "2차 윤문" / "윤문 강도 조정" / "이 문단만" → **부분 재실행**. 기존 `run_id`의 해당 에이전트만 재호출.
   - 사용자가 "웹 서비스로 만들어줘" / "API 배포" → **웹 확장 모드**. Phase 5로 직행.
3. 분류 체계 상태 확인: `references/ai-tell-taxonomy.md` 로드 검증(스킬 디렉토리 기준 상대 경로).
4. **author-context.yaml 탐색 (v1.2~)**: 작가 voice profile 명시 주입 여부 판정.
   - 탐색 우선순위: `<cwd>/_workspace/{run_id}/author-context.yaml` → `<cwd>/author-context.yaml`
   - 발견 시: schema 검증(`references/author-context-schema.md` 기준). 검증 실패 항목(무력화 불가 disable, multiplier 캡 초과, 자유 텍스트 advisory, prompt injection escape character 등)은 **파일 전체를 거부**하고 사용자에게 명시적 에러 반환(silent fallback 금지).
   - 검증 통과 시: voice profile 활성화. 적용된 overrides·거부된 overrides·trigger된 키워드를 `_workspace/{run_id}/voice_profile_log.json`에 telemetry로 기록(§6 회귀 게이트 measurable 입력).
   - 미발견 시: voice profile 미주입 모드(v1.1과 동일 동작)
   - **자동 로드 금지**: 프로젝트 SKILL.md 등 다른 파일을 자동 파싱해 voice profile을 만들지 않는다(prompt injection 진입점)

## Phase 1: 입력 수신 및 정규화

**실행 모드:** 단일 (오케스트레이터)

1. 입력 텍스트를 `_workspace/{run_id}/01_input.txt`에 저장.
2. 장르 힌트를 사용자에게 확인하거나 첫 300자 분석으로 추정 (칼럼·리포트·블로그·공적 연설).
3. 옵션 기본값: `min_severity: S2`, `include_document_level: true`.

## Phase 2-A: 사회복지 특화 오류 탐지 [신규]

**실행 모드:** 서브 에이전트 (단일 호출)

`sw-pattern-detector` 에이전트를 `Agent` 도구로 호출.

입력:
```
run_id: {run_id}
input_path: _workspace/{run_id}/01_input.txt
taxonomy_path: resources/references/sw-tell-taxonomy.md
urimal_source_path: resources/references/urimal-source.md
playbook_path: resources/references/sw-rewriting-playbook.md
```

출력: `_workspace/{run_id}/02a_sw_detection.json` 생성.

## Phase 2-B: AI 티 탐지

**실행 모드:** 서브 에이전트 (단일 호출)

`ai-tell-detector` 에이전트를 `Agent` 도구로 호출 (`model: "sonnet"` (정밀 모드 시 `"opus"`)).

입력:
```
run_id: {run_id}
input_path: _workspace/{run_id}/01_input.txt
taxonomy_path: resources/references/ai-tell-taxonomy.md
genre_hint: {계획서|보고서|안내문|공적|null}
options: { min_severity: S2, include_document_level: true }
```

출력: `_workspace/{run_id}/02b_ai_detection.json` 생성.

## Phase 2-C: Finding 합산

**실행 모드:** 단일 (오케스트레이터)

`02a_sw_detection.json` + `02b_ai_detection.json`의 finding을 심각도 순으로 병합하여
`_workspace/{run_id}/02_combined_detection.json`을 생성한다.

**게이트**: `total_findings == 0` 이면 "오류 패턴이 거의 없습니다. 윤문 불필요" 메시지로 종료.

## Phase 3: 윤문

**실행 모드:** 서브 에이전트 (단일 호출, 최대 3회 루프)

`korean-style-rewriter` 에이전트를 `Agent` 도구로 호출 (`model: "sonnet"` (정밀 모드 시 `"opus"`)).

입력:
```
run_id: {run_id}
input_path: _workspace/{run_id}/01_input.txt
detection_path: _workspace/{run_id}/02_combined_detection.json
playbook_path: resources/references/rewriting-playbook.md
sw_playbook_path: resources/references/sw-rewriting-playbook.md
```

출력: `_workspace/{run_id}/03_rewrite.md` + `03_rewrite_diff.json`.

**게이트**: `over_polish_warning: true` 이면 즉시 Phase 4로 (감사관이 롤백 판정).

## Phase 4: 병렬 검증 (에이전트 팀)

**실행 모드:** 에이전트 팀 (2인 병렬)

`TeamCreate`로 `humanize-review-team` 구성:
- 멤버: `content-fidelity-auditor`, `naturalness-reviewer`
- `TaskCreate`로 각자 독립 평가 할당 (의존성 없음).

두 에이전트 모두 `_workspace/{run_id}/01_input.txt` + `03_rewrite.md` + `03_rewrite_diff.json`을 읽고:
- **fidelity-auditor**: `04_fidelity_audit.json` 생성 — 의미 동등성 판정. **author_context 주입**(do_not_extra 키워드를 절대 보존 대상에 추가).
- **naturalness-reviewer**: `05_naturalness_review.json` 생성 — 잔존·과윤문 판정. **author_context 미주입**(분리 검증층 보존, taxonomy 권한 위계 §5).

완료 후 `TeamDelete`로 팀 정리.

### v1.2 — voice profile이 활성된 경우의 잔존 처리

`naturalness-reviewer`는 voice profile을 모르므로 무력화된 패턴이 잔존 finding으로 다시 잡힐 수 있다. 오케스트레이터가 다음 규칙으로 종합 판정 시 처리:

- 무력화된 패턴 ID(`pattern_overrides`에 `disable` 또는 `relax` 등재)에 해당하는 잔존 → `accepted_by_voice_profile` 플래그, 등급 계산에서 제외
- 무력화 불가 패턴(A-8, C-5, D-1~D-6) 잔존 → 정상 잔존으로 처리, `pattern_overrides` 등재 여부와 무관하게 2차 윤문 트리거
- 이 분리로 voice profile 사용자가 같은 패턴으로 무한 재윤문되지 않으면서, 결정적 AI 시그니처는 항상 잡히는 상태를 유지

### Phase 4 종합 판정 (오케스트레이터)

| fidelity | naturalness | 종합 | 후속 |
|----------|-------------|------|------|
| full_pass | accept / accept_with_note | **최종 승인** | Phase 6 |
| full_pass | rewrite_round_2 | **2차 윤문** | Phase 3 재호출 (target finding만) |
| full_pass | rollback_and_rewrite | **롤백 후 재윤문** | 윤문가에 edit 롤백 지시 |
| conditional_pass | - | **롤백 지시된 edit만 재시도** | Phase 3 재호출 (특정 edit만) |
| fail | - | **전면 재작업** | Phase 3 전면 재호출 |

2차/3차 윤문 진입 시 `_workspace/{run_id}/03_rewrite_v2.md`·`v3.md`로 버전 분리.

**최대 루프 3회.** 3회 후에도 미해결이면 `hold_and_report`로 사람 개입 요청.

## Phase 5: 웹 확장 (옵션)

**실행 모드:** 서브 에이전트 (요청 시만)

사용자가 "웹 서비스로 만들어줘" / "API 배포" 요청 시 `humanize-web-architect`를 호출 (`model: "sonnet"` (정밀 모드 시 `"opus"`)).

산출물: `_workspace/web/01_architecture.md`·`02_api_spec.md`·`03_ux_flow.md`.

실제 코드 구현은 이 아키텍트의 설계 승인 후 별도 프런트엔드 엔지니어(필요 시 신규 에이전트)를 통해 진행.

## Phase 6: 최종 출력

**실행 모드:** 단일 (오케스트레이터)

1. 최종 윤문본을 `_workspace/{run_id}/final.md`로 복사.
2. 요약 리포트 `_workspace/{run_id}/summary.md` 생성 (아래 형식 준수):

```markdown
## 윤문 요약

**원문 변경률**: X%  |  **품질 등급**: A/B/C/D

### 변경 내역

| # | 원문 | 수정문 | 탐지 근거 | 우리말 항목 |
|---|---|---|---|---|
| 1 | (원문 span) | (수정문) | (패턴명) | (우리말 항목번호) |

### 특이사항
(롤백·재윤문 이력, 미해결 항목 등)
```

3. 사용자에게:
   - 윤문본 본문 (마크다운 블록)
   - summary.md 내용 전체
   - "2차 윤문을 원하시면 말씀해주세요" 안내 (등급 B 이하일 때)

## Phase 7: 피드백 수집 (진화 루프)

결과 전달 후 사용자에게:
> "윤문 결과에서 개선할 부분이 있나요? 예) '이 카테고리가 과하게 고쳐졌다', '이 표현은 그대로 두는 게 낫다', '리듬이 부자연스럽다'"

피드백 유형별:
- 개별 edit 이의: 해당 edit 롤백 후 재윤문.
- 카테고리 전역 이의: 해당 카테고리 finding 재감사, 필요 시 taxonomy 항목의 심각도 조정 요청을 분류학자에게.
- 장르 추정 오류: genre_hint 수정 후 Phase 2부터 재실행.
- 새 패턴 제보: 분류학자에 "taxonomy 확장 후보" 에스컬레이션.

## 데이터 흐름 요약

```
01_input.txt
    ↓ [sw-pattern-detector]      → 02a_sw_detection.json
    ↓ [ai-tell-detector]         → 02b_ai_detection.json
    ↓ [finding 합산]             → 02_combined_detection.json
    ↓ [korean-style-rewriter]
03_rewrite.md + 03_rewrite_diff.json
    ↓ [병렬 팀]
    ├→ [content-fidelity-auditor] → 04_fidelity_audit.json
    └→ [naturalness-reviewer]      → 05_naturalness_review.json
    ↓ [오케스트레이터 종합]
    ├→ (재작업) Phase 3으로 복귀
    └→ (승인) final.md + summary.md (변경 이유 표 포함)
```

## 에이전트 호출 규칙

**모든 Agent 호출은 모델을 명시한다.**
- **기본값: `model: "sonnet"`** (`claude-sonnet-4-6`) — 6에이전트 파이프라인 비용 효율
- **정밀 모드: `model: "opus"`** (`claude-opus-4-7`) — 사용자가 "정밀 모드", "opus", "최고 품질" 등을 요청하거나, 중요 보고서·외부 제출 문서일 때
- 파일 기반 데이터 전달, cwd 기준 `_workspace/{run_id}/` 하위에 번호 접두사 파일 저장.

**에이전트 정의 위치:** Claude Code가 다음 우선순위로 자동 탐색한다.
1. `<cwd>/resources/agents/` (프로젝트 로컬 — 작업 디렉토리에 정의가 있을 때 우선)
2. `~/resources/agents/` (글로벌 — 사용자 홈)

필요한 7개 에이전트: `sw-pattern-detector`(신규), `korean-ai-tell-taxonomist`, `ai-tell-detector`, `korean-style-rewriter`, `content-fidelity-auditor`, `naturalness-reviewer`, `humanize-web-architect`.

**타입:** 모두 `general-purpose`로 스폰 후 정의 파일을 Agent 프롬프트에 포함 (또는 이미 정의된 agent 타입으로 호출).

## 테스트 시나리오

### 정상 흐름
- **입력:** ChatGPT가 생성한 AI 칼럼 초안 (2000자).
  - 번역투 빈번 ("~를 통해" 6회, "~에 대해" 4회)
  - 관용구 ("결론적으로", "시사하는 바가 크다")
  - 기계적 "첫째·둘째·셋째"
  - 이모지 몇 개
- **기대 출력:**
  - 02_detection.json: 30~50 finding, score ≥ 60
  - 03_rewrite.md: 변경률 15~25%
  - 04_fidelity_audit: full_pass
  - 05_naturalness_review: accept, score < 20, 등급 A/B
  - 최종 윤문본 + 요약

### 에러 흐름 1 — 과윤문
- 1차 윤문에서 변경률 40% → 감사관 flag
- 리뷰어가 장르 이탈·문학화 감지 → `rollback_and_rewrite`
- 2차 윤문에서 변경률 22%, 안정화

### 에러 흐름 2 — S1 잔존
- 1차 윤문 후 S1 2건 잔존 (D-1 "결론적으로" 미제거)
- 리뷰어 `rewrite_round_2` 판정
- 2차 윤문에서 해당 finding만 재처리, 잔존 0

### 엣지 케이스 — 이미 사람이 쓴 글
- detected_count == 0 또는 score < 10
- Phase 2 게이트에서 "윤문 불필요" 메시지로 종료

## 주의 사항

- **의미 불변이 최상위 불문율.** 모든 에이전트가 이를 위반 감지 즉시 롤백.
- **수치·고유명사·직접 인용은 탐지/윤문 대상 아님.** Do-NOT list 엄수.
- **장르 이탈 금지.** 에세이를 문학으로, 리포트를 블로그로 옮기지 않는다.
- **이모지·불릿·헤딩 제거는 장르 규칙 따름.** SNS·제품 카피는 유지 가능.
- **변경률 30% 초과 → 경고, 50% 초과 → 강제 중단.**

## 참고 자료

**[신규 — 사회복지 특화]**
- 사회복지 패턴 분류: `resources/references/sw-tell-taxonomy.md` (12개 카테고리, 우리말 36항목 기반)
- 사회복지 윤문 처방: `resources/references/sw-rewriting-playbook.md`
- 우리말 원천 자료: `resources/references/urimal-source.md` (한덕연 선생님 원문)

**[기존 — AI 티 탐지]**
- AI 티 분류 체계: `resources/references/ai-tell-taxonomy.md`
- 일반 윤문 처방: `resources/references/rewriting-playbook.md`
- Pattern candidates 풀: `resources/references/pattern-candidates.md`
- 승격 검증 체크리스트: `resources/references/promotion-checklist.md`
