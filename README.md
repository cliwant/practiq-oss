# Fractional AI Command Center

> **"하나의 에이전트와 대화하면, 모든 고객의 맥락을 기억하고 적절한 산출물을 만들어주는 환경"**

Fractional 전문가(CFO, COO, CTO, CMO)가 동시에 여러 고객을 관리할 때 겪는 컨텍스트 스위칭 비용을 제거하고, 하나의 AI 인터페이스에서 고객별 맞춤 산출물(리포트, 스프레드시트, 프레젠테이션, 이메일 등)을 생성·관리·연결하는 서비스.

## 왜 이것을 만드는가

- AI 도구 4개 이상 사용 시 생산성이 오히려 하락 (BCG, 2026.03)
- Fractional 전문가 12만+ 명(미국), 평균 4.3개 고객 동시 관리, 시급 $213
- "Fractional 전문가를 위한 AI" 카테고리가 사실상 존재하지 않음 (블루오션)
- 지불 의사 최고: 하루 1시간 절약 = 월 $4,000+ 가치, 월 $200 구독 시 ROI 20x

## 프로젝트 구조

```
fractional-ai-command-center/
├── docs/
│   ├── research/              # 시장 리서치 및 사용자 분석
│   ├── product/               # PRD, 기능 명세, 사용자 시나리오
│   ├── architecture/          # 기술 아키텍처 문서
│   └── validation/            # 사용자 인터뷰, 검증 실험 결과
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── (dashboard)/       # 대시보드 라우트 (사이드바 + 채팅)
│   │   │   └── chat/[clientId]/ # 클라이언트별 채팅 페이지
│   │   └── api/               # API 엔드포인트
│   │       ├── chat/          # Claude AI 대화 처리
│   │       ├── clients/       # 클라이언트 CRUD
│   │       └── documents/     # 문서 생성
│   ├── components/            # React 컴포넌트
│   │   ├── layout/            # 사이드바, 헤더 등
│   │   └── chat/              # 채팅 인터페이스
│   ├── lib/                   # 유틸리티 라이브러리
│   │   ├── supabase/          # Supabase 클라이언트
│   │   └── claude/            # Claude API 연동
│   └── types/                 # TypeScript 타입 정의
├── scripts/                   # 유틸리티 스크립트
└── README.md
```

## 현재 단계

**Phase 0: 문제 검증** (2주 목표)

- [ ] LinkedIn에서 Fractional CFO/COO 20명 리스트업
- [ ] 10명 인터뷰 실시
- [ ] 핵심 질문: 컨텍스트 전환 고통, 산출물 형태, 도구 개수, 지불 의사
- [ ] 검증 결과 정리 → Phase 1 진행 여부 결정

## 핵심 문서

| 문서 | 위치 | 설명 |
|------|------|------|
| 시장 리서치 | `docs/research/01_*.md` | AI 시대 업무의 미래 & 사업 기회 탐색 |
| 수요자 분석 | `docs/research/02_*.md` | "누가 절실하게 필요로 하는가" 페르소나 분석 |
| 서비스 컨셉 비교 | `docs/research/03_*.md` | 3개 페르소나 사업성 비교 & 전략적 권고 |
| 사용자 시나리오 | `docs/product/USER-SCENARIOS.md` | 제품이 실제로 동작하는 구체적 시나리오 |
| PRD | `docs/product/PRD.md` | 제품 요구사항 정의서 |
| 기술 아키텍처 | `docs/architecture/ARCHITECTURE.md` | 시스템 설계 초안 |

## 기술 스택

- **Frontend**: Next.js 15 + React 19 + Tailwind CSS v4
- **Backend**: Next.js API Routes (TypeScript)
- **AI**: Claude API (Anthropic) — 대화형 인터페이스 + Tool Use
- **문서 생성**: docx, ExcelJS, pptxgenjs
- **데이터 저장**: PostgreSQL + pgvector (Supabase) + Supabase Storage
- **인증**: Supabase Auth + Row-Level Security

## 라이선스

Private — 미공개
