# Fractional AI Command Center — 기술 아키텍처

**문서 버전**: 2.0
**작성일**: 2026년 4월 6일
**상태**: 확정 — CLAUDE.md와 AI-NATIVE-AGENT-PHILOSOPHY.md를 기준으로 재작성

> **중요**: 이 문서는 시스템의 기술적 청사진입니다. 모든 결정은 CLAUDE.md와 AI-Native Agent 철학에 기반합니다.
> 이전 문서에서 언급된 Supabase 기술은 이 문서에서 제거되었습니다. 대신 로컬 PostgreSQL + Prisma + NextAuth.js를 사용합니다.

---

## 1. 시스템 개요

### 1.1 비전: AI-Native Agent 플랫폼

**이 제품은 "AI가 붙은 도구"가 아니라, "AI가 주체인 에이전트"입니다.**

- 사용자가 요청하지 않아도, AI는 자율적으로 200개의 클라이언트를 모니터링합니다.
- AI는 이상을 감지하고, 산출물을 미리 준비하고, 워크플로우를 능동적으로 오케스트레이션합니다.
- 사용자는 AI가 준비한 결과를 검토·승인·수정하는 전문적 판단에 집중합니다.

이것이 기존의 모든 회계/세무 도구(QuickBooks, TaxDome, Karbon)와의 근본적 차이점입니다.

### 1.2 고수준 아키텍처 — 3계층 모델

```
┌──────────────────────────────────────────────────────────────────────┐
│                     Human Interface Layer                             │
│  Next.js 15 (App Router) + React 19 (Server Components)             │
│  ┌────────────┬───────────────────┬──────────────────┐               │
│  │ Command    │ Approval          │ Client Workspace │               │
│  │ Center     │ Queue             │ + Chat           │               │
│  │ Dashboard  │ (High-Risk Ops)   │ (Deep Dive)      │               │
│  └────────────┴───────────────────┴──────────────────┘               │
│  SSE (Real-time Updates) / REST API                                 │
└─────────────────────────┬──────────────────────────────────────────┘
                          │
┌─────────────────────────▼──────────────────────────────────────────┐
│                Agent Orchestration Layer                            │
│  (Background Jobs, AI Autonomous Execution)                        │
│  ┌─────────────┬──────────────┬───────────────┬──────────────┐    │
│  │ Scheduler   │ Agent Runner │ Pattern       │ Approval     │    │
│  │ (Cron/     │ (Claude API) │ Learner       │ Queue Mgr    │    │
│  │ Background) │              │               │              │    │
│  ├─────────────┴──────────────┴───────────────┴──────────────┤    │
│  │ QB Scanner Agent: 6시간마다 QuickBooks 폴링 + 이상 감지  │    │
│  │ Close Prep Agent: 마감 일정 접근 시 재무제표 초안 생성    │    │
│  │ Tax Tracker Agent: 세무 시즌 서류 수집 상태 추적         │    │
│  │ Comms Agent: 자동 리마인더 이메일 초안 생성            │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │ Orchestration: Priority Manager, Budget Controller       │    │
│  │ Audit Logger: 모든 AI 판단/행동 감사 추적              │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────┬──────────────────────────────────────────┘
                          │
┌─────────────────────────▼──────────────────────────────────────────┐
│                Data & Integration Layer                             │
│  ┌──────────────┬────────────────┬──────────────────┐              │
│  │ PostgreSQL   │ File Storage   │ External APIs    │              │
│  │ (Prisma ORM) │ (local/S3)     │ (QuickBooks,     │              │
│  │ + pgvector   │                │  Xero, etc.)     │              │
│  └──────────────┴────────────────┴──────────────────┘              │
│  Python FastAPI (문서 생성만 담당)                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 1.3 핵심 차이점: 기존 도구 vs. AI-Native Agent

| 관점 | Traditional Tool | AI-Assisted Tool | **AI-Native Agent** |
|------|-----------------|------------------|-------------------|
| **자율성** | 사용자가 모든 것을 입력 | 사용자 요청 시만 반응 | **AI가 자율적으로 감지/행동** |
| **초기화** | 사용자가 시작 | 사용자가 시작 | **AI가 배경에서 지속 실행** |
| **데이터 모니터링** | 없음 | 없음 | **지속적 모니터링 → 이상 감지** |
| **산출물 준비** | 사용자 요청 후 생성 | 사용자 요청 후 생성 | **미리 준비 → 승인만 필요** |
| **패턴 학습** | 없음 | 없음 | **사용자 판단 학습 → 자동 적용** |
| **워크플로우 관리** | 사용자가 관리 | 사용자가 관리 | **AI가 전체 오케스트레이션** |

---

## 2. 핵심 컴포넌트 상세 설계

### 2.1 Human Interface Layer (Next.js 15 + React 19)

#### 2.1.1 주요 페이지 및 콤포넌트

**Command Center Dashboard** (`/dashboard`)
- AI가 밤새 발견한 것들을 먼저 표시
  - 이상 거래: 2건
  - 준비된 산출물: 8건
  - 발송 대기 이메일: 3건
  - 마감 접근 클라이언트: 5건
- 이번 주 워크플로우 진행률 (시각화: 완료 61%, 진행 중 22%, 대기 17%)
- 클라이언트 목록 (검색/필터)

**Approval Queue UI** (`/approval-queue`)
- 상태별 필터: pending_review | approved | rejected | modified
- 우선순위 정렬 (deadline 접근도 × 이상 심각도 × 클라이언트 중요도)
- 각 항목별:
  - 미리보기: 생성된 문서/이메일 초안 표시
  - AI의 설명: "왜 이것을 만들었는가"
  - 승인/거절/수정 옵션
  - 수정 시: 패턴 학습 (자동 규칙 생성)

**Client Workspace** (`/dashboard/client/[clientId]`)
- 좌측 사이드바: 클라이언트 정보 + 최근 활동 + 대기 작업
- 중앙: 채팅 인터페이스 (특정 클라이언트 심층 작업용)
- 우측: 최근 문서/대화 히스토리

**Settings & Configuration** (`/settings`)
- 사용자 계정 설정
- 에이전트 규칙 관리 (자동 학습된 규칙 검증)
- 모니터링 알림 설정

#### 2.1.2 Real-time Communication

**Server-Sent Events (SSE)**
- 배경 에이전트가 새로운 발견을 만들면, 클라이언트에 실시간으로 푸시
- 예: 이상 거래 감지 → 대시보드에 즉시 나타남
- 경로: `/api/sse/subscribe` → SSE 이벤트 스트림

**WebSocket** (Phase 2)
- 채팅에서 Claude 스트리밍 응답 → 실시간 표시

#### 2.1.3 인증 및 권한

**NextAuth.js v5 (Auth.js)**
- 제공자:
  - Email/Password (로컬 DB)
  - Google OAuth
- 세션 기반 사용자 식별
- Next.js 미들웨어로 보호 라우트 강제

**권한 검사 패턴**
```typescript
// 모든 API 엔드포인트에서 적용
const session = await getServerSession(authOptions);
if (!session) throw new Error("Unauthorized");

