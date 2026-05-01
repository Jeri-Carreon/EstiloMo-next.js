'use client';

import { useState } from "react";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = async () => {
    await fetch("/api/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    alert("User created!");
  };

  return (
    <div>
      <h2>Sign Up</h2>

      <input onChange={(e) => setEmail(e.target.value)} />
      <input type="password" onChange={(e) => setPassword(e.target.value)} />

      <button onClick={handleRegister}>Register</button>
    </div>
  );
}