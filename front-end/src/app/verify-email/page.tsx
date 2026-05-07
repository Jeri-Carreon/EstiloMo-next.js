'use client';

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus("error");
        return;
      }

      try {
        const res = await fetch("/api/verify-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();

        if (data.ok) {
          setStatus("success");
        } else {
          setStatus("error");
        }
      } catch (err) {
        setStatus("error");
      }
    };

    verifyEmail();
  }, [token]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 2,
      }}
    >
      {status === "loading" && (
        <>
          <CircularProgress />
          <Typography>Verifying your email...</Typography>
        </>
      )}

      {status === "success" && (
        <>
          <Typography variant="h5" color="green">
            Email verified successfully!
          </Typography>

          <Button
            variant="contained"
            onClick={() => router.push("/login")}
          >
            Go to Login
          </Button>
        </>
      )}

      {status === "error" && (
        <>
          <Typography variant="h5" color="red">
            Verification failed or link is invalid.
          </Typography>

          <Button
            variant="contained"
            onClick={() => router.push("/register")}
          >
            Go back to Register
          </Button>
        </>
      )}
    </Box>
  );
}