// 클라이언트 접근 시: userId 필터 필수
const client = await prisma.client.findFirst({
  where: {
    id: clientId,
    userId: session.user.id  // 데이터 격리
  }
});
if (!client) throw new Error("Not found");
```

---

### 2.2 Agent Orchestration Layer — 자율 실행 계층

**이것이 AI-Native Agent를 실현하는 핵심입니다.**

#### 2.2.1 Scheduler (배경 작업 시스템)

**기술 선택: node-cron (MVP) → Bull + Redis (Phase 1)**

MVP에서는 복잡성을 피하기 위해 `node-cron` 사용. Next.js 서버 시작 시 백그라운드 작업 등록.

```typescript
// src/lib/scheduler.ts
import cron from 'node-cron';
import { runQBScannerAgent } from './agents/qb-scanner';
import { runClosePreepAgent } from './agents/close-prep';

export function initializeScheduler() {
  // QB 데이터 스캔: 매 6시간
  cron.schedule('0 */6 * * *', async () => {
    console.log('QB Scanner Agent triggered');
    await runQBScannerAgent();
  });

  // 마감 대비: 매일 오전 9시
  cron.schedule('0 9 * * *', async () => {
    console.log('Close Prep Agent triggered');
    await runClosePrepAgent();
  });

  // 이상 거래 감지: 매 2시간
  cron.schedule('0 */2 * * *', async () => {
    console.log('Anomaly Detector triggered');
    await runAnomalyDetectorAgent();
  });

  console.log('✓ Background scheduler initialized');
}

// app/layout.tsx 또는 Next.js 시작 시점
if (process.env.NODE_ENV === 'production') {
  initializeScheduler();
}
```

**Scheduled Jobs (MVP 단계)**

| 작업 | 주기 | 담당 Agent | 목표 |
|------|------|-----------|------|
| QB 데이터 폴링 | 6시간 | QB Scanner | QuickBooks 최신 거래 가져오기 |
| 이상 거래 감지 | 2시간 | Anomaly Detector | threshold 초과, 미분류, 중복 플래그 |
| 마감 준비 | 매일 09:00 | Close Prep | 월말/분기말 재무제표 초안 생성 |
| 리마인더 발송 | 매일 17:00 | Comms Agent | 서류 미제출 클라이언트에 이메일 초안 |
| 팀 워크로드 | 매일 08:00 | Workload Balancer | 직원별 업무 불균형 감지 (Phase 1) |

#### 2.2.2 Agent Runner — AI 자율 실행 엔진

각 배경 에이전트는 Claude API를 호출하여 자율적으로 판단하고 실행합니다.

**아키텍처**

```typescript
// src/lib/agents/base-agent.ts
import { Anthropic } from '@anthropic-ai/sdk';

interface AgentContext {
  clientId: string;
  userId: string;
  agentType: string;
  timeframeMs?: number;
}

interface AgentResult {
  status: 'success' | 'error' | 'no_action';
  findings: unknown[];
  deliverable?: {
    type: 'financial_statement' | 'email_draft' | 'alert';
    content: unknown;
    confidence: number;
  };
  auditLog: string;
}

export async function runBackgroundAgent(
  context: AgentContext,
  systemPrompt: string,
  userPrompt: string
): Promise<AgentResult> {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const startTime = Date.now();

  try {
    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    // 응답 파싱 및 구조화
    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const findings = parseAgentResponse(content.text);

    // 결과를 AgentTask에 저장
    await prisma.agentTask.create({
      data: {
        clientId: context.clientId,
        agentType: context.agentType,
        status: 'completed',
        input: userPrompt,
        output: findings,
        completedAt: new Date(),
      },
    });

    // 고위험 산출물이 있으면 ApprovalItem에 추가
    if (findings.deliverable) {
      await createApprovalItem(
        context.clientId,
        context.userId,
        findings.deliverable
      );
    }

    // 감사 로그
    await prisma.auditLog.create({
      data: {
        clientId: context.clientId,
        agentType: context.agentType,
        action: 'agent_execution_completed',
        details: {
          findings: findings.summary,
          executionTimeMs: Date.now() - startTime,
          resultCount: findings.items?.length || 0,
        },
      },
    });

    return {
      status: 'success',
      findings: findings.items || [],
      deliverable: findings.deliverable,
      auditLog: `Agent execution completed in ${Date.now() - startTime}ms`,
    };
  } catch (error) {
    console.error(`Agent error: ${error}`);
    await prisma.auditLog.create({
      data: {
        clientId: context.clientId,
        agentType: context.agentType,
        action: 'agent_execution_failed',
        details: { error: String(error) },
      },
    });

    return {
      status: 'error',
      findings: [],
      auditLog: `Agent execution failed: ${error}`,
    };
  }
}
```

**System Prompt 구성 (예: QB Scanner Agent)**

```
You are the QB Scanner Agent for ${firm_name}.

