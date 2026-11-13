import type { Metadata } from "next";
import { PageHero } from "@/components/ui";
import { FormTool } from "./FormTool";

export const metadata: Metadata = { title: "Visa application form" };

export default function FormPage() {
  return (
    <>
      <PageHero icon="📝" title="Visa application form" subtitle="Fill a guided visa application form section by section, or upload an official PDF application form and fill it here. Your details are auto-filled into the PDF." />
      <div className="container-x py-8">
        <FormTool />
      </div>
    </>
  );
}
