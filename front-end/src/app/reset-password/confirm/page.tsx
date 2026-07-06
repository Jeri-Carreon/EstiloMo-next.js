// front-end/src/app/reset-password/confirm/page.tsx
"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function ConfirmRecoveryPage() {
  const params = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setLoading(true);
    const res = await fetch("/api/auth/verify-recovery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token_hash: params.get("token_hash"),
        type: params.get("type"),
      }),
    });
    if (res.ok) {
      router.push("/reset-password");
    } else {
      setError("This link is invalid or has expired. Please request a new one.");
    }
    setLoading(false);
  };

  return (
    <div>
      <h1>Confirm password reset</h1>
      <button onClick={handleConfirm} disabled={loading}>
        {loading ? "Verifying…" : "Reset my password"}
      </button>
      {error && <p>{error}</p>}
    </div>
  );
}