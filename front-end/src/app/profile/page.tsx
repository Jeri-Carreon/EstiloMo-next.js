'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Stack from "@mui/material/Stack";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [fullName, setFullName] = useState("");
  const [savedProfile, setSavedProfile] = useState({
    firstName: "",
    lastName: "",
    email: "",
    mobileNumber: "",
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      const loadProfile = async () => {
        setLoading(true);
        try {
          const res = await fetch("/api/profile");
          if (!res.ok) {
            const data = await res.json();
            setError(data.error || "Failed to load profile");
            setLoading(false);
            return;
          }

          const data = await res.json();
          const user = data.user;
          const first = user.firstName || (user.name ? user.name.split(" ")[0] : "");
          const last = user.lastName || (user.name ? user.name.split(" ").slice(1).join(" ") : "");

          setFirstName(first);
          setLastName(last);
          setEmail(user.email || "");
          setFullName(`${first} ${last}`.trim() || user.email || "User");
          setMobileNumber(user.mobileNumber || "");
          setSavedProfile({
            firstName: first,
            lastName: last,
            email: user.email || "",
            mobileNumber: user.mobileNumber || "",
          });
          setLoading(false);
        } catch (err) {
          setError("Unable to load profile information");
          setLoading(false);
        }
      };

      loadProfile();
    }
  }, [status]);

  const handleSave = async () => {
    try {
      setError("");
      setSuccess("");
      setLoading(true);

      const res = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          mobileNumber,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to update profile");
        setLoading(false);
        return;
      }

      const data = await res.json();
      const user = data.user;
      setSavedProfile({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        mobileNumber: user.mobileNumber || "",
      });
      setFullName(`${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email || "User");
      setEmail(user.email || "");
      setSuccess("Profile updated successfully!");
      setIsEditing(false);
      setLoading(false);
    } catch (err) {
      setError("An error occurred while updating your profile");
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFirstName(savedProfile.firstName);
    setLastName(savedProfile.lastName);
    setEmail(savedProfile.email);
    setMobileNumber(savedProfile.mobileNumber);
    setError("");
    setIsEditing(false);
  };

  if (status === "loading" || loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!session?.user) {
    return null;
  }

  return (
    <>
      <Navbar />
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          {/* Main Content */}
          <Box sx={{ flex: 1, maxWidth: 720 }}>
            <Paper
              sx={{
                p: 3,
                border: "1px solid #ddd",
                backgroundColor: "#fff",
              }}
            >
              {/* Profile Header */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  mb: 4,
                  pb: 3,
                  borderBottom: "1px solid #eee",
                }}
              >
                <Box>
                  <Box sx={{ fontSize: 18, fontFamily: 'var(--font-nunito-sans)', fontWeight: 700, color: "#111" }}>
                    {fullName || "User"}
                  </Box>
                  <Box sx={{ fontSize: 13, fontFamily: 'var(--font-nunito-sans)',  color: "#888", mt: 0.5 }}>
                    {email}
                  </Box>
                </Box>
                <Button
                  variant="contained"
                  onClick={() => {
                    if (isEditing) {
                      handleCancel();
                    } else {
                      setIsEditing(true);
                    }
                  }}
                  sx={{
                    backgroundColor: isEditing ? "#ff9800" : "#e0e0e0",
                    color: "#111",
                    fontFamily: 'var(--font-nunito-sans)',
                    textTransform: "none",
                    fontSize: 13,
                    fontWeight: 600,
                    "&:hover": {
                      backgroundColor: isEditing ? "#e68900" : "#d0d0d0",
                    },
                  }}
                >
                  {isEditing ? "Cancel" : "Edit"}
                </Button>
              </Box>

              {/* Alerts */}
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              {success && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {success}
                </Alert>
              )}

              {/* Form Fields */}
              <Stack spacing={3}>
                <Box>
                  <Box sx={{ fontSize: 13, fontFamily: 'var(--font-nunito-sans)', fontWeight: 600, mb: 1, color: "#333" }}>
                    First Name
                  </Box>
                  <TextField
                    fullWidth
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    variant="outlined"
                    disabled={!isEditing}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        backgroundColor: isEditing ? "#fff" : "#e8e8e8",
                      },
                      "& .MuiOutlinedInput-input": {
                        color: "#000",
                      },
                      "& .MuiInputBase-input": {
                        color: "#000",
                      },
                    }}
                  />
                </Box>

                <Box>
                  <Box sx={{ fontSize: 13, fontFamily: 'var(--font-nunito-sans)', fontWeight: 600, mb: 1, color: "#333" }}>
                    Last Name
                  </Box>
                  <TextField
                    fullWidth
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    variant="outlined"
                    disabled={!isEditing}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        backgroundColor: isEditing ? "#fff" : "#e8e8e8",
                      },
                      "& .MuiOutlinedInput-input": {
                        color: "#000",
                      },
                      "& .MuiInputBase-input": {
                        color: "#000",
                      },
                    }}
                  />
                </Box>

                <Box>
                  <Box sx={{ fontSize: 13, fontFamily: 'var(--font-nunito-sans)', fontWeight: 600, mb: 1, color: "#333" }}>
                    Mobile Number
                  </Box>
                  <TextField
                    fullWidth
                    placeholder="(000) 000000"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    variant="outlined"
                    disabled={!isEditing}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        backgroundColor: isEditing ? "#fff" : "#e8e8e8",
                      },
                      "& .MuiOutlinedInput-input": {
                        color: "#000",
                      },
                      "& .MuiInputBase-input": {
                        color: "#000",
                      },
                    }}
                  />
                </Box>

                <Box>
                  <Box sx={{ fontSize: 14, fontFamily: 'var(--font-nunito-sans)', fontWeight: 600, mb: 2, color: "#333" }}>
                    Email Address
                  </Box>
                  <TextField
                    fullWidth
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    variant="outlined"
                    disabled
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        backgroundColor: isEditing ? "#fff" : "#e8e8e8",
                      },
                      "& .MuiOutlinedInput-input": {
                        color: "#000",
                      },
                      "& .MuiInputBase-input": {
                        color: "#000",
                      },
                    }}
                  />
                </Box>

                {isEditing && (
                  <Box sx={{ display: "flex", gap: 2, mt: 4 }}>
                    <Button
                      variant="contained"
                      onClick={handleSave}
                      disabled={loading}
                      sx={{
                        backgroundColor: "#4CAF50",
                        color: "#fff",
                        textTransform: "none",
                        fontFamily: 'var(--font-nunito-sans)',
                        fontSize: 13,
                        fontWeight: 600,
                        "&:hover": { backgroundColor: "#45a049" },
                      }}
                    >
                      {loading ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={handleCancel}
                      disabled={loading}
                      sx={{
                        border: "1px solid #ddd",
                        color: "#666",
                        textTransform: "none",
                        fontFamily: 'var(--font-nunito-sans)',
                        fontSize: 13,
                        fontWeight: 600,
                        "&:hover": { backgroundColor: "#f9f9f9" },
                      }}
                    >
                      Discard
                    </Button>
                  </Box>
                )}
              </Stack>
            </Paper>
          </Box>
        </Box>
      </Container>
      <Footer />
    </>
  );
}
