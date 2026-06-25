"use client";

import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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
  fiveRewardRedeemed: boolean;
};

type CustomerInfo = {
  firstName: string;
  lastName: string;
  customerCode: string;
};

type AppointmentService = {
  id: string;
  serviceId: string;
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
};

type Appointment = {
  id: string;
  appointmentCode: string;
  type: "Appointment" | "Walk-in";
  appointmentDate: string;
  startMinutes: number;
  endMinutes: number;
  barber: {
    firstName: string;
    lastName: string;
  };
  service: {
    name: string;
    price: string | number;
  };
  payment?: {
    amount: string | number;
    downPayment: string | number;
    method: string;
    status: string;
  } | null;
  subtotal: number;
  discount: number;
  totalAmount: number;
  discountPercent: number;
  services: AppointmentService[];
};

function formatPeso(value: string | number | null | undefined) {
  return `₱ ${Number(value || 0).toLocaleString("en-PH", {
    maximumFractionDigits: 0,
  })}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export default function CustomerLoyaltyCardPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [loyaltyCard, setLoyaltyCard] =
    useState<CustomerLoyaltyCard | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);

  const loadLoyaltyCard = useCallback(async () => {
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
  }, [router]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
              router.push("/login");
              return;
            }

          loadLoyaltyCard();
      };
        init();
    }, [loadLoyaltyCard, router, supabase]);
    

  if (loading) {
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

  const stars = Math.min(loyaltyCard.stars, 10);

  const isNormalStampFilled = (stampNumber: number) => {
    if (stampNumber <= 4) return stars >= stampNumber;
    return stars >= stampNumber + 1;
  };

  const getNormalStampAppointment = (stampNumber: number) => {
    if (stampNumber <= 4) return appointments[stampNumber - 1];
    return appointments[stampNumber];
  };

  const normalStamps = [1, 2, 3, 4, 5, 6, 7, 8];

  const selectedServices =
    selectedAppointment?.services && selectedAppointment.services.length > 0
      ? selectedAppointment.services
      : selectedAppointment
      ? [
          {
            id: selectedAppointment.id,
            serviceId: selectedAppointment.id,
            name: selectedAppointment.service.name,
            quantity: 1,
            price: Number(selectedAppointment.service.price || 0),
            subtotal: Number(selectedAppointment.service.price || 0),
          },
        ]
      : [];

  return (
    <>
      <Navbar />

      <Box
        sx={{
          minHeight: "auto",
          bgcolor: "#fff",
          display: "flex",
          justifyContent: "center",
          alignItems: { xs: "flex-start", md: "center" },
          px: { xs: 1.5, sm: 2 },
          pt: { xs: 3, sm: 5, md: 7 },
          pb: { xs: 2, sm: 3, md: 4 },
          overflowX: "hidden",
        }}
      >
        <Paper
          elevation={0}
          sx={{
            width: "100%",
            maxWidth: 1050,
            mx: "auto",
            minHeight: { xs: "auto", md: 560 },
            bgcolor: "#ffdc73",
            borderRadius: 1,
            px: { xs: 2, sm: 5, md: 8 },
            py: { xs: 3, sm: 5, md: 7 },
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
              fontSize: { xs: "0.9rem", sm: "1rem", md: "1.3rem" },
              mb: 1,
              color: "#333",
              overflowWrap: "anywhere",
            }}
          >
            {customerInfo.firstName} {customerInfo.lastName}
          </Typography>

          <Typography
            sx={{
              textAlign: "center",
              fontWeight: 900,
              fontSize: { xs: "2rem", sm: "3.5rem", md: "4.5rem" },
              lineHeight: { xs: 1.05, sm: 1 },
              mb: { xs: 1.5, sm: 2 },
            }}
          >
            Loyalty Card
          </Typography>

          <Typography
            sx={{
              textAlign: "center",
              fontSize: { xs: "0.85rem", sm: "0.95rem", md: "1.25rem" },
              lineHeight: 1.35,
              mb: { xs: 3, sm: 4, md: 5 },
              maxWidth: { xs: 290, sm: "none" },
            }}
          >
            Complete the stamps and get 50% and a Free Service
          </Typography>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "repeat(5, minmax(0, 1fr))",
                sm: "repeat(5, 88px)",
                md: "repeat(5, 110px)",
              },
              width: "100%",
              maxWidth: { xs: 330, sm: "none" },
              columnGap: { xs: 1, sm: 2.5, md: 4 },
              rowGap: { xs: 1.25, sm: 3, md: 4 },
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {normalStamps.slice(0, 4).map((stampNumber) => {
              const appointment = getNormalStampAppointment(stampNumber);
              const filled = isNormalStampFilled(stampNumber);

              return (
                <StampBox
                  key={stampNumber}
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
              unlocked={stars >= 5}
              redeemed={loyaltyCard.fiveRewardRedeemed}
              appointment={appointments[4]}
              onClick={() => {
                if (appointments[4]) setSelectedAppointment(appointments[4]);
              }}
            />

            {normalStamps.slice(4, 8).map((stampNumber) => {
              const appointment = getNormalStampAppointment(stampNumber);
              const filled = isNormalStampFilled(stampNumber);

              return (
                <StampBox
                  key={stampNumber}
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
              unlocked={stars >= 10}
              appointment={appointments[9]}
              onClick={() => {
                if (appointments[9]) setSelectedAppointment(appointments[9]);
              }}
            />
          </Box>

          <Typography
            sx={{
              width: "100%",
              textAlign: "right",
              mt: { xs: 3, sm: 5 },
              fontWeight: 800,
              fontSize: { xs: "0.85rem", sm: "1rem" },
              overflowWrap: "anywhere",
            }}
          >
            {customerInfo.customerCode}
          </Typography>
        </Paper>
      </Box>

      <Dialog
        open={!!selectedAppointment}
        onClose={() => setSelectedAppointment(null)}
        maxWidth="lg"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              m: { xs: 1.5, sm: 3 },
              borderRadius: 1,
              p: { xs: 2, sm: 3 },
              width: { xs: "calc(100% - 24px)", sm: "100%" },
              maxWidth: 980,
              maxHeight: { xs: "calc(100% - 24px)", sm: "calc(100% - 64px)" },
              overflow: "hidden",
            },
          },
        }}
      >
        {selectedAppointment && (
          <Box>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: { xs: "flex-start", sm: "center" },
                gap: 2,
                flexDirection: { xs: "column", sm: "row" },
                mb: 2.5,
              }}
            >
              <Typography
                sx={{
                  fontWeight: 900,
                  fontSize: { xs: 17, sm: 18 },
                  overflowWrap: "anywhere",
                }}
              >
                {customerInfo.firstName} {customerInfo.lastName}
              </Typography>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1,
                  width: { xs: "100%", sm: "auto" },
                }}
              >
                <Typography
                  sx={{
                    fontWeight: 800,
                    color: "#777",
                    fontSize: { xs: 14, sm: 18 },
                    minWidth: 0,
                    overflowWrap: "anywhere",
                  }}
                >
                  {selectedAppointment.appointmentCode}
                </Typography>

                <IconButton
                  onClick={() => setSelectedAppointment(null)}
                  sx={{
                    width: 38,
                    height: 38,
                    color: "#666",
                    flexShrink: 0,
                    "&:hover": {
                      bgcolor: "#ececec",
                      color: "#000",
                    },
                  }}
                >
                  <CloseIcon />
                </IconButton>
              </Box>
            </Box>

            <Box
              sx={{
                bgcolor: "#fff",
                border: "1px solid #eee",
                borderRadius: 1,
                overflowX: "auto",
                display: { xs: "none", sm: "block" },
              }}
            >
              <Box sx={{ minWidth: 700 }}>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns:
                      "90px minmax(220px, 1fr) 60px 150px 130px",
                    bgcolor: "#f5f5f5",
                    py: 1.2,
                    px: 1.5,
                    columnGap: 1.5,
                    color: "#777",
                    fontWeight: 900,
                    alignItems: "center",
                  }}
                >
                  <Typography>Type</Typography>
                  <Typography>Service</Typography>
                  <Typography sx={{ textAlign: "center" }}>Qty</Typography>
                  <Typography sx={{ textAlign: "center" }}>Date</Typography>
                  <Typography sx={{ textAlign: "right" }}>Price</Typography>
                </Box>

                {selectedServices.map((service) => (
                  <Box
                    key={service.id}
                    sx={{
                      display: "grid",
                      gridTemplateColumns:
                        "90px minmax(220px, 1fr) 60px 150px 130px",
                      py: 1.3,
                      px: 1.5,
                      columnGap: 1.5,
                      alignItems: "center",
                      borderTop: "1px solid #eee",
                    }}
                  >
                    <Typography
                      sx={{
                        whiteSpace: "normal",
                        lineHeight: 1.3,
                      }}
                    >
                      {selectedAppointment.type}
                    </Typography>

                    <Typography
                      sx={{
                        fontWeight: 800,
                        whiteSpace: "normal",
                        wordBreak: "break-word",
                        lineHeight: 1.3,
                      }}
                    >
                      {service.name}
                    </Typography>

                    <Typography sx={{ textAlign: "center" }}>
                      {service.quantity}
                    </Typography>

                    <Typography sx={{ textAlign: "center", whiteSpace: "nowrap" }}>
                      {formatDate(selectedAppointment.appointmentDate)}
                    </Typography>

                    <Typography
                      sx={{ textAlign: "right", fontWeight: 800, whiteSpace: "nowrap" }}
                    >
                      {formatPeso(service.subtotal)}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>

            <Box
              sx={{
                display: { xs: "flex", sm: "none" },
                flexDirection: "column",
                gap: 1.25,
              }}
            >
              {selectedServices.map((service) => (
                <Box
                  key={service.id}
                  sx={{
                    border: "1px solid #eee",
                    borderRadius: 1,
                    p: 1.5,
                    bgcolor: "#fff",
                  }}
                >
                  <Typography
                    sx={{
                      fontWeight: 900,
                      lineHeight: 1.25,
                      mb: 1.25,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {service.name}
                  </Typography>

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 1,
                    }}
                  >
                    <DetailItem label="Type" value={selectedAppointment.type} />
                    <DetailItem label="Qty" value={String(service.quantity)} />
                    <DetailItem
                      label="Date"
                      value={formatDate(selectedAppointment.appointmentDate)}
                    />
                    <DetailItem
                      align="right"
                      label="Price"
                      value={formatPeso(service.subtotal)}
                    />
                  </Box>
                </Box>
              ))}
            </Box>

            <Box
              sx={{
                mt: { xs: 2, sm: 3 },
                mx: "auto",
                width: { xs: "100%", sm: 360 },
                bgcolor: "#f7f7f7",
                borderRadius: 1,
                p: { xs: 1.5, sm: 2 },
              }}
            >
              <ReceiptRow
                label="Subtotal"
                value={formatPeso(selectedAppointment.subtotal)}
              />

              <ReceiptRow
                label="Discount"
                value={formatPeso(selectedAppointment.discount)}
              />

              <ReceiptRow
                label="Total Payment"
                value={formatPeso(selectedAppointment.totalAmount)}
              />

              <ReceiptRow
                label="Mode of Payment"
                value={selectedAppointment.payment?.method || "Cash"}
              />

              <ReceiptRow
                label="Discount %"
                value={`${selectedAppointment.discountPercent}%`}
              />
            </Box>
          </Box>
        )}
      </Dialog>

      <Box sx={{ "& footer": { mt: { xs: 3, md: 4 } } }}>
        <Footer />
      </Box>
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
        width: "100%",
        height: { xs: "auto", sm: 88, md: 110 },
        aspectRatio: "1 / 1",
        borderRadius: { xs: 1.5, sm: 2.5, md: 4 },
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
            width: { xs: "58%", sm: 48, md: 58 },
            height: { xs: "58%", sm: 48, md: 58 },
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
  unlocked,
  redeemed = false,
  appointment,
  onClick,
}: {
  label: "50%" | "FREE";
  unlocked: boolean;
  redeemed?: boolean;
  appointment?: Appointment;
  onClick: () => void;
}) {
  return (
    <Box
      onClick={() => unlocked && appointment && onClick()}
      sx={{
        width: "100%",
        height: { xs: "auto", sm: 88, md: 110 },
        aspectRatio: "1 / 1",
        borderRadius: { xs: 1.5, sm: 2.5, md: 4 },
        bgcolor: unlocked ? "#e8e8e8" : "#fff",
        border: { xs: "1.5px solid #111", sm: "2px solid #111", md: "3px solid #111" },
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        cursor: unlocked && appointment ? "pointer" : "default",
        transition: "0.2s ease",
        boxShadow: unlocked ? "0 4px 10px rgba(0,0,0,0.15)" : "none",
        "&:hover": {
          transform: unlocked && appointment ? "scale(1.05)" : "none",
        },
      }}
    >
      {redeemed ? (
        <Typography
          sx={{
            fontWeight: 900,
            fontSize: {
              xs: "0.58rem",
              sm: "0.85rem",
              md: "1rem",
            },
            textTransform: "uppercase",
            lineHeight: 1,
          }}
        >
          Redeemed
        </Typography>
      ) : unlocked ? (
        <Box
          sx={{
            width: { xs: "58%", sm: 48, md: 58 },
            height: { xs: "58%", sm: 48, md: 58 },
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
      ) : (
        <Typography
          sx={{
            fontWeight: 900,
            lineHeight: 1,
            fontSize:
              label === "FREE"
                ? { xs: "0.72rem", sm: "1.25rem", md: "1.8rem" }
                : { xs: "0.85rem", sm: "1.5rem", md: "2rem" },
          }}
        >
          {label}
        </Typography>
      )}
    </Box>
  );
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, mb: 1 }}>
      <Typography sx={{ fontWeight: 800, fontSize: 13 }}>{label}</Typography>
      <Typography sx={{ fontWeight: 800, fontSize: 13, textAlign: "right" }}>
        {value}
      </Typography>
    </Box>
  );
}

function DetailItem({
  label,
  value,
  align = "left",
}: {
  label: string;
  value: string;
  align?: "left" | "right";
}) {
  return (
    <Box sx={{ minWidth: 0, textAlign: align }}>
      <Typography sx={{ color: "#777", fontSize: 12, fontWeight: 800 }}>
        {label}
      </Typography>
      <Typography
        sx={{
          fontWeight: 900,
          fontSize: 13,
          lineHeight: 1.25,
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}
