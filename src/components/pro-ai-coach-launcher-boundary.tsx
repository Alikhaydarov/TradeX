"use client";

import { usePathname } from "next/navigation";

import { ProAiCoachLauncher } from "./pro-ai-coach-launcher";

const AI_LAUNCHER_PARITY = [
  "contents",
  "[&>button]:fixed [&>button]:bottom-[5.75rem] [&>button]:right-4 [&>button]:block",
  "[&>button]:size-[3.1rem] [&>button]:min-w-[3.1rem] [&>button]:overflow-hidden [&>button]:rounded-full",
  "[&>button]:border [&>button]:border-white/[0.13] [&>button]:bg-surface",
  "[&>button]:p-0 [&>button]:gap-0 [&>button]:text-[0px] [&>button]:leading-none [&>button]:text-transparent",
  "[&>button]:shadow-[0_14px_36px_rgba(0,0,0,0.56)] [&>button]:backdrop-blur-[18px]",
  "[&>button]:isolate [&>button]:[-webkit-tap-highlight-color:transparent]",
  "[&>button]:[transition:transform_180ms_ease,border-color_180ms_ease,background_180ms_ease]",
  "[&>button>svg]:absolute [&>button>svg]:left-1/2 [&>button>svg]:top-1/2 [&>button>svg]:m-0",
  "[&>button>svg]:size-[1.15rem] [&>button>svg]:flex-none [&>button>svg]:-translate-x-1/2 [&>button>svg]:-translate-y-1/2",
  "[&>button>svg]:text-[#f4f4f5] [&>button>svg]:drop-shadow-[0_0_10px_rgba(255,255,255,0.18)]",
  "[&>button:hover]:-translate-y-0.5 [&>button:hover]:scale-[1.04]",
  "[&>button:hover]:border-white/[0.28]",
  "[&>button:hover]:bg-[radial-gradient(circle_at_30%_22%,rgba(255,255,255,0.18),transparent_34%),linear-gradient(145deg,#202024,#090909)]",
  "[&>button:active]:scale-[0.94]",
  "lg:[&>button]:bottom-[5.85rem] lg:[&>button]:right-[1.98rem]",
].join(" ");

export function ProAiCoachLauncherBoundary() {
  const pathname = usePathname();

  return (
    <div className={AI_LAUNCHER_PARITY}>
      <ProAiCoachLauncher key={pathname} />
    </div>
  );
}
