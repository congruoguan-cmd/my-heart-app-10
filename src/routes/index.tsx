import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DynamicIsland } from "@/components/DynamicIsland";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [progress, setProgress] = useState(20);

  useEffect(() => {
    const id = setInterval(() => {
      setProgress((p) => (p >= 100 ? 0 : p + 1));
    }, 200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-200 dark:from-slate-900 dark:via-slate-950 dark:to-black">
      <DynamicIsland taskName="正在导出视频 final-cut.mp4" progress={progress} />

      <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          桌面灵动岛
        </h1>
        <p className="mt-4 max-w-md text-base text-muted-foreground">
          将鼠标悬停在顶部的灵动岛上，查看完整任务名称与进度详情。
        </p>
      </main>
    </div>
  );
}
