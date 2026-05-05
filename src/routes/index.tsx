import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DynamicIsland, type Todo } from "@/components/DynamicIsland";

export const Route = createFileRoute("/")({
  component: Index,
});

const TOTAL_SECONDS = 20 * 60;

function Index() {
  const [remaining, setRemaining] = useState(TOTAL_SECONDS);
  const [todos, setTodos] = useState<Todo[]>([
    { id: "1", name: "回复设计稿评论", done: true, paused: false, active: false },
    { id: "2", name: "vibecoding", done: false, paused: false, active: true },
    { id: "3", name: "周会准备", done: false, paused: false, active: false },
    { id: "4", name: "整理本周笔记", done: false, paused: false, active: false },
  ]);

  const active = todos.find((t) => t.active && !t.done);
  const isRunning = !!active && !active.paused;

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => {
      setRemaining((s) => (s <= 0 ? TOTAL_SECONDS : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  const progress = ((TOTAL_SECONDS - remaining) / TOTAL_SECONDS) * 100;
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const timeLabel = active?.paused ? "已暂停" : `${mm}:${ss}`;

  const handleToggleDone = (id: string) => {
    setTodos((list) =>
      list.map((t) => (t.id === id ? { ...t, done: !t.done, active: false } : t)),
    );
  };
  const handleTogglePause = (id: string) => {
    setTodos((list) =>
      list.map((t) => (t.id === id ? { ...t, paused: !t.paused } : t)),
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-200 dark:from-slate-900 dark:via-slate-950 dark:to-black">
      <DynamicIsland
        taskName={active?.name ?? "无进行中任务"}
        progress={active ? progress : 0}
        label={active ? timeLabel : "—"}
        todos={todos}
        onToggleDone={handleToggleDone}
        onTogglePause={handleTogglePause}
      />

      <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          桌面灵动岛
        </h1>
        <p className="mt-4 max-w-md text-base text-muted-foreground">
          点击灵动岛展开 Todo · 悬停查看任务详情
        </p>
      </main>
    </div>
  );
}
