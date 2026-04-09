# Fractional AI Command Center - 제품 요구사항 문서 (PRD)

## 1. 제품 비전 및 문제 정의

### 1.1 시장 기회

**타겟 시장 규모**
- **총 대상 시장 (TAM)**: 미국 내 회계/세무/부기 펌 약 41,600개 (전체의 98%)
- **시장 규모**: 약 $157.4B (회계 서비스 시장)
- **종업원당 월 수익**: $8,000-15,000 (지역, 서비스 유형, 클라이언트 규모 따라 다름)
- **주요 세그먼트**: 소규모 펌 (2-10명), 중형 펌 (11-50명)

**초기 진입 시장**
- **우선 타겟**: 미국 소규모 회계/세무/부기 펌 (2-10명, 50-200 클라이언트)
- **적격 펌 규모**: 약 35,000개 (회계 펌 전체의 84%)
- **잠재 고객 수**: 약 210,000명 (펌 당 평균 6명)
- **예상 진입 가능 비율**: 초기 Phase에서 5-10% (10,500-21,000명)

### 1.2 핵심 문제: 멀티 클라이언트 맥락 관리의 병목 현상

**회계/세무 펌의 근본적 과제**
회계, 세무, 부기 전문가들은 동시에 50-200개 클라이언트를 관리합니다. 각 클라이언트는 고유한 재정 상태, 세금 상황, 보고서 요구사항, 선호도를 가지고 있습니다. 현재 대부분의 펌은 이러한 다중 클라이언트 맥락을 수동으로 관리하기 때문에 생산성 손실, 오류 증가, 번아웃이 발생합니다.

**문제의 구체적 증상**

| 문제 | 업계 데이터 | 영향 |
|------|-----------|------|
| **다중 클라이언트 간 생산성 손실** | 월 근무시간의 45%가 communication/context 관리에 소비 | 월 96시간(주 6시간) 손실 |
| **기술 도구 비효율** | 97%의 회계사들이 현재 사용 기술이 비효율적이라고 평가 | 수동 데이터 입력, 중복 작업 |
| **미수금 회수 문제** | 86%가 클라이언트 송장/요청서 추적에 어려움 | 월 평균 $2,000-5,000 손실 |
| **전문가 인력 이탈** | 2020-2024년 회계사 이탈 300,000+ | 부기 오류 증가, 클라이언트 서비스 저하 |
| **번아웃/야근** | 55%의 회계사들이 업무 부하 증가 보고 | 장시간 근무(월 180시간+), 삶의 질 악화 |

**구체적 사용 시나리오: 월말 마감 프로세스(Monthly Close)**

Jennifer Park(Managing Partner, CPA, 6-인 펌, 120 클라이언트):
- **목표**: 120개 클라이언트의 monthly financial statements 작성 및 배포 (월 1회)
- **현황 프로세스**:
  1. Excel/Google Sheets에서 클라이언트별 trial balance 정리 (4시간)
  2. QuickBooks Online에서 각 클라이언트의 데이터 추출 및 검증 (6시간)
  3. 조정 분록 입력 및 재무제표 작성 (8시간)
  4. 클라이언트별 메모/검토 의견 추가 (4시간)
  5. 각 클라이언트 폴더로 이동하여 배포 (2시간)
  6. 예외 건 처리 및 재작업 (2시간)
  - **총 소요 시간**: 월 26시간
  - **비용**: 26시간 × $180/hr = $4,680/월, $56,160/년

**더 깊은 문제들**
1. **다중 클라이언트 간 문맥 전환 비용**: 클라이언트 A → B로 전환할 때, 재정 상황, 세금 상황, 최근 이슈, 클라이언트 선호도를 다시 학습해야 함 (평균 10-15분/전환, 하루 15-20회 전환)
2. **문서 및 템플릿 산재**: 120개 클라이언트 × 12개월 = 1,440개의 monthly statements가 서로 다른 폴더에 저장. 버전 관리 혼란
3. **클라이언트 정보 중복 저장**: QuickBooks에 저장된 기본 정보, TaxDome의 프로젝트 메타데이터, 이메일/Slack의 특수 요청 사항 → 동기화 불가
4. **보고서 자동화 불가**: 매월 동일한 구조의 보고서를 반복 작성하지만, 클라이언트별로 조정해야 하므로 템플릿 사용 불가
5. **신입/보조 직원의 온보딩**: 새로운 회계사가 입사하면 120개 클라이언트의 배경을 학습하는 데 수주 소요
6. **팀 협업 시 문맥 손실**: 팀원이 클라이언트 A를 담당했던 정보를 찾지 못함 → 중복 작업, 오류 발생

### 1.3 비전 선언문

**"AI가 자율적으로 200개 클라이언트를 감시하고, 능동적으로 산출물을 준비하며, 사용자는 최종 검증과 전문적 판단에만 집중하는 AI-Native Agent 플랫폼"**

기존 개념: "AI가 붙은 채팅 도구" | 새로운 패러다임: **"AI가 주체인 에이전트"**

**핵심 메시지**
> "당신이 출근했을 때, AI가 밤새 200개 클라이언트를 돌봤습니다. 이상 거래 3건을 감지했고, 이번 주 마감인 12개 클라이언트의 재무제표 초안을 생성해두었으며, W-2 미제출 클라이언트 5곳에 보낼 리마인더 이메일을 준비했습니다."

**핵심 가치 제안 (AI-Native Agent 방식)**
- **자율 모니터링**: AI가 200개 클라이언트의 데이터 변동과 이상 거래를 지속적으로 감시
- **능동적 준비**: 요청 전에 산출물을 미리 생성 (월말 close 26시간 → 5시간, 산출물 생성 속도 5배 향상)
- **패턴 학습**: 사용자의 반복적 판단을 학습하여 다음부터 자동 적용
- **워크플로우 오케스트레이션**: 85개+ 클라이언트의 세무 시즌을 하나의 프로젝트로 조율
- **지능적 개입**: 문제가 커지기 전에 사전 경고 (현금 흐름 위험, 마감 D-7 미비 서류 등)
- **클라이언트 전환 비용 80% 감소**: 15분 → 3분 (문맥 재학습 자동화)
- **클라이언트 용량 30% 증가**: 현재 120 클라이언트 → 150+ (일인당 생산성 향상)
- **재무 보고 오류율 70% 감소**: 클라이언트 맥락 혼동 제거, 자동 검증
- **팀 협업 효율성 3배**: 신입 온보딩 1일 → 2시간, 팀 기여도 향상

---

## 2. 목표 사용자 페르소나

### 페르소나 1: Jennifer Park - Managing Partner, CPA (회계/세무 펌)

**프로필**
- **나이**: 45세
- **자격**: CPA (Certified Public Accountant)
- **경력**: Big 4 (Deloitte) 10년 + 자체 펌 운영 8년
- **펌 규모**: 6명 (자신 포함, CPA 2명, 회계사 2명, 행정 1명)
- **사무실 위치**: 중서부 미국 (Midwest)
- **월 수익**: 약 $60,000 (120 클라이언트 × $500 평균 수수료)

**관리 클라이언트 포트폴리오**
- **총 클라이언트 수**: 120명
- **구성**: 소규모 제조업(30%), 서비스업(25%), 부동산(20%), 전문직(15%), 기타(10%)
- **월간 업무**: Monthly financial statements (모든 클라이언트), quarterly tax advisory (40개)
- **연간 주요 업무**: Tax return 준비/제출 (120개), W-2/1099 작성 (약 500개), 분기별 estimated tax (80개)
- **평균 클라이언트 수익**: $500/월, $6,000/년

