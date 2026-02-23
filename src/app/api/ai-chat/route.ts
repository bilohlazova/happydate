import { NextRequest } from "next/server";
export const runtime = "edge";

export async function POST(req: NextRequest) {
  const { message } = await req.json();

  // TODO: підстав твій реальний стрім з LLM
  const encoder = new TextEncoder();
  const answer =
    `Oto 3 szybkie propozycje na "${message}":\n` +
    `• Personalizowana książka wspomnień (80–120 zł)\n` +
    `• Voucher na mini-spa / masaż (150–250 zł)\n` +
    `• Zestaw „kawa + kubek z grawerem” (70–110 zł)\n` +
    `Chcesz od razu linki do zakupu?`;

  const stream = new ReadableStream({
    async start(controller) {
      for (const chunk of answer.match(/.{1,14}/g) ?? []) {
        controller.enqueue(encoder.encode(chunk));
        await new Promise(r => setTimeout(r, 40));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
