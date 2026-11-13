import type { Metadata } from "next";
import { LoginForm } from "../login/LoginForm";

export const metadata: Metadata = { title: "Owner setup", robots: { index: false } };

// Hidden first-run page for the system owner (needs ADMIN_SETUP_KEY in production; closes once an admin exists).
export default function AdminSetupPage() {
  return (
    <div className="hero-bg relative grid min-h-[80vh] place-items-center overflow-hidden px-4 py-12">
      <div className="grid-floor" />
      <div className="scene relative w-full max-w-md">
        <LoginForm setup />
      </div>
    </div>
  );
}