**일일 루틴 (일반적인 월)**
- **08:00-09:00**: 이메일 확인, 긴급 사항 대응, 일일 계획
  - "클라이언트 A의 미수금은 어디까지?" (이메일/Slack에서 찾기, 5분)
  - "클라이언트 B의 payroll tax 문제는?" (QuickBooks 확인, TaxDome 메모 찾기, 10분)
- **09:00-10:30**: Monthly close 작업 (현재 4시간, 월 1회 / 하루 기준 20분 배분)
  - Excel에서 trial balance 정리
  - 각 클라이언트별 조정 분록 검토
  - QuickBooks에서 데이터 검증
- **10:30-11:00**: 클라이언트 A: 세무 자문
  - 근무 중 다른 클라이언트로 전환 (문맥 재설정, 5-10분 손실)
- **11:00-12:30**: 클라이언트 B: 분기별 재무 분석
- **12:30-13:30**: 점심 + 미팅 (클라이언트/팀 meeting)
- **13:30-14:30**: 클라이언트 C, D, E: 부기/세무 상담 (3회 전환)
- **14:30-15:00**: 행정: 미수금 추적, 발송물 준비
- **15:00-16:30**: 보고서 작성 (monthly statement, quarterly summary)
- **16:30-17:00**: 메일 회신, 내일 계획

**월말 기간 (특히 tax season, Jan-Apr)**
- 업무량 3-5배 증가
- 주 50-60시간 근무
- 야근: 주 10-15시간
- 스트레스/번아웃 위험

**Pain Points (우선순위)**

1. **맥락 복구 시간 낭비 (월 8시간)**
   - "클라이언트 B의 2024년도 revenue는 $500K였나 $600K였나?"
   - 이메일, Google Drive, QuickBooks, Excel에서 답을 찾아야 함
   - 특히 분기/연초에 이전 데이터 찾기가 어려움

2. **문서 버전 관리 혼란 (월 3-4시간)**
   - 120개 클라이언트 × 12개월 = 1,440개의 monthly statement
   - "이게 최신 버전인가? 수정 요청이 반영됐나?"
   - 클라이언트별로 요청한 수정 사항이 산재됨

3. **월말 close 자동화 불가 (월 26시간)**
   - 동일한 구조의 보고서를 120번 반복 작성
   - 각 클라이언트별 조정사항은 다르지만 기본 흐름은 같음
   - 현재: 수동 작성 → 미래 필요: 자동 생성, 클라이언트별 조정

4. **클라이언트별 스타일/선호도 관리 (월 2시간)**
   - 클라이언트 A: "Executive Summary 맨 앞에"
   - 클라이언트 B: "상세 데이터셋 포함"
   - 클라이언트 C: "차트로 시각화"
   - → 매번 조정, 오류 위험

5. **팀 협업 시 정보 검색 곤란**
   - 신입 회계사가 클라이언트 X의 배경 정보를 찾지 못함
   - "Jennifer, 클라이언트 X의 특수한 상황이 뭐였죠?" 질문 반복
   - → 신입 온보딩 기간 4-6주 소요

6. **미수금 추적 및 회수 (월 $500-1,000 손실)**
   - 120개 클라이언트의 미수금 상태를 추적하는 시스템 없음
   - 메일로 송장을 보내도 클라이언트가 놓칠 수 있음
   - 30일 이상 연체가 자주 발생

7. **세무 계획 기회 손실**
   - 각 클라이언트의 세금 상황을 종합적으로 분석할 시간 부족
   - "이 클라이언트는 tax deferral opportunity가 있을 텐데..." 라고 생각만 함
   - 고수익 서비스(tax planning, consulting)로 확장 불가

**목표 (향후 12개월)**
1. **생산성 향상으로 클라이언트 수 30% 증가**: 120 → 150+ (추가 수입 $18,000/년)
2. **월말 close 시간 50% 단축**: 26시간 → 13시간 (월 13시간 자유로워짐)
3. **신입 온보딩 기간 단축**: 4-6주 → 1-2주
4. **미수금 회수율 향상**: 현재 90% → 98%
5. **팀 확장 준비**: 현재 6명 → 향후 10명으로 스케일링 가능한 시스템 구축
6. **tax planning 서비스 확대**: 현재 40개 클라이언트 → 60개 클라이언트 (수익 증가)

**사용 대역폭 (예상)**
- **초기 채택 시간**: 1주일 (기존 워크플로우 이해 후 도입)
- **월간 사용**: 월 30-40시간 (주 1-2시간 active use + 배경 실행)
- **주요 사용 시나리오**:
  - 매월 초: 120개 클라이언트 monthly statement 생성 (2시간 active use)
  - 주 1-2회: 클라이언트 컨텍스트 검색 (각 5-10분)
  - 분기 1회: 140+ 클라이언트 quarterly summary (3시간)
  - 연 1회: Tax planning 검토 (4시간)

---

### 페르소나 2: David Nguyen - Owner, 부기/세무 전문 펌

**프로필**
- **나이**: 38세
- **자격**: EA (Enrolled Agent, 미국 세무청 공식 인증)
- **경력**: 부기 15년 + 자체 펌 운영 7년
- **펌 규모**: 3명 (자신 + 부기사 2명)
- **사무실 위치**: 캘리포니아 (high tax 주)
- **월 수익**: 약 $25,000 (85 클라이언트 × $290 평균 수수료 + tax prep premium)

**관리 클라이언트 포트폴리오**
- **총 클라이언트 수**: 85명
- **구성**: 자영업자(40%), 소규모 LLC(35%), S-Corp(15%), Partnership(10%)
- **주요 서비스**: Monthly/quarterly bookkeeping, tax prep (Form 1040, Schedule C), estimated tax planning
- **월간 업무**: 85개 클라이언트 부기, quarterly estimated tax notice
- **연간 주요 업무**: Tax return 준비 (85개, Jan-Apr 집중), IRS correspondence 대응

**일일 루틴 (비 tax season)**
- **08:00-09:00**: 메일/Slack 확인
  - 클라이언트 A의 receipt를 Bank statement 항목으로 분류 요청
  - 클라이언트 B의 1099 정보 수집 상태 확인
  - 클라이언트 C의 Q1 estimated tax 계산 완료 여부 확인
- **09:00-12:00**: 부기 작업 (QuickBooks, spreadsheet)
  - 각 클라이언트별로 분류 작업, 조정 분록 입력
  - 평균 하루 10-15 클라이언트 처리
- **12:00-13:00**: 점심 + admin
- **13:00-16:00**: 클라이언트 상담, 부기 검수, 세무 계획
  - 클라이언트의 분기별 세금 예상액 계산
  - 세금 절감 기회 논의
- **16:00-17:00**: 내일 준비, 미해결 사항 정리

**Tax Season 루틴 (Jan-Apr, 월 180시간 + 야근)**
- 월 주 50-60시간 일함
- 주말 작업: 주 5-10시간
- 야근: 주 10-15시간
- 번아웃 위험 매우 높음
- 이 기간 동안 부기 작업은 defer됨 (backlog 쌓임)

**Pain Points (우선순위)**

1. **Tax Season 오버로드 (Jan-Apr, 월 100시간 이상 추가 업무)**
   - 85개 클라이언트의 tax return을 4개월 안에 완성해야 함
   - 각 클라이언트의 서류 수집, 데이터 정리, filing은 서로 다른 프로세스
   - 현재: 수동으로 spreadsheet에서 추적 (오류 위험 높음)
   - 결과: 번아웃, 오류 증가, 클라이언트 불만

