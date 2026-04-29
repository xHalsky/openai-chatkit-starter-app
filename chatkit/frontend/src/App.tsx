import { CustomChat } from "./components/CustomChat";

function AppButton({ icon, label, href }: { icon: string; label: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col items-center gap-1.5 group w-[72px]"
    >
      <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-md ring-1 ring-black/8 group-hover:scale-110 group-hover:shadow-lg transition-all duration-150">
        <img src={icon} alt={label} className="w-full h-full object-cover" />
      </div>
      <span className="text-[11px] text-center text-slate-600 dark:text-slate-400 leading-tight font-medium">
        {label}
      </span>
    </a>
  );
}

export default function App() {
  return (
    <main className="flex h-screen flex-col lg:flex-row items-stretch bg-slate-100 dark:bg-slate-950 p-4 gap-4">
      {/* Chat — takes all available space */}
      <div className="flex-1 min-h-0 min-w-0">
        <CustomChat />
      </div>

      {/* App shortcuts — vertical column on desktop, horizontal row on mobile */}
      <div className="flex-shrink-0 flex flex-row lg:flex-col items-center justify-center gap-5 lg:py-8">
        <AppButton
          icon="https://assets-eur.mkt.dynamics.com/0f0df1a6-2f4d-47d5-a0cd-1db1ee224907/digitalassets/images/e0d0b222-d92d-f111-88b4-000d3a6960fe?ts=639106514098806974"
          label="Newsletter Assistant"
          href="https://newsletter-assistant-eta.vercel.app/"
        />
        <AppButton
          icon="https://assets-eur.mkt.dynamics.com/0f0df1a6-2f4d-47d5-a0cd-1db1ee224907/digitalassets/images/e1d0b222-d92d-f111-88b4-000d3a6960fe?ts=639106514098806974"
          label="Promise Content Companion"
          href="https://pcc-sage.vercel.app/"
        />
      </div>
    </main>
  );
}
