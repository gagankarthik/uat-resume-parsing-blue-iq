import Link from "next/link";

const CARDS = [
  {
    href: "/keys",
    title: "API Key Management",
    body: "Issue new API keys for client companies, set per-key rate limits, and revoke keys. The raw key is shown once on creation.",
  },
  {
    href: "/test",
    title: "Test the Parser",
    body: "Upload a resume and see the extracted fields populate editable text boxes — the same JSON a client integration receives.",
  },
  {
    href: "/settings",
    title: "Settings",
    body: "Configure the API base URL, the API key used for testing, and the admin password for key management.",
  },
];

export default function Home() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Resume Parser — UAT Console</h1>
        <p className="mt-2 max-w-2xl text-zinc-600 dark:text-zinc-400">
          Internal tool for user-acceptance testing: provision and manage API keys, and exercise the
          resume-parsing endpoint. Configure access in{" "}
          <Link href="/settings" className="font-medium text-indigo-600 hover:underline">
            Settings
          </Link>{" "}
          first.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {CARDS.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-colors hover:border-indigo-300 hover:bg-indigo-50/40 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/20"
          >
            <h2 className="text-base font-semibold text-zinc-900 group-hover:text-indigo-700 dark:text-zinc-50 dark:group-hover:text-indigo-300">
              {c.title}
            </h2>
            <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400">{c.body}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