2. **클라이언트 서류 수집 혼란 (월 10시간)**
   - 85명 각각에게 1099, receipt, expense 정보를 받아야 함
   - TaxDome, email, Slack, phone call 등 다양한 채널에서 옴
   - 누가 완료했는지, 누가 아직 안 했는지 추적 어려움
   - "클라이언트 A의 1099 정보는 받았나?" 검색하는 데 시간 소비

3. **클라이언트별 세금 상황의 종합적 관리 불가 (월 5시간)**
   - 각 클라이언트의 세금 상황(income, deduction, estimated tax liability)이 산재됨
   - 어떤 클라이언트는 tax risk 상태인지, 추가 tax planning이 필요한지 한눈에 파악 불가
   - "클라이언트 B의 2024년 예상 세금은?" 질문이 오면 시간이 걸림

4. **팀 역량 부족으로 인한 고객 서비스 저하**
   - 3명 팀이 85 클라이언트를 관리 (1인당 28-30명)
   - 새로운 클라이언트가 들어오면 기존 클라이언트 서비스 저하
   - 현재: 한 사람이 떠나면 즉시 서비스 장애 발생

5. **규정 준수 리스크 (연 1-2시간 + 규정 위반 시 고비용)**
   - IRS filing deadline 추적 (예: 1099-MISC deadline 1/31)
   - estimated tax payment due date (quarterly)
   - 놓칠 경우 penalty가 크기 때문에 매우 신경 씀

**목표 (향후 12개월)**
1. **클라이언트 수 40% 증가**: 85 → 120 (추가 수입 $10,000/월 × 12 = $120,000/년)
2. **Tax season 오버로드 50% 경감**: 월 180시간 → 90시간 (번아웃 완화)
3. **팀 확장 가능성**: 현재 역량으로 버티던 수준에서 → AI 지원 하에 120 클라이언트 관리 가능
4. **서류 수집 자동화**: 현재 수동 추적 → 자동 reminder + centralized 추적
5. **tax planning 수익 증가**: 현재 기본 세무 서비스 중심 → tax optimization advice 비중 20% 확대

**사용 대역폭 (예상)**
- **Tax season (Jan-Apr)**: 주 20-30시간 (critical phase)
- **Off-season (May-Dec)**: 주 5-10시간
- **주요 사용 시나리오**:
  - 매주: 신규 클라이언트 서류 상태 확인 (1시간)
  - 월 1-2회: 클라이언트 세금 상황 리뷰 (각 1시간)
  - Tax season: 매일 tax return 생성, filing 추적 (4-6시간/일)

---

### 페르소나 3: Maria Santos - Senior Accountant (대형 펌 소속)

**프로필**
- **나이**: 32세
- **자격**: CPA 자격증 보유 (또는 CPA candidate)
- **경력**: 회계사 5년 (현재 펌 근무 2년)
- **근무처**: 10-인 회계 펌
- **직급**: Senior Accountant (팀 내 2번째 수준, 신입 감독 책임)
- **월 급여**: $5,000 (연 $60,000)

**업무 범위**
- **담당 클라이언트**: 파트너로부터 지정 받은 40명 (전체 200명 중)
- **주요 업무**: Monthly/quarterly financial statements 준비, tax compliance, 신입 감독
- **직급 상 특수성**: 파트너는 전략적 판단, Maria는 실행 담당

**일일 루틴**
- **08:30-09:00**: 팀 미팅 (파트너와 daily standup)
  - 어제 진행 상황 보고
  - 오늘 우선순위 확인
- **09:00-12:00**: Financial statement 준비 (4-5개 클라이언트)
  - trial balance 검토
  - 조정 분록 입력
  - 규정 준수 검증
- **12:00-13:00**: 점심
- **13:00-14:30**: 신입 감독 (2명의 junior accountant 감시)
  - 부기 작업 검수
  - 질문 대응
- **14:30-16:30**: 클라이언트 미팅, 세무 상담, 추가 작업
- **16:30-17:00**: 내일 준비, 메일 정리

**주간 업무 분포**
- 월: Statement 준비 집중 (40%)
- 화-목: Statement + 클라이언트 미팅 (각 30%, 40%)
- 금: 주간 정리, 신입 training (50%, 30%)

**Pain Points (우선순위)**

1. **클라이언트 간 맥락 전환 빈도 높음 (일 10-15회 전환, 일 2-3시간 손실)**
   - 40명 클라이언트 각각의 unique 재무 상황을 일일이 재학습
   - "클라이언트 X의 elimination entry는 뭐였지?" (매번 노트/이메일 검색)
   - 결과: 오류 증가, 재작업 필요

2. **클라이언트별 선호도 기억 불가 (월 3-4시간)**
   - 어떤 클라이언트는 detailed notes 원함, 어떤 클라이언트는 high-level summary만 원함
   - 매번 이전 작업 참고해야 함
   - 가끔 실수해서 클라이언트가 다시 요청 (rework)

3. **신입 온보딩 어려움 (월 5-10시간)**
   - Junior accountant가 40명 클라이언트의 배경을 모름
   - Maria가 계속 설명해야 함 ("클라이언트 A는 real estate company라서...")
   - 신입이 오류 범하기 쉬움 (클라이언트 정보 혼동)

4. **문서 템플릿 산재 (월 2-3시간)**
   - 각 클라이언트별로 약간씩 다른 format 필요
   - 파트너가 일관성을 요구하지만 구현 방법이 없음
   - 매번 "이 클라이언트는 이런 format였나?" 확인

5. **야근 (주 3-5시간)**
   - 월말: 모든 statement를 deadline 전에 완성해야 함
   - 정시에 끝나지 않으면 저녁/주말 작업
   - 일-생활 밸런스 감소

**목표 (향후 12개월)**
1. **업무 효율성 향상**: 월 동일 수의 클라이언트를 1-2시간 빠르게 처리
2. **오류율 감소**: 현재 5-10% rework rate → 2% 이하
3. **야근 감소**: 주 3-5시간 → 주 1-2시간 이상 (일-생활 밸런스)
4. **신입 감독 부담 경감**: Maria의 training 시간 30% 단축
5. **파트너 신뢰도 향상**: 더 높은 품질의 작업, 더 빠른 delivery → 승진 기회 증가

**사용 대역폭 (예상)**
- **월간**: 월 25-35시간 (주 6-9시간)
- **주요 사용 시나리오**:
  - 매일: 클라이언트 컨텍스트 검색 (각 5-10분)
  - 주 3-4회: Statement 생성 (각 30분)
  - 월 1-2회: 신입 training 자료로 사용 (각 1시간)

---

## 3. 핵심 기능 (Features)

### 3.1 P0 - MVP 단계에서 반드시 구현할 기능

#### 3.1.1 Client Context Memory (클라이언트 맥락 기억) — AI 자율 관리

**목표**: 각 회계/세무 전문가가 관리하는 수십~수백 개 클라이언트의 맥락(재정 데이터, 문서, 선호도, 특수 상황)을 **AI가 자율적으로 갱신하고 풍부하게** 하여, 사용자는 최종 검증과 판단에만 집중할 수 있도록 함.

