import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { spawn } from "child_process";

export const runtime = "nodejs";

/**
 * POST /api/chat
 *
 * Client 맥락을 주입한 Claude Code CLI 채팅.
 * SSE 스트리밍으로 응답 전달.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const { clientId, message, conversationId } = await request.json();

  // Client 소유권 확인
  const client = await prisma.client.findFirst({
    where: { id: clientId, userId: session.user.id },
  });
  if (!client) {
    return new Response(JSON.stringify({ error: "Client not found" }), {
      status: 404,
    });
  }

  // 최근 컨텍스트 로드
  const contexts = await prisma.clientContext.findMany({
    where: { clientId },
    orderBy: { updatedAt: "desc" },
    take: 5,
  });

  // 대화 히스토리 로드
  let recentMessages: { role: string; content: string }[] = [];
  if (conversationId) {
    const messages = await prisma.conversationMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    recentMessages = messages.reverse().map((m) => ({
      role: m.role,
      content: m.content,
    }));
  }

  // 시스템 프롬프트 구성
  const systemPrompt = buildSystemPrompt(client, contexts, recentMessages);

  // 대화 세션 생성/조회
  let convId = conversationId;
  if (!convId) {
    const conv = await prisma.conversation.create({
      data: {
        clientId,
        userId: session.user.id,
        title: message.slice(0, 50),
      },
    });
    convId = conv.id;
  }

  // 사용자 메시지 저장
  await prisma.conversationMessage.create({
    data: { conversationId: convId, role: "user", content: message },
  });

  // SSE 스트리밍 응답
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // conversationId를 첫 이벤트로 전송
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: "conversation", conversationId: convId })}\n\n`,
        ),
      );

      const fullPrompt = `${systemPrompt}\n\nUser: ${message}`;
      const proc = spawn("claude", ["-p", "--output-format", "stream-json", "--verbose"], {
        shell: true,
        env: { ...process.env },
      });

      proc.stdin.write(fullPrompt);
      proc.stdin.end();

      let fullResponse = "";

      proc.stdout.on("data", (chunk: Buffer) => {
        const lines = chunk.toString().split("\n").filter(Boolean);
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.type === "assistant" && parsed.message?.content) {
              for (const block of parsed.message.content) {
                if (block.type === "text" && block.text) {
                  fullResponse += block.text;
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ type: "text", text: block.text })}\n\n`,
                    ),
                  );
                }
              }
            } else if (parsed.type === "result") {
              // 최종 결과 — result.result에 전체 텍스트
              if (parsed.result && !fullResponse) {
                fullResponse = parsed.result;
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ type: "text", text: parsed.result })}\n\n`,
                  ),
                );
              }
            }
          } catch {
            // 파싱 불가한 라인 무시
          }
        }
      });

      proc.on("close", async () => {
        // assistant 메시지 저장
        if (fullResponse) {
          await prisma.conversationMessage.create({
            data: {
              conversationId: convId,
              role: "assistant",
              content: fullResponse,
            },
          });
        }
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`),
        );
        controller.close();
      });

      proc.on("error", () => {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", error: "Claude CLI failed" })}\n\n`,
          ),
        );
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

function buildSystemPrompt(
  client: { name: string; industry: string; userRole: string; preferences: unknown },
  contexts: { title: string; content: string; category: string }[],
  recentMessages: { role: string; content: string }[],
): string {
  const prefs = client.preferences as Record<string, string> | null;
  const tone = prefs?.reportTone ?? "professional";

  let prompt = `You are an AI assistant for a Fractional ${client.userRole} managing "${client.name}" (${client.industry}).

Your role: Help organize data, format documents, and prepare deliverables. Do NOT make strategic decisions — always defer judgment to the user.

Communication tone: ${tone}

--- Client Knowledge Base ---`;

  for (const ctx of contexts) {
    prompt += `\n[${ctx.category}] ${ctx.title}: ${ctx.content.slice(0, 300)}`;
  }

  if (recentMessages.length > 0) {
    prompt += "\n\n--- Recent Conversation ---";
    for (const msg of recentMessages.slice(-6)) {
      prompt += `\n${msg.role}: ${msg.content.slice(0, 200)}`;
    }
  }

  return prompt;
}
