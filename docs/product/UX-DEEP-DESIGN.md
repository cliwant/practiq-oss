# Fractional AI Command Center — 심층 UX 설계 (AI-Native Agent 패러다임)

> 2026-04-06 | 타겟 고객: 미국 소규모 회계/세무/부기펌 (2-10명, 50-200개 클라이언트)
> **핵심 패러다임 전환**: "채팅 중심 워크스페이스" → "AI Agent Command Center"

---

## 1. 타겟 페르소나 재정의

### Primary: Jennifer Park — Managing Partner, 6인 회계/세무펌

- **회사**: 소규모 회계펌, 6명 직원(Jennifer 포함)
- **클라이언트**: 120명 (중소 음식점, 의료 클리닉, 소매점, 서비스업체)
- **현황**: QuickBooks Online, TaxDome 또는 수동 프로세스
- **주요 페인**:
  - 120명 클라이언트의 맥락을 동시에 관리하면서 각 클라이언트의 특수성 파악 어려움
  - 월간 마감 시즌에 모든 직원이 과부하 상태
  - 세무 신고 시즌에 서류 수집 추적 만으로 시간 소모
  - 직원들의 작업 품질/진행 상황 파악 어려움
- **핵심 니즈**:
  - 아침 출근 시 **AI가 밤새 한 일** 한눈에 파악
  - 120개 클라이언트 중 "지금 주의가 필요한 것"만 먼저 보고 싶음
  - 직원들이 생성한 산출물(재무제표, 세무요약)을 빠르게 검토하고 승인
  - 세무 시즌에 85개 클라이언트의 마감 진행률을 실시간 추적

**하루 일과**:
- 08:30 앱 열기 → "밤사이 이상 감지 3건, 검토 대기 산출물 8개, AI 작업 중인 클라이언트 5개" 보임
- 15분 내에 승인 큐 처리 (8개 항목 검토/승인)
- 특정 클라이언트 이상 감지 이유 확인하려면 Chat 진입 → 심층 분석
- 한 주 동안 "월간 마감 진행률: 67/120 (56%)" 추적

---

### Secondary: Emily Kim — Staff Accountant, 3년 경력

- **역할**: Jennifer의 6인 펌에서 계약직/풀타임 직원
- **담당 클라이언트**: 40명 (Jennifer가 배정)
- **현황**: 일일 reconciliation, 월간 재무제표 작성, 클라이언트 소통
- **주요 페인**:
  - 자신이 작성한 보고서에 Jennifer의 피드백이 온 후 수정 사이클 반복
  - 클라이언트의 역사적 결정이나 선호도가 무엇인지 파악하기 어려움
  - 반복되는 작업(수익 분류, 비용 배정)을 매번 같은 방식으로 처리해야 함
- **핵심 니즈**:
  - AI가 **Jennifer가 과거에 한 결정을 학습**해서 자신의 작업에 자동 적용
  - 자신의 담당 40개 클라이언트의 "준비 상황" 한눈에 파악
  - 작업 제출 전 AI에게 "이거 Jennifer 스타일에 맞나?" 확인

**하루 일과**:
- 09:00 앱 열기 → "담당 40개 클라이언트 중 이번 주 마감 대상 15개, 준비 완료 3개" 보임
- 첫 번째 클라이언트 → AI가 이미 reconciliation 초안 생성
- 초안 검토 → "승인" → "Emily의 리뷰 완료" 상태로 자동 Jennifer의 최종 검토 큐로 이동
- 두 번째 클라이언트 → 식당 (음식점 계정 분류 패턴) → AI가 자동 적용 (Jennifer의 과거 패턴 학습)

---

## 2. UX 설계 원칙

### 원칙 1: Agent-First, Not Tool-First
**AI가 주체이며, 사용자는 검증자이다.**

기존 패러다임: "사용자가 요청 → AI가 응답"
새로운 패러다임: "AI가 자율 감지 → 사용자가 검토/승인"

구체적 차이:
- **기존**: "Jennifer가 Chat에서 '120개 클라이언트의 이번 달 이상 거래 찾아줘' → AI 답변 검색"
- **새로운**: "AI가 매일 6시간마다 자율적으로 120개 클라이언트를 스캔해서 이상을 감지 → Dashboard에 '이상 거래 3건' 표시 → Jennifer가 '봤어, 이건 처리해' 클릭"

이것이 시간 절약의 핵심. AI가 사용자를 기다리지 않고 계속 일한다.

### 원칙 2: Command Center over Chat
**기본 뷰는 Chat이 아닌 AI Agent Dashboard이다.**

기존 구조:
```
┌────────┬─────────────┐
│Client  │  💬 Chat    │
│List    │  (중심)      │
└────────┴─────────────┘
```

새로운 구조:
```
┌────────────────────────────────────────┐
│ 📊 AI Agent Dashboard                   │
│ ⚠️ Needs Attention (3) | 📋 Approval Queue (8) │
│ 🔄 Working Now (5) | ✅ Completed (12)  │
├────────┬──────────────────────────────┤
│Client  │ (Dashboard 하단)                │
│List    │ 💬 [Chat으로 진입 옵션]       │
│(검색)  │                                │
└────────┴──────────────────────────────┘
```

Chat은 특정 클라이언트 심층 분석이 필요할 때 사용하는 **보조 인터페이스**.

### 원칙 3: Ambient Intelligence
**AI의 모니터링, 감지, 준비가 백그라운드에서 계속 발생한다.**

- 사용자가 앱을 닫아도 AI는 일한다.
- 사용자가 로그인했을 때 "밤새 AI가 발견한 것"이 자연스럽게 표시된다.
- "확인하러 가야 한다"는 느낌이 아니라, "이미 준비되어 있다"는 느낌.

### 원칙 4: Approval Queue as Core Workflow
**고위험 행동은 명시적 승인을 거친다. 이것이 주요 상호작용 패턴이다.**

Superhuman(이메일)의 검토 흐름을 회계 산출물에 적용:
- Jennifer의 아침 루틴: Dashboard 열기 → "Approval Queue 8개 항목" 보임 → 하나씩 검토 → 승인 또는 수정 → 다음
- 각 항목: 클라이언트 이름, 산출물 종류(재무제표/세무요약), AI 신뢰도, 이상 지표 표시, 미리보기 패널

승인 과정은 최고 효율로 설계 (아래 섹션 4 참조).

### 원칙 5: Progressive Trust
**AI는 시작할 때 보수적이며, 사용자의 검증을 통해 신뢰를 쌓아나간다.**

- Day 1: AI는 거의 모든 결정에 대해 승인을 요청
- Week 2: Jennifer가 10번 "승인"하면, AI는 유사한 패턴에 대해 자동 승인 가능 제안
- Month 2: 패턴이 충분히 검증되면, Jennifer가 설정할 때까지 자동으로 실행

예: "Kim's Restaurant의 식자재 비용 재분류를 10번 승인했으므로, 이제 자동으로 적용할까요?" → Jennifer "네" → 그 다음부터 자동.

**참고 UX 패턴**: Linear (GitHub issues triage), Superhuman (email review), GitHub Actions (background job status), Datadog (monitoring dashboards)

---

## 3. 핵심 구조: Command Center Dashboard가 중심

### 3.1 전체 레이아웃

