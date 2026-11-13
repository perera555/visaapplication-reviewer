import type { Metadata } from "next";
import { PageHero } from "@/components/ui";
import { SavedManager } from "./SavedManager";

export const metadata: Metadata = { title: "My saved work" };

export default function SavedPage() {
  return (
    <>
      <PageHero icon="📂" title="My saved work" subtitle="Everything you do in the app saves automatically on this device: document reviews with their files, letters and application forms. Open, download, duplicate or delete them here, or start a new one." />
      <div className="container-x py-8">
        <SavedManager />
      </div>
    </>
  );
}