**AI-Native Agent 특징**
- AI가 사용자의 명시적 요청 없이도 **지속적으로 클라이언트 맥락을 모니터링**
- QuickBooks 데이터 변경, 이메일/Slack 언급, 업로드된 문서 → 자동으로 맥락에 반영
- 사용자의 과거 결정(분류, 의견)을 학습하여 다음부터 **자동 적용**

**기능 범위**

| 기능 | 설명 | 예시 |
|------|------|------|
| **Client Profile 관리** | 기본 정보 입력 및 저장 | 회사명: "ABC Manufacturing", 산업: "Manufacturing", 대표: "John Smith", Contact info, 연간 매출 예상 등 |
| **재무 데이터 수집 및 파싱** | QuickBooks Online/Desktop, Excel 등에서 trial balance, GL, financial data 자동 추출 | QB에서 해당 client의 trial balance 다운로드 → 파싱 → structured format 저장 |
| **문서 업로드 및 인덱싱** | 과거 tax return, financial statements, 클라이언트 대응 내역 등 PDF/Excel 업로드 | 2023년 tax return 업로드 → 핵심 정보 추출 (income, deductions, tax liability 등) |
| **시맨틱 검색** | 키워드 또는 자연어로 클라이언트 정보 검색 | "클라이언트 A의 2024년 예상 tax liability는?" → 시스템이 관련 문서/데이터 검색해서 답변 |
| **클라이언트별 선호도 저장** | 보고서 형식, 커뮤니케이션 스타일, 특수 요청사항 등 | "클라이언트 B는 'Executive Summary' 형식 선호, weekly email 스타일은 casual tone" |
| **자동 맥락 요약** | 대화/업무 중 주요 정보 추출 → 구조화 저장 | 대화: "클라이언트가 이번 분기에 major equipment purchase 계획 중" → 자동으로 "Tax Planning Opportunity: Section 179 Deduction" 등으로 정리 |
| **클라이언트별 격리** | 각 사용자의 각 클라이언트 데이터는 완전히 격리 | Jennifer의 클라이언트 A와 다른 회계사의 클라이언트 A는 완벽히 분리 |

**구현 상세 사항**
- **저장 구조**: Prisma ORM, PostgreSQL에 ClientContext 테이블
  - `title`: "ABC Manufacturing - 2024 Trial Balance"
  - `content`: structured data (JSON) 또는 plain text
  - `category`: "financial_statement", "tax_return", "communication", "preference" 등
  - `contentEmbedding`: vector (pgvector) - 향후 semantic search 지원
  - `isPinned`: 중요 정보는 pin해서 빠르게 접근 가능
- **초기 단계**: 키워드 기반 검색 (vector embedding은 Phase 2)
- **API**: `POST /api/clients/{clientId}/contexts` (새 context 저장), `GET /api/clients/{clientId}/contexts/search` (검색)

---

#### 3.1.2 Multi-Format Output Engine (다양한 형식의 산출물 생성) — AI 사전 준비

**목표**: AI가 **마감 일정에 맞춰 산출물을 사전 준비**하므로, 회계/세무 전문가는 생성 대신 **검토와 승인**에만 집중할 수 있도록 함.

**AI-Native Agent 특징**
- 월말이 되면 → 마감 대상 클라이언트의 재무제표 초안을 **자동 생성**
- 분기 세무 마감 접근 시 → 분기 예납 계산서 초안 **자동 생성**
- 미팅 48시간 전 → 해당 클라이언트의 브리핑 노트 **자동 준비**
- 사용자의 역할이 변함: "생성하기" → **"검토하고 승인하기"**

**지원 포맷**

| 포맷 | 사용 사례 | 생성 시간 (현재 vs. AI 지원) |
|------|---------|--------------------------|
| **.xlsx (Excel)** | Monthly/quarterly financial statements, trial balance, schedule | 현재: 60min → AI 지원: 10min |
| **.docx (Word)** | Tax summary memo, client communication letter, compliance checklist | 현재: 45min → AI 지원: 8min |
| **Email Draft** | 월별 고객 통지, tax planning 제안, 미수금 안내 | 현재: 15min → AI 지원: 2min |
| **.pptx (PowerPoint)** | Tax planning presentation, year-end financial review | Phase 2 (MVP에서는 제외) |

**구현 상세 사항**

**3.1.2.1 .xlsx 생성 (Python FastAPI)**
- **라이브러리**: `openpyxl`
- **데이터 소스**: Claude가 ClientContext에서 검색한 trial balance, 클라이언트 정보
- **생성 내용**:
  - Sheet 1: Trial Balance (debit/credit columns, 자동 validation)
  - Sheet 2: Financial Statements (Income Statement, Balance Sheet, Cash Flow)
  - Sheet 3: Supporting Schedules (각 GL account의 detail)
  - 클라이언트별 formatting (색상, 폰트, 수식 등)
  - 편집 가능 항목: 조정 분록 input cells는 색상 표시 (yellow = editable)
- **Endpoint**: `POST /api/documents/generate` (Next.js API Route) → `POST http://localhost:8000/api/documents/generate-xlsx` (FastAPI)
- **반환**: 생성된 파일 경로 (예: `/storage/outputs/abc_manufacturing_monthly_statement_2024_12.xlsx`)

**3.1.2.2 .docx 생성 (Python FastAPI)**
- **라이브러리**: `python-docx`
- **생성 내용**:
  - Header: Client name, period, date
  - Section 1: Executive Summary (key metrics)
  - Section 2: Financial Highlights (YoY comparison, variance analysis)
  - Section 3: Detailed Statements
  - Section 4: Notes/Commentary
  - 클라이언트별 branding (로고, 색상, 폰트)
- **클라이언트 선호도 적용**: "Executive Summary 맨 앞" vs. "detailed notes 포함" 등

**3.1.2.3 Email Draft 생성 (Next.js)**
- **Claude Tool Use로 직접 생성**:
  ```
  Tool: draft_email
  Inputs: to (클라이언트 이메일), subject, body content
  Outputs: draft email text (실제 발송 전 사용자가 검토/수정)
  ```
- **예시**:
  - "월별 financial statement 배송 이메일" → 클라이언트별 tone 자동 조절
  - "Tax planning opportunity 제안" → 세부 사항 자동 포함
  - "미수금 안내" → 부드럽고 professional한 톤

---

#### 3.1.3 Context Switching & AI-Managed Multi-Client Orchestration

**목표**: 사용자가 클릭하면 즉시 로드되는 것은 기본이고, **AI가 동시에 전체 200개 클라이언트를 자율적으로 관리**하면서 중요한 변화, 마감, 예외 상황을 자동으로 감지하고 준비해두도록 함.

**AI-Native Agent 특징**
- UI: 사이드바에서 클라이언트 클릭 시 < 500ms 로드 (기존과 동일)
- **백그라운드**: AI가 **사용자가 다른 클라이언트를 보고 있는 동안에도** 나머지 199개 클라이언트를 모니터링
  - QuickBooks 데이터 변경 감지
  - 마감 일정 접근 모니터링
  - 이상 거래 자동 감지
  - 필요한 산출물 자동 준비
- 결과: 사용자가 클라이언트 A를 보고 있을 때, AI는 클라이언트 B, C, D...의 변화를 이미 감지하고 준비 완료

**기능 범위**

| 기능 | 설명 |
|------|------|
| **Client 목록** | 관리 중인 모든 클라이언트 목록 (검색/필터 기능) |
| **Context Card** | 클라이언트별 요약 카드: 기본정보, 최근 업무, 대기 작업, 중요 메트릭 |
| **빠른 로드** | 클릭 시 < 500ms 내에 클라이언트 맥락 전환 (UI 응답성) |
| **검색/필터** | 100+ 클라이언트 중에서 필요한 클라이언트 빠르게 찾기 |