Your role: Monitor QuickBooks data for ${client_name} and detect anomalies.

Context about this client:
- Industry: ${client.industry}
- Monthly Revenue: $${client.avgMonthlyRevenue}
- Account Categories: ${categories.join(', ')}
- Previous Anomalies: ${previousAnomalies}

Current QuickBooks Data (last 7 days):
${qbTransactions}

Task:
1. Scan all transactions for:
   - Uncategorized entries (category = null)
   - Threshold violations (e.g., single transaction > 10% of monthly avg)
   - Duplicate transactions (same amount, description, date within 1 day)
   - Out-of-pattern entries (e.g., unusual vendor)

2. For each anomaly, classify severity: high | medium | low

3. Output JSON format:
   {
     "anomalies": [
       { "id": "txn_123", "type": "uncategorized", "severity": "high", "suggestion": "..." }
     ],
     "summary": "2 high-severity, 3 medium",
     "needs_approval": false
   }

Do not make assumptions about categorization. Flag for human review.
```

#### 2.2.3 Pattern Learner (패턴 학습 및 자동 규칙)

**MVP: Rule-based Pattern Detection**

사용자가 Approval Queue에서 항목을 승인할 때, AI는 패턴을 학습합니다.

```typescript
// src/lib/pattern-learner.ts
import prisma from '@/lib/prisma';

interface UserCorrection {
  approvalItemId: string;
  originalSuggestion: unknown;
  userModification: unknown;
  clientId: string;
  userId: string;
  category: string; // 'categorization' | 'formatting' | 'communication_tone'
}

export async function learnPattern(correction: UserCorrection) {
  // 1. 패턴 유사도 계산
  const similarity = calculateSimilarity(
    correction.originalSuggestion,
    correction.userModification
  );

  // 2. 이전 같은 패턴이 있는지 확인
  const existingRules = await prisma.agentRule.findMany({
    where: {
      clientId: correction.clientId,
      ruleType: correction.category,
      condition: {
        // 유사한 조건 검색
      },
    },
  });

  // 3. 새 규칙이거나 기존 규칙 강화
  if (existingRules.length === 0) {
    // 새 규칙 생성
    await prisma.agentRule.create({
      data: {
        clientId: correction.clientId,
        userId: correction.userId,
        ruleType: correction.category,
        condition: correction.originalSuggestion,
        action: correction.userModification,
        confidence: 0.5, // 첫 발견은 낮은 신뢰도
        appliedCount: 1,
      },
    });
  } else {
    // 기존 규칙 강화
    await prisma.agentRule.update({
      where: { id: existingRules[0].id },
      data: {
        appliedCount: {
          increment: 1,
        },
        confidence: Math.min(0.95, existingRules[0].confidence + 0.1),
      },
    });
  }

  // 4. 신뢰도 > 0.8인 규칙은 자동 적용
  const highConfidenceRules = await prisma.agentRule.findMany({
    where: {
      clientId: correction.clientId,
      confidence: { gte: 0.8 },
    },
  });

  // 다음 번 같은 상황에서 이 규칙 자동 적용
  // (Agent Runner에서 출력 생성 후 이 규칙 검사)
}

function calculateSimilarity(obj1: unknown, obj2: unknown): number {
  // 간단한 JSON 유사도 계산
  // Phase 2: ML 기반 유사도 모델로 전환
  return 0.5; // TODO: 구현
}
```

**Phase 2: ML-based Pattern Detection**
- 사용자의 반복적 수정을 벡터로 변환 → 클러스터링
- 자동으로 패턴 검출 → 신뢰도 계산
- 식당 클라이언트 간 교차 학습 ("식자재 비용 분류" 패턴)

#### 2.2.4 Approval Queue Manager

**상태 흐름**

```
pending_review → approved (또는 rejected / modified)
     ↓
  (if modified: learn pattern)
     ↓
  (if approved: execute / create Output)
```

**우선순위 계산**

```typescript
interface ApprovalItemPriority {
  itemId: string;
  urgencyScore: number; // 0~100
  components: {
    deadlineProximity: number;   // D-day까지 남은 시간 기반
    anomalySeverity: number;     // 이상 거래 심각도
    clientImportance: number;    // 클라이언트 ARR / 총 ARR
  };
}

export function calculateItemPriority(item: ApprovalItem): number {
  const deadlineDaysLeft = calculateDaysUntilDeadline(item);
  const deadlineProximity = Math.max(0, 100 - deadlineDaysLeft * 10);

  const anomalySeverity = item.type === 'anomaly_alert'
    ? (item.content as any).severity === 'high'
      ? 80
      : 40
    : 20;

  const clientImportance = (item.client.annualRevenue / totalAnnualRevenue) * 100;

  // 가중치 조합
  return (
    deadlineProximity * 0.4 +
    anomalySeverity * 0.35 +
    clientImportance * 0.25
  );
}
```

**Batch Operations**
```typescript
// 마감이 1주일 이상 남은, 低우선순위 항목들을 한 번에 승인
// (사용자가 우선순위 기반 필터링 후, "모두 승인" 버튼 클릭)
const routineItems = await prisma.approvalItem.findMany({
  where: {
    status: 'pending_review',
    priority: { lt: 30 },
  },
  orderBy: { createdAt: 'asc' },
});

