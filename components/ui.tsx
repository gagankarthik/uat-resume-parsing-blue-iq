// Shared presentational primitives - matched to the Blue-IQ Parser product UI:
// cool paper, navy ink, cobalt accent. Pure Tailwind, no external deps.
"use client";

import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** Brand monogram - a document being parsed into structured lines. */
export function BrandMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <span className={cn("relative grid shrink-0 place-items-center overflow-hidden rounded-[10px] bg-accent-700 text-[var(--surface)] shadow-sm ring-1 ring-black/10", className)}>
      <svg viewBox="0 0 24 24" fill="none" className="h-[60%] w-[60%]">
        <path d="M6 6.5h8M6 10h11M6 13.5h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M14.2 14.3l2.1 2.1 3.6-4" stroke="var(--color-brass-400)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/** Real brand lockup (public/logo.svg). */
export function Logo({ className = "h-7 w-auto" }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logo.svg" alt="Blue-IQ" className={className} />;
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-line bg-surface p-6 shadow-[0_1px_2px_rgba(10,23,51,0.04),0_8px_24px_-16px_rgba(10,23,51,0.16)]", className)}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mb-4">
      <h2 className="font-display text-lg font-semibold tracking-tight text-ink">{children}</h2>
      {hint && <p className="mt-1 text-sm text-ink-soft">{hint}</p>}
    </div>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  loading?: boolean;
};

export function Button({ variant = "primary", loading = false, className, children, disabled, ...rest }: ButtonProps) {
  const base = "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50";
  const variants: Record<string, string> = {
    primary: "bg-accent-700 text-[var(--surface)] shadow-sm hover:bg-accent-800 hover:-translate-y-px active:translate-y-0",
    secondary: "border border-line-strong bg-surface text-ink hover:border-accent-300 hover:bg-accent-50",
    danger: "bg-red-700 text-white hover:bg-red-800",
    ghost: "text-ink-soft hover:bg-black/[0.04] hover:text-ink",
  };
  return (
    <button className={cn(base, variants[variant], className)} disabled={disabled || loading} {...rest}>
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl border border-line-strong bg-surface px-3.5 text-sm text-ink outline-none transition-colors",
        "placeholder:text-ink-soft/60 focus:border-accent-500 focus:ring-4 focus:ring-accent-500/10",
        className,
      )}
      {...rest}
    />
  );
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition-colors",
        "placeholder:text-ink-soft/60 focus:border-accent-500 focus:ring-4 focus:ring-accent-500/10",
        className,
      )}
      {...rest}
    />
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <label className="mb-1.5 block text-sm font-medium text-ink">{children}</label>;
}

export function Spinner({ className }: { className?: string }) {
  return <span className={cn("inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent", className)} aria-hidden />;
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" | "danger" | "info" }) {
  const tones: Record<string, string> = {
    neutral: "bg-black/[0.05] text-ink-soft ring-line",
    success: "bg-accent-50 text-accent-700 ring-accent-200",
    warning: "bg-amber-100 text-amber-800 ring-amber-200",
    danger: "bg-red-100 text-red-700 ring-red-200",
    info: "bg-accent-50 text-accent-700 ring-accent-200",
  };
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 font-mono text-[0.7rem] font-medium ring-1 ring-inset", tones[tone])}>
      {children}
    </span>
  );
}

/** Segmented tab switcher. Scrolls horizontally on narrow screens instead of wrapping. */
export function Tabs<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string; badge?: number }[];
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "scroll-fine flex max-w-full gap-0.5 overflow-x-auto rounded-lg border border-line-strong p-0.5",
        className,
      )}
    >
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.id)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              active ? "bg-accent-700 text-[var(--surface)]" : "text-ink-soft hover:bg-black/[0.04] hover:text-ink",
            )}
          >
            {o.label}
            {typeof o.badge === "number" && o.badge > 0 && (
              <span
                className={cn(
                  "rounded-full px-1.5 text-[10px] font-semibold",
                  active ? "bg-white/20" : "bg-black/[0.06]",
                )}
              >
                {o.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function Select({ className, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-9 max-w-full rounded-lg border border-line-strong bg-surface px-2.5 text-xs text-ink outline-none transition-colors",
        "focus:border-accent-500 focus:ring-4 focus:ring-accent-500/10",
        className,
      )}
      {...rest}
    />
  );
}

/**
 * Back control for the mobile master-detail flow.
 *
 * On a phone the list and the detail cannot share the screen, so selecting a file
 * swaps to the detail view - and without this there is no way back to the list except
 * the browser button, which would leave the console entirely.
 */
export function BackButton({ onClick, label = "Back", className }: { onClick: () => void; label?: string; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-ink-soft transition-colors hover:bg-black/[0.04] hover:text-ink",
        className,
      )}
    >
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </button>
  );
}

export function EmptyState({ title, hint, className }: { title: string; hint?: string; className?: string }) {
  return (
    <div
      className={cn(
        "flex min-h-[14rem] flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong p-6 text-center",
        className,
      )}
    >
      <p className="text-sm font-medium text-ink">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-ink-soft">{hint}</p>}
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
        <path d="M12 8v5M12 16h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>{message}</span>
    </div>
  );
}
