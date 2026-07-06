import { Suspense } from "react";
import ConfirmRecoveryClient from "./ConfirmRecoveryClient";

export default function ConfirmRecoveryPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ConfirmRecoveryClient />
    </Suspense>
  );
}