**UI 레이아웃**
```
┌─ 사이드바 (왼쪽) ──────────────────────────┐
│                                            │
│  [검색: "ABC Man..."]                      │
│  ─────────────────────────────────────    │
│  □ ABC Manufacturing (최근 선택)           │
│    - Monthly Statement 대기 중             │
│    - Revenue: $2M                          │
│    - Last update: 2024-12-01               │
│                                            │
│  □ XYZ Services                           │
│    - Tax Return 진행 중 (80%)              │
│    - Revenue: $500K                        │
│    - Last update: 2024-11-28               │
│                                            │
│  □ 123 Real Estate                        │
│    - Quarterly Review 완료                 │
│    - Revenue: $1.5M                        │
│    - Last update: 2024-11-15               │
│                                            │
│  [+ 97 more clients...]                    │
│                                            │
│ ─ Favorites (pinned)                      │
│  □ ★ ABC Manufacturing                    │
│  □ ★ XYZ Services                         │
│                                            │
└────────────────────────────────────────────┘
        ↓ Click → loads main chat area
```

**구현 상세 사항**
- **사이드바 컴포넌트**: `components/layout/sidebar.tsx`
- **Client 목록 API**: `GET /api/clients?userId={userId}&limit=200`
- **Context Card 데이터**: 최근 대화 title, 최근 업무 summary, key metrics
- **선택 상태**: URL parameter로 관리 (예: `/dashboard/chat?clientId=abc-123-def`)

---

#### 3.1.4 Output File Management (산출물 파일 관리 및 버전 컨트롤)

**목표**: 생성된 financial statements, memos, 기타 문서들을 체계적으로 관리하고, 버전 관리 및 클라이언트별 폴더 구조를 제공.

**기능 범위**

| 기능 | 설명 | 예시 |
|------|------|------|
| **클라이언트별 폴더** | 로컬 storage에서 각 클라이언트별 폴더 자동 생성 | `/storage/outputs/abc-manufacturing/` |
| **자동 이름 지정** | 파일명에 클라이언트명, 유형, 날짜 포함 | `abc_manufacturing_monthly_statement_2024_12.xlsx` |
| **버전 관리** | 동일 파일의 v1, v2, v3 등 자동 추적 | `v1`: 초안, `v2`: 클라이언트 feedback 반영, `v3`: final |
| **최신 버전 표시** | `isLatest` 플래그로 최신 파일 표시 | UI에서 "Final v2 (latest)"로 표시 |
| **파일 메타데이터** | 생성자, 생성 prompt, 파일 크기, 생성 시간 저장 | DB Output 테이블에 저장 |
| **다운로드 링크** | 생성된 파일을 사용자가 다운로드/공유 가능 | Claude 응답에 "Download" 버튼 포함 |

**저장 구조** (DB)
```
Output 테이블
├── id: UUID
├── clientId: FK (Client)
├── userId: FK (User)
├── title: "ABC Manufacturing - Monthly Statement"
├── format: "xlsx" | "docx" | "pdf" | "email"
├── filePath: "/storage/outputs/abc-manufacturing/monthly_statement_2024_12_v2.xlsx"
├── fileSizeBytes: 150000
├── version: 2
├── parentOutputId: FK (v1 reference)
├── generatedBy: "Claude + FastAPI"
├── generationPrompt: "Generate monthly financial statement for ABC Manufacturing..."
├── isLatest: true
├── createdAt, updatedAt
```

**파일시스템 구조**
```
/storage/
├── outputs/
│   ├── abc-manufacturing/
│   │   ├── monthly_statement_2024_12_v1.xlsx
│   │   ├── monthly_statement_2024_12_v2.xlsx (isLatest)
│   │   ├── quarterly_review_2024_q4.docx
│   │   └── tax_summary_2024.docx
│   ├── xyz-services/
│   │   ├── financial_statement_2024_11.xlsx
│   │   └── tax_return_2024_draft.xlsx
│   └── ...
├── uploads/
│   ├── abc-manufacturing/
│   │   ├── 2023_tax_return.pdf
│   │   └── bank_statements_2024_11.xlsx
│   └── ...
```

---

#### 3.1.5 AI Agent Dashboard (AI 자율 작업 현황 명령소)

**목표**: AI가 밤새 한 일들을 한눈에 보여주고, 사용자가 준비된 산출물을 검토/승인하거나 이상 알림에 대응하는 Command Center 제공.

**주요 컴포넌트**

| 섹션 | 내용 | 예시 |
|------|------|------|
| **AI가 밤새 발견한 것들** | 이상 거래, 마감 접근, 데이터 변경 | "이상 거래 3건, 마감 접근 12개, 미비 서류 5개" |
| **준비된 산출물** | AI가 생성해둔 초안 파일 목록 | "ABC Manufacturing 월간 재무제표 v1 대기중, XYZ Services 분기 세금 요약 준비됨" |
| **발송 대기 항목** | 클라이언트에게 보낼 이메일, 보고서 | "5개 클라이언트에 재무제표 배송 대기" |
| **이번 주 워크플로우 진행률** | 마감 대상 클라이언트의 진행 상태 | "월말 마감: 완료 61건, AI 작업중 12건, 서류 대기 8건" |
| **팀 워크로드 현황** | 팀원별 담당 업무 밸런스 | "Jennifer: 35건 중 28개 완료, David: 25건 중 20개 완료" |

**UI 레이아웃 예시**
```
┌─ 최상단 ─────────────────────────────────────┐
│  📊 AI의 밤샘 작업 현황                        │
│  ⚠️ 이상 3건  📋 준비된 산출물 8건  📧 발송 5건 │
├────────────────────────────────────────────┤
│  📈 이번 주 마감 진행률: 76% (61/80)         │
│  ✅ 완료 61  🔄 AI 작업중 12  ⏳ 대기 8      │
├────────────────────────────────────────────┤
│  📋 검토 대기 (AI가 준비한 항목)               │
│  □ ABC Manufacturing - 월간 재무제표 v1      │
│    → "검토" 또는 "수정 요청"                   │
│  □ XYZ Services - 분기 세금 요약              │
│    → "승인" 또는 "재생성"                     │
│  □ 123 Real Estate - 리마인더 이메일 3개      │
│    → "발송" 또는 "수정"                       │
├────────────────────────────────────────────┤
│  ⚠️ 주의 필요 항목                            │
│  ⚡ 클라이언트 B: 현금 흐름 경고 (D-60 마이너스 예상) │
│  ⚡ 클라이언트 C: 이상 거래 (평균보다 50% 높음) │
│  ⚡ 클라이언트 D: W-2 미제출 (D-7)            │
└────────────────────────────────────────────┘
```

---

#### 3.1.6 Background Agent Tasks (백그라운드 AI 자율 작업)

**목표**: 사용자가 다른 클라이언트를 보고 있는 동안, AI가 백그라운드에서 자율적으로:
- 모든 클라이언트의 QuickBooks/Xero 데이터 스캔
- 이상 거래 감지
- 마감 일정 모니터링
- 필요한 산출물 사전 준비
- 패턴 학습 및 자동 적용

