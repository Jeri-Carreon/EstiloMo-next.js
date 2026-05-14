'use client';

import { useEffect, useState } from "react";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from '@mui/material/TextField';
import Paper from "@mui/material/Paper";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import Button from "@mui/material/Button";

import AddIcon from "@mui/icons-material/Add";

import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import CloseIcon from "@mui/icons-material/Close";

import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import InputLabel from "@mui/material/InputLabel";
import FormControl from "@mui/material/FormControl";

import Pagination from "@mui/material/Pagination";

interface User {
  id: string;
  name: string;
  mobileNumber: string;
  email: string;
  role: string;
  createdAt: string;
}

export default function AdminPage() {
  const { data: session, status } = useSession();

  const router =useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("")

  //pagination
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
  console.log("users:", users);
}, [users]);
  // Add
  const [openAdd, setOpenAdd] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [openWeakPass, setOpenWeakPass] = useState(false);
  const [role, setRole] = useState("RECEPTIONIST");

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
  }

  // Edit
  const [openEdit, setOpenEdit] = useState(false);
  const [openEditConfirm, setOpenEditConfirm] = useState(false);

  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editMobileNumber, setEditMobileNumber] = useState("");
  const [editRole, setEditRole] = useState("");

  const [openDel, setOpenDel] = useState(false);
  const [selectedUser, setSelectedUser ] = useState<User | null>(null);

    // Confirmation Modal
  const [openStatusModal, setOpenStatusModal] = useState(false);
  const [statusTitle, setStatusTitle] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  
  const showStatusModal = (title: string, message: string) => {
    setStatusTitle(title);
    setStatusMessage(message);
    setOpenStatusModal(true);
  };
  const handleCreateUser = async () => {
  try {
    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        mobileNumber: mobileNumber.trim(),
        email: email.trim(),
        password,
        role,
      }),
    });

    const data = await res.json();

    if (!data.user) {
      showStatusModal("Error", "No user returned from server");
      return;
    }

    await loadUsers();

    setOpenAdd(false);

    // reset fields
    setFirstName('');
    setLastName('');
    setMobileNumber('');
    setEmail('');
    setPassword('');

    showStatusModal('Success', 'User created successfully!');
    } catch (error) {
    showStatusModal('Error', 'Something went wrong.');
    }
  };

  const handleReviewUser = () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !mobileNumber.trim() || !password.trim()) {
      showStatusModal(
        "Incomplete Fields",
        "Please fill in all fields before continuing."
    );
      return;
    }

    if (!validatePassword(password)) {
    setOpenWeakPass(true);
    return;
    }

    setOpenAdd(false);
    handleCreateUser();
    resetForm();
  };

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setMobileNumber("");
    setEmail("");
    setPassword("");
  };

  const handleUpdateUser = async () => {
  if (!selectedUser) return;

  try {
    const res = await fetch(
      `/api/admin/user-management/${selectedUser.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: editFirstName,
          lastName: editLastName,
          email: editEmail,
          mobileNumber: editMobileNumber,
          role: editRole,
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      showStatusModal("Error", data.error || "Failed to update user");
      return;
    }

    setUsers((prev) =>
      prev.map((u) =>
        u.id === selectedUser.id
          ? {
              ...u,
              name: `${editFirstName} ${editLastName}`,
              email: editEmail,
              mobileNumber: editMobileNumber,
              role: editRole,
            }
          : u
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

  const handleDeleteUser = async () => {
  if (!selectedUser?.id) return;

  try {
    const res = await fetch(`/api/admin/user-management/${selectedUser.id}`, {
      method: "DELETE",
    });

    const text = await res.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }

    if (!res.ok) {
      showStatusModal("Error", data.error || "Delete failed");
      return;
    }

    setUsers((prev) =>
      prev.filter((c) => c.id !== selectedUser.id)
    );

    setOpenDel(false);
    setSelectedUser(null);

    // SUCCESS MODAL
    showStatusModal("Success", "User deleted successfully!");
    } catch (err) {
      console.error(err);
      showStatusModal("Error", "Something went wrong deleting user");
    }
};

  const loadUsers = async () => {
    try {
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
        // only show OWNER, RECEPTIONIST, BARBER
        const Users = (data.users);

        setUsers(Users);
        setError("");
      }
    } catch (err) {
      setError("Unable to load users.");
    }

    setLoading(false);
  };

  useEffect(() => {
    if (status === "loading") return;

    const role = (session?.user as { role?: string })?.role;

    // only OWNER can access
    if (!session?.user?.email || role !== "OWNER") {
      router.push("/unauthorized");
      return;
    }

    loadUsers();
  }, [session, status, router]);

  //pagination
  const paginatedUsers = users.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const totalPages = Math.ceil(users.length / itemsPerPage);
  return (
    <Box sx={{ flex: 1, p: 4, backgroundColor: "#fff" }}>
      {/* HEADER */}
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

      {/* ADD BUTTON */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
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
      </Box>

      {/* ERROR */}
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {/* LOADING */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : users.length === 0 ? (
        <Typography
          sx={{
            textAlign: "center",
            color: "text.secondary",
          }}
        >
          No users found.
        </Typography>
      ) : (
        <>
          {/* TABLE */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>ID</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Contact Number</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Email Address</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Role</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>
                    Date Added
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {paginatedUsers.map((user, index) => (
                  <TableRow
                    key={user.id}
                    sx={{
                      "&:hover": {
                        backgroundColor: "#fafafa",
                      },
                    }}
                  >
                    <TableCell>
                      {String((page - 1) * itemsPerPage + index + 1).padStart(3, "0")}
                    </TableCell>

                    <TableCell>
                      {[user.name]}
                    </TableCell>

                    <TableCell>
                      {user.mobileNumber}
                    </TableCell>

                    <TableCell>
                      {user.email}
                    </TableCell>

                    <TableCell sx={{ color: "#666" }}>
                      {user.role}
                    </TableCell>

                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>

                    <TableCell>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => {
                        setSelectedUser(user);

                        const names = (user.name ?? "").split(" ");

                        setEditFirstName(names[0] || "");
                        setEditLastName(names.slice(1).join(" ") || "");
                        setEditEmail(user.email);
                        setEditMobileNumber(user.mobileNumber);
                        setEditRole(user.role);

                        setOpenEdit(true);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>

                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => {
                          setSelectedUser(user);
                          setOpenDel(true);
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {/* PAGINATION + FOOTER */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mt: 4,
            }}
          >
            <Typography
              sx={{
                color: "text.secondary",
                fontSize: 14,
              }}
            >
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

      {/*Add*/}
      <Dialog
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        maxWidth="sm"
        fullWidth
        sx={{
          '& .MuiPaper-root': {
            borderRadius: 4,
            bgcolor: '#f2f2f2',
            overflow: 'visible',
          },
        }}
      >
        <Box sx={{ m: 2, bgcolor: '#fff', borderRadius: 4, p: 3, pb: 2, boxShadow: '0 10px 40px rgba(0,0,0,0.08)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Add New User
              </Typography>
            </Box>
            <IconButton onClick={() => setOpenAdd(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>

          <DialogContent sx={{ p: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
            placeholder="Enter first name"
            label="First name *"
            fullWidth
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            sx={{
              bgcolor: '#f6f6f6',
              borderRadius: 2,
            }}
          />

            <TextField
              placeholder="Enter last name"
              label="Last name *"
              fullWidth
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              sx={{ bgcolor: '#f6f6f6', borderRadius: 2 }}
            />

            <TextField
              placeholder="09123456789"
              label="Mobile Number *"
              fullWidth
              value={mobileNumber}
              onChange={(e) => {
                // Remove non-numeric characters
                const value = e.target.value.replace(/\D/g, '');

                // Limit to 11 digits
                if (value.length <= 11) {
                  setMobileNumber(value);
                }
              }}
              error={
                mobileNumber.length > 0 &&
                !/^09\d{9}$/.test(mobileNumber)
              }
              helperText={
                mobileNumber.length > 0 &&
                !/^09\d{9}$/.test(mobileNumber)
                  ? 'Mobile number must be 11 digits and start with 09'
                  : ''
              }
              slotProps={{
                htmlInput: {
                  inputMode: 'numeric',
                  pattern: '[0-9]*',
                  maxLength: 11,
                },
              }}
            />

            <TextField
              placeholder="Enter email address"
              label="Email Address"
              fullWidth
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{ bgcolor: '#f6f6f6', borderRadius: 2 }}
            />

            <TextField
              placeholder="Enter password"
              label="password"
              type="password"
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ bgcolor: '#f6f6f6', borderRadius: 2 }}
            />

            <FormControl fullWidth sx={{ bgcolor: '#f6f6f6', borderRadius: 2 }}>
              <InputLabel>Role *</InputLabel>
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

          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mt: 3, mb: 2 }}>
            <Button
              onClick={() => setOpenAdd(false)}
              sx={{
                backgroundColor: '#6d6d6d',
                color: '#f7c948',
                textTransform: 'none',
                minWidth: 120,
                py: 1.25,
                ':hover': { backgroundColor: '#5a5a5a' },
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleReviewUser}
              sx={{
                backgroundColor: '#000',
                color: '#fff',
                textTransform: 'none',
                minWidth: 120,
                py: 1.25,
                ':hover': { backgroundColor: '#111' },
              }}
            >
              Add
            </Button>
          </Box>
        </Box>
      </Dialog>

      {/* Edit */}
      <Dialog
      open={openEdit}
        onClose={() => setOpenEdit(false)}
        maxWidth="sm"
        fullWidth
        sx={{
          '& .MuiPaper-root': {
            borderRadius: 4,
            bgcolor: '#f2f2f2',
            overflow: 'visible',
          },
        }}
      >
        <Box sx={{ m: 2, bgcolor: '#fff', borderRadius: 4, p: 3, pb: 2, boxShadow: '0 10px 40px rgba(0,0,0,0.08)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Edit User Details
            </Typography>
            <IconButton onClick={() => setOpenEdit(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>

          <DialogContent sx={{ p: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="First Name"
              fullWidth
              value={editFirstName}
              onChange={(e) => setEditFirstName(e.target.value)}
              sx={{ bgcolor: '#f6f6f6', borderRadius: 2 }}
            />
            <TextField
              label="Last Name"
              fullWidth
              value={editLastName}
              onChange={(e) => setEditLastName(e.target.value)}
              sx={{ bgcolor: '#f6f6f6', borderRadius: 2 }}
            />
            <TextField
              label="Email"
              fullWidth
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              sx={{ bgcolor: '#f6f6f6', borderRadius: 2 }}
            />
            <TextField
              label="Mobile Number"
              fullWidth
              value={editMobileNumber}
              onChange={(e) => setEditMobileNumber(e.target.value)}
              sx={{ bgcolor: '#f6f6f6', borderRadius: 2 }}
            />

            <FormControl fullWidth sx={{ bgcolor: '#f6f6f6', borderRadius: 2 }}>
              <InputLabel>Role *</InputLabel>
              <Select
                value={editRole}
                label="Role *"
                onChange={(e) => setEditRole(e.target.value)}
              >
                <MenuItem value="RECEPTIONIST">Receptionist</MenuItem>
                <MenuItem value="BARBER">Barber</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mt: 3, mb: 2 }}>
            <Button
              onClick={() => setOpenEdit(false)}
              sx={{
              backgroundColor: '#6d6d6d',
                color: '#f7c948',
                textTransform: 'none',
                minWidth: 120,
                py: 1.25,
                ':hover': { backgroundColor: '#5a5a5a' },
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
                backgroundColor: '#000',
                color: '#fff',
                textTransform: 'none',
                minWidth: 120,
                py: 1.25,
                ':hover': { backgroundColor: '#111' },
              }}
            >
              Edit
            </Button>
          </Box>
        </Box>
      </Dialog>

      {/* Edit Confirmation Modal */}
      <Dialog
        open={openEditConfirm}
        onClose={() => setOpenEditConfirm(false)}
        maxWidth="sm"
        fullWidth
        sx={{
          '& .MuiPaper-root': {
            borderRadius: 4,
            bgcolor: '#f2f2f2',
            overflow: 'visible',
          },
        }}
      >
        <Box sx={{ m: 2, bgcolor: '#fff', borderRadius: 4, p: 3, pb: 2, boxShadow: '0 10px 40px rgba(0,0,0,0.08)' }}>

          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Edit User Details
          </Typography>

          <DialogContent sx={{ p: 0 }}>
            Are you sure you want to update this user?
          </DialogContent>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Button onClick={() => {
              setOpenEditConfirm(false);
              setOpenEdit(true);
            }} sx={{
              backgroundColor: '#6d6d6d',
              color: '#f7c948',
              minWidth: 120,
              py: 1.25,
              ':hover': { backgroundColor: '#5a5a5a' },
            }} 
            >
              Cancel
            </Button>
            <Button variant="contained" onClick={handleUpdateUser}
            sx={{
                  backgroundColor: '#000',
                  color: '#fff',
                  textTransform: 'none',
                  minWidth: 120,
                  py: 1.25,
                  ':hover': { backgroundColor: '#111' },
                }}>
              Edit
            </Button>
          </Box>
        </Box>
      </Dialog>

      {/*Delete*/}
      <Dialog 
        open={openDel} 
        onClose={() => setOpenDel(false)}
        sx={{
          '& .MuiPaper-root': {
            borderRadius: 4,
            bgcolor: '#f2f2f2',
            overflow: 'visible',
          },
        }}
      >

      <Box sx={{ m: 2, bgcolor: '#fff', borderRadius: 4, p: 3, pb: 2, width: 500, boxShadow: '0 10px 40px rgba(0,0,0,0.08)' }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Delete User
        </Typography>

        <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          Are you sure you want to delete{" "}
          <b>ID: {selectedUser?.id}</b>{" "}
          <b>{selectedUser?.name}</b>
        </DialogContent>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mt: 4, mb: 2 }}>
          <Button
            variant="contained"
            onClick={handleDeleteUser}
            sx={{
              backgroundColor: '#000',
              color: '#fff',
              textTransform: 'none',
              minWidth: 120,
              py: 1.25,
              ':hover': { backgroundColor: '#111' },
            }}
          >
            Delete
          </Button>
              
          <Button
            onClick={() => {
              setOpenDel(false);
             }}
            sx={{
              backgroundColor: '#6d6d6d',
              color: '#f7c948',
              textTransform: 'none',
              minWidth: 120,
              py: 1.25,
              ':hover': { backgroundColor: '#5a5a5a' },
            }}
          >
            Cancel
          </Button>
        </Box>
      </Box>
      </Dialog>

      {/* Status Modal */}
      <Dialog
        open={openStatusModal}
        onClose={() => setOpenStatusModal(false)}
        maxWidth="sm"
        fullWidth
        sx={{
          '& .MuiPaper-root': {
            borderRadius: 4,
            bgcolor: '#f2f2f2',
            overflow: 'visible',
          },
        }}
      >
        <Box
          sx={{
            m: 2,
            bgcolor: '#fff',
            borderRadius: 4,
            p: 3,
            pb: 2,
            boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
          }}
        >
          {/* HEADER */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 2,
            }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {statusTitle}
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                User Management
              </Typography>
            </Box>

            <IconButton
              onClick={() => setOpenStatusModal(false)}
              size="small"
            >
              <CloseIcon />
            </IconButton>
          </Box>

          {/* CONTENT */}
          <DialogContent sx={{ p: 0 }}>
            <Typography sx={{ mb: 1, color: '#333' }}>
              {statusMessage}
            </Typography>
          </DialogContent>

          {/* BUTTON */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              mt: 4,
              mb: 2,
            }}
          >
            <Button
              variant="contained"
            onClick={() => setOpenStatusModal(false)}
              sx={{
                backgroundColor: '#000',
                color: '#fff',
                textTransform: 'none',
                minWidth: 120,
                py: 1.25,
                ':hover': {
                  backgroundColor: '#111',
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
          '& .MuiPaper-root': {
            borderRadius: 4,
            bgcolor: '#f2f2f2',
            overflow: 'visible',
          },
        }}
      >
        <Box
          sx={{
            m: 2,
            bgcolor: '#fff',
            borderRadius: 4,
            p: 3,
            pb: 2,
            boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 2,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Weak Password
            </Typography>

            <IconButton
              onClick={() => setOpenWeakPass(false)}
              size="small"
            >
              <CloseIcon />
            </IconButton>
          </Box>

          <DialogContent sx={{ p: 0 }}>
            <Typography sx={{ mb: 2 }}>
              Password must meet the following requirements:
            </Typography>

            <ul style={{ paddingLeft: 20, marginTop: 0 }}>
              <li>At least 8 characters long</li>
              <li>Contains at least 1 letter (A–Z)</li>
              <li>Contains at least 1 number (0–9)</li>
              <li>Contains at least 1 special character (!@#$%^&*)</li>
            </ul>
          </DialogContent>

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              mt: 4,
            }}
          >
            <Button
              variant="contained"
              onClick={() => setOpenWeakPass(false)}
              sx={{
                backgroundColor: '#000',
                color: '#fff',
                textTransform: 'none',
                minWidth: 120,
                py: 1.25,
                ':hover': {
                  backgroundColor: '#111',
                },
              }}
            >
              OK
            </Button>
          </Box>
        </Box>
      </Dialog>
    </Box>
  );
}



    {/* 
    <div style={{ padding: 20 }}>
      <h1>User Management</h1>

      <form onSubmit={handleSubmit}>
        <input
          placeholder="First Name"
          value={form.firstName}
          onChange={(e) => setForm({ ...form, firstName: e.target.value })}
        />

        <input
          placeholder="Last Name"
          value={form.lastName}
          onChange={(e) => setForm({ ...form, lastName: e.target.value })}
        />

        <input
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />

        <input
          placeholder="Password"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />

        <input
          placeholder="Mobile Number"
          value={form.mobileNumber}
          onChange={(e) => setForm({ ...form, mobileNumber: e.target.value })}
        />

        <select
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
        >
          <option value="RECEPTIONIST">Receptionist</option>
          <option value="BARBER">Barber</option>
        </select>

        <button type="submit">Create User</button>
      </form>
    </div>
  );
}
  */}