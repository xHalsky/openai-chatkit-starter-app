import { ChatKit, useChatKit } from "@openai/chatkit-react";

export function ChatKitPanel() {
  const chatkit = useChatKit({
    api: {
      async getClientSecret() {
        const res = await fetch("/api/create-session", { method: "POST" });
        const { client_secret } = await res.json();
        return client_secret;
      },
    },
    composer: {
      placeholder:
        "Paste your event details here (title, date, description, presenters, agenda)…",
      attachments: { enabled: false },
    },
  });

  return (
    <div className="relative pb-8 flex h-[90vh] w-full rounded-2xl flex-col overflow-hidden bg-white shadow-sm transition-colors dark:bg-slate-900">
      <ChatKit control={chatkit.control} className="block h-full w-full" />
    </div>
  );
}