**구현 상세**
- **Job Scheduler**: Bull/BullMQ (Redis 기반) 또는 Next.js Cron
- **주기**: 
  - 월 1회 (정기적 마감) → 월 초에 자동 실행
  - 분기 1회 (세무 마감) → 분기 초에 자동 실행
  - 지속적 모니터링 (이상 감지) → 1일 1회 또는 on-demand
- **작업 예시**:
  ```
  Daily Job (자정 실행):
  1. 모든 클라이언트의 QB 데이터 폴링
  2. 어제 대비 변화 감지
  3. 임계값 초과 거래 플래그
  4. AI가 발견한 내용을 user feed에 추가
  
  Monthly Job (월 1일 자정 실행):
  1. 지난달 마감 대상 클라이언트 필터링
  2. 각 클라이언트 trial balance 자동 추출
  3. 재무제표 초안 자동 생성
  4. 생성된 파일을 AI Dashboard에 "검토 대기" 상태로 추가
  ```

---

#### 3.1.7 Human-in-the-Loop Approval Queue (사용자 검토/승인 큐)

**목표**: AI가 자율적으로 생성/준비한 항목(산출물, 이메일, 지표)을 사용자가 검토하고 승인/반려할 수 있는 UI 제공.

**주요 기능**

| 상태 | 의미 | 사용자 액션 |
|------|------|----------|
| **Pending Review** | AI가 생성했으나 아직 검토 안 됨 | "검토 중...", "승인", "수정 요청", "재생성" |
| **Approved** | 사용자가 승인함 | 클라이언트에게 발송, 저장, 또는 대기 |
| **Rejected** | 사용자가 반려함 | AI에 피드백 전달, 재생성 예약 |
| **Modified** | 사용자가 수정 후 승인 | 수정 내용 학습, 버전 v2로 저장 |

**UI 흐름 예시**
```
AI가 생성: "ABC Manufacturing 월간 재무제표 v1" (Excel)
   ↓
Dashboard에 표시: "검토 대기" (Pending Review)
   ↓
사용자가 Excel 열어서 확인
   ↓
선택지:
  1. "승인" → 클라이언트에게 발송
  2. "수정 요청" → 피드백 작성 (예: "Executive Summary 추가", "차트 컬러 변경")
  3. "재생성" → 새로운 파라미터로 재생성
  4. "보관" → 일단 저장만 하고 나중에 결정
```

---

### 3.2 P1 - Phase 1 (Solution Validation 이후 4-8주) 추가 기능

#### 3.2.1 QuickBooks/Xero Integration (회계 소프트웨어 연동)

**목표**: QuickBooks Online/Desktop, Xero 등 회계 소프트웨어와 직접 연동하여, 클라이언트별 재무 데이터(trial balance, GL, transactions)를 자동으로 동기화.

**범위**
- **QuickBooks Online API**: OAuth 인증 → 클라이언트별 trial balance, GL, reports 자동 pull
- **Xero API**: 유사하게 재무 데이터 동기화
- **데이터 자동 동기화**: 월 1회 (또는 on-demand)
- **Client Context에 자동 저장**: 최신 재무 데이터가 항상 맥락에 포함되도록

**예상 효과**
- Jennifer Park의 월말 close: 26시간 → 10시간 (60% 단축)
- Data entry 오류 제거 (수동 입력 제거)

---

#### 3.2.2 Tax Season Workflow Automation (세무 시즌 워크플로우 자동화)

**목표**: Jan-Apr 세무 시즌에 David Nguyen 같은 세무 전문가들이 85+ 클라이언트의 tax return을 체계적으로 관리할 수 있도록, 자동화된 워크플로우 제공.

**범위**
- **Tax Return Checklist**: 각 클라이언트별 필요 서류 (1099, receipts, deductions 등) 자동 추적
- **Automated Reminders**: 미수집 서류에 대한 자동 리마인더 이메일 발송
- **Filing Timeline 추적**: Form 1040, Schedule C, tax payment deadline 등을 자동으로 추적
- **Parallel Processing**: Multiple 클라이언트 tax return 동시 진행 상태 대시보드
- **Risk Flagging**: 의외의 항목 (unusual deductions 등) 자동으로 flag

**예상 효과**
- David의 tax season 업무: 월 180시간 → 100시간 (45% 단축)
- 번아웃 완화, 미비한 서류로 인한 filing delay 제거

---

#### 3.2.3 Team Collaboration (팀 협업 기능)

**목표**: 펌 내의 여러 회계사/부기사가 동일 클라이언트에 접근하고 협업할 수 있도록 함 (Maria Santos 같은 senior accountant가 junior에게 작업 위임할 수 있음).

**범위**
- **Team Members 관리**: 펌 내 팀원 초대, 권한 관리
- **Client Access Control**: 어떤 팀원이 어떤 클라이언트에 접근 가능한지 관리
- **Shared Context**: 팀원이 same client에 대해 같은 맥락 정보 접근
- **Collaboration Notes**: 팀원 간에 client-specific notes 공유 (예: "이 클라이언트는 email-only communication 선호")
- **Audit Trail**: 누가 언제 어떤 작업을 했는지 추적 (규정 준수)

---

#### 3.2.4 Scheduled Reports (정기 보고서 생성)

**목표**: 월별, 분기별로 반복되는 보고서를 자동으로 생성하고 클라이언트에게 배포하도록 스케줄링.

**범위**
- **Report Template 정의**: "Monthly Financial Statement for Client A" 템플릿
- **Schedule 설정**: "매월 1일 생성" 등으로 설정
- **Automatic Generation**: 매월 자동으로 새 데이터로 보고서 생성
- **Auto-Distribution**: 완성 후 클라이언트에게 자동 이메일 발송 (또는 client portal에 업로드)

---

### 3.3 P2 - Phase 2 (향후 고도화) 기능

#### 3.3.1 Cross-Client Insights (다클라이언트 통합 분석)

**목표**: 여러 클라이언트의 데이터를 종합하여 업계 벤치마크, anomaly detection, 기회 발굴 등을 제공.

**예시**
- "이번 분기 average revenue growth rate는 12%인데, 클라이언트 X는 -5%입니다. 뭔가 이상할 수 있습니다."
- "비슷한 규모의 클라이언트들 비교: tax efficiency benchmark"
- "Cross-client seasonal patterns: 이 시기엔 보통 cash flow가 tight해집니다"

---

#### 3.3.2 Slack/Gmail Integration (Slack/Gmail 연동)

**목표**: Slack, Gmail을 통해 클라이언트 요청을 받으면, 자동으로 해당 클라이언트 맥락을 로드하고 AI가 응답을 제안하도록 함.

**예시**
```
Slack 메시지:
"@fractional_ai Client ABC의 November financial statement 준비돼?"

AI 응답:
"ABC Manufacturing의 context를 로드했습니다.
Trial balance: $2M, 특수 항목 2개 발견.
Draft statement를 생성하시겠습니까?"
```

---

## 4. 기술 요구사항

### 4.1 스택 (CLAUDE.md 참조)

| 레이어 | 기술 | 버전 |
|--------|------|------|
| Frontend | Next.js (App Router) | 15.3+ |
| Frontend | React | 19.1+ |
| Frontend | Tailwind CSS | v4.1+ |
| Frontend | Shadcn/ui | TBD |
| Frontend | Lucide React | 0.475+ |
| Backend (API) | Next.js API Routes | - |
| Backend (Docs) | Python FastAPI | - |
| Runtime | Node.js | 22 LTS |
| Database | PostgreSQL (로컬) | - |
| ORM | Prisma | 7+ |
| AI | Claude API (Anthropic SDK) | 0.39+ |
| Auth | NextAuth.js (Auth.js v5) | 5+ |
| Storage | 로컬 파일시스템 | - |