// 사용자 확인 UI: "Low-priority 12건을 일괄 승인하시겠습니까?"
// 사용자 확인 → 자동으로 모두 처리
```

#### 2.2.5 Audit Logger (감사 추적)

회계/세무 규제 대응을 위해, AI의 모든 판단과 행동을 기록합니다.

```typescript
// src/lib/audit-logger.ts
import prisma from '@/lib/prisma';

interface AuditEvent {
  clientId?: string;
  userId?: string;
  agentType?: string;
  action: string; // 'agent_detection' | 'approval_item_created' | 'user_approved' | etc.
  details: Record<string, unknown>;
}

export async function logAuditEvent(event: AuditEvent) {
  await prisma.auditLog.create({
    data: {
      clientId: event.clientId,
      userId: event.userId,
      agentType: event.agentType,
      action: event.action,
      details: event.details,
      createdAt: new Date(),
    },
  });
}

// 예시: QB 이상 거래 감지
await logAuditEvent({
  clientId: 'client_123',
  agentType: 'anomaly_detector',
  action: 'anomaly_detected',
  details: {
    transactionId: 'txn_456',
    amount: 5000,
    category: 'uncategorized',
    suggestedCategory: 'Office Supplies',
    detectionReason: 'uncategorized_threshold',
  },
});

// 예시: 사용자 승인
await logAuditEvent({
  clientId: 'client_123',
  userId: 'user_789',
  action: 'approval_item_approved',
  details: {
    approvalItemId: 'approval_123',
    itemType: 'anomaly_alert',
    approvedAt: new Date().toISOString(),
  },
});
```

**감사 로그 쿼리 (규제 대응)**
```typescript
// 특정 기간 동안 클라이언트에 대해 AI가 한 모든 행동 추적
const auditTrail = await prisma.auditLog.findMany({
  where: {
    clientId: 'client_123',
    createdAt: {
      gte: new Date('2026-01-01'),
      lte: new Date('2026-03-31'),
    },
  },
  orderBy: { createdAt: 'asc' },
});

// 감사 리포트 생성
console.log(`AI가 ${auditTrail.length}개의 판단을 기록했습니다.`);
auditTrail.forEach((log) => {
  console.log(`- ${log.createdAt}: ${log.action} (신뢰도: ${log.details.confidence})`);
});
```

---

### 2.3 Conversational AI Layer (사용자 주도 채팅)

**AI-Native Agent 시스템에서 채팅은 보조 인터페이스입니다.**

사용자가 특정 클라이언트에 대해 심층적 질문이나 작업이 필요할 때만 사용합니다.

#### 2.3.1 Chat Flow

```
사용자 메시지 → Next.js API Route (/api/chat)
  → 세션 검증 + 클라이언트 권한 확인
  → 클라이언트 맥락 로드 (Client Profile + Recent Findings)
  → System Prompt 구성
  → Claude API 스트리밍 호출
  → SSE로 프론트엔드에 실시간 전송
  → Conversation + ConversationMessage DB에 저장
```

#### 2.3.2 System Prompt Builder

```typescript
// src/lib/claude/system-prompt.ts
import prisma from '@/lib/prisma';

interface ChatSystemPromptInput {
  clientId: string;
  userId: string;
  clientContext: ClientContext[];
  recentFindingsFromAgents: AgentTask[];
}

export async function buildChatSystemPrompt(
  input: ChatSystemPromptInput
): Promise<string> {
  const client = await prisma.client.findUnique({
    where: { id: input.clientId },
  });

  if (!client) throw new Error('Client not found');

  const agentFindings = input.recentFindingsFromAgents
    .slice(0, 5)
    .map(
      (task) =>
        `- [${task.agentType}] ${(task.output as any).summary || 'No summary'}`
    )
    .join('\n');

  const contextKnowledge = input.clientContext
    .slice(0, 10)
    .map((ctx) => `- ${ctx.title}: ${ctx.content.substring(0, 200)}`)
    .join('\n');

  return `
당신은 ${client.name}의 AI 어시스턴트입니다.

【클라이언트 프로필】
- 회사명: ${client.name}
- 산업: ${client.industry}
- 역할: ${client.userRole}
- 관계 기간: ${client.relationshipMonths}개월
- 선호도: ${JSON.stringify(client.preferences)}

【AI가 최근 발견한 것들】
${agentFindings || '(특이사항 없음)'}

【클라이언트 지식 베이스】
${contextKnowledge}

【당신의 역할】
1. 이 클라이언트의 비즈니스와 재무 상황을 깊이 이해하고 조언 제공
2. 이전 대화와 결정을 참고하여 일관성 유지
3. 이상 거래나 리스크를 감지하면 사용자에게 경고
4. 필요시 문서 생성 도구 사용 (docx, xlsx, email_draft)
5. 규제/법률 판단은 절대 하지 않음 — 전문가에게만 의존

【Tool 사용】
필요한 경우 다음 도구를 사용할 수 있습니다:
- generate_document: docx/xlsx 문서 생성
- search_knowledge_base: 클라이언트 지식 검색
- draft_email: 이메일 초안 생성

【대화 톤】
- 전문적이고 명확함
- 수치와 근거 기반
- 클라이언트의 입장에서 사고
`;
}
```

#### 2.3.3 Tool Use (Claude Tool Definitions)

**3개의 Tool 정의**

```typescript
// src/lib/claude/tools.ts
import { Tool } from '@anthropic-ai/sdk/resources/messages';

