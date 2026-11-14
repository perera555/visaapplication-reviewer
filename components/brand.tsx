export const NAV = [
  { href: "/register", label: "Register" },
  { href: "/check", label: "Doc Review" },
  { href: "/review", label: "Support Docs" },
  { href: "/verify", label: "Original Check" },
  { href: "/countries", label: "Countries" },
  { href: "/refusal", label: "Refusal" },
  { href: "/letter", label: "Letters" },
  { href: "/sop", label: "SOP" },
  { href: "/form", label: "Form" },
  { href: "/saved", label: "My Saved" },
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