### 4.2 API 엔드포인트 (주요)

| Method | 경로 | 설명 |
|--------|------|------|
| POST | `/api/auth/signin` | 로그인 |
| POST | `/api/auth/signup` | 회원가입 |
| POST | `/api/clients` | 새 클라이언트 생성 |
| GET | `/api/clients` | 내 클라이언트 목록 |
| GET | `/api/clients/{id}` | 특정 클라이언트 조회 |
| POST | `/api/clients/{id}/contexts` | 클라이언트 맥락 추가 |
| GET | `/api/clients/{id}/contexts/search` | 클라이언트 맥락 검색 |
| POST | `/api/chat` | 채팅 (SSE streaming) |
| POST | `/api/documents/generate` | 문서 생성 (FastAPI로 위임) |
| GET | `/api/outputs` | 생성된 파일 목록 |
| GET | `/api/outputs/{id}/download` | 파일 다운로드 |

---

## 5. 성공 지표 (KPIs)

### 5.1 기술 성능

| 지표 | 목표 | 측정 방법 |
|------|------|---------|
| **Client context load time** | < 500ms | Network waterfall, browser dev tools |
| **Document generation time** | 5-8 min (5배 향상) | CloudWatch logs, timing metadata |
| **API response time (average)** | < 200ms | Application performance monitoring |
| **System uptime** | > 99.5% | Uptime monitoring service |
| **Background job success rate** | > 99% | Job execution logs |
| **Anomaly detection accuracy** | > 90% | Validation against manual review |

### 5.2 사용자 가치 (AI-Native Agent 성과)

| 지표 | 목표 | 측정 방법 | 영향 |
|------|------|---------|------|
| **AI 사전 준비 산출물 사용률** | > 70% | 사용자가 AI 초안을 수정 없이 사용하는 비율 | AI 자율성 입증 |
| **사용자 검토 후 수정율** | < 20% | 승인 전 수정 요청 비율 | AI 정확성, 신뢰도 |
| **월별 close 시간 감소** | 50%+ (26hr → 13hr) | User survey, time tracking | 생산성 향상, 추가 클라이언트 수용 가능 |
| **클라이언트 용량 증가** | 30%+ (120 → 150+) | Client database count | 수익 증가 ($18K/년 추가) |
| **오류율 감소** | 70% (rework 5-10% → 2%) | QA metrics, user feedback | 클라이언트 만족도, 평판 향상 |
| **신입 온보딩 시간** | 50% 단축 (4-6주 → 2-3주) | HR metrics | 팀 확장성 |
| **팀원 야근 시간** | 50% 감소 | Time tracking, survey | 번아웃 완화, 직원 만족도 |
| **이상 감지 정확도** | > 90% | 감지된 이상 거래 중 실제 문제인 비율 | 리스크 관리 |
| **배경 작업 감지율** | > 95% | AI가 감지해야 할 이상을 감지한 비율 | 자율성 신뢰도 |

### 5.3 비즈니스 메트릭

| 지표 | 목표 | 측정 방법 |
|------|------|---------|
| **User NPS** | 50+ | Quarterly NPS survey |
| **Trial Completion Rate** | > 80% | Analytics (trial start → first doc generation) |
| **Monthly Active Users (MAU)** | 500+ (Phase 2 말) | Product analytics |
| **Churn Rate** | < 5%/month | Subscription data |
| **Customer Acquisition Cost (CAC)** | < $500 | Marketing/sales metrics |
| **Lifetime Value (LTV)** | > $10K | Financial modeling |

---

## 6. GTM (Go-To-Market) 전략

### 6.1 타겟 시장 세그먼트 & AI-Native Agent 포지셔닝

**우선순위 1**: 미국 소규모 회계/세무/부기 펌 (2-10명, 50-200 클라이언트)
- 시장 규모: 35,000개 펌, 210,000명 잠재 사용자
- 문제 심각도: 높음 (context switching, 번아웃, 자동화 부족)
- 구매력: 중간 (SaaS 구독에 익숙함)

**핵심 메시지 (기존 vs. AI-Native Agent)**
- 기존: "AI 도구로 작업을 조금 더 빠르게"
- **우리**: "당신이 일하지 않는 시간에도, AI가 200개 클라이언트를 돌보고 있습니다. 아침에 로그인하면 AI가 밤새 한 일들이 대기 중입니다."

**차별화 포지셔닝**
| 경쟁사 | 패러다임 | 우리 제품 |
|------|--------|-------|
| QuickBooks | 도구 | **AI-Native Agent** |
| TaxDome | 도구 + 자동화 규칙 | **자율 감지, 능동 준비, 패턴 학습** |
| ChatGPT | AI-Assisted (반응형) | **AI-Native Agent (능동형)** |

**우선순위 2**: 중형 펌 (11-50명, 200-500 클라이언트)
- 시장 규모: 5,000개 펌
- 문제 심각도: 높음 (팀 협업 필요)
- 구매력: 높음

### 6.2 마케팅 채널

| 채널 | 전략 | KPI |
|------|------|-----|
| **AICPA (American Institute of CPAs)** | AICPA회원 커뮤니티 활동, webinar 스폰서 | 리드 100+ |
| **CPA Practice Advisor** | 기고 기사: "AI로 accounting practice를 3배 빠르게" | CTR 5%+, 리드 50+ |
| **Accounting Today** | 인터뷰, 사례 연구 ("How Jennifer Park increased client capacity by 30%") | 브랜드 인지도 |
| **Reddit r/Accounting** | Community 참여, AMA (Ask Me Anything) 세션 | Organic traffic 300+/month |
| **LinkedIn** | 타겟 회계사 직접 아웃리치, thought leadership | 리드 20-30/month |
| **Google Ads** | "accounting practice management software", "quickbooks alternative" | CAC < $300 |
| **Email to AICPA contacts** | 리서치 참여자 → Beta 사용자 | 초기 10-15 beta users |

### 6.3 Sales Motion

**Inbound**:
- 웹사이트 demo video, case study
- Free trial (14일) → 가입 유도
- Email onboarding sequence

**Outbound**:
- 리서치 참여 후 beta 프로그램 초대
- 특정 대상 (managing partner, owner)에게 직접 아웃리치
- 관련 이벤트(AICPA, tax conference) 참석

### 6.4 프리싱 (가격 책정)

**추천 가격 모델**: Per-seat, monthly subscription

| 티어 | 사용자 수 | 월간 가격 | 연간 가격 | 특징 |
|------|---------|---------|---------|------|
| **Starter** | 1-2명 | $99/user/month | $1,188/user/year | 기본 기능 (Client context, basic doc gen) |
| **Professional** | 3-10명 | $149/user/month | $1,788/user/year | + Team collaboration, QB integration |
| **Enterprise** | 10+명 | $199/user/month | $2,388/user/year | + Advanced features, API access, priority support |

**수익 모델링 (첫해 보수적 추정)**
- 50개 펌 (평균 4 사용자/펌)
- 평균 $140/user/month (Professional tier)
- 월 수익: 50 × 4 × $140 = $28,000
- 연 수익: $336,000

---

## 7. 로드맵 (Roadmap)

### Phase 0: 문제 검증 (2주, 현재)

**목표**: 타겟 사용자(회계사)들이 정말 문제를 느끼는지, 우리의 해결책이 정말 도움이 될지 검증

