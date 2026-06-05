import Link from "next/link";

export function NavBar() {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--bg)]/70 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="group flex items-center gap-2.5">
          {/* Logo mark */}
          <span className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-sm font-bold text-white shadow-lg shadow-teal-500/20 ring-1 ring-white/20">
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            B
          </span>
          <span className="flex items-baseline gap-2">
            <span className="font-display text-[17px] font-semibold tracking-tight text-[var(--fg)]">
              Blue-IQ
            </span>
            <span className="hidden text-sm text-[var(--muted)] sm:inline">Résumé Parser</span>
          </span>
        </Link>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--bg-elev)]/60 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-500 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-teal-500" />
          </span>
          UAT Console
        </span>
      </nav>
    </header>
  );
}