export const chatTools: Tool[] = [
  {
    name: 'generate_document',
    description:
      '클라이언트를 위한 재무 문서, 세무 요약, 이메일 등을 생성합니다.',
    input_schema: {
      type: 'object',
      properties: {
        format: {
          type: 'string',
          enum: ['docx', 'xlsx', 'email_draft'],
          description: '문서 형식',
        },
        title: {
          type: 'string',
          description: '문서 제목',
        },
        sections: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              heading: { type: 'string' },
              content: { type: 'string' },
            },
          },
          description: '문서 섹션 (제목 + 내용)',
        },
      },
      required: ['format', 'title', 'sections'],
    },
  },
  {
    name: 'search_knowledge_base',
    description: '클라이언트의 지식 베이스에서 관련 정보를 검색합니다.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '검색 쿼리 (예: "지난 달 마진율")',
        },
        category: {
          type: 'string',
          enum: ['financial', 'operational', 'regulatory', 'general'],
          description: '검색 범주 (선택)',
        },
        limit: {
          type: 'integer',
          description: '반환할 결과 수 (기본값: 5)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'draft_email',
    description:
      '클라이언트를 위한 이메일 초안을 생성합니다. (발송은 사용자 승인 후)',
    input_schema: {
      type: 'object',
      properties: {
        to: {
          type: 'string',
          description: '수신자 이메일 주소',
        },
        subject: {
          type: 'string',
          description: '이메일 제목',
        },
        body: {
          type: 'string',
          description: '이메일 본문 (HTML 또는 plain text)',
        },
        cc: {
          type: 'array',
          items: { type: 'string' },
          description: '참조 목록 (선택)',
        },
      },
      required: ['to', 'subject', 'body'],
    },
  },
];
```

#### 2.3.4 Streaming Chat Handler

```typescript
// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Anthropic } from '@anthropic-ai/sdk';
import { buildChatSystemPrompt } from '@/lib/claude/system-prompt';
import { chatTools } from '@/lib/claude/tools';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { clientId, conversationId, messageContent } = await request.json();

  // 권한 검증
  const client = await prisma.client.findFirst({
    where: {
      id: clientId,
      userId: session.user.id,
    },
  });
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // 대화 세션 로드 또는 생성
  let conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });
  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        clientId,
        userId: session.user.id,
        title: `Chat with ${client.name}`,
      },
    });
  }

  // 최근 메시지 로드
  const recentMessages = await prisma.conversationMessage.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  // System Prompt 구성
  const recentFindings = await prisma.agentTask.findMany({
    where: { clientId },
    orderBy: { completedAt: 'desc' },
    take: 5,
  });

  const contexts = await prisma.clientContext.findMany({
    where: { clientId },
    orderBy: { isPinned: 'desc', createdAt: 'desc' },
    take: 10,
  });

  const systemPrompt = await buildChatSystemPrompt({
    clientId,
    userId: session.user.id,
    clientContext: contexts,
    recentFindingsFromAgents: recentFindings,
  });

  // Claude API 호출 (스트리밍)
  const client_anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const stream = await client_anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    system: systemPrompt,
    tools: chatTools,
    messages: [
      ...recentMessages
        .reverse()
        .map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
      { role: 'user', content: messageContent },
    ],
    stream: true,
  });

  // SSE 응답 스트림
  const encoder = new TextEncoder();
  return new NextResponse(
    (async function* generate() {
      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          yield encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
        }
      }
    })(),
    {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    }
  );
}
```

---

### 2.4 Document Generation Engine (Python FastAPI)

문서 생성은 **Python FastAPI에서만** 처리됩니다. Next.js API Routes에서 직접 호출하지 않습니다.

#### 2.4.1 FastAPI 서버 구조

```
backend/
├── app/
│   ├── main.py                 # FastAPI 앱 엔트리
│   ├── routers/
│   │   └── documents.py        # 문서 생성 엔드포인트
│   └── services/
│       ├── docx_generator.py   # .docx 생성 로직
│       ├── xlsx_generator.py   # .xlsx 생성 로직
│       └── storage.py          # 파일 저장 (로컬/S3)
├── requirements.txt
└── Dockerfile
```

#### 2.4.2 API Endpoint

```python
# backend/app/routers/documents.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from docx import Document
from openpyxl import Workbook
import json

router = APIRouter(prefix="/api/documents", tags=["documents"])

class DocumentRequest(BaseModel):
    format: str  # 'docx' | 'xlsx'
    title: str
    sections: list[dict]  # [{"heading": str, "content": str}, ...]
    clientId: str

class DocumentResponse(BaseModel):
    filePath: str
    fileName: str
    fileSizeBytes: int

@router.post("/generate", response_model=DocumentResponse)
async def generate_document(req: DocumentRequest):
    """
    사용자 또는 배경 에이전트의 요청으로 문서를 생성합니다.
    """
    if req.format == "docx":
        return generate_docx(req)
    elif req.format == "xlsx":
        return generate_xlsx(req)
    else:
        raise HTTPException(status_code=400, detail="Invalid format")

