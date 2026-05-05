import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { DynamicIsland, type Todo } from "@/components/DynamicIsland";

export const Route = createFileRoute("/")({
  component: Index,
});

const TOTAL_SECONDS = 20 * 60;

function formatTime(s: number) {
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function Index() {
  const [elapsed, setElapsed] = useState(0); // seconds spent on active task
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
      setElapsed((s) => (s >= TOTAL_SECONDS ? TOTAL_SECONDS : s + 1));
    }, 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  const remaining = Math.max(0, TOTAL_SECONDS - elapsed);
  const progress = active ? (elapsed / TOTAL_SECONDS) * 100 : 0;
  const label = !active
    ? "—"
    : active.paused
      ? `已用 ${formatTime(elapsed)}`
      : formatTime(remaining);

  const handleToggleDone = (id: string) => {
    setTodos((list) =>
      list.map((t) => (t.id === id ? { ...t, done: !t.done, active: false } : t)),
    );
    if (active?.id === id) setElapsed(0);
  };

  const handleTogglePause = (id: string) => {
    setTodos((list) =>
      list.map((t) => (t.id === id ? { ...t, paused: !t.paused } : t)),
    );
  };

  const handleSelectTask = (id: string) => {
    setTodos((list) =>
      list.map((t) =>
        t.done ? t : { ...t, active: t.id === id, paused: t.id === id ? false : t.paused },
      ),
    );
    setElapsed(0);
  };

  const idCounter = useRef(100);
  const handleAddTask = (name: string) => {
    const id = String(idCounter.current++);
    setTodos((list) => [...list, { id, name, done: false, paused: false, active: false }]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-200 dark:from-slate-900 dark:via-slate-950 dark:to-black">
      <DynamicIsland
        taskName={active?.name ?? "无进行中任务"}
        progress={progress}
        label={label}
        todos={todos}
        onToggleDone={handleToggleDone}
        onTogglePause={handleTogglePause}
        onSelectTask={handleSelectTask}
        onAddTask={handleAddTask}
      />

      <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          桌面灵动岛
        </h1>
        <p className="mt-4 max-w-md text-base text-muted-foreground">
          点击灵动岛展开 Todo · 暂停/完成后可切换其他任务
        </p>
      </main>
    </div>
  );
}
