export default async function handler(
  req: { method: string },
  res: {
    status: (code: number) => { json: (body: unknown) => void };
    json: (body: unknown) => void;
  }
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const response = await fetch("https://api.openai.com/v1/chatkit/sessions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "OpenAI-Beta": "chatkit_beta=v1",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      workflow: { id: process.env.CHATKIT_WORKFLOW_ID },
      user: `user-${Date.now()}`,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("OpenAI session creation failed:", response.status, data);
    return res.status(response.status).json({ error: data });
  }

  if (!data.client_secret) {
    console.error("No client_secret in response:", data);
    return res.status(500).json({ error: "No client_secret returned", data });
  }

  res.json({ client_secret: data.client_secret });
}
