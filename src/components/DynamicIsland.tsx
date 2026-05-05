import { useState } from "react";

interface DynamicIslandProps {
  taskName?: string;
  progress?: number; // 0-100
}

export function DynamicIsland({
  taskName = "正在下载文件",
  progress = 42,
}: DynamicIslandProps) {
  const [hovered, setHovered] = useState(false);
  const clamped = Math.max(0, Math.min(100, progress));

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={[
          "group relative flex items-center overflow-hidden",
          "bg-island text-island-foreground",
          "shadow-island ring-1 ring-white/5",
          "transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
          hovered
            ? "h-14 w-[360px] rounded-[28px] px-5 gap-4"
            : "h-9 w-[180px] rounded-[18px] px-4 gap-3",
        ].join(" ")}
      >
        {/* Live indicator dot */}
        <div className="relative flex h-2.5 w-2.5 shrink-0 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-island-accent opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-island-accent" />
        </div>

        {/* Compact view: thin progress bar */}
        <div
          className={[
            "flex-1 transition-all duration-300",
            hovered ? "opacity-0 -translate-y-2" : "opacity-100 translate-y-0",
          ].join(" ")}
        >
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-island-accent to-island-accent-glow transition-all duration-700 ease-out"
              style={{ width: `${clamped}%` }}
            />
          </div>
        </div>

        {/* Compact percentage */}
        <span
          className={[
            "shrink-0 text-[11px] font-medium tabular-nums text-island-foreground/70 transition-all duration-300",
            hovered ? "opacity-0" : "opacity-100",
          ].join(" ")}
        >
          {clamped}%
        </span>

        {/* Expanded view: task name + progress + percent */}
        <div
          className={[
            "absolute inset-0 flex items-center gap-4 px-5",
            "transition-all duration-300",
            hovered
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
                {clamped}%
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
    </div>
  );
}
