import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Admin login", robots: { index: false } };

export default function AdminLoginPage() {
  return (
    <div className="hero-bg relative grid min-h-[80vh] place-items-center overflow-hidden px-4 py-12">
      <div className="grid-floor" />
      <div className="scene relative w-full max-w-md">
        <LoginForm />
      </div>
    </div>
  );
}
