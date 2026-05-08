---
agent: design-engineer
created: 2026-05-08
purpose: One-time operator setup for create-gmail-drafts.mjs + Apps Script auto-send
inputs:
  - .cycle/marketing/2026-05-07-outreach-tracker.csv (52 cold contacts)
  - .cycle/marketing/2026-05-07-cold-email-templates.md (Touch 1 templates)
  - .cycle/marketing/2026-05-07-trade-press-pitches.md (5 named editors)
status: READY — operator runs once, Tue/Wed/Thu sends fire automatically thereafter
---

# Practiq cold + trade-press 자동 발송 셋업 가이드

이 가이드는 운영자(`seungdo.keum@cliwant.com`)가 다음 두 가지를 한 번에 셋업하기 위한 절차다.

1. **`scripts/create-gmail-drafts.mjs`** — Gmail Drafts에 57개의 초안을 일괄 생성한다 (52 cold + 5 trade press).
2. **`apps-script/practiq-schedule-send.gs`** — Tue/Wed/Thu 9 AM CT에 자동으로 해당 Day의 cold 초안 5건을 발송, 그리고 정해진 날짜에 trade press 초안을 발송하는 Google Apps Script 트리거.

총 셋업 시간 25분 (단 1회). 그 이후로는 매일 발송 직전에 5건의 personalization만 하면 된다.

---

## A. Google Cloud Console — OAuth Client ID 생성 (10분, 1회)

1. https://console.cloud.google.com/ 열기 (운영자 Cliwant 계정으로 로그인).
2. 상단 프로젝트 셀렉터 → **New project** → 이름 `practiq-outreach`. (Cliwant 워크스페이스에 기존 프로젝트가 있으면 그것 사용해도 좋다.)
3. **APIs & Services → Library** → "Gmail API" 검색 → **Enable**.
4. **APIs & Services → OAuth consent screen** (처음이면 한 번만):
   - User Type: **Internal** (Cliwant Workspace 도메인 내부용이므로 Internal로 두면 verification 불필요).
   - App name: `practiq-drafts-cli`.
   - User support email + Developer contact email: `seungdo.keum@cliwant.com`.
   - Scopes: `gmail.compose` 추가 (Save and Continue).
5. **APIs & Services → Credentials → Create Credentials → OAuth Client ID**:
   - Application type: **Desktop app**.
   - Name: `practiq-drafts-cli`.
   - **Download JSON**.
6. 다운로드한 JSON 파일을 다음 경로에 저장한다 (디렉토리가 없으면 만든다):
   ```
   C:\Users\keums\.cred\practiq-gmail-credentials.json
   ```
   이 파일은 절대 git에 포함시키지 않는다 (`~/.cred/`는 home 디렉토리 밖이므로 자연스럽게 분리되어 있다).

---

## B. 초안 생성 스크립트 실행 (2분, 1회)

```bash
cd C:\Users\keums\git\venture-harness
node ventures/fractional-ai-command-center/scripts/create-gmail-drafts.mjs
```

- 첫 실행 시 브라우저가 열리며 Google OAuth 동의 화면이 나타난다 → **Allow** 클릭. 토큰은 `C:\Users\keums\.cred\practiq-gmail-token.json`에 저장되고 이후 실행에서는 자동 사용된다.
- 약 1분 안에 57개의 초안이 Gmail에 생성된다 (52 cold + 5 trade press).
- 마지막에 per-label 요약 표가 출력된다.

옵션:
- `--dry-run` — Gmail API를 호출하지 않고 파싱+계획만 출력. **셋업 직전에 항상 한 번 실행해서 52+5 카운트를 확인하라**.
- `--force` — tracker CSV의 `notes`에 이미 `draft_created=...`가 있어도 다시 생성 (테스트용).

---

## C. Gmail에서 검수 (3분)

1. Gmail 열기 → 좌측 라벨 사이드바 → `Practiq` 그룹 펼치기.
2. 다음 라벨이 모두 보이는지 확인:
   - `Practiq/Cold/All` (52)
   - `Practiq/Cold/Day1` ~ `Practiq/Cold/Day10` (각 5)
   - `Practiq/Cold/Buffer` (2)
   - `Practiq/Trade-Press/All` (5)
   - `Practiq/Trade-Press/AccountingToday`, `CPAPracticeAdvisor`, `AbovetheLaw`, `SHRM`, `MarketingProfs` (각 1)
