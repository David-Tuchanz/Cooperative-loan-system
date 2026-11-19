import { Suspense } from "react";
import ApplicationsClient from "./applications-client";

export const instant = false;

export default function LoanOfficerApplicationsPage() {
  return (
    <Suspense fallback={null}>
      <ApplicationsClient />
    </Suspense>
  );
}