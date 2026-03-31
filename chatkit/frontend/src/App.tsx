import { CustomChat } from "./components/CustomChat";

export default function App() {
  return (
    <main className="flex h-screen flex-col items-center bg-slate-100 dark:bg-slate-950 p-4">
      <div className="mx-auto w-full max-w-5xl h-full flex flex-col">
        <CustomChat />
      </div>
    </main>
  );
}