3. 임의의 cold 초안 하나 열기 → 다음 확인:
   - **From**: `Seungdo Keum <seungdo.keum@practiq.dev>` (alias). 만약 운영자 본 주소(`seungdo.keum@cliwant.com`)로 보이면 alias가 아직 Gmail에 Send-As로 등록되지 않은 것이다 → Gmail Settings → Accounts → "Send mail as" → `seungdo.keum@practiq.dev` 추가 후 alias verification 메일 확인.
   - **Subject**: 템플릿 첫 번째 variant.
   - **Body**: `Hi {first_name},` 가 제대로 치환되었고, `[ADD ONE SPECIFIC DETAIL HERE: …]` placeholder가 들어 있어야 한다.
4. trade press 초안 하나 열기 → **To** 가 `[VERIFY EDITOR EMAIL VIA HUNTER.IO]`인지 확인.

---

## D. 발송 직전 personalization 워크플로우 (매 발송일 전날 ~25분)

발송 자동화는 D-day 9 AM에 fires. 따라서 운영자는 **발송 전날** (또는 그 날 아침 일찍) 5건의 cold 초안에 1-2 문장의 firm-specific 디테일을 채워야 한다.

순서:
1. Gmail → 좌측 라벨 → `Practiq/Cold/DayN` (예: 5/13 발송이면 Day1) 클릭.
2. Drafts 보기로 전환 → 5건이 보인다.
3. 각 초안 열기 → `[ADD ONE SPECIFIC DETAIL HERE: a firm-specific pain you saw on their website / LinkedIn / a recent press release]` 부분을 1-2문장의 진짜 디테일로 교체. 예시:
   - 회사 사이트의 "We serve high-net-worth families in the medical field" → "Saw your focus on physician-family wealth structures — partnership-tax memos at that scale are exactly the workflow we redline."
   - LinkedIn 최근 게시물의 hiring announcement → "Caught your bookkeeper hire post last week — onboarding new staff while keeping the close memo voice consistent is exactly the pain Practiq sits on."
4. **저장만 하고 발송하지 않는다** (Gmail은 자동 저장). Apps Script가 9 AM CT에 자동 발송한다.

만약 personalization을 까먹었다면 — Apps Script의 안전 장치가 `[ADD ONE SPECIFIC DETAIL HERE`가 남아 있는 초안은 **건너뛴다**. 운영자는 로그를 보고 사후에 수동 발송하면 된다.

trade press의 경우, 발송 전날에 다음 두 가지를 처리해야 한다:
- **Hunter.io / RocketReach로 editor 이메일 검증** → To 필드의 `[VERIFY EDITOR EMAIL VIA HUNTER.IO]`를 진짜 이메일로 교체.
- 첫 줄을 그 editor의 최근 30일 내 byline에 맞게 1문장 personalize.

---

## E. Apps Script 자동 발송 셋업 (15분, 1회)

1. https://script.google.com/ 열기 → **New project** → 이름 `Practiq Outreach Scheduler`.
2. 좌측 파일 트리에서 `Code.gs` 열기 → 모든 내용 삭제 → `apps-script/practiq-schedule-send.gs`의 전체 내용을 붙여넣기 → 저장 (Ctrl+S).
3. 상단 함수 셀렉터에서 `dailyCheck` 선택 → **Run** 클릭. 첫 실행 시 권한 요청이 뜬다:
   - Google account 선택 → "Practiq Outreach Scheduler wants to access your account" → **Allow**.
   - 요청되는 스코프: `gmail.modify` / `gmail.send` (Apps Script가 GmailApp 사용 시 기본).
4. **DRY_RUN 테스트**: 파일 상단의 `var DRY_RUN = true;` 그대로 둔 채, **실행** 버튼 → **View → Logs** (또는 Ctrl+Enter). 다음 둘 중 하나가 보여야 정상이다:
   - 오늘 날짜가 `COLD_SCHEDULE`에 없으면: `dailyCheck: no cold batch scheduled for YYYY-MM-DD (CT). Nothing to do.`
   - 오늘 날짜가 매칭되면: `[DRY RUN] would send → to=... subject="..."` 가 5번.
   추가로 `inventoryDrafts` 함수를 실행하면 Practiq 라벨별 draft 카운트를 로그로 확인할 수 있다.
5. **manualSendCold_DayN** 함수로 실 데이터 시뮬레이션:
   - 함수 셀렉터에서 `manualSendCold_DayN` 선택 → 단, 매개변수 전달이 어려우므로 임시로 `dailyCheck` 본문을 복제해서 강제 라벨로 호출하거나, `manualSendCold_DayN('Day1')`을 호출하는 wrapper 함수를 추가해도 된다. 가장 간단한 검증법: `inventoryDrafts` 실행 후 라벨/카운트 매칭 확인.
