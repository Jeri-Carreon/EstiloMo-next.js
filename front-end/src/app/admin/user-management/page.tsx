'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import Pagination from '@mui/material/Pagination';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  mobileNumber: string;
  role: string;
  createdAt: string;
}

export default function UserManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  // ===== MODALS =====
  const [openAdd, setOpenAdd] = useState(false);
  const [openAddConfirm, setOpenAddConfirm] = useState(false);

  const [openEdit, setOpenEdit] = useState(false);
  const [openEditConfirm, setOpenEditConfirm] = useState(false);

  const [openDel, setOpenDel] = useState(false);
  const [openStatusModal, setOpenStatusModal] = useState(false);

  const [statusTitle, setStatusTitle] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // ===== ADD FIELDS =====
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [role, setRole] = useState('RECEPTIONIST');

  // ===== EDIT FIELDS =====
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editMobileNumber, setEditMobileNumber] = useState('');
  const [editRole, setEditRole] = useState('RECEPTIONIST');

  const showStatusModal = (title: string, message: string) => {
    setStatusTitle(title);
    setStatusMessage(message);
    setOpenStatusModal(true);
  };

  // ===== LOAD USERS =====
  useEffect(() => {
    if (status === 'loading') return;

    const role = (session?.user as any)?.role;

    if (!session?.user?.email || role !== 'OWNER') {
      router.push('/unauthorized');
      return;
    }

    const load = async () => {
      const res = await fetch('/api/admin/user-management');
      const data = await res.json();

      setUsers(data.users || []);
      setLoading(false);
    };

    load();
  }, [session, status, router]);

  // ===== ADD =====
  const handleAdd = async () => {
    const res = await fetch('/api/admin/user-management', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, lastName, mobileNumber, role }),
    });

    const data = await res.json();

    if (!res.ok) return;

    setUsers((prev) => [data.user, ...prev]);

    setOpenAdd(false);
    setOpenAddConfirm(false);

    setFirstName('');
    setLastName('');
    setMobileNumber('');
  };

  // ===== EDIT =====
  const handleUpdate = async () => {
    if (!selectedUser) return;

    const res = await fetch('/api/admin/user-management', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: selectedUser.id,
        firstName: editFirstName,
        lastName: editLastName,
        mobileNumber: editMobileNumber,
        role: editRole,
      }),
    });

    const data = await res.json();

    if (!res.ok) return;

    setUsers((prev) =>
      prev.map((u) =>
        u.id === selectedUser.id
          ? {
              ...u,
              firstName: editFirstName,
              lastName: editLastName,
              mobileNumber: editMobileNumber,
              role: editRole,
            }
          : u
      )
    );

    setOpenEdit(false);
    setOpenEditConfirm(false);
    setSelectedUser(null);
  };

  // ===== DELETE =====
  const handleDelete = async () => {
    if (!selectedUser) return;

    const res = await fetch(
      `/api/admin/user-management?id=${selectedUser.id}`,
      { method: 'DELETE' }
    );

    if (!res.ok) return;

    setUsers((prev) => prev.filter((u) => u.id !== selectedUser.id));
    setOpenDel(false);
  };

  const filtered = users.filter((u) =>
    `${u.firstName} ${u.lastName}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const paginated = filtered.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  return (
    <Box sx={{ p: 4 }}>

      {/* HEADER */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
        <Typography variant="h4">User Management</Typography>

        <Button startIcon={<AddIcon />} variant="contained" onClick={() => setOpenAdd(true)}>
          Add New User
        </Button>
      </Box>

      {/* TABLE */}
      {loading ? (
        <CircularProgress />
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead sx={{ background: '#f5f5f5' }}>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Mobile</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {paginated.map((u, i) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      {String((page - 1) * itemsPerPage + i + 1).padStart(3, '0')}
                    </TableCell>

                    <TableCell>{u.firstName} {u.lastName}</TableCell>
                    <TableCell>{u.mobileNumber}</TableCell>
                    <TableCell>{u.role}</TableCell>
                    <TableCell>
                      {new Date(u.createdAt).toLocaleDateString()}
                    </TableCell>

                    <TableCell>
                      <IconButton
                        color="primary"
                        onClick={() => {
                          setSelectedUser(u);
                          setEditFirstName(u.firstName);
                          setEditLastName(u.lastName);
                          setEditMobileNumber(u.mobileNumber);
                          setEditRole(u.role);
                          setOpenEdit(true);
                        }}
                      >
                        <EditIcon />
                      </IconButton>

                      <IconButton
                        color="error"
                        onClick={() => {
                          setSelectedUser(u);
                          setOpenDel(true);
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* PAGINATION */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
            <Typography>
              Showing {paginated.length} of {filtered.length}
            </Typography>

            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, v) => setPage(v)}
            />
          </Box>
        </>
      )}

      {/* ADD MODAL */}
      <Dialog 
        open={openAdd}
        onClose={() => setOpenAdd(false)} 
        maxWidth="sm" 
        fullWidth 
        sx={{ 
          '& .MuiDialog-paper': { 
            borderRadius: 4 , 
            bgcolor: '#f2f2f2', 
            overflow: 'visible', 
          }, 
        }}>
        
        <Box sx={{ m: 2, bgcolor: '#fff', borderRadius: 4, p: 3, pb: 2, boxShadow: '0 10px 40px rgba(0,0,0,0.08)' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Add New User</Typography>

          <TextField fullWidth label="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} sx={{ mt: 2 }} />
          <TextField fullWidth label="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} sx={{ mt: 2 }} />
          <TextField fullWidth label="Mobile" value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} sx={{ mt: 2 }} />

          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Role</InputLabel>
            <Select value={role} onChange={(e) => setRole(e.target.value)}>
              <MenuItem value="OWNER">OWNER</MenuItem>
              <MenuItem value="RECEPTIONIST">RECEPTIONIST</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Button onClick={() => setOpenAdd(false)}
              sx={{
                  backgroundColor: '#6d6d6d',
                  color: '#f7c948',
                  textTransform: 'none',
                  minWidth: 120,
                  py: 1.25,
                  ':hover': { backgroundColor: '#5a5a5a' },
                }}>Cancel</Button>
            <Button onClick={() => { setOpenAdd(false); setOpenAddConfirm(true); }}
              sx={{
                  backgroundColor: '#000',
                  color: '#fff',
                  textTransform: 'none',
                  minWidth: 120,
                  py: 1.25,
                  ':hover': { backgroundColor: '#111' },
                }}>
              Add User
            </Button>
          </Box>
        </Box>
      </Dialog>

      {/* ADD CONFIRM */}
      <Dialog open={openAddConfirm} onClose={() => setOpenAddConfirm(false)}>
        <Box sx={{ p: 3 }}>
          <Typography>Confirm Add User?</Typography>
          <Typography>{firstName} {lastName}</Typography>
          <Typography>{mobileNumber}</Typography>

          <Button onClick={handleAdd}>Confirm</Button>
        </Box>
      </Dialog>

      {/* EDIT MODAL */}
      <Dialog open={openEdit} onClose={() => setOpenEdit(false)}>
        <Box sx={{ p: 3, width: 400 }}>
          <Typography>Edit User</Typography>

          <TextField fullWidth value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} sx={{ mt: 2 }} />
          <TextField fullWidth value={editLastName} onChange={(e) => setEditLastName(e.target.value)} sx={{ mt: 2 }} />
          <TextField fullWidth value={editMobileNumber} onChange={(e) => setEditMobileNumber(e.target.value)} sx={{ mt: 2 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Button onClick={() => setOpenEdit(false)}>Cancel</Button>
            <Button onClick={() => { setOpenEdit(false); setOpenEditConfirm(true); }}>
              Save
            </Button>
          </Box>
        </Box>
      </Dialog>

      {/* EDIT CONFIRM */}
      <Dialog open={openEditConfirm} onClose={() => setOpenEditConfirm(false)}>
        <Box sx={{ p: 3 }}>
          <Typography>Confirm Update?</Typography>

          <Button onClick={handleUpdate}>Confirm</Button>
        </Box>
      </Dialog>

      {/* DELETE MODAL */}
      <Dialog open={openDel} onClose={() => setOpenDel(false)}>
        <Box sx={{ p: 3 }}>
          <Typography>Delete this user?</Typography>

          <Button color="error" onClick={handleDelete}>Delete</Button>
        </Box>
      </Dialog>

      {/* STATUS MODAL */}
      <Dialog open={openStatusModal} onClose={() => setOpenStatusModal(false)}>
        <Box sx={{ p: 3 }}>
          <Typography>{statusTitle}</Typography>
          <Typography>{statusMessage}</Typography>

          <Button onClick={() => setOpenStatusModal(false)}>OK</Button>
        </Box>
      </Dialog>

    </Box>
  );
}