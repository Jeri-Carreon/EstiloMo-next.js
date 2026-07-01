"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";

import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import IconButton from "@mui/material/IconButton";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [openSuccess, setOpenSuccess] = useState(false);
  const [openNoInput, setOpenNoInput] = useState(false);
  const [openError, setOpenError] = useState(false);

  const router = useRouter();

  const handleForgotPassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!email.trim()) {
      setOpenNoInput(true);
      return;
    }

    try {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (data.ok) {
        setOpenSuccess(true);
      } else {
        setOpenError(true);
      }
    } catch (error) {
      setOpenError(true);
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
            mx: "auto",
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
          Forgot Password
        </Box>

        <Box
          sx={{
            color: "rgba(255,255,255,0.8)",
            fontSize: "1rem",
            mb: 2,
          }}
        >
          Enter your email address to receive a password reset link.
        </Box>

        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-start",
            mb: 2,
          }}
        >
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push("/login")}
            sx={{
              color: "#fff",
              textTransform: "none",
              fontWeight: 600,
              borderRadius: "999px",
              px: 2,
              "&:hover": {
                backgroundColor: "rgba(255,255,255,0.1)",
              },
            }}
          >
            Back to Login
          </Button>
        </Box>

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

          <Button variant="contained" type="submit" sx={primaryButtonSx}>
            Send Reset Link
          </Button>
        </Box>
      </Paper>

      <Dialog open={openSuccess} onClose={() => setOpenSuccess(false)}>
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
          <CheckCircleIcon sx={{ fontSize: 70, color: "green" }} />

          <DialogTitle sx={{ textAlign: "center", position: "relative" }}>
            Success
          </DialogTitle>

          If an account with that email exists, password reset instructions have
          been sent to your email address.
        </DialogContent>

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
              setOpenSuccess(false);
            }}
          >
            Confirm
          </Button>
        </DialogActions>
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
            mt: 5,
          }}
        >
          <ErrorIcon sx={{ fontSize: 70, color: "red" }} />
        </DialogContent>

        <DialogTitle sx={{ textAlign: "center", position: "relative" }}>
          Missing Email
        </DialogTitle>

        <DialogContent>Please enter your email address</DialogContent>
      </Dialog>

      <Dialog open={openError} onClose={() => setOpenError(false)}>
        <IconButton
          onClick={() => setOpenError(false)}
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
          Error
        </DialogTitle>
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
};