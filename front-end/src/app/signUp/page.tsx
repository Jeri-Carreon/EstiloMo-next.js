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
import {
  getPasswordRequirementChecks,
  isStrongPassword,
} from "@/lib/passwordValidation";

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
  const passwordChecks = getPasswordRequirementChecks(formData.password);

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

    if (!firstName) return setErrorMsg("First name is required.");
    if (!lastName) return setErrorMsg("Last name is required.");
    if (!email) return setErrorMsg("Email is required.");
    if (!isValidEmail(email)) return setErrorMsg("Please enter a valid email address.");
    if (!password) return setErrorMsg("Password is required.");
    if (!isStrongPassword(password)) {
      return setErrorMsg(
        "Password must be at least 8 characters and include uppercase, lowercase, number, and symbol."
      );
    }
    if (!confirmPassword) return setErrorMsg("Please confirm your password.");
    if (password !== confirmPassword) return setErrorMsg("Passwords do not match.");
    if (!mobileNumber) return setErrorMsg("Mobile number is required.");
    if (!/^09\d{9}$/.test(mobileNumber)) {
      return setErrorMsg("Mobile number must start with 09 and contain exactly 11 digits.");
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
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        px: 2,
        py: 4,
        backgroundImage:
          'linear-gradient(rgba(0,0,0,0.62), rgba(0,0,0,0.72)), url("/images/banner.jpg")',
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 520,
          px: { xs: 3, sm: 6 },
          py: 4,
          borderRadius: "28px",
          textAlign: "center",
          color: "#fff",
          background: "rgba(255,255,255,0.12)",
          border: "1px solid rgba(255,255,255,0.25)",
          backdropFilter: "blur(6px)",
        }}
      >
        <Box
          component="img"
          src="/images/logo.jpg"
          alt="The Barbs Bro Logo"
          sx={{
            width: { xs: 130, sm: 160 },
            height: { xs: 130, sm: 160 },
            objectFit: "contain",
            mb: 1,
          }}
        />

        <Box
          component="h1"
          sx={{
            m: 0,
            fontSize: { xs: "2rem", sm: "2.3rem" },
            fontWeight: 800,
            color: "#fff",
          }}
        >
          EstiloMo
        </Box>

        <Box
          sx={{
            color: "rgba(255,255,255,0.8)",
            fontSize: "1rem",
            mb: 3,
          }}
        >
          Sharp cuts. Sharper style.
        </Box>

        <Box
          component="form"
          onSubmit={handleSignup}
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 1.6,
          }}
        >
          <TextField
            label="First Name *"
            value={formData.firstName}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, firstName: e.target.value }))
            }
            fullWidth
            sx={fieldSx}
            slotProps={{
              inputLabel: {
                shrink: true,
              },
            }}
          />

          <TextField
            label="Last Name *"
            value={formData.lastName}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, lastName: e.target.value }))
            }
            fullWidth
            sx={fieldSx}
            slotProps={{
              inputLabel: {
                shrink: true,
              },
            }}
          />

          <TextField
            label="Email *"
            type="email"
            value={formData.email}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, email: e.target.value }))
            }
            fullWidth
            sx={fieldSx}
            slotProps={{
              inputLabel: {
                shrink: true,
              },
            }}
          />

          <FormControl fullWidth variant="outlined" sx={fieldSx}>
            <InputLabel shrink>Password *</InputLabel>
            <OutlinedInput
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, password: e.target.value }))
              }
              label="Password *"
              endAdornment={
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword((prev) => !prev)}
                    edge="end"
                    sx={{ color: "#fff" }}
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              }
            />
          </FormControl>

          {formData.password.length > 0 && (
            <Box
              sx={{
                mt: -0.6,
                mb: 0.4,
                px: 0.4,
                textAlign: "left",
              }}
            >
              {passwordChecks.map((requirement) => (
                <Box
                  key={requirement.label}
                  sx={{
                    color: requirement.met ? "#b9f6ca" : "rgba(255,255,255,0.72)",
                    fontSize: "0.84rem",
                    lineHeight: 1.5,
                  }}
                >
                  {requirement.met ? "✓" : "•"} {requirement.label}
                </Box>
              ))}
            </Box>
          )}

          <FormControl fullWidth variant="outlined" sx={fieldSx}>
            <InputLabel shrink>Confirm Password *</InputLabel>
            <OutlinedInput
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              label="Confirm Password *"
              endAdornment={
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    edge="end"
                    sx={{ color: "#fff" }}
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
              inputLabel: {
                shrink: true,
              },
              htmlInput: {
                maxLength: 11,
                inputMode: "numeric",
                pattern: "[0-9]*",
              },
            }}
            fullWidth
            sx={fieldSx}
          />

          {errorMsg && (
            <Box
              sx={{
                color: "#ffb4b4",
                fontSize: "0.9rem",
                textAlign: "center",
              }}
            >
              {errorMsg}
            </Box>
          )}

          <Button
            variant="contained"
            type="submit"
            disabled={loading}
            sx={primaryButtonSx}
          >
            {loading ? "Creating Account..." : "Register"}
          </Button>

          <Button
            variant="text"
            sx={{
              textTransform: "none",
              fontSize: "0.95rem",
              color: "#fff",
              backgroundColor: "transparent",
              "&:hover": {
                backgroundColor: "rgba(255,255,255,0.08)",
              },
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

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    color: "#fff",
    borderRadius: "14px",
    backgroundColor: "rgba(0,0,0,0.25)",
    "& fieldset": {
      borderColor: "rgba(255,255,255,0.45)",
    },
    "&:hover fieldset": {
      borderColor: "#fff",
    },
    "&.Mui-focused fieldset": {
      borderColor: "#fff",
    },
  },
  "& .MuiInputLabel-root": {
    color: "rgba(255,255,255,0.8)",
  },
  "& .MuiInputLabel-root.Mui-focused": {
    color: "#fff",
  },
  "& .MuiInputBase-input::placeholder": {
    color: "rgba(255,255,255,0.65)",
    opacity: 1,
  },
  "& input:-webkit-autofill": {
    WebkitBoxShadow: "0 0 0 1000px rgba(0,0,0,0.25) inset",
    WebkitTextFillColor: "#fff",
    caretColor: "#fff",
    borderRadius: "14px",
    transition: "background-color 9999s ease-in-out 0s",
  },
  "& input:-webkit-autofill:hover": {
    WebkitBoxShadow: "0 0 0 1000px rgba(0,0,0,0.25) inset",
    WebkitTextFillColor: "#fff",
  },
  "& input:-webkit-autofill:focus": {
    WebkitBoxShadow: "0 0 0 1000px rgba(0,0,0,0.25) inset",
    WebkitTextFillColor: "#fff",
  },
  "& .MuiOutlinedInput-input:-webkit-autofill": {
    WebkitBoxShadow: "0 0 0 1000px rgba(0,0,0,0.25) inset",
    WebkitTextFillColor: "#fff",
    caretColor: "#fff",
  },
};

const primaryButtonSx = {
  mt: 1,
  height: 56,
  borderRadius: "999px",
  fontSize: "1.1rem",
  fontWeight: 800,
  textTransform: "none",
  color: "#111",
  backgroundColor: "#fff",
  boxShadow: "none",
  "&:hover": {
    backgroundColor: "#f2f2f2",
    boxShadow: "none",
  },
  "&.Mui-disabled": {
    backgroundColor: "rgba(255,255,255,0.7)",
    color: "rgba(0,0,0,0.55)",
  },
};
