import { useEffect, useRef, useState } from "react";
import { Check, Pause, Play, Circle, CheckCircle2, Plus, Coffee, Sparkles, Minus, Bell, BellRing, X, Trash2, ChevronDown, Link as LinkIcon, ExternalLink, GripVertical } from "lucide-react";

const TASK_MIME = "application/x-task-id";

export interface TaskLink {
  id: string;
  url: string;
  title: string;
  favicon?: string;
}

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
  /** epoch ms when reminder should fire */
  reminderAt?: number | null;
  /** parent task id (subtask if set). subtasks don't run timers themselves. */
  parentId?: string | null;
  /** attached link cards */
  links?: TaskLink[];
  /** whether the link cards under this task are collapsed */
  linksCollapsed?: boolean;
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
  onAddSubtask: (parentId: string, name: string) => void;
  onDeleteTask: (id: string) => void;
  onSetReminder: (id: string, timestamp: number | null) => void;
  onAddLink: (taskId: string, url: string) => void;
  onRemoveLink: (taskId: string, linkId: string) => void;
  onToggleLinksCollapsed: (taskId: string) => void;
  onReorderTasks: (draggedId: string, targetId: string, position: "before" | "after") => void;
  reminder: { id: string; name: string } | null;
  onDismissReminder: () => void;
  canSwitch: boolean;
  restMinutes: number;
  onChangeRestMinutes: (m: number) => void;
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
  onAddSubtask,
  onDeleteTask,
  onSetReminder,
  onAddLink,
  onRemoveLink,
  onToggleLinksCollapsed,
  onReorderTasks,
  reminder,
  onDismissReminder,
  canSwitch,
  restMinutes,
  onChangeRestMinutes,
}: DynamicIslandProps) {
  const [hovered, setHovered] = useState(false);
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [tab, setTab] = useState<"todo" | "done">("todo");
  const [reminderForId, setReminderForId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const [subtaskInputForId, setSubtaskInputForId] = useState<string | null>(null);
  const [newSubtaskName, setNewSubtaskName] = useState("");
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [reorderOver, setReorderOver] = useState<{ id: string; pos: "before" | "after" } | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const subtaskInputRef = useRef<HTMLInputElement>(null);
  const clamped = Math.max(0, Math.min(100, progress));
  const display = label ?? `${Math.round(clamped)}%`;

  const isParent = (t: Todo) => !t.parentId;
  const subtasksOf = (parentId: string) => todos.filter((t) => t.parentId === parentId);
  // Today list: parents only (subtasks render nested)
  const todayParents = todos.filter((t) => isParent(t) && (!t.done || t.createdToday));
  const historyParents = todos.filter((t) => isParent(t) && t.done && !t.createdToday);
  const visibleParents = tab === "todo" ? todayParents : historyParents;

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  // Auto-open popover while user is dragging a URL anywhere on the page
  useEffect(() => {
    const onDragEnter = (e: DragEvent) => {
      const types = e.dataTransfer?.types;
      if (types && (types.includes("text/uri-list") || types.includes("text/plain"))) {
        setOpen(true);
      }
    };
    window.addEventListener("dragenter", onDragEnter);
    return () => window.removeEventListener("dragenter", onDragEnter);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setAdding(false);
        setReminderForId(null);
        setDeletingId(null);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  useEffect(() => {
    if (subtaskInputForId) subtaskInputRef.current?.focus();
  }, [subtaskInputForId]);

  // Tab on hovered task row → open subtask input under it
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !hoveredTaskId) return;
      // don't hijack Tab while typing in inputs
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      e.preventDefault();
      // only allow subtasks under parent (top-level) tasks
      const t = todos.find((x) => x.id === hoveredTaskId);
      if (!t || t.parentId) return;
      setSubtaskInputForId(hoveredTaskId);
      setNewSubtaskName("");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, hoveredTaskId, todos]);

  const expanded = hovered || open;

  const submitAdd = () => {
    const name = newName.trim();
    if (name) onAddTask(name);
    setNewName("");
    setAdding(false);
  };

  const submitSubtask = (parentId: string) => {
    const name = newSubtaskName.trim();
    if (name) onAddSubtask(parentId, name);
    setNewSubtaskName("");
    setSubtaskInputForId(null);
  };

  const formatClock = (ts: number) => {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const toLocalInputValue = (ts: number) => {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const parseTimeToTimestamp = (hhmm: string): number | null => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
    if (!m) return null;
    const h = Number(m[1]);
    const mi = Number(m[2]);
    if (h > 23 || mi > 59) return null;
    const d = new Date();
    d.setHours(h, mi, 0, 0);
    if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1); // next day if past
    return d.getTime();
  };

  // Reminder takes over the island whenever it's firing — even if hovered/open
  const showReminderInIsland = !!reminder;

  // When a reminder fires while popover is open, close it so the alert is visible
  useEffect(() => {
    if (reminder) {
      setOpen(false);
      setHovered(false);
      setReminderForId(null);
    }
  }, [reminder]);

  return (
    <div ref={containerRef} className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => {
          if (showReminderInIsland) {
            onDismissReminder();
            return;
          }
          setOpen((v) => !v);
        }}
        className={[
          "group relative flex items-center overflow-hidden cursor-pointer select-none",
          "bg-island text-island-foreground",
          "shadow-island ring-1 ring-white/5",
          "transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
          showReminderInIsland
            ? "h-9 w-[240px] rounded-[18px] px-4 gap-2 ring-island-accent/40"
            : expanded
              ? "h-14 w-[360px] rounded-[28px] px-5 gap-4"
              : "h-9 w-[180px] rounded-[18px] px-4 gap-3",
        ].join(" ")}
      >
        {showReminderInIsland ? (
          <>
            <BellRing className="h-3.5 w-3.5 shrink-0 text-island-accent animate-bell-shake" />
            <span className="flex-1 truncate text-[12px] font-medium text-island-foreground animate-[fade-in_0.3s_ease-out]">
              {reminder!.name}
            </span>
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-island-accent/80">
              提醒
            </span>
          </>
        ) : (
          <>
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
          </>
        )}
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
                ? `${todayParents.filter((t) => t.done).length}/${todayParents.length}`
                : `${historyParents.length}`}
            </span>
          </div>
          {visibleParents.length === 0 && (
            <div className="px-2 py-6 text-center text-[12px] text-island-foreground/40">
              {tab === "todo" ? "今天还没有任务" : "暂无历史完成记录"}
            </div>
          )}
          <ul className="flex flex-col gap-1">
            {visibleParents.map((todo) => {
              const isActive = activeId === todo.id && !todo.done;
              const isNext = nextId === todo.id && !todo.done && !isActive;
              const selectable = !todo.done && !isActive && canSwitch;
              const hasReminder = !!todo.reminderAt && todo.reminderAt > now;
              const showReminderPicker = reminderForId === todo.id;
              const subs = subtasksOf(todo.id);
              const links = todo.links ?? [];
              const linksOpen = !todo.linksCollapsed;
              const isDragOver = dragOverId === todo.id;
              const isReorderOver = reorderOver?.id === todo.id && draggingTaskId !== todo.id;
              return (
                <li
                  key={todo.id}
                  className="relative flex flex-col"
                  onDragOver={(e) => {
                    const types = e.dataTransfer.types;
                    if (types.includes(TASK_MIME)) {
                      if (draggingTaskId && draggingTaskId !== todo.id) {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        const rect = e.currentTarget.getBoundingClientRect();
                        const pos: "before" | "after" =
                          e.clientY < rect.top + rect.height / 2 ? "before" : "after";
                        setReorderOver({ id: todo.id, pos });
                      }
                    } else if (types.includes("text/uri-list") || types.includes("text/plain")) {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "copy";
                      setDragOverId(todo.id);
                    }
                  }}
                  onDragLeave={() => {
                    setDragOverId((id) => (id === todo.id ? null : id));
                    setReorderOver((r) => (r?.id === todo.id ? null : r));
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const draggedId = e.dataTransfer.getData(TASK_MIME);
                    if (draggedId && draggedId !== todo.id) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const pos: "before" | "after" =
                        e.clientY < rect.top + rect.height / 2 ? "before" : "after";
                      onReorderTasks(draggedId, todo.id, pos);
                      setReorderOver(null);
                      setDraggingTaskId(null);
                      return;
                    }
                    const uri = e.dataTransfer.getData("text/uri-list");
                    const txt = e.dataTransfer.getData("text/plain");
                    const url = (uri.split("\n").find((s) => s && !s.startsWith("#")) || txt || "").trim();
                    if (url) onAddLink(todo.id, url);
                    setDragOverId(null);
                  }}
                >
                  {isReorderOver && (
                    <div
                      className={[
                        "pointer-events-none absolute left-1 right-1 h-0.5 rounded-full bg-island-accent z-10",
                        reorderOver!.pos === "before" ? "-top-0.5" : "-bottom-0.5",
                      ].join(" ")}
                    />
                  )}
                  <div
                    onMouseEnter={() => setHoveredTaskId(todo.id)}
                    onMouseLeave={() => setHoveredTaskId((id) => (id === todo.id ? null : id))}
                    onClick={(e) => {
                      if (deletingId === todo.id) return;
                      if (selectable) {
                        e.stopPropagation();
                        onSelectTask(todo.id);
                      }
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDeletingId(todo.id);
                      setReminderForId(null);
                    }}
                    className={[
                      "group/row flex items-center gap-1.5 rounded-xl pl-1 pr-2 py-2 transition-all",
                      draggingTaskId === todo.id ? "opacity-40" : "",
                      isDragOver
                        ? "bg-island-accent/15 ring-1 ring-island-accent/50"
                        : deletingId === todo.id
                          ? "bg-destructive/15 ring-1 ring-destructive/40"
                          : isActive
                            ? "bg-white/5"
                            : isNext
                              ? "bg-island-rest/10 ring-1 ring-island-rest/30"
                              : selectable
                                ? "hover:bg-white/5 cursor-pointer"
                                : "",
                    ].join(" ")}
                  >
                    <span
                      draggable
                      onDragStart={(e) => {
                        e.stopPropagation();
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData(TASK_MIME, todo.id);
                        e.dataTransfer.setData("text/plain", "");
                        setDraggingTaskId(todo.id);
                      }}
                      onDragEnd={() => {
                        setDraggingTaskId(null);
                        setReorderOver(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0 flex items-center justify-center w-3 h-6 -mr-0.5 cursor-grab active:cursor-grabbing text-island-foreground/30 hover:text-island-foreground/80 opacity-0 group-hover/row:opacity-100 transition-opacity"
                      aria-label="拖动排序"
                      title="拖动排序"
                    >
                      <GripVertical className="h-3.5 w-3.5" />
                    </span>
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
                    {links.length > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleLinksCollapsed(todo.id);
                        }}
                        className="h-6 px-1.5 inline-flex items-center gap-0.5 rounded-md text-island-foreground/50 hover:text-island-foreground/90 hover:bg-white/5 transition-colors"
                        aria-label="toggle links"
                      >
                        <LinkIcon className="h-3 w-3" />
                        <span className="text-[10px] font-semibold tabular-nums">{links.length}</span>
                        <ChevronDown
                          className={["h-3 w-3 transition-transform", linksOpen ? "" : "-rotate-90"].join(" ")}
                        />
                      </button>
                    )}
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
                    {!todo.done && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (hasReminder) {
                            onSetReminder(todo.id, null);
                          } else {
                            setReminderForId(showReminderPicker ? null : todo.id);
                          }
                        }}
                        className={[
                          "h-7 px-1.5 inline-flex items-center gap-1 rounded-lg transition-colors",
                          hasReminder
                            ? "bg-island-accent/20 text-island-accent hover:bg-island-accent/30"
                            : "text-island-foreground/40 hover:text-island-foreground/80 hover:bg-white/5",
                        ].join(" ")}
                        aria-label="reminder"
                      >
                        <Bell className="h-3.5 w-3.5" />
                        {hasReminder && (
                          <span className="text-[10px] font-semibold tabular-nums">
                            {formatClock(todo.reminderAt!)}
                          </span>
                        )}
                      </button>
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
                    {deletingId === todo.id && (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="h-7 px-2 inline-flex items-center rounded-lg bg-white/5 hover:bg-white/10 text-island-foreground/70 text-[11px] font-medium transition-colors"
                        >
                          取消
                        </button>
                        <button
                          onClick={() => {
                            onDeleteTask(todo.id);
                            setDeletingId(null);
                          }}
                          className="h-7 px-2 inline-flex items-center gap-1 rounded-lg bg-destructive/20 hover:bg-destructive/30 text-destructive text-[11px] font-semibold transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                          删除
                        </button>
                      </div>
                    )}
                  </div>
                  {showReminderPicker && (
                    <ReminderTimePicker
                      initialTimestamp={todo.reminderAt ?? null}
                      onConfirm={(ts) => {
                        onSetReminder(todo.id, ts);
                        setReminderForId(null);
                      }}
                      onCancel={() => setReminderForId(null)}
                    />
                  )}

                  {/* Link cards */}
                  {links.length > 0 && linksOpen && (
                    <div className="ml-7 mr-1 mb-1 flex flex-wrap gap-1.5">
                      {links.map((lk) => (
                        <a
                          key={lk.id}
                          href={lk.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          onClick={(e) => e.stopPropagation()}
                          className="group/link relative inline-flex items-center gap-1.5 max-w-[200px] rounded-lg bg-white/5 hover:bg-white/10 px-2 py-1 text-[11px] text-island-foreground/80 ring-1 ring-white/5 transition-colors"
                          title={lk.url}
                        >
                          {lk.favicon ? (
                            <img src={lk.favicon} alt="" className="h-3.5 w-3.5 rounded-sm shrink-0" />
                          ) : (
                            <ExternalLink className="h-3 w-3 shrink-0 text-island-foreground/50" />
                          )}
                          <span className="truncate">{lk.title}</span>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onRemoveLink(todo.id, lk.id);
                            }}
                            className="opacity-0 group-hover/link:opacity-100 h-4 w-4 inline-flex items-center justify-center rounded text-island-foreground/50 hover:text-island-foreground hover:bg-white/10 transition-opacity"
                            aria-label="remove link"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Subtasks */}
                  {subs.length > 0 && (
                    <ul className="ml-7 flex flex-col gap-0.5 border-l border-white/5 pl-2">
                      {subs.map((sub) => {
                        const subDeleting = deletingId === sub.id;
                        return (
                          <li
                            key={sub.id}
                            onClick={(e) => {
                              if (subDeleting) return;
                              e.stopPropagation();
                              onToggleDone(sub.id);
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDeletingId(sub.id);
                            }}
                            className={[
                              "flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors cursor-pointer",
                              subDeleting
                                ? "bg-destructive/15 ring-1 ring-destructive/40"
                                : "hover:bg-white/5",
                            ].join(" ")}
                          >
                            {sub.done ? (
                              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-island-accent/60" />
                            ) : (
                              <Circle className="h-3.5 w-3.5 shrink-0 text-island-foreground/25" />
                            )}
                            <span
                              className={[
                                "flex-1 text-[12px] truncate",
                                sub.done
                                  ? "line-through text-island-foreground/35"
                                  : "text-island-foreground/70",
                              ].join(" ")}
                            >
                              {sub.name}
                            </span>
                            {subDeleting && (
                              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => setDeletingId(null)}
                                  className="h-5 px-1.5 inline-flex items-center rounded text-island-foreground/60 text-[10px] hover:bg-white/5"
                                >
                                  取消
                                </button>
                                <button
                                  onClick={() => {
                                    onDeleteTask(sub.id);
                                    setDeletingId(null);
                                  }}
                                  className="h-5 px-1.5 inline-flex items-center gap-0.5 rounded bg-destructive/20 text-destructive text-[10px] font-semibold"
                                >
                                  <Trash2 className="h-2.5 w-2.5" />
                                  删除
                                </button>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {/* Subtask input (Tab to open) */}
                  {subtaskInputForId === todo.id && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="ml-7 mt-0.5 flex items-center gap-2 rounded-lg px-1.5 py-1 bg-white/5 ring-1 ring-island-accent/30"
                    >
                      <Plus className="h-3.5 w-3.5 text-island-foreground/40 shrink-0" />
                      <input
                        ref={subtaskInputRef}
                        value={newSubtaskName}
                        onChange={(e) => setNewSubtaskName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") submitSubtask(todo.id);
                          if (e.key === "Escape") {
                            setSubtaskInputForId(null);
                            setNewSubtaskName("");
                          }
                        }}
                        onBlur={() => submitSubtask(todo.id)}
                        placeholder="子任务..."
                        className="flex-1 bg-transparent text-[12px] text-island-foreground placeholder:text-island-foreground/30 outline-none"
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {/* Add task */}
          {tab === "todo" && (
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

              {/* Rest duration control */}
              <div
                onClick={(e) => e.stopPropagation()}
                className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between px-2"
              >
                <div className="flex items-center gap-1.5 text-[11px] text-island-foreground/50">
                  <Coffee className="h-3 w-3" />
                  <span>休息时长</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onChangeRestMinutes(Math.max(1, restMinutes - 1))}
                    disabled={restMinutes <= 1}
                    className="h-6 w-6 inline-flex items-center justify-center rounded-md bg-white/5 hover:bg-white/10 text-island-foreground/70 disabled:opacity-30 transition-colors"
                    aria-label="decrease"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="min-w-[44px] text-center text-[12px] font-semibold tabular-nums text-island-foreground/90">
                    {restMinutes} min
                  </span>
                  <button
                    onClick={() => onChangeRestMinutes(Math.min(60, restMinutes + 1))}
                    disabled={restMinutes >= 60}
                    className="h-6 w-6 inline-flex items-center justify-center rounded-md bg-white/5 hover:bg-white/10 text-island-foreground/70 disabled:opacity-30 transition-colors"
                    aria-label="increase"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ReminderTimePickerProps {
  initialTimestamp: number | null;
  onConfirm: (ts: number) => void;
  onCancel: () => void;
}

function ReminderTimePicker({ initialTimestamp, onConfirm, onCancel }: ReminderTimePickerProps) {
  const init = initialTimestamp ? new Date(initialTimestamp) : new Date(Date.now() + 15 * 60_000);
  const [hour, setHour] = useState(init.getHours());
  const [minute, setMinute] = useState(init.getMinutes());

  const confirm = () => {
    const d = new Date();
    d.setHours(hour, minute, 0, 0);
    if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
    onConfirm(d.getTime());
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="ml-7 mr-2 mb-1 rounded-xl bg-white/5 p-3 animate-[fade-in_0.2s_ease-out]"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-wider text-island-foreground/50">提醒于</span>
        <button
          onClick={onCancel}
          className="h-5 w-5 inline-flex items-center justify-center rounded-md text-island-foreground/40 hover:text-island-foreground/80"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      <div className="relative flex items-center justify-center gap-2">
        {/* center highlight */}
        <div className="pointer-events-none absolute left-0 right-0 top-1/2 -translate-y-1/2 h-9 rounded-lg bg-white/10" />
        <ScrollWheel value={hour} onChange={setHour} max={24} />
        <span className="relative z-10 text-[18px] font-semibold text-island-foreground/60 px-0.5">:</span>
        <ScrollWheel value={minute} onChange={setMinute} max={60} />
      </div>
      <button
        onClick={confirm}
        className="mt-3 w-full py-1.5 rounded-lg bg-island-accent/20 hover:bg-island-accent/30 text-island-accent text-[12px] font-semibold transition-colors"
      >
        确定
      </button>
    </div>
  );
}

const ITEM_H = 32;

function ScrollWheel({
  value,
  onChange,
  max,
}: {
  value: number;
  onChange: (n: number) => void;
  max: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const settleTimer = useRef<number | null>(null);
  const userScrolling = useRef(false);

  // Sync scroll position when value changes externally (initial mount or programmatic)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (userScrolling.current) return;
    el.scrollTo({ top: value * ITEM_H, behavior: "auto" });
  }, [value]);

  const handleScroll = () => {
    const el = ref.current;
    if (!el) return;
    userScrolling.current = true;
    if (settleTimer.current) window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => {
      const idx = Math.round(el.scrollTop / ITEM_H);
      const clamped = ((idx % max) + max) % max;
      // Snap precisely
      el.scrollTo({ top: clamped * ITEM_H, behavior: "smooth" });
      if (clamped !== value) onChange(clamped);
      userScrolling.current = false;
    }, 120);
  };

  const items = Array.from({ length: max }, (_, i) => i);

  return (
    <div
      ref={ref}
      onScroll={handleScroll}
      className="relative z-10 h-24 w-12 overflow-y-scroll snap-y snap-mandatory no-scrollbar"
      style={{
        scrollbarWidth: "none",
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent 0, black 30%, black 70%, transparent 100%)",
        maskImage:
          "linear-gradient(to bottom, transparent 0, black 30%, black 70%, transparent 100%)",
      }}
    >
      {/* spacer top */}
      <div style={{ height: ITEM_H }} />
      {items.map((n) => (
        <div
          key={n}
          onClick={() => {
            const el = ref.current;
            if (!el) return;
            el.scrollTo({ top: n * ITEM_H, behavior: "smooth" });
            onChange(n);
          }}
          style={{ height: ITEM_H }}
          className={[
            "snap-center flex items-center justify-center text-[16px] font-semibold tabular-nums cursor-pointer transition-all",
            n === value
              ? "text-island-foreground scale-100"
              : "text-island-foreground/30 scale-90",
          ].join(" ")}
        >
          {String(n).padStart(2, "0")}
        </div>
      ))}
      {/* spacer bottom */}
      <div style={{ height: ITEM_H }} />
    </div>
  );
}


