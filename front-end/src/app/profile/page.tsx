import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Stack from "@mui/material/Stack";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default async function ProfilePage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect("/login");
  }

  const user = session.user;

  return (
    <>
      <Navbar />
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box sx={{ display: "flex", gap: 4 }}>
          {/* Main Content */}
          <Box sx={{ flex: 1 }}>
            <Paper
              sx={{
                p: 4,
                border: "2px solid #ddd",
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
                  <Box sx={{ fontSize: 18, fontWeight: 700, color: "#111" }}>
                    {user.name || "User"}
                  </Box>
                  <Box sx={{ fontSize: 13, color: "#888", mt: 0.5 }}>
                    {user.email}
                  </Box>
                </Box>
                <Button
                  variant="contained"
                  sx={{
                    backgroundColor: "#e0e0e0",
                    color: "#111",
                    textTransform: "none",
                    fontSize: 13,
                    fontWeight: 600,
                    "&:hover": { backgroundColor: "#d0d0d0" },
                  }}
                >
                  Edit
                </Button>
              </Box>

              {/* Form Fields */}
              <Stack spacing={3}>
                <Box>
                  <Box sx={{ fontSize: 13, fontWeight: 600, mb: 1, color: "#333" }}>
                    Full name
                  </Box>
                  <TextField
                    fullWidth
                    defaultValue={user.name || ""}
                    variant="outlined"
                    disabled
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        backgroundColor: "#e8e8e8",
                      },
                    }}
                  />
                </Box>

                <Box>
                  <Box sx={{ fontSize: 13, fontWeight: 600, mb: 1, color: "#333" }}>
                    Mobile Number
                  </Box>
                  <TextField
                    fullWidth
                    placeholder="(000) 000000"
                    variant="outlined"
                    disabled
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        backgroundColor: "#e8e8e8",
                      },
                    }}
                  />
                </Box>

                <Box>
                  <Box sx={{ fontSize: 14, fontWeight: 600, mb: 2, color: "#333" }}>
                    My email Address
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      mb: 2,
                      p: 2,
                      backgroundColor: "#f5f5f5",
                      borderRadius: 1,
                    }}
                  >
                    <Box sx={{ fontSize: 12, color: "#666" }}>✓</Box>
                    <Box sx={{ fontSize: 13, color: "#333", fontWeight: 500 }}>
                      {user.email}
                    </Box>
                  </Box>
                  <Box sx={{ fontSize: 12, color: "#999", mb: 2 }}>
                    1 month ago
                  </Box>
                  <Button
                    variant="outlined"
                    sx={{
                      border: "1px solid #ddd",
                      color: "#666",
                      textTransform: "none",
                      fontSize: 12,
                      fontWeight: 600,
                      "&:hover": { backgroundColor: "#f9f9f9" },
                    }}
                  >
                    Edit Email Address
                  </Button>
                </Box>
              </Stack>
            </Paper>
          </Box>

          {/* Sidebar */}
          <Box sx={{ width: 200 }}>
            <Stack spacing={2}>
              {[
                { label: "Edit Profile", href: "#" },
                { label: "My Appointments", href: "#" },
                { label: "My Reviews", href: "#" },
                { label: "Loyalty Card", href: "#" },
              ].map((item) => (
                <Button
                  key={item.label}
                  fullWidth
                  sx={{
                    textAlign: "left",
                    justifyContent: "flex-start",
                    color: "#0066cc",
                    textTransform: "none",
                    fontSize: 13,
                    fontWeight: 500,
                    "&:hover": { backgroundColor: "rgba(0,102,204,0.05)" },
                  }}
                >
                  {item.label}
                </Button>
              ))}
              <Button
                fullWidth
                sx={{
                  textAlign: "left",
                  justifyContent: "flex-start",
                  color: "#ff4444",
                  textTransform: "none",
                  fontSize: 13,
                  fontWeight: 500,
                  "&:hover": { backgroundColor: "rgba(255,68,68,0.05)" },
                  mt: 2,
                }}
              >
                Log Out
              </Button>
            </Stack>
          </Box>
        </Box>
      </Container>
      <Footer />
    </>
  );
}
