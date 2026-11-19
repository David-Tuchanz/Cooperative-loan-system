import { Suspense } from "react";
import MembersClient from "./members-client";

export const instant = false;

export default function LoanOfficerMembersPage() {
  return (
    <Suspense fallback={null}>
      <MembersClient />
    </Suspense>
  );
}