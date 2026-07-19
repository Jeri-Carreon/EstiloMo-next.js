"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useReactToPrint } from "react-to-print";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";

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
import InputAdornment from "@mui/material/InputAdornment";

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
import SearchIcon from "@mui/icons-material/Search";
import SettingsIcon from "@mui/icons-material/Settings";
import EditIcon from "@mui/icons-material/Edit";
import Receipt, { receiptPrintPageStyle } from "./Receipt";

type Customer = {
  id: string;
  customerCode: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  mobileNumber: string;
  isActive: boolean;
};

type Barber = {
  id: string;
  name: string;
  isActive?: boolean;
};

type Service = {
  id: string;
  serviceCode: string;
  name: string;
  durationMinutes: number;
  price: number;
  isAvailable: boolean;
  assignedStaff?: {
    id: string;
    name: string;
  }[];
};

export type Sale = {
  id: string;
  saleCode: string;
  source: "WALKIN" | "BOOKING";
  status: "PENDING" | "PAID" | "PARTIAL" | "CANCELLED" | "REFUNDED";
  subtotal: number;
  discount: number;
  pwdDiscount: boolean;
  pwdId: string | null;
  specialDiscountType?: SpecialDiscountType | null;
  vatExempt: boolean;
  vatAmount: number;
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
  appointments: {
    id: string;
    appointmentCode: string;
    status: string;
    serviceName: string;
    appointmentDate: string;
    startMinutes: number;
    endMinutes: number;
    schedule: string;
    barber?: {
      id: string;
      name: string;
    } | null;
  }[];
  payment: {
    id: string;
    paymentCode: string | null;
    amount: number;
    downPayment: number;
    discount?: number;
    pwdDiscount?: boolean;
    pwdId?: string | null;
    specialDiscountType?: SpecialDiscountType | null;
    vatExempt?: boolean;
    vatAmount?: number;
    method: "CASH" | "GCASH";
    status: "PENDING" | "PAID";
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

type LoyaltyRewardType = "NONE" | "FIFTY_PERCENT" | "FREE";
type SpecialDiscountType = "PWD" | "SENIOR";

type LoyaltyCard = {
  id: string;
  cardNumber: string;
  customerId: string;
  name: string;
  stickers: number;
  maxStickers: number;
  status: "ACTIVE" | "COMPLETED";
  fiveRewardRedeemed: boolean;
};

type LoyaltySettings = {
  fiftyPercentStickerThreshold: number;
  freeStickerThreshold: number;
};

type DiscountButtonSetting = {
  id: string;
  percent: number;
  label: string;
  fixed: boolean;
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

const detailRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  py: 0.8,
  borderBottom: "1px solid #f0f0f0",
};

const detailLabel = {
  fontWeight: 700,
  color: "#777",
  fontSize: 13,
};

const detailValue = {
  fontWeight: 900,
  color: "#111",
  fontSize: 13,
};

const VAT_RATE = 0.12;
const PWD_DISCOUNT_RATE = 0.2;

function formatPeso(value: number) {
  return `₱ ${Number(value || 0).toLocaleString("en-PH", {
    maximumFractionDigits: 0,
  })}`;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function calculateVatAmount(subtotal: number) {
  return roundMoney(Number(subtotal || 0) * VAT_RATE);
}

function calculatePwdPricing(subtotal: number) {
  const safeSubtotal = Number(subtotal || 0);
  const vatAmount = calculateVatAmount(safeSubtotal);
  const vatExemptBase = roundMoney(safeSubtotal - vatAmount);
  const pwdDiscountAmount = roundMoney(vatExemptBase * PWD_DISCOUNT_RATE);
  const total = Math.max(roundMoney(vatExemptBase - pwdDiscountAmount), 0);

  return {
    vatExemptBase,
    vatAmount,
    pwdDiscountAmount,
    discountAmount: roundMoney(safeSubtotal - total),
    total,
  };
}

function getVatIndicatorLabel(vatExempt?: boolean) {
  return vatExempt ? "VAT Exempt" : "VAT 12%";
}

function formatVatValue(vatExempt: boolean | undefined, vatAmount: number) {
  return vatExempt ? "VAT Exempt" : formatPeso(vatAmount);
}

function getSpecialDiscountLabel(type?: SpecialDiscountType | null) {
  return type === "SENIOR" ? "Senior Citizen" : "PWD";
}

function getSpecialDiscountIdLabel(type?: SpecialDiscountType | null) {
  return `${getSpecialDiscountLabel(type)} ID`;
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

function getSaleDisplayDate(sale: Sale | null | undefined) {
  if (!sale) return formatToday();

  if (sale.source === "BOOKING" && sale.appointments?.length) {
    return formatDate(sale.appointments[0].appointmentDate);
  }

  return formatDate(sale.createdAt);
}

function getSaleStatusLabel(status: Sale["status"]) {
  if (status === "PAID") return "Paid";
  if (status === "PARTIAL") return "Partial";
  if (status === "CANCELLED") return "Cancelled";
  if (status === "REFUNDED") return "Refunded";
  return "Unpaid";
}

const getStatusColor = (status: string) => {
  const normalized = status.toUpperCase();

  if (normalized === "PAID") return "green";
  if (normalized === "PENDING") return "#EA580C";
  if (normalized === "CANCELLED") return "#DC2626";
  if (normalized === "REFUNDED") return "#1F2937";
  if (normalized === "PARTIAL") return "#2563eb";

  return "#333";
};

function isSignatureHaircut(serviceName: string) {
  return serviceName.trim().toLowerCase() === "signature haircut";
}

function getLoyaltyRewardPercent(rewardType: LoyaltyRewardType) {
  if (rewardType === "FREE") return 100;
  if (rewardType === "FIFTY_PERCENT") return 50;
  return 0;
}

function getLoyaltyRewardErrorMessage(rewardType: LoyaltyRewardType) {
  if (rewardType === "FREE") {
    return "The free service reward can only be applied to Signature Haircut. Please add Signature Haircut to this transaction to use this reward.";
  }

  if (rewardType === "FIFTY_PERCENT") {
    return "The 50% discount reward can only be applied to Signature Haircut. Please add Signature Haircut to this transaction to use this reward.";
  }

  return "";
}

  function minutesToTime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

function getAppointmentSchedule(appt: {
  appointmentDate: string;
  startMinutes: number;
  endMinutes: number;
}) {
  const dateOnly = appt.appointmentDate.split(" ")[0]; // "2026-06-29"

  const date = new Date(dateOnly).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  });

  return `${date} ${minutesToTime(appt.startMinutes)} - ${minutesToTime(appt.endMinutes)}`;
}

function getAppointmentCodeLabel(sale: Pick<Sale, "appointments">) {
  const appointmentCodes = sale.appointments
    .map((appt) => appt.appointmentCode)
    .filter(Boolean);

  return appointmentCodes.length ? appointmentCodes.join(", ") : "—";
}

function getAppointmentScheduleLabel(sale: Sale) {
  // For walk-in sales we show the sale creation date instead of appointment schedules.
  if (sale.source === "WALKIN") {
    return formatDate(sale.createdAt);
  }

  const schedules = sale.appointments.map((appt) => getAppointmentSchedule(appt));

  return schedules.length ? schedules.join("\n") : "—";
}

function getAppointmentCodes(sale: Pick<Sale, "appointments">) {
  return sale.appointments
    .map((appt) => appt.appointmentCode)
    .filter(Boolean);
}

function getAppointmentBarberName(
  sale: Pick<Sale, "appointments">,
  serviceName: string
) {
  const barberNames = sale.appointments
    .filter((appt) => appt.serviceName === serviceName)
    .map((appt) => appt.barber?.name)
    .filter(Boolean);

  return barberNames.length ? [...new Set(barberNames)].join(", ") : "";
}

class FetchJsonError extends Error {
  status: number;

  constructor(url: string, status: number) {
    super(`${url} failed with status ${status}`);
    this.status = status;
  }
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
    if (res.status !== 403) {
      console.error(`${url} ERROR RESPONSE:`, text);
    }

    throw new FetchJsonError(url, res.status);
  }

  try {
    return JSON.parse(text);
  } catch {
    console.error(`${url} returned non-JSON:`, text);
    throw new Error(`${url} did not return JSON`);
  }
}

export default function SalesPage() {
  const router = useRouter();
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loyaltyCards, setLoyaltyCards] = useState<LoyaltyCard[]>([]);
  const [loyaltySettings, setLoyaltySettings] = useState<LoyaltySettings>({
    fiftyPercentStickerThreshold: 5,
    freeStickerThreshold: 10,
  });
  const [barbers, setBarbers] = useState<Barber[]>([]);

  const rowsPerPage = 8;
  const [page, setPage] = useState(1);

  const supabase = createClient();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [openAdd, setOpenAdd] = useState(false);
  const [openDiscountSettings, setOpenDiscountSettings] = useState(false);
  const [openPayment, setOpenPayment] = useState(false);
  const [openCancelConfirm, setOpenCancelConfirm] = useState(false);
  const [openViewTransaction, setOpenViewTransaction] = useState(false);

  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [selectedBarberId, setSelectedBarberId] = useState("");
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);

  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [imageViewerUrl, setImageViewerUrl] = useState("");
  const [imageViewerTitle, setImageViewerTitle] = useState("");
  const [receiptPrintContainer, setReceiptPrintContainer] =
    useState<HTMLElement | null>(null);
  const receiptPrintRef = useRef<HTMLDivElement>(null);

  const [gcashRefNo, setGcashRefNo] = useState("");

  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [method, setMethod] = useState<"CASH" | "GCASH">("CASH");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountButtons, setDiscountButtons] = useState<DiscountButtonSetting[]>([
    { id: "fixed-0", percent: 0, label: "0%", fixed: true },
    { id: "fixed-50", percent: 50, label: "50%", fixed: true },
    { id: "fixed-100", percent: 100, label: "100%", fixed: true },
  ]);
  const [newDiscountPercent, setNewDiscountPercent] = useState("");
  const [editingDiscountId, setEditingDiscountId] = useState<string | null>(null);
  const [editingDiscountPercent, setEditingDiscountPercent] = useState("");
  const [pwdDiscountSelected, setPwdDiscountSelected] = useState(false);
  const [specialDiscountType, setSpecialDiscountType] =
    useState<SpecialDiscountType | null>(null);
  const [pwdId, setPwdId] = useState("");
  const [selectedLoyaltyRewardType, setSelectedLoyaltyRewardType] =
    useState<LoyaltyRewardType>("NONE");
  const [cart, setCart] = useState<CartItem[]>([]);

  const [salesSearch, setSalesSearch] = useState("");
  const [salesStatusFilter, setSalesStatusFilter] = useState("ALL");
  const [salesTypeFilter, setSalesTypeFilter] = useState("ALL");
  const [cancelReason, setCancelReason] = useState<"" | "PARTIAL" | "CANCELLED" | "REFUNDED">("");
  const [appointmentCancelStatus, setAppointmentCancelStatus] = useState<"" | "CANCELLED" | "NOSHOW">("");

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });

  const handlePrintReceipt = useReactToPrint({
    contentRef: receiptPrintRef,
    documentTitle: "The Barbs Bro Receipt",
    pageStyle: receiptPrintPageStyle,
  });

  const cartSummary = useMemo(() => {
    const rewardPercent = getLoyaltyRewardPercent(selectedLoyaltyRewardType);

    const lines = cart.map((item) => {
      const lineSubtotal = item.price * item.quantity;
      const isRewardTarget =
        selectedLoyaltyRewardType !== "NONE" &&
        isSignatureHaircut(item.serviceName);
      const lineDiscount =
        selectedLoyaltyRewardType === "NONE"
          ? Math.round(lineSubtotal * (discountPercent / 100))
          : isRewardTarget
          ? Math.round(lineSubtotal * (rewardPercent / 100))
          : 0;
      const lineTotal = Math.max(lineSubtotal - lineDiscount, 0);

      return {
        ...item,
        lineSubtotal,
        lineDiscount,
        lineTotal,
        isRewardTarget,
      };
    });

    const subtotalValue = lines.reduce(
      (sum, item) => sum + item.lineSubtotal,
      0
    );
    const discountValue = lines.reduce(
      (sum, item) => sum + item.lineDiscount,
      0
    );

    return {
      lines,
      subtotal: subtotalValue,
      discountAmount: discountValue,
      total: Math.max(subtotalValue - discountValue, 0),
      hasSignatureHaircut: cart.some((item) =>
        isSignatureHaircut(item.serviceName)
      ),
    };
  }, [cart, discountPercent, selectedLoyaltyRewardType]);

  const displayedServices = useMemo(() => {
    return services.filter((service) => service.isAvailable);
  }, [services]);

  const activeBarbers = useMemo(() => {
    return barbers.filter((barber) => barber.isActive !== false);
  }, [barbers]);

  function isServiceSelectable(service: Service) {
    if (selectedSale) return false;
    if (!selectedBarberId) return false;

    return Boolean(
      service.assignedStaff?.some((barber) => barber.id === selectedBarberId)
    );
  }

  const subtotal = cartSummary.subtotal;
  const pwdPricing = useMemo(() => calculatePwdPricing(subtotal), [subtotal]);
  const standardVatAmount = useMemo(() => calculateVatAmount(subtotal), [subtotal]);
  const discountAmount = pwdDiscountSelected
    ? pwdPricing.discountAmount
    : cartSummary.discountAmount;
  const total = pwdDiscountSelected ? pwdPricing.total : cartSummary.total;
  const vatAmount = pwdDiscountSelected ? pwdPricing.vatAmount : standardVatAmount;
  const hasSignatureHaircut = cartSummary.hasSignatureHaircut;

  const downPayment = selectedSale?.payment?.downPayment || 0;

  const amountToPay =
    selectedSale?.source === "BOOKING"
      ? Math.max(total - downPayment, 0)
      : total;

  const viewDiscount = Math.max(
    Number(selectedSale?.discount || 0),
    Number(selectedSale?.payment?.discount || 0)
  );
  const viewVatAmount = Math.max(
    Number(selectedSale?.vatAmount || 0),
    Number(selectedSale?.payment?.vatAmount || 0)
  );
  const viewPwdDiscount = Boolean(
    selectedSale?.pwdDiscount || selectedSale?.payment?.pwdDiscount
  );
  const viewVatExempt = Boolean(
    selectedSale?.vatExempt || selectedSale?.payment?.vatExempt || viewPwdDiscount
  );
  const viewSpecialDiscountType =
    selectedSale?.specialDiscountType ||
    selectedSale?.payment?.specialDiscountType ||
    null;
  const viewPwdId = selectedSale?.pwdId || selectedSale?.payment?.pwdId || "";

  const selectedCustomer = customers.find(
    (customer) => customer.id === selectedCustomerId
  );

  const selectedLoyaltyCard = loyaltyCards.find(
    (card) => card.customerId === selectedCustomer?.id
  );

  const stickerCount = selectedLoyaltyCard?.stickers || 0;
  const fiftyPercentStickerThreshold =
    loyaltySettings.fiftyPercentStickerThreshold || 5;
  const freeStickerThreshold = loyaltySettings.freeStickerThreshold || 10;
  const canUse50Discount =
    stickerCount >= fiftyPercentStickerThreshold &&
    stickerCount < freeStickerThreshold &&
    !selectedLoyaltyCard?.fiveRewardRedeemed;
  const canUse100Discount = stickerCount >= freeStickerThreshold;

  const filteredCustomers = customers.filter((customer) => {
    const keyword = customerSearch.trim().toLowerCase();

    if (!keyword || selectedCustomerId) return false;
    if (!customer.isActive) return false;

    const name = fullName(customer).toLowerCase();

    return (
      name.includes(keyword) ||
      customer.customerCode?.toLowerCase().includes(keyword) ||
      customer.mobileNumber?.includes(keyword)
    );
  });

  const filteredSales = sales.filter((sale) => {
    const searchValue = salesSearch.toLowerCase();

    const matchesSearch =
      sale.saleCode.toLowerCase().includes(searchValue) ||
      sale.customer.customerCode.toLowerCase().includes(searchValue) ||
      sale.customer.name.toLowerCase().includes(searchValue) ||
      (sale.barber?.name || "").toLowerCase().includes(searchValue) ||
      sale.source.toLowerCase().includes(searchValue) ||
      sale.status.toLowerCase().includes(searchValue) ||
      getSaleStatusLabel(sale.status).toLowerCase().includes(searchValue) ||
      sale.appointments.some((appt) => {
        const date = new Date(appt.appointmentDate);

        // Multiple date formats so partial typing matches naturally
        const dateFormats = [
          date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }), // "July 2, 2026"
          date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), // "Jul 2, 2026"
          date.toLocaleDateString("en-US"), // "7/2/2026"
          date.toLocaleDateString("en-US", { weekday: "long" }), // "Thursday"
        ];

        const startTime = minutesToTime(appt.startMinutes); // "10:00 AM"
        const endTime = minutesToTime(appt.endMinutes);

        return (
          dateFormats.some((f) => f.toLowerCase().includes(searchValue)) ||
          startTime.toLowerCase().includes(searchValue) ||
          endTime.toLowerCase().includes(searchValue) ||
          appt.schedule.toLowerCase().includes(searchValue)
        );
      }) ||
      (sale.payment?.status || "").toLowerCase().includes(searchValue);


    const matchesStatus =
      salesStatusFilter === "ALL" || sale.status === salesStatusFilter;

    const matchesType =
      salesTypeFilter === "ALL" || sale.source === salesTypeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const totalPages = Math.max(1, Math.ceil(filteredSales.length / rowsPerPage));

  const paginatedSales = filteredSales.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  const showingFrom =
    filteredSales.length === 0 ? 0 : (page - 1) * rowsPerPage + 1;

  const showingTo = Math.min(page * rowsPerPage, filteredSales.length);

  const openImageViewer = (title: string, imageUrl?: string | null) => {
    setImageViewerTitle(title);
    setImageViewerUrl(imageUrl || "");
    setImageViewerOpen(true);
  };

  useQuery({
    queryKey: ["adminSalesData"],
    queryFn: async () => {
      await loadData(false);
      return true;
    },
    refetchInterval: 5000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    setPage(1);
  }, [salesSearch, salesStatusFilter, salesTypeFilter]);

  useEffect(() => {
    if (!selectedSale) return;

    setCustomerSearch(selectedSale.customer.name);
    setSelectedCustomerId(selectedSale.customer.id);
    setMethod((selectedSale.payment?.method as "CASH" | "GCASH") || "CASH");
    setPwdDiscountSelected(Boolean(selectedSale.pwdDiscount));
    setSpecialDiscountType(
      selectedSale.pwdDiscount
        ? selectedSale.specialDiscountType || "PWD"
        : null
    );
    setPwdId(selectedSale.pwdId || "");

    const signatureHaircutSubtotal = selectedSale.items.reduce((sum, item) => {
      if (!isSignatureHaircut(item.serviceName)) return sum;

      return sum + Number(item.subtotal);
    }, 0);
    const selectedSaleDiscount = Number(selectedSale.discount || 0);
    const inferredLoyaltyRewardType: LoyaltyRewardType =
      selectedSale.pwdDiscount
        ? "NONE"
        : signatureHaircutSubtotal > 0 &&
      selectedSaleDiscount === signatureHaircutSubtotal
        ? "FREE"
        : signatureHaircutSubtotal > 0 &&
          selectedSaleDiscount === Math.round(signatureHaircutSubtotal * 0.5)
        ? "FIFTY_PERCENT"
        : "NONE";

    setSelectedLoyaltyRewardType(inferredLoyaltyRewardType);

    setDiscountPercent(
      selectedSale.pwdDiscount
        ? 0
        : inferredLoyaltyRewardType !== "NONE"
        ? getLoyaltyRewardPercent(inferredLoyaltyRewardType)
        : selectedSale.subtotal > 0
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

  async function loadData(showSpinner = true) {
    try {
      if (showSpinner) setLoading(true);

      const [
        salesData,
        servicesData,
        customersData,
        loyaltyData,
        barbersData,
        discountButtonsData,
      ] =
        await Promise.all([
          fetchJson("/api/admin/sales"),
          fetchJson("/api/admin/services"),
          fetchJson("/api/customers"),
          fetchJson("/api/admin/loyaltyCard"),
          fetchJson("/api/admin/barbers"),
          fetchJson("/api/admin/sales/discount-buttons"),
        ]);

      setSales(salesData.sales || []);
      setServices(servicesData.services || []);
      setLoyaltyCards(loyaltyData.cards || []);
      setLoyaltySettings({
        fiftyPercentStickerThreshold:
          loyaltyData.settings?.fiftyPercentStickerThreshold || 5,
        freeStickerThreshold: loyaltyData.settings?.freeStickerThreshold || 10,
      });
      setDiscountButtons(discountButtonsData.buttons || discountButtons);

      const customerList =
        customersData.customers || customersData.data || customersData || [];

      setCustomers(Array.isArray(customerList) ? customerList : []);

      setBarbers(
        (barbersData.barbers || barbersData || [])
          .map((b: any) => ({
            id: b.id,
            name:
              b.name ||
              `${b.firstName ?? ""} ${b.lastName ?? ""}`.trim() ||
              `${b.user?.firstName ?? ""} ${b.user?.lastName ?? ""}`.trim() ||
              "Unknown Barber",
            isActive: b.isActive ?? b.user?.isActive,
          }))
      );
    } catch (error) {
      if (error instanceof FetchJsonError && error.status === 403) {
        router.replace("/unauthorized");
        return;
      }

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
    loadData(true);
  }, []);

  useEffect(() => {
    if (activeBarbers.length === 1) {
      setSelectedBarberId(activeBarbers[0].id);
      setSelectedBarber(activeBarbers[0]);
    }
  }, [activeBarbers]);

  useEffect(() => {
    const container = document.createElement("div");
    container.className = "receipt-print-container";
    document.body.appendChild(container);
    setReceiptPrintContainer(container);

    return () => {
      container.remove();
    };
  }, []);

  function resetForm() {
    setCustomerSearch("");
    setSelectedCustomerId("");
    setMethod("CASH");
    setDiscountPercent(0);
    setPwdDiscountSelected(false);
    setSpecialDiscountType(null);
    setPwdId("");
    setSelectedLoyaltyRewardType("NONE");
    setCart([]);
    setGcashRefNo("");
    setSelectedBarberId("");
    setSelectedBarber(null);
    setCancelReason("");
    setAppointmentCancelStatus("");
  }

  function setSaleData(sale: Sale) {
    setSelectedSale(sale);
    setSelectedBarberId(sale.barber?.id || "");
    setSelectedBarber(sale.barber || null);
  }

  function closePosAndReset() {
    setOpenAdd(false);
    setOpenCancelConfirm(false);
    setOpenPayment(false);
    setOpenViewTransaction(false);
    setSelectedSale(null);
    resetForm();
  }

  function printReceipt() {
    handlePrintReceipt();
  }

  function addServiceToCart(service: Service) {
    if (!isServiceSelectable(service)) {
      setSnackbar({
        open: true,
        message: "Please select a barber assigned to this service first",
        severity: "error",
      });
      return;
    }

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
        customer.isActive &&
        (name === keyword ||
          customer.customerCode?.toLowerCase() === keyword ||
          customer.mobileNumber === value)
      );
    });

    if (exactMatch) {
      setSelectedCustomerId(exactMatch.id);
      setCustomerSearch(fullName(exactMatch));
    }
  }

 function selectCustomer(customer: Customer) {
  if (!customer.isActive) {
    setSnackbar({
      open: true,
      message: "Unavailable customer cannot be used for sales.",
      severity: "error",
    });
    return;
  }
  setSelectedCustomerId(customer.id);
  setCustomerSearch(fullName(customer));
}

  function handleDiscountInput(value: string) {
    setSelectedLoyaltyRewardType("NONE");
    setPwdDiscountSelected(false);
    setSpecialDiscountType(null);
    setPwdId("");

    if (value === "") {
      setDiscountPercent(0);
      return;
    }

    const parsedValue = Number(value);

    if (Number.isNaN(parsedValue)) return;

    const safeValue = Math.min(Math.max(parsedValue, 0), 100);
    setDiscountPercent(safeValue);
  }

  function applyManualDiscount(percent: number) {
    handleDiscountInput(String(percent));
  }

  function normalizeDiscountPercent(value: string) {
    const percent = Number(value);

    if (!Number.isInteger(percent) || percent <= 0 || percent >= 100 || percent === 50) {
      return null;
    }

    return percent;
  }

  async function saveDiscountButton(id?: string) {
    const rawValue = id ? editingDiscountPercent : newDiscountPercent;
    const percent = normalizeDiscountPercent(rawValue);

    if (percent === null) {
      setSnackbar({
        open: true,
        message: "Enter a custom discount from 1% to 99%, excluding 50%.",
        severity: "error",
      });
      return;
    }

    try {
      const res = await fetch("/api/admin/sales/discount-buttons", {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(id ? { id, percent } : { percent }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save discount button");
      }

      await loadData(false);
      setNewDiscountPercent("");
      setEditingDiscountId(null);
      setEditingDiscountPercent("");
      setSnackbar({
        open: true,
        message: "Discount button saved.",
        severity: "success",
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message:
          error instanceof Error ? error.message : "Failed to save discount button",
        severity: "error",
      });
    }
  }

  async function deleteDiscountButton(id: string) {
    try {
      const res = await fetch("/api/admin/sales/discount-buttons", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete discount button");
      }

      await loadData(false);
      setSnackbar({
        open: true,
        message: "Discount button deleted.",
        severity: "success",
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message:
          error instanceof Error ? error.message : "Failed to delete discount button",
        severity: "error",
      });
    }
  }

  function applyLoyaltyReward(rewardType: Exclude<LoyaltyRewardType, "NONE">) {
    if (!hasSignatureHaircut) {
      setSnackbar({
        open: true,
        message: getLoyaltyRewardErrorMessage(rewardType),
        severity: "error",
      });
      return;
    }

    setSelectedLoyaltyRewardType(rewardType);
    setPwdDiscountSelected(false);
    setSpecialDiscountType(null);
    setPwdId("");
    setDiscountPercent(getLoyaltyRewardPercent(rewardType));
  }

  function clearDiscount() {
    setSelectedLoyaltyRewardType("NONE");
    setDiscountPercent(0);
    setPwdDiscountSelected(false);
    setSpecialDiscountType(null);
    setPwdId("");
  }

  function toggleSpecialDiscount() {
    if (pwdDiscountSelected) {
      setPwdDiscountSelected(false);
      setSpecialDiscountType(null);
      setPwdId("");
      return;
    }

    setPwdDiscountSelected(true);
    setSpecialDiscountType(specialDiscountType || "PWD");
    setSelectedLoyaltyRewardType("NONE");
    setDiscountPercent(0);
  }

  function selectSpecialDiscountType(type: SpecialDiscountType) {
    setSpecialDiscountType(type);
    setPwdDiscountSelected(true);
    setSelectedLoyaltyRewardType("NONE");
    setDiscountPercent(0);
  }

  function validateSelectedLoyaltyReward() {
    if (pwdDiscountSelected && !pwdId.trim()) {
      setSnackbar({
        open: true,
        message: "Please enter the PWD/Senior Citizen ID.",
        severity: "error",
      });

      return false;
    }

    if (selectedLoyaltyRewardType === "NONE" || hasSignatureHaircut) {
      return true;
    }

    setSnackbar({
      open: true,
      message: getLoyaltyRewardErrorMessage(selectedLoyaltyRewardType),
      severity: "error",
    });

    return false;
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

      const chosenCustomer = customers.find(
        (customer) => customer.id === selectedCustomerId
      );

      if (!chosenCustomer?.isActive) {
        setSnackbar({
          open: true,
          message: "Unavailable customer cannot be used for sales.",
          severity: "error",
        });
        return;
      }

      if (!selectedBarberId) {
        setSnackbar({
          open: true,
          message: "Please select a barber first",
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

      if (!validateSelectedLoyaltyReward()) return;

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
          pwdDiscount: pwdDiscountSelected,
          pwdId: pwdDiscountSelected ? pwdId.trim() : null,
          specialDiscountType: pwdDiscountSelected
            ? specialDiscountType || "PWD"
            : null,
          barberId: selectedBarberId,
          loyaltyRewardType: selectedLoyaltyRewardType,
          items: cart.map((item) => ({
            serviceId: item.serviceId,
            quantity: item.quantity,
            price: item.price,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.details
            ? `${data.error || "Failed to create sale"}: ${data.details}`
            : data.error || "Failed to create sale"
        );
      }

      closePosAndReset();
      await queryClient.invalidateQueries({ queryKey: ["adminSalesData"] });
      await loadData(false);

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

      if (!validateSelectedLoyaltyReward()) return;

      setSaving(true);

      if (method === "GCASH") {
        if (!gcashRefNo || gcashRefNo.length !== 6) {
          setSnackbar({
            open: true,
            message: "GCash reference must be exactly 6 digits",
            severity: "error",
          });
          return;
        }
      }

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
            totalAmount: amountToPay,
            pwdDiscount: pwdDiscountSelected,
            pwdId: pwdDiscountSelected ? pwdId.trim() : null,
            specialDiscountType: pwdDiscountSelected
              ? specialDiscountType || "PWD"
              : null,
            gcashRefNo: method === "GCASH" ? gcashRefNo : null,
            loyaltyRewardType: selectedLoyaltyRewardType,
          }),
        }
      );

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (!res.ok) {
        throw new Error(data.error || "Failed to confirm payment");
      }

      closePosAndReset();
      await queryClient.invalidateQueries({ queryKey: ["adminSalesData"] });
      await loadData(false);

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

  async function cancelTransaction() {
    try {
      if (!selectedSale && !openAdd) {
        closePosAndReset();
        return;
      }

      if (!cancelReason) {
        setSnackbar({
          open: true,
          message: "Please select a reason for cancellation",
          severity: "error",
        });
        return;
      }

      if (!selectedSale) {
        closePosAndReset();
        return;
      }

      if (selectedSale.source === "BOOKING" && cancelReason === "CANCELLED") {
        setSnackbar({
          open: true,
          message: "Cancelled status is only for walk-in transactions. Use Partial for appointment bookings.",
          severity: "error",
        });
        return;
      }

      if (selectedSale.source === "WALKIN" && cancelReason === "PARTIAL") {
        setSnackbar({
          open: true,
          message: "Partial status is only for appointment bookings.",
          severity: "error",
        });
        return;
      }

      if (selectedSale.source === "BOOKING" && cancelReason === "PARTIAL" && !appointmentCancelStatus) {
        setSnackbar({
          open: true,
          message: "Please select if the appointment was cancelled or no-show.",
          severity: "error",
        });
        return;
      }

      setSaving(true);

      const res = await fetch(`/api/admin/sales/${selectedSale.id}/cancel`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: cancelReason,
          appointmentStatus:
            cancelReason === "PARTIAL" ? appointmentCancelStatus : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to cancel transaction");
      }

      closePosAndReset();
      await queryClient.invalidateQueries({ queryKey: ["adminSalesData"] });
      await loadData(false);

      setSnackbar({
        open: true,
        message: "Transaction cancelled successfully.",
        severity: "success",
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message:
          error instanceof Error ? error.message : "Failed to cancel transaction",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box sx={{ bgcolor: "#fff", minHeight: "100vh", px: 6, py: 5, pb: 8 }}>
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

        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1 }}>
          <IconButton
            onClick={() => setOpenDiscountSettings(true)}
            sx={{
              width: 36,
              height: 36,
              border: "1px solid #e0e0e0",
              bgcolor: "#fff",
              color: "#555",
              "&:hover": { bgcolor: "#fafafa" },
            }}
            aria-label="Discount settings"
          >
            <SettingsIcon fontSize="small" />
          </IconButton>

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
      </Box>

      <Box sx={{ display: "flex", gap: 2, mb: 4, flexWrap: "wrap" }}>
        <TextField
          size="small"
          placeholder="Search sales..."
          value={salesSearch}
          onChange={(e) => setSalesSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "#999" }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{
            flex: 1,
            maxWidth: 300,
          }}
        />

        <TextField
          select
          size="small"
          value={salesStatusFilter}
          onChange={(e) => setSalesStatusFilter(e.target.value)}
          sx={{
            width: 170,
            bgcolor: "#fff",
          }}
        >
          <MenuItem value="ALL">All Status</MenuItem>
          <MenuItem value="PENDING">Unpaid</MenuItem>
          <MenuItem value="PAID">Paid</MenuItem>
          <MenuItem value="PARTIAL">Partial</MenuItem>
          <MenuItem value="CANCELLED">Cancelled</MenuItem>
          <MenuItem value="REFUNDED">Refunded</MenuItem>
        </TextField>

        <TextField
          select
          size="small"
          value={salesTypeFilter}
          onChange={(e) => setSalesTypeFilter(e.target.value)}
          sx={{
            width: 170,
            bgcolor: "#fff",
          }}
        >
          <MenuItem value="ALL">All Type</MenuItem>
          <MenuItem value="WALKIN">Walk-In</MenuItem>
          <MenuItem value="BOOKING">Appointment</MenuItem>
        </TextField>
      </Box>

      <Paper elevation={0} sx={{ bgcolor: "transparent" }}>
        {loading ? (
          <Box sx={{ py: 8, textAlign: "center" }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TableContainer sx={{ overflowX: "auto" }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ ...headCell, minWidth: 260 }}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 2,
                        }}
                      >
                        <Box component="span">Transaction #</Box>
                        <Box component="span">Appointment #</Box>
                      </Box>
                    </TableCell>
                    <TableCell sx={headCell}>ID</TableCell>
                    <TableCell sx={headCell}>Name</TableCell>
                    <TableCell sx={headCell}>Schedule</TableCell>
                    <TableCell sx={headCell}>Barber</TableCell>
                    <TableCell sx={headCell}>Total Amount</TableCell>
                    <TableCell sx={headCell}>VAT</TableCell>
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
                      <TableCell sx={{ ...bodyCell, minWidth: 260 }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "space-between",
                            gap: 2,
                          }}
                        >
                          <Typography
                            component="span"
                            sx={{
                              fontSize: 14,
                              fontWeight: 900,
                              color: "#222",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {sale.saleCode}
                          </Typography>

                          <Box
                            sx={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "flex-end",
                              gap: 0.25,
                              textAlign: "right",
                            }}
                          >
                            {getAppointmentCodes(sale).length ? (
                              getAppointmentCodes(sale).map((appointmentCode) => (
                                <Typography
                                  key={appointmentCode}
                                  component="span"
                                  sx={{
                                    fontSize: 13,
                                    fontWeight: 800,
                                    color: "#777",
                                    lineHeight: 1.2,
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {appointmentCode}
                                </Typography>
                              ))
                            ) : (
                              <Typography
                                component="span"
                                sx={{
                                  fontSize: 13,
                                  fontWeight: 800,
                                  color: "#777",
                                  lineHeight: 1.2,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                —
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell sx={bodyCell}>
                        {sale.customer.customerCode}
                      </TableCell>
                      <TableCell sx={bodyCell}>{sale.customer.name}</TableCell>

                      <TableCell sx={bodyCell}>
                        <Box sx={{ whiteSpace: "pre-line" }}>
                          {getAppointmentScheduleLabel(sale)}
                        </Box>
                      </TableCell>
                      <TableCell sx={bodyCell}>
                        {sale.barber?.name || "—"}
                      </TableCell>
                      <TableCell sx={bodyCell}>
                        {formatPeso(
                          sale.source === "BOOKING"
                            ? Math.max(sale.totalAmount - (sale.payment?.downPayment || 0), 0)
                            : sale.totalAmount
                        )}
                      </TableCell>
                      <TableCell sx={bodyCell}>
                        {formatVatValue(sale.vatExempt, sale.vatAmount || 0)}
                      </TableCell>
                      <TableCell sx={bodyCell}>
                        {sale.source === "WALKIN" ? "Walk-In" : "Appointment"}
                      </TableCell>
                      <TableCell
                        sx={{
                          ...bodyCell,
                          color: getStatusColor(sale.status),
                        }}
                      >
                        {getSaleStatusLabel(sale.status)}
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
                            disabled={sale.status === "CANCELLED" || sale.status === "REFUNDED" || sale.status === "PAID"}
                            onClick={() => {
                              setSaleData(sale);
                              setOpenAdd(true);
                            }}
                            sx={{
                              ...actionIcon,
                              opacity:  1,
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

                  {filteredSales.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} align="center" sx={{ py: 6 }}>
                        No sales found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mt: 3,
                mb: 2,
              }}
            >
              <Typography
                sx={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#333",
                }}
              >
                Showing {showingFrom} to {showingTo} of{" "}
                {filteredSales.length} Entries
              </Typography>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
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

                {Array.from({ length: totalPages })
                .map((_, i) => i + 1)
                .filter(
                  (p) =>
                    p === 1 ||
                    p === totalPages ||
                    (p >= page - 2 && p <= page + 2)
                )
                .map((p, i, arr) => {
                  const previous = arr[i - 1];

                  return (
                    <Box key={p} sx={{ display: "flex", gap: 1 }}>
                      {previous && p - previous > 1 && (
                        <Typography sx={{ px: 1 }}>...</Typography>
                      )}

                      <Box
                        onClick={() => setPage(p)}
                        sx={{
                          width: 30,
                          height: 30,
                          borderRadius: "8px",
                          bgcolor: page === p ? "#ffc107" : "#e0e0e0",
                          color: page === p ? "#000" : "#666",
                          display: "grid",
                          placeItems: "center",
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        {p}
                      </Box>
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
            </Box>
          </>
        )}
      </Paper>

      <Dialog
        open={openDiscountSettings}
        onClose={() => {
          setOpenDiscountSettings(false);
          setEditingDiscountId(null);
          setEditingDiscountPercent("");
          setNewDiscountPercent("");
        }}
        maxWidth="sm"
        fullWidth
      >
        <Box sx={{ p: 3, bgcolor: "#fff" }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 2,
            }}
          >
            <Typography sx={{ fontSize: 22, fontWeight: 900 }}>
              Discount Buttons
            </Typography>

            <IconButton onClick={() => setOpenDiscountSettings(false)}>
              <CloseIcon />
            </IconButton>
          </Box>

          <Typography sx={{ fontSize: 13, color: "#777", fontWeight: 700, mb: 2 }}>
            0%, 50%, 100%, and PWD/Senior are fixed. Custom buttons can be edited or deleted.
          </Typography>

          <Box sx={{ display: "flex", gap: 1, mb: 3 }}>
            <TextField
              size="small"
              type="number"
              label="Discount %"
              value={newDiscountPercent}
              onChange={(e) => setNewDiscountPercent(e.target.value)}
              slotProps={{
                htmlInput: {
                  min: 1,
                  max: 99,
                  step: 1,
                },
              }}
              sx={{ flex: 1 }}
            />

            <Button
              variant="contained"
              onClick={() => saveDiscountButton()}
              sx={{
                bgcolor: "#000",
                color: "#ffc107",
                textTransform: "none",
                fontWeight: 900,
                "&:hover": { bgcolor: "#111" },
              }}
            >
              Add
            </Button>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {discountButtons.map((button) => (
              <Box
                key={button.id}
                sx={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto auto",
                  gap: 1,
                  alignItems: "center",
                  border: "1px solid #eee",
                  p: 1,
                  borderRadius: 1,
                }}
              >
                {editingDiscountId === button.id ? (
                  <TextField
                    size="small"
                    type="number"
                    value={editingDiscountPercent}
                    onChange={(e) => setEditingDiscountPercent(e.target.value)}
                    slotProps={{
                      htmlInput: {
                        min: 1,
                        max: 99,
                        step: 1,
                      },
                    }}
                  />
                ) : (
                  <Typography sx={{ fontWeight: 900 }}>
                    {button.label}
                    {button.fixed ? " fixed" : ""}
                  </Typography>
                )}

                {button.fixed ? (
                  <Typography sx={{ fontSize: 12, color: "#777", fontWeight: 800 }}>
                    Locked
                  </Typography>
                ) : editingDiscountId === button.id ? (
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => saveDiscountButton(button.id)}
                    sx={{ textTransform: "none", bgcolor: "#000" }}
                  >
                    Save
                  </Button>
                ) : (
                  <IconButton
                    size="small"
                    onClick={() => {
                      setEditingDiscountId(button.id);
                      setEditingDiscountPercent(String(button.percent));
                    }}
                    sx={actionIcon}
                  >
                    <EditIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                )}

                <IconButton
                  size="small"
                  disabled={button.fixed}
                  onClick={() => deleteDiscountButton(button.id)}
                  sx={{
                    ...actionIcon,
                    opacity: button.fixed ? 0.35 : 1,
                  }}
                >
                  <DeleteIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
            ))}
          </Box>
        </Box>
      </Dialog>

      <Dialog open={openAdd} onClose={closePosAndReset} fullScreen>
        <DialogContent sx={{ p: 0, overflow: "hidden" }}>
          <Box sx={{ display: "flex", height: "100vh", bgcolor: "#fff" }}>
            <Box sx={{ flex: 1.35, px: 7, py: 5 }}>
              <Typography sx={{ fontSize: 34, fontWeight: 900, mb: 5 }}>
                Sales
              </Typography>

              <Typography sx={{ fontSize: 24, mb: 3 }}>Services</Typography>

              <Typography
                sx={{ fontSize: 14, fontWeight: 800, mb: 1, color: "#777" }}
              >
                Select Barber
              </Typography>

              <TextField
                select
                fullWidth
                variant="standard"
                value={selectedBarberId}
                onChange={(e) => {
                  if (selectedSale) return;

                  const id = e.target.value;
                  setSelectedBarberId(id);

                  const barber = activeBarbers.find((b) => b.id === id) || null;
                  setSelectedBarber(barber);

                  setCart([]);
                }}
                disabled={Boolean(selectedSale)}
                sx={{
                  mb: 3,
                  width: 250,
                  pointerEvents: selectedSale ? "none" : "auto",
                  opacity: selectedSale ? 0.7 : 1,
                }}
              >
                {activeBarbers.map((barber) => (
                  <MenuItem key={barber.id} value={barber.id}>
                    {barber.name}
                  </MenuItem>
                ))}
              </TextField>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 2,
                  maxWidth: 620,
                }}
              >
                {displayedServices.map((service, index) => {
                  const selectable = isServiceSelectable(service);

                  return (
                    <Button
                      key={`${service.id}-${index}`}
                      disabled={!selectable}
                      onClick={() => addServiceToCart(service)}
                      sx={{
                        height: 72,
                        bgcolor: selectable ? "#e9e9e9" : "#d1d1d1",
                        color: selectable ? "#111" : "#888",
                        borderRadius: 1,
                        textTransform: "none",
                        display: "flex",
                        flexDirection: "column",
                        fontWeight: 900,
                        opacity: selectable ? 1 : 0.45,
                        cursor: selectable ? "pointer" : "not-allowed",
                        border: selectable ? "none" : "1px dashed #aaa",
                        "&:hover": {
                          bgcolor: selectable ? "#dedede" : "#d1d1d1",
                        },
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
                  );
                })}
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

                <Box sx={{ position: "relative", width: 280, mb: 0.5 }}>
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
                        top: "calc(100% + 4px)",
                        left: 0,
                        width: 280,
                        zIndex: 30,
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
                </Box>

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
                          ? selectedSale.source === "BOOKING" && selectedSale.appointments?.length
                            ? getAppointmentSchedule(selectedSale.appointments[0])
                            : formatDate(selectedSale.createdAt)
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
                      {selectedSale ? getSaleStatusLabel(selectedSale.status) : "Pending"}
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
                    <Typography
                      sx={{ fontSize: 12, color: "#777", fontWeight: 700 }}
                    >
                      50% off requires {fiftyPercentStickerThreshold} stickers.
                      Free reward requires {freeStickerThreshold} stickers.
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
                    {cartSummary.lines.map((item, index) => (
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
                        <Box>
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

                          {item.isRewardTarget && item.lineDiscount > 0 && (
                            <Typography
                              sx={{
                                fontSize: 11,
                                fontWeight: 800,
                                color: "#1f7a3a",
                                mt: 0.4,
                              }}
                            >
                              Signature Haircut reward applied
                            </Typography>
                          )}
                        </Box>

                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 0.8 }}
                        >
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

                          <Box sx={{ minWidth: 72, textAlign: "right" }}>
                            {item.isRewardTarget && item.lineDiscount > 0 && (
                              <Typography
                                sx={{
                                  fontSize: 11,
                                  fontWeight: 800,
                                  color: "#999",
                                  textDecoration: "line-through",
                                }}
                              >
                                {formatPeso(item.lineSubtotal)}
                              </Typography>
                            )}

                            <Typography
                              sx={{
                                fontWeight: 900,
                                color: "#777",
                              }}
                            >
                              {formatPeso(
                                item.isRewardTarget && item.lineDiscount > 0
                                  ? item.lineTotal
                                  : item.lineSubtotal
                              )}
                            </Typography>
                          </Box>

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
                    <Typography>{getVatIndicatorLabel(pwdDiscountSelected)}</Typography>
                    <Typography>{formatVatValue(pwdDiscountSelected, vatAmount)}</Typography>
                  </Box>

                  {pwdDiscountSelected && (
                    <>
                      <Box sx={summaryRow}>
                        <Typography>VAT Exemption</Typography>
                        <Typography>-{formatPeso(vatAmount)}</Typography>
                      </Box>

                      <Box sx={summaryRow}>
                        <Typography>{getSpecialDiscountLabel(specialDiscountType)} 20% Discount</Typography>
                        <Typography>-{formatPeso(pwdPricing.pwdDiscountAmount)}</Typography>
                      </Box>
                    </>
                  )}

                  <Box sx={summaryRow}>
                    <Typography
                      sx={{ textDecoration: "line-through", color: "#888" }}
                    >
                      Downpayment
                    </Typography>
                    <Typography
                      sx={{ textDecoration: "line-through", color: "#888" }}
                    >
                      {formatPeso(selectedSale?.payment?.downPayment || 0)}
                    </Typography>
                  </Box>

                  <Box sx={summaryRow}>
                    <Typography>
                      {pwdDiscountSelected
                        ? `Total ${getSpecialDiscountLabel(specialDiscountType)} Discount`
                        : selectedLoyaltyRewardType === "FREE"
                        ? "Signature Haircut Reward"
                        : selectedLoyaltyRewardType === "FIFTY_PERCENT"
                        ? "Signature Haircut 50% Reward"
                        : "Discount"}
                    </Typography>
                    <Typography>-{formatPeso(discountAmount)}</Typography>
                  </Box>

                  <Box sx={summaryRow}>
                    <Typography>Total Payment</Typography>
                    <Typography>{formatPeso(amountToPay)}</Typography>
                  </Box>

                  <Box sx={summaryRow}>
                    <Typography>Mode of Payment</Typography>
                    <TextField
                      select
                      variant="standard"
                      value={method}
                      onChange={(e) =>
                        setMethod(e.target.value as "CASH" | "GCASH")
                      }
                      sx={{ width: 90 }}
                    >
                      <MenuItem value="CASH">Cash</MenuItem>
                      <MenuItem value="GCASH">GCash</MenuItem>
                    </TextField>
                  </Box>

                  {selectedSale && method === "GCASH" && (
                    <Box sx={{ mt: 1 }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 800, mb: 1 }}>
                        GCash Reference No (Last 6 digits)
                      </Typography>

                      <TextField
                        fullWidth
                        variant="standard"
                        value={gcashRefNo}
                        onChange={(e) => {
                          const val = e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 6);
                          setGcashRefNo(val);
                        }}
                        placeholder="Enter last 6 digits"
                        error={gcashRefNo.length > 0 && gcashRefNo.length !== 6}
                        helperText={
                          gcashRefNo.length > 0 && gcashRefNo.length !== 6
                            ? "Must be exactly 6 digits"
                            : ""
                        }
                        slotProps={{
                          htmlInput: {
                            maxLength: 6,
                          },
                        }}
                      />
                    </Box>
                  )}

                  <Box sx={summaryRow}>
                    <Typography>Discount %</Typography>

                    <TextField
                      variant="standard"
                      type="number"
                      value={discountPercent}
                      disabled={pwdDiscountSelected}
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

                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: "52px 1fr 72px 78px",
                          gap: 1,
                          alignItems: "stretch",
                        }}
                      >
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => applyManualDiscount(0)}
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

                        <Box
                          sx={{
                            display: "grid",
                            gridTemplateColumns: "1fr",
                            gap: 0.5,
                            minWidth: 0,
                          }}
                        >
                          <Button
                            size="small"
                            variant={pwdDiscountSelected ? "contained" : "outlined"}
                            onClick={toggleSpecialDiscount}
                            sx={{
                              minWidth: 0,
                              color: pwdDiscountSelected ? "#ffc107" : "#111",
                              bgcolor: pwdDiscountSelected ? "#111" : "transparent",
                              borderColor: "#ccc",
                              textTransform: "none",
                              fontWeight: 800,
                              fontSize: 12,
                              lineHeight: 1.1,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              "&:hover": {
                                bgcolor: pwdDiscountSelected ? "#222" : "#f8fafc",
                              },
                            }}
                          >
                            PWD/Senior 20%
                          </Button>

                          {pwdDiscountSelected && (
                            <TextField
                              select
                              size="small"
                              value={specialDiscountType || "PWD"}
                              onChange={(e) =>
                                selectSpecialDiscountType(
                                  e.target.value as SpecialDiscountType
                                )
                              }
                              sx={{
                                bgcolor: "#fff",
                                "& .MuiOutlinedInput-root": {
                                  height: 30,
                                  fontSize: 12,
                                  fontWeight: 800,
                                },
                                "& .MuiSelect-select": {
                                  py: 0.4,
                                  pr: "24px !important",
                                  pl: 1,
                                },
                              }}
                            >
                              <MenuItem value="PWD">PWD</MenuItem>
                              <MenuItem value="SENIOR">Senior</MenuItem>
                            </TextField>
                          )}
                        </Box>

                        <Button
                          size="small"
                          variant="outlined"
                          disabled={!canUse50Discount}
                          onClick={() => applyLoyaltyReward("FIFTY_PERCENT")}
                          sx={{
                            minWidth: 72,
                            color: canUse50Discount ? "#111" : "#999",
                            borderColor: "#ccc",
                            textTransform: "none",
                            fontWeight: 800,
                            opacity: canUse50Discount ? 1 : 0.45,
                            textDecoration: !canUse50Discount ? "line-through" : "none",
                            cursor: canUse50Discount ? "pointer" : "not-allowed",
                          }}
                        >
                          50%
                        </Button>

                        <Button
                          size="small"
                          variant="outlined"
                          disabled={!canUse100Discount}
                          onClick={() => applyLoyaltyReward("FREE")}
                          sx={{
                            minWidth: 78,
                            color: canUse100Discount ? "#111" : "#999",
                            borderColor: "#ccc",
                            textTransform: "none",
                            fontWeight: 800,
                            opacity: canUse100Discount ? 1 : 0.45,
                            textDecoration: !canUse100Discount ? "line-through" : "none",
                            cursor: canUse100Discount ? "pointer" : "not-allowed",
                          }}
                        >
                          100%
                        </Button>
                      </Box>

                      {discountButtons.some((button) => !button.fixed) && (
                        <Box
                          sx={{
                            display: "grid",
                            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                            gap: 1,
                            mt: 1,
                          }}
                        >
                          {discountButtons
                            .filter((button) => !button.fixed)
                            .map((button) => (
                              <Button
                                key={button.id}
                                size="small"
                                variant="outlined"
                                onClick={() => applyManualDiscount(button.percent)}
                                sx={{
                                  minWidth: 0,
                                  color: "#111",
                                  borderColor: "#ccc",
                                  textTransform: "none",
                                  fontWeight: 800,
                                }}
                              >
                                {button.label}
                              </Button>
                            ))}
                        </Box>
                      )}

                      {pwdDiscountSelected && (
                        <TextField
                          fullWidth
                          size="small"
                          label={getSpecialDiscountIdLabel(specialDiscountType)}
                          value={pwdId}
                          onChange={(e) => setPwdId(e.target.value)}
                          sx={{ mt: 1.5, bgcolor: "#fff" }}
                        />
                      )}
                  </Box>
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

          <Box sx={{ mb: 2 }}>
            <Box sx={detailRow}>
              <Typography sx={detailLabel}>Transaction #</Typography>
              <Typography sx={detailValue}>{selectedSale?.saleCode}</Typography>
            </Box>

            <Box sx={detailRow}>
              <Typography sx={detailLabel}>Customer ID</Typography>
              <Typography sx={detailValue}>
                {selectedSale?.customer.customerCode}
              </Typography>
            </Box>

            <Box sx={detailRow}>
              <Typography sx={detailLabel}>Name</Typography>
              <Typography sx={detailValue}>
                {selectedSale?.customer.name}
              </Typography>
            </Box>

            <Box sx={detailRow}>
              <Typography sx={detailLabel}>Barber</Typography>
              <Typography sx={detailValue}>
                {selectedSale?.barber?.name || "—"}
              </Typography>
            </Box>

            <Box sx={detailRow}>
              <Typography sx={detailLabel}>Date</Typography>
              <Typography sx={detailValue}>
                {selectedSale?.appointments?.length
                  ? getAppointmentSchedule(selectedSale.appointments[0])
                  : formatToday()}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ bgcolor: "#fff", border: "1px solid #eee", mb: 2 }}>
            {selectedSale?.items.map((item, index) => (
              <Box
                key={`${item.id}-${item.serviceId}-${index}`}
                sx={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  alignItems: "center",
                  px: 2,
                  py: 1.5,
                  borderBottom: "1px solid #eee",
                  gap: 1,
                }}
              >
                <Box>
                  <Typography sx={{ fontWeight: 800 }}>
                    {item.serviceName} x{item.quantity}
                  </Typography>

                  <Typography
                    sx={{
                      fontSize: 12,
                      color: "#777",
                      mt: 0.5,
                    }}
                  >
                    {selectedSale
                      ? getAppointmentBarberName(selectedSale, item.serviceName) ||
                        selectedSale.barber?.name ||
                        "—"
                      : "—"}
                  </Typography>
                </Box>

                <Typography sx={{ fontWeight: 800, textAlign: "right" }}>
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
              <Typography>{getVatIndicatorLabel(viewVatExempt)}</Typography>
              <Typography>
                {formatVatValue(viewVatExempt, viewVatAmount)}
              </Typography>
            </Box>

            {viewPwdDiscount && (
              <>
                <Box sx={summaryRow}>
                  <Typography>{getSpecialDiscountIdLabel(viewSpecialDiscountType)}</Typography>
                  <Typography>{viewPwdId || "-"}</Typography>
                </Box>

                <Box sx={summaryRow}>
                  <Typography>VAT Exemption</Typography>
                  <Typography>-{formatPeso(viewVatAmount)}</Typography>
                </Box>

                <Box sx={summaryRow}>
                  <Typography>
                    {getSpecialDiscountLabel(viewSpecialDiscountType)} 20% Discount
                  </Typography>
                  <Typography>
                    -{formatPeso(
                      calculatePwdPricing(selectedSale?.subtotal || 0)
                        .pwdDiscountAmount
                    )}
                  </Typography>
                </Box>
              </>
            )}

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
              <Typography>{formatPeso(viewDiscount)}</Typography>
            </Box>

            <Box sx={summaryRow}>
              <Typography>Total Payment</Typography>

              {selectedSale?.source === "WALKIN" &&
              selectedSale?.payment?.screenshotUrl ? (
                <Button
                  onClick={() =>
                    openImageViewer(
                      "Proof of Full Payment",
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
                  {formatPeso(selectedSale?.totalAmount || 0)}
                </Button>
              ) : (
                <Typography>
                  {formatPeso(
                    selectedSale?.source === "BOOKING"
                      ? Math.max(
                          (selectedSale?.totalAmount || 0) -
                            (selectedSale?.payment?.downPayment || 0),
                          0
                        )
                      : selectedSale?.totalAmount || 0
                  )}
                </Typography>
              )}
            </Box>

            <Box sx={summaryRow}>
              <Typography>Mode of Payment</Typography>
              <Typography>{selectedSale?.payment?.method || "-"}</Typography>
            </Box>

            <Box sx={summaryRow}>
              <Typography>Status</Typography>
              <Typography>
                {selectedSale ? getSaleStatusLabel(selectedSale.status) : "Unpaid"}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
            <Button
              variant="contained"
              onClick={printReceipt}
              sx={{
                bgcolor: "#000",
                color: "#ffc107",
                textTransform: "none",
                fontWeight: 900,
                "&:hover": { bgcolor: "#111" },
              }}
            >
              Print Receipt
            </Button>
          </Box>
        </Box>
      </Dialog>

      {receiptPrintContainer &&
        createPortal(
          <div ref={receiptPrintRef}>
            <Receipt
              sale={selectedSale}
              formatPeso={formatPeso}
              formatDate={formatDate}
              getSaleStatusLabel={getSaleStatusLabel}
              getAppointmentBarberName={getAppointmentBarberName}
            />
          </div>,
          receiptPrintContainer
        )}

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

          <Box sx={{ bgcolor: "#f8f8f8", border: "1px solid #eee", p: 2, mt: 2 }}>
            <Box sx={summaryRow}>
              <Typography>Subtotal</Typography>
              <Typography>{formatPeso(subtotal)}</Typography>
            </Box>
            <Box sx={summaryRow}>
              <Typography>{getVatIndicatorLabel(pwdDiscountSelected)}</Typography>
              <Typography>{formatVatValue(pwdDiscountSelected, vatAmount)}</Typography>
            </Box>
            {pwdDiscountSelected && (
              <>
                <Box sx={summaryRow}>
                  <Typography>{getSpecialDiscountIdLabel(specialDiscountType)}</Typography>
                  <Typography>{pwdId.trim() || "-"}</Typography>
                </Box>
                <Box sx={summaryRow}>
                  <Typography>VAT Exemption</Typography>
                  <Typography>-{formatPeso(vatAmount)}</Typography>
                </Box>
                <Box sx={summaryRow}>
                  <Typography>{getSpecialDiscountLabel(specialDiscountType)} 20% Discount</Typography>
                  <Typography>-{formatPeso(pwdPricing.pwdDiscountAmount)}</Typography>
                </Box>
              </>
            )}
            <Box sx={summaryRow}>
              <Typography>Total Payment</Typography>
              <Typography>{formatPeso(amountToPay)}</Typography>
            </Box>
          </Box>

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
              width: 460,
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

          <Typography sx={{ fontSize: 14, color: "#777", fontWeight: 700, mb: 1 }}>
            Reason for Cancellation:
          </Typography>

          <TextField
            select
            fullWidth
            value={cancelReason}
            onChange={(e) => {
              const value = e.target.value as "" | "PARTIAL" | "CANCELLED" | "REFUNDED";
              setCancelReason(value);

              if (value !== "PARTIAL") {
                setAppointmentCancelStatus("");
              }
            }}
            sx={{ mb: 3 }}
          >
            {selectedSale?.source === "BOOKING" && (
              <MenuItem value="PARTIAL">
                Partial - Cancelled Appointment / No-show Appointment
              </MenuItem>
            )}

            {selectedSale?.source === "WALKIN" && (
              <MenuItem value="CANCELLED">Cancelled - Walk-in Only</MenuItem>
            )}

            <MenuItem value="REFUNDED">Refunded</MenuItem>
          </TextField>

          {selectedSale?.source === "BOOKING" && cancelReason === "PARTIAL" && (
            <TextField
              select
              fullWidth
              label="Appointment Result"
              value={appointmentCancelStatus}
              onChange={(e) =>
                setAppointmentCancelStatus(e.target.value as "" | "CANCELLED" | "NOSHOW")
              }
              sx={{ mb: 3 }}
            >
              <MenuItem value="CANCELLED">Cancelled Appointment</MenuItem>
              <MenuItem value="NOSHOW">No-show Appointment</MenuItem>
            </TextField>
          )}

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
              onClick={cancelTransaction}
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
              {saving ? "Saving..." : "Confirm"}
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
