"use client";

import { createClient } from "@/lib/supabase/client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";

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

import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/Edit";
import SettingsIcon from "@mui/icons-material/Settings";
import CloseIcon from "@mui/icons-material/Close";
import LoyaltyIcon from "@mui/icons-material/Loyalty";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";

type LoyaltyCard = {
  id: string;
  cardNumber: string;
  customerId: string;
  customerCode: string;
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
  fiftyPercentStickerThreshold: number;
  freeStickerThreshold: number;
};

type RewardOption = { id: string; name: string; value: number; };

type Activity = {
  id: string;
  customerName: string;
  message: string;
  createdAt: string;
  type: "EARNED" | "REDEEMED" | "ADJUSTED" | "OTHER";
};

export default function AdminLoyaltyCardPage() {
  const router = useRouter();
  const supabase = createClient();
  const queryClient = useQueryClient();

  const [processedSearch, setProcessedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [activityFilter, setActivityFilter] = useState("ALL");

  const [editOpen, setEditOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addRewardOpen, setAddRewardOpen] = useState(false);
  const [rewardName, setRewardName] = useState("");
  const [rewardValue, setRewardValue] = useState("");

  const [selectedCard, setSelectedCard] = useState<LoyaltyCard | null>(null);
  const [draftStickers, setDraftStickers] = useState(0);
  const [originalStickers, setOriginalStickers] = useState(0);
  const [originalStatus, setOriginalStatus] = useState<"ACTIVE" | "COMPLETED">("ACTIVE");
  const [discardOpen, setDiscardOpen] = useState(false);
  const [editError, setEditError] = useState("");
  const [editStatus, setEditStatus] = useState<"ACTIVE" | "COMPLETED">(
    "ACTIVE"
  );

  const [stickersPerTransaction, setStickersPerTransaction] = useState(1);
  const [fiveStickerReward, setFiveStickerReward] = useState("50% Off");
  const [tenStickerReward, setTenStickerReward] = useState("100% Off");
  const [fiftyPercentStickerThreshold, setFiftyPercentStickerThreshold] =
    useState(5);
  const [freeStickerThreshold, setFreeStickerThreshold] = useState(10);

  const { data: loyaltyData, isLoading: loading } = useQuery<{
    cards: LoyaltyCard[];
    activities: Activity[];
    settings: LoyaltySettings | null;
      rewardOptions: RewardOption[];
  }>({
    queryKey: ["adminLoyaltyCards", activityFilter],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        throw new Error("Not authenticated");
      }

      const res = await fetch(`/api/admin/loyaltyCard${activityFilter === "ALL" ? "" : `?activityType=${activityFilter}`}`, {
        cache: "no-store",
      });

      if (res.status === 403) {
        router.push("/unauthorized");
        throw new Error("Unauthorized");
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load loyalty cards");
      }

      return {
        cards: data.cards || [],
        activities: data.activities || [],
        settings: data.settings || null,
        rewardOptions: data.rewardOptions || [],
      };
    },
    refetchInterval: 5000,
    refetchOnWindowFocus: false,
  });

  const cards = useMemo(() => loyaltyData?.cards || [], [loyaltyData?.cards]);
  const activities = loyaltyData?.activities || [];
  const settings = loyaltyData?.settings || null;
  const rewardOptions = loyaltyData?.rewardOptions || [];

  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      const value = processedSearch.toLowerCase();

      const matchesSearch =
        card.cardNumber.toLowerCase().includes(value) ||
        card.customerCode.toLowerCase().includes(value) ||
        card.name.toLowerCase().includes(value) ||
        card.status.toLowerCase().includes(value);

      const matchesStatus =
        statusFilter === "ALL" || card.status.toUpperCase() === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [cards, processedSearch, statusFilter]);

  const openEdit = (card: LoyaltyCard) => {
    setSelectedCard(card);
    setDraftStickers(card.stickers);
    setOriginalStickers(card.stickers);
    setEditStatus(card.status);
    setOriginalStatus(card.status);
    setEditError("");
    setEditOpen(true);
  };

  const hasUnsavedEditChanges = draftStickers !== originalStickers || editStatus !== originalStatus;

  const closeEdit = () => {
    setEditOpen(false);
    setDiscardOpen(false);
    setSelectedCard(null);
    setEditError("");
  };

  const requestCloseEdit = () => {
    if (hasUnsavedEditChanges) setDiscardOpen(true);
    else closeEdit();
  };

  const openSettings = () => {
    if (settings) {
      setStickersPerTransaction(settings.stickersPerTransaction);
      setFiveStickerReward(settings.fiveStickerReward);
      setTenStickerReward(settings.tenStickerReward);
      setFiftyPercentStickerThreshold(
        settings.fiftyPercentStickerThreshold || 5
      );
      setFreeStickerThreshold(settings.freeStickerThreshold || 10);
    }

    setSettingsOpen(true);
  };

  const saveEdit = async () => {
    if (!selectedCard) return;
    setEditError("");

    try {
      const res = await fetch(`/api/admin/loyaltyCard/${selectedCard.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: editStatus, stars: draftStickers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update loyalty card");

      const updated = { ...selectedCard, stickers: data.card.stars, maxStickers: data.maximum, status: data.card.status };
      queryClient.setQueryData(["adminLoyaltyCards", activityFilter], (previous: typeof loyaltyData) => previous ? {
        ...previous,
        cards: previous.cards.map((card) => card.id === updated.id ? updated : card),
      } : previous);
      setOriginalStickers(updated.stickers);
      setOriginalStatus(updated.status);
      closeEdit();
      queryClient.invalidateQueries({ queryKey: ["adminLoyaltyCards"] });
    } catch (error) {
      setEditError(error instanceof Error ? error.message : "Failed to update loyalty card");
    }
  };
  const saveSettings = async () => {
    try {
      if (
        !Number.isInteger(fiftyPercentStickerThreshold) ||
        !Number.isInteger(freeStickerThreshold) ||
        fiftyPercentStickerThreshold < 1 ||
        freeStickerThreshold <= fiftyPercentStickerThreshold
      ) {
        throw new Error(
          "Second reward sticker count must be higher than the first reward count."
        );
      }

      const res = await fetch(`/api/admin/loyaltyCard${activityFilter === "ALL" ? "" : `?activityType=${activityFilter}`}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stickersPerTransaction,
          fiveStickerReward,
          tenStickerReward,
          fiftyPercentStickerThreshold,
          freeStickerThreshold,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save settings");
      }

      setSettingsOpen(false);
      queryClient.invalidateQueries({ queryKey: ["adminLoyaltyCards"] });
    } catch (error) {
      console.error("SAVE LOYALTY SETTINGS ERROR:", error);
    }
  };

  const adjustDraftStickers = (delta: number) => {
    if (!selectedCard) return;
    setDraftStickers((current) => Math.max(0, Math.min(selectedCard.maxStickers, current + delta)));
  };
  const addReward = async () => {
    const res = await fetch("/api/admin/loyaltyCard/rewards", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: rewardName, value: Number(rewardValue) }) });
    if (!res.ok) { console.error((await res.json()).error); return; }
    setAddRewardOpen(false); setRewardName(""); setRewardValue("");
    queryClient.invalidateQueries({ queryKey: ["adminLoyaltyCards"] });
  };
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

        <IconButton onClick={openSettings}>
          <SettingsIcon sx={{ fontSize: 32, color: "#111" }} />
        </IconButton>
      </Box>

      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <TextField
          size="small"
          placeholder="Search loyalty cards..."
          value={processedSearch}
          onChange={(e) => setProcessedSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "#999" }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{ flex: 1, maxWidth: 320 }}
        />

        <TextField
          select
          size="small"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          sx={{ width: 170, bgcolor: "#fff" }}
        >
          <MenuItem value="ALL">All Status</MenuItem>
          <MenuItem value="ACTIVE">Active</MenuItem>
          <MenuItem value="COMPLETED">Completed</MenuItem>
        </TextField>
      </Box>

      <Box sx={{display: "grid", gridTemplateColumns: {xs: "1fr", lg: "minmax(0,1fr) 320px",}, gap: 2, alignItems: "start",}}>
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
              gridTemplateColumns: "140px 140px minmax(180px,1fr) 90px 100px 60px",
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
            <Typography sx={{ fontWeight: 800, textAlign: "center", }}>Action</Typography>
          </Box>

          {filteredCards.length === 0 ? (
            <Box sx={{ p: 3, textAlign: "center" }}>
              <Typography sx={{ color: "text.secondary" }}>
                No loyalty cards found.
              </Typography>
            </Box>
          ) : (
            filteredCards.map((card) => (
              <Box
                key={card.id}
                sx={{
                  display: "grid",
                  gridTemplateColumns: "140px 140px minmax(180px,1fr) 90px 100px 60px",
                  px: 3,
                  py: 1.4,
                  borderBottom: "1px solid #eee",
                  alignItems: "center",
                  "&:hover": { bgcolor: "#fafafa" },
                }}
              >
                <Typography sx={{fontWeight: 800, color: "#777", lineHeight: 1.25, wordBreak: "break-word",}}>
                  {card.cardNumber}
                </Typography>

                <Typography sx={{fontWeight: 800,color: "#777",lineHeight: 1.25,wordBreak: "break-word",}}>
                  {card.customerCode}
                </Typography>

                <Typography sx={{ fontWeight: 800, color: "#777" }}>
                  {card.name}
                </Typography>

                <Typography sx={{ fontWeight: 900 }}>
                  {card.stickers}/{card.maxStickers}
                </Typography>

                <Typography
                  sx={{
                    fontWeight: 900,
                    color: card.status === "COMPLETED" ? "green" : "#2563eb",
                  }}
                >
                  {card.status === "COMPLETED" ? "Completed" : "Active"}
                </Typography>

                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <IconButton
                    onClick={() => openEdit(card)}
                    sx={{
                      width: 34,
                      height: 34,
                      bgcolor: "#ddd",
                      "&:hover": {
                        bgcolor: "#ccc",
                      },
                    }}
                  >
                    <EditIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Box>
              </Box>
            ))
          )}

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
              Showing 1 to {filteredCards.length} of {filteredCards.length}{" "}
              Entries
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
            p: 2.5,
            minHeight: 520,
            width: "100%",
            overflowY: "auto",
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}><Typography sx={{ fontWeight: 900 }}>Recent Activity</Typography><TextField select size="small" value={activityFilter} onChange={(e) => setActivityFilter(e.target.value)} sx={{ width: 150, bgcolor: "#fff" }}><MenuItem value="ALL">All Activity</MenuItem><MenuItem value="EARNED">Earned Stickers</MenuItem><MenuItem value="REDEEMED">Redeemed Stickers</MenuItem></TextField></Box>

          {activities.length === 0 ? (
            <Typography sx={{ color: "text.secondary", fontSize: 13 }}>
              No recent activity.
            </Typography>
          ) : (
            activities.map((activity) => (
              <Box
                key={activity.id}
                sx={{
                  display: "flex",
                  gap: 1.25,
                  mb: 2.5,
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
            ))
          )}
        </Paper>
      </Box>

      <Dialog
        open={editOpen}
        onClose={requestCloseEdit}
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
          <IconButton onClick={requestCloseEdit} sx={{ position: "absolute", right: 8, top: 8 }}><CloseIcon /></IconButton>
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
            value={selectedCard?.customerCode || ""}
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
            Stickers
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}><IconButton onClick={() => adjustDraftStickers(-1)} disabled={!selectedCard || draftStickers <= 0} sx={{ bgcolor: "#fff" }}><RemoveIcon /></IconButton><Box sx={{ flex: 1, textAlign: "center", py: 1.5, bgcolor: "#fff", border: "1px solid #ddd", fontWeight: 900 }}>{selectedCard ? `${draftStickers}/${selectedCard.maxStickers}` : ""}</Box><IconButton onClick={() => adjustDraftStickers(1)} disabled={!selectedCard || draftStickers >= selectedCard.maxStickers} sx={{ bgcolor: "#fff" }}><AddIcon /></IconButton></Box>

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

          {editError && (<Typography sx={{ color: "error.main", mb: 2 }}>{editError}</Typography>)}
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

      <Dialog open={discardOpen} onClose={() => setDiscardOpen(false)} maxWidth="xs" fullWidth>
        <Box sx={{ p: 3, bgcolor: "#f3f3f3" }}>
          <Typography sx={{ fontSize: 22, fontWeight: 900, mb: 1 }}>Unsaved Changes</Typography>
          <Typography sx={{ mb: 3 }}>You have unsaved changes. Are you sure you want to discard them?</Typography>
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
            <Button onClick={() => setDiscardOpen(false)} sx={{ color: "#111" }}>Cancel</Button>
            <Button onClick={closeEdit} sx={{ bgcolor: "#000", color: "#ffc400" }}>Discard</Button>
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
            Stickers Per Transaction{" "}
            <Box component="span" sx={{ color: "red" }}>
              *
            </Box>
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

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 120px",
              gap: 1.5,
              mb: 2,
            }}
          >
            <Box>
              <Typography sx={{ fontWeight: 700, mb: 0.5 }}>
                First Reward{" "}
                <Box component="span" sx={{ color: "red" }}>
                  *
                </Box>
              </Typography>

              <TextField
                select
                fullWidth
                value={fiveStickerReward}
                onChange={(e) => setFiveStickerReward(e.target.value)}
                sx={{ bgcolor: "#fff" }}
              >
                {rewardOptions.map((option) => <MenuItem key={option.id} value={option.name}>{option.name}</MenuItem>)}
              </TextField>
            </Box>

            <Box>
              <Typography sx={{ fontWeight: 700, mb: 0.5 }}>
                Eligible At
              </Typography>

              <TextField
                fullWidth
                type="number"
                value={fiftyPercentStickerThreshold}
                onChange={(e) =>
                  setFiftyPercentStickerThreshold(Number(e.target.value))
                }
                slotProps={{
                  htmlInput: {
                    min: 1,
                    max: 99,
                    step: 1,
                  },
                }}
                sx={{ bgcolor: "#fff" }}
              />
            </Box>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 120px",
              gap: 1.5,
              mb: 2,
            }}
          >
            <Box>
              <Typography sx={{ fontWeight: 700, mb: 0.5 }}>
                Second Reward{" "}
                <Box component="span" sx={{ color: "red" }}>
                  *
                </Box>
              </Typography>

              <TextField
                select
                fullWidth
                value={tenStickerReward}
                onChange={(e) => setTenStickerReward(e.target.value)}
                sx={{ bgcolor: "#fff" }}
              >
                {rewardOptions.map((option) => <MenuItem key={option.id} value={option.name}>{option.name}</MenuItem>)}
              </TextField>
            </Box>

            <Box>
              <Typography sx={{ fontWeight: 700, mb: 0.5 }}>
                Eligible At
              </Typography>

              <TextField
                fullWidth
                type="number"
                value={freeStickerThreshold}
                onChange={(e) => setFreeStickerThreshold(Number(e.target.value))}
                slotProps={{
                  htmlInput: {
                    min: 2,
                    max: 100,
                    step: 1,
                  },
                }}
                sx={{ bgcolor: "#fff" }}
              />
            </Box>
          </Box>

          <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}><Button onClick={() => setAddRewardOpen(true)} sx={{ color: "#111", textTransform: "none", fontWeight: 800 }}>+ Add Reward</Button></Box>
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

      <Dialog open={addRewardOpen} onClose={() => setAddRewardOpen(false)} maxWidth="xs" fullWidth>
        <Box sx={{ p: 3, bgcolor: "#f3f3f3" }}>
          <Typography sx={{ fontSize: 22, fontWeight: 900, mb: 2 }}>Add Reward</Typography>
          <TextField fullWidth label="Reward Name" value={rewardName} onChange={(e) => setRewardName(e.target.value)} sx={{ mb: 2, bgcolor: "#fff" }} />
          <TextField fullWidth type="number" label="Discount / Reward Value" value={rewardValue} onChange={(e) => setRewardValue(e.target.value)} slotProps={{ htmlInput: { min: 1, max: 100 } }} sx={{ mb: 2, bgcolor: "#fff" }} />
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}><Button onClick={() => setAddRewardOpen(false)}>Cancel</Button><Button onClick={addReward} sx={{ bgcolor: "#000", color: "#ffc400" }}>Add</Button></Box>
        </Box>
      </Dialog>
    </Box>
  );
}
