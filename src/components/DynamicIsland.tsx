import { useEffect, useRef, useState } from "react";
import { Check, Pause, Play, Circle, CheckCircle2, Plus, Coffee, Sparkles } from "lucide-react";

export interface Todo {
  id: string;
  name: string;
  done: boolean;
  paused: boolean;
  active: boolean;
  /** true if created today; historical (pre-today) tasks are false */
  createdToday?: boolean;
  /** for completed history grouping */
  completedAt?: string;
}

interface DynamicIslandProps {
  taskName?: string;
  progress?: number;
  label?: string;
  todos: Todo[];
  activeId?: string | null;
  nextId?: string | null;
  variant?: "work" | "rest" | "idle";
  onToggleDone: (id: string) => void;
  onTogglePause: (id: string) => void;
  onSelectTask: (id: string) => void;
  onAddTask: (name: string) => void;
  canSwitch: boolean;
}

export function DynamicIsland({
  taskName = "无进行中任务",
  progress = 0,
  label,
  todos,
  activeId,
  nextId,
  variant = "work",
  onToggleDone,
  onTogglePause,
  onSelectTask,
  onAddTask,
  canSwitch,
}: DynamicIslandProps) {
  const [hovered, setHovered] = useState(false);
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [tab, setTab] = useState<"todo" | "done">("todo");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const clamped = Math.max(0, Math.min(100, progress));
  const display = label ?? `${Math.round(clamped)}%`;

  // Today list: not-done OR done-today. History: done before today.
  const todayList = todos.filter((t) => !t.done || t.createdToday);
  const historyList = todos.filter((t) => t.done && !t.createdToday);
  const visibleList = tab === "todo" ? todayList : historyList;

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setAdding(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  const expanded = hovered || open;

  const submitAdd = () => {
    const name = newName.trim();
    if (name) onAddTask(name);
    setNewName("");
    setAdding(false);
  };

  return (
    <div ref={containerRef} className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => setOpen((v) => !v)}
        className={[
          "group relative flex items-center overflow-hidden cursor-pointer select-none",
          "bg-island text-island-foreground",
          "shadow-island ring-1 ring-white/5",
          "transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
          expanded
            ? "h-14 w-[360px] rounded-[28px] px-5 gap-4"
            : "h-9 w-[180px] rounded-[18px] px-4 gap-3",
        ].join(" ")}
      >
        {variant === "rest" ? (
          <Coffee className="h-3.5 w-3.5 shrink-0 text-island-rest" />
        ) : variant === "idle" ? (
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-island-foreground/60" />
        ) : (
          <div className="relative flex h-2.5 w-2.5 shrink-0 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-island-accent opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-island-accent" />
          </div>
        )}

        <div
          className={[
            "flex-1 transition-all duration-300",
            expanded ? "opacity-0 -translate-y-2" : "opacity-100 translate-y-0",
          ].join(" ")}
        >
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className={[
                "h-full rounded-full transition-all duration-700 ease-out",
                variant === "rest"
                  ? "bg-gradient-to-r from-island-rest to-island-rest-glow"
                  : "bg-gradient-to-r from-island-accent to-island-accent-glow",
              ].join(" ")}
              style={{ width: `${clamped}%` }}
            />
          </div>
        </div>

        <span
          className={[
            "shrink-0 text-[11px] font-medium tabular-nums text-island-foreground/70 transition-all duration-300",
            expanded ? "opacity-0" : "opacity-100",
          ].join(" ")}
        >
          {display}
        </span>

        <div
          className={[
            "absolute inset-0 flex items-center gap-4 px-5",
            "transition-all duration-300",
            expanded
              ? "opacity-100 translate-y-0 delay-150"
              : "opacity-0 translate-y-2 pointer-events-none",
          ].join(" ")}
        >
          {variant === "rest" ? (
            <Coffee className="h-4 w-4 shrink-0 text-island-rest" />
          ) : variant === "idle" ? (
            <Sparkles className="h-4 w-4 shrink-0 text-island-foreground/70" />
          ) : (
            <div className="relative flex h-2.5 w-2.5 shrink-0 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-island-accent opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-island-accent" />
            </div>
          )}
          <div className="flex flex-1 flex-col gap-1.5 min-w-0">
            <div className="flex items-center justify-between gap-3">
              <span className="truncate text-[13px] font-medium text-island-foreground">
                {taskName}
              </span>
              <span
                className={[
                  "shrink-0 text-[11px] font-semibold tabular-nums",
                  variant === "rest" ? "text-island-rest" : "text-island-accent",
                ].join(" ")}
              >
                {display}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className={[
                  "h-full rounded-full transition-all duration-700 ease-out",
                  variant === "rest"
                    ? "bg-gradient-to-r from-island-rest to-island-rest-glow"
                    : "bg-gradient-to-r from-island-accent to-island-accent-glow",
                ].join(" ")}
                style={{ width: `${clamped}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Popover */}
      <div
        className={[
          "absolute left-1/2 -translate-x-1/2 mt-3 w-[340px] origin-top",
          "transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
          open
            ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
            : "opacity-0 scale-95 -translate-y-2 pointer-events-none",
        ].join(" ")}
      >
        <div className="rounded-2xl bg-island text-island-foreground shadow-island ring-1 ring-white/10 p-3">
          <div className="px-1 pt-0.5 pb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 rounded-lg bg-white/5 p-0.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setTab("todo");
                }}
                className={[
                  "px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide transition-colors",
                  tab === "todo"
                    ? "bg-white/10 text-island-foreground"
                    : "text-island-foreground/50 hover:text-island-foreground/80",
                ].join(" ")}
              >
                Todo
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setTab("done");
                }}
                className={[
                  "px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide transition-colors",
                  tab === "done"
                    ? "bg-white/10 text-island-foreground"
                    : "text-island-foreground/50 hover:text-island-foreground/80",
                ].join(" ")}
              >
                已完成
              </button>
            </div>
            <span className="text-[11px] text-island-foreground/50 tabular-nums">
              {tab === "todo"
                ? `${todayList.filter((t) => t.done).length}/${todayList.length}`
                : `${historyList.length}`}
            </span>
          </div>
          {visibleList.length === 0 && (
            <div className="px-2 py-6 text-center text-[12px] text-island-foreground/40">
              {tab === "todo" ? "今天还没有任务" : "暂无历史完成记录"}
            </div>
          )}
          <ul className="flex flex-col gap-1">
            {visibleList.map((todo) => {
              const isActive = activeId === todo.id && !todo.done;
              const isNext = nextId === todo.id && !todo.done && !isActive;
              const selectable = !todo.done && !isActive && canSwitch;
              return (
                <li
                  key={todo.id}
                  onClick={(e) => {
                    if (selectable) {
                      e.stopPropagation();
                      onSelectTask(todo.id);
                    }
                  }}
                  className={[
                    "flex items-center gap-2 rounded-xl px-2 py-2 transition-colors",
                    isActive
                      ? "bg-white/5"
                      : isNext
                        ? "bg-island-rest/10 ring-1 ring-island-rest/30"
                        : selectable
                          ? "hover:bg-white/5 cursor-pointer"
                          : "",
                  ].join(" ")}
                >
                  {/* Read-only status indicator */}
                  <span className="shrink-0 flex items-center justify-center">
                    {todo.done ? (
                      <CheckCircle2 className="h-[18px] w-[18px] text-island-accent/70" />
                    ) : (
                      <Circle
                        className={[
                          "h-[18px] w-[18px]",
                          isActive
                            ? "text-island-accent"
                            : isNext
                              ? "text-island-rest"
                              : "text-island-foreground/30",
                        ].join(" ")}
                      />
                    )}
                  </span>
                  <span
                    className={[
                      "flex-1 text-[13px] truncate",
                      todo.done
                        ? "line-through text-island-foreground/40"
                        : isActive
                          ? "text-island-foreground"
                          : "text-island-foreground/80",
                    ].join(" ")}
                  >
                    {todo.name}
                  </span>
                  {isNext && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-island-rest">
                      Next
                    </span>
                  )}
                  {isActive && (
                    <span className="text-[10px] font-semibold text-island-accent tabular-nums">
                      {display}
                    </span>
                  )}
                  {isActive && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onTogglePause(todo.id);
                        }}
                        className="h-7 w-7 inline-flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-island-foreground/80 transition-colors"
                        aria-label={todo.paused ? "resume" : "pause"}
                      >
                        {todo.paused ? (
                          <Play className="h-3.5 w-3.5" />
                        ) : (
                          <Pause className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleDone(todo.id);
                        }}
                        className="h-7 w-7 inline-flex items-center justify-center rounded-lg bg-island-accent/20 hover:bg-island-accent/30 text-island-accent transition-colors"
                        aria-label="complete"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {/* Add task */}
          <div className="mt-1 pt-1">
            {adding ? (
              <div
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-2 rounded-xl px-2 py-1.5 bg-white/5"
              >
                <Plus className="h-[18px] w-[18px] text-island-foreground/50 shrink-0" />
                <input
                  ref={inputRef}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitAdd();
                    if (e.key === "Escape") {
                      setAdding(false);
                      setNewName("");
                    }
                  }}
                  onBlur={submitAdd}
                  placeholder="新任务..."
                  className="flex-1 bg-transparent text-[13px] text-island-foreground placeholder:text-island-foreground/30 outline-none"
                />
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setAdding(true);
                }}
                className="w-full flex items-center gap-2 rounded-xl px-2 py-2 text-island-foreground/50 hover:text-island-foreground/90 hover:bg-white/5 transition-colors"
              >
                <Plus className="h-[18px] w-[18px]" />
                <span className="text-[13px]">添加任务</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
