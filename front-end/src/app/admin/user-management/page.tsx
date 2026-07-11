'use client';

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Paper from "@mui/material/Paper";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import PersonOffIcon from "@mui/icons-material/PersonOff";
import PersonIcon from "@mui/icons-material/Person";
import EditIcon from "@mui/icons-material/Edit";
import ErrorIcon from "@mui/icons-material/Error";
import Button from "@mui/material/Button";
import AddIcon from "@mui/icons-material/Add";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";

import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import CloseIcon from "@mui/icons-material/Close";

import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import InputLabel from "@mui/material/InputLabel";
import FormControl from "@mui/material/FormControl";

import Pagination from "@mui/material/Pagination";
import { ADMIN_TABS, DEFAULT_ROLE_TAB_ACCESS, type AdminRole } from "@/lib/adminTabs";

interface User {
  id: string;
  name: string;
  mobileNumber: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

type RoleAccess = Record<AdminRole, string[]>;

export default function AdminPage() {
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  const [openAdd, setOpenAdd] = useState(false);
  const [openRoleAccess, setOpenRoleAccess] = useState(false);
  const [roleAccessRole, setRoleAccessRole] = useState<AdminRole>("RECEPTIONIST");
  const [roleAccess, setRoleAccess] = useState<RoleAccess>({
    OWNER: DEFAULT_ROLE_TAB_ACCESS.OWNER,
    RECEPTIONIST: DEFAULT_ROLE_TAB_ACCESS.RECEPTIONIST,
    BARBER: DEFAULT_ROLE_TAB_ACCESS.BARBER,
  });

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [openWeakPass, setOpenWeakPass] = useState(false);
  const [openDiffPass, setOpenDiffPass] = useState(false);
  const [openServerError, setOpenServerError] = useState(false);
  const [serverErrorMsg, setServerErrorMsg] = useState("");
  const [role, setRole] = useState("RECEPTIONIST");

  const [openEdit, setOpenEdit] = useState(false);
  const [openEditConfirm, setOpenEditConfirm] = useState(false);

  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editMobileNumber, setEditMobileNumber] = useState("");
  const [editRole, setEditRole] = useState("");

  const [openDel, setOpenDel] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [openStatusModal, setOpenStatusModal] = useState(false);
  const [statusTitle, setStatusTitle] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const showStatusModal = (title: string, message: string) => {
    setStatusTitle(title);
    setStatusMessage(message);
    setOpenStatusModal(true);
  };

  const sortUsers = (list: User[]) => {
    return [...list].sort((a, b) => {
      if (a.isActive === b.isActive) return 0;
      return a.isActive ? -1 : 1;
    });
  };

  const validatePassword = (password: string) => {
    const minLength = /.{8,}/;
    const hasNumber = /[0-9]/;
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/;
    const hasLetter = /[a-zA-Z]/;

    return (
      minLength.test(password) &&
      hasNumber.test(password) &&
      hasSpecial.test(password) &&
      hasLetter.test(password)
    );
  };

  const loadUsers = async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      const res = await fetch("/api/admin/user-management");

      if (res.status === 403) {
        router.push("/unauthorized");
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Unable to load users.");
        setUsers([]);
      } else {
        setUsers(sortUsers(data.users || []));
        setError("");
      }
    } catch {
      setError("Unable to load users.");
    }

    setLoading(false);
  };

  const loadRoleAccess = async () => {
    try {
      const res = await fetch("/api/admin/role-access", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        showStatusModal("Error", data.error || "Unable to load role access.");
        return;
      }

      if (data.access) {
        setRoleAccess({
          OWNER: data.access.OWNER || DEFAULT_ROLE_TAB_ACCESS.OWNER,
          RECEPTIONIST:
            data.access.RECEPTIONIST || DEFAULT_ROLE_TAB_ACCESS.RECEPTIONIST,
          BARBER: data.access.BARBER || DEFAULT_ROLE_TAB_ACCESS.BARBER,
        });
      }
    } catch {
      showStatusModal("Error", "Unable to load role access.");
    }
  };

  useQuery({
    queryKey: ["adminUsersData"],
    queryFn: async () => {
      await loadUsers(false);
      return true;
    },
    refetchInterval: 10000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
      const init = async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) {
            router.push('/login')
            return
          }

          const res = await fetch('/api/user/role')
          const data = await res.json()

          if (!data.accessibleTabs?.includes("user-management")) {
            router.push('/unauthorized')
            return
          }

          await loadUsers(true)
        } catch (err) {
          console.error("Initialization failed:", err)
        }
      }
      init()
  }, [router]);

  const handleCreateUser = async ({
    firstName,
    lastName,
    email,
    mobileNumber,
  }: {
    firstName: string;
    lastName: string;
    email: string;
    mobileNumber: string;
  }) => {
    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName,
          lastName,
          mobileNumber,
          email,
          password,
          role,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.user) {
        showStatusModal("Error", data.error || "No user returned from server");
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["adminUsersData"] });
      await loadUsers(false);

      setOpenAdd(false);
      setFirstName("");
      setLastName("");
      setMobileNumber("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setRole("RECEPTIONIST");

      showStatusModal("Success", "User created successfully!");
    } catch {
      showStatusModal("Error", "Something went wrong.");
    }
  };

  const handleReviewUser = () => {
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedEmail = email.trim();
    const trimmedMobileNumber = mobileNumber.trim();

    if (
      !trimmedFirstName ||
      !trimmedLastName ||
      !trimmedEmail ||
      !trimmedMobileNumber ||
      !password ||
      !confirmPassword
    ) {
      showStatusModal(
        "Incomplete Fields",
        "Please fill in all fields before continuing."
      );
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(trimmedEmail)) {
      setServerErrorMsg("Invalid email format");
      setOpenServerError(true);
      return;
    }

    if (password !== confirmPassword) {
      setOpenDiffPass(true);
      return;
    }

    if (!validatePassword(password)) {
      setOpenWeakPass(true);
      return;
    }

    handleCreateUser({
      firstName: trimmedFirstName,
      lastName: trimmedLastName,
      email: trimmedEmail,
      mobileNumber: trimmedMobileNumber,
    });
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    try {
      const res = await fetch(`/api/admin/user-management/${selectedUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: editFirstName,
          lastName: editLastName,
          email: editEmail,
          mobileNumber: editMobileNumber,
          role: editRole,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showStatusModal("Error", data.error || "Failed to update user");
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["adminUsersData"] });
      await queryClient.invalidateQueries({ queryKey: ["adminUsersData"] });
      setUsers((prev) =>
        sortUsers(
          prev.map((user) =>
            user.id === selectedUser.id
              ? {
                  ...user,
                  name: `${editFirstName} ${editLastName}`,
                  email: editEmail,
                  mobileNumber: editMobileNumber,
                  role: editRole,
                }
              : user
          )
        )
      );

      setOpenEdit(false);
      setOpenEditConfirm(false);
      setSelectedUser(null);

      showStatusModal("Success", "User updated successfully!");
    } catch {
      showStatusModal("Error", "Something went wrong");
    }
  };

  const handleToggleUserStatus = async () => {
    if (!selectedUser?.id) return;

    try {
      const res = await fetch(`/api/admin/user-management/${selectedUser.id}`, {
        method: "PATCH",
      });

      const data = await res.json();

      if (!res.ok) {
        showStatusModal("Error", data.error || "Failed to update user status");
        return;
      }

      setUsers((prev) =>
        sortUsers(
          prev.map((user) =>
            user.id === selectedUser.id
              ? { ...user, isActive: !user.isActive }
              : user
          )
        )
      );

      setOpenDel(false);
      setSelectedUser(null);

      showStatusModal(
        "Success",
        data.message || "User status updated successfully!"
      );
    } catch {
      showStatusModal("Error", "Something went wrong updating user status");
    }
  };

  const toggleRoleAccessTab = (tabKey: string) => {
    setRoleAccess((prev) => {
      const currentTabs = prev[roleAccessRole] || [];
      const nextTabs = currentTabs.includes(tabKey)
        ? currentTabs.filter((key) => key !== tabKey)
        : [...currentTabs, tabKey];

      return {
        ...prev,
        [roleAccessRole]: nextTabs,
      };
    });
  };

  const handleSaveRoleAccess = async () => {
    try {
      const res = await fetch("/api/admin/role-access", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: roleAccessRole,
          tabs: roleAccess[roleAccessRole] || [],
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showStatusModal("Error", data.error || "Failed to update role access.");
        return;
      }

      setOpenRoleAccess(false);
      showStatusModal("Success", "Role accessibility updated successfully.");
    } catch {
      showStatusModal("Error", "Something went wrong updating role access.");
    }
  };

  const sortedUsers = sortUsers(users);

  const paginatedUsers = sortedUsers.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);

  return (
    <Box sx={{ flex: 1, p: 4, backgroundColor: "#fff" }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 4,
        }}
      >
        <Typography variant="h3" sx={{ fontWeight: 700 }}>
          User Management
        </Typography>
      </Box>

      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "flex-end",
          flexDirection: "column",
          gap: 1.25,
          mb: 4,
        }}
      >
        <Button
          startIcon={<AddIcon />}
          variant="contained"
          onClick={() => setOpenAdd(true)}
          sx={{ textTransform: "none" }}
        >
          Add User
        </Button>

        <Button
          variant="outlined"
          onClick={async () => {
            await loadRoleAccess();
            setOpenRoleAccess(true);
          }}
          sx={{ textTransform: "none" }}
        >
          Edit Role Accessibility
        </Button>
      </Box>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : users.length === 0 ? (
        <Typography sx={{ textAlign: "center", color: "text.secondary" }}>
          No users found.
        </Typography>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>ID</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>
                    Contact Number
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>
                    Email Address
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Role</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Date Added</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {paginatedUsers.map((user, index) => (
                  <TableRow
                    key={user.id}
                    sx={{
                      opacity: user.isActive ? 1 : 0.5,
                      backgroundColor: user.isActive ? "#fff" : "#f3f3f3",
                      "&:hover": {
                        backgroundColor: user.isActive ? "#fafafa" : "#eeeeee",
                      },
                    }}
                  >
                    <TableCell>
                      {String((page - 1) * itemsPerPage + index + 1).padStart(
                        1,
                        "0"
                      )}
                    </TableCell>

                    <TableCell
                      sx={{
                        fontWeight: 700,
                        color: user.isActive ? "green" : "gray",
                      }}
                    >
                      {user.isActive ? "Active" : "Inactive"}
                    </TableCell>

                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.mobileNumber}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell sx={{ color: "#666" }}>{user.role}</TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>

                    <TableCell>
                      <IconButton
                        size="small"
                        color="primary"
                        disabled={!user.isActive}
                        onClick={() => {
                          setSelectedUser(user);

                          const names = (user.name ?? "").split(" ");

                          setEditFirstName(names[0] || "");
                          setEditLastName(names.slice(1).join(" ") || "");
                          setEditEmail(user.email);
                          setEditMobileNumber(user.mobileNumber);
                          setEditRole(user.role || "RECEPTIONIST");

                          setOpenEdit(true);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>

                      <IconButton
                        size="small"
                        color={user.isActive ? "warning" : "success"}
                        onClick={() => {
                          setSelectedUser(user);
                          setOpenDel(true);
                        }}
                        title={user.isActive ? "Deactivate User" : "Activate User"}
                      >
                        {user.isActive ? (
                          <PersonOffIcon fontSize="small" />
                        ) : (
                          <PersonIcon fontSize="small" />
                        )}
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mt: 4,
            }}
          >
            <Typography sx={{ color: "text.secondary", fontSize: 14 }}>
              Showing 1 to {paginatedUsers.length} of {users.length} Entries
            </Typography>

            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, value) => setPage(value)}
              size="small"
            />
          </Box>
        </>
      )}

      <Dialog
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        maxWidth="sm"
        fullWidth
        sx={{
          "& .MuiPaper-root": {
            borderRadius: 4,
            bgcolor: "#f2f2f2",
            overflow: "visible",
          },
        }}
      >
        <Box
          sx={{
            m: 2,
            bgcolor: "#fff",
            borderRadius: 4,
            p: 3,
            pb: 2,
            boxShadow: "0 10px 40px rgba(0,0,0,0.08)",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 2,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Add New User
            </Typography>

            <IconButton onClick={() => setOpenAdd(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>

          <DialogContent
            sx={{ p: 1, display: "flex", flexDirection: "column", gap: 2 }}
          >
            <TextField
              placeholder="Juan"
              label={
                <>
                  First name <span style={{ color: "red" }}>*</span>
                </>
              }
              fullWidth
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              slotProps={{ htmlInput: { maxLength: 50 } }}
              sx={{ bgcolor: "#f6f6f6", borderRadius: 2 }}
            />

            <TextField
              placeholder="Dela Cruz"
              label={
                <>
                  Last name <span style={{ color: "red" }}>*</span>
                </>
              }
              fullWidth
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              slotProps={{ htmlInput: { maxLength: 50 } }}
              sx={{ bgcolor: "#f6f6f6", borderRadius: 2 }}
            />

            <TextField
              placeholder="09123456789"
              label={
                <>
                  Mobile Number <span style={{ color: "red" }}>*</span>
                </>
              }
              fullWidth
              value={mobileNumber}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");
                if (value.length <= 11) setMobileNumber(value);
              }}
              error={
                mobileNumber.length > 0 && !/^09\d{9}$/.test(mobileNumber)
              }
              helperText={
                mobileNumber.length > 0 && !/^09\d{9}$/.test(mobileNumber)
                  ? "Mobile number must be 11 digits and start with 09"
                  : ""
              }
              slotProps={{
                htmlInput: {
                  inputMode: "numeric",
                  pattern: "[0-9]*",
                  maxLength: 11,
                },
              }}
              sx={{ bgcolor: "#f6f6f6", borderRadius: 2 }}
            />

            <TextField
              placeholder="juandelacruz@gmail.com"
              label={
                <>
                  Email Address <span style={{ color: "red" }}>*</span>
                </>
              }
              fullWidth
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={
                email.length > 0 &&
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
              }
              helperText={
                email.length > 0 &&
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
                  ? "Please enter a valid email address"
                  : ""
              }
              slotProps={{ htmlInput: { maxLength: 100 } }}
              sx={{ bgcolor: "#f6f6f6", borderRadius: 2 }}
            />

            <TextField
              placeholder="Enter password"
              label={
                <>
                  Password <span style={{ color: "red" }}>*</span>
                </>
              }
              type="password"
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              slotProps={{ htmlInput: { maxLength: 72 } }}
              sx={{ bgcolor: "#f6f6f6", borderRadius: 2 }}
            />

            <TextField
              placeholder="Confirm password"
              label={
                <>
                  Confirm Password <span style={{ color: "red" }}>*</span>
                </>
              }
              type="password"
              fullWidth
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              slotProps={{ htmlInput: { maxLength: 72 } }}
              sx={{ bgcolor: "#f6f6f6", borderRadius: 2 }}
            />

            <FormControl fullWidth sx={{ bgcolor: "#f6f6f6", borderRadius: 2 }}>
              <InputLabel>
                Role <span style={{ color: "red" }}>*</span>
              </InputLabel>
              <Select
                value={role}
                label="Role *"
                onChange={(e) => setRole(e.target.value)}
              >
                <MenuItem value="RECEPTIONIST">Receptionist</MenuItem>
                <MenuItem value="BARBER">Barber</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              gap: 1,
              mt: 3,
              mb: 2,
            }}
          >
            <Button
              onClick={() => setOpenAdd(false)}
              sx={{
                backgroundColor: "#6d6d6d",
                color: "#f7c948",
                textTransform: "none",
                minWidth: 120,
                py: 1.25,
                ":hover": { backgroundColor: "#5a5a5a" },
              }}
            >
              Cancel
            </Button>

            <Button
              variant="contained"
              onClick={handleReviewUser}
              sx={{
                backgroundColor: "#000",
                color: "#fff",
                textTransform: "none",
                minWidth: 120,
                py: 1.25,
                ":hover": { backgroundColor: "#111" },
              }}
            >
              Add
            </Button>
          </Box>
        </Box>
      </Dialog>

      <Dialog
        open={openRoleAccess}
        onClose={() => setOpenRoleAccess(false)}
        maxWidth="sm"
        fullWidth
        sx={{
          "& .MuiPaper-root": {
            borderRadius: 4,
            bgcolor: "#f2f2f2",
            overflow: "visible",
          },
        }}
      >
        <Box
          sx={{
            m: 2,
            bgcolor: "#fff",
            borderRadius: 4,
            p: 3,
            pb: 2,
            boxShadow: "0 10px 40px rgba(0,0,0,0.08)",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 2,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Edit Role Accessibility
            </Typography>

            <IconButton onClick={() => setOpenRoleAccess(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>

          <DialogContent
            sx={{ p: 1, display: "flex", flexDirection: "column", gap: 2 }}
          >
            <FormControl fullWidth sx={{ bgcolor: "#f6f6f6", borderRadius: 2 }}>
              <InputLabel>Role</InputLabel>
              <Select
                value={roleAccessRole}
                label="Role"
                onChange={(e) => setRoleAccessRole(e.target.value as AdminRole)}
              >
                <MenuItem value="RECEPTIONIST">Receptionist</MenuItem>
                <MenuItem value="BARBER">Barber</MenuItem>
              </Select>
            </FormControl>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 0.5,
              }}
            >
              {ADMIN_TABS.map((tab) => (
                <FormControlLabel
                  key={tab.key}
                  control={
                    <Checkbox
                      checked={(roleAccess[roleAccessRole] || []).includes(tab.key)}
                      onChange={() => toggleRoleAccessTab(tab.key)}
                    />
                  }
                  label={tab.label}
                />
              ))}
            </Box>
          </DialogContent>

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              gap: 1,
              mt: 3,
              mb: 2,
            }}
          >
            <Button
              onClick={() => setOpenRoleAccess(false)}
              sx={{
                backgroundColor: "#6d6d6d",
                color: "#f7c948",
                textTransform: "none",
                minWidth: 120,
                py: 1.25,
                ":hover": { backgroundColor: "#5a5a5a" },
              }}
            >
              Cancel
            </Button>

            <Button
              variant="contained"
              onClick={handleSaveRoleAccess}
              sx={{
                backgroundColor: "#000",
                color: "#fff",
                textTransform: "none",
                minWidth: 120,
                py: 1.25,
                ":hover": { backgroundColor: "#111" },
              }}
            >
              Save
            </Button>
          </Box>
        </Box>
      </Dialog>

      <Dialog
        open={openEdit}
        onClose={() => setOpenEdit(false)}
        maxWidth="sm"
        fullWidth
        sx={{
          "& .MuiPaper-root": {
            borderRadius: 4,
            bgcolor: "#f2f2f2",
            overflow: "visible",
          },
        }}
      >
        <Box
          sx={{
            m: 2,
            bgcolor: "#fff",
            borderRadius: 4,
            p: 3,
            pb: 2,
            boxShadow: "0 10px 40px rgba(0,0,0,0.08)",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 2,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Edit User Details
            </Typography>

            <IconButton onClick={() => setOpenEdit(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>

          <DialogContent
            sx={{ p: 1, display: "flex", flexDirection: "column", gap: 2 }}
          >
            <TextField
              label={
                <>
                  First Name <span style={{ color: "red" }}>*</span>
                </>
              }
              fullWidth
              value={editFirstName}
              onChange={(e) => setEditFirstName(e.target.value)}
              slotProps={{ htmlInput: { maxLength: 50 } }}
              sx={{ bgcolor: "#f6f6f6", borderRadius: 2 }}
            />

            <TextField
              label={
                <>
                  Last Name <span style={{ color: "red" }}>*</span>
                </>
              }
              fullWidth
              value={editLastName}
              onChange={(e) => setEditLastName(e.target.value)}
              slotProps={{ htmlInput: { maxLength: 50 } }}
              sx={{ bgcolor: "#f6f6f6", borderRadius: 2 }}
            />

            <TextField
              label={
                <>
                  Email <span style={{ color: "red" }}>*</span>
                </>
              }
              fullWidth
              value={editEmail}
              disabled
              sx={{
                bgcolor: "#f6f6f6",
                borderRadius: 2,
                "& .MuiInputBase-input.Mui-disabled": {
                  WebkitTextFillColor: "#555",
                },
              }}
            />

            <TextField
              label={
                <>
                  Mobile Number <span style={{ color: "red" }}>*</span>
                </>
              }
              fullWidth
              value={editMobileNumber}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");
                if (value.length <= 11) setEditMobileNumber(value);
              }}
              error={
                editMobileNumber.length > 0 &&
                !/^09\d{9}$/.test(editMobileNumber)
              }
              helperText={
                editMobileNumber.length > 0 &&
                !/^09\d{9}$/.test(editMobileNumber)
                  ? "Mobile number must be 11 digits and start with 09"
                  : ""
              }
              slotProps={{
                htmlInput: {
                  inputMode: "numeric",
                  pattern: "[0-9]*",
                  maxLength: 11,
                },
              }}
              sx={{ bgcolor: "#f6f6f6", borderRadius: 2 }}
            />

            <FormControl fullWidth sx={{ bgcolor: "#f6f6f6", borderRadius: 2 }}>
              <InputLabel>
                Role <span style={{ color: "red" }}>*</span>
              </InputLabel>

              <Select
                value={editRole}
                label="Role *"
                disabled
                sx={{
                  "& .Mui-disabled": {
                    WebkitTextFillColor: "#555",
                  },
                }}
              >
                <MenuItem value="OWNER">Owner</MenuItem>
                <MenuItem value="RECEPTIONIST">Receptionist</MenuItem>
                <MenuItem value="BARBER">Barber</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              gap: 1,
              mt: 3,
              mb: 2,
            }}
          >
            <Button
              onClick={() => setOpenEdit(false)}
              sx={{
                backgroundColor: "#6d6d6d",
                color: "#f7c948",
                textTransform: "none",
                minWidth: 120,
                py: 1.25,
                ":hover": { backgroundColor: "#5a5a5a" },
              }}
            >
              Cancel
            </Button>

            <Button
              variant="contained"
              onClick={() => {
                setOpenEdit(false);
                setOpenEditConfirm(true);
              }}
              sx={{
                backgroundColor: "#000",
                color: "#fff",
                textTransform: "none",
                minWidth: 120,
                py: 1.25,
                ":hover": { backgroundColor: "#111" },
              }}
            >
              Update
            </Button>
          </Box>
        </Box>
      </Dialog>

      <Dialog
        open={openEditConfirm}
        onClose={() => setOpenEditConfirm(false)}
        maxWidth="sm"
        fullWidth
        sx={{
          "& .MuiPaper-root": {
            borderRadius: 4,
            bgcolor: "#f2f2f2",
            overflow: "visible",
          },
        }}
      >
        <Box
          sx={{
            m: 2,
            bgcolor: "#fff",
            borderRadius: 4,
            p: 3,
            pb: 2,
            boxShadow: "0 10px 40px rgba(0,0,0,0.08)",
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Edit User Details
          </Typography>

          <DialogContent sx={{ p: 0 }}>
            Are you sure you want to update this user?
          </DialogContent>

          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 3 }}>
            <Button
              onClick={() => {
                setOpenEditConfirm(false);
                setOpenEdit(true);
              }}
              sx={{
                backgroundColor: "#6d6d6d",
                color: "#f7c948",
                minWidth: 120,
                py: 1.25,
                ":hover": { backgroundColor: "#5a5a5a" },
              }}
            >
              Cancel
            </Button>

            <Button
              variant="contained"
              onClick={handleUpdateUser}
              sx={{
                backgroundColor: "#000",
                color: "#fff",
                textTransform: "none",
                minWidth: 120,
                py: 1.25,
                ":hover": { backgroundColor: "#111" },
              }}
            >
              Update
            </Button>
          </Box>
        </Box>
      </Dialog>

      <Dialog
        open={openDel}
        onClose={() => setOpenDel(false)}
        sx={{
          "& .MuiPaper-root": {
            borderRadius: 4,
            bgcolor: "#f2f2f2",
            overflow: "visible",
          },
        }}
      >
        <Box
          sx={{
            m: 2,
            bgcolor: "#fff",
            borderRadius: 4,
            p: 3,
            pb: 2,
            width: 500,
            boxShadow: "0 10px 40px rgba(0,0,0,0.08)",
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {selectedUser?.isActive ? "Deactivate User" : "Activate User"}
          </Typography>

          <DialogContent
            sx={{
              p: 0,
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            Are you sure you want to{" "}
            {selectedUser?.isActive ? "deactivate" : "activate"} this user?
            <b>ID: {selectedUser?.id}</b>
            <b>Name: {selectedUser?.name}</b>
          </DialogContent>

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              gap: 1,
              mt: 4,
              mb: 2,
            }}
          >
            <Button
              variant="contained"
              onClick={handleToggleUserStatus}
              sx={{
                backgroundColor: "#000",
                color: "#fff",
                textTransform: "none",
                minWidth: 120,
                py: 1.25,
                ":hover": { backgroundColor: "#111" },
              }}
            >
              {selectedUser?.isActive ? "Deactivate" : "Activate"}
            </Button>

            <Button
              onClick={() => setOpenDel(false)}
              sx={{
                backgroundColor: "#6d6d6d",
                color: "#f7c948",
                textTransform: "none",
                minWidth: 120,
                py: 1.25,
                ":hover": { backgroundColor: "#5a5a5a" },
              }}
            >
              Cancel
            </Button>
          </Box>
        </Box>
      </Dialog>

      <Dialog
        open={openStatusModal}
        onClose={() => setOpenStatusModal(false)}
        maxWidth="sm"
        fullWidth
        sx={{
          "& .MuiPaper-root": {
            borderRadius: 4,
            bgcolor: "#f2f2f2",
            overflow: "visible",
          },
        }}
      >
        <Box
          sx={{
            m: 2,
            bgcolor: "#fff",
            borderRadius: 4,
            p: 3,
            pb: 2,
            boxShadow: "0 10px 40px rgba(0,0,0,0.08)",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 2,
            }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {statusTitle}
              </Typography>

              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                User Management
              </Typography>
            </Box>

            <IconButton onClick={() => setOpenStatusModal(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>

          <DialogContent sx={{ p: 0 }}>
            <Typography sx={{ mb: 1, color: "#333" }}>
              {statusMessage}
            </Typography>
          </DialogContent>

          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 4, mb: 2 }}>
            <Button
              variant="contained"
              onClick={() => setOpenStatusModal(false)}
              sx={{
                backgroundColor: "#000",
                color: "#fff",
                textTransform: "none",
                minWidth: 120,
                py: 1.25,
                ":hover": {
                  backgroundColor: "#111",
                },
              }}
            >
              OK
            </Button>
          </Box>
        </Box>
      </Dialog>

      <Dialog
        open={openWeakPass}
        onClose={() => setOpenWeakPass(false)}
        maxWidth="sm"
        fullWidth
        sx={{
          "& .MuiPaper-root": {
            borderRadius: 4,
            bgcolor: "#f2f2f2",
            overflow: "visible",
          },
        }}
      >
        <Box
          sx={{
            m: 2,
            bgcolor: "#fff",
            borderRadius: 4,
            p: 3,
            pb: 2,
            boxShadow: "0 10px 40px rgba(0,0,0,0.08)",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 2,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Weak Password
            </Typography>

            <IconButton onClick={() => setOpenWeakPass(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>

          <DialogContent sx={{ p: 0 }}>
            <Typography sx={{ mb: 2 }}>
              Password must meet the following requirements:
            </Typography>

            <ul style={{ paddingLeft: 20, marginTop: 0 }}>
              <li>At least 8 characters long</li>
              <li>Contains at least 1 letter (A-Z)</li>
              <li>Contains at least 1 number (0-9)</li>
              <li>Contains at least 1 special character (!@#$%^&*)</li>
            </ul>
          </DialogContent>

          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 4 }}>
            <Button
              variant="contained"
              onClick={() => setOpenWeakPass(false)}
              sx={{
                backgroundColor: "#000",
                color: "#fff",
                textTransform: "none",
                minWidth: 120,
                py: 1.25,
                ":hover": {
                  backgroundColor: "#111",
                },
              }}
            >
              OK
            </Button>
          </Box>
        </Box>
      </Dialog>

      <Dialog open={openDiffPass} onClose={() => setOpenDiffPass(false)}>
        <IconButton
          onClick={() => setOpenDiffPass(false)}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>

        <DialogContent
          sx={{
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1,
            mt: 5,
          }}
        >
          <ErrorIcon sx={{ fontSize: 80, color: "red" }} />
        </DialogContent>

        <DialogContent>Passwords Do Not Match!</DialogContent>
      </Dialog>

      <Dialog open={openServerError} onClose={() => setOpenServerError(false)}>
        <IconButton
          onClick={() => setOpenServerError(false)}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>

        <DialogContent
          sx={{
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1,
            mt: 5,
          }}
        >
          <ErrorIcon sx={{ fontSize: 80, color: "red" }} />
          {serverErrorMsg}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
