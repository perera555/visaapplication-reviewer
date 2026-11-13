import type { Metadata } from "next";
import { PageHero } from "@/components/ui";
import { RegisterTool } from "./RegisterTool";

export const metadata: Metadata = { title: "Customer registration" };

export default function RegisterPage() {
  return (
    <>
      <PageHero icon="🪪" title="Register with us" subtitle="Upload your documents one by one and your details fill in automatically. Add your photo and submit to get your registration number. Our team can then find your file and documents at any time." />
      <div className="container-x py-8">
        <RegisterTool />
      </div>
    </>
  );
}
