"use client";

import { useEffect, useMemo, useState } from "react";

import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import MenuItem from "@mui/material/MenuItem";
import IconButton from "@mui/material/IconButton";
import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import CircularProgress from "@mui/material/CircularProgress";

import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";

import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import PaymentIcon from "@mui/icons-material/Payment";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import CloseIcon from "@mui/icons-material/Close";

type Customer = {
  id: string;
  customerCode: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  mobileNumber: string;
};

type Service = {
  id: string;
  serviceCode: string;
  name: string;
  durationMinutes: number;
  price: number;
  isAvailable: boolean;
};

type Sale = {
  id: string;
  saleCode: string;
  source: "WALKIN" | "BOOKING";
  status: "PENDING" | "PAID" | "CANCELLED" | "REFUNDED";
  subtotal: number;
  discount: number;
  totalAmount: number;
  createdAt: string;
  customer: {
    id: string;
    customerCode: string;
    name: string;
    mobileNumber: string;
  };
  barber: {
    id: string;
    name: string;
  } | null;
  items: {
    id: string;
    serviceId: string;
    serviceName: string;
    quantity: number;
    price: number;
    subtotal: number;
  }[];
  payment: {
    id: string;
    paymentCode: string | null;
    amount: number;
    downPayment: number;
    method: "CASH" | "GCASH";
    status: "PENDING" | "PAID" | "REJECTED";
    screenshotUrl: string | null;
  } | null;
};

type CartItem = {
  serviceId: string;
  serviceName: string;
  quantity: number;
  price: number;
  durationMinutes: number;
};

type LoyaltyCard = {
  id: string;
  cardNumber: string;
  customerId: string;
  name: string;
  stickers: number;
  maxStickers: number;
  status: "ACTIVE" | "COMPLETED";
};

const headCell = {
  fontWeight: 800,
  color: "#9a9a9a",
  fontSize: 15,
  borderBottom: "1px solid #e5e5e5",
};

const bodyCell = {
  fontWeight: 800,
  color: "#222",
  fontSize: 14,
};

const actionIcon = {
  width: 26,
  height: 26,
  bgcolor: "#d9d9d9",
  color: "#333",
  "&:hover": {
    bgcolor: "#c9c9c9",
  },
};

const pageArrow = {
  width: 24,
  height: 24,
  borderRadius: "50%",
  bgcolor: "#d9d9d9",
  color: "#777",
  display: "grid",
  placeItems: "center",
  fontWeight: 900,
};

const pageNumber = {
  width: 24,
  height: 24,
  borderRadius: "7px",
  bgcolor: "#ffc107",
  color: "#000",
  display: "grid",
  placeItems: "center",
  fontWeight: 900,
};

const summaryRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  mb: 1.3,
  "& .MuiTypography-root": {
    fontWeight: 900,
  },
};

function formatPeso(value: number) {
  return `₱ ${Number(value || 0).toLocaleString("en-PH", {
    maximumFractionDigits: 0,
  })}`;
}

function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatToday() {
  return formatDate(new Date());
}

function fullName(person: any) {
  return (
    [person?.firstName, person?.lastName].filter(Boolean).join(" ") ||
    person?.name ||
    "Unknown"
  );
}