```
┌─────────────────────────────────────────────────────────────────────┐
│ Global Bar: Jennifer's Accounting | Cmd+K Search | 🔔 Alerts(3) | + | ⚙️ │
├──────────┬─────────────────────────────────────────────────────────┤
│          │                                                         │
│ Global   │   Main Content Area (Default: AI Agent Dashboard)       │
│ Sidebar  │   ┌───────────────────────────────────────────────┐    │
│          │   │ ⚠️  NEEDS ATTENTION (빨강, P0)                │    │
│          │   │ • Kim's Restaurant: unusual cash outflow      │    │
│ ● Dash   │   │ • Medical Clinic: Q1 tax est. due in 3 days  │    │
│ ──────  │   │ • TechStart: missing bank reconciliation      │    │
│ 🔍Search │   │                                               │    │
│ ──────  │   │ 📋 APPROVAL QUEUE (주황, 8 items pending)      │    │
│ Clients  │   │ • [Preview] Kim's - Mar Monthly Close (v2)    │    │
│ (120)    │   │ • [Preview] Medical - Tax Summary Draft       │    │
│ • Kim's  │   │ • [Preview] TechStart - Cash Flow Proj.       │    │
│   Rest   │   │ ... (5 more)                                  │    │
│ • Medical│   │                                               │    │
│ • TechSt │   │ 🔄 AI WORKING NOW (파란, 5 in progress)       │    │
│ • ...    │   │ • Scanning 40 clients for month-end close... │    │
│          │   │ • Generating tax estimates for 12 clients...  │    │
│ ──────  │   │ • Matching bank transactions for 8 clients...  │    │
│ 👥 Team  │   │                                               │    │
│ ⚙️ Settngs│   │ ✅ COMPLETED TODAY (초록, 12 items)          │    │
│          │   │ [collapsed by default, expandable for audit]  │    │
│          │   │ • Reconciled 847 transactions across 15 cl    │    │
│          │   │ • Generated 8 financial statement drafts      │    │
│          │   │ • Sent 5 reminder emails for missing docs     │    │
│          │   │                                               │    │
│          │   │ 📊 WEEKLY OVERVIEW                            │    │
│          │   │ ┌────────────────────────────────────────┐   │    │
│          │   │ Monthly Close: 67/120 Complete (56%)     │   │    │
│          │   │ ████░░░░░░░░░░░░░░                      │   │    │
│          │   │                                         │   │    │
│          │   │ Tax Season (if active):               │   │    │
│          │   │ Docs Collected: 42/85 (49%)           │   │    │
│          │   │ ████░░░░░░░░░░░                       │   │    │
│          │   │                                         │   │    │
│          │   │ Team Workload:                        │   │    │
│          │   │ Emily: 12/40 complete | Jennifer: 8/15│   │    │
│          │   └────────────────────────────────────────┘   │    │
│          │                                               │    │
│          └───────────────────────────────────────────────┘    │
│                                                               │
└──────────┴─────────────────────────────────────────────────────┘
```

**중요**: 로그인하면 이것이 기본 뷰다. Chat이 아니라 **Dashboard**.

### 3.2 Global Sidebar

```
┌─────────────┐
│ ● Dashboard │  ← 항상 돌아올 수 있는 홈
│ ───────────│
│ 🔍 Search  │  ← Cmd+K와 동일. 클라이언트/문서/대화 검색
│ ───────────│
│ Clients(120) ← 정렬/필터: 우선순위순, 최근 활동순, 검색
│             │
│ ▼ Kim's    │  ← 클릭하면 클라이언트 워크스페이스로 진입
│   Restaurant│     (아래 섹션 5 참조)
│ ▼ Medical  │
│   Clinic   │
│ ▼ TechStart│
│ ▼ [...more]│
│             │
│ ───────────│
│ 👥 Team    │  ← Jennifer이 등록한 팀원 목록 (Emily, etc)
│             │  ← 각 팀원의 "할당된 클라이언트" 표시
│ ⚙️ Settings │  ← 펌 설정, 팀 관리, 인테그레이션
│ ? Help      │
│             │
└─────────────┘
```

---

## 4. AI Agent Dashboard 상세 설계 (가장 중요한 섹션)

이것이 Jennifer의 아침 9:00 AM에 보는 화면이다. 이 대시보드의 설계가 전체 제품의 차별성을 결정한다.

### 4.1 Needs Attention 섹션 (빨강, P0)

**목적**: Jennifer가 전문적 판단이 필요한 항목을 먼저 본다.

**항목 종류**:
1. **이상 거래 감지** — AI가 감지한 unusual transactions
   - Kim's Restaurant: "Cash outflow $8,500 yesterday (unusual for Tuesday, avg $2,100)"
   - 심각도 배지: 🔴 High / 🟠 Medium / 🟡 Low
   - 클릭 → 해당 클라이언트 워크스페이스로 진입, 거래 하이라이트됨

2. **마감/규제 임박** — 세무/회계 마감이 7일 이내
   - Medical Clinic: "Q1 Estimated Tax Payment due in 3 days"
   - TechStart: "Annual 941 filing due in 5 days"
   - 클릭 → 체크리스트 보여줌 (서류 상태, 준비 단계)

3. **미해결 작업** — 마감이 지났거나 대기 중인 항목
   - TechStart: "Bank reconciliation pending for 3 days (expected Feb 28)"
   - Emily가 제출했지만 Jennifer가 미검토 상태

4. **AI 신뢰도 저하** — AI가 확신이 없는 결정
   - Kim's Restaurant: "Food cost reclassification confidence 62% (ambiguous invoice)"
   - Jennifer의 판단 필요

**각 항목의 UI 구조**:
```
┌─────────────────────────────────────────────────┐
│ 🔴 Kim's Restaurant                              │
│ Unusual cash outflow $8,500 (yesterday)           │
│ → Typical: $2,100/day, Confidence 94%            │
│                                                  │
│ Time detected: 3 hours ago | Severity: High     │
│                                                  │
│ [View Details] [Open Client Workspace]          │
└─────────────────────────────────────────────────┘
```

**다음 스텝**: 보통 2-3개 항목을 빠르게 스캔하고, 각각:
- "이미 알고 있다" → 무시
- "확인이 필요하다" → "View Details" → Chat으로 AI와 대화
- "심각하다" → "Open Client Workspace" → 해당 클라이언트 진입

---

### 4.2 Approval Queue 섹션 (주황, 8 items)

**목적**: Jennifer가 AI나 Emily가 준비한 산출물을 빠르게 검토하고 승인한다.

이것이 **가장 중요한 상호작용 패턴**이다. Superhuman(이메일 검토)의 논리를 회계에 적용했다.

**항목 종류**:
1. **재무제표 초안** — 월간 마감 시 자동 생성
2. **세무 요약** — 분기/연간 세무 마감용
3. **이메일 초안** — 클라이언트에게 보낼 커뮤니케이션
4. **Bank Reconciliation 초안** — 거래 분류/매칭
5. **지출 보고서 초안** — Emily나 AI가 생성

**각 항목의 표시 방식**:
```
┌────────────────────────────────────────────────────────┐
│ [Preview] Kim's Restaurant — March Monthly Close       │
│                                                        │
│ Generated by: AI | Format: .xlsx | Confidence: 94%   │
│ ⚠️ Highlights: Food cost increased 12% vs Feb (check) │
│                Interest expense $340 (unusual)        │
│                                                        │
│ Team: Emily, Jennifer | Status: Pending Review (3h)  │
│                                                        │
│ ┌─ ACTIONS ─────────────────────────────────────────┐ │
│ │ [👁️ Preview]  [✏️ Edit in Editor]  [✅ Approve]  │ │
│ │ [💬 Comment]  [❌ Request Changes]              │ │
│ └──────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

**승인 과정 상세**:

#### Step 1: Preview 보기 (인라인 미리보기)
- Jennifer가 "Preview" 클릭
- 해당 문서가 오른쪽 패널에 임베디드 뷰어로 열림
- .xlsx는 스프레드시트 뷰어 (Google Sheets 경량 버전)
- .docx는 리치 텍스트 뷰어 (Google Docs 경량 버전)
- 중요 수치에 하이라이트 (변동률, 이상치)
- "AI's note": "지난달과 비교해 이 항목들이 눈에 띕니다"

#### Step 2: 최종 결정
- **Approve** — 그대로 승인 → 클라이언트에게 발송 또는 파일 시스템에 저장 가능
- **Edit** — 에디터 열기 → 직접 수정 (클릭으로 인라인 편집 또는 전체 에디터)
- **Request Changes** — Emily에게 돌려보내기 → 피드백 메시지 추가
- **Comment** — 코멘트만 남기기 (수정 없이 진행)

#### Step 3: 승인 후
- 자동 상태 변경: "Approved" ✅
- 다음 항목으로 (Superhuman의 "J" 키 같은 빠른 네비게이션)
- 선택사항: "Batch Approve for similar items" (예: 같은 클라이언트의 다른 항목도 한번에 승인)

**키보드 단축키** (파워유저를 위해):
- `J` — 다음 항목
- `K` — 이전 항목
- `P` — 현재 항목 프리뷰 toggle
- `Y` — 승인
- `N` — 변경 요청
- `C` — 코멘트 추가

**중요한 UX 결정**:
대부분의 회계 산출물은 "완벽할 수 없다"는 철학. Jennifer가 "완벽을 기다리며 병목"되지 않도록, 80% 품질도 빠르게 승인할 수 있도록 설계했다. 코멘트로 패턴을 남기면 AI가 학습한다.

---

### 4.3 AI Working Now 섹션 (파란, 5 items in progress)

**목적**: Jennifer가 "AI가 지금 뭘 하고 있는지" 알 수 있다. 투명성과 신뢰 구축.

**예시**:
```
🔄 AI Working Now (Real-time updates)

