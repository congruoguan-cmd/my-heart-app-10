import { useEffect, useRef, useState } from "react";
import { Check, Pause, Play, Circle, CheckCircle2 } from "lucide-react";

export interface Todo {
  id: string;
  name: string;
  done: boolean;
  paused: boolean;
  active: boolean;
}

interface DynamicIslandProps {
  taskName?: string;
  progress?: number;
  label?: string;
  todos: Todo[];
  onToggleDone: (id: string) => void;
  onTogglePause: (id: string) => void;
}

export function DynamicIsland({
  taskName = "正在下载文件",
  progress = 42,
  label,
  todos,
  onToggleDone,
  onTogglePause,
}: DynamicIslandProps) {
  const [hovered, setHovered] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const clamped = Math.max(0, Math.min(100, progress));
  const display = label ?? `${Math.round(clamped)}%`;

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const expanded = hovered || open;

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
        {/* Live indicator dot */}
        <div className="relative flex h-2.5 w-2.5 shrink-0 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-island-accent opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-island-accent" />
        </div>

        <div
          className={[
            "flex-1 transition-all duration-300",
            expanded ? "opacity-0 -translate-y-2" : "opacity-100 translate-y-0",
          ].join(" ")}
        >
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-island-accent to-island-accent-glow transition-all duration-700 ease-out"
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
          <div className="relative flex h-2.5 w-2.5 shrink-0 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-island-accent opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-island-accent" />
          </div>
          <div className="flex flex-1 flex-col gap-1.5 min-w-0">
            <div className="flex items-center justify-between gap-3">
              <span className="truncate text-[13px] font-medium text-island-foreground">
                {taskName}
              </span>
              <span className="shrink-0 text-[11px] font-semibold tabular-nums text-island-accent">
                {display}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-island-accent to-island-accent-glow transition-all duration-700 ease-out"
                style={{ width: `${clamped}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Popover */}
      <div
        className={[
          "absolute left-1/2 -translate-x-1/2 mt-3 w-[320px] origin-top",
          "transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
          open
            ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
            : "opacity-0 scale-95 -translate-y-2 pointer-events-none",
        ].join(" ")}
      >
        <div className="rounded-2xl bg-island text-island-foreground shadow-island ring-1 ring-white/10 p-3">
          <div className="px-2 pt-1 pb-2 flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-island-foreground/50 font-semibold">
              Todo
            </span>
            <span className="text-[11px] text-island-foreground/50">
              {todos.filter((t) => t.done).length}/{todos.length}
            </span>
          </div>
          <ul className="flex flex-col gap-1">
            {todos.map((todo) => (
              <li
                key={todo.id}
                className={[
                  "group/item flex items-center gap-2 rounded-xl px-2 py-2 transition-colors",
                  todo.active
                    ? "bg-white/5"
                    : "hover:bg-white/5",
                ].join(" ")}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleDone(todo.id);
                  }}
                  className="shrink-0 text-island-foreground/60 hover:text-island-accent transition-colors"
                  aria-label="toggle done"
                >
                  {todo.done ? (
                    <CheckCircle2 className="h-[18px] w-[18px] text-island-accent" />
                  ) : (
                    <Circle className="h-[18px] w-[18px]" />
                  )}
                </button>
                <span
                  className={[
                    "flex-1 text-[13px] truncate",
                    todo.done
                      ? "line-through text-island-foreground/40"
                      : "text-island-foreground/90",
                  ].join(" ")}
                >
                  {todo.name}
                </span>
                {todo.active && !todo.done && (
                  <span className="text-[10px] font-semibold text-island-accent tabular-nums">
                    {display}
                  </span>
                )}
                <div className="flex items-center gap-1">
                  {!todo.done && (
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
                  )}
                  {!todo.done && (
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
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
