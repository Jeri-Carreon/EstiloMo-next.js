"use client";

import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import OutlinedInput from "@mui/material/OutlinedInput";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import IconButton from "@mui/material/IconButton";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";

import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

import { createClient } from "@/lib/supabase/client";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginContent() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setErrorMsg("");
    setLoading(true);

    try {
      const supabase = createClient();
      const normalizedEmail = email.toLowerCase().trim();

      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        console.error("LOGIN ERROR:", error);

        await fetch("/api/auth/security-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: normalizedEmail,
            success: false,
          }),
        }).catch(() => null);

        const message = error.message.toLowerCase();

        if (message.includes("supabase browser client is not configured")) {
          setErrorMsg(
            "Login is not configured on this deployment. Please check the Supabase build environment variables."
          );
        } else if (message.includes("email not confirmed")) {
          setErrorMsg("Please confirm your email address before logging in.");
        } else if (message.includes("locked") || message.includes("too many")) {
          setErrorMsg("You have been locked out. Try again after 1 minute.");
        } else {
          setErrorMsg("Invalid email or password");
        }

        setLoading(false);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setErrorMsg("Login failed. Please try again.");
        setLoading(false);
        return;
      }

      await fetch("/api/auth/security-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          success: true,
        }),
      }).catch(() => null);

      const res = await fetch("/api/user/role");

      if (!res.ok) {
        if (res.status === 401) {
          await supabase.auth.signOut().catch(() => null);
          setErrorMsg(
            "Your account is inactive or unauthorized. Please contact support."
          );
        } else {
          setErrorMsg("Failed to load user info. Please try again.");
        }
        setLoading(false);
        return;
      }

      const user = await res.json();

      if (["OWNER", "RECEPTIONIST"].includes(user.role)) {
        router.replace("/admin/dashboard");
      } else if (user.role === "BARBER") {
        router.replace("/admin/barbers");
      } else {
        router.replace(redirect || "/myAppointments");
      }
    } catch (error) {
      console.error("LOGIN ERROR:", error);
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
          py: 5,
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
            width: { xs: 150, sm: 190 },
            height: { xs: 150, sm: 190 },
            objectFit: "contain",
            mb: 2,
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
            mb: 4,
          }}
        >
          Sharp cuts. Sharper style.
        </Box>

        <Box
          component="form"
          onSubmit={handleLogin}
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <TextField
            label="Enter Your Email *"
            variant="outlined"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            sx={fieldSx}
            slotProps={{
              inputLabel: {
                shrink: true,
              },
            }}
          />

          <FormControl fullWidth variant="outlined" sx={fieldSx}>
            <InputLabel shrink>Enter Your Password *</InputLabel>
            <OutlinedInput
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              label="Enter Your Password *"
              endAdornment={
                <IconButton
                  onClick={() => setShowPassword((prev) => !prev)}
                  edge="end"
                  sx={{ color: "#fff" }}
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              }
            />
          </FormControl>

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

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              width: "100%",
              gap: 1,
              flexWrap: "wrap",
            }}
          >
            <FormControlLabel
              sx={{ m: 0, color: "#fff" }}
              control={
                <Checkbox
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  sx={{
                    color: "#fff",
                    "&.Mui-checked": {
                      color: "#fff",
                    },
                  }}
                />
              }
              label="Remember me"
            />

            <Button
              variant="text"
              sx={{
                textTransform: "none",
                fontSize: "0.9rem",
                color: "#fff",
                backgroundColor: "transparent",
                "&:hover": {
                  backgroundColor: "rgba(255,255,255,0.08)",
                },
              }}
              onClick={() => router.push("/forgot-password")}
            >
              Forgot password?
            </Button>
          </Box>

          <Button
            variant="contained"
            type="submit"
            disabled={loading}
            sx={primaryButtonSx}
          >
            {loading ? "Logging in..." : "Log In"}
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
            onClick={() => router.push("/signUp")}
          >
            Don&apos;t Have An Account Yet?
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

  "& input:-webkit-autofill": {
    WebkitBoxShadow: "0 0 0 100px rgba(0,0,0,0.25) inset",
    WebkitTextFillColor: "#fff",
    caretColor: "#fff",
    borderRadius: "14px",
    transition: "background-color 9999s ease-in-out 0s",
  },

  "& input:-webkit-autofill:hover": {
    WebkitBoxShadow: "0 0 0 100px rgba(0,0,0,0.25) inset",
    WebkitTextFillColor: "#fff",
  },

  "& input:-webkit-autofill:focus": {
    WebkitBoxShadow: "0 0 0 100px rgba(0,0,0,0.25) inset",
    WebkitTextFillColor: "#fff",
  },
};

const primaryButtonSx = {
  mt: 1,
  height: 58,
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