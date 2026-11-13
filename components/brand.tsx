export const NAV = [
  { href: "/check", label: "Document Review" },
  { href: "/review", label: "Support Doc Review" },
  { href: "/countries", label: "Countries" },
  { href: "/refusal", label: "Refusal Review" },
  { href: "/letter", label: "Letter Writer" },
  { href: "/form", label: "Application Form" },
  { href: "/guide", label: "Guide" },
];

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2 font-extrabold tracking-tight">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-cyan-400 text-lg shadow-lg shadow-indigo-500/40 [transform:perspective(200px)_rotateY(-14deg)_rotateX(8deg)]">🛂</span>
      <span className={light ? "text-white" : "text-slate-900"}>
        Visa<span className="text-gradient">Review</span>
      </span>
    </span>
  );
}