def generate_docx(req: DocumentRequest) -> DocumentResponse:
    """
    Python-docx를 사용하여 .docx 문서 생성
    """
    doc = Document()
    doc.add_heading(req.title, level=1)

    for section in req.sections:
        doc.add_heading(section['heading'], level=2)
        doc.add_paragraph(section['content'])

    # 파일 저장
    fileName = f"{req.clientId}_{req.title.replace(' ', '_')}.docx"
    filePath = f"storage/outputs/{fileName}"

    doc.save(filePath)

    return DocumentResponse(
        filePath=filePath,
        fileName=fileName,
        fileSizeBytes=os.path.getsize(filePath),
    )

def generate_xlsx(req: DocumentRequest) -> DocumentResponse:
    """
    openpyxl을 사용하여 .xlsx 스프레드시트 생성
    """
    wb = Workbook()
    ws = wb.active
    ws.title = "Data"

    ws['A1'] = req.title

    row = 3
    for section in req.sections:
        ws[f'A{row}'] = section['heading']
        ws[f'B{row}'] = section['content']
        row += 1

    fileName = f"{req.clientId}_{req.title.replace(' ', '_')}.xlsx"
    filePath = f"storage/outputs/{fileName}"

    wb.save(filePath)

    return DocumentResponse(
        filePath=filePath,
        fileName=fileName,
        fileSizeBytes=os.path.getsize(filePath),
    )
