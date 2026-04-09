# 사용자 시나리오: 제품이 실제로 동작하는 모습

> 목적: "이 제품이 실제로 어떻게 생겼고, 어떤 순간에 어떻게 사용되는가"를 구체적으로 상상하기 위한 문서
> 기존 PRD의 기능 스펙을 보완하는, 체험 중심의 시나리오
>
> 대상 사용자: 미국 소규모 회계/세무/기록(Accounting/Tax/Bookkeeping) 전문 회사 (2-10명, 50-200 클라이언트)

---

## 페르소나

### 제니퍼 박 (Jennifer Park)
- **역할**: 6인 회계 회사 Managing Partner
- **클라이언트**: 120개 회사
- **도구**: QuickBooks Online, TaxDome, Drake Tax Software
- **주요 과제**: 월간 마감(monthly close) 때 12시간 이상 소요, 세무 시즌(1월-4월) 때 팀이 과부하
- **구성원**: 자신 + Senior Accountant 2명 + Junior Accountant 1명 + 행정 지원 2명

### 데이비드 응우옌 (David Nguyen)
- **역할**: 3인 부기/세무 회사 Owner
- **클라이언트**: 85개 회사 (소상공인 중심)
- **도구**: QuickBooks Desktop, Drake Tax, 이메일 (TaxDome 미사용)
- **주요 과제**: 세무 시즌 때 문서 수집 관리, 각 클라이언트별 상이한 요청사항 추적
- **구성원**: 자신 + Part-time Bookkeeper 2명

---

## 제품의 물리적 구조: 사용자가 보는 화면

### 메인 화면 레이아웃: AI-Native Command Center

```
┌────────────────────────────────────────────────────────────────────────────┐
│  [로고] Fractional AI Command Center     [Jennifer Park] [설정] [?]        │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  📊 AI 에이전트 활동 요약 (지난 밤)                                        │
│  ──────────────────────────────────────────────────────────────────────   │
│  ⚠️ 이상 거래 발견: 2건  │ 📋 준비된 산출물: 8건  │ 📧 발송 대기: 3건     │
│                                                                            │
├──────────────┬────────────────────────────────────────────────────────────┤
│              │                                                            │
│  CLIENTS     │  📋 이번 주 워크플로우 (AI 관리 중)                        │
│  (120)       │  ────────────────────────────────────────────────       │
│              │                                                            │
│  🔍 검색     │  ✅ Kim's Restaurant — 3월 마감 완료 (AI 준비)           │
│  [필터]      │     📄 재무제표, 고객 통신문, 세무 요약 준비됨             │
│              │     → Jennifer 검토 & 승인 대기                          │
│              │                                                            │
│  🟢 Kim's    │  🔄 TechStart Inc. — 3월 재무제표 생성 중                │
│     Restaurant        │     은행조정 이상 자동 감지 (검토 필요)              │
│  🟢 TechStart       │                                                    │
│     Inc.            │  ⏳ Downtown Medical — QB 데이터 대기               │
│  ⚪ Downtown        │     (직원 서류 제출 필요)                           │
│     Medical         │     → 자동 리마인더 메일 준비됨                    │
│  ⚪ Sunset Realty   │                                                    │
│  ⚪ Harbor Coffee   │  ⚠️ ABC Mfg. — 이상 거래 발견                      │
│  ⚪ Green          │     (미분류 $8,500, 비정상 금액)                    │
│     Consulting     │     → Jennifer 검토 필요                           │
│  ⚪ Main St        │                                                    │
│     Dental         │  🎯 나머지 8개 클라이언트 — 준비 완료                │
│  ⚪ Acme           │     (주간 마감 일정에 따라 자동 추적 중)              │
│     Logistics      │                                                    │
│  ... (더보기)      │                                                    │
│                   │  ┌──────────────────────────────────────────────┐ │
│                   │  │ 💬 특정 클라이언트와 깊이 있는 대화가 필요하면  │ │
│                   │  │    [채팅 인터페이스로 전환]                  │ │
│                   │  └──────────────────────────────────────────────┘ │
│  ──────────────   │                                                    │
│  월별 마감 대시판  │                                                    │
│  📊 전체 진행률   │                                                    │
│     72% (완료)    │                                                    │
│     61건/85건     │                                                    │
│                   │                                                    │
│  ──────────────   │                                                    │
│  AI가 밤새 한 일   │                                                    │
│  📈 데이터 스캔    │                                                    │
│     200개 클라이언트 │                                                    │
│     3시간 소요     │                                                    │
│  🚨 이상 거래 감지 │                                                    │
│  📝 산출물 준비    │                                                    │
│  📧 리마인더 작성  │                                                    │
│                   │                                                    │
└───────────────┴────────────────────────────────────────────────────────┘
```

**핵심 구조 (AI-Native Agent 패러다임)**:

이 제품은 **"채팅을 보조 인터페이스로 하는 Command Center 대시보드"** 입니다. 핵심은 **AI가 먼저 행동하고 사용자는 검증한다**는 AI-Native Agent 철학입니다.

- **상단 (명시적 요약)**: 밤새 AI가 발견한 이상, 준비한 산출물, 발송 대기 이메일의 카운트
- **중앙 (주 인터페이스)**: 이번 주 워크플로우 — 각 클라이언트의 상태를 한눈에 보고, AI가 이미 준비한 것들을 표시
- **왼쪽 사이드바**: 클라이언트 목록 (검색/필터) + AI가 밤새 한 일 (데이터 스캔, 이상 감지, 산출물 준비, 리마인더 작성)
- **채팅 (보조 인터페이스)**: 특정 클라이언트와 깊이 있는 대화가 필요할 때만 사용

**사용자 경험의 근본적 변화**:

| 기존 (AI-Assisted) | 새로운 (AI-Native Agent) |
|---|---|
| 사용자: "마감 리스트 만들어줘" → AI: "준비 완료" 응답 | 사용자: 로그인 → AI가 이미 8개 준비 완료된 산출물 보임 |
| 사용자가 주도, AI가 반응 | AI가 주도, 사용자가 검증 |
| 사용자가 각 고객마다 요청을 반복 | AI가 모든 클라이언트를 동시에 자동 처리 |

---

---

## 시나리오 1: 첫 사용 — "새 클라이언트 온보딩"