**활동**
- [ ] 소규모 회계 펌 10곳 리서치 인터뷰
  - Jennifer Park 같은 Managing Partner 3-4명
  - David Nguyen 같은 Owner 3-4명
  - Maria Santos 같은 Senior Accountant 2-3명
- [ ] 인터뷰 내용 분석 → 문제 정의 정확도 확인
- [ ] 가격 민감도 조사 ("이 솔루션에 얼마까지 낼 수 있나?")
- [ ] Beta 프로그램 초대 대상자 확보 (10명 이상)

**산출물**
- 리서치 보고서 (인터뷰 노트, 주요 발견사항, 가정 검증 결과)
- Beta 프로그램 대상자 리스트

---

### Phase 1: Solution Validation (4주)

**목표**: 핵심 기능(Client Context Memory, Multi-Format Output, Context Switching)의 prototype을 만들어, 실제 회계사들이 사용해보고 feedback을 받음.

**기술 작업 (개발)**
- [ ] NextAuth.js 인증 구현 (로그인/회원가입)
- [ ] Client CRUD API 구현
- [ ] Client Context storage (Prisma + PostgreSQL)
- [ ] Basic document generation (FastAPI + python-docx for .docx, openpyxl for .xlsx)
- [ ] Chat interface + Claude API 연동 (SSE streaming)
- [ ] Sidebar client switching UI
- [ ] File management (upload, download, versioning)

**검증 작업**
- [ ] 3-5개 펌과 prototype 사용 (2주 trial)
- [ ] Weekly feedback session
- [ ] Usability testing (specific user flows)
- [ ] Metric collection (time saved, error reduction 등 정성/정량)

**산출물**
- Functional prototype (core 3개 기능)
- User feedback summary
- Roadmap 조정 (P1, P2 우선순위 재검토)

---

### Phase 2: Beta & First Paying Customers (8주)

**목표**: Beta 프로그램으로 10개 펌을 온보드하고, 실제 사용 데이터를 수집하며, 첫 paying customers 확보.

**기술 작업 (고도화)**
- [ ] P1 기능 중 우선순위 높은 것부터 (예: QB integration, team collaboration)
- [ ] Performance optimization (< 500ms context load)
- [ ] 규정 준수 강화 (audit trail, data encryption)
- [ ] Customer support system (ticketing, docs)

**마케팅/세일스**
- [ ] Beta 프로그램 10개 펌과 계약 (pilot SLA: 2개월)
- [ ] Case study 개발 (1-2개 펌의 성공 사례)
- [ ] Website 정비 (demo video, pricing page, FAQ)
- [ ] Cold outreach 시작 (AICPA, Accounting Today 채널)

**수익 모델**
- Beta: free (또는 50% discount)
- Paying: 3-5개 펌 → $1,000-2,000/month (initial)

**산출물**
- Paying customer 5곳 이상
- Case study 2개
- Refined product (기능 우선순위 재정렬)

---

### Phase 3: Growth & Scale (3-6개월 후)

**목표**: 50-100개 펌으로 expand, 월 $20K+ recurring revenue 달성

**기술**
- [ ] P1 모든 기능 완성 (QB/Xero integration, tax season workflow, team collab)
- [ ] Infrastructure scaling (더 많은 사용자/동시성 지원)
- [ ] Advanced analytics (cross-client insights)

**마케팅**
- [ ] 채널 다각화 (LinkedIn, paid ads, partnerships)
- [ ] Annual accounting conference 참석 (AICPA, NAEA)
- [ ] Case study 4-5개 확보

**산출물**
- Paying customer 50-100곳
- MRR $20K+
- Series A 펀딩 검토 (또는 부수익 기반 성장)

---

## 8. 위험 요소 및 가정 (Risks & Assumptions)

### 8.1 핵심 가정

| 가정 | 검증 방법 |
|------|---------|
| 소규모 회계 펌이 Context Switching Cost를 느낀다 | Phase 0 리서치 인터뷰 |
| 월별 close 시간을 50% 단축할 수 있다 | Phase 1 prototype 측정 |
| $99-199/user/month 가격에 수용적이다 | 리서치 가격 민감도 조사 |
| QuickBooks Online/Desktop API가 쉽게 통합 가능하다 | 초기 API 탐색 |
| 회계사들이 AI 도구에 거부감이 없다 | Phase 1 feedback |
| 규정 준수(audit trail, data privacy) 구현이 가능하다 | 법무 자문 + 초기 구현 |

### 8.2 주요 위험 요소

| 위험 | 영향 | 완화 전략 |
|------|------|---------|
| **회계사의 AI 신뢰도 낮음** | 채택 지연 | Phase 1에서 신뢰도 구축 (정확성, 감사 추적), case study |
| **QuickBooks API 복잡성** | 통합 지연 | 초기 API 탐색, 필요시 초기엔 manual integration만 제공 |
| **규정 준수 요구사항** | 법적 문제 | 초기부터 data privacy, audit trail 설계, 법무 검토 |
| **경쟁사 출현** | 시장 점유율 감소 | 빠른 MVP 출시, strong product-market fit 확보 |
| **고객 이탈** | 수익 하락 | Strong onboarding, customer support, continuous improvement |
| **기술 스택 선택 후회** | 개발 지연 | CLAUDE.md에서 확정한 스택으로 진행, 팀 역량 재확인 |

---

## 9. 참조 및 부록

### 9.1 데이터 소스

- AICPA 통계: "2024 Small Firm Survey"
- Bureau of Labor Statistics: Accounting & Bookkeeping 분야 데이터
- 내부 리서치 (Phase 0)

### 9.2 관련 문서

| 문서 | 위치 |
|------|------|
| 기획서 (비전, 전략) | `Fractional_AI_Command_Center_기획서.md` |
| 아키텍처 | `docs/architecture/ARCHITECTURE.md` |
| 사용자 시나리오 | `docs/product/USER-SCENARIOS.md` |
| 개발 가이드 | `CLAUDE.md` |

### 9.3 용어 정의

| 용어 | 정의 |
|------|------|
| **Client Context** | 각 클라이언트의 재정 데이터, 문서, 선호도, 최근 대화 등 종합 정보 |
| **Context Switching** | 한 클라이언트에서 다른 클라이언트로 작업을 전환하는 과정 (시간, 인지 비용 발생) |
| **Trial Balance** | 회계 장부에서 추출한 모든 계정의 debit/credit 합계 |
| **GL (General Ledger)** | 회계 기록의 기본이 되는 계정별 거래 기록 |
| **Financial Statement** | 재무제표 (Income Statement, Balance Sheet, Cash Flow Statement) |
| **Tax Return** | 세금 신고서 (Form 1040, Schedule C 등) |
| **Monthly Close** | 매월 말 재무 정산 및 보고서 작성 프로세스 |
| **QB (QuickBooks)** | Intuit의 회계 소프트웨어 |
| **Estimated Tax** | 분기별로 미리 내는 예상 세금 (예: Q1 estimated tax payment) |

---

## 10. 변경 이력

| 날짜 | 변경 사항 | 작성자 |
|------|---------|--------|
| 2024-12-15 | 초안 작성 (Fractional Executive 기반) | Product team |
| 2025-04-06 | Strategic pivot to Small Accounting Firms | Claude + Product team |

---

**최종 검수 일시**: 2025-04-06
**문서 상태**: Draft (Phase 0 검증 대기)
**다음 리뷰**: Phase 0 리서치 완료 후 (2주 후)
