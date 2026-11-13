import type { Metadata } from "next";
import { PageHero } from "@/components/ui";
import { ReviewTool } from "./ReviewTool";

export const metadata: Metadata = { title: "Support document review" };

export default function ReviewPage() {
  return (
    <>
      <PageHero icon="🔍" title="Support document & CV review" subtitle="Upload cover letters, sponsor, employer and invitation letters, statements or your CV. We flag error documents, show the exact words or sentences to replace, rearrange letters into the right order, and list the documents you still need." />
      <div className="container-x py-8">
        <ReviewTool />
      </div>
    </>
  );
}
