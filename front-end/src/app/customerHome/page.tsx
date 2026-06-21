"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Divider from "@mui/material/Divider";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";

import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ChatbotFloatingButton from "@/components/ChatbotFloatingButton";

type Customer = {
  firstName: string;
};

type RecommendedService = {
  id: string;
  name: string;
  price: number;
  image: string | null;
  reason: string;
};

type LatestTransaction = {
  id: string;
  type: "APPOINTMENT" | "WALKIN";
  code: string;
  status: string;
  date: string;
  time: string;
  services: {
    id: string;
    name: string;
    quantity: number;
    price: number;
    subtotal: number;
  }[];
  barber: string;
  subtotal: number;
  discount: number;
  totalPrice: number;
};

const fallbackRecommendedServices: RecommendedService[] = [
  {
    id: "scalp-treatment",
    name: "Scalp Treatment",
    price: 650,
    image: "/images/scalp-treatment.jpg",
    reason: "Based on your past service selections.",
  },
  {
    id: "scalp-massage",
    name: "Scalp Massage",
    price: 200,
    image: "/images/scalp-massage.jpg",
    reason: "Based on your past service selections.",
  },
  {
    id: "shave",
    name: "Shave",
    price: 150,
    image: "/images/shave.jpg",
    reason: "Based on your past service selections.",
  },
];

function formatPeso(value: number) {
  return `₱ ${Number(value || 0).toLocaleString("en-PH")}`;
}

function getStatusColor(status: string) {
  const value = status.toUpperCase();

  if (["PAID", "COMPLETED", "SCHEDULED"].includes(value)) {
    return {
      bgcolor: "#000",
      color: "#fff",
    };
  }

  if (value === "PENDING") {
    return {
      bgcolor: "#92400E",
      color: "#fff",
    };
  }

  if (["CANCELLED", "REJECTED", "NOSHOW"].includes(value)) {
    return {
      bgcolor: "#b91c1c",
      color: "#fff",
    };
  }

  if (["PARTIAL", "REFUNDED"].includes(value)) {
    return {
      bgcolor: "#6b7280",
      color: "#fff",
    };
  }

  return {
    bgcolor: "#000",
    color: "#fff",
  };
}

