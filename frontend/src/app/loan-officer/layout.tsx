import type { ReactNode } from "react";
import { OfficerShell } from "@/components/loan-officer/officer-shell";

export default function LoanOfficerLayout({ children }: { children: ReactNode }) {
  return <OfficerShell>{children}</OfficerShell>;
}