┌────────────────────────────────────────────────────┐
│ Scanning QuickBooks for month-end close          │
│ 40/120 clients checked, 3 issues found            │
│ ████████░░░░░░░░░░ 33% (Est. 2 hours remaining)  │
│                                                   │
│ Generating March financial statements            │
│ 15/67 statements generated                       │
│ ███░░░░░░░░░░░░░░░░ 22% (Est. 1 hour remaining)  │
│                                                   │
│ Matching bank transactions                       │
│ 847/1,234 matched (68%)                          │
│ █████████░░░░░░░░░░ 68% (In progress)            │
│                                                   │
│ Collecting missing documents                     │
│ Draft emails ready for: 8 clients                │
│ ✅ Ready to send (pending approval)              │
│                                                   │
│ Learning pattern: Food cost reclassification     │
│ Confirmed: 5 instances (sufficient for auto-apply)│
│ ⚠️ Ready for production (pending your approval)   │
└────────────────────────────────────────────────────┘
```

**상호작용**:
- 각 작업을 클릭하면 상세 진행 상황 보임
- "Stop this task" 버튼 (만약 AI가 잘못된 방향이면 중단)
- "Cancel all" 버튼

**의미**: 사용자가 "AI는 요청받을 때만 반응한다"는 오해를 깬다. 아침에 로그인하면 "밤새 AI가 일했다"는 것을 명백히 보여준다.

---

### 4.4 Completed Today 섹션 (초록, 12 items)

**목적**: AI가 자율적으로 완료한 작업의 감사 추적(audit trail).

기본 상태: **축소됨** (collapsed)
- "✅ Completed Today (12) — Show more" 형태로만 표시

클릭하면 확장:
```
✅ Completed Today (12)

┌────────────────────────────────────────────────────┐
│ ✓ Reconciled 847 transactions (15 clients)         │
│   08:15 AM | Matched with bank feeds               │
│                                                    │
│ ✓ Generated 8 financial statement drafts           │
│   07:42 AM | Ready in Approval Queue               │
│                                                    │
│ ✓ Sent 5 reminder emails                          │
│   06:30 AM | Missing document notifications       │
│                                                    │
│ ✓ Detected 3 anomalies                            │
│   05:15 AM | Flagged in Needs Attention          │
│                                                    │
│ ✓ Learned new pattern (Food cost auto-classify)  │
│   04:00 AM | From Jennifer's approvals            │
│                                                    │
│ ... (7 more)                                       │
│                                                    │
│ [Download Audit Log] [Email Summary]              │
└────────────────────────────────────────────────────┘
```

**왜 축소하는가?**: 너무 많은 정보는 오버로드를 일으킨다. 하지만 규제 감시(회계펌은 감사 대응이 필수)를 위해 여전히 접근 가능해야 한다.

---

### 4.5 Weekly Overview (통계 카드들)

**목적**: 지난 한 주간의 전체 진행 상황을 한눈에.

```
📊 WEEKLY OVERVIEW

┌────────────────────────────────────────────────────┐
│ Monthly Close Progress                              │
│ 67/120 complete (56%)                               │
│ ████████████░░░░░░░░░░░░░░░░ 56%                   │
│ +15 completed since Monday (pace on track)          │
│                                                     │
│ Tax Season (Q1 filings)                             │
│ 42/85 docs collected (49%)                           │
│ ████████░░░░░░░░░░░░░░░░░░░░░ 49%                   │
│ 12 missing docs (urgent reminders sent)             │
│                                                     │
│ Team Workload (this week)                           │
│ Emily:    ████████░░ 40% (12/40 clients)            │
│ Jennifer: ██████░░░░ 53% (8/15 clients)             │
│ Next: Rebalance workload? (Emily capacity 80%)     │
│                                                     │
│ Quality Metrics                                      │
│ Rework rate: 3.2% (↓ from 4.1% last week)          │
│ AI confidence avg: 91% (↑ from 88%)                 │
│                                                     │
│ Cost This Week                                      │
│ AI API usage: $12 / $50 budget (24%)                │
│ Cost per client processed: $0.18 (target: <$0.25)  │
└────────────────────────────────────────────────────┘
```

---

## 5. Client Workspace 상세 설계 (특정 클라이언트 진입)

Jennifer가 Global Sidebar의 "Kim's Restaurant"을 클릭하면 **Client Workspace**로 진입한다.

### 5.1 Workspace 레이아웃

```
┌──────────────────────────────────────────────────────────────┐
│ Global Bar: Jennifer's Accounting | Cmd+K | 🔔 | + | ⚙️      │
├──────────┬───────────────────────────────────────────────────┤
│          │ [← Dashboard] 🟠 Kim's Restaurant                 │
│          │                                                   │
│ Sidebar  │ ┌─ Workspace Tabs ──────────────────────────────┐ │
│ (검색)   │ │ 📄 Overview | 💰 Financials | 📋 Docs |       │ │
│ Clients  │ │ 💬 Chat (AI) | 📚 Knowledge Base               │ │
│ (120)    │ └──────────────────────────────────────────────┘ │
│          │                                                   │
│ Kim's    │ [Main Content Area — 현재 탭 표시]              │
│ Restaur  │                                                   │
│ Medical  │                                                   │
│ TechSt   │                                                   │
│          │                                                   │
└──────────┴───────────────────────────────────────────────────┘
```

**중요 설계 결정**:
- 상단 색상 액센트가 **클라이언트별 색상**으로 변경 (Kim's = 주황, Medical = 초록 등)
- 이것으로 "지금 어느 클라이언트인지" 무의식적 인식 (Arc Browser Space 패턴)
- Breadcrumb "← Dashboard"로 언제든 돌아갈 수 있음

### 5.2 Overview 탭 (기본 뷰)

```
┌─────────────────────────────────────────────────────────────┐
│ 🟠 Kim's Restaurant                                          │
│ Cuisine: Korean BBQ | Industry: Food Service | Relationship: 18mo│
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ CURRENT PRIORITIES (AI-generated, pinned by team)        ││
│ ├──────────────────────────────────────────────────────────┤│
│ │ 1. Prepare March monthly close (due 4/5, 5 days)        ││
│ │ 2. File Q1 payroll tax (due 4/15, 15 days)              ││
│ │ 3. Review unusual food cost variance (12% increase)     ││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ KEY METRICS (from QuickBooks)                            ││
│ ├──────────────────────────────────────────────────────────┤│
│ │ Monthly Revenue (Feb):  $145,000 (+8% vs Jan)            ││
│ │ Monthly Expenses:       $98,500 (+12% vs Jan, food +12%) ││
│ │ Net Profit Margin:      32% (↓ from 36% Jan)             ││
│ │ Cash on Hand:           $42,000 (healthy, 2.6mo runway)  ││
│ │ Current Receivables:    $8,500 (1 overdue invoice $2,200) ││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ RECENT AI ACTIVITY                                       ││
│ ├──────────────────────────────────────────────────────────┤│
│ │ ✅ 03/28 - Reconciled Feb bank transactions              ││
│ │ ✅ 03/27 - Generated Feb P&L draft (Approval Queue)      ││
│ │ ⚠️  03/27 - Detected food cost variance (12% increase)  ││
│ │ 📝 03/26 - Drafted March payroll tax reminder            ││
│ │ 💬 03/25 - AI chat: "Review food supplier contracts?"   ││
│ │           → Jennifer notes: "Seasonal spike expected"    ││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ TEAM ASSIGNMENTS                                         ││
│ ├──────────────────────────────────────────────────────────┤│
│ │ Primary: Emily (accountant) — Reconciliation, bank feeds ││
│ │ Secondary: Jennifer (partner) — Final review             ││
│ │ Contact: Owner/Manager (voice: direct, data-driven)     ││
│ └──────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

