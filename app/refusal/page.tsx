import type { Metadata } from "next";
import { PageHero } from "@/components/ui";
import { RefusalTool } from "./RefusalTool";

export const metadata: Metadata = { title: "Visa refusal review" };

export default function RefusalPage() {
  return (
    <>
      <PageHero icon="🚫" title="Visa refusal review" subtitle="Upload or paste your refusal letter. We pick out the officer's reasons, explain them in plain language, and show which documents you need and how to re-apply or appeal." />
      <div className="container-x py-8">
        <RefusalTool />
      </div>
    </>
  );
}
