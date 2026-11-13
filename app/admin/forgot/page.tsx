import type { Metadata } from "next";
import { ForgotForm } from "./ForgotForm";

export const metadata: Metadata = { title: "Reset admin password", robots: { index: false } };

export default function ForgotPage() {
  return (
    <div className="hero-bg relative grid min-h-[80vh] place-items-center overflow-hidden px-4 py-12">
      <div className="grid-floor" />
      <div className="scene relative w-full max-w-md">
        <ForgotForm />
      </div>
    </div>
  );
}
