"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";

import CloseIcon from "@mui/icons-material/Close";
import ContentCutIcon from "@mui/icons-material/ContentCut";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ChatbotFloatingButton from "@/components/ChatbotFloatingButton";

type CustomerLoyaltyCard = {
  id: string;
  stars: number;
  status: "ACTIVE" | "COMPLETED";
  customerId: string;
};

type Appointment = {
  id: string;
  appointmentCode: string;
  appointmentDate: string;
  startMinutes: number;
  endMinutes: number;
  barber: {
    firstName: string;
    lastName: string;
  };
  service: {
    name: string;
    price: string;
  };
  payment?: {
    amount: string;
    downPayment: string;
    method: string;
    status: string;
  } | null;
};

export default function CustomerLoyaltyCardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [loyaltyCard, setLoyaltyCard] =
    useState<CustomerLoyaltyCard | null>(null);
  const [customerInfo, setCustomerInfo] = useState<any>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);

  const loadLoyaltyCard = async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/loyaltyCard", {
        cache: "no-store",
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load loyalty card");
      }

      setLoyaltyCard(data.loyaltyCard);
      setCustomerInfo(data.customer);
      setAppointments(data.appointments || []);
    } catch (error) {
      console.error("Error loading loyalty card:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/login");
      return;
    }

    if (session.user.role !== "CUSTOMER") {
      router.push("/unauthorized");
      return;
    }

    loadLoyaltyCard();
  }, [session, status]);

  if (loading || status === "loading") {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!loyaltyCard || !customerInfo) {
    return <Typography sx={{ p: 4 }}>No loyalty card found.</Typography>;
  }

  const stars = Math.min(loyaltyCard.stars, 8);

  const stampIndexes = [0, 1, 2, 3, 4, 5, 6, 7];

  return (
    <>
      <Navbar />

      <Box
        sx={{
          minHeight: "calc(100vh - 120px)",
          bgcolor: "#fff",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          px: 2,
          py: { xs: 6, md: 9 },
        }}
      >
        <Paper
          elevation={0}
          sx={{
            width: "100%",
            maxWidth: 1050,
            minHeight: { xs: "auto", md: 560 },
            bgcolor: "#ffdc73",
            borderRadius: 1,
            px: { xs: 3, sm: 5, md: 8 },
            py: { xs: 5, md: 7 },
            color: "#000",
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography
            sx={{
              textAlign: "center",
              fontWeight: 700,
              fontSize: { xs: "1rem", md: "1.3rem" },
              mb: 1,
              color: "#333",
            }}
          >
            {customerInfo.firstName} {customerInfo.lastName}
          </Typography>

          <Typography
            sx={{
              textAlign: "center",
              fontWeight: 900,
              fontSize: { xs: "2.6rem", sm: "3.5rem", md: "4.5rem" },
              lineHeight: 1,
              mb: 2,
            }}
          >
            Loyalty Card
          </Typography>

          <Typography
            sx={{
              textAlign: "center",
              fontSize: { xs: "0.95rem", md: "1.25rem" },
              mb: { xs: 4, md: 5 },
            }}
          >
            Complete the stamps and get 50% and a Free Service
          </Typography>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "repeat(5, 56px)",
                sm: "repeat(5, 88px)",
                md: "repeat(5, 110px)",
              },
              gridTemplateRows: {
                xs: "repeat(2, 56px)",
                sm: "repeat(2, 88px)",
                md: "repeat(2, 110px)",
              },
              columnGap: { xs: 1.5, sm: 2.5, md: 4 },
              rowGap: { xs: 2, sm: 3, md: 4 },
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {/* Top row: stamp 1, 2, 3, 4, 50% */}
            {stampIndexes.slice(0, 4).map((index) => {
              const appointment = appointments[index];
              const filled = index < stars;

              return (
                <StampBox
                  key={index}
                  filled={filled}
                  appointment={appointment}
                  onClick={() =>
                    filled && appointment && setSelectedAppointment(appointment)
                  }
                />
              );
            })}

            <RewardBox
              label="50%"
              onClick={() =>
                stars >= 4 &&
                appointments[3] &&
                setSelectedAppointment(appointments[3])
              }
            />

            {/* Bottom row: stamp 5, 6, 7, 8, FREE */}
            {stampIndexes.slice(4, 8).map((index) => {
              const appointment = appointments[index];
              const filled = index < stars;

              return (
                <StampBox
                  key={index}
                  filled={filled}
                  appointment={appointment}
                  onClick={() =>
                    filled && appointment && setSelectedAppointment(appointment)
                  }
                />
              );
            })}

            <RewardBox
              label="FREE"
              onClick={() =>
                stars >= 8 &&
                appointments[7] &&
                setSelectedAppointment(appointments[7])
              }
            />
          </Box>

          <Typography
            sx={{
              width: "100%",
              textAlign: "right",
              mt: 5,
              fontWeight: 800,
              fontSize: "1rem",
            }}
          >
            {customerInfo.customerCode}
          </Typography>
        </Paper>
      </Box>

      <Dialog
        open={!!selectedAppointment}
        onClose={() => setSelectedAppointment(null)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 2,
              p: 3,
            },
          },
        }}
      >
        {selectedAppointment && (
          <Box>
            <IconButton
              onClick={() => setSelectedAppointment(null)}
              sx={{ position: "absolute", right: 8, top: 8 }}
            >
              <CloseIcon />
            </IconButton>

            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                mb: 2,
                pr: 4,
              }}
            >
              <Typography sx={{ fontWeight: 900 }}>
                {customerInfo.firstName} {customerInfo.lastName}
              </Typography>

              <Typography sx={{ fontWeight: 800, color: "#777" }}>
                {selectedAppointment.appointmentCode}
              </Typography>
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr 1fr",
                bgcolor: "#f5f5f5",
                py: 1,
                textAlign: "center",
                fontWeight: 800,
                color: "#777",
              }}
            >
              <Typography>Barber</Typography>
              <Typography>Service Type</Typography>
              <Typography>Date</Typography>
              <Typography>Price</Typography>
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr 1fr",
                py: 1.5,
                textAlign: "center",
                borderBottom: "1px solid #eee",
              }}
            >
              <Typography>
                {selectedAppointment.barber.firstName}{" "}
                {selectedAppointment.barber.lastName}
              </Typography>

              <Typography>{selectedAppointment.service.name}</Typography>

              <Typography>
                {new Date(
                  selectedAppointment.appointmentDate
                ).toLocaleDateString()}
              </Typography>

              <Typography>
                ₱ {Number(selectedAppointment.service.price).toLocaleString()}
              </Typography>
            </Box>

            <Box
              sx={{
                mt: 3,
                mx: "auto",
                width: 280,
                bgcolor: "#f7f7f7",
                borderRadius: 2,
                p: 2,
              }}
            >
              <ReceiptRow
                label="Subtotal"
                value={`₱ ${Number(
                  selectedAppointment.service.price
                ).toLocaleString()}`}
              />
              <ReceiptRow label="Discount" value="₱ 0" />
              <ReceiptRow
                label="Total Payment"
                value={`₱ ${Number(
                  selectedAppointment.payment?.amount ||
                    selectedAppointment.service.price
                ).toLocaleString()}`}
              />
              <ReceiptRow
                label="Mode of Payment"
                value={selectedAppointment.payment?.method || "Cash"}
              />
              <ReceiptRow label="Discount %" value="0" />
            </Box>
          </Box>
        )}
      </Dialog>

      <Footer />
      <ChatbotFloatingButton />
    </>
  );
}

