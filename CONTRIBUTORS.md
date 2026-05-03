# Contributors

`urimal-for-socialworker` 개발에 기여해 주신 분들을 기록합니다.

## Maintainer

- **[@dreamworker0](https://github.com/dreamworker0)** — 본 프로젝트(사회복지 도메인 확장) 창립 및 유지보수. 사회복지 특화 에이전트(`sw-pattern-detector`), 사회복지 분류 체계(`sw-tell-taxonomy.md`), 사회복지 윤문 처방(`sw-rewriting-playbook.md`) 작성. 한덕연 선생님 우리말 36항목을 코드로 옮기는 작업 책임.

## 자료 제공 / 출처

### 한덕연 (우리말 36항목)

본 스킬의 **사회복지 분류 체계 핵심 원천**(`skills/urimal-for-socialworker/resources/references/urimal-source.md`)은 한덕연 선생님이 사회복지 현장 문서를 수십 년 검토하며 정리하신 우리말 36항목 자료입니다. 자료 활용에 너른 양해를 베풀어 주신 데 깊이 감사드립니다.

## Upstream — im-not-ai (epoko77-ai)

본 프로젝트는 [epoko77-ai/im-not-ai](https://github.com/epoko77-ai/im-not-ai) (MIT)를 기반으로 사회복지 도메인을 위해 확장한 것입니다. 원본 프로젝트의 핵심 기여자를 그대로 보존합니다.

### [@epoko77-ai](https://github.com/epoko77-ai) (이승현)

**기여**: `im-not-ai` 프로젝트 창립. 분류 체계(`ai-tell-taxonomy.md`) 설계, 6인 에이전트 파이프라인(`ai-tell-detector`, `korean-style-rewriter`, `content-fidelity-auditor`, `naturalness-reviewer`, `korean-ai-tell-taxonomist`, `humanize-web-architect`) 구축, v1.0~v1.3.1 릴리스 책임.

**반영**: 본 리포의 6인 에이전트 정의(`skills/urimal-for-socialworker/resources/agents/`)와 분류 체계 5종(`ai-tell-taxonomy.md`, `rewriting-playbook.md`, `pattern-candidates.md`, `promotion-checklist.md`, `sample-collection.md`)이 모두 upstream에서 비롯된 것입니다.

### [@simonsez9510](https://github.com/simonsez9510) (Won Seongmuk)

**기여 (upstream im-not-ai v1.2)**: 한국어 비소설 단행본 원고 8.5만 자 실전 적용 후기 + 개선 제안 4건. 권한 위계 §1~§6, `author-context.yaml` 스키마, 에이전트 주입 분리 정책 도입의 동기.

### [@gaebalai](https://github.com/gaebalai)

**기여 (upstream im-not-ai v1.2~)**: LICENSE 누락 지적, 슬래시 커맨드 본체 도입, Claude Code Plugin/Marketplace 규격 패키징 reference. 본 리포의 `commands/` 구조와 `.claude-plugin/plugin.json` 매니페스트 설계의 직접 reference.

## kordoc (chrisryugj)

본 리포에 동봉된 HWP·HWPX·PDF·DOCX 파서는 [chrisryugj/kordoc](https://github.com/chrisryugj/kordoc) (MIT)의 빌드 산출물입니다. 사회복지 현장에서 HWP가 표준이라 함께 패키징했습니다.

## 기여하기

본 프로젝트는 MIT 라이선스이며 외부 기여를 환영합니다.

- **새 사회복지 글쓰기 패턴 제보** — `skills/urimal-for-socialworker/resources/references/sw-tell-taxonomy.md`에 후보 등재 후 PR
- **AI 티 패턴 일반론** — upstream [epoko77-ai/im-not-ai](https://github.com/epoko77-ai/im-not-ai)에 직접 contribute 권장
- **사용성 개선** — 슬래시 커맨드 추가, 다른 도메인(보건의료·교육 등) 확장 reference
- **버그 리포트** — Issue로 등록

PR 보내실 때는 GitHub 기본 inbound = outbound 원칙에 따라 동일한 MIT 라이선스로 contribution됩니다.
