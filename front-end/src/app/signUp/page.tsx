"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import OutlinedInput from "@mui/material/OutlinedInput";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";

import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

import { signupAction } from "./actions";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function SignUpPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    mobileNumber: "",
  });

  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const cleanMobileNumber = (value: string) => {
    return value.replace(/\D/g, "").slice(0, 11);
  };

  const handleSignup = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setErrorMsg("");

    const firstName = formData.firstName.trim();
    const lastName = formData.lastName.trim();
    const email = formData.email.toLowerCase().trim();
    const password = formData.password;
    const mobileNumber = cleanMobileNumber(formData.mobileNumber);

    if (!firstName) {
      setErrorMsg("First name is required.");
      return;
    }

    if (!lastName) {
      setErrorMsg("Last name is required.");
      return;
    }

    if (!email) {
      setErrorMsg("Email is required.");
      return;
    }

    if (!isValidEmail(email)) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    if (!password) {
      setErrorMsg("Password is required.");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    if (!confirmPassword) {
      setErrorMsg("Please retype your password.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    if (!mobileNumber) {
      setErrorMsg("Mobile number is required.");
      return;
    }

    if (!/^09\d{9}$/.test(mobileNumber)) {
      setErrorMsg("Mobile number must start with 09 and contain exactly 11 digits.");
      return;
    }

    setLoading(true);

    try {
      const result = await signupAction({
        firstName,
        lastName,
        email,
        password,
        mobileNumber,
      });

      if (!result.ok) {
        setErrorMsg(result.error ?? "Registration failed.");
        setLoading(false);
        return;
      }

      router.push("/login");
    } catch (error) {
      console.error("SIGNUP ERROR:", error);
      setErrorMsg("Something went wrong. Please try again.");
      setLoading(false);
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
        px: 2,
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
        <h1
          style={{
            color: "#000",
            fontSize: "2.5rem",
            marginBottom: "1rem",
          }}
        >
          Create Account
        </h1>

        <Box
          component="form"
          onSubmit={handleSignup}
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <TextField
            label="First Name *"
            value={formData.firstName}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                firstName: e.target.value,
              }))
            }
            fullWidth
          />

          <TextField
            label="Last Name *"
            value={formData.lastName}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                lastName: e.target.value,
              }))
            }
            fullWidth
          />

          <TextField
            label="Email *"
            type="email"
            value={formData.email}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                email: e.target.value,
              }))
            }
            fullWidth
          />

          <FormControl fullWidth variant="outlined">
            <InputLabel>Password *</InputLabel>
            <OutlinedInput
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  password: e.target.value,
                }))
              }
              label="Password *"
              endAdornment={
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword((prev) => !prev)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              }
            />
          </FormControl>

          <FormControl fullWidth variant="outlined">
            <InputLabel>Retype Password *</InputLabel>
            <OutlinedInput
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              label="Retype Password *"
              endAdornment={
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    edge="end"
                  >
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              }
            />
          </FormControl>

          <TextField
            label="Mobile Number *"
            placeholder="09XXXXXXXXX"
            value={formData.mobileNumber}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                mobileNumber: cleanMobileNumber(e.target.value),
              }))
            }
            slotProps={{
              htmlInput: {
                maxLength: 11,
                inputMode: "numeric",
                pattern: "[0-9]*",
              },
            }}
            fullWidth
          />

          {errorMsg && (
            <p
              style={{
                color: "red",
                margin: "4px 0 0 0",
                fontSize: "0.9rem",
              }}
            >
              {errorMsg}
            </p>
          )}

          <Button
            variant="contained"
            type="submit"
            disabled={loading}
            sx={{
              maxWidth: "100%",
              borderRadius: 10,
              fontSize: "1.2rem",
              textTransform: "none",
              color: "black",
              backgroundColor: "#D9D9D9",
              "&:hover": {
                backgroundColor: loading ? "#D9D9D9" : "#FBBC05",
              },
            }}
          >
            {loading ? "Creating Account..." : "Sign Up"}
          </Button>

          <Button
            variant="text"
            sx={{
              textTransform: "none",
              fontSize: "0.9rem",
              color: "#555",
              backgroundColor: "transparent",
            }}
            onClick={() => router.push("/login")}
          >
            Already Have An Account?
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}