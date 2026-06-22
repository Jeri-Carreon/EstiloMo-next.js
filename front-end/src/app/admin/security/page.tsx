"use client";

import { useEffect, useState } from "react";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";

import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

type SecurityLog = {
  id: string;
  userName: string | null;
  section: string;
  action: string;
  createdAt: string;
};

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function SecurityPage() {
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [loading, setLoading] = useState(true);

  async function loadLogs() {
    try {
      setLoading(true);

      const res = await fetch(
        `/api/admin/security?search=${encodeURIComponent(search)}&page=${page}`
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load security logs");
      }

      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error("LOAD SECURITY LOGS ERROR:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadLogs();
    }, 300);

    return () => clearTimeout(timeout);
  }, [search, page]);

  const start = total === 0 ? 0 : (page - 1) * 5 + 1;
  const end = Math.min(page * 5, total);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#fff",
        px: "62px",
        py: "46px",
        position: "relative",
      }}
    >
      <Typography
        sx={{
          fontSize: "32px",
          fontWeight: 800,
          color: "#111",
          mb: "6px",
        }}
      >
        Security Logs
      </Typography>

      <Box sx={{ display: "flex", gap: 1.5, mb: 3.5 }}>
        <TextField
        size="small"
        placeholder="Search action..."
        value={search}
        onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
        }}
        sx={{
            width: 360,
            "& .MuiOutlinedInput-root": {
            height: 38,
            borderRadius: "8px",
            bgcolor: "#fff",
            },
        }}
        slotProps={{
            input: {
            startAdornment: (
                <InputAdornment position="start">
                <SearchIcon sx={{ color: "#999" }} />
                </InputAdornment>
            ),
            },
        }}
        />

        <Button
          variant="outlined"
          startIcon={<FilterListIcon />}
          sx={{
            height: 38,
            px: 2,
            borderRadius: "8px",
            borderColor: "#e0e0e0",
            color: "#888",
            bgcolor: "#fff",
            textTransform: "none",
            fontWeight: 600,
          }}
        >
          Filter
        </Button>
      </Box>

      <Box>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "170px 150px 150px 180px 1fr",
            py: 1.5,
            borderBottom: "1px solid #e5e5e5",
          }}
        >
          {["Date", "Time", "User", "Section", "Action"].map((item) => (
            <Typography
              key={item}
              sx={{
                fontSize: 14,
                fontWeight: 800,
                color: "#555",
              }}
            >
              {item}
            </Typography>
          ))}
        </Box>

        {loading ? (
          <Box sx={{ py: 8, textAlign: "center" }}>
            <CircularProgress size={28} />
          </Box>
        ) : logs.length === 0 ? (
          <Typography sx={{ py: 4, color: "#777" }}>
            No security logs found.
          </Typography>
        ) : (
          logs.map((log) => (
            <Box
              key={log.id}
              sx={{
                display: "grid",
                gridTemplateColumns: "170px 150px 150px 180px 1fr",
                py: 2,
                borderBottom: "1px solid #e5e5e5",
              }}
            >
              <Typography sx={{ fontSize: 14, color: "#777", fontWeight: 600 }}>
                {formatDate(log.createdAt)}
              </Typography>

              <Typography sx={{ fontSize: 14, color: "#777", fontWeight: 600 }}>
                {formatTime(log.createdAt)}
              </Typography>

              <Typography sx={{ fontSize: 14, color: "#222", fontWeight: 700 }}>
                {log.userName || "Unknown"}
              </Typography>

              <Typography sx={{ fontSize: 14, color: "#222", fontWeight: 700 }}>
                {log.section}
              </Typography>

              <Typography sx={{ fontSize: 14, color: "#222", fontWeight: 600 }}>
                {log.action}
              </Typography>
            </Box>
          ))
        )}
      </Box>

      <Box
        sx={{
          position: "fixed",
          left: 270,
          right: 70,
          bottom: 58,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography sx={{ fontSize: 18, color: "#111", fontWeight: 500 }}>
          Showing {start} to {end} of {total} Entries
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <IconButton
            disabled={page <= 1}
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            sx={{
              bgcolor: "#e0e0e0",
              width: 32,
              height: 32,
              "&:hover": { bgcolor: "#d5d5d5" },
            }}
          >
            <ChevronLeftIcon />
          </IconButton>

          <Box
            sx={{
              width: 30,
              height: 32,
              borderRadius: "8px",
              bgcolor: "#f7b500",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              color: "#111",
            }}
          >
            {page}
          </Box>

          <IconButton
            disabled={page >= totalPages}
            onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
            sx={{
              bgcolor: "#e0e0e0",
              width: 32,
              height: 32,
              "&:hover": { bgcolor: "#d5d5d5" },
            }}
          >
            <ChevronRightIcon />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
}