```

#### 2.4.3 Next.js에서 FastAPI 호출

```typescript
// src/app/api/documents/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { format, title, sections, clientId } = await request.json();

  // FastAPI 서버 호출
  const response = await fetch(`${process.env.DOCUMENT_SERVICE_URL}/api/documents/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      format,
      title,
      sections,
      clientId,
    }),
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: 'Document generation failed' },
      { status: 500 }
    );
  }

  const result = await response.json();

  // Output 메타데이터를 DB에 저장
  await prisma.output.create({
    data: {
      clientId,
      userId: session.user.id,
      title,
      format,
      filePath: result.filePath,
      fileSizeBytes: result.fileSizeBytes,
      generatedBy: 'ai_agent_or_user',
    },
  });

  return NextResponse.json(result);
}
```

---

### 2.5 Data & Integration Layer

#### 2.5.1 PostgreSQL + Prisma ORM

**데이터 스키마** (CLAUDE.md에서 가져옴)

기존 모델:
- User, Account, Session
- Client, ClientContext
- Conversation, ConversationMessage
- Output, FileUpload

**새로운 모델 (Agent System)**

```prisma
// src/lib/prisma/schema.prisma 에 추가

model AgentTask {
  id          String   @id @default(uuid())
  clientId    String   @map("client_id")
  agentType   String   @map("agent_type")  // 'qb_scanner' | 'close_prep' | 'anomaly_detector' | 'comms_drafter'
  status      String   @default("pending") // 'pending' | 'running' | 'completed' | 'failed'
  input       Json     @default("{}")
  output      Json     @default("{}")
  startedAt   DateTime? @map("started_at")
  completedAt DateTime? @map("completed_at")
  createdAt   DateTime @default(now()) @map("created_at")

  client Client @relation(fields: [clientId], references: [id], onDelete: Cascade)

  @@index([clientId])
  @@index([status])
  @@map("agent_tasks")
}

model ApprovalItem {
  id            String   @id @default(uuid())
  clientId      String   @map("client_id")
  userId        String   @map("user_id")
  type          String   // 'financial_statement' | 'tax_summary' | 'email_draft' | 'anomaly_alert'
  title         String
  status        String   @default("pending_review") // 'pending_review' | 'approved' | 'rejected' | 'modified'
  priority      Int      @default(0)
  aiConfidence  Float?   @map("ai_confidence")
  content       Json     // the actual deliverable
  aiNotes       String?  @map("ai_notes")
  reviewerNotes String?  @map("reviewer_notes")
  reviewedAt    DateTime? @map("reviewed_at")
  createdAt     DateTime @default(now()) @map("created_at")

  client Client @relation(fields: [clientId], references: [id], onDelete: Cascade)
  user   User   @relation(fields: [userId], references: [id])

  @@index([clientId])
  @@index([status])
  @@map("approval_items")
}

model AgentRule {
  id          String   @id @default(uuid())
  clientId    String?  @map("client_id")  // null = global rule
  userId      String   @map("user_id")
  ruleType    String   @map("rule_type")  // 'categorization' | 'formatting' | 'communication_tone'
  condition   Json     // when to apply
  action      Json     // what to do
  confidence  Float    @default(0.5)
  appliedCount Int     @default(0) @map("applied_count")
  createdAt   DateTime @default(now()) @map("created_at")

  client Client? @relation(fields: [clientId], references: [id])
  user   User    @relation(fields: [userId], references: [id])

  @@index([clientId])
  @@map("agent_rules")
}

model AuditLog {
  id          String   @id @default(uuid())
  clientId    String?  @map("client_id")
  userId      String?  @map("user_id")
  agentType   String?  @map("agent_type")
  action      String
  details     Json     @default("{}")
  createdAt   DateTime @default(now()) @map("created_at")

  @@index([clientId])
  @@index([createdAt])
  @@map("audit_logs")
}

// Client와의 관계 추가
extend model Client {
  agentTasks    AgentTask[]
  approvalItems ApprovalItem[]
  agentRules    AgentRule[]
}

// User와의 관계 추가
extend model User {
  agentRules    AgentRule[]
  approvalItems ApprovalItem[]
}
```

#### 2.5.2 로컬 파일 스토리지

```
storage/
├── outputs/          # 생성된 문서
│   ├── client_123_Monthly_Statement_Jan2026.docx
│   ├── client_456_Financial_Summary.xlsx
│   └── ...
├── uploads/          # 업로드된 파일
│   ├── client_789_QB_Export_2026.csv
│   └── ...
└── .gitignore        # Git에서 제외
```

**파일 관리 패턴**

```typescript
// src/lib/file-storage.ts
import fs from 'fs/promises';
import path from 'path';

const STORAGE_ROOT = process.env.STORAGE_ROOT || './storage';

export async function saveFile(
  category: 'outputs' | 'uploads',
  fileName: string,
  content: Buffer | string
): Promise<string> {
  const dirPath = path.join(STORAGE_ROOT, category);
  await fs.mkdir(dirPath, { recursive: true });

  const filePath = path.join(dirPath, fileName);
  await fs.writeFile(filePath, content);

  return filePath;
}

export async function getFile(filePath: string): Promise<Buffer> {
  return await fs.readFile(filePath);
}

export async function deleteFile(filePath: string): Promise<void> {
  await fs.unlink(filePath);
}
```

---

## 3. API 설계

### 3.1 Next.js API Routes

| 경로 | 메소드 | 용도 |
|------|--------|------|
| `/api/auth/[...nextauth]` | GET/POST | NextAuth 인증 |
| `/api/clients` | GET/POST | 클라이언트 목록 / 생성 |
| `/api/clients/[id]` | GET/PUT/DELETE | 개별 클라이언트 조회/수정/삭제 |
| `/api/clients/[id]/contexts` | GET/POST | 클라이언트 지식 베이스 |
| `/api/chat` | POST | 채팅 메시지 (SSE 스트리밍) |
| `/api/sse/subscribe` | GET | SSE 이벤트 구독 (대시보드 실시간 업데이트) |
| `/api/dashboard` | GET | 대시보드 데이터 (aggregated) |
| `/api/approval-queue` | GET/POST | 승인 큐 항목 조회/생성 |
| `/api/approval-queue/[id]` | PUT | 항목 승인/거절/수정 |
| `/api/agent/status` | GET | 백그라운드 에이전트 상태 |
| `/api/documents` | POST | 문서 생성 (FastAPI로 delegation) |

### 3.2 Python FastAPI Routes

| 경로 | 메소드 | 용도 |
|------|--------|------|
| `/api/documents/generate` | POST | .docx/.xlsx 생성 |
| `/api/documents/template` | GET/POST | 템플릿 관리 |

---

## 4. 데이터 흐름

### 4.1 Background Agent Flow (자율 실행)

```
┌─────────────────────────────────────────────────────────┐
│ Scheduler (node-cron)                                   │
│ ├─ QB Scanner: 6시간마다 트리거                         │
│ ├─ Close Prep: 매일 09:00                               │
│ ├─ Anomaly Detector: 2시간마다                          │
│ └─ Comms Agent: 매일 17:00                              │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ Agent Runner                                             │
│ ├─ System Prompt 구성 (클라이언트 맥락 주입)            │
│ ├─ Claude API 호출                                      │
│ └─ 응답 파싱                                             │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ Result Processing                                       │
│ ├─ AgentTask 저장                                       │
│ ├─ 산출물이 있으면 ApprovalItem 생성                    │
│ └─ AuditLog 기록                                        │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ Notification (SSE)                                      │
│ → 대시보드에 새 발견 표시                                │
│ → 사용자에게 이메일/푸시 알림 (Phase 1)                │
└─────────────────────────────────────────────────────────┘
```

### 4.2 User Chat Flow (대화형)

```
사용자 메시지
    ↓
API Route (/api/chat)
    ├─ 세션 검증
    ├─ 클라이언트 권한 확인
    ├─ 최근 메시지 로드
    ├─ 클라이언트 맥락 + 에이전트 발견 로드
    └─ System Prompt 구성
    ↓
Claude API (Streaming)
    ├─ 스트리밍 응답
    └─ Tool Use 호출 (필요시)
    ↓
Tool Handling
    ├─ generate_document → FastAPI 호출
    ├─ search_knowledge_base → Prisma 쿼리
    └─ draft_email → 로컬 생성
    ↓
SSE 응답 스트림
    └─ 프론트엔드에서 실시간 표시
    ↓
DB 저장
    └─ Conversation + ConversationMessage 기록
```

### 4.3 Approval Flow

```
ApprovalItem 생성 (에이전트가 산출물 준비)
    ↓
Approval Queue UI 표시
    ├─ 우선순위 정렬
    ├─ AI 설명 표시
    └─ 사용자 검토
    ↓
사용자 승인/거절/수정
    ├─ approved → Output 저장, 작업 완료
    ├─ rejected → 로깅만 (action 취하지 않음)
    └─ modified → Pattern Learning → AgentRule 생성
    ↓
AuditLog 기록
    └─ 규제 대응을 위한 추적
```

---

## 5. 토큰 관리

### 5.1 Chat Session 토큰 예산

| 구성요소 | 토큰 예산 |
|---------|---------|
| 시스템 프롬프트 | 800 |
| 최근 대화 메시지 | 1,000 |
| 클라이언트 컨텍스트 | 2,000 |
| 에이전트 발견 | 500 |
| 사용자 입력 | 500 |
| **합계** | **4,800** |
| 버퍼 (claude-3-5-sonnet 최대) | 200,000 - 4,800 = 195,200 |

### 5.2 Background Agent 토큰 예산

| 에이전트 | 토큰 예산 | 용도 |
|---------|---------|------|
| QB Scanner | 1,500 | 거래 분석 + 이상 감지 |
| Close Prep | 2,500 | 재무제표 초안 생성 |
| Anomaly Detector | 2,000 | 다양한 이상 탐지 |
| Comms Agent | 1,500 | 이메일 초안 작성 |
| Pattern Learner | 500 | 패턴 분석 |

---

## 6. 보안 및 권한

### 6.1 Application-Level Authorization

Supabase RLS 대신, 모든 Prisma 쿼리에서 사용자 필터를 강제합니다.

```typescript
// ✅ 올바른 패턴
const clients = await prisma.client.findMany({
  where: { userId: session.user.id },
});

// ❌ 금지된 패턴 (userId 필터 없음)
const clients = await prisma.client.findMany();
```

### 6.2 클라이언트 간 데이터 격리

```typescript
// 클라이언트 리소스 접근 시 2단계 검증
const client = await prisma.client.findFirst({
  where: { id: clientId, userId: session.user.id },
});
if (!client) throw new Error('Not found');

// 이제 client가 현재 사용자의 소유를 확인했으므로,
// 안전하게 하위 리소스 접근 가능
const contexts = await prisma.clientContext.findMany({
  where: { clientId: client.id },
});
```

### 6.3 감사 추적 (Compliance)

모든 AI 판단과 사용자 행동이 AuditLog에 기록되어, 세무/회계 규제 대응이 가능합니다.

---

## 7. 배포 아키텍처

### 7.1 Local Development

```
Node.js 22 (fnm managed)
├─ Next.js 15 (localhost:3000)
├─ PostgreSQL (npx prisma dev, port 51214)
└─ Python FastAPI (localhost:8000)
```

### 7.2 MVP Production

```
Single Server (Vercel 또는 자체 호스팅)
├─ Next.js 15 (프론트엔드 + API Routes)
├─ PostgreSQL (managed service)
├─ Python FastAPI (별도 프로세스)
└─ Local file storage (S3로 전환 준비)
```

### 7.3 Phase 1 Production

```
Scalable Architecture
├─ Frontend: Vercel (Next.js)
├─ API: AWS EC2 / Google Cloud Run (Next.js API Routes)
├─ Background Jobs: Bull + Redis 별도 워커
├─ Database: AWS RDS PostgreSQL
├─ Document Service: Python FastAPI (AWS Fargate)
└─ Storage: AWS S3
```

---

## 8. 환경 변수

```env
# Node.js & Next.js
NODE_ENV=development
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Database (PostgreSQL)
DATABASE_URL=postgresql://postgres:postgres@localhost:51214/fractional

# Claude AI
ANTHROPIC_API_KEY=sk-ant-xxx

# NextAuth.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-random-secret-here

# Google OAuth (NextAuth Provider)
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxx

# FastAPI Document Service
DOCUMENT_SERVICE_URL=http://localhost:8000

# File Storage
STORAGE_ROOT=./storage

# QuickBooks API (Phase 1)
QB_CLIENT_ID=xxx
QB_CLIENT_SECRET=xxx
QB_REALM_ID=xxx
```

---

## 9. 개발 로드맵

### MVP (현재 ~ 4주)

1. ✅ Auth + Client CRUD (기초)
2. ✅ PostgreSQL + Prisma 스키마 (AgentTask, ApprovalItem, AuditLog 추가)
3. ✅ Command Center Dashboard UI
4. ✅ QB Scanner Agent (1개, 폴링만)
5. ✅ Approval Queue UI
6. ✅ Chat Interface (보조)
7. ✅ Document Generation (FastAPI)

### Phase 1 (4~8주)

1. ✅ QB 이상 거래 감지 (Anomaly Detector Agent)
2. ✅ 월간 마감 준비 (Close Prep Agent)
3. ✅ 자동 리마인더 (Comms Agent)
4. ✅ Pattern Learner (규칙 기반)
5. ✅ Bull + Redis 도입 (scalable job queue)
6. ✅ SSE 대시보드 실시간 업데이트

### Phase 2 (8~16주)

1. ✅ QuickBooks 웹훅 통합 (폴링 → 웹훅)
2. ✅ Xero 데이터 임포트
3. ✅ ML 기반 패턴 학습
4. ✅ pgvector + 의미론적 검색
5. ✅ Cross-Client Insights
6. ✅ Slack/이메일 알림 통합

### Phase 3 (16주+)

1. ✅ 팀 협업 (N:M 관계)
2. ✅ 세무 시즌 자동화 워크플로우
3. ✅ .pptx 생성
4. ✅ 모바일 앱
5. ✅ 비용 청구 및 사용량 추적

---

## 10. 참고 및 추가 정보

### AI-Native Agent 철학

이 아키텍처는 `docs/strategy/AI-NATIVE-AGENT-PHILOSOPHY.md`에 정의된 5가지 핵심 원칙을 따릅니다:
1. **자율 모니터링** (Autonomous Monitoring)
2. **능동적 준비** (Proactive Preparation)
3. **패턴 학습** (Pattern Learning & Auto-Apply)
4. **워크플로우 오케스트레이션** (Workflow Orchestration)
5. **지능적 개입** (Intelligent Intervention)

### 기술 스택 Source of Truth

모든 버전/기술 결정은 `CLAUDE.md`를 따릅니다. 충돌이 발생하면 CLAUDE.md가 우선합니다.

### 사례 분석

OpenClaw, Paperclip, OpenFang의 패턴을 참고하여 설계했습니다. 상세 분석은 `docs/research/08_AI-Native-Agent-사례분석.md` 참조.

---

**마지막 업데이트**: 2026년 4월 6일
**담당자**: Product & Architecture
**상태**: 확정 및 개발 시작 준비 완료
