"use client";

import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import OutlinedInput from "@mui/material/OutlinedInput";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";

import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [openInvReset, setOpenInvReset] = useState(false);
  const [openNoInput, setOpenNoInput] = useState(false);
  const [openDiffPass, setOpenDiffPass] = useState(false);
  const [openWeakPass, setOpenWeakPass] = useState(false);
  const [openSamePassword, setOpenSamePassword] = useState(false);
  const [openSuccess, setOpenSuccess] = useState(false);

  const [sessionReady, setSessionReady] = useState(false);

  const validatePassword = (value: string) => {
    return (
      value.length >= 8 &&
      /[a-zA-Z]/.test(value) &&
      /[0-9]/.test(value) &&
      /[!@#$%^&*(),.?":{}|<>]/.test(value)
    );
  };

  const handleReset = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!password.trim() || !confirmPassword.trim()) {
      setOpenNoInput(true);
      return;
    }

    if (password !== confirmPassword) {
      setOpenDiffPass(true);
      return;
    }

    if (!validatePassword(password)) {
      setOpenWeakPass(true);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        console.error(error.message);

        if (
          error.message
            .toLowerCase()
            .includes("different from the old password")
        ) {
          setOpenSamePassword(true);
          return;
        }

        setOpenInvReset(true);
        return;
      }

      setOpenSuccess(true);

      setTimeout(() => {
        router.push("/login");
      }, 5000);
    } catch (error) {
      console.error(error);
      setOpenInvReset(true);
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        setOpenInvReset(true);
        return;
      }

      setSessionReady(true);
    };

    checkSession();
  }, [supabase]);

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
            color: "rgba(255,255,255,0.9)",
            fontSize: "1.15rem",
            fontWeight: 700,
            mt: 1,
            mb: 1,
          }}
        >
          Reset Password
        </Box>

        <Box
          sx={{
            color: "rgba(255,255,255,0.8)",
            fontSize: "1rem",
            mb: 4,
          }}
        >
          Create a new password for your account.
        </Box>

        <Box
          component="form"
          onSubmit={handleReset}
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <FormControl fullWidth variant="outlined" sx={fieldSx}>
            <InputLabel shrink>Enter New Password *</InputLabel>
            <OutlinedInput
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              label="Enter New Password *"
              endAdornment={
                <IconButton
                  onClick={() => setShowPassword((prev) => !prev)}
                  edge="end"
                  sx={{ color: "#fff" }}
                >
                  {showPassword ? <Visibility /> : <VisibilityOff />}
                </IconButton>
              }
            />
          </FormControl>

          <FormControl fullWidth variant="outlined" sx={fieldSx}>
            <InputLabel shrink>Confirm New Password *</InputLabel>
            <OutlinedInput
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              label="Confirm New Password *"
              endAdornment={
                <IconButton
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  edge="end"
                  sx={{ color: "#fff" }}
                >
                  {showConfirmPassword ? <Visibility /> : <VisibilityOff />}
                </IconButton>
              }
            />
          </FormControl>

          <Button
            variant="contained"
            type="submit"
            disabled={!sessionReady}
            sx={primaryButtonSx}
          >
            Reset Password
          </Button>
        </Box>
      </Paper>

      <Dialog open={openInvReset} onClose={() => setOpenInvReset(false)}>
        <IconButton
          onClick={() => setOpenInvReset(false)}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>

        <DialogContent
          sx={{
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1,
            mt: 3,
          }}
        >
          <ErrorIcon sx={{ fontSize: 70, color: "red" }} />
          Invalid Reset Link

          <DialogActions sx={{ justifyContent: "center" }}>
            <Button
              sx={{
                backgroundColor: "black",
                color: "white",
                "&:hover": {
                  backgroundColor: "#FBBC05",
                },
              }}
              onClick={() => {
                setOpenInvReset(false);
                router.push("/forgot-password");
              }}
            >
              Please Request New Reset Link
            </Button>
          </DialogActions>
        </DialogContent>
      </Dialog>

      <Dialog open={openNoInput} onClose={() => setOpenNoInput(false)}>
        <IconButton
          onClick={() => setOpenNoInput(false)}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>

        <DialogContent
          sx={{
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1,
            mt: 3,
          }}
        >
          <ErrorIcon sx={{ fontSize: 70, color: "red" }} />
          Please Fill in both fields
        </DialogContent>
      </Dialog>

      <Dialog open={openDiffPass} onClose={() => setOpenDiffPass(false)}>
        <IconButton
          onClick={() => setOpenDiffPass(false)}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>

        <DialogContent
          sx={{
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1,
            mt: 3,
          }}
        >
          <ErrorIcon sx={{ fontSize: 70, color: "red" }} />
          Passwords do not match
        </DialogContent>
      </Dialog>

      <Dialog open={openWeakPass} onClose={() => setOpenWeakPass(false)}>
        <IconButton
          onClick={() => setOpenWeakPass(false)}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>

        <DialogContent
          sx={{
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1,
            mt: 5,
          }}
        >
          <ErrorIcon sx={{ fontSize: 80, color: "red" }} />
        </DialogContent>

        <DialogTitle sx={{ textAlign: "center", position: "relative" }}>
          Password is Weak
        </DialogTitle>

        <DialogContent>
          Password must meet the following requirements:
          <ul style={{ marginTop: 10, paddingLeft: 20 }}>
            <li>At least 8 characters long</li>
            <li>Contains at least 1 letter (A-Z)</li>
            <li>Contains at least 1 number (0-9)</li>
            <li>Contains at least 1 special character (!@#$%^&*)</li>
          </ul>
        </DialogContent>
      </Dialog>

      <Dialog
        open={openSamePassword}
        onClose={() => setOpenSamePassword(false)}
      >
        <IconButton
          onClick={() => setOpenSamePassword(false)}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>

        <DialogContent
          sx={{
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1,
            mt: 5,
          }}
        >
          <ErrorIcon sx={{ fontSize: 70, color: "red" }} />
        </DialogContent>

        <DialogTitle sx={{ textAlign: "center", position: "relative" }}>
          Same Password
        </DialogTitle>

        <DialogContent>
          Your new password must be different from your old password.
        </DialogContent>
      </Dialog>

      <Dialog open={openSuccess} onClose={() => setOpenSuccess(false)}>
        <DialogContent
          sx={{
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1,
            mt: 3,
          }}
        >
          <CheckCircleIcon sx={{ fontSize: 70, color: "green" }} />

          <DialogTitle sx={{ textAlign: "center", position: "relative" }}>
            Password Updated!
          </DialogTitle>

          You will be redirected to login page
        </DialogContent>
      </Dialog>
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