**중요**: Overview는 "이 클라이언트에 대해 AI가 최근 무엇을 했나"를 보여준다. 정적인 프로필 정보가 아니라 **동적 활동 로그**.

### 5.3 Financials 탭

QuickBooks에서 연결된 데이터를 보여준다.

```
┌─────────────────────────────────────────────────────────────┐
│ 💰 Financials                                                │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ P&L (Mar, Draft)  | Balance Sheet | Cash Flow            ││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
│ INCOME STATEMENT — March 2026 (Draft)                       │
│                                                              │
│ Revenue                                                      │
│   Food Sales          $142,000  ← from QB                  │
│   Alcohol Sales       $18,500   ← from QB                  │
│   ───────────────────────────────                           │
│   Total Revenue       $160,500                              │
│                                                              │
│ Cost of Goods Sold                                           │
│   Food Cost           $52,000   ⚠️ (12% ↑ from Feb)        │
│   Alcohol Cost        $6,200    (normal)                    │
│   ───────────────────────────────                           │
│   Total COGS          $58,200                               │
│                                                              │
│ Gross Profit          $102,300 (63.8%)                      │
│                                                              │
│ [더 보기: 전체 P&L 표시 or 월별 비교]                          │
│                                                              │
│ AI ANNOTATION (오른쪽 마진):                                │
│ "Food cost spike matches your notes:                       │
│  seasonal ingredient purchase + new menu items.             │
│  Pattern consistent with restaurant industry.              │
│  Monitor next 2 months for normalization."                 │
└─────────────────────────────────────────────────────────────┘
```

**특징**:
- QuickBooks 데이터는 자동으로 pull (매일 동기화)
- AI가 "주목할 점" 코멘트 추가 (오른쪽 마진)
- "Edit" 버튼으로 조정 가능 (월간 마감 시 수동 조정 필요하면)
- 여러 월 비교, 데이터 다운로드 가능

### 5.4 Documents 탭

이 클라이언트를 위해 생성/업로드된 모든 문서.

```
┌─────────────────────────────────────────────────────────────┐
│ 📋 Documents                                                 │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ Filter: All | 📄 Generated | 📤 Uploaded | 📝 Drafts     ││
│ │ Sort: Recent | Alphabetical                              ││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
│ 📄 Mar Monthly Close (P&L + Balance Sheet)                   │
│    .xlsx | AI Generated | v2 (Jennifer edited) | 3/28/2026 │
│    Status: ✅ Approved | Next: Ready to send to client     │
│    [Preview] [Edit] [Comment] [Version History] [Share]    │
│                                                              │
│ 📄 Feb Monthly Close (P&L + Balance Sheet)                   │
│    .xlsx | AI Generated | v1 (Final) | 2/28/2026            │
│    Status: ✅ Archived | Sent to client 3/1/2026           │
│    [Preview] [Comment] [Download] [Archive]                │
│                                                              │
│ 📄 Q1 Payroll Tax Estimate                                   │
│    .docx | AI Generated | v1 (Draft) | 3/27/2026            │
│    Status: ⏳ Pending Review | Assigned to: Jennifer        │
│    [Preview] [Edit] [Request Changes] [Approve]            │
│                                                              │
│ 📤 2026 Lease Agreement                                      │
│    .pdf | Owner Uploaded | 3/1/2026                         │
│    Tags: Contract, Facilities                               │
│    [Preview] [Delete]                                       │
│                                                              │
│ 📝 Email Draft: March Closing Reminder                       │
│    .txt | AI Draft | 3/27/2026                              │
│    Status: 📋 Ready to send (pending your approval)         │
│    [Preview] [Edit] [Send] [Discard]                       │
│                                                              │
│ [Load More...]                                               │
└─────────────────────────────────────────────────────────────┘
```

**중요 기능**:
- 버전 관리: 각 문서의 변경 이력 추적
- 상태 배지: 승인됨, 검토 대기, 아카이브됨 등
- 빠른 액션: Preview, Edit, Comment, Share

### 5.5 Chat (AI) 탭 — 심층 대화 인터페이스

이것이 Chat 인터페이스다. **하지만 이것은 Dashboard가 아니라 보조 인터페이스**라는 점이 핵심.

```
┌─────────────────────────────────────────────────────────────┐
│ 💬 Chat (with AI, Kim's Restaurant context loaded)          │
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ Sessions (left sidebar)                                  ││
│ ├──────────────────────────────────────────────────────────┤│
│ │ ● Current: "Food cost variance investigation"            ││
│ │   └─ 4 messages                                          ││
│ │                                                           ││
│ │ ○ "Mar monthly close prep"                               ││
│ │   └─ 8 messages (archived)                               ││
│ │                                                           ││
│ │ ○ "Q1 payroll tax filing"                                ││
│ │   └─ 12 messages (archived)                              ││
│ │                                                           ││
│ │ [+ New Session]                                          ││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
│ Main Chat Area:                                              │
│ [Context loaded: Kim's Restaurant]                          │
│ [Files: 23 | Conversations: 47 | Team decisions: 12]       │
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ Jennifer: "Why did food cost jump 12% in March?"         ││
│ ├──────────────────────────────────────────────────────────┤│
│ │ AI: "Good question. I found three factors:               ││
│ │                                                           ││
│ │ 1. **Seasonal pattern**: Your restaurant always sees     ││
│ │    10-14% food cost variance in March (analyzed 2 years) ││
│ │                                                           ││
│ │ 2. **Invoice spike**: Two large ingredient orders        ││
│ │    (3/12: $8,500, 3/19: $7,200) suggest inventory       ││
│ │    buildup for spring catering season                    ││
│ │                                                           ││
│ │ 3. **Menu change**: You noted in Jan that new            ││
│ │    appetizer menu launched 3/15. That typically adds    ││
│ │    food cost (margin lower on new items).                ││
│ │                                                           ││
│ │ Recommendation: Monitor through April. If costs          ││
│ │ normalize by May, this is expected seasonality.          ││
│ │ If elevated beyond June, investigate supplier costs."    ││
│ │                                                           ││
│ │ Confidence: 87% (cross-checked with industry benchmarks)││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
│ Jennifer: "Actually, check the new supplier contract"      │
│                                                              │
│ AI: [Pulls from Knowledge Base]                             │
│     "Found: Lease agreement + supplier email 3/1.          ││
│      New supplier shows 15% higher prices for              ││
│      premium proteins. Would explain the $1,500 variance. ││
│                                                              ││
│      Suggestion: Negotiate bulk discounts next month       ││
│      or revert to prior supplier for standard items."      ││
│                                                              │
│ [Chat input: Jennifer types...]                            ││
│ > "Can you draft an email to the supplier asking about    ││
│   >                                                         ││
│ [✏️ AI can generate] [💾 Save as draft] [Send]            ││
└─────────────────────────────────────────────────────────────┘
```

**특징**:
- **이 클라이언트의 맥락이 자동으로 로드됨** — AI는 23개 파일, 47개 과거 대화, 12개 팀 결정을 이미 알고 있다
- 세션 기반: 여러 주제별 대화를 분리 추적 가능
- 이메일/문서 생성 시 AI가 초안을 제시

