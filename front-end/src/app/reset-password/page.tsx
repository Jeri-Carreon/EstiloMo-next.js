'use client';

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams(); // useSearchParams gets token from URL
  const router = useRouter();

  const token = searchParams.get("token");

  const [password, setPassword] = useState("") // useState stores new password

  const handleReset = async (e) => { // handleReset send token and new password
    e.preventDefault();

    if (!token) {
      alert("Invalid reset link");
      return;
    }

    const res = await fetch("/api/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token, password }),
    });

    const data = await res.json();

    if (data.ok) {
      alert("Password updated!");
      router.push("/login"); // router.push = redirects user to url assigned"
    } else {
      alert("Invalid or expired token");
    }
  };

  return (
    <div>
      <h2>Reset Password</h2>

      <form onSubmit={handleReset}>
        <input
          type="password"
          placeholder="Enter new password"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit">Reset Password</button>
      </form>
    </div>
  );
}