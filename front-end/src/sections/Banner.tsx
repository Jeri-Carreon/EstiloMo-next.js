"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";

import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

export default function Banner() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [openAuthModal, setOpenAuthModal] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const getSession = async () => {
      const supabase = createClient();

      const {
        data: { session },
      } = await supabase.auth.getSession();

      setIsLoggedIn(!!session);
    };

    getSession();
  }, []);

  const handleBookAppointment = () => {
    if (isLoggedIn) {
      router.push("/appointment");
    } else {
      setOpenAuthModal(true);
    }
  };

  return (
    <>
      <Box
        sx={{
          width: "100%",
          minHeight: "100vh",
          backgroundImage: "url(/images/banner.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          display: "flex",
          alignItems: "center",
          color: "white",
          overflow: "hidden",
        }}
      >
        <Container
          maxWidth="lg"
          sx={{
            py: { xs: 10, md: 0 },
            px: { xs: 3, sm: 4, md: 2 },
          }}
        >
          <Typography
            sx={{
              fontWeight: "bold",
              fontFamily: "var(--font-nunito-sans)",
              fontSize: {
                xs: "3.5rem",
                sm: "5rem",
                md: "7rem",
              },
              lineHeight: 0.9,
              wordBreak: "break-word",
            }}
          >
            EstiloMo
          </Typography>

          <Typography
            sx={{
              fontWeight: "bold",
              fontFamily: "var(--font-nunito-sans)",
              fontSize: {
                xs: "2rem",
                sm: "2.5rem",
                md: "3rem",
              },
              mt: 1,
            }}
          >
            By The Barbs Bro
          </Typography>

          <Typography
            sx={{
              mt: 3,
              fontFamily: "var(--font-nunito-sans)",
              fontSize: {
                xs: "1.15rem",
                sm: "1.35rem",
                md: "1.6rem",
              },
              lineHeight: 1.5,
              maxWidth: {
                xs: "100%",
                sm: "500px",
                md: "700px",
              },
            }}
          >
            Sharp Cuts. Solid Confidence. We provide quality and affordable
            haircuts and services. The Barbs Bro. Undeniable excellence.
          </Typography>

          <Stack
            spacing={2}
            direction="column"
            sx={{
              mt: 4,
              width: {
                xs: "100%",
                sm: "320px",
                md: "350px",
              },
            }}
          >
            <Button
              variant="contained"
              color="secondary"
              size="large"
              onClick={handleBookAppointment}
              sx={{
                fontSize: {
                  xs: "1rem",
                  md: "1.1rem",
                },
                borderRadius: 10,
                width: "100%",
                textTransform: "none",
                fontFamily: "var(--font-nunito-sans)",
                py: 1.5,
                "&:hover": {
                  backgroundColor: "accent.main",
                },
              }}
            >
              Book An Appointment!
            </Button>

            <Button
              variant="contained"
              color="secondary"
              size="large"
              component="a"
              href="/downloads/EstiloMo.apk"
              download
              sx={{
                fontSize: {
                  xs: "1rem",
                  md: "1.1rem",
                },
                borderRadius: 10,
                width: "100%",
                textTransform: "none",
                fontFamily: "var(--font-nunito-sans)",
                py: 1.5,
                "&:hover": {
                  backgroundColor: "accent.main",
                },
              }}
            >
              Download Our App
            </Button>
          </Stack>
        </Container>
      </Box>

      <Dialog
        open={openAuthModal}
        onClose={() => setOpenAuthModal(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 4,
              backgroundColor: "#fff",
              border: "1px solid #e5e5e5",
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            textAlign: "center",
            fontWeight: 900,
            fontFamily: "var(--font-nunito-sans)",
            color: "#111",
            pt: 4,
            pb: 1,
            fontSize: "1.8rem",
          }}
        >
          Sign In Required
        </DialogTitle>

        <DialogContent>
          <Typography
            sx={{
              textAlign: "center",
              fontFamily: "var(--font-nunito-sans)",
              color: "#555",
              lineHeight: 1.7,
              fontSize: "1rem",
            }}
          >
            To continue booking an appointment, please log in or
            register.
          </Typography>
        </DialogContent>

        <DialogActions
          sx={{
            justifyContent: "center",
            gap: 2,
            pb: 4,
            px: 3,
            pt: 2,
          }}
        >
          <Button
            variant="outlined"
            onClick={() => setOpenAuthModal(false)}
            sx={{
              borderRadius: 10,
              textTransform: "none",
              fontFamily: "var(--font-nunito-sans)",
              px: 3,
              py: 1,
              fontWeight: 700,
              color: "#555",
              borderColor: "#d0d0d0",
              "&:hover": {
                borderColor: "#111",
                backgroundColor: "#f5f5f5",
              },
            }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={() =>
              router.push("/login?redirect=/appointment")
            }
            sx={{
              borderRadius: 10,
              textTransform: "none",
              fontFamily: "var(--font-nunito-sans)",
              px: 3,
              py: 1,
              fontWeight: 800,
              color: "#111",
              backgroundColor: "#FBBC05",
              boxShadow: "none",
              "&:hover": {
                backgroundColor: "#e0a800",
                boxShadow: "none",
              },
            }}
          >
            Log In / Register
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}