import type { Metadata } from "next";
import { PageHero } from "@/components/ui";
import { VerifyTool } from "./VerifyTool";

export const metadata: Metadata = { title: "Original or fake check" };

export default function VerifyPage() {
  return (
    <>
      <PageHero icon="🛡️" title="Document check: original or fake?" subtitle="Upload documents one by one. Each one is checked for signs of editing and gets Likely original, Needs manual check or Suspicious, with the reasons. If a genuine document is flagged by mistake, mark it as original manually." />
      <div className="container-x py-8">
        <VerifyTool />
      </div>
    </>
  );
}