6. **DRY_RUN을 false로**: 로그가 정상이면 1행을 `var DRY_RUN = false;`로 수정 → 저장.
7. **Time-driven trigger 1 — cold 발송**:
   - 좌측 사이드바의 시계 아이콘 (Triggers) → **+ Add Trigger** (우하단).
   - Choose function: `dailyCheck`.
   - Deployment: Head.
   - Event source: **Time-driven**.
   - Type: **Day timer**.
   - Time of day: **9am to 10am**.
   - Timezone: **America/Chicago** (Apps Script 프로젝트의 timezone을 미리 America/Chicago로 설정하거나, `dailyCheck` 내부의 `todayInTz_('America/Chicago')` 가 timezone 처리하므로 트리거 timezone은 무엇이든 무방하지만, 가독성을 위해 CT로 두는 것을 권장).
   - **Save**.
8. **Time-driven trigger 2 — trade press 발송**:
   - **+ Add Trigger** 다시 클릭.
   - Choose function: `tradePressCheck`.
   - Time-driven, Day timer, **9am to 10am**, **America/New_York**.
   - **Save**.

이제 셋업 끝. Tue/Wed/Thu 9 AM CT에 cold가, 정해진 날짜 9 AM ET에 trade press가 자동 발송된다.

---

## F. Touch 2 / Touch 3 follow-up (Day +4, +9)

Apps Script는 follow-up을 처리하지 않는다. 작은 양 (5건/일) 이므로 운영자가 수동으로:
1. Gmail의 Sent 폴더에서 원본 thread 열기.
2. **Reply** 클릭 → `2026-05-07-cold-email-templates.md`의 Touch 2 (또는 Touch 3) body 붙여넣기.
3. `{first_name}` 한 곳만 치환, 가능하면 Touch 1에서 받은 응답 패턴(또는 무응답 사실)을 1문장 반영.
4. **Send**.
5. Tracker CSV의 `sent_followup1_at` (또는 `sent_followup2_at`) 컬럼을 오늘 날짜로 업데이트.

---

## G. Tracker CSV 업데이트 (자동)

`create-gmail-drafts.mjs`는 매 row의 `notes` 컬럼에 `draft_created=<gmail_draft_id>`를 자동 기록한다. 두 번째 실행 시 이 row는 skip되므로 idempotent하다.

발송 후 운영자가 직접 업데이트해야 하는 컬럼:
- `sent_initial_at` — Apps Script가 발송에 성공한 날짜를 매번 채울 수도 있지만, 현재 버전에서는 운영자가 수동 기록한다. (개선 idea: Apps Script가 매 발송 후 Cloudflare Worker에 webhook을 쳐서 서버 사이드에서 CSV를 업데이트하는 변형이 있지만, 셋업 복잡도 대비 가치 낮아 현재 패스.)
- `sent_followup1_at` / `sent_followup2_at` — 위 F. 단계에서.
- `last_response_at`, `response_type`, `status` — 응답이 도착하면 그때 수동 업데이트.

---

## H. 비상 정지

- **Apps Script trigger 끄기**: script.google.com → Triggers → 해당 트리거 우측 ⋮ → **Delete trigger**. 양쪽 (`dailyCheck`, `tradePressCheck`) 모두 삭제하면 자동 발송 완전 정지.
- **DRY_RUN으로 되돌리기**: Code.gs 1행만 `true`로 수정 → 저장. 트리거가 fires해도 실제 발송은 안 한다.
- **단일 draft 정지**: Gmail에서 해당 draft를 삭제하면 Apps Script가 더 이상 찾지 못한다. 또는 라벨에서 제거 (Drafts에는 남아 있되 자동 발송 대상에서 빠진다).

---

## 참고 — 운영자의 실제 일일 노력

| 시점 | 작업 | 시간 |
|------|------|------|
| 1회 | OAuth client 셋업 | 10분 |
| 1회 | `create-gmail-drafts.mjs` 실행 | 2분 |
| 1회 | Apps Script + 트리거 셋업 | 15분 |
| 매 발송 전날 | Day-N 5건 personalization | 25분 |
| 매 trade press 발송 전날 | Hunter.io 검증 + 1문장 personalize | 10분 |
| Touch 2/3 발송 (Day +4, +9) | 5건 reply | 15분 |

총 자동화 효과: cold 50건의 발송 click이 0회로 감소. 운영자는 personalization과 후속 회답 처리에만 집중.