export default function CustomerLandingPage() {
  const router = useRouter();

  const [customer, setCustomer] = useState<Customer>({
    firstName: "Customer",
  });

  const [latestTransaction, setLatestTransaction] =
    useState<LatestTransaction | null>(null);

  const [recommendedServices, setRecommendedServices] = useState<
    RecommendedService[]
  >(fallbackRecommendedServices);

  const [loading, setLoading] = useState(true);

  const totalPrice = useMemo(() => {
    return formatPeso(latestTransaction?.totalPrice || 0);
  }, [latestTransaction]);

  useEffect(() => {
    const fetchCustomerHome = async () => {
      try {
        setLoading(true);

        const res = await fetch("/api/customerHome", {
          cache: "no-store",
        });

        const data = await res.json();

        if (res.ok) {
          setCustomer(data.customer || { firstName: "Customer" });
          setLatestTransaction(data.latestTransaction || null);

          if (Array.isArray(data.recommendedServices)) {
            setRecommendedServices(data.recommendedServices);
          }
        }
      } catch (error) {
        console.error("Failed to fetch customer home:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerHome();
  }, []);

  return (
    <Box sx={{ bgcolor: "#fff", minHeight: "100vh" }}>
      <Navbar />

      <Box sx={{ px: { xs: 2, md: 5 }, py: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 500, mb: 1 }}>
          Welcome Back, {customer.firstName}!
        </Typography>

        <Typography sx={{ fontSize: 14, mb: 4 }}>
          Here's your latest transaction and personalized recommendations.
        </Typography>

        {loading ? (
          <Box
            sx={{
              minHeight: 260,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              bgcolor: "#e5e5e5",
              mb: 4,
            }}
          >
            <CircularProgress />
          </Box>
        ) : latestTransaction ? (
          <Card
            elevation={0}
            sx={{
              bgcolor: "#e5e5e5",
              borderRadius: 0,
              p: { xs: 2, md: 3 },
              mb: 4,
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 2,
                mb: 3,
              }}
            >
              <Box>
                <Typography sx={{ fontSize: 16, fontWeight: 500 }}>
                  Your Latest {latestTransaction.type === "WALKIN"
                    ? "Walk-in Transaction"
                    : "Appointment"}
                </Typography>

                <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
                  {latestTransaction.code}
                </Typography>
              </Box>

              <Chip
                label={latestTransaction.status}
                sx={{
                  ...getStatusColor(latestTransaction.status),
                  borderRadius: 1,
                  fontSize: 12,
                  height: 28,
                  fontWeight: 700,
                }}
              />
            </Box>

            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                justifyContent: "space-around",
                gap: 3,
                mb: 2,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 1.5,
                }}
              >
                <CalendarMonthIcon />

                <Box>
                  <Typography sx={{ fontWeight: 600 }}>Date</Typography>

                  <Typography sx={{ fontSize: 14 }}>
                    {latestTransaction.date}
                  </Typography>
                </Box>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 1.5,
                }}
              >
                <AccessTimeIcon />

                <Box>
                  <Typography sx={{ fontWeight: 600 }}>Time</Typography>

                  <Typography sx={{ fontSize: 14 }}>
                    {latestTransaction.time}
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Divider sx={{ borderColor: "#777", mb: 2 }} />

            <Typography sx={{ fontWeight: 500, mb: 1 }}>
              Services Booked
            </Typography>

            {latestTransaction.services.map((service) => (
              <Row
                key={service.id}
                label={
                  service.quantity > 1
                    ? `${service.name} x${service.quantity}`
                    : service.name
                }
                value={formatPeso(service.subtotal)}
              />
            ))}

            <Typography sx={{ fontWeight: 500, mt: 2, mb: 1 }}>
              Barber Booked
            </Typography>

            <Row label={latestTransaction.barber} />

            <Divider sx={{ borderColor: "#777", my: 2 }} />

            <Row
              label="Subtotal"
              value={formatPeso(latestTransaction.subtotal)}
              bold
            />

            {latestTransaction.discount > 0 && (
              <Row
                label="Discount"
                value={`-${formatPeso(latestTransaction.discount)}`}
                bold
              />
            )}

            <Row label="Total Price" value={totalPrice} bold />
          </Card>
        ) : (
          <Card
            elevation={0}
            sx={{
              bgcolor: "#e5e5e5",
              borderRadius: 0,
              p: { xs: 2, md: 3 },
              mb: 4,
              minHeight: 220,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              textAlign: "center",
            }}
          >
            <Typography sx={{ fontWeight: 700, mb: 1 }}>
              No appointment or walk-in transaction yet.
            </Typography>

            <Typography sx={{ fontSize: 14, mb: 2 }}>
              Book an appointment to get started.
            </Typography>

            <Button
              onClick={() => router.push("/appointment")}
              sx={{
                bgcolor: "#000",
                color: "#fff",
                borderRadius: 5,
                textTransform: "none",
                px: 4,
                "&:hover": {
                  bgcolor: "#222",
                },
              }}
            >
              Book Now
            </Button>
          </Card>
        )}

        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 1,
            mb: 3,
          }}
        >
          <BookmarkBorderIcon />

          <Typography variant="h6" sx={{ fontWeight: 500 }}>
            Recommended For You
          </Typography>
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              md: "repeat(3, minmax(280px, 320px))",
            },
            justifyContent: "space-evenly",
            gap: 4,
            width: "100%",
          }}
        >
          {recommendedServices.map((service) => (
            <Card
              key={service.id}
              elevation={0}
              sx={{
                bgcolor: "#d9d9d9",
                borderRadius: 0,
                p: 2,
              }}
            >
              <Box
                sx={{
                  width: "100%",
                  height: 170,
                  position: "relative",
                  mb: 1.5,
                  bgcolor: "#ccc",
                }}
              >
                <Box
                  component="img"
                  src={service.image || "/images/service-placeholder.jpg"}
                  alt={service.name}
                  onError={(event) => {
                    event.currentTarget.src = "/images/service-placeholder.jpg";
                  }}
                  sx={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              </Box>

              <Typography sx={{ fontWeight: 800, fontSize: 15 }}>
                {service.name} - {formatPeso(service.price)}
              </Typography>

              <Typography sx={{ fontSize: 11, mb: 1.5 }}>
                {service.reason}
              </Typography>

              <Button
                fullWidth
                variant="contained"
                onClick={() => router.push("/appointment")}
                sx={{
                  bgcolor: "#000",
                  color: "#fff",
                  borderRadius: 5,
                  fontSize: 11,
                  fontWeight: 700,
                  py: 0.7,
                  "&:hover": {
                    bgcolor: "#222",
                  },
                }}
              >
                Book Now
              </Button>
            </Card>
          ))}
        </Box>
      </Box>

      <Footer />

      <ChatbotFloatingButton />
    </Box>
  );
}

function Row({
  label,
  value,
  bold = false,
}: {
  label: string;
  value?: string;
  bold?: boolean;
}) {
  return (
    <Box
      sx={{
        bgcolor: "#c8c8c8",
        px: 2,
        py: 1,
        mb: 0.7,
        display: "flex",
        justifyContent: "space-between",
        gap: 2,
        fontWeight: bold ? 700 : 400,
        fontSize: 14,
      }}
    >
      <span>{label}</span>
      {value && <span>{value}</span>}
    </Box>
  );
}
