"use client";

import { useState } from "react";

export default function AdminPage() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    mobileNumber: "",
    role: "RECEPTIONIST",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const res = await fetch("/api/admin/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();

    if (!data.ok) {
      alert(data.error);
      return;
    }

    alert("User created successfully!");

    setForm({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      mobileNumber: "",
      role: "RECEPTIONIST",
    });
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Owner Admin Panel</h1>

      <form onSubmit={handleSubmit}>
        <input
          placeholder="First Name"
          value={form.firstName}
          onChange={(e) => setForm({ ...form, firstName: e.target.value })}
        />

        <input
          placeholder="Last Name"
          value={form.lastName}
          onChange={(e) => setForm({ ...form, lastName: e.target.value })}
        />

        <input
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />

        <input
          placeholder="Password"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />

        <input
          placeholder="Mobile Number"
          value={form.mobileNumber}
          onChange={(e) => setForm({ ...form, mobileNumber: e.target.value })}
        />

        <select
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
        >
          <option value="RECEPTIONIST">Receptionist</option>
          <option value="BARBER">Barber</option>
        </select>

        <button type="submit">Create User</button>
      </form>
    </div>
  );
}