async function fetchJson(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  const text = await res.text();

  if (!res.ok) {
    console.error(`${url} ERROR RESPONSE:`, text);
    throw new Error(`${url} failed with status ${res.status}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    console.error(`${url} returned non-JSON:`, text);
    throw new Error(`${url} did not return JSON`);
  }
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loyaltyCards, setLoyaltyCards] = useState<LoyaltyCard[]>([]);

  const rowsPerPage = 8;
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [openAdd, setOpenAdd] = useState(false);
  const [openPayment, setOpenPayment] = useState(false);
  const [openCancelConfirm, setOpenCancelConfirm] = useState(false);
  const [openViewTransaction, setOpenViewTransaction] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [imageViewerUrl, setImageViewerUrl] = useState("");
  const [imageViewerTitle, setImageViewerTitle] = useState("");

  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [method, setMethod] = useState<"CASH" | "GCASH">("CASH");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [cart, setCart] = useState<CartItem[]>([]);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );

  const discountAmount = Math.round(subtotal * (discountPercent / 100));
  const total = Math.max(subtotal - discountAmount, 0);

  const selectedCustomer = customers.find(
    (customer) => customer.id === selectedCustomerId
  );

  const selectedLoyaltyCard = loyaltyCards.find(
    (card) => card.customerId === selectedCustomer?.id
  );

  const stickerCount = selectedLoyaltyCard?.stickers || 0;
  const canUse50Discount = stickerCount >= 5;
  const canUse100Discount = stickerCount >= 10;

  const filteredCustomers = customers.filter((customer) => {
    const keyword = customerSearch.trim().toLowerCase();

    if (!keyword || selectedCustomerId) return false;

    const name = fullName(customer).toLowerCase();

    return (
      name.includes(keyword) ||
      customer.customerCode?.toLowerCase().includes(keyword) ||
      customer.mobileNumber?.includes(keyword)
    );
  });

  const openImageViewer = (title: string, imageUrl?: string | null) => {
    setImageViewerTitle(title);
    setImageViewerUrl(imageUrl || "");
    setImageViewerOpen(true);
  };

  useEffect(() => {
    if (!selectedSale) return;

    setCustomerSearch(selectedSale.customer.name);
    setSelectedCustomerId(selectedSale.customer.id);
    setMethod((selectedSale.payment?.method as "CASH" | "GCASH") || "CASH");

    setDiscountPercent(
      selectedSale.subtotal > 0
        ? Math.round((selectedSale.discount / selectedSale.subtotal) * 100)
        : 0
    );

    setCart(
      selectedSale.items.map((item) => ({
        serviceId: item.serviceId,
        serviceName: item.serviceName,
        quantity: item.quantity,
        price: Number(item.price),
        durationMinutes: 0,
      }))
    );
  }, [selectedSale]);

  async function loadData() {
    try {
      setLoading(true);

      const [salesData, servicesData, customersData, loyaltyData] =
        await Promise.all([
          fetchJson("/api/admin/sales"),
          fetchJson("/api/admin/services"),
          fetchJson("/api/customers"),
          fetchJson("/api/admin/loyaltyCard"),
        ]);

      setSales(salesData.sales || []);
      setPage(1);
      setServices(servicesData.services || []);
      setLoyaltyCards(loyaltyData.cards || []);

      const customerList =
        customersData.customers || customersData.data || customersData || [];

      setCustomers(Array.isArray(customerList) ? customerList : []);
    } catch (error) {
      console.error("LOAD SALES DATA ERROR:", error);
      setSnackbar({
        open: true,
        message:
          error instanceof Error ? error.message : "Failed to load sales data",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function resetForm() {
    setCustomerSearch("");
    setSelectedCustomerId("");
    setMethod("CASH");
    setDiscountPercent(0);
    setCart([]);
  }

  function closePosAndReset() {
    setOpenAdd(false);
    setOpenCancelConfirm(false);
    setOpenPayment(false);
    setOpenViewTransaction(false);
    setSelectedSale(null);
    resetForm();
  }

  function addServiceToCart(service: Service) {
    if (selectedSale) return;

    setCart((prev) => {
      const existing = prev.find((item) => item.serviceId === service.id);

      if (existing) {
        return prev.map((item) =>
          item.serviceId === service.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [
        ...prev,
        {
          serviceId: service.id,
          serviceName: service.name,
          quantity: 1,
          price: Number(service.price),
          durationMinutes: service.durationMinutes,
        },
      ];
    });
  }

  function increaseQty(serviceId: string) {
    if (selectedSale) return;

    setCart((prev) =>
      prev.map((item) =>
        item.serviceId === serviceId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    );
  }

  function decreaseQty(serviceId: string) {
    if (selectedSale) return;

    setCart((prev) =>
      prev
        .map((item) =>
          item.serviceId === serviceId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function removeFromCart(serviceId: string) {
    if (selectedSale) return;
    setCart((prev) => prev.filter((item) => item.serviceId !== serviceId));
  }

  function handleCustomerSearch(value: string) {
    if (selectedSale) return;

    setCustomerSearch(value);
    setSelectedCustomerId("");

    if (value.trim().length < 1) return;

    const keyword = value.toLowerCase();

    const exactMatch = customers.find((customer) => {
      const name = fullName(customer).toLowerCase();

      return (
        name === keyword ||
        customer.customerCode?.toLowerCase() === keyword ||
        customer.mobileNumber === value
      );
    });

    if (exactMatch) {
      setSelectedCustomerId(exactMatch.id);
      setCustomerSearch(fullName(exactMatch));
    }
  }

  function selectCustomer(customer: Customer) {
    setSelectedCustomerId(customer.id);
    setCustomerSearch(fullName(customer));
  }

  function handleDiscountInput(value: string) {
    if (value === "") {
      setDiscountPercent(0);
      return;
    }

    const parsedValue = Number(value);

    if (Number.isNaN(parsedValue)) return;

    const safeValue = Math.min(Math.max(parsedValue, 0), 100);
    setDiscountPercent(safeValue);
  }

  async function createSale() {
    try {
      if (!selectedCustomerId) {
        setSnackbar({
          open: true,
          message: "Please search and select an existing customer",
          severity: "error",
        });
        return;
      }

      if (cart.length < 1) {
        setSnackbar({
          open: true,
          message: "Please add at least one service",
          severity: "error",
        });
        return;
      }

      setSaving(true);

      const res = await fetch("/api/admin/sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          method,
          discount: discountAmount,
          items: cart.map((item) => ({
            serviceId: item.serviceId,
            quantity: item.quantity,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create sale");
      }

      closePosAndReset();
      await loadData();

      setSnackbar({
        open: true,
        message: "Walk-in sale created successfully.",
        severity: "success",
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message:
          error instanceof Error ? error.message : "Failed to create sale",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  async function confirmPayment() {
    try {
      if (!selectedSale) return;

      setSaving(true);

      const res = await fetch(
        `/api/admin/sales/${selectedSale.id}/confirm-payment`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            method,
            discount: discountAmount,
            totalAmount: total,
            loyaltyRewardType:
              discountPercent === 100
                ? "FREE"
                : discountPercent === 50
                ? "FIFTY_PERCENT"
                : "NONE",
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to confirm payment");
      }

      closePosAndReset();
      await loadData();

      setSnackbar({
        open: true,
        message: "Payment confirmed successfully.",
        severity: "success",
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message:
          error instanceof Error ? error.message : "Failed to confirm payment",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(sales.length / rowsPerPage));

  const paginatedSales = sales.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  const showingFrom = sales.length === 0 ? 0 : (page - 1) * rowsPerPage + 1;
  const showingTo = Math.min(page * rowsPerPage, sales.length);

  return (
    <Box sx={{ bgcolor: "#fff", minHeight: "100vh", px: 6, py: 5 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 5,
        }}
      >
        <Typography sx={{ fontSize: 34, fontWeight: 900, color: "#111" }}>
          Sales
        </Typography>

        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => {
            setSelectedSale(null);
            resetForm();
            setOpenAdd(true);
          }}
          sx={{
            borderColor: "#e0e0e0",
            color: "#8a8a8a",
            bgcolor: "#fff",
            borderRadius: 1.5,
            textTransform: "none",
            px: 2.5,
            height: 36,
            fontWeight: 600,
            "&:hover": {
              borderColor: "#cfcfcf",
              bgcolor: "#fafafa",
            },
          }}
        >
          Add New Transaction
        </Button>
      </Box>

      <Paper elevation={0} sx={{ bgcolor: "transparent" }}>
        {loading ? (
          <Box sx={{ py: 8, textAlign: "center" }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={headCell}>Transaction #</TableCell>
                  <TableCell sx={headCell}>ID</TableCell>
                  <TableCell sx={headCell}>Name</TableCell>
                  <TableCell sx={headCell}>Date</TableCell>
                  <TableCell sx={headCell}>Total Amount</TableCell>
                  <TableCell sx={headCell}>Type</TableCell>
                  <TableCell sx={headCell}>Status</TableCell>
                  <TableCell sx={headCell} align="center">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {paginatedSales.map((sale, index) => (
                  <TableRow
                    key={`${sale.id}-${index}`}
                    sx={{
                      "& td": {
                        borderBottom: "1px solid #e8e8e8",
                        py: 1.5,
                      },
                    }}
                  >
                    <TableCell sx={bodyCell}>{sale.saleCode}</TableCell>
                    <TableCell sx={bodyCell}>
                      {sale.customer.customerCode}
                    </TableCell>
                    <TableCell sx={bodyCell}>{sale.customer.name}</TableCell>
                    <TableCell sx={bodyCell}>{formatDate(sale.createdAt)}</TableCell>
                    <TableCell sx={bodyCell}>
                      {formatPeso(sale.totalAmount)}
                    </TableCell>
                    <TableCell sx={bodyCell}>
                      {sale.source === "WALKIN" ? "Walk-In" : "Appointment"}
                    </TableCell>
                    <TableCell sx={bodyCell}>
                      {sale.payment?.status === "PAID" ? "Paid" : "Unpaid"}
                    </TableCell>

                    <TableCell align="center">
                      <Box
                        sx={{
                          display: "flex",
                          gap: 1,
                          justifyContent: "center",
                        }}
                      >
                        <IconButton
                          size="small"
                          disabled={sale.payment?.status === "PAID"}
                          onClick={() => {
                            setSelectedSale(sale);
                            setOpenAdd(true);
                          }}
                          sx={{
                            ...actionIcon,
                            opacity: sale.payment?.status === "PAID" ? 0.5 : 1,
                          }}
                        >
                          <PaymentIcon sx={{ fontSize: 16 }} />
                        </IconButton>

                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedSale(sale);
                            setOpenViewTransaction(true);
                          }}
                          sx={actionIcon}
                        >
                          <ReceiptLongIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}

                {sales.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                      No sales found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Box
        sx={{
          position: "fixed",
          bottom: 70,
          left: 280,
          fontSize: 14,
          fontWeight: 600,
          color: "#333",
        }}
      >
        Showing {showingFrom} to {showingTo} of {sales.length} Entries
      </Box>

      <Box
        sx={{
          position: "fixed",
          bottom: 65,
          right: 90,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <Box
          onClick={() => {
            if (page > 1) setPage(page - 1);
          }}
          sx={{
            ...pageArrow,
            opacity: page === 1 ? 0.4 : 1,
            cursor: page === 1 ? "default" : "pointer",
          }}
        >
          ‹
        </Box>

        {Array.from({ length: totalPages }).map((_, index) => {
          const pageNumberValue = index + 1;

          return (
            <Box
              key={pageNumberValue}
              onClick={() => setPage(pageNumberValue)}
              sx={{
                ...pageNumber,
                bgcolor: page === pageNumberValue ? "#ffc107" : "#d9d9d9",
                color: page === pageNumberValue ? "#000" : "#666",
                cursor: "pointer",
              }}
            >
              {pageNumberValue}
            </Box>
          );
        })}

        <Box
          onClick={() => {
            if (page < totalPages) setPage(page + 1);
          }}
          sx={{
            ...pageArrow,
            opacity: page === totalPages ? 0.4 : 1,
            cursor: page === totalPages ? "default" : "pointer",
          }}
        >
          ›
        </Box>
      </Box>

      <Dialog open={openAdd} onClose={closePosAndReset} fullScreen>
        <DialogContent sx={{ p: 0, overflow: "hidden" }}>
          <Box sx={{ display: "flex", height: "100vh", bgcolor: "#fff" }}>
            <Box sx={{ flex: 1.35, px: 7, py: 5 }}>
              <Typography sx={{ fontSize: 34, fontWeight: 900, mb: 5 }}>
                Sales
              </Typography>

              <Typography sx={{ fontSize: 24, mb: 3 }}>Services</Typography>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 2,
                  maxWidth: 620,
                }}
              >
                {services
                  .filter((service) => service.isAvailable)
                  .map((service, index) => (
                    <Button
                      key={`${service.id}-${index}`}
                      disabled={Boolean(selectedSale)}
                      onClick={() => addServiceToCart(service)}
                      sx={{
                        height: 72,
                        bgcolor: "#e9e9e9",
                        color: "#111",
                        borderRadius: 1,
                        textTransform: "none",
                        display: "flex",
                        flexDirection: "column",
                        fontWeight: 900,
                        opacity: selectedSale ? 0.55 : 1,
                        "&:hover": { bgcolor: "#dedede" },
                      }}
                    >
                      <Typography
                        sx={{ fontWeight: 900, fontSize: 15, lineHeight: 1.1 }}
                      >
                        {service.name}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: "#777", mt: 0.5 }}>
                        {formatPeso(service.price)}
                      </Typography>
                    </Button>
                  ))}
              </Box>
            </Box>

            <Box
              sx={{
                width: 450,
                bgcolor: "#f5f5f5",
                borderLeft: "1px solid #cfcfcf",
                px: 4,
                py: 4,
                position: "relative",
                height: "100vh",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              <Typography
                sx={{
                  fontSize: 24,
                  fontWeight: 900,
                  mb: 3,
                  pr: 5,
                }}
              >
                {selectedSale ? "Payment Confirmation" : "Add New Transaction"}
              </Typography>

              <IconButton
                onClick={closePosAndReset}
                sx={{
                  position: "absolute",
                  top: 18,
                  right: 18,
                  zIndex: 20,
                  bgcolor: "#f5f5f5",
                  "&:hover": { bgcolor: "#e0e0e0" },
                }}
              >
                <CloseIcon />
              </IconButton>

              <Box
                sx={{
                  flex: 1,
                  overflowY: "auto",
                  pr: 4,
                  mr: -2,
                  scrollbarGutter: "stable",
                }}
              >
                <Typography sx={{ fontWeight: 900, color: "#aaa", mb: 0.5 }}>
                  {selectedSale?.customer.customerCode ||
                    selectedCustomer?.customerCode ||
                    "000"}
                </Typography>

                <TextField
                  fullWidth
                  variant="standard"
                  placeholder="Enter Name"
                  value={selectedSale?.customer.name || customerSearch}
                  disabled={Boolean(selectedSale)}
                  onChange={(e) => handleCustomerSearch(e.target.value)}
                  sx={{
                    bgcolor: "#fff",
                    px: 1.5,
                    mb: 0.5,
                    width: 180,
                    "& .MuiInputBase-input": {
                      fontSize: 22,
                      fontWeight: 500,
                    },
                  }}
                />

                {customerSearch &&
                  filteredCustomers.length > 0 &&
                  !selectedCustomerId &&
                  !selectedSale && (
                    <Paper
                      sx={{
                        position: "absolute",
                        top: 105,
                        left: 32,
                        width: 280,
                        zIndex: 10,
                        maxHeight: 180,
                        overflowY: "auto",
                      }}
                    >
                      {filteredCustomers.slice(0, 5).map((customer, index) => (
                        <Box
                          key={`${customer.id}-${index}`}
                          onClick={() => selectCustomer(customer)}
                          sx={{
                            px: 2,
                            py: 1,
                            cursor: "pointer",
                            "&:hover": { bgcolor: "#eee" },
                          }}
                        >
                          <Typography sx={{ fontWeight: 800 }}>
                            {fullName(customer)}
                          </Typography>
                          <Typography sx={{ fontSize: 12, color: "#777" }}>
                            {customer.customerCode} · {customer.mobileNumber}
                          </Typography>
                        </Box>
                      ))}
                    </Paper>
                  )}

                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    mb: 2,
                  }}
                >
                  <Box>
                    <Typography sx={{ fontWeight: 800, color: "#777" }}>
                      {selectedSale?.saleCode || "TRX-New"}
                    </Typography>

                    <Typography
                      sx={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: "#999",
                      }}
                    >
                      {selectedSale
                        ? formatDate(selectedSale.createdAt)
                        : formatToday()}
                    </Typography>
                  </Box>

                  <Box sx={{ textAlign: "right" }}>
                    <Typography sx={{ fontWeight: 900, color: "#777" }}>
                      {selectedSale?.source === "BOOKING"
                        ? "Appointment"
                        : "Walk-in"}
                    </Typography>
                    <Typography sx={{ fontWeight: 900, color: "#777" }}>
                      {selectedSale?.payment?.status === "PAID"
                        ? "Paid"
                        : "Unpaid"}
                    </Typography>
                  </Box>
                </Box>

                {selectedCustomerId && (
                  <Box
                    sx={{
                      bgcolor: "#fff8df",
                      border: "1px solid #ffe08a",
                      p: 1.5,
                      mb: 2,
                    }}
                  >
                    <Typography sx={{ fontWeight: 900, fontSize: 13 }}>
                      Loyalty Stickers: {stickerCount}/10
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: "#777", fontWeight: 700 }}>
                      50% off requires 5 stickers. 100% off requires 10 stickers.
                    </Typography>
                  </Box>
                )}

                <Box sx={{ bgcolor: "#fff", mb: 3 }}>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      borderBottom: "1px solid #eee",
                      py: 1,
                      px: 2,
                      columnGap: 1,
                    }}
                  >
                    <Typography
                      sx={{ fontSize: 20, color: "#999", fontWeight: 800 }}
                    >
                      Service Summary
                    </Typography>
                    <Typography
                      sx={{ fontSize: 20, color: "#999", fontWeight: 800 }}
                    >
                      Price
                    </Typography>
                  </Box>

                  <Box sx={{ minHeight: 150, maxHeight: 190, overflowY: "auto" }}>
                    {cart.map((item, index) => (
                      <Box
                        key={`${item.serviceId}-${index}`}
                        sx={{
                          display: "grid",
                          gridTemplateColumns: "1fr auto",
                          alignItems: "center",
                          py: 1.5,
                          px: 2,
                          borderBottom: "1px solid #eee",
                          columnGap: 1,
                        }}
                      >
                        <Typography
                          sx={{
                            fontWeight: 900,
                            color: "#777",
                            whiteSpace: "normal",
                            wordBreak: "break-word",
                          }}
                        >
                          {item.serviceName}
                        </Typography>

                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                          <Button
                            size="small"
                            disabled={Boolean(selectedSale)}
                            onClick={() => decreaseQty(item.serviceId)}
                            sx={{ minWidth: 18, p: 0 }}
                          >
                            −
                          </Button>

                          <Typography sx={{ fontSize: 12, fontWeight: 900 }}>
                            Qty {item.quantity}
                          </Typography>

                          <Button
                            size="small"
                            disabled={Boolean(selectedSale)}
                            onClick={() => increaseQty(item.serviceId)}
                            sx={{ minWidth: 18, p: 0 }}
                          >
                            +
                          </Button>

                          <Typography
                            sx={{
                              fontWeight: 900,
                              color: "#777",
                              minWidth: 55,
                              textAlign: "right",
                            }}
                          >
                            {formatPeso(item.price * item.quantity)}
                          </Typography>

                          <IconButton
                            size="small"
                            disabled={Boolean(selectedSale)}
                            onClick={() => removeFromCart(item.serviceId)}
                            sx={{ bgcolor: "#ddd", width: 30, height: 30 }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Box>

                <Box sx={{ bgcolor: "#fff", p: 2 }}>
                  <Box sx={summaryRow}>
                    <Typography>Subtotal</Typography>
                    <Typography>{formatPeso(subtotal)}</Typography>
                  </Box>

                  <Box sx={summaryRow}>
                    <Typography sx={{ textDecoration: "line-through", color: "#888" }}>
                      Downpayment
                    </Typography>
                    <Typography sx={{ textDecoration: "line-through", color: "#888" }}>
                      {formatPeso(selectedSale?.payment?.downPayment || 0)}
                    </Typography>
                  </Box>

                  <Box sx={summaryRow}>
                    <Typography>Discount</Typography>
                    <Typography>-{formatPeso(discountAmount)}</Typography>
                  </Box>

                  <Box sx={summaryRow}>
                    <Typography>Total Payment</Typography>
                    <Typography>{formatPeso(total)}</Typography>
                  </Box>

                  <Box sx={summaryRow}>
                    <Typography>Mode of Payment</Typography>
                    <TextField
                      select
                      variant="standard"
                      value={method}
                      disabled={false}
                      onChange={(e) =>
                        setMethod(e.target.value as "CASH" | "GCASH")
                      }
                      sx={{ width: 90 }}
                    >
                      <MenuItem value="CASH">Cash</MenuItem>
                      <MenuItem value="GCASH">GCash</MenuItem>
                    </TextField>
                  </Box>

                  <Box sx={summaryRow}>
                    <Typography>Discount %</Typography>

                    <TextField
                      variant="standard"
                      type="number"
                      value={discountPercent}
                      disabled={false}
                      onChange={(e) => handleDiscountInput(e.target.value)}
                      slotProps={{
                        htmlInput: {
                          min: 0,
                          max: 100,
                          step: 1,
                        },
                      }}
                      sx={{ width: 90 }}
                    />
                  </Box>

                  {selectedCustomerId && (
                    <Box sx={{ mt: 1 }}>
                      <Typography
                        sx={{
                          fontSize: 12,
                          color: "#777",
                          fontWeight: 800,
                          mb: 1,
                        }}
                      >
                        Manual promo discount is allowed. Loyalty shortcuts are
                        disabled if the customer is not eligible.
                      </Typography>

                      <Box sx={{ display: "flex", gap: 1 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => setDiscountPercent(0)}
                          sx={{
                            minWidth: 52,
                            color: "#111",
                            borderColor: "#ccc",
                            textTransform: "none",
                            fontWeight: 800,
                          }}
                        >
                          0%
                        </Button>

                        <Button
                          size="small"
                          variant="outlined"
                          disabled={!canUse50Discount}
                          onClick={() => setDiscountPercent(50)}
                          sx={{
                            minWidth: 72,
                            color: "#111",
                            borderColor: "#ccc",
                            textTransform: "none",
                            fontWeight: 800,
                          }}
                        >
                          50%
                        </Button>

                        <Button
                          size="small"
                          variant="outlined"
                          disabled={!canUse100Discount}
                          onClick={() => setDiscountPercent(100)}
                          sx={{
                            minWidth: 78,
                            color: "#111",
                            borderColor: "#ccc",
                            textTransform: "none",
                            fontWeight: 800,
                          }}
                        >
                          100%
                        </Button>
                      </Box>
                    </Box>
                  )}
                </Box>
              </Box>

              <Box
                sx={{
                  flexShrink: 0,
                  bgcolor: "#f5f5f5",
                  display: "flex",
                  gap: 5,
                  pt: 2,
                }}
              >
                <Button
                  variant="contained"
                  onClick={() => setOpenCancelConfirm(true)}
                  sx={{
                    bgcolor: "#d71920",
                    color: "#fff",
                    width: 100,
                    height: 48,
                    textTransform: "none",
                    lineHeight: 1,
                    "&:hover": { bgcolor: "#b9151b" },
                  }}
                >
                  Cancel Transaction
                </Button>

                <Button
                  variant="contained"
                  onClick={() => {
                    if (selectedSale) {
                      setOpenPayment(true);
                      return;
                    }

                    createSale();
                  }}
                  disabled={saving}
                  sx={{
                    bgcolor: "#000",
                    color: "#ffc107",
                    flex: 1,
                    height: 48,
                    textTransform: "none",
                    fontWeight: 900,
                    "&:hover": { bgcolor: "#111" },
                  }}
                >
                  {saving
                    ? "Saving..."
                    : selectedSale
                    ? "Confirm Payment"
                    : "Add Transaction"}
                </Button>
              </Box>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      <Dialog
        open={openViewTransaction}
        onClose={() => {
          setOpenViewTransaction(false);
          setSelectedSale(null);
        }}
        maxWidth={false}
        slotProps={{
          paper: {
            sx: {
              width: 420,
              borderRadius: 0,
              p: 3,
              boxShadow: "none",
              border: "1px solid #999",
            },
          },
          backdrop: {
            sx: {
              bgcolor: "rgba(255,255,255,0.65)",
              backdropFilter: "grayscale(1)",
            },
          },
        }}
      >
        <Box sx={{ position: "relative" }}>
          <IconButton
            onClick={() => {
              setOpenViewTransaction(false);
              setSelectedSale(null);
            }}
            sx={{ position: "absolute", top: -12, right: -12 }}
          >
            <CloseIcon />
          </IconButton>

          <Typography sx={{ fontWeight: 900, fontSize: 22, mb: 2 }}>
            View Transaction
          </Typography>

          <Typography sx={{ fontWeight: 900 }}>
            Transaction #: {selectedSale?.saleCode}
          </Typography>
          <Typography sx={{ fontWeight: 900 }}>
            ID: {selectedSale?.customer.customerCode}
          </Typography>
          <Typography sx={{ fontWeight: 900, mb: 2 }}>
            Name: {selectedSale?.customer.name}
          </Typography>

          <Box sx={{ bgcolor: "#fff", border: "1px solid #eee", mb: 2 }}>
            {selectedSale?.items.map((item, index) => (
              <Box
                key={`${item.id}-${item.serviceId}-${index}`}
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  px: 2,
                  py: 1.5,
                  borderBottom: "1px solid #eee",
                }}
              >
                <Typography sx={{ fontWeight: 800 }}>
                  {item.serviceName} x{item.quantity}
                </Typography>
                <Typography sx={{ fontWeight: 800 }}>
                  {formatPeso(item.subtotal)}
                </Typography>
              </Box>
            ))}
          </Box>

          <Box sx={{ bgcolor: "#fff", p: 2 }}>
            <Box sx={summaryRow}>
              <Typography>Subtotal</Typography>
              <Typography>{formatPeso(selectedSale?.subtotal || 0)}</Typography>
            </Box>

            <Box sx={summaryRow}>
              <Typography>Downpayment</Typography>

              {selectedSale?.payment?.screenshotUrl ? (
                <Button
                  onClick={() =>
                    openImageViewer(
                      "Proof of Downpayment",
                      selectedSale.payment?.screenshotUrl
                    )
                  }
                  sx={{
                    p: 0,
                    minWidth: 0,
                    color: "#1976d2",
                    fontWeight: 900,
                    textTransform: "none",
                    textDecoration: "underline",
                  }}
                >
                  {formatPeso(selectedSale.payment?.downPayment || 0)}
                </Button>
              ) : (
                <Typography>
                  {formatPeso(selectedSale?.payment?.downPayment || 0)}
                </Typography>
              )}
            </Box>

            <Box sx={summaryRow}>
              <Typography>Discount</Typography>
              <Typography>{formatPeso(selectedSale?.discount || 0)}</Typography>
            </Box>

            <Box sx={summaryRow}>
              <Typography>Total Payment</Typography>
              <Typography>{formatPeso(selectedSale?.totalAmount || 0)}</Typography>
            </Box>

            <Box sx={summaryRow}>
              <Typography>Mode of Payment</Typography>
              <Typography>{selectedSale?.payment?.method || "-"}</Typography>
            </Box>

            <Box sx={summaryRow}>
              <Typography>Status</Typography>
              <Typography>
                {selectedSale?.payment?.status === "PAID" ? "Paid" : "Unpaid"}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Dialog>

      <Dialog
        open={imageViewerOpen}
        onClose={() => setImageViewerOpen(false)}
        maxWidth={false}
        slotProps={{
          paper: {
            sx: {
              width: 800,
              maxWidth: "90vw",
              borderRadius: 2,
              p: 3,
              boxShadow: 3,
            },
          },
          backdrop: {
            sx: {
              bgcolor: "rgba(255,255,255,0.65)",
              backdropFilter: "grayscale(1)",
            },
          },
        }}
      >
        <Box sx={{ position: "relative", textAlign: "center" }}>
          <IconButton
            onClick={() => setImageViewerOpen(false)}
            sx={{ position: "absolute", top: -18, right: -18 }}
          >
            <CloseIcon />
          </IconButton>

          <Typography sx={{ fontWeight: 900, mb: 2 }}>
            {imageViewerTitle}
          </Typography>

          {imageViewerUrl ? (
            <Box
              component="img"
              src={imageViewerUrl}
              alt={imageViewerTitle}
              sx={{
                width: "100%",
                maxHeight: "80vh",
                objectFit: "contain",
              }}
            />
          ) : (
            <Typography>No image uploaded.</Typography>
          )}
        </Box>
      </Dialog>

      <Dialog
        open={openPayment}
        onClose={() => setOpenPayment(false)}
        maxWidth={false}
        slotProps={{
          paper: {
            sx: {
              width: 420,
              borderRadius: 0,
              p: 3,
              boxShadow: "none",
              border: "1px solid #999",
            },
          },
          backdrop: {
            sx: {
              bgcolor: "rgba(255,255,255,0.65)",
              backdropFilter: "grayscale(1)",
            },
          },
        }}
      >
        <Box sx={{ position: "relative" }}>
          <IconButton
            onClick={() => setOpenPayment(false)}
            sx={{ position: "absolute", top: -12, right: -12 }}
          >
            <CloseIcon />
          </IconButton>

          <Typography sx={{ fontWeight: 900, fontSize: 22, mb: 2 }}>
            Confirm Payment
          </Typography>

          <Typography sx={{ fontSize: 14, color: "#777", fontWeight: 700 }}>
            Are you sure you want to Confirm Transaction?
          </Typography>

          <Typography sx={{ fontWeight: 900 }}>
            Transaction #: {selectedSale?.saleCode || "TRX-New"}
          </Typography>

          <Typography sx={{ fontWeight: 900 }}>
            ID: {selectedSale?.customer.customerCode || "000"}
          </Typography>

          <Typography sx={{ fontWeight: 900 }}>
            Name: {selectedSale?.customer.name || "Customer"}
          </Typography>

          <Box sx={{ display: "flex", justifyContent: "center", gap: 3, mt: 4 }}>
            <Button
              variant="contained"
              onClick={confirmPayment}
              disabled={saving}
              sx={{
                bgcolor: "#777",
                color: "#ffc107",
                width: 120,
                height: 45,
                textTransform: "none",
                boxShadow: "none",
                "&:hover": { bgcolor: "#666", boxShadow: "none" },
              }}
            >
              {saving ? "Confirming..." : "Confirm"}
            </Button>

            <Button
              variant="contained"
              onClick={() => setOpenPayment(false)}
              sx={{
                bgcolor: "#000",
                color: "#ffc107",
                width: 120,
                height: 45,
                textTransform: "none",
                boxShadow: "none",
                "&:hover": { bgcolor: "#111", boxShadow: "none" },
              }}
            >
              Cancel
            </Button>
          </Box>
        </Box>
      </Dialog>

      <Dialog
        open={openCancelConfirm}
        onClose={() => setOpenCancelConfirm(false)}
        maxWidth={false}
        slotProps={{
          paper: {
            sx: {
              width: 420,
              borderRadius: 0,
              p: 3,
              boxShadow: "none",
              border: "1px solid #999",
            },
          },
          backdrop: {
            sx: {
              bgcolor: "rgba(255,255,255,0.65)",
              backdropFilter: "grayscale(1)",
            },
          },
        }}
      >
        <Box sx={{ position: "relative" }}>
          <IconButton
            onClick={() => setOpenCancelConfirm(false)}
            sx={{ position: "absolute", top: -12, right: -12 }}
          >
            <CloseIcon />
          </IconButton>

          <Typography sx={{ fontWeight: 900, fontSize: 22, mb: 2 }}>
            Cancel Transaction
          </Typography>

          <Typography sx={{ fontSize: 14, color: "#777", fontWeight: 700 }}>
            Are you sure you want to Cancel Transaction?
          </Typography>

          <Typography sx={{ fontWeight: 900 }}>
            ID: {selectedSale?.saleCode || "TRX-New"}
          </Typography>

          <Typography sx={{ fontWeight: 900 }}>
            Name:{" "}
            {selectedSale?.customer.name ||
              (selectedCustomer ? fullName(selectedCustomer) : "Customer")}
          </Typography>

          <Box sx={{ display: "flex", justifyContent: "center", gap: 3, mt: 4 }}>
            <Button
              variant="contained"
              onClick={closePosAndReset}
              sx={{
                bgcolor: "#777",
                color: "#ffc107",
                width: 120,
                height: 45,
                textTransform: "none",
                boxShadow: "none",
                "&:hover": { bgcolor: "#666", boxShadow: "none" },
              }}
            >
              Delete
            </Button>

            <Button
              variant="contained"
              onClick={() => setOpenCancelConfirm(false)}
              sx={{
                bgcolor: "#000",
                color: "#ffc107",
                width: 120,
                height: 45,
                textTransform: "none",
                boxShadow: "none",
                "&:hover": { bgcolor: "#111", boxShadow: "none" },
              }}
            >
              Cancel
            </Button>
          </Box>
        </Box>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}