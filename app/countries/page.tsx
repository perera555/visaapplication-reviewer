import type { Metadata } from "next";
import { CountryPicker } from "@/components/CountryPicker";
import { PageHero } from "@/components/ui";

export const metadata: Metadata = { title: "Visa requirements by country" };

export default function CountriesPage() {
  return (
    <>
      <PageHero icon="🌍" title="Visa requirements, country by country" subtitle="Pick the country you are applying to. Each guide shows the documents you need for every visa type, how the process works, the official portal and your options if you are refused." />
      <div className="container-x py-10">
        <CountryPicker />
      </div>
    </>
  );
}
