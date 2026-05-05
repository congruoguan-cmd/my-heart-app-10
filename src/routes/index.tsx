import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DynamicIsland } from "@/components/DynamicIsland";

export const Route = createFileRoute("/")({
  component: Index,
});

const TOTAL_SECONDS = 20 * 60;

function Index() {
  const [remaining, setRemaining] = useState(TOTAL_SECONDS);

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining((s) => (s <= 0 ? TOTAL_SECONDS : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const progress = ((TOTAL_SECONDS - remaining) / TOTAL_SECONDS) * 100;
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const timeLabel = `${mm}:${ss}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-200 dark:from-slate-900 dark:via-slate-950 dark:to-black">
      <DynamicIsland
        taskName="vibecoding"
        progress={progress}
        label={timeLabel}
      />

      <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          桌面灵动岛
        </h1>
        <p className="mt-4 max-w-md text-base text-muted-foreground">
          20 分钟专注倒计时 · 悬停查看任务详情
        </p>
      </main>
    </div>
  );
}
