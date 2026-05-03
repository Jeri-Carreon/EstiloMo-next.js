'use client';

import { useState } from "react";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = async () => { // async = makes the function wait for a response from server by using await keyword
    await fetch("/api/register", { // await = pause execution until fetch request is complete, then continue with the rest of the function
      method: "POST",
      headers: {"Content-Type": "application/json",},
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