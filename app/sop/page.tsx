import type { Metadata } from "next";
import { PageHero } from "@/components/ui";
import { SopWriter } from "./SopWriter";

export const metadata: Metadata = { title: "SOP writer" };

export default function SopPage() {
  return (
    <>
      <PageHero icon="🎓" title="SOP / Genuine Student writer" subtitle="Upload your CV, transcripts, offer letter and IELTS to fill the details automatically, or type them in. You get a genuine statement in the right format for your country (Australia GS, Canada study plan, standard SOP), built only from your real facts." />
      <div className="container-x py-8">
        <SopWriter />
      </div>
    </>
  );
}
