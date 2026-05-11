"use client";

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

interface User {
  id: string;
  name: string;
  contactNumber: string;
  role: string;
  createdAt: string;
}

export default function AdminPage() {
  const { data: session, status } = useSession();

  const router =useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("")

  const [openDel, setOpenDel] = useState(false);
  const [openAdd, setOpenAdd] = useState(false);

  const [selectedUser, setSelectedUser ] = useState<User | null>(null);

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
      alert(data.error || "Delete failed");
      return;
    }

    setUsers((prev) =>
      prev.filter((c) => c.id !== selectedUser.id)
    );

    setOpenDel(false);
    setSelectedUser(null);
  } catch (err) {
    console.error(err);
    alert("Something went wrong deleting User");
  }
};
  {/* Add User Logic
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    mobileNumber: "",
    role: "RECEPTIONIST",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const res = await fetch("/api/admin/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();

    if (!data.ok) {
      alert(data.error);
      return;
    }

    alert("User created successfully!");

    setForm({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      mobileNumber: "",
      role: "RECEPTIONIST",
    });
  };
  */}

  useEffect(() => {
    if (status === "loading") return;

    const role = (session?.user as { role?: string })?.role;

    // only OWNER can access
    if (!session?.user?.email || role !== "OWNER") {
      router.push("/unauthorized");
      return;
    }

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

    loadUsers();
  }, [session, status, router]);

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
                {users.map((user, index) => (
                  <TableRow
                    key={user.id}
                    sx={{
                      "&:hover": {
                        backgroundColor: "#fafafa",
                      },
                    }}
                  >
                    {/* ID */}
                    <TableCell>
                      {String(index + 1).padStart(3, "0")}
                    </TableCell>

                    {/* NAME */}
                    <TableCell>
                      {user.name}
                    </TableCell>

                    {/* Contact Number */}
                    <TableCell>
                      {user.contactNumber}
                    </TableCell>

                    {/* ROLE */}
                    <TableCell sx={{ color: "#666" }}>
                      {user.role}
                    </TableCell>

                    {/* DATE */}
                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>

                    {/* ACTIONS */}
                    <TableCell>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => {
                          console.log("Edit", user.id);
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
        </>
      )}
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
          Delete Customer
        </Typography>

        <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          Are you sure you want to delete{" "}
          <b>ID: {selectedUser?.id}</b>
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