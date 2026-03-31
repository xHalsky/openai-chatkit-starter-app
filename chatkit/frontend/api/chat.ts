import fs from "fs";
import path from "path";
import type { IncomingMessage, ServerResponse } from "http";

function loadTemplate(): string {
  // __dirname is unavailable in ESM; resolve relative to process.cwd() instead
  const candidates = [
    path.join(process.cwd(), "api", "template.html"),
    path.join(process.cwd(), "template.html"),
  ];
  for (const candidate of candidates) {
    try {
      const raw = fs.readFileSync(candidate, "utf-8");
      // Strip HTML comments and collapse consecutive blank lines to reduce token count
      const content = raw
        .replace(/<!--[\s\S]*?-->/g, "")
        .replace(/(\r?\n\s*){3,}/g, "\n\n")
        .trim();
      console.log(
        "[chat] Loaded template from:", candidate,
        `(${raw.length} raw → ${content.length} stripped chars)`
      );
      return content;
    } catch {
      // try next
    }
  }
  console.error("[chat] Could not find template.html. Tried:", candidates);
  return "";
}

function buildSystemPrompt(htmlTemplate: string): string {
  return `You are an expert HTML developer creating event landing pages for Microsoft Dynamics 365 Real-Time Journeys.

Below is the official HTML template. You MUST use it as the exact structural basis for every landing page you create:

<HTML_TEMPLATE>
${htmlTemplate}
</HTML_TEMPLATE>

When given event details (title, date, description, presenters, agenda), generate a complete HTML landing page by adapting the template above.

CRITICAL REQUIREMENTS:
- Use the EXACT template structure above — do not invent new HTML structure
- Preserve ALL Dynamics 365 structural elements:
  • data-form-id, data-form-api-url, data-cached-form-url attributes
  • d365mkt-* CSS classes
  • FormLoader.bundle.js script tag
  • All <meta> tags with type="xrm/designer/setting"
- Replace only the content (event title, dates, description, presenter names/bios/photos, agenda items)
- Keep all structural HTML, IDs, and classes intact

Output ONLY the complete HTML document wrapped in \`\`\`html code fences. No introductory text or explanation outside the code block.`;
}

export default async function handler(req: IncomingMessage & { body?: unknown }, res: ServerResponse) {
  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("[chat] OPENAI_API_KEY is not set");
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "OpenAI API key not configured" }));
    return;
  }

  const htmlTemplate = loadTemplate();
  if (!htmlTemplate) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "HTML template not found. Check api/template.html" }));
    return;
  }

  // Parse body — Vercel may provide it pre-parsed or as a stream
  let parsedBody: { messages: Array<{ role: string; content: string }> };
  try {
    if (req.body && typeof req.body === "object") {
      parsedBody = req.body as typeof parsedBody;
    } else {
      const raw = await new Promise<string>((resolve, reject) => {
        let data = "";
        req.on("data", (chunk: Buffer) => { data += chunk.toString(); });
        req.on("end", () => resolve(data));
        req.on("error", reject);
      });
      parsedBody = JSON.parse(raw);
    }
  } catch (err) {
    console.error("[chat] Failed to parse request body:", err);
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Invalid request body" }));
    return;
  }

  const { messages } = parsedBody;
  console.log("[chat] Received", messages.length, "messages");

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
  });

  const systemPrompt = buildSystemPrompt(htmlTemplate);
  console.log("[chat] System prompt length:", systemPrompt.length, "chars");

  let openaiResponse: Response;
  try {
    openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
        max_tokens: 32768,
        temperature: 0.1,
      }),
    });
  } catch (err) {
    console.error("[chat] Fetch to OpenAI failed:", err);
    res.write(`data: ${JSON.stringify({ error: "Failed to reach OpenAI" })}\n\n`);
    res.end();
    return;
  }

  console.log("[chat] OpenAI response status:", openaiResponse.status);

  if (!openaiResponse.ok) {
    const errorText = await openaiResponse.text();
    console.error("[chat] OpenAI API error:", openaiResponse.status, errorText);
    res.write(`data: ${JSON.stringify({ error: `OpenAI error ${openaiResponse.status}: ${errorText}` })}\n\n`);
    res.end();
    return;
  }

  const reader = openaiResponse.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let deltaCount = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();

      if (data === "[DONE]") {
        res.write("data: [DONE]\n\n");
        continue;
      }

      try {
        const event = JSON.parse(data);
        const delta = event?.choices?.[0]?.delta?.content;
        if (delta) {
          deltaCount++;
          res.write(`data: ${JSON.stringify({ delta })}\n\n`);
        }
      } catch {
        // skip malformed lines
      }
    }
  }

  console.log("[chat] Stream complete. Delta chunks sent:", deltaCount);
  res.end();
}
