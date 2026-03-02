import { LabClient } from "@/components/storefront/lab-client";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Future Lab | Flash",
  description: "Vote on upcoming concepts. Shape the future of fashion.",
};

export default async function FutureLabPage() {
  return (
    <div className="min-h-screen bg-background">
      <LabClient concepts={[]} userVotes={[]} />
    </div>
  );
}
