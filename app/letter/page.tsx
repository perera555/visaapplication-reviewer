import type { Metadata } from "next";
import { PageHero } from "@/components/ui";
import { LetterWriter } from "./LetterWriter";

export const metadata: Metadata = { title: "Embassy letter writer" };

export default function LetterPage() {
  return (
    <>
      <PageHero icon="✍️" title="Letter writer for embassies & high commissions" subtitle="Reconsideration requests, appeals, re-application cover letters, explanation, sponsor, invitation and employer letters. Fill in the details, preview live, then download as PDF." />
      <div className="container-x py-8">
        <LetterWriter />
      </div>
    </>
  );
}
