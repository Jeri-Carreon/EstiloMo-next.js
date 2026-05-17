"use client";

import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ChatbotFloatingButton from "@/components/ChatbotFloatingButton";

const staticAppointments = [
  {
    id: "1",
    customerEmail: "ivanluis.marquilencia@gmail.com",
    status: "Completed",
  },
  {
    id: "2",
    customerEmail: "ivanluis.marquilencia@gmail.com",
    status: "Completed",
  },
  {
    id: "3",
    customerEmail: "ivanluis.marquilencia@gmail.com",
    status: "Completed",
  },
];

export default function LoyaltyCardPage() {
  const { data: session } = useSession();

  const customerEmail = session?.user?.email;

  const completedAppointments = useMemo(() => {
    return staticAppointments.filter(
      (appointment) =>
        appointment.customerEmail === customerEmail &&
        appointment.status === "Completed"
    );
  }, [customerEmail]);

  const stamps = completedAppointments.length;
  const totalSlots = 8;

  const [customerCode, setCustomerCode] = useState("");

  useEffect(() => {
  const loadCustomer = async () => {
    try {
      const res = await fetch("/api/profile");

      const data = await res.json();

      if (res.ok) {
        setCustomerCode(data.customer?.customerCode || "000");
      }
    } catch (error) {
      console.error(error);
    }
  };

  loadCustomer();
  }, []);

  return (
    <>
      <Navbar />

      <Box
        component="main"
        sx={{
          minHeight: "calc(100vh - 120px)",
          backgroundColor: "#f5f5f5",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          px: 2,
          py: 8,
        }}
      >
        <Paper
          elevation={4}
          sx={{
            width: "100%",
            maxWidth: 900,
            backgroundColor: "#ffdc73",
            borderRadius: 2,
            px: { xs: 3, md: 6 },
            py: { xs: 4, md: 6 },
            color: "#000",
          }}
        >
          <Typography
            variant="h1"
            sx={{
              textAlign: "center",
              fontWeight: 900,
              fontSize: { xs: "2.8rem", md: "5rem" },
              lineHeight: 1,
              mb: 2,
            }}
          >
            Loyalty Card
          </Typography>

          <Typography
            sx={{
              textAlign: "center",
              fontSize: { xs: "1rem", md: "1.4rem" },
              mb: 5,
            }}
          >
            Complete the stamps and get 50% and a Free Service
          </Typography>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "repeat(2, 90px)",
                sm: "repeat(3, 90px)",
                md: "repeat(5, 90px)",
              },
              gap: 3,
              justifyContent: "center",
            }}
          >
            {[...Array(totalSlots)].map((_, index) => (
              <Box
                key={index}
                sx={{
                  width: 90,
                  height: 85,
                  borderRadius: 4,
                  backgroundColor: index < stamps ? "#e8e8e8" : "#fff",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                {index < stamps && (
                  <Box
                    component="img"
                    src="/barber-pole.png"
                    alt="Stamp"
                    sx={{
                      width: 48,
                      height: 48,
                      objectFit: "contain",
                    }}
                  />
                )}
              </Box>
            ))}

            <Box
              sx={{
                width: 90,
                height: 85,
                borderRadius: 4,
                backgroundColor: "#fff",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                fontWeight: 900,
                fontSize: "1.8rem",
              }}
            >
              50%
            </Box>

            <Box
              sx={{
                width: 90,
                height: 85,
                borderRadius: 4,
                backgroundColor: "#fff",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                fontWeight: 900,
                fontSize: "1.5rem",
              }}
            >
              FREE
            </Box>
          </Box>

          <Typography
            sx={{
              textAlign: "right",
              mt: 4,
              fontWeight: 700,
              fontSize: "1rem",
            }}
          >
            {customerCode}
          </Typography>
        </Paper>
      </Box>

      <Footer />
      <ChatbotFloatingButton />
    </>
  );
}