function StampBox({
  filled,
  appointment,
  onClick,
}: {
  filled: boolean;
  appointment?: Appointment;
  onClick: () => void;
}) {
  return (
    <Box
      onClick={onClick}
      sx={{
        width: { xs: 56, sm: 88, md: 110 },
        height: { xs: 56, sm: 88, md: 110 },
        borderRadius: { xs: 2.5, md: 4 },
        bgcolor: filled ? "#e8e8e8" : "#fff",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        cursor: filled && appointment ? "pointer" : "default",
        transition: "0.2s ease",
        boxShadow: filled ? "0 4px 10px rgba(0,0,0,0.15)" : "none",
        "&:hover": {
          transform: filled && appointment ? "scale(1.05)" : "none",
        },
      }}
    >
      {filled && (
        <Box
          sx={{
            width: { xs: 34, sm: 48, md: 58 },
            height: { xs: 34, sm: 48, md: 58 },
            borderRadius: "50%",
            bgcolor: "#111",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 3px 8px rgba(0,0,0,0.25)",
          }}
        >
          <ContentCutIcon
            sx={{
              color: "#ffdc73",
              fontSize: { xs: 20, sm: 28, md: 32 },
            }}
          />
        </Box>
      )}
    </Box>
  );
}

function RewardBox({
  label,
  onClick,
}: {
  label: "50%" | "FREE";
  onClick: () => void;
}) {
  return (
    <Box
      onClick={onClick}
      sx={{
        width: { xs: 56, sm: 88, md: 110 },
        height: { xs: 56, sm: 88, md: 110 },
        borderRadius: { xs: 2.5, md: 4 },
        bgcolor: "#fff",
        border: { xs: "2px solid #111", md: "3px solid #111" },
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontWeight: 900,
        fontSize:
          label === "FREE"
            ? { xs: "0.85rem", sm: "1.25rem", md: "1.8rem" }
            : { xs: "1rem", sm: "1.5rem", md: "2rem" },
        cursor: "pointer",
      }}
    >
      {label}
    </Box>
  );
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
      <Typography sx={{ fontWeight: 800, fontSize: 13 }}>{label}</Typography>
      <Typography sx={{ fontWeight: 800, fontSize: 13 }}>{value}</Typography>
    </Box>
  );
}