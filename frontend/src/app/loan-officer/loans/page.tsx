
import { Suspense } from "react";
import LoansClient from "./loans-client";

export const instant = false;

export default function LoansPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-sm text-slate-500 dark:text-zinc-400">
          Loading loans...
        </div>
      }
    >
      <LoansClient />
    </Suspense>
  );
}