### 상황
Jennifer는 이번 달 새로운 식당 고객(Kim's Restaurant)을 확보했습니다. 월간 부기와 분기별 세무 신고를 담당하게 됩니다. 이 고객의 정보를 Command Center에 등록하고 QuickBooks를 연동하려 합니다.

### 흐름

**Step 1: 클라이언트 프로필 생성**

사이드바 [+ 새 클라이언트] 버튼을 클릭합니다.

```
┌─────────────────────────────────────────────────────┐
│  새 클라이언트 프로필 생성                             │
│                                                     │
│  회사명: [Kim's Restaurant                    ]     │
│  산업: [Food & Beverage       ▾]                   │
│  내 서비스: [☑ 월간 부기 ☑ 분기 세무 ☐ 급여]        │
│  고객 유형: [○ 개인사업자 ● C-Corp ○ S-Corp ○ LLC] │
│  계약 시작일: [2026-04-01]                         │
│                                                     │
│  ──── 선호 설정 (선택) ────                         │
│  보고서 톤: [○ 기술적 ● 실용적 ○ 간략]              │
│  선호 포맷: [☑ Excel ☑ Word ☐ PDF]                │
│  주요 연락처: [Kim Lee: kim@kimrestaurant.com]    │
│  회계사 담당: [Jennifer Park (자신)]              │
│                                                     │
│  [취소]                              [생성]         │
└─────────────────────────────────────────────────────┘
```

**Step 2: QuickBooks 데이터 연동**

클라이언트 프로필이 생성되면, AI가 온보딩 가이드를 표시합니다.

```
AI: Kim's Restaurant 워크스페이스가 생성되었습니다!

    더 정확한 지원을 위해 QuickBooks를 연동해주세요:

    [QuickBooks Online 연동]  (또는 수동 업로드)

    AI가 인식할 정보:
    - Chart of Accounts 구조
    - 최근 12개월 거래 내역
    - P&L, Balance Sheet
    - 미결제 송장과 청구서
```

Jennifer가 [QuickBooks Online 연동] 버튼을 클릭하면, OAuth 인증 플로우를 통해 Kim's Restaurant의 QuickBooks 계정이 연동됩니다. (Jennifer는 Kim의 QBO 계정에 "Accountant" 권한으로 접근 중)

**Step 3: AI가 자동으로 초기 데이터 분석**

QuickBooks 연동 후 몇 초 이내:

```
AI: QuickBooks 데이터를 분석했습니다! 🎯

    Kim's Restaurant 프로필 자동 요약:

    📊 재무 현황
    - 2026년 3월 월간 매출: $28,400 (2월 대비 +12%)
    - COGS (음식비): $8,832 (31.2% of sales)
    - 급여비: $9,200 (32.4% of sales)
    - 순이익: $4,156 (14.6% 마진)

    🔍 주요 메트릭 (식당 산업 기준)
    - Food Cost Ratio: 31.2% (업계 평균 28-30% ⚠️ 약간 높음)
    - Labor Cost: 32.4% (업계 평균 30-33% ✓ 양호)
    - Days Payable Outstanding: 22일 (업계 평균 15-20일)

    ⚠️ 주의사항
    - 미지급 공급업체: $6,200 (2월 이상 미지불)
    - 미수금: $4,200 (고객 부실 가능성 검토)

    다음 단계:
    1. Bank reconciliation 완료 확인
    2. 분류되지 않은 거래 $1,200 검토
    3. 월간 마감 일정 확인 (보통 매월 5일)

    준비되면 "첫 번째 월간 마감 시작" 이라고 말씀해주세요.
```

**Step 4: 다음 날 아침 — AI가 밤새 무엇을 했는가?**

다음 날 Jennifer가 출근하면:

```
알림: Kim's Restaurant에 새로운 거래 분석이 준비되었습니다.

    📊 자동 분석 리포트:
    - 지난 밤 QB 데이터 스캔 완료
    - 새로 추가된 거래: 127건 분류 완료
    - 이상 거래 발견: 없음 ✓
    - 다음 주 마감 준비: 자동으로 준비 중
    - 예상 마감일: 4월 5일 (3일 남음)

    다음 단계: 자동으로 준비될 때까지 기다리거나, 
             지금 바로 첫 번째 월간 마감을 시작하세요.
```

**"아하" 순간 (Aha Moment) — AI-Native Agent**:

- **기존 방식**: Jennifer가 새 고객을 등록 → 수동으로 QB에서 데이터 분석 → 2시간 소요
- **새로운 방식**: Jennifer가 새 고객을 등록 → AI가 밤새 자동 분석 → 다음 날 아침 완전히 준비된 상태로 시작

핵심: **Jennifer가 온보딩 후 퇴근하면, AI가 그 밤 200개 클라이언트 중 이 신규 고객의 데이터를 스캔하고, 초기 분류를 완료하고, 다음 주 마감을 준비**합니다.

---

## 시나리오 2: 일상 업무 — "월간 마감 워크플로우"

### 상황
4월 1일 월요일 아침. Jennifer의 스케줄:
- 이번 주에 12개 고객의 월간 마감(March close)을 완료해야 함
- **기존 방식**: 각 고객마다 2시간 소요 (총 24시간)
- **새로운 방식**: AI가 밤새 8개 클라이언트의 마감 산출물을 완성해두었으므로, Jennifer는 검토 & 승인만 하면 됨 (클라이언트당 15분, 총 2시간)

### 핵심 변화: "사용자가 요청 → AI 생성" 에서 "AI가 준비 → 사용자 검증" 로

### 흐름

**Morning 8:30 AM — "아침 대시보드 확인" — AI의 밤새 준비 결과**

Jennifer가 Command Center를 열었을 때 첫 화면:

```
┌────────────────────────────────────────────────────────────────────────┐
│ 📊 AI 에이전트 활동 요약 (밤 10PM ~ 아침 8AM)                         │
│ ─────────────────────────────────────────────────────────────────────│
│                                                                       │
│ ✅ 완료된 작업:                                                       │
│  🏪 Kim's Restaurant — 3월 마감 완료 (재무제표, 고객 통신문)        │
│  💼 TechStart Inc. — 3월 재무제표 준비 (미은행조정 1건 검토 필요)  │
│  🏥 Downtown Medical — 월급 정산 준비 (직원 서류 1건 대기)          │
│  ☕ Harbor Coffee — 3월 마감 완료                                  │
│  🏢 Green Consulting — 3월 재무제표 & 청구서 분석 완료            │
│                                                                       │
│ ⚠️ 주의 필요:                                                        │
│  🏭 ABC Mfg. — 이상 거래 발견 (미분류 $8,500) → 검토 필요         │
│  📋 3개 클라이언트 — QB 데이터 아직 동기 안 됨 → 리마인더 발송 준비  │
│                                                                       │
│ 📈 진행 현황:                                                        │
│  • 이번 주 12개 마감 중 → AI가 8개 준비 완료                       │
│  • 4개 클라이언트는 QB 데이터 대기 (자동 리마인더 발송)             │
│  • 전체 진행률: 67% (8/12)                                         │
│                                                                       │
│ 💬 AI가 다음을 준비했습니다:                                         │
│  📄 8개 재무제표 (Word .docx)                                       │
│  📧 8개 고객 통신문 (Jennifer 검토 후 발송)                        │
│  📝 4개 자동 리마인더 이메일 (Jennifer 승인 후 발송)               │
│  ⚠️ 1개 이상 거래 알림 (Jennifer 검토 필요)                       │
│                                                                       │
└────────────────────────────────────────────────────────────────────┘
```

**아침 주요 변화**:
- **기존**: "이번 주 12개를 해야 한다" 상태에서 시작
- **새로운**: "8개는 이미 준비됐으니 검토만 하고, 4개는 데이터 기다리는 중" 상태에서 시작

**9:00 AM — "첫 번째 고객: Kim's Restaurant — 검토 & 승인"**

Jennifer가 사이드바에서 "Kim's Restaurant"를 클릭합니다. AI가 이미 준비해둔 마감 데이터가 표시됩니다:

```
┌────────────────────────────────────────────────────────────────┐
│ Kim's Restaurant — 3월 마감 ✅ (AI가 이미 준비 완료)          │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ 맥락 카드:                                                     │
│ 🏪 식당 | 월매출: $28.4K | COGS: 31.2% | 종업원 8명         │
│ 마지막 조정: 2026-03-25 | QB 동기됨: 방금 | 미수금: $4.2K    │
│                                                                │
│ ────────────────────────────────────────────────────────────│
│                                                                │
│ AI 준비 완료 항목:                                             │
│ ✅ Bank reconciliation — 완료 (차액 $0)                      │
│ ✅ Credit card reconciliation — 완료 (차액 $0)               │
│ ✅ Accounts receivable aging — 완료 ($4.2K, 30일 이상)      │
│ ✅ Accounts payable aging — 완료 ($6.2K)                    │
│ ✅ Inventory adjustment (식자재 재고) — AI 계산 완료         │
│ ✅ Fixed asset depreciation — AI 계산 완료                  │
│ ✅ Accrued payroll (미지급 급여) — AI 계산 완료             │
│                                                                │
│ 📄 생성된 문서 (검토 대기):                                   │
│ • kim_march_2026_P&L.docx (완료)                            │
│ • kim_march_2026_balance_sheet.docx (완료)                 │
│ • kim_client_communication.docx (완료)                      │
│                                                                │
│ Jennifer의 다음 단계:                                         │
│ [문서 검토]  [고객 통신문 검토]  [마감 승인]  [발송]         │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**9:05 AM — "재무제표 검토" (AI가 이미 생성함)**

Jennifer가 "[문서 검토]"를 클릭하면:

```
AI가 준비한 3월 월간재무제표를 표시합니다. 📄

    파일: [kim_march_2026_financial_statements.docx] ✅ 완료

    포함 내용:
    - Profit & Loss Statement (수익, 비용, 순이익)
    - Balance Sheet (자산, 부채, 자본금)
    - 관리자 요약 (1페이지)
    - Month-over-Month 비교
    - Industry Benchmark 비교 (Food & Beverage)

    주요 포인트:
    • 순이익: $4,156 (마진율 14.6%)
    • 식비(COGS) 분석: $8,832 (31.2%)
      - 고기/해산물: $3,100 (업계 평균 $2,950) ⚠️
      - 야채/기타: $2,800 (양호)
      - 음료: $2,932 (양호)

    AI 분석 & 추천:
    → 고기 공급업체와 단가 재협상 검토
    → 에너지 비용 $2,100은 2월 $1,900 대비 +10%
       (계절 영향인지, 누수 가능성 검토)

    ✓ 이 문서는 Kim과의 대화에서 이미 논의한 내용이 포함되어 있습니다.
```

Jennifer는 문서를 빠르게 검토합니다. 고기 비용이 높은 것은 이미 AI가 지적했고, 자신도 동의합니다. 메모 하나 추가: "Kim과 다음 주 공급업체 협상 도와주기" → "[검토 완료]" 클릭

**9:15 AM — "고객 통신문 검토" (AI가 이미 생성함)**

```
AI가 준비한 Kim's Restaurant 고객 통신문을 표시합니다.

────────────────────────────────────────────────────────

Dear Kim,

Your March 2026 financial statements are ready for review.

Key Highlights:
• Revenue: $28,400 (up 12% from February)
• Gross Margin: 68.8% (good performance)
• Net Income: $4,156 (14.6% profit margin)

Areas to Watch:
• Food Cost at 31.2% — slightly above industry average
  of 30%. We recommend reviewing supplier pricing.
• Energy costs increased 10% month-over-month.
  Please check for any equipment malfunctions.

Attached: Complete financial statements for March.

Your next quarterly tax estimate is due April 15.
I'll prepare that memo next week.

Best regards,
Jennifer Park, CPA
Park Accounting Group

────────────────────────────────────────────────────────

✅ Jennifer의 평가: 톤과 내용이 김에게 적절합니다. (고객 프로필에 따른 자동 커스터마이징)

[승인 & 즉시 발송]  또는  [편집]
```

Jennifer는 내용을 빠르게 검토하고 "[승인 & 즉시 발송]" 클릭

**9:45 AM — "다음 고객으로 컨텍스트 전환"**

Jennifer가 사이드바에서 "TechStart Inc."를 클릭합니다. 순간:

```
┌─────────────────────────────────────────────────────────────┐
│ [화면 전환 애니메이션: 1초]                                  │
│                                                             │
│ TechStart Inc. — 3월 마감 (Software company)              │
│ ────────────────────────────────────────────             │
│ SaaS | 월매출: $145K | MRR: $145K | 고객 24명             │
│ 마지막 조정: 2026-03-20 | QB 동기됨: 방금 | 미수금: $18K   │
│ 직원: 12명 | 급여비율: 42% | Burn rate: $28K/month       │
│                                                             │
│ 주의: ⚠️ 미은행 조정 ($4.200) — 검토 필요                 │
│                                                             │
│ Jennifer: 미은행조정 뭐 때문에 발생했어?                   │
│                                                             │
│ AI: TechStart의 미은행조정 분석:                          │
│                                                             │
│ 원인: Stripe 결제 처리 지연                               │
│ • 2월 22일 $4,200 결제 수령                              │
│ • QB에는 3월 1일로 기록됨                                │
│ • Bank에는 아직 clear되지 않음 (Pending 상태)            │
│                                                             │
│ 조정 방법: Bank side (manual clear) 또는                  │
│         QB side (date 정정)                              │
│                                                             │
│ 추천: QB에서 transaction date를 2월 22일로 정정           │
│      (Actual bank clear date 기준이 회계 원칙)           │
│                                                             │
│ [이렇게 조정]  [Bank clear 기다리기]  [상담 필요]         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**핵심 순간 (Context Switching Aha Moment)**:

- **기존 방식**:
  - "TechStart 계정 열기" (5분)
  - QuickBooks에서 TechStart 데이터로 전환 (3분)
  - TaxDome에서 미은행조정 확인 (3분)
  - 이메일/노트 찾아서 컨텍스트 복구 (4분)
  - 총 15분의 Context Switching

- **Command Center 방식**:
  - 클릭 (1초)
  - 화면 전환 (1초)
  - AI가 미은행조정 원인 분석 (자동)
  - 권장사항 제공 (자동)
  - 총 15분 → 10초

---

## 시나리오 2-B: "AI의 밤" — 사용자가 퇴근한 후

### 상황
4월 1일 오후 5:30 PM. Jennifer가 퇴근했습니다. Command Center는 계속 작동합니다.
- 200명의 클라이언트 중 이번 달 마감 대상: 85명
- 이 중 아직 완료 안 된 것: 12명
- AI 작업 시간: 밤 10PM ~ 아침 8AM (10시간)

### "AI가 밤새 하는 일"

**Night 10:00 PM — QuickBooks 데이터 스캔 & 분류**

(사용자가 이미 퇴근한 상태)

```
[백그라운드 프로세스 — 사용자에게 보이지 않음]

AI의 동시 작업 (Parallel Processing):
┌─────────────────────────────────────────────────────────┐
│ 1️⃣ 200개 클라이언트 QB 데이터 폴링 (변경 감지)           │
│   → 85개 클라이언트에서 새로운 거래 감지: 총 8,432건    │
│   → 자동 분류 완료: 8,340건 (99.1% 성공)               │
│   → 미분류 거래: 92건 (리뷰 필요)                      │
│                                                         │
│ 2️⃣ 월말 마감 준비 체크                                 │
│   → 마감 접근 (D-7 이내): 12개 클라이언트             │
│   → 각 클라이언트의 마감 진행 상태 확인                 │
│   ├─ QB 데이터 완전 동기: 8개 ✓                       │
│   ├─ QB 데이터 대기: 3개 (자동 리마인더 예약)          │
│   └─ 이상 거래: 1개 (검토 필요)                      │
│                                                         │
│ 3️⃣ 이상 거래 감지 & 플래깅                             │
│   → ABC Mfg: 미분류 $8,500 ⚠️                        │
│   → TechStart: 은행조정 불일치 $4,200 ⚠️             │
│   → XYZ Corp: 거래 패턴 이상 감지 (unusual threshold)  │
│                                                         │
│ 4️⃣ 월간 마감 산출물 자동 생성                          │
│   → 마감 대상 8개 클라이언트:                           │
│   ├─ P&L 문서 생성: 8개 ✓                             │
│   ├─ Balance Sheet 생성: 8개 ✓                        │
│   └─ 고객 통신문 생성: 8개 ✓                          │
│   (생성 시간: 3.5시간)                                │
│                                                         │
│ 5️⃣ 자동 리마인더 이메일 작성                           │
│   → QB 데이터 아직 동기 안 된 3개 클라이언트           │
│   → 각 메일은 "내일 직원 서류 제출" 리마인더            │
│   → 메일 내용: 자동으로 작성, 발송 준비 (승인 대기)    │
│                                                         │
│ 6️⃣ AI의 밤 요약 대시보드 생성                          │
│   → 아침에 Jennifer가 볼 "밤새 무엇을 했는가" 요약      │
│                                                         │
│ 총 소요 시간: 3시간 12분                                │
│ 다음 Jennifer의 아침 준비 상태: 67% 완료 (8/12)        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Night 2:00 AM — 산출물 생성 (Kim's Restaurant)**

자동으로 생성되는 중:

```
[kim_march_2026_financial_statements.docx]
↓ 자동 생성 중 (P&L, Balance Sheet, 관리자 요약)
↓ 산업 벤치마크 비교 포함
↓ 메모: "COGS 31.2% — 업계 평균 28-30% 검토 필요"
↓ 파일 크기: 847KB
↓ 생성 완료: 2:15 AM ✅

[kim_client_communication_mar2026.docx]
↓ 자동 생성 중 (고객 톤 학습: 실용적, 직접적)
↓ 주요 포인트 포함 (재무 현황, 주의사항, 다음 단계)
↓ 파일 크기: 156KB
↓ 생성 완료: 2:20 AM ✅
```

**Night 3:30 AM — 이상 거래 플래깅**

```
AI 분석 결과:

ABC Manufacturing에서 이상 감지:
• Transaction ID: ABC-20260328-004
• Amount: $8,500
• Description: "Supplies" (분류 안 됨)
• 문제점:
  - 미분류된 비용
  - 지난달 평균 공급비 $1,200 대비 7배
  - 공급업체 정보 없음

플래그: ⚠️ HIGH PRIORITY
Jennifer의 아침 대시보드에 표시될 항목

TechStart Inc에서 은행조정 불일치:
• QB: $4,200 (3월 1일 기록)
• Bank: 미청산 (Pending 상태)
• 검토 필요: Transaction date 정정 또는 Bank clear 기다리기

플래그: ⚠️ MEDIUM PRIORITY
```

**Night 5:00 AM — 자동 리마인더 메일 준비**

아직 QB 데이터를 제출하지 않은 3개 클라이언트:

```
[리마인더 1 — Downtown Medical]

Subject: Friendly Reminder: Please Upload Your March QB Data

Dear Dr. Johnson,

We noticed that your QuickBooks data for March hasn't synced 
with our system yet. To complete your monthly close on schedule, 
please ensure all March entries are finalized and synced by 
tomorrow morning.

Your QB Connection Status:
• Last sync: March 20, 2026
• Missing entries: Payroll records (estimated 8 entries)
• Action needed: Upload payroll summary for March

If you have any questions, please reply to this email.

Best regards,
AI Assistant, Park Accounting Group

────────────────────────────────────

[이 메일은 Jennifer의 아침 검토 대기 중. 승인 후 자동 발송 예정]
[발송 시간: 아침 7AM (Jennifer 출근 전)]
```

**Night 6:30 AM ~ 7:30 AM — 최종 점검 & 아침 대시보드 준비**

```
AI의 야간 작업 최종 보고:

작업 완료 현황:
✅ QB 데이터 스캔: 200개 클라이언트 (완료)
✅ 거래 분류: 8,340건 (99.1% 자동 분류)
✅ 월간 마감 산출물: 8개 클라이언트 (완료)
✅ 고객 통신문: 8개 (완료)
✅ 리마인더 메일: 3개 (발송 준비 완료, Jennifer 승인 대기)
⚠️ 이상 거래: 2건 발견 (Jennifer 검토 필요)
⏳ QB 데이터 대기: 3개 클라이언트 (리마인더 발송 예정)

생성된 산출물 파일:
- Word 문서: 16개 (.docx)
- 이메일 초안: 11개
- 데이터 분석 리포트: 1개

이 정보는 아침에 Jennifer가 로그인할 때 제일 먼저 보게 됩니다.
```

### "아하" 순간 (Aha Moment) — AI-Native Agent의 핵심

**기존 방식 (AI-Assisted)**:
- Jennifer가 퇴근
- AI는 아무것도 안 함 (사용자 세션 없음)
- 다음 날 아침: Jennifer가 처음부터 "마감 준비" 시작

**새로운 방식 (AI-Native Agent)**:
- Jennifer가 퇴근
- **AI가 밤새 200개 클라이언트 전체를 자동 스캔, 분류, 산출물 준비**
- 다음 날 아침: Jennifer가 로그인했을 때 이미 **67%가 준비된 상태**에서 시작 → "검토 & 승인만 하면 됨"

**핵심 메시지**:
> "당신이 자고 있는 동안, AI가 200개 클라이언트를 관리하고 있었다."

이것이 제품과 경쟁사의 근본적 차이점입니다.

---

## 시나리오 3: 컨텍스트 전환 — "AI가 200개 클라이언트를 동시에 관리"

### 상황
Jennifer가 하루 동안 여러 산업의 클라이언트를 오간다면, **AI가 동시에 모두를 추적**하므로 전환이 매우 빠릅니다. 핵심 차별화는 "클릭 하나로 AI가 준비해둔 맥락으로 전환"하는 것입니다.

**기존 (AI-Assisted)**: Jennifer가 한 번에 한 고객만 관리 가능 (컨텍스트 전환 15분 소요)

**새로운 (AI-Native)**: AI가 **동시에 200개 클라이언트를 모니터링** → Jennifer가 클릭하면 AI가 준비한 맥락만 표시 (1초)

### 비교 시나리오

**9:45 AM: Kim's Restaurant (식당)**

```
화면:
  식당 | 월매출: $28.4K | COGS: 31.2% | 종업원 8명

Jennifer의 머릿속:
  - "식비가 좀 높아. 고기 공급업체 다시 봐야지."
  - "에너지비도 10% 올랐네. 냉동실 문제 있나?"
  - "Kim은 매주 금요일에 보고서 좋아한다."

AI 역할:
  - Food cost analysis
  - Labor cost tracking
  - Simple P&L focus (식당은 복잡한 세금이 안 중요)
```

**10:00 AM: TechStart Inc. (SaaS)**

```
화면:
  [1초 전환]

  SaaS | MRR: $145K | Burn rate: $28K | 직원 12명

Jennifer의 머릿속:
  [완전히 다른 문제로 이동]
  - "MRR이 145K네. Runway은?"
  - "Series A 다음 funding deadline이 있었나?"
  - "CEO는 매주 월요일 대시보드 원해."

AI 역할:
  - Runway calculation
  - MRR/ARR tracking
  - Investor reporting format
  - Complex deferred revenue handling (SaaS 특성)
```

**10:15 AM: Downtown Medical (의료법인)**

```
화면:
  [1초 전환]

  Medical Practice | 월매출: $92K | 의사 3명 | 환자 수 450명

Jennifer의 머릿속:
  [또 다른 산업으로 전환]
  - "진료비 청구가 정상적으로 처리됐나?"
  - "보험사별로 청구 현황이 어떻게 되나?"
  - "의사들은 개인사업자인가 파트너십인가?"
  - "Dr. Chen은 여름휴가 때문에 Q2 리뷰를 미리 원했어."

AI 역할:
  - Insurance claim tracking
  - Revenue per provider
  - Patient aging analysis
  - Medical practice-specific metrics
```

**직관적 UI 비교**

| 요소 | Kim's Restaurant | TechStart Inc. | Downtown Medical |
|------|-----------------|-----------------|------------------|
| 핵심 지표 | Food Cost % | MRR / Runway | Revenue/Provider |
| 우려사항 | Inventory | Burn Rate | Receivable Days |
| 산업 유형 | Food & Bev | SaaS | Medical |
| 고객 톤 | Casual & Direct | Growth-focused | Professional |
| QB Chart of Accounts | Simple (20 accounts) | Complex (45 accounts) | Moderate (35 accounts) |
| 급여 처리 | Hourly | Salary + Equity | Mix of salary |
| 주요 보고 주기 | Monthly | Weekly | Monthly |

**기존 방식 vs Command Center**

| 작업 | 기존 (분) | Command Center (초) | 절약 |
|------|--------|------------------|------|
| 식당 → 테크 스타트업 컨텍스트 전환 | 15 | 10 | 99% |
| 의료법인으로 재 전환 | 15 | 10 | 99% |
| 각 고객의 KPI 확인 | 5 | 자동 표시 | - |
| 고객 선호도 확인 | 3 | 자동 표시 | - |
| QB 데이터 갱신 | 2 | 실시간 동기화 | - |

---

## 시나리오 4: 세무 시즌 — "AI의 자율 프로젝트 관리"

### 상황
Jennifer가 하루 동안 여러 산업의 클라이언트를 오간다면, **AI가 동시에 모두를 추적**하므로 전환이 매우 빠릅니다. 핵심 차별화는 "클릭 하나로 AI가 준비해둔 맥락으로 전환"하는 것입니다.

**기존 (AI-Assisted)**: Jennifer가 한 번에 한 고객만 관리 가능 (컨텍스트 전환 15분 소요)

**새로운 (AI-Native)**: AI가 **동시에 200개 클라이언트를 모니터링** → Jennifer가 클릭하면 AI가 준비한 맥락만 표시 (1초)

David는 3인 부기/세무 회사의 Owner입니다. 1월-4월의 세무 시즌이 가장 바쁜 시기이며, 85개 클라이언트의 세금 신고서를 준비해야 합니다.

**기존 방식**: 매주 "누가 서류 제출했나?" 수동으로 확인 → 리마인더 메일 개별 작성 → 시각 추적 어려움

**새로운 방식 (AI-Native)**: AI가 **서류 수집 상태를 자동으로 추적**하고, **리마인더를 자동으로 발송**하고, **준비 완료된 순서대로 세무 신고 초안을 생성**

David의 역할 변화:
- **기존**: "서류 관리" (시간 낭비)
- **새로운**: "세무 전략 판단" + "최종 서명" (전문 역량)

### 흐름

**January 15 — "세무 시즌 킥오프"**

David가 Command Center를 열면:

```
┌────────────────────────────────────────────────────────────┐
│ 🔥 2026 TAX SEASON DASHBOARD                             │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ 📊 Overall Status (85 clients)                            │
│ ☑ 문서 수집 완료: 12명 (14%)                             │
│ 🟡 부분 수집: 43명 (51%) — 평균 63% 수집률             │
│ 🔴 미수집: 30명 (35%)                                   │
│                                                            │
│ ⚠️ 긴급 조치 필요 (5명)                                  │
│ 1. Acme Landscaping — W-2/1099 미전달 (due: 2/28)      │
│ 2. Garden Center — Prior year 세금 미해결              │
│ 3. Small Retail Co — 분류 안 된 거래 $8K              │
│ 4. Family Trust — Estate tax 준비 지연                 │
│ 5. Home Services — Quarterly payroll error 정정         │
│                                                            │
│ 📅 This Week Due                                         │
│ • 8개 고객: W-2/1099 수집 마감                          │
│ • 5개 고객: Prior year 이슈 정정                        │
│ • 12개 고객: 세금 신고서 제출                           │
│                                                            │
│ [세무 시즌 자세히 보기]                                   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**January 20 — "문서 수집 및 추적"**

David가 "Document Collection" 뷰를 열면:

```
┌──────────────────────────────────────────────────────────────┐
│ 📋 2026 Document Collection Status                          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ Client Name        | Industry      | Status     | Due       │
│────────────────────|───────────────|────────────|──────────│
│ Acme Landscaping   | Service       | 🔴 Missing | 2/28    │
│   Missing: W-2s    |               |            |          │
│   Action: 1/22에 추가 통보          |            |          │
│────────────────────────────────────────────────────────────│
│ Bob's Plumbing     | Service       | 🟡 Partial | 2/28    │
│   Received: QB exp | Q1-Q3         |            |          │
│   Missing: Q4 PDF  | 1099 forms    |            |          │
│────────────────────────────────────────────────────────────│
│ Garden Center      | Retail        | 🟡 Partial | 2/28    │
│   Received: QB    |               |            |          │
│   Missing: Prior   | year adjusts  |            |          │
│────────────────────────────────────────────────────────────│
│ ... (82개 더)      |               |            |          │
│────────────────────────────────────────────────────────────│
│                                                              │
│ [완료된 고객만]  [미수집 목록 출력]  [자동 상기 이메일 발송]│
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

David가 "[자동 상기 이메일 발송]"을 클릭합니다.

**AI 자동 생성 이메일 (고객별 맞춤)**

```
Acme Landscaping에게:

────────────────────────────────────────

Dear Acme Landscaping,

Tax season is here! To prepare your 2025 tax return,
I need the following documents from you by February 28, 2026:

REQUIRED:
☐ W-2 forms for all employees
☐ 1099 forms for independent contractors
☐ Year-end payroll summary from ADP/Gusto
☐ Invoices for equipment purchases > $5,000

OPTIONAL (if applicable):
☐ Estimated tax payments made in 2025
☐ Vehicle mileage log (if using vehicle deduction)

Attached: Tax document checklist

Please reply to this email with the documents or upload
them to your client portal by February 28.

Questions? Call David at (555) 123-4567.

Best regards,
David Nguyen, EA
Nguyen Tax & Bookkeeping

────────────────────────────────────────

Bob's Plumbing에게:

────────────────────────────────────────

Hi Bob,

Great news! We have 95% of your documents ready for
your 2025 tax return.

Just need one thing:
☐ Q4 2025 bank statements (we have through 11/30)

Once we get that, we can prepare your return immediately.

Please send by Feb 15 if possible.

────────────────────────────────────────

Garden Center에게:

────────────────────────────────────────

Dear Garden Center,

We reviewed your 2025 QuickBooks data. Before we
file your 2025 return, we need to resolve one issue
from your 2024 tax return:

2024 Issue: Inventory write-off of $4,200
   Status: Still under IRS review
   Action: Please send us the correspondence from IRS

Once we hear back, we can finalize your 2025 return.

I'll call you this week to discuss.

────────────────────────────────────────
```

**"아하" 순간**: David가 85개 고객에게 개별화된 이메일을 자동으로 생성했고, 각 고객이 필요한 것만 정확하게 받았습니다. 기존에는 David가 수동으로 메일 템플릿을 복사/붙여넣기하고 각각 커스터마이징하는 데 최소 3-4시간이 걸렸습니다.

**January 25 — "세금 신고서 준비"**

David가 "Bob's Plumbing" (세무 준비 완료된 고객)를 클릭합니다.

```
┌─────────────────────────────────────────────────────────────┐
│ Bob's Plumbing — 2025 Tax Return Preparation              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 사업 유형: S-Corp | 2025 세전이익: $87,200               │
│ 위치: Texas | Industry: Plumbing Service                   │
│ 이전 세율: 22% marginal                                    │
│                                                             │
│ David: 2025 세금 신고서 요약 만들어줘                      │
│                                                             │
│ AI: Bob's Plumbing 2025 Tax Summary를 준비했습니다.      │
│                                                             │
│ 📄 생성 파일: [bobs_plumbing_2026_tax_summary.docx]      │
│                                                             │
│ 문서 구성:                                                 │
│ 1. Executive Summary (1p)                                 │
│ 2. Federal Income Tax Calculation                        │
│ 3. Texas State Tax Return                                │
│ 4. Estimated Quarterly Payments for 2026                │
│ 5. Deduction Summary                                     │
│ 6. Recommended Year-End Planning                         │
│                                                             │
│ 주요 계산 결과:                                            │
│ • 2025 Taxable Income: $78,500 (S-Corp allocation)      │
│ • Federal Income Tax: $17,270                            │
│ • Texas franchise tax: $0 (under threshold)              │
│ • Self-employment tax: N/A (S-Corp 급여로 처리됨)        │
│ • Total Tax Liability: $17,270                           │
│                                                             │
│ 개인소득세 구간:                                           │
│ • 알라바마 주세: $2,340                                   │
│ • 추정세금 분기별: $4,850/quarter (2026)                │
│                                                             │
│ 절세 추천사항:                                             │
│ ✓ 401(k) 기여도 증대: $22,500 가능                       │
│ ✓ Equipment purchase accelerate (Section 179)           │
│ ✓ Vehicle mileage tracking (지난해 누락)                 │
│                                                             │
│ [고객 통신문 생성]  [세금 신고서 파일링]  [Bob 검토 일정] │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**February 10 — "Filing Status Overview"**

세우 시즌이 진행되면서 David의 대시보드:

```
┌────────────────────────────────────────────────────────────┐
│ 2026 TAX SEASON PROGRESS                                  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ Completed & Filed: 34/85 (40%)                           │
│ Prepared, Awaiting Client Review: 18/85 (21%)           │
│ In Preparation: 22/85 (26%)                             │
│ Awaiting Documents: 11/85 (13%)                         │
│                                                            │
│ Status by Week:                                          │
│ Week of 2/10: Target 12 filings ✓ Completed 13         │
│ Week of 2/17: Target 15 filings ✓ On track (10 done)   │
│ Week of 2/24: Target 15 filings 🟡 In progress        │
│ Week of 3/3:  Target 15 filings (scheduled)            │
│ Week of 3/10: Target 15 filings (scheduled)            │
│                                                            │
│ 목표: 4월 15일까지 85개 모두 제출 ✓ Projected on track │
│                                                            │
│ (기존 방식이라면: 3명이 24시간/주 = 4월 10일 완료)        │
│ (Command Center: 80명의 시간 절약 가능)                   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 시나리오 5: 팀 협업 — "AI의 워크로드 자동 분배"

### 상황
Jennifer가 하루 동안 여러 산업의 클라이언트를 오간다면, **AI가 동시에 모두를 추적**하므로 전환이 매우 빠릅니다. 핵심 차별화는 "클릭 하나로 AI가 준비해둔 맥락으로 전환"하는 것입니다.

**기존 (AI-Assisted)**: Jennifer가 한 번에 한 고객만 관리 가능 (컨텍스트 전환 15분 소요)

**새로운 (AI-Native)**: AI가 **동시에 200개 클라이언트를 모니터링** → Jennifer가 클릭하면 AI가 준비한 맥락만 표시 (1초)

Jennifer의 팀에는 Senior Accountant (Emily)와 Junior Accountant (Mark)가 있습니다. Command Center를 사용하면, Jennifer가 각 직원에게 클라이언트를 할당하고, 직원들이 Jennifer의 컨텍스트를 자동으로 상속받을 수 있습니다.

### 흐름

**아침 9:00 AM — "Emily의 작업 할당"**

Jennifer가 Emily를 위한 "일일 할당"을 생성합니다:

```
┌─────────────────────────────────────────────────────────────┐
│ Emily의 오늘 할당 (Senior Accountant)                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 할당 대상 클라이언트 (40개):                                │
│ 1. Kim's Restaurant — Bank reconciliation review         │
│ 2. TechStart Inc. — Deferred revenue adjustment         │
│ 3. Harbor Coffee — Monthly close-out                    │
│ 4. Green Consulting — Accounts receivable aging         │
│ 5. Main St Dental — Insurance claim tracking            │
│ ... (35개 더)                                             │
│                                                             │
│ 우선순위:                                                  │
│ 🔴 URGENT: Kim's Restaurant (Quinn의 고기 비용 검토)    │
│ 🟡 HIGH: 7개 월간 마감 (내일 제출)                      │
│ 🟢 MEDIUM: 15개 정기 검토                               │
│ 🔵 LOW: 17개 예비 작업                                  │
│                                                             │
│ 수용 시간: 약 4시간 (우선 작업들)                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

Emily가 [수용] 클릭.

**Emily's Workflow — 9:30 AM**

Emily가 첫 번째 고객 "Kim's Restaurant"를 클릭합니다.

```
┌─────────────────────────────────────────────────────────────┐
│ Kim's Restaurant — Bank Reconciliation Review              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 맥락 카드 (자동으로 로드됨):                                 │
│ 🏪 식당 | 월매출: $28.4K | COGS: 31.2% | 종업원 8명      │
│ 주의: COGS가 높음 (Jennifer의 메모: "고기 공급업체 다시")   │
│ Jennifer의 선호도: 모든 조정은 Jennifer 승인 필수          │
│ 이전 문제: 없음                                           │
│                                                             │
│ 작업: Bank reconciliation review (March)                  │
│ 상태: QB data와 bank statement 비교 완료                 │
│ 차액: $0 — 완벽하게 일치                                  │
│                                                             │
│ Emily: 3월 은행조정 확인되었습니다. 차액 없음.             │
│                                                             │
│ AI: 완벽합니다, Emily.                                    │
│     ✓ Bank reconciliation approved                       │
│     ✓ 마감 체크리스트 항목 완료됨                          │
│                                                             │
│ Jennifer가 이 항목을 자동으로 확인했습니다.                 │
│ (Emily의 작업 + Jennifer의 approval workflow)            │
│                                                             │
│ [다음 작업: TechStart Inc.]                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**핵심 설계: 작업 흐름 (Workflow) 자동화**

```
┌───────────────────────────────────────┐
│ Jennifer (Partner)                   │
│  ↓                                   │
│  "40개 클라이언트를 Emily에게 할당"  │
│  ↓                                   │
│ Emily (Senior Accountant)             │
│  ├─ Client context 자동 상속         │
│  ├─ Jennifer의 선호도 확인           │
│  ├─ 작업 진행                       │
│  └─ 완료 후 "In Review" 상태로      │
│     ↓                                │
│ Jennifer's Approval Queue             │
│  ├─ 각 작업 검토 (30초/건)          │
│  ├─ 문제 있으면 Emily에 반려        │
│  └─ 승인하면 고객에 준비됨          │
│     ↓                                │
│ Client (Kim, TechStart, etc.)        │
│  └─ 최종 산출물 수신               │
└───────────────────────────────────────┘
```

**이점**:
- Emily가 각 고객에 대해 "Jennifer, 이 고객 뭐 좋아해?"라고 물어볼 필요 없음 (맥락 자동 표시)
- Emily의 실수를 Jennifer가 approval 단계에서 catch 가능
- 고객은 항상 일관된 품질을 받음 (Jennifer의 기준 유지)

---

## 시나리오 6: 산출물 생성 — "고객별 맞춤 재무 리포트"

### 상황
Jennifer가 하루 동안 여러 산업의 클라이언트를 오간다면, **AI가 동시에 모두를 추적**하므로 전환이 매우 빠릅니다. 핵심 차별화는 "클릭 하나로 AI가 준비해둔 맥락으로 전환"하는 것입니다.

**기존 (AI-Assisted)**: Jennifer가 한 번에 한 고객만 관리 가능 (컨텍스트 전환 15분 소요)

**새로운 (AI-Native)**: AI가 **동시에 200개 클라이언트를 모니터링** → Jennifer가 클릭하면 AI가 준비한 맥락만 표시 (1초)

Jennifer의 클라이언트들은 다양한 산업이므로, 같은 "월간 재무제표" 문서도 고객에 따라 완전히 다른 형태여야 합니다.

### 비교: 같은 "월간 리포트" 3가지 버전

**버전 1: Kim's Restaurant (식당)**

```
파일명: kim_march_2026_monthly_report.docx

───────────────────────────────────────

MARCH 2026 MONTHLY REPORT
Kim's Restaurant

Executive Summary (1 page)
• Revenue: $28,400 (↑ 12% from Feb)
• Food Cost: 31.2% of sales (⚠️ Industry avg: 28-30%)
• Net Profit: $4,156 (14.6% margin)

Key Metrics (Food & Beverage)
┌──────────────────────┬────────┬─────────┐
│ Metric               │ This Mo│ Avg (3M)│
├──────────────────────┼────────┼─────────┤
│ Food Cost %          │ 31.2%  │ 31.5%   │
│ Labor Cost %         │ 32.4%  │ 33.1%   │
│ Rent %               │ 6.2%   │ 6.5%    │
│ Profit Margin        │ 14.6%  │ 13.2%   │
└──────────────────────┴────────┴─────────┘

Expense Detail (Food Cost Breakdown)
• Meat & Seafood: $3,100 (⚠️ ↑ 5% from Feb)
  → Recommend: Re-negotiate with supplier
• Vegetables & Produce: $2,800 (normal)
• Beverages: $2,932 (normal)

Action Items
1. Review meat supplier pricing (deadline: next week)
2. Check for energy equipment issues ($2,100 energy cost ↑10%)
3. Follow up with slow customers (30+ days A/R: $2,100)

───────────────────────────────────────
```

**버전 2: TechStart Inc. (SaaS)**

```
파일명: techstart_march_2026_monthly_report.docx

───────────────────────────────────────

MARCH 2026 FINANCIAL DASHBOARD
TechStart Inc.

EXECUTIVE SUMMARY (1 page)

Runway: 12.4 months ✓ (Improved from 11.8 months)
Burn Rate: $28,400/month (↓ $600 from Feb)
MRR: $145,000 (↑ $8,200 from Feb)
Cash on Hand: $352,680

Key Metrics (SaaS)
┌──────────────────────┬────────┬─────────┐
│ Metric               │ This Mo│ Target  │
├──────────────────────┼────────┼─────────┤
│ MRR (Monthly Rec Rev)│ $145K  │ $135K   │
│ Customer Count       │ 24     │ 22      │
│ ARR (Annual Rec Rev) │ $1.74M │ $1.62M  │
│ Burn Rate            │ $28.4K │ $30K    │
│ Runway               │ 12.4mo │ 12mo+   │
│ CAC Payback Period   │ 8.2mo  │ <12mo   │
│ Churn Rate           │ 2.1%   │ <3%     │
└──────────────────────┴────────┴─────────┘

Deferred Revenue Analysis
• Contract value signed: $52,000 (3 annual contracts)
• Deferred revenue: $156,200 (up from $149,000)
  → Indicates strong future revenue ✓

Expense Analysis
• Payroll (12 employees): $95,000 (69% of burn)
• Cloud infrastructure: $12,400 (9% of burn)
• Other opex: $8,200 (6% of burn)
  → Payroll optimization opportunity?

Funding & Runway Planning
• Current cash: $352,680
• Burn rate: $28,400/month
• Runway at current rate: 12.4 months
• Target Series A close: Q3 2026
  → 6-month runway cushion before fundraising crunch

Action Items for Series A Readiness
1. Prepare investor dashboard (weekly ARR, churn, CAC)
2. Document customer reference calls
3. Update financial models (raise scenario 3x / 5x burn)

───────────────────────────────────────
```

**버전 3: Downtown Medical (의료법인)**

```
파일명: downtown_medical_march_2026_monthly_report.docx

───────────────────────────────────────

MARCH 2026 PRACTICE FINANCIAL REPORT
Downtown Medical

Executive Summary (1 page)

Total Collections: $92,400 (↑ 8% from Feb)
Net Income: $28,600 (30.9% margin)
Provider Productivity: Strong

Key Metrics (Medical Practice)
┌──────────────────────────┬────────┬─────────┐
│ Metric                   │ This Mo│ Avg (3M)│
├──────────────────────────┼────────┼─────────┤
│ Total Collections        │ $92.4K │ $85.6K  │
│ Revenue per Provider     │ $30.8K │ $28.5K  │
│ Revenue per Patient Visit│ $205   │ $198    │
│ Patient Visit Count      │ 451    │ 433     │
│ A/R Days Outstanding     │ 32     │ 35      │
│ Insurance Payment %      │ 68%    │ 67%     │
│ Patient Payment %        │ 32%    │ 33%     │
└──────────────────────────┴────────┴─────────┘

Insurance Claim Status
┌─────────────────┬──────┬────────┬───────┐
│ Payer           │ Claim│ Avg    │ Status│
├─────────────────┼──────┼────────┼───────┤
│ Blue Shield     │  45  │ $62K   │ ✓ OK  │
│ Aetna           │  32  │ $42K   │ ✓ OK  │
│ Medicare        │  28  │ $35K   │ ✓ OK  │
│ Self-pay        │  12  │ $18K   │ 🟡 70%│
│ Medicaid        │  8   │ $8K    │ ✓ OK  │
└─────────────────┴──────┴────────┴───────┘

Provider Productivity Analysis
┌──────────────┬────────┬──────────┬────────┐
│ Provider     │ Visit #│ Avg Charge│ Collect│
├──────────────┼────────┼──────────┼────────┤
│ Dr. Chen     │ 168    │ $185     │ 94%    │
│ Dr. Williams │ 158    │ $192     │ 89%    │
│ Dr. Patel    │ 125    │ $210     │ 96%    │
└──────────────┴────────┴──────────┴────────┘

Staffing & Overhead
• Salary & benefits (3 providers + 5 staff): $48,200
• Rent & utilities: $6,800
• Supplies & equipment: $3,400
• Insurance & licenses: $2,100
• Marketing: $500
  → Total opex: $60,800
  → Margin: 30.9% ✓ Healthy

Recommendations
1. Increase collections follow-up for self-pay (70% collection rate)
2. Consider extending Dr. Patel's hours (highest conversion rate 96%)
3. Annual lease renewal coming up (9 months) — negotiate now?

───────────────────────────────────────
```

**자동 선택 로직**

```
Jennifer가 "월간 리포트 생성"을 선택하면:

AI: 이 고객에 맞는 리포트 포맷을 자동으로 선택합니다.

  ✓ 산업 감지: Food & Beverage
  ✓ 클라이언트 크기: 소상공인 (8명)
  ✓ 복잡도: 낮음 (간단한 비용 구조)

  → 선택 포맷: "Restaurant Monthly Review"

포함 내용:
  - Food cost analysis (당신의 주요 관심사)
  - Labor cost tracking
  - Simple P&L
  - Operational metrics
  - Action items

[생성]  [다른 포맷으로]  [커스텀]
```

---

## 시간 절약 비교: Before vs After

| 작업 | 시간 (기존) | 시간 (Command Center) | 절약 | 주당 절약 |
|------|-----------|-------------------|------|---------|
| **월간 마감** (12개 클라이언트) | 24시간 | 6시간 | 75% | 18시간 |
| **월간 마감** (클라이언트당) | 2시간 | 30분 | 75% | - |
| **클라이언트 온보딩** | 2시간 | 20분 | 83% | - |
| **컨텍스트 전환** (고객당) | 15분 | 10초 | 99% | - |
| **고객 커뮤니케이션** (고객당) | 30분 | 5분 | 83% | - |
| **세무 시즌 문서 관리** (분기) | 80시간 | 20시간 | 75% | - |
| **세금 신고서 준비** (고객당) | 3시간 | 45분 | 75% | - |
| **팀 할당 & 검토** (일일) | 90분 | 15분 | 83% | - |
| **리포트 생성 및 포맷** (고객당) | 45분 | 5분 | 89% | - |

### 주당 시간 절약 (Jennifer, 120 clients basis)

**기존 방식 (120개 고객)**:
- 월간 마감: 4주 x 3개 고객/주 = 12개 고객/월 x 2시간 = 6주당 24시간
- 일일 컨텍스트 전환: 8개 고객 x 15분 = 2시간/일 x 5일 = 10시간/주
- 고객 커뮤니케이션 & 추적: 3시간/일 x 5일 = 15시간/주
- 팀 관리 & 검토: 90분/일 x 5일 = 7.5시간/주
- **합계: ~36.5시간/주 (대부분 반복 작업)**

**Command Center 사용 (120개 고객)**:
- 월간 마감: 4주 x 3개 고객/주 = 12개 고객/월 x 30분= 6시간/주
- 일일 컨텍스트 전환: 거의 0 (자동)
- 고객 커뮤니케이션 & 추적: 30분/일 x 5일 = 2.5시간/주
- 팀 관리 & 검토: 15분/일 x 5일 = 1.25시간/주
- **합계: ~9.75시간/주**

### 핵심 가치 제안

**Jennifer의 변화**:
- 기존: 주 36.5시간 데이터 정리 → 주 5시간으로 감소
- 절약: **주 31.5시간** (월 126시간, 연 1,638시간)
- 경제적 가치: $126/시간 기준 → **연 $206,000 절약**

**가능한 활용**:
- 더 많은 클라이언트 수용 (120 → 180+)
- 전략적 컨설팅에 시간 투자 (세금 전략, 비용 절감, 성장 계획)
- 팀 개발 및 교육
- 새로운 서비스선 개발

---

## 제품의 핵심 메커니즘

### 1. **Client Context Memory**
각 고객의 데이터가 AI에게 자동으로 주입됨:
```
System Prompt 구성:
  - Client Profile (산업, 크기, 서비스 범위)
  - Financial Summary (최근 월간 수치)
  - Account Structure (Chart of Accounts)
  - Communication Preference
  - Previous Issues & Resolutions
  - Jennifer's Notes & Preferences
```

### 2. **QuickBooks Integration**
실시간 데이터 동기화:
```
  Flow:
  1. QB Online API → 시간마다 자동 sync
  2. 최근 3개월 거래 내역, 계정 구조, P&L, Balance Sheet
  3. AI가 이상 거래 자동 감지 (threshold 초과, 미분류)
  4. Jennifer에게 alert
```

### 3. **Industry-Specific Templates**
산업별 맞춤형 산출물:
```
  Food & Beverage:
    - Food cost analysis
    - Labor productivity
    - Simple P&L

  SaaS:
    - MRR / ARR tracking
    - Runway calculation
    - CAC / LTV metrics

  Medical:
    - Revenue per provider
    - Insurance claim status
    - Patient visit analytics
```

### 4. **Workflow Automation**
팀 협업 최적화:
```
  Jennifer assigns clients to Emily
    ↓
  Emily inherits all context (QB data, preferences, notes)
    ↓
  Emily works on assigned tasks
    ↓
  Jennifer reviews & approves
    ↓
  Client receives output
```

### 5. **One-Click Context Switching**
고객 전환이 1초 이내:
```
  Before:
    - Open QB for new client (3min)
    - Load TaxDome (2min)
    - Find email context (5min)
    - Review notes (5min)
    - Total: 15min

  After:
    - Click client name (1 second)
    - All context loads automatically
```

---

## 사용자 여정 요약

| 단계 | Jennifer | David | 핵심 가치 |
|------|----------|-------|---------|
| **온보딩** | 새 고객 30분 등록 | QB 자동 연동 | 설정 시간 83% 절약 |
| **일일 업무** | 월간 마감 6h (기존 24h) | 문서 수집 자동 추적 | 데이터 정리 75% 절약 |
| **컨텍스트 전환** | 1초 (기존 15분) | 고객별 다른 필요사항 자동 인식 | 인지 오버로드 제거 |
| **팀 협업** | Emily에게 할당 → 자동 컨텍스트 상속 | Part-time staff도 전체 그림 파악 | 커뮤니케이션 오버헤드 제거 |
| **산출물** | 산업별 맞춤 리포트 자동 생성 | 고객별 개별화 커뮤니케이션 | 포맷팅 시간 89% 절약 |
| **시즌** | 세무 시즌 효율 + 과부하 감소 | 85명 고객 동시 관리 가능 | 스케일 가능성 증가 |

---

## 기대 효과

### 업체 규모별

**Jennifer의 회사 (6명, 120명 고객)**
- 현재 용량: 120명 고객 / 6명 = 20명/인당
- Command Center 후: 180-200명 고객 가능 (50-60% 성장)
- 추가 수익: 120-140명 x $200/연 = $24K-28K/년

**David의 회사 (3명, 85명 고객)**
- 현재 용량: 85명 고객 / 3명 = 28명/인당
- Command Center 후: 150-170명 고객 가능 (75-100% 성장)
- 추가 수익: 65-85명 x $200/연 = $13K-17K/년

### 서비스 품질 향상
- 고객당 Jennifer의 투입 시간 2시간 → 30분으로 감소하면서도 품질 향상
- AI 자동 분석으로 실수/누락 감소
- 팀 직원들도 일관되게 높은 품질 유지 가능

### 고객 만족도
- 응답 시간 단축 (몇 시간 → 몇 분)
- 맞춤형 리포트 (산업별, 회사별)
- 실시간 재무 가시성 (월 1회 → 필요할 때마다)
