import type { SVGProps } from "react";

export type IconName = "shield" | "spark" | "wallet" | "layers" | "history" | "arrow" | "lock" | "check" | "link" | "user" | "terminal" | "copy" | "plus" | "x";

const paths: Record<IconName, React.ReactNode> = {
  shield: <path d="M12 3 4.5 6.2v5.1c0 4.6 3.1 8.8 7.5 9.7 4.4-.9 7.5-5.1 7.5-9.7V6.2L12 3Zm-3.2 9 2.1 2.1 4.5-4.6" />,
  spark: <path d="m12 2 1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7L12 2Zm7 14 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" />,
  wallet: <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H19v14H6.5A2.5 2.5 0 0 1 4 16.5v-9Zm0 1.5h15M15.5 13h.01" />,
  layers: <path d="m12 3 8 4.5-8 4.5-8-4.5L12 3Zm-8 9 8 4.5 8-4.5M4 16.5 12 21l8-4.5" />,
  history: <path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.5M4 4v4.5h4.5M12 7v5l3 2" />,
  arrow: <path d="M5 12h13m-5-5 5 5-5 5" />,
  lock: <path d="M7 11V8a5 5 0 0 1 10 0v3m-11 0h12v9H6v-9Zm6 4v2" />,
  check: <path d="m5 12 4.2 4.2L19 6.5" />,
  link: <path d="M10 13.8a4 4 0 0 0 5.7.1l2-2a4 4 0 0 0-5.7-5.7l-1.1 1.1M14 10.2a4 4 0 0 0-5.7-.1l-2 2a4 4 0 0 0 5.7 5.7l1.1-1.1" />,
  user: <path d="M20 21a8 8 0 0 0-16 0M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />,
  terminal: <path d="m7 8 3 3-3 3m5 0h5M4 4h16v16H4z" />,
  copy: <path d="M9 9h10v10H9zM5 15H4V5h10v1" />,
  plus: <path d="M12 5v14m-7-7h14" />,
  x: <path d="M18 6 6 18M6 6l12 12" />
};

export function Icon({ name, className = "", ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} {...props}>{paths[name]}</svg>;
}

