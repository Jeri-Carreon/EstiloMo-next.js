'use client';

import { FormEvent, useState } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");

  const handleForgotPassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const res = await fetch("/api/forgot-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();

    if (data.ok) {
      alert("If this email exists, a reset link has been sent.");
    } else {
      alert("Something went wrong.");
    }
  };

  return (
    <Box
      sx={{
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f5f5f5",
      }}
    >
      <Paper
        elevation={3}
        sx={{
          width: "100%",
          maxWidth: 400,
          p: 4,
          borderRadius: 3,
          textAlign: "center",
        }}
      >
        <h1 style={{
          color: "#000",
          fontSize: "2.5rem",
        }}>
          Forgot Password
        </h1>

        <Box
          component="form"
          onSubmit={handleForgotPassword}
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <TextField
            label={
            <>
            Enter Your Email <span style={{ color: 'red' }}>*</span>
            </>
            }
            variant="outlined"
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
          />

          <Button variant="contained" type="submit" 
          sx={{
            maxWidth: '100%', 
            borderRadius: 10,
            fontSize: '1.2rem',
            textTransform: 'none',
            color: 'black',
            backgroundColor: '#D9D9D9',
            '&:hover': {
              backgroundColor: '#FBBC05',
            },
            }}>
          Send Reset Link
        </Button>
        </Box>
      </Paper>
    </Box>
  );
}