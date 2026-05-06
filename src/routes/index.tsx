import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { DynamicIsland, type Todo } from "@/components/DynamicIsland";

export const Route = createFileRoute("/")({
  component: Index,
});

const WORK_SECONDS = 20 * 60;

function formatTime(s: number) {
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

type Mode = "work" | "rest" | "idle";

function Index() {
  const [mode, setMode] = useState<Mode>("work");
  const [elapsed, setElapsed] = useState(0); // for work
  const [restElapsed, setRestElapsed] = useState(0); // for rest
  const [nextId, setNextId] = useState<string | null>(null);
  const [restMinutes, setRestMinutes] = useState(1);
  const [firedReminder, setFiredReminder] = useState<{ id: string; name: string } | null>(null);
  const REST_SECONDS = restMinutes * 60;
  const [todos, setTodos] = useState<Todo[]>([
    // Historical (created before today)
    { id: "h1", name: "登录页改版评审", done: true, paused: false, active: false, createdToday: false },
    { id: "h2", name: "用户调研整理", done: true, paused: false, active: false, createdToday: false },
    { id: "h3", name: "修复夜间模式 bug", done: true, paused: false, active: false, createdToday: false },
    // Today
    { id: "1", name: "回复设计稿评论", done: true, paused: false, active: false, createdToday: true },
    { id: "2", name: "vibecoding", done: false, paused: false, active: true, createdToday: true },
    { id: "3", name: "周会准备", done: false, paused: false, active: false, createdToday: true },
    { id: "4", name: "整理本周笔记", done: false, paused: false, active: false, createdToday: true },
  ]);

  const active = todos.find((t) => t.active && !t.done);
  const next = nextId ? todos.find((t) => t.id === nextId && !t.done) : undefined;
  const isWorkRunning = mode === "work" && !!active && !active.paused;
  const isResting = mode === "rest";

  // Work timer
  useEffect(() => {
    if (!isWorkRunning) return;
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [isWorkRunning]);

  // Auto-finish when work timer ends
  useEffect(() => {
    if (mode === "work" && active && elapsed >= WORK_SECONDS) {
      enterRest(active.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, mode]);

  // Rest timer
  useEffect(() => {
    if (!isResting) return;
    const id = setInterval(() => setRestElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [isResting]);

  // Auto-advance after rest
  useEffect(() => {
    if (mode === "rest" && restElapsed >= REST_SECONDS) {
      finishRest();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restElapsed, mode]);

  const enterRest = (justFinishedId: string) => {
    setTodos((list) =>
      list.map((t) =>
        t.id === justFinishedId ? { ...t, done: true, active: false } : t,
      ),
    );
    setElapsed(0);
    setRestElapsed(0);
    setMode("rest");
  };

  const finishRest = () => {
    setRestElapsed(0);
    if (next) {
      setTodos((list) =>
        list.map((t) =>
          t.done ? t : { ...t, active: t.id === next.id, paused: false },
        ),
      );
      setNextId(null);
      setMode("work");
      setElapsed(0);
    } else {
      setMode("idle");
    }
  };

  const handleToggleDone = (id: string) => {
    if (mode === "work" && active?.id === id) {
      enterRest(id);
      return;
    }
    setTodos((list) =>
      list.map((t) => (t.id === id ? { ...t, done: !t.done, active: false } : t)),
    );
  };

  const handleTogglePause = (id: string) => {
    setTodos((list) =>
      list.map((t) => (t.id === id ? { ...t, paused: !t.paused } : t)),
    );
  };

  const handleSelectTask = (id: string) => {
    if (mode === "rest") {
      setNextId(id);
      return;
    }
    if (mode === "idle") {
      setTodos((list) =>
        list.map((t) =>
          t.done ? t : { ...t, active: t.id === id, paused: false },
        ),
      );
      setElapsed(0);
      setMode("work");
      return;
    }
    // work mode (only when paused)
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
    setTodos((list) => [...list, { id, name, done: false, paused: false, active: false, createdToday: true }]);
  };

  // Derive island display
  let taskName: string;
  let label: string;
  let progress: number;
  let variant: "work" | "rest" | "idle" = mode;

  if (mode === "work") {
    const remaining = Math.max(0, WORK_SECONDS - elapsed);
    taskName = active?.name ?? "无进行中任务";
    progress = active ? (elapsed / WORK_SECONDS) * 100 : 0;
    label = !active
      ? "—"
      : active.paused
        ? `已用 ${formatTime(elapsed)}`
        : formatTime(remaining);
    if (!active) variant = "idle";
  } else if (mode === "rest") {
    const remaining = Math.max(0, REST_SECONDS - restElapsed);
    taskName = next ? `Next · ${next.name}` : "休息一下";
    progress = (restElapsed / REST_SECONDS) * 100;
    label = formatTime(remaining);
  } else {
    taskName = "今天你想做什么？";
    progress = 0;
    label = "选择任务";
  }

  const canSwitch =
    mode === "idle" ||
    mode === "rest" ||
    (mode === "work" && (!active || active.paused));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-200 dark:from-slate-900 dark:via-slate-950 dark:to-black">
      <DynamicIsland
        taskName={taskName}
        progress={progress}
        label={label}
        todos={todos}
        activeId={active?.id ?? null}
        nextId={nextId}
        variant={variant}
        onToggleDone={handleToggleDone}
        onTogglePause={handleTogglePause}
        onSelectTask={handleSelectTask}
        onAddTask={handleAddTask}
        canSwitch={canSwitch}
        restMinutes={restMinutes}
        onChangeRestMinutes={setRestMinutes}
      />

      <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          桌面灵动岛
        </h1>
        <p className="mt-4 max-w-md text-base text-muted-foreground">
          专注 20 分钟 · 休息 1 分钟 · 完成后自动进入休息
        </p>
      </main>
    </div>
  );
}
