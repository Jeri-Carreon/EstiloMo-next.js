"use client";

import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";

import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import CloseIcon from "@mui/icons-material/Close";
import ErrorIcon from "@mui/icons-material/Error";
import LockResetIcon from "@mui/icons-material/LockReset";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function ConfirmRecoveryClient() {
  const params = useSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [openInvalidLink, setOpenInvalidLink] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token_hash: params.get("token_hash"),
          type: params.get("type"),
        }),
      });

      if (res.ok) {
        router.push("/reset-password");
        return;
      }

      setOpenInvalidLink(true);
    } catch (error) {
      console.error(error);
      setOpenInvalidLink(true);
    } finally {
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
            color: "rgba(255,255,255,0.9)",
            fontSize: "1.15rem",
            fontWeight: 700,
            mt: 1,
            mb: 1,
          }}
        >
          Confirm Password Reset
        </Box>

        <Box
          sx={{
            color: "rgba(255,255,255,0.8)",
            fontSize: "1rem",
            mb: 4,
          }}
        >
          For your security, please confirm that you requested this password
          reset.
        </Box>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
          }}
        >
          <LockResetIcon
            sx={{ fontSize: 64, color: "rgba(255,255,255,0.85)" }}
          />

          <Button
            variant="contained"
            onClick={handleConfirm}
            disabled={loading}
            sx={primaryButtonSx}
          >
            {loading ? "Verifying…" : "Reset My Password"}
          </Button>
        </Box>
      </Paper>

      <Dialog open={openInvalidLink} onClose={() => setOpenInvalidLink(false)}>
        <IconButton
          onClick={() => setOpenInvalidLink(false)}
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
          Invalid or Expired Link

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
                setOpenInvalidLink(false);
                router.push("/forgot-password");
              }}
            >
              Please Request New Reset Link
            </Button>
          </DialogActions>
        </DialogContent>
      </Dialog>
    </Box>
  );
}

const primaryButtonSx = {
  mt: 1,
  width: "100%",
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