**중요 철학**: Chat은 "특정 클라이언트의 깊은 분석"이 필요할 때만 쓴다. "이 클라이언트 전체에서 무슨 일이 일어나고 있나?"는 Dashboard에서, "왜 이런 일이 일어났나?"는 Chat에서.

### 5.6 Knowledge Base 탭

이 클라이언트에 대해 팀이 축적한 지식.

```
┌─────────────────────────────────────────────────────────────┐
│ 📚 Knowledge Base                                            │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ Filter: All | Financial | Strategic | Relationship |    ││
│ │         Preference | Decision | AI Insight               ││
│ │ Sort: Recent | Pinned | Most used                        ││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
│ 📌 [Pinned — 항상 AI 시스템 프롬프트에 포함됨]              │
│                                                              │
│ ⭐ Owner's communication style: Data-driven, direct        │
│    Category: Preference | Created by: Jennifer | 1/15/26  │
│    Source: From chats with owner (inferred)                │
│    AI uses this: When generating reports, emphasize        │
│    numbers and ROI                                          │
│    [Edit] [Unpin] [Usage history]                         │
│                                                              │
│ ⭐ Seasonal pattern: Food cost increases 10-14% in Mar-Apr│
│    Category: Financial Pattern | Created by: AI | 2/28/26 │
│    Source: 24-month historical analysis                   │
│    AI uses this: When flagging anomalies, check seasonality│
│    [Edit] [Unpin] [Usage history]                         │
│                                                              │
│ ───────────────────────────────────────────────────────────│
│ [Not pinned — visible but not always in system prompt]    │
│                                                              │
│ ✓ New menu launch (3/15/26) — lower margin appetizers     │
│   Category: Strategic | Created by: Jennifer | 3/2/26     │
│   Source: Team meeting notes                               │
│   AI analysis: Food cost margin expected to drop 2-3%      │
│   [Pin] [Edit] [Archive]                                  │
│                                                              │
│ ✓ Current lease: $12,000/mo, expires 12/31/27             │
│   Category: Financial | Created by: Emily | 3/1/26        │
│   Source: Document upload (Lease agreement)                │
│   [Pin] [Edit] [Archive]                                  │
│                                                              │
│ ✓ Q1 Payroll responsibility: Owner (quarterly estimated)   │
│   Category: Relationship | Created by: Jennifer | 1/20/26 │
│   Source: Email communication                              │
│   [Pin] [Edit] [Archive]                                  │
│                                                              │
│ [Load more...]                                              │
└─────────────────────────────────────────────────────────────┘
```

**핵심 설계 원칙**:
- **Pinned 항목** = AI의 시스템 프롬프트에 자동 포함. 중요한 것만.
- **Unpinned 항목** = 레퍼런스로만 저장. AI가 필요시 검색.
- 누구나 항목 추가 가능 (팀의 지식 공유)

---

## 6. Approval Queue 상세 UX (가장 중요한 워크플로우)

Jennifer의 아침 대부분의 시간은 Approval Queue 처리에 소비된다. 이 부분의 설계가 제품의 핵심이다.

### 6.1 Approval Queue 화면 진입

Dashboard의 "Approval Queue (8 items)" 클릭 → 전체 화면 Approval Queue로 전환.

```
┌─────────────────────────────────────────────────────────────┐
│ 📋 Approval Queue (8 items pending)                          │
│                                                              │
│ Sort: Priority | Deadline | Age | Status | Confidence       │
│ Filter: All | Financial | Tax | Email | Reconciliation     │
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ 1. [URGENT] 🔴 Kim's - Mar Monthly Close (Confidence 94%)│
│ │    Deadline: TODAY (Apr 5) | Waiting: 3 hours            │
│ │    AI note: Food cost +12% (flagged)                     │
│ │                                                           │
│ │    [👁️ Preview] [✏️ Edit] [✅ Approve] [❌ Changes]     │
│ │    [💬 Comment]                                           │
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ 2. Medical - Q1 Tax Estimate (Confidence 88%)            │
│ │    Deadline: Apr 15 (10 days) | Waiting: 2 days         │
│ │    Generated by: AI | Status: Ready for review            │
│ │                                                           │
│ │    [👁️ Preview] [✏️ Edit] [✅ Approve] [❌ Changes]     │
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ 3. TechStart - Feb Reconciliation (Confidence 91%)       │
│ │    Deadline: Apr 3 (OVERDUE -2 days) | Emily's work      │
│ │    Generated by: Emily | Status: Pending review           │
│ │                                                           │
│ │    [👁️ Preview] [✏️ Edit] [✅ Approve] [❌ Changes]     │
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
│ ... (5 more items)                                           │
│                                                              │
│ Keyboard shortcuts: J=next, K=prev, P=preview, Y=approve   │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Preview 패널 열기

Jennifer가 첫 번째 항목의 "Preview" 클릭:

```
┌─────────────────────────────────────────────────────────────┐
│ 📋 Approval Queue              │ 👁️ Preview Panel            │
│                                │                            │
│ 1. [URGENT] Kim's Mar Close   │ KIM'S RESTAURANT            │
│    (highlighted, selected)     │ MARCH 2026 FINANCIAL STMT  │
│                                │                            │
│ 2. Medical - Q1 Tax...        │ ┌────────────────────────┐│
│                                │ │ P&L                    ││
│ 3. TechStart - Feb...         │ │                        ││
│                                │ │ Revenue      $160,500   ││
│ ...                            │ │ COGS         $58,200   ││
│                                │ │ Gross Profit $102,300  ││
│                                │ │                        ││
│                                │ │ Operating Exp $68,000  ││
│                                │ │ ⚠️ Food cost $52,000   ││
│                                │ │    (HIGH vs Feb)       ││
│                                │ │                        ││
│                                │ │ Interest     $890      ││
│                                │ │                        ││
│                                │ │ Net Income   $33,410   ││
│                                │ │ Margin:      20.8%      ││
│                                │ │                        ││
│                                │ │ [Balance Sheet] [Cash] ││
│                                │ └────────────────────────┘│
│                                │                            │
│                                │ AI ANNOTATIONS:            │
│                                │ "Food cost spike noted.    │
│                                │  Seasonality + new menu    │
│                                │  expected. Monitor next mo."│
│                                │                            │
│                                │ HIGHLIGHTS FOR REVIEW:     │
│                                │ • Food cost 12% ↑ (verify) │
│                                │ • Interest expense normal  │
│                                │ • Margin within historical │
│                                │  range (20-24%)           │
│                                │                            │
│                                │ [Full Editor] [Full Report]│
└─────────────────────────────────────────────────────────────┘
```

### 6.3 최종 결정

Jennifer가 Preview를 본 후 선택:

#### Option 1: Approve (즉시 승인)
```
[✅ Approve]
  → Status 변경: ✅ Approved
  → 자동으로 다음 항목으로 이동 (J 키 누른 것처럼)
  → 클라이언트에게 자동 발송할 수 있는 상태로 변경
```

#### Option 2: Edit (편집 후 승인)
```
[✏️ Edit]
  → 오른쪽 Preview 패널이 Full Editor로 전환
  → 스프레드시트 경량 에디터 열림
  → Jennifer가 "Food cost 수치" 수정 (예: $52,000 → $51,500)
  → 수정 완료 후 "✅ Approve & Save" 클릭
  → 에디터 닫힘, 자동으로 다음 항목
```

#### Option 3: Request Changes (Emily에게 돌려보내기)
```
[❌ Request Changes]
  → 피드백 모달 열림
  → Jennifer가 코멘트 작성: "Food cost가 너무 높게 나온 것 같습니다.
    supplier invoice를 다시 확인해 주시겠어요? 의심 거래: 3/12 $8,500"
  → "Send back to Emily" 클릭
  → 상태: ⏳ Changes Requested
  → Emily에게 알림 (Dashboard에 "Jennifer requested changes" 표시)
```

#### Option 4: Comment Only (진행하되 코멘트 남기기)
```
[💬 Comment]
  → Jennifer가 피드백 남김: "Looks good, but monitor food costs
    next month for normalization"
  → "Post comment" 클릭 → 코멘트 저장, 그대로 진행
  → 상태: ✅ Approved with Comments
  → Emily와 클라이언트도 코멘트 볼 수 있음
```

### 6.4 Batch Approve (효율성)

같은 종류의 여러 항목을 한번에 승인하는 기능:

```
Filter: [Reconciliation items only] → 3 items matching

┌──────────────────────────────────────────────────────┐
│ ✓ TechStart - Feb Reconciliation (Confidence 91%)   │
│ ✓ Medical - Feb Reconciliation (Confidence 93%)     │
│ ✓ Small Retail - Feb Reconciliation (Confidence 94%)│
│                                                      │
│ All high confidence (>90%). Same type.              │
│ [Batch Approve All 3]                              │
└──────────────────────────────────────────────────────┘

Jennifer clicks → 3개 모두 ✅ Approved로 변경
전체 Approval Queue 진행: 1-2분 만에 처리 완료
```

**중요**: Batch Approve는 낮은 위험 항목(reconciliation, routine close)에만 제안. 세무 문서나 이메일은 항상 개별 검토 권장.

---

## 7. 시나리오별 상세 UX

### 시나리오 1: Jennifer의 아침 출근 (08:30 AM)

**목표**: 30분 이내에 "이번 주 상황 파악" + "긴급 항목 처리"

**흐름**:
1. **08:30** 앱 열기 → 자동으로 Dashboard로 진입
2. **08:32** "Needs Attention (3)" 스캔:
   - Kim's Restaurant: unusual cash outflow $8,500 (flagged)
   - Medical Clinic: Q1 tax est. due in 3 days
   - TechStart: missing bank reconciliation (3 days overdue)
   - 스캔 완료: 2분
3. **08:35** "Approval Queue (8)" 진입 → Batch Approve 3개 (reconciliation) → 2분
4. **08:37** 나머지 5개 항목 개별 검토: 각 1.5분 × 5 = 7.5분
   - Edit 필요한 것 1개: Edit mode 진입 → 수정 → Approve (2분)
5. **08:47** Kim's Restaurant 이상 거래 확인 필요 → Chat 탭으로 진입
   - "unusual cash outflow 원인" Chat 물어보기 → AI 답변 (1분)
   - "Owner에게 확인해달라" → Email draft AI가 자동 생성 (1분)
6. **08:50** Jennifer가 이메일 preview 보고 승인 → 클라이언트에게 발송
7. **08:52** Weekly Overview 스캔 → "Monthly close 56% 진행, 이주 이대로면 완료 추정" 확인
8. **08:55** "AI Working Now" 보기 → "Scanning QB for month-end close 33% 진행" 확인 → 추적 필요 없음
9. **09:00** 완료. 다른 업무로 이동.

**총 소요 시간**: 30분
**이전 방식의 동일 작업 시간**: 90분 (수동으로 각 클라이언트 진입, Excel에서 데이터 정리 등)

---

### 시나리오 2: Approval Queue 상세 처리 (핵심 워크플로우)

**목표**: 8개 항목 검토/승인을 효율적으로 처리

**항목 1: Kim's Restaurant — Mar Monthly Close (높은 우선순위, 높은 신뢰도)**

```
Jennifer: [Preview] 클릭
→ 스프레드시트 프리뷰 보임 (90% 신뢰도)
→ Food cost $52,000 (12% ↑) 주목하지만, AI 주석에서 "seasonal + new menu" 설명 확인
→ 다른 항목 정상
→ [✅ Approve] 클릭
→ 상태: ✅ Approved
→ 자동으로 다음 항목으로 (J 키 같은 효과)
→ 시간: 2분
```

**항목 2: Medical Clinic — Q1 Tax Estimate (중간 우선순위, 중간 신뢰도)**

```
Jennifer: [Preview] 클릭
→ 세무 요약 문서 프리뷰
→ 항목들이 맞아 보이지만, "Estimated Quarterly Payment"에서 수치가 조금 높아 보임
→ [✏️ Edit] 클릭
→ 에디터 열림 (Google Sheets 경량 버전)
→ Jennifer가 "Estimated taxes" 한 셀을 선택 → 수치 수정 ($8,200 → $7,800)
→ [✅ Approve & Save] 클릭
→ 에디터 닫힘, 다음 항목으로
→ 시간: 3분
```

**항목 3-5: TechStart, Small Retail, Another Client — Reconciliation Items**

```
세 개 모두 Reconciliation (낮은 위험)
신뢰도 모두 90% 이상
Jennifer: [Batch Approve All 3] 클릭
→ 세 개 모두 ✅ Approved
→ 시간: 1분
```

**항목 6: StartUp Inc — Email Draft (중간 위험, AI 생성)**

```
Jennifer: [Preview] 클릭
→ 클라이언트에게 보낼 "월간 마감 완료" 이메일 초안 보임
→ AI가 draft 작성: "Dear [Client], Your February financial close is complete..."
→ Jennifer가 읽어보니 톤이 좋음
→ "send to client" 버튼 옆에 "with minor edits?" 버튼 있음
→ [✏️ Edit this email] 클릭 → 텍스트 에디터 열림
→ 두 문장 추가: "Please review the attached report. Questions?"
→ [Save & Send] 클릭
→ 이메일 자동 발송
→ 시간: 2분
```

**항목 7: Another Client — Commission Calculation**

```
Jennifer: [Preview] 클릭
→ 스프레드시트 프리뷰 → 복잡해 보임 (commission 계산)
→ AI 신뢰도 82% (중간)
→ Jennifer가 몇 개 셀을 확인해보고 싶음
→ [✏️ Edit] 클릭 → 전체 에디터로 진입
→ 수식 확인 (D2 셀에 commission 계산 공식)
→ 맞아 보임
→ [✅ Approve] 클릭
→ 시간: 3분
```

**항목 8: Yet Another Client — Email Reminder (낮은 위험)**

```
Jennifer: [Preview] 클릭
→ "quarterly tax payment due 4/15" 리마인더 이메일
→ 표준 템플릿, 맞아 보임
→ [✅ Approve] 클릭
→ 시간: 1분
```

**전체 Approval Queue 처리 시간**: 약 15분

---

### 시나리오 3: 이상 감지 대응 (Needs Attention)

**상황**: Jennifer가 Dashboard의 "Needs Attention" 섹션에서 "Kim's Restaurant: unusual cash outflow $8,500" 발견

**흐름**:

1. **Dashboard에서 관찰**
   ```
   ⚠️ NEEDS ATTENTION
   Kim's Restaurant: Unusual cash outflow $8,500 (unusual for Tue, avg $2,100)
   Confidence: 94% | Time detected: 3 hours ago
   ```

2. **"View Details" 클릭** → 해당 거래의 상세 정보 팝업:
   ```
   Transaction Details:
   Date: 3/27/2026 (Tuesday)
   Amount: $8,500
   Category: Disbursement
   Description: "Supplier payment" (from QB)
   Account: Checking

   AI Analysis:
   "This transaction is 4x your average Tuesday disbursement ($2,100).
   Pattern check: Tuesdays typically range $1,800-2,500.
   Possible explanations:
   1. Bulk payment (month-end supplier settlement) — 68% likely
   2. Equipment purchase — 22% likely
   3. Data entry error — 8% likely

   Recommendation: Verify with owner. Check invoice/PO."
   ```

3. **"Open Client Workspace" 클릭** → Kim's Restaurant 워크스페이스로 진입

4. **Chat 탭으로 진입**:
   ```
   Jennifer: "@AI, about that $8,500 transaction on 3/27 — can you check
             if there's a corresponding supplier invoice or PO?"

   AI: [Searches Knowledge Base + uploaded documents]
       "Found: 3/27 email from supplier with invoice #SUP-2847 for $8,500
       (bulk ingredient order + month-end settlement).
       This is consistent with a supplier reconciliation payment.
       Risk: Low. Your notes from 2 weeks ago mentioned anticipated
       bulk orders for spring catering prep."

   Jennifer: "Got it. It's normal then. Tag this as resolved?"

   AI: [Updates status in system]
       "Marked as ✅ Reviewed & Resolved.
        Pattern: Regular month-end supplier payments (identified 6 instances
        in 12 months, all $6K-10K). Future similar payments: lower confidence
        threshold to 70%."
   ```

5. **AI가 패턴 학습**:
   - "Kim's Restaurant의 월말 supplier payment는 정상"이라는 패턴 추가
   - Knowledge Base에 자동 기록: "Seasonal bulk supplier payments expected last week of month"
   - 다음 달에 유사한 거래가 오면, 자동으로 "expected pattern" 표시

---

### 시나리오 4: Emily의 워크플로우 (Staff Accountant)

**Emily의 하루 08:00 AM**:

1. **앱 열기** → Dashboard 진입 (Emily는 자신의 대시보드 뷰)
   ```
   Emily's Dashboard (담당 40 clients)

   ⚠️ NEEDS ATTENTION (2)
   • TechStart: missing Feb bank reconciliation (3 days overdue)
   • Small Retail: unusual inventory adjustment

   📋 APPROVAL QUEUE (0)
   [Emily는 자신이 생성한 항목들이 여기에 나타나지 않음.
    대신 Jennifer의 검토를 기다리는 상태]

   🔄 AI WORKING NOW (3)
   • Reconciling TechStart Feb bank feed (7/8 matched)
   • Generating Small Retail Feb P&L
   • Scanning Emily's 40 clients for overdue items

   📊 WEEKLY OVERVIEW
   Emily's assigned: 40 clients
   Monthly close status: 12/40 ready (30%), 15/40 in progress, 13/40 pending docs
   Team capacity: Emily 40% (on track), Jennifer 53%
   ```

2. **TechStart 클라이언트로 진입** → Overview 탭
   ```
   "Feb bank reconciliation: missing for 3 days"
   AI가 이미 draft reconciliation 준비함 (88% confidence)

   Emily: [Preview] 클릭 → AI가 준비한 reconciliation 보임
   → 몇 개 거래 확인
   → [✅ Approve] 클릭

   상태: "Reconciliation ready for Jennifer's final review"
   자동으로 Jennifer의 Approval Queue에 나타남 (우선순위: 높음, overdue)
   ```

3. **Small Retail 클라이언트로 진입** → Chat
   ```
   Emily: "I see an unusual inventory adjustment. Can you flag why?"

   AI: "Found: Your 3/26 QB entry shows $2,400 inventory write-down.
        Cross-check: No invoice or PO for this write-down.

        Likely scenarios:
        1. Damaged goods (damaged during delivery)
        2. Vendor credit (not yet recorded)
        3. Data entry error

        Recommendation: Check with owner before finalizing."

   Emily: "I'll call them. Meanwhile, can you draft a status update email?"

   AI: [Generates email draft]
       "Hi [Owner], We're finalizing February close.
        I noticed an inventory adjustment on 3/26.
        Can you confirm if this was for damaged goods or vendor credit?
        Let me know so we can properly record it."

   Emily: [Preview] → [✏️ Edit] → Customize tone → [Send]
   ```

4. **다음 클라이언트로 진입** → 반복
   ```
   AI가 이미 reconciliation 초안 준비했음 (Food Service 클라이언트)
   → Jennifer가 과거에 이 종류 클라이언트에서 한 수정 패턴 있음
   → AI가 자동으로 Jennifer의 패턴 적용해서 초안 생성

   Emily: [Preview] → 매우 깔끔함 (AI가 이미 Jennifer 스타일 적용)
   → [✅ Approve] 클릭
   → 자동으로 Jennifer의 Approval Queue로 이동 (우선순위: 낮음, 이미 검증됨)
   ```

5. **10:30 AM** — Jennifer의 피드백 받음
   ```
   Dashboard: "Jennifer requested changes on TechStart reconciliation"

   Emily: 해당 항목으로 진입 → Jennifer의 코멘트:
   "Account #2850 is missing a payment. Looks like it should be $500
    but shows $0. Can you verify QB export?"

   Emily: QB 확인 → "Oh, I see. Missing Feb payment. Let me correct it."
   → 수정 → "Re-submit to Jennifer"

   자동으로 Jennifer의 Approval Queue 최상단으로 (urgent, resubmitted)
   ```

---

### 시나리오 5: 맥락 전환 (Context Switching) — Jennifer가 여러 클라이언트 오갈 때

**상황**: Jennifer가 Kim's Restaurant에서 작업 중 → Medical Clinic의 긴급 이슈 발생 → 다시 돌아옴

**흐름**:

1. **Kim's Restaurant 클라이언트 워크스페이스에서 작업 중**:
   ```
   [🟠 Kim's Restaurant]
   Chat 탭에서 Emily와 대화 중
   "Food cost spike 원인 파악 중"
   Chat 스크롤: 10개 메시지
   우측 Preview: 스프레드시트 열려있음
   ```

2. **긴급 알림 수신**: 🔔 알림 배너
   ```
   "Medical Clinic: Q1 tax est. due TOMORROW (was supposed to be 4/15).
    Need your approval now."
   ```

3. **Medical Clinic으로 전환**: Global Sidebar에서 "Medical Clinic" 클릭
   ```
   [Transition Animation: 200ms fade]
   색상: 🟠 (Kim's) → 🟢 (Medical)

   [복귀 Breadcrumb 표시 (10초 유지 후 fade)]
   "← Kim's Restaurant (was reviewing food cost)"

   Medical Clinic 워크스페이스로 진입
   Chat 탭에서 상태 그대로 보존 (만약 열려있던 세션이 있으면)
   ```

4. **Medical Clinic 업무 처리** (5분)
   ```
   Approval Queue에서 "Q1 Tax Estimate" 항목 찾음
   Preview → Approve or Edit
   완료
   ```

5. **Kim's Restaurant로 복귀**: Breadcrumb "← Kim's Restaurant" 클릭
   ```
   [Transition Animation: 200ms fade]
   색상: 🟢 (Medical) → 🟠 (Kim's)

   Chat 탭 복귀
   스크롤 위치: 그대로 (Jennifer가 떠난 곳)
   Preview 패널: 그대로 열려있음
   대화: 그대로 ("Food cost spike..." 메시지)

   Jennifer가 마지막으로 본 메시지부터 계속 읽을 수 있음
   ```

**빠른 전환** (파워유저):
- **Cmd+J** → 최근 클라이언트 리스트 (1줄 맥락 요약)
  ```
  🟠 Kim's Restaurant — reviewing food cost spike
  🟢 Medical Clinic — approved Q1 tax est.
  🔵 TechStart — awaiting Feb reconciliation
  ```
- 타이핑으로 필터 → Enter로 즉시 전환 (1초 미만)

---

## 8. 지식 축적 (Knowledge Base) — AI가 팀에서 학습

### 지식 유입의 5개 채널

| 채널 | 방식 | 자동화 | 예시 |
|------|------|--------|------|
| **문서 업로드** | 파싱 → 인덱싱 → AI 컨텍스트에 자동 추가 | 자동 | 세금 신고서 업로드 → AI가 양식 파악 |
| **대화 추출** | AI가 결정/사실 제안 → 팀원 수락/거부 | 반자동 | Chat에서 "Owner는 data-driven" 발언 → AI 자동 Knowledge 제안 |
| **문서 분석** | 생성/검토 시 핵심 지표/패턴/이상치 자동 추출 | 반자동 | 재무제표 검토 → "Food cost 계절성 패턴" 자동 제안 |
| **수동 입력** | 팀원이 직접 Knowledge Base에 추가 | 수동 | Jennifer가 "Q1은 항상 현금 유동성 긴장" 수동 기록 |
| **AI 선제 인사이트** | 주기적 분석 → 트렌드/연결고리 자동 발견 | 자동 | AI가 6개월 데이터 분석 → "3개 식당 고객에서 동일 supplier cost 패턴" |

### 지식의 성장 곡선 (Jennifer의 팜에 AI 도입 후)

**Day 1**:
- 정보: 회사명, 산업, 기본 재무 지표만
- AI의 맥락 창: 매우 제한적
- 신뢰도: 낮음

**Week 1**:
- 누적 지식: 20-30개 항목
- 파일: 업로드된 세무 신고서, 계약서
- 결정: "Food cost는 항상 40-45% range" (주요 음식점 고객)
- AI의 맥락 창: "최근 주간 활동" 참조 가능
- 신뢰도: 중간

**Month 1**:
- 누적 지식: 100+ 항목
- 패턴 학습: Jennifer의 결정 반복성 식별 ("식당 고객의 비용 분류는 항상 같은 방식")
- AI의 맥락 창: "역사적 패턴, 고객별 선호도, 팀 결정" 모두 참조
- 신뢰도: 높음 (91-95%)

**Month 3-6**:
- 누적 지식: 300+ 항목
- 자동화: Jennifer의 승인이 충분하면, AI가 유사 패턴 자동 적용 제안
- AI의 초안: "최소 편집만으로" 수용 가능 (80%+ 신뢰도)
- 신뢰도: 매우 높음 (94-98%)

**Month 6+**:
- AI는 Jennifer의 "가상 어시스턴트" 역할
- 보드 덱 초안: Jennifer의 선호도/전략 맥락 모두 파악 → "최소 편집"만으로 발송 가능
- 재무제표: 산업별 템플릿 + 과거 패턴 → 자동 생성 신뢰도 95%+

### 핵심 설계 원칙: 지식은 기본적으로 공유

```
개인 프라이버시 vs 팀 지식의 균형:
┌─────────────────────────────────────────────────────────┐
│ Emily's 개인 Chat 세션 (Kim's Restaurant)              │
│ └─ 개인 프라이버시: Jennifer도 읽을 수 없음             │
│                                                          │
│ 하지만...                                                 │
│                                                          │
│ 추출된 사실 (Emily가 승인 후)                            │
│ "Kim's Restaurant: Owner는 숫자 중심, 직설적 소통"       │
│ └─ Knowledge Base (공유 팀 지식)                        │
│    └─ Jennifer도 볼 수 있고, AI도 참조 가능            │
└─────────────────────────────────────────────────────────┘
```

**이유**: 만약 Emily가 퇴사하면, Emily의 개인 Chat 세션은 삭제되지만, 공유 Knowledge Base의 지식은 영구 보존. 회계펌의 맥락이 사람에게 속하지 않고 회사에 속해야 함.

---

## 9. 권한 모델 (Multi-level Approval)

### 역할 정의

| 역할 | 볼 수 있는 것 | 할 수 있는 것 | Approval 권한 |
|------|-------------|-----------|--------------|
| **Owner (Jennifer)** | 모든 워크스페이스, 모든 팀 활동, 전체 Dashboard | 모든 CRUD, 팀 관리, 펌 설정 | 최종 승인 권한 (모든 항목) |
| **Senior Staff (Emily)** | 배정된 40 클라이언트 + 팀 활동 | 생성/편집/제출, 팀 Chat 참여 | 자신의 생성물은 Review만 (Jennifer 승인 필요) |
| **Junior Staff** (향후) | 배정된 클라이언트만, 읽기/제한된 편집 | 제한된 CRUD (Jennifer 사전 승인 필요) | 승인 권한 없음 |

### 승인 체인 (Two-level Approval)

**세나리오**:

```
1단계: AI가 산출물 자동 생성
  ↓
2단계: Emily가 검토 + 제출 (✏️ Edit if needed → "Submit for Review")
  ↓
3단계: Jennifer가 최종 검토 + 승인 (Approval Queue에서)
  ↓
4단계: 클라이언트에게 발송 또는 파일 시스템 저장
```

**일반 항목 (Reconciliation, 낮은 위험)**:
```
AI 생성 → Emily 검토 (2분) → Jennifer 승인 (30초) → 발송
```

**복잡한 항목 (세무 신고, 높은 위험)**:
```
AI 생성 → Emily 상세 검토 (10분) → Jennifer 상세 검토 (5분) → 발송
```

---

## 10. 데이터 격리 (Non-Negotiable)

120개 클라이언트를 관리하면서도 각 클라이언트는 완전히 격리됨:

### 격리 보장

1. **AI 맥락 분리**: Kim's Restaurant AI가 Medical Clinic 데이터를 **절대** 참조하지 않음
2. **검색 결과 분리**: Kim's Restaurant에서 검색하면 해당 클라이언트 결과만 반환
3. **Global Search (Cmd+K)**: 전사 검색은 가능하지만, 결과가 어느 클라이언트에 속하는지 명시, 진입 후에만 상호작용 가능
4. **Cross-client Insight**: Phase 2에서만 추가 (명시적 팀 동의 필요)

### 구현

```
모든 DB 쿼리:
WHERE clientId = [current_client_id] AND companyId = [jennifer_company_id]

모든 AI 호출:
System prompt에 "클라이언트 ID와 데이터"만 포함, 다른 클라이언트 정보 제외

파일 경로:
/storage/companies/[company_id]/clients/[client_id]/files/
```

---

## 11. 핵심 UX 혁신 요약

### 기존 vs 새로운

| 관점 | 기존 (Chat-centric) | 새로운 (Command Center) |
|------|-------------------|----------------------|
| **기본 뷰** | Chat 인터페이스 | AI Agent Dashboard |
| **사용자 경험** | "AI, 이거 해줘" (반응형) | "AI가 밤새 이것들 준비했어" (능동형) |
| **주요 상호작용** | Chat 메시지 | Approval Queue (review + approve) |
| **시간 절약** | 10-15% (자동화 규칙) | 50-70% (AI 자율 감지 + 준비) |
| **팀 협업** | 채널 기반 토론 | Dashboard 중심 + 심층은 Chat |
| **지식 축적** | 대화 히스토리 | Structured Knowledge Base |

### 세 가지 차별화 포인트

1. **Agent-First Dashboard**
   - "지금 무엇이 중요한가"가 먼저 보임
   - Chat은 심층 분석용 보조 도구
   - Linear/Superhuman 스타일의 triage + review 흐름

2. **Approval Queue as Core Workflow**
   - Superhuman(이메일)의 review 패턴을 회계에 적용
   - 2-3분 안에 산출물 검토 가능
   - 키보드 단축키로 극도로 빠른 처리

3. **Progressive Trust + Pattern Learning**
   - AI는 처음에는 보수적 (모든 결정에 승인 요청)
   - 사용자 검증으로 신뢰도 증가
   - 충분히 검증된 패턴은 자동 적용 (Jennifer 승인 없이)

---

## 12. 기술 아키텍처 임플리케이션

### Backend Support Required

```
[Background Agent Layer]
├── QB Scanner: 6시간마다 120 클라이언트 폴링
├── Close Prep Agent: 마감 일정 접근 시 재무제표 초안 자동 생성
├── Tax Tracker: 세무 마감 추적 + 리마인더 준비
└── Pattern Learner: 사용자 승인 패턴 분석 → 자동 규칙 생성

[Notification System]
├── Dashboard alert (인앱 푸시)
├── Email summary (아침 8:30, 주간 정리)
└── SMS (긴급 알림 only)

[Approval Queue Engine]
├── Priority scoring (deadline, severity, confidence)
├── Batch approval logic
└── Audit trail logging (규제 대응)

[Knowledge Graph]
├── 클라이언트별 지식 저장소
├── Semantic search + keyword search
└── Auto-extraction from conversations/documents
```

---

*이 설계는 "컨설턴트용 ChatGPT" 또는 "회계 업무용 Copilot"이 아닌, **AI-Native Agent 패러다임의 회계펌 전문 솔루션**을 지향합니다.*

*차별화는 AI 자체가 아니라, AI를 유용하게 만드는 **맥락 아키텍처, 승인 게이트, 지식 축적 시스템**에 있습니다.*
