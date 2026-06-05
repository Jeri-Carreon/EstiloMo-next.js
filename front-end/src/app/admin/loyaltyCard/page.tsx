"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Dialog from "@mui/material/Dialog";
import MenuItem from "@mui/material/MenuItem";
import CircularProgress from "@mui/material/CircularProgress";
import InputAdornment from "@mui/material/InputAdornment";
import Chip from "@mui/material/Chip";

import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import EditIcon from "@mui/icons-material/Edit";
import SettingsIcon from "@mui/icons-material/Settings";
import CloseIcon from "@mui/icons-material/Close";
import LoyaltyIcon from "@mui/icons-material/Loyalty";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

type LoyaltyCard = {
  id: string;
  cardNumber: string;
  customerId: string;
  name: string;
  stickers: number;
  maxStickers: number;
  status: "ACTIVE" | "COMPLETED";
};

type LoyaltySettings = {
  id: string;
  stickersPerTransaction: number;
  fiveStickerReward: string;
  tenStickerReward: string;
};

type Activity = {
  id: string;
  customerName: string;
  message: string;
  createdAt: string;
};

export default function AdminLoyaltyCardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [cards, setCards] = useState<LoyaltyCard[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [settings, setSettings] = useState<LoyaltySettings | null>(null);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [editOpen, setEditOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [selectedCard, setSelectedCard] = useState<LoyaltyCard | null>(null);
  const [editStickers, setEditStickers] = useState(0);
  const [editStatus, setEditStatus] = useState<"ACTIVE" | "COMPLETED">("ACTIVE");

  const [stickersPerTransaction, setStickersPerTransaction] = useState(1);
  const [fiveStickerReward, setFiveStickerReward] = useState("50% Off");
  const [tenStickerReward, setTenStickerReward] = useState("100% Off");

  const loadCards = async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/admin/loyaltyCard", {
        cache: "no-store",
      });

      if (res.status === 403) {
        router.push("/unauthorized");
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load loyalty cards");
      }

      setCards(data.cards || []);
      setActivities(data.activities || []);
      setSettings(data.settings);

      if (data.settings) {
        setStickersPerTransaction(data.settings.stickersPerTransaction);
        setFiveStickerReward(data.settings.fiveStickerReward);
        setTenStickerReward(data.settings.tenStickerReward);
      }
    } catch (error) {
      console.error(error);
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

    if (!["OWNER", "RECEPTIONIST"].includes(session.user.role)) {
      router.push("/unauthorized");
      return;
    }

    loadCards();
  }, [session, status]);

  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      const value = search.toLowerCase();

      return (
        card.cardNumber.toLowerCase().includes(value) ||
        card.customerId.toLowerCase().includes(value) ||
        card.name.toLowerCase().includes(value) ||
        card.status.toLowerCase().includes(value)
      );
    });
  }, [cards, search]);

  const openEdit = (card: LoyaltyCard) => {
    setSelectedCard(card);
    setEditStickers(card.stickers);
    setEditStatus(card.status);
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!selectedCard) return;

    try {
      const res = await fetch(`/api/admin/loyaltyCard/${selectedCard.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stars: editStickers,
          status: editStatus,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update loyalty card");
      }

      setEditOpen(false);
      setSelectedCard(null);
      await loadCards();
    } catch (error) {
      console.error(error);
    }
  };

  const saveSettings = async () => {
    try {
      const res = await fetch("/api/admin/loyaltyCard", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stickersPerTransaction,
          fiveStickerReward,
          tenStickerReward,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save settings");
      }

      setSettingsOpen(false);
      await loadCards();
    } catch (error) {
      console.error(error);
    }
  };

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

  return (
    <Box sx={{ p: 4, bgcolor: "#fff", minHeight: "100vh" }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography sx={{ fontSize: 34, fontWeight: 900 }}>
          Loyalty Card
        </Typography>

        <IconButton onClick={() => setSettingsOpen(true)}>
          <SettingsIcon sx={{ fontSize: 32, color: "#111" }} />
        </IconButton>
      </Box>

      <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
        <TextField
          size="small"
          placeholder="Search Card"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{
            width: 320,
            "& .MuiOutlinedInput-root": {
              borderRadius: 2,
              bgcolor: "#fff",
            },
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />

        <Button
          variant="outlined"
          startIcon={<FilterListIcon />}
          sx={{
            color: "#777",
            borderColor: "#ddd",
            textTransform: "none",
            borderRadius: 2,
          }}
        >
          Filter
        </Button>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 3 }}>
        <Paper
          elevation={0}
          sx={{
            border: "1px solid #ddd",
            borderRadius: 2,
            overflow: "hidden",
            minHeight: 520,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 2fr 1fr 1fr 1fr",
              px: 2,
              py: 1.5,
              borderBottom: "1px solid #ddd",
              fontWeight: 800,
              color: "#666",
            }}
          >
            <Typography sx={{ fontWeight: 800 }}>Card #</Typography>
            <Typography sx={{ fontWeight: 800 }}>ID</Typography>
            <Typography sx={{ fontWeight: 800 }}>Name</Typography>
            <Typography sx={{ fontWeight: 800 }}>Stickers</Typography>
            <Typography sx={{ fontWeight: 800 }}>Status</Typography>
            <Typography sx={{ fontWeight: 800 }}>Action</Typography>
          </Box>

          {filteredCards.map((card) => (
            <Box
              key={card.id}
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 2fr 1fr 1fr 1fr",
                px: 2,
                py: 1.4,
                borderBottom: "1px solid #eee",
                alignItems: "center",
              }}
            >
              <Typography sx={{ fontWeight: 800, color: "#777" }}>
                {card.cardNumber}
              </Typography>

              <Typography sx={{ fontWeight: 800, color: "#777" }}>
                {card.customerId}
              </Typography>

              <Typography sx={{ fontWeight: 800, color: "#777" }}>
                {card.name}
              </Typography>

              <Typography sx={{ fontWeight: 900 }}>
                {card.stickers}/{card.maxStickers}
              </Typography>

              <Typography sx={{ fontWeight: 900 }}>
                {card.status === "COMPLETED" ? "Completed" : "Active"}
              </Typography>

              <IconButton
                onClick={() => openEdit(card)}
                sx={{
                  width: 30,
                  height: 30,
                  bgcolor: "#ddd",
                  "&:hover": { bgcolor: "#ccc" },
                }}
              >
                <EditIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>
          ))}

          <Box sx={{ flex: 1 }} />

          <Box
            sx={{
              p: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: "1px solid #eee",
            }}
          >
            <Typography>
              Showing 1 to {filteredCards.length} of {filteredCards.length} Entries
            </Typography>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <IconButton size="small" sx={{ bgcolor: "#ddd" }}>
                <ChevronLeftIcon />
              </IconButton>

              <Box
                sx={{
                  bgcolor: "#ffc400",
                  width: 28,
                  height: 28,
                  borderRadius: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                }}
              >
                1
              </Box>

              <IconButton size="small" sx={{ bgcolor: "#ddd" }}>
                <ChevronRightIcon />
              </IconButton>
            </Box>
          </Box>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            border: "1px solid #ddd",
            borderRadius: 2,
            p: 3,
            minHeight: 520,
          }}
        >
          <Typography sx={{ fontWeight: 900, mb: 3 }}>
            Recent Activity
          </Typography>

          {activities.map((activity) => (
            <Box
              key={activity.id}
              sx={{
                display: "flex",
                gap: 1.5,
                mb: 2,
                alignItems: "flex-start",
              }}
            >
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: 1,
                  bgcolor: "#ffe8a3",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <LoyaltyIcon sx={{ fontSize: 17, color: "#d6a100" }} />
              </Box>

              <Box>
                <Typography sx={{ fontWeight: 900, fontSize: 13 }}>
                  {activity.customerName}
                </Typography>

                <Typography sx={{ fontSize: 12 }}>
                  {activity.message}
                </Typography>

                <Typography sx={{ fontSize: 11, color: "#777" }}>
                  {new Date(activity.createdAt).toLocaleString()}
                </Typography>
              </Box>
            </Box>
          ))}
        </Paper>
      </Box>

      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 0,
              bgcolor: "#f3f3f3",
              p: 2,
            },
          },
        }}
      >
        <Box sx={{ p: 3 }}>
          <Typography sx={{ fontSize: 26, fontWeight: 900, mb: 3 }}>
            Edit Loyalty Card
          </Typography>

          <Typography sx={{ fontWeight: 700, mb: 0.5 }}>Card #</Typography>
          <TextField
            fullWidth
            disabled
            value={selectedCard?.cardNumber || ""}
            sx={{ mb: 2, bgcolor: "#fff" }}
          />

          <Typography sx={{ fontWeight: 700, mb: 0.5 }}>ID</Typography>
          <TextField
            fullWidth
            disabled
            value={selectedCard?.customerId || ""}
            sx={{ mb: 2, bgcolor: "#fff" }}
          />

          <Typography sx={{ fontWeight: 700, mb: 0.5 }}>Name</Typography>
          <TextField
            fullWidth
            disabled
            value={selectedCard?.name || ""}
            sx={{ mb: 2, bgcolor: "#fff" }}
          />

          <Typography sx={{ fontWeight: 700, mb: 0.5 }}>
            Stickers <Box component="span" sx={{ color: "red" }}>*</Box>
          </Typography>

          <TextField
            select
            fullWidth
            value={editStickers}
            onChange={(e) => setEditStickers(Number(e.target.value))}
            sx={{ mb: 2, bgcolor: "#fff" }}
          >
            {[...Array(11)].map((_, index) => (
              <MenuItem key={index} value={index}>
                {index}/10
              </MenuItem>
            ))}
          </TextField>

          <Typography sx={{ fontWeight: 700, mb: 0.5 }}>Status</Typography>

          <TextField
            select
            fullWidth
            value={editStatus}
            onChange={(e) =>
              setEditStatus(e.target.value as "ACTIVE" | "COMPLETED")
            }
            sx={{ mb: 7, bgcolor: "#fff" }}
          >
            <MenuItem value="ACTIVE">Active</MenuItem>
            <MenuItem value="COMPLETED">Completed</MenuItem>
          </TextField>

          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <Button
              onClick={saveEdit}
              sx={{
                bgcolor: "#000",
                color: "#ffc400",
                width: 160,
                py: 1.5,
                textTransform: "none",
                "&:hover": { bgcolor: "#111" },
              }}
            >
              Save
            </Button>
          </Box>
        </Box>
      </Dialog>

      <Dialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 0,
              bgcolor: "#f3f3f3",
              p: 2,
            },
          },
        }}
      >
        <Box sx={{ p: 3, position: "relative" }}>
          <IconButton
            onClick={() => setSettingsOpen(false)}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>

          <Typography sx={{ fontSize: 26, fontWeight: 900, mb: 3 }}>
            Loyalty Card Settings
          </Typography>

          <Typography sx={{ fontWeight: 700, mb: 0.5 }}>
            Stickers Per Transaction <Box component="span" sx={{ color: "red" }}>*</Box>
          </Typography>

          <TextField
            select
            fullWidth
            value={stickersPerTransaction}
            onChange={(e) => setStickersPerTransaction(Number(e.target.value))}
            sx={{ mb: 2, bgcolor: "#fff" }}
          >
            <MenuItem value={1}>1 Sticker</MenuItem>
            <MenuItem value={2}>2 Stickers</MenuItem>
            <MenuItem value={3}>3 Stickers</MenuItem>
          </TextField>

          <Typography sx={{ fontWeight: 700, mb: 0.5 }}>
            5 Stickers Reward <Box component="span" sx={{ color: "red" }}>*</Box>
          </Typography>

          <TextField
            select
            fullWidth
            value={fiveStickerReward}
            onChange={(e) => setFiveStickerReward(e.target.value)}
            sx={{ mb: 2, bgcolor: "#fff" }}
          >
            <MenuItem value="50% Off">50% Off</MenuItem>
            <MenuItem value="Free Add-on">Free Add-on</MenuItem>
          </TextField>

          <Typography sx={{ fontWeight: 700, mb: 0.5 }}>
            10 Stickers Reward <Box component="span" sx={{ color: "red" }}>*</Box>
          </Typography>

          <TextField
            select
            fullWidth
            value={tenStickerReward}
            onChange={(e) => setTenStickerReward(e.target.value)}
            sx={{ mb: 5, bgcolor: "#fff" }}
          >
            <MenuItem value="100% Off">100% Off</MenuItem>
            <MenuItem value="Free Service">Free Service</MenuItem>
          </TextField>

          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <Button
              onClick={saveSettings}
              sx={{
                bgcolor: "#000",
                color: "#ffc400",
                width: 160,
                py: 1.5,
                textTransform: "none",
                "&:hover": { bgcolor: "#111" },
              }}
            >
              Save
            </Button>
          </Box>
        </Box>
      </Dialog>
    </Box>
  );
}
