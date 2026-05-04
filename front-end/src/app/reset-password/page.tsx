'use client';

import Box from "@mui/material/Box"
import Paper from "@mui/material/Paper";

import OutlinedInput from "@mui/material/OutlinedInput";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";

import InputAdornment  from '@mui/material/InputAdornment';
import IconButton from "@mui/material/IconButton";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import { FormEvent, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams(); // useSearchParams gets token from URL
  const router = useRouter();

  const token = searchParams.get("token");

  const [password, setPassword] = useState("");  // useState stores new password
  const [confirmPassword, setConfirmPassword] = useState("")

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleTogglePassword = () => {
    setShowPassword((prev) => !prev);
  };
  const handleToggleConfirmPassword = () => {
    setShowConfirmPassword((prev) => !prev);
  };

  const handleReset = async (e: FormEvent<HTMLFormElement>) => { // handleReset send token and new password
    e.preventDefault();

    if (!token) {
      alert("Invalid reset link");
      return;
    }
    
    if(password !== confirmPassword) {
      alert("Passwords Do Not Match");
      return;
    }

    if (!password || !confirmPassword) {
      alert("Please fill in both fields");
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

      window.location.href = "/login"
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
          maxWidth: 500,
          p: 4,
          borderRadius: 3,
          textAlign: "center",
        }}
      >
        <h1 style={{
          color: "#000",
          fontSize: "2.5rem",
        }}>
          Create New Password
        </h1>
          <Box
          component="form"
          onSubmit={handleReset}
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
          >
            <FormControl fullWidth variant="outlined">
            <InputLabel>
              Enter New Password <span style={{ color: "red" }}>*</span>
            </InputLabel>

            <OutlinedInput
              type={showPassword ? "text" : "password"}
              onChange={(e) => setPassword(e.target.value)}
              label="Enter New Password"
              endAdornment={
                <InputAdornment position="end">
                  <IconButton onClick={handleTogglePassword} edge="end">
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              }
            />
          </FormControl>  

          <FormControl fullWidth variant="outlined">
          <InputLabel>
            Confirm New Password <span style={{ color: "red" }}>*</span>
          </InputLabel>

          <OutlinedInput
            type={showConfirmPassword ? "text" : "password"}
            onChange={(e) => setConfirmPassword(e.target.value)}
            label="Confirm New Password"
            endAdornment={
              <InputAdornment position="end">
                <IconButton onClick={handleToggleConfirmPassword} edge="end">
                  {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            }
          />
        </FormControl>  

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
            Reset Password
          </Button>
          </Box>
      </Paper>
    </Box>
  );
}