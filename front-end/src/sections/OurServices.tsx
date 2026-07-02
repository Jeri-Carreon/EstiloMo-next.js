"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { styled } from "@mui/material/styles";
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const Item = styled(Paper)(({ theme }) => ({
  backgroundColor: "#fff",
  ...theme.typography.body2,
  padding: theme.spacing(1),
  textAlign: "center",
  color: (theme.vars ?? theme).palette.text.secondary,
  ...theme.applyStyles("dark", {
    backgroundColor: "#1A2027",
  }),
  boxShadow: "none",
}));

interface Service {
  id: string;
  name: string;
  price: string;
  description: string;
}

export default function ServicesSection() {
  const router = useRouter();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [openAuthModal, setOpenAuthModal] = useState(false);

  const {
    data: services = [],
    isLoading: loading,
    error,
  } = useQuery<Service[]>({
    queryKey: ["publicServicesSection"],
    queryFn: async () => {
      const res = await fetch("/api/services", {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Unable to load services.");
      }

      return data.services || [];
    },
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

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
    <Box sx={{ px: 8, py: 6, backgroundColor: "#fdfcfa" }}>
      <Typography
        variant="h3"
        align="center"
        gutterBottom
        sx={{
          mb: 4,
          fontFamily: "var(--font-nunito-sans)",
        }}
      >
        Our Services
      </Typography>

      {loading && (
        <Typography
          align="center"
          sx={{ fontFamily: "var(--font-nunito-sans)", mb: 3 }}
        >
          Loading services...
        </Typography>
      )}

      {error && (
        <Typography
          align="center"
          color="error"
          sx={{ fontFamily: "var(--font-nunito-sans)", mb: 3 }}
        >
          {error instanceof Error ? error.message : "Unable to load services."}
        </Typography>
      )}

      <Grid container spacing={3} sx={{ alignItems: "stretch" }}>
        {services.map((service) => (
          <Grid size={{ xs: 12, md: 6 }} key={service.id}>
            <Paper
              elevation={2}
              sx={{
                p: 3,
                borderRadius: 2,
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontWeight: "bold",
                  fontFamily: "var(--font-nunito-sans)",
                }}
              >
                {service.name} - ₱{service.price}
              </Typography>

              <Typography
                variant="body2"
                sx={{
                  mt: 1,
                  fontFamily: "var(--font-nunito-sans)",
                }}
              >
                - {service.description}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <Button
          variant="contained"
          color="secondary"
          size="large"
          onClick={handleBookAppointment}
          sx={{
            width: {
              xs: "100%",
              sm: "60%",
              md: "auto",
            },
            p: 3,
            borderRadius: 10,
            fontSize: "1.2rem",
            textTransform: "none",
            fontFamily: "var(--font-nunito-sans)",
            "&:hover": {
              backgroundColor: "accent.main",
            },
          }}
        >
          Book An Appointment!
        </Button>
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
            To continue booking an appointment, please log in or register.
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
            onClick={() => router.push("/login?redirect=/appointment")}
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
    </Box>
  );
}
