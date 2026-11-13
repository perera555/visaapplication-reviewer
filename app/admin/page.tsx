import type { Metadata } from "next";
import { Dashboard } from "./Dashboard";

export const metadata: Metadata = { title: "Admin dashboard", robots: { index: false } };

export default function AdminPage() {
  return <Dashboard />;
}
