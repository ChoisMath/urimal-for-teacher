# urimal-for-socialworker

사회복지사가 직접 쓴 **계획서·주간업무보고서·사업보고서**를 한덕연 선생님의 **우리말 36항목** + 사회복지 14개 카테고리 + AI 티 기준으로 자연스럽고 바른 우리말로 윤문해 주는 [Claude Code](https://claude.com/claude-code) 스킬입니다.

> 내용은 **한 글자도 건드리지 않고**, 문체·호응·표현만 다듬습니다. 최종 결과물에 **무엇을 왜 바꿨는지** 변경 이유 표를 함께 제공해 글쓰기 공부에 도움이 되도록 만들었습니다.

> **v2.1 (2026-05-10)** — Fast Path 도입. 5,000자 보고서 윤문이 25분에서 **2~3분**으로 단축. upstream `epoko77-ai/im-not-ai v1.5~v2.0` monolith 아키텍처를 사회복지 도메인으로 가져왔습니다. [v2.1 변경 내역](#v21--fast-path--분류-체계-동기화--정량-점수-레이어-2026-05-10)

---

## 왜 사회복지사를 위한 스킬인가

사회복지사가 작성하는 문서에는 현장 특유의 반복 패턴이 있습니다.

- **호응 오류** — "다양한 방법으로 일주일간 생활복지운동을 시작합니다." → '일주일간'이라는 부사와 '시작하다'가 호응하지 않습니다.
- **`고민하다`·`생각하다`·`이야기 나누다` 오남용** — 너무 자주, 너무 막연하게 쓰입니다.
- **`관계하다` 오남용** — "주민들과 관계하며 지냅니다" 같은 표현은 일본어 投書체 흔적입니다.
- **`해 주다` 과잉** — "참여해 주셨습니다" → "참여하셨습니다".
- **사업화 문체·수동태 남발·논리 비약** — 정책 보고서 특유의 딱딱함.

이 36개 패턴은 한덕연 선생님이 **사회복지 현장 문서를 수십 년 검토하며 정리하신 자료**(`docs/urimal_cleaned.md` / `urimal-source.md`)에서 가져왔습니다.

---

## 어떻게 동작하나

v2.1부터 **두 가지 경로**가 있습니다.

### Fast 모드 (디폴트, 2~3분)

```
입력 (사회복지사가 쓴 초안)
    ↓
[urimal-monolith — 단일 호출]
    ├ 메모리 안에서: 사회복지 14개 카테고리 + 한덕연 36항목 + AI 티 핵심 일괄 탐지
    ├ 메모리 안에서: 윤문 + 자체검증 7항
    └ Write final.md (URIMAL-SUMMARY 메타 블록 포함)
```

도구 호출 3회 캡. 5,000자 입력 wall-clock 2~3분, 모델 호출 비용 1/6 수준.

### Strict 모드 (자동 승급 또는 `--strict`)

```
입력 → [sw-pattern-detector] → [ai-tell-detector] → [korean-style-rewriter]
    → [병렬 팀: content-fidelity-auditor + naturalness-reviewer]
    → [오케스트레이터 종합 판정 → 최대 3회 재윤문]
    → final.md + summary.md
```

자동 승급 조건: 입력 8,000자+, 부분 재실행("이 문단만 다시"·"카테고리만 다시"), Fast 모드에서 SW-14(차별·시혜 표현) 잔존 시.

---

## 5분 따라하기

### 0. 사전 준비

[Claude Code](https://claude.com/claude-code) 설치 (Mac · Windows · Linux 모두 지원).

```bash
claude --version
```

> Claude Code는 터미널에서 Claude(Anthropic)와 대화하며 파일을 같이 편집하는 CLI입니다. 이 스킬은 Claude Code에서만 작동합니다 (웹 Claude.ai나 ChatGPT에서는 안 됩니다).

### 1. 리포 받기

```bash
git clone https://github.com/dreamworker0/urimal-for-socialworker.git
cd urimal-for-socialworker
```

### 2. 설치

**macOS / Linux**
```bash
bash scripts/install.sh
```

**Windows (PowerShell)**
```powershell
.\scripts\install.ps1
```

설치 스크립트가 하는 일:
- `~/.claude/skills/urimal-for-socialworker/`에 메인 스킬 복사
- `~/.claude/skills/kordoc/`에 HWP·HWPX 파싱 스킬 복사
- `~/.claude/commands/`에 슬래시 커맨드(`/윤문`, `/윤문-redo`) 복사
- kordoc의 `npm install` 자동 수행

> **프로젝트별 설치**를 원하면 `--target ./your-project`로 지정. (자세한 옵션은 `scripts/install.sh --help`)

### 3. Claude Code 실행

```bash
claude
```

### 4. 윤문 요청

세 가지 방식 모두 지원합니다.

**방법 A — 자연어 (가장 쉬움)**

```
이 계획서 윤문해줘:

[계획서 본문 또는 파일 경로 붙여넣기]
```

자동 발동 표현:
- "이 보고서 다듬어줘"
- "계획서 윤문해줘"
- "사회복지 문서 교정"
- "우리말 답게 고쳐줘"
- "주간업무보고서 윤문"

**방법 B — 슬래시 커맨드**

```
/윤문 docs/2026_상반기_사업계획서.hwpx
```

옵션을 자연어로 추가 가능: `장르: 계획서`, `강도: 보수적`, `정밀 모드`. 결과가 마음에 안 들면:

```
/윤문-redo "이 문단만 다시 윤문해줘"
/윤문-redo "사업화 문체 좀 더 손봐줘"
```

**방법 C — Claude Code Plugin Marketplace**

본 리포는 `.claude-plugin/plugin.json` 매니페스트를 포함합니다. Marketplace 채널을 통해 설치 시:

```
/plugin install urimal-for-socialworker@dreamworker0
```

### 5. HWP·HWPX 입력

본 리포에는 [`kordoc`](skills/kordoc/) 스킬이 함께 들어 있어 다음 포맷을 마크다운으로 변환해 줍니다.

| 포맷 | 처리 방식 |
|------|----------|
| HWP 5.x | kordoc 파서 (Windows에서는 COM 폴백 자동) |
| HWPX | kordoc 파서 |
| PDF · DOCX · XLSX | kordoc 파서 |
| TXT · MD | Claude Code 직접 |

> Claude Code 자체는 HWP·HWPX를 못 읽기 때문에, 사회복지 현장에서는 kordoc이 **사실상 필수**입니다.

### 6. 결과 확인

`_workspace/{날짜-번호}/` 폴더에 누적됩니다.

| 파일 | 내용 |
|------|------|
| `01_input.txt` | 원문 그대로 |
| `02a_sw_detection.json` | 우리말 36항목 탐지 리포트 |
| `02b_ai_detection.json` | AI 티 탐지 리포트 |
| `03_rewrite.md` | 윤문본 |
| `04_fidelity_audit.json` | 내용 훼손 감사 결과 |
| `05_naturalness_review.json` | 자연도 재측정 결과 |
| `final.md` | 최종 윤문본 |
| `summary.md` | 변경 이유 표 (우리말 항목 번호 포함) |

`summary.md` 예시:

```markdown
## 윤문 요약

**원문 변경률**: 18%  |  **품질 등급**: A

### 변경 내역

| # | 원문 | 수정문 | 탐지 근거 | 우리말 항목 |
|---|------|--------|----------|------------|
| 1 | 고민하다가 결정했습니다 | 숙고한 끝에 결정했습니다 | `고민하다` 오남용 | 5항 |
| 2 | 참여해 주셨습니다 | 참여하셨습니다 | `해 주다` 과잉 | 7항 |
| 3 | 관계하며 지냈습니다 | 어울려 지냈습니다 | `관계하다` 오남용 | 6항 |
```

---

## 모델 정책

- **기본값**: `claude-sonnet-4-6` — 6에이전트 파이프라인을 한 번 돌릴 때 모델을 6~10번 호출합니다. Sonnet 4.6도 한국어 윤문 품질 충분.
- **정밀 모드**: `claude-opus-4-7` — 외부 제출 보고서·시군구 제출 사업계획서 등 중요 문서. 트리거: `/윤문 ... 정밀 모드` 또는 자연어로 "opus로", "최고 품질로".

---

## 4대 철칙

1. **의미 불변** — 사실·주장·수치·날짜·고유명사·인용은 100% 원문 보존.
2. **근거 기반** — 탐지된 span에만 수술적 수정. 탐지 없는 구간은 건드리지 않음.
3. **장르 유지** — 계획서를 에세이로, 보고서를 칼럼으로 옮기지 않음.
4. **과윤문 금지** — 변경률 30% 초과 시 경고, 50% 초과 시 강제 중단.

## 윤문 대상 제외 (Do-NOT List)

- 수치·단위·날짜
- 고유명사·기관명·사업명·인명
- 큰따옴표 내부 직접 인용
- 법률 조문·규정·고시
- 학술 개념어 (불가피한 경우)

---

## 디렉토리 구조

```
urimal-for-socialworker/
├── README.md                        # 본 파일
├── LICENSE                          # MIT
├── CONTRIBUTORS.md
├── .claude-plugin/
│   └── plugin.json                  # Claude Code Plugin 매니페스트
├── commands/
│   ├── 윤문.md                      # /윤문 슬래시 커맨드
│   └── 윤문-redo.md                 # /윤문-redo
├── scripts/
│   ├── install.sh                   # macOS / Linux 설치
│   └── install.ps1                  # Windows 설치
└── skills/
    ├── urimal-for-socialworker/     # 메인 윤문 스킬
    │   ├── SKILL.md
    │   ├── resources/
    │   │   ├── agents/              # urimal-monolith (fast) + 6+1인 (strict)
    │   │   └── references/          # quick-rules-sw·우리말 36항목·AI 티 v2.0·metrics.py 등
    │   └── scripts/
    │       ├── orchestrator.md      # fast/strict 분기
    │       └── prepare_monolith_input.py  # [v2.1] 정량 점수 사전 처리
    └── kordoc/                      # HWP·HWPX 파싱 스킬
        ├── SKILL.md
        └── scripts/kordoc/          # Node.js 파서 (npm install 필요)
```

---

## v2.1 — Fast Path + 분류 체계 동기화 + 정량 점수 레이어 (2026-05-10)

upstream `epoko77-ai/im-not-ai`의 v1.5 ~ v2.0 4단계 업그레이드를 사회복지 도메인으로 흡수했습니다.

### 🚀 Fast Path 도입 (가장 큰 변화)

5,000자 보고서 윤문이 **25분 → 2~3분** (86% 단축).

- **`urimal-monolith` 신규 에이전트** — 한 콜에서 SW 14개 카테고리 + 한덕연 36항목 + AI 티 핵심 일괄 처리
- **`quick-rules-sw.md` 슬림 룰북** — 본진(sw-tell-taxonomy 14개 + urimal-source 36항목 + ai-tell-taxonomy 40+) 중 S1·S2 핵심만 추려 한 줄 처방
- **도구 호출 3회 캡** — Read 입력 + Read 룰북 + Write final.md
- **자체검증 7항** — 의미 보존 / 변경률 / 장르 / register / S1 잔존 / **SW-14(차별·시혜) 잔존** / 인공 표현
- **`<!-- URIMAL-SUMMARY -->` 메타 블록** — final.md 본문 끝에 HTML 주석으로 메트릭·등급·우리말 항목 번호 통합. 마크다운 뷰어에 노출되지 않음

### 📚 분류 체계 v1.3.1 → v2.0 동기화

- **신규 9건**: C-11 연결어미 뒤 쉼표 [S1, KatFish 4.84배 분리도] · C-12 쉼표 포함률 · E-5 분절 평균 길이 · E-6 POS 다양성 · G-3 안전 균형 lexicon · A-16 영어 대명사 직역 [S1] · A-18 관계대명사절 좌향 수식 · A-19 이중 조사 결합 · E-7 청자 경어법 일관성
- **보강 5건**: D-1, F-4, A-15, A-7, E-2
- **한국 번역학계 8유형 흡수**: 이근희·김정우·김도훈·곽은주·김순영·박옥수·김혜영·이영옥
- **학술 인용** `references/scholarship.md` 동봉

### 📊 정량 점수 레이어 (v1.6 신규)

- **`metrics.py`** (404줄, 표준 라이브러리만) — 8지표 계산기 (konlpy/bareun 의존성 0)
- **`baseline.json`** — KatFish 3장르 baseline + LREAD 캘리브레이션
- **`prepare_monolith_input.py`** — monolith 호출 전 외부 사전 처리 (선택 사항)

### 🗑️ 폐기 (upstream v1.5 흡수)

다음 4개 파일 제거 — 사용자 사례 미확보 + 핫패스 비용 폭증 원인:
- `author-context-schema.md` (작가 voice profile)
- `pattern-candidates.md` (패턴 후보 풀)
- `promotion-checklist.md`
- `sample-collection.md`

### 📋 호환성

- 기존 `/윤문` `/윤문-redo` 슬래시 커맨드 그대로
- 기존 6+1인 파이프라인은 **strict 모드**로 보존 — `--strict` 또는 8,000자+/SW-14 잔존 시 자동 승급
- 사회복지 14개 카테고리(`sw-tell-taxonomy.md`)·한덕연 36항목 원천(`urimal-source.md`) 무수정

---

## v2.0.0 — 초기 릴리스 (2026-05-03)

[GitHub Release v2.0.0](https://github.com/dreamworker0/urimal-for-socialworker/releases/tag/v2.0.0) — 6+1인 에이전트 파이프라인 + kordoc HWP 파서 통합.

---

## 라이선스 & 출처

- **MIT 라이선스** — [`LICENSE`](LICENSE) 참조. 코드·스킬·에이전트 정의·분류 체계 문서 모두 적용.
- 본 프로젝트는 [epoko77-ai/im-not-ai](https://github.com/epoko77-ai/im-not-ai) (MIT)를 기반으로 **사회복지 도메인을 위해 확장**한 것입니다. 원본 라이선스 사본을 포함하며, 외부 contributor 명단도 [`CONTRIBUTORS.md`](CONTRIBUTORS.md)에 보존했습니다.
- HWP·HWPX 파서 [`kordoc`](https://github.com/chrisryugj/kordoc)은 chrisryugj님의 별도 프로젝트(MIT)이며, 본 리포에는 빌드 산출물(`dist/`)을 동봉했습니다.
- 한덕연 선생님의 우리말 36항목 자료는 본 프로젝트의 핵심 분류 체계를 구성합니다. 자료 활용에 대해 너른 양해를 베풀어 주신 데 감사드립니다.

본 도구는 "AI 탐지기 우회(Undetectable AI)"가 아니라 **사회복지 글쓰기 품질 개선·우리말 공부**를 목적으로 합니다.

---

## 기여

- 새로운 사회복지 글쓰기 패턴을 발견했다면 [`skills/urimal-for-socialworker/resources/references/sw-tell-taxonomy.md`](skills/urimal-for-socialworker/resources/references/sw-tell-taxonomy.md)에 후보 등재 후 PR.
- 일반 AI 티 패턴은 상위 프로젝트 [epoko77-ai/im-not-ai](https://github.com/epoko77-ai/im-not-ai)의 풀에 등재해도 좋습니다.
- 외부 회귀 케이스·슬래시 커맨드·Plugin 통합 등 모두 환영. 자세한 내용은 [`CONTRIBUTORS.md`](CONTRIBUTORS.md).

---

Built with [Claude Code](https://claude.com/claude-code).
