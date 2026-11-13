import type { Metadata } from "next";
import { PageHero } from "@/components/ui";
import { CheckWizard } from "./CheckWizard";

export const metadata: Metadata = { title: "Document review & success rate" };

export default function CheckPage() {
  return (
    <>
      <PageHero icon="📂" title="Visa document review" subtitle="Choose your destination and visa type, answer a few questions and upload your documents. You get your application status, the documents you still need and your estimated success rate." />
      <div className="container-x py-8">
        <CheckWizard />
      </div>
    </>
  );
}
