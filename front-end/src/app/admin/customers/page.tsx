'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

import Link from 'next/link';
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
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';


import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import CloseIcon from "@mui/icons-material/Close";

import SearchIcon from '@mui/icons-material/Search';
import TuneIcon from '@mui/icons-material/Tune';
import AddIcon from '@mui/icons-material/Add';
import GetAppIcon from '@mui/icons-material/GetApp';
import ErrorIcon from "@mui/icons-material/Error";

import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import Pagination from '@mui/material/Pagination';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { useRouter } from "next/navigation";

interface Customer {
  id: string;
  customerCode: string;
  type: string;
  name: string;
  contactNumber: string;
  email: string;
  totalAppointments: number;
  totalSpent: number;
  createdAt: string;
}

export default function CustomersPage() {
  // session
  const [loading, setLoading] = useState(true);
  const supabase = createClient()

  const [error, setError] = useState('');

  const [customers, setCustomers] = useState<Customer[]>([]);

  // Add Modal
  const [openAdd, setOpenAdd] = useState(false);
  const [openAddConfirm, setOpenAddConfirm] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");

  // Delete Modal
  const [openDel, setOpenDel] = useState(false);
  
  // Edit Modal
  const [openEdit, setOpenEdit] = useState(false);
  const [openEditConfirm, setOpenEditConfirm] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editMobileNumber, setEditMobileNumber] = useState("");

  // Confirmation Modal
  const [openStatusModal, setOpenStatusModal] = useState(false);
  const [statusTitle, setStatusTitle] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [openServerError, setOpenServerError] = useState(false);
  const [serverErrorMsg, setServerErrorMsg] = useState("");
    
  const [selectedCustomer, setSelectedCustomer ] = useState<Customer | null>(null);

 const showStatusModal = (title: string, message: string) => {
  setStatusTitle(title);
  setStatusMessage(message);
  setOpenStatusModal(true);
};
 
  const handleDeleteCustomer = async () => {
  if (!selectedCustomer?.id) return;

  try {
    const res = await fetch(`/api/customers/${selectedCustomer.id}`, {
      method: "DELETE",
    });

    const text = await res.text(); // 👈 safer than json()

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

    setCustomers((prev) =>
      prev.filter((c) => c.id !== selectedCustomer.id)
    );

    setOpenDel(false);
    setSelectedCustomer(null);
    showStatusModal("Success", "Customer deleted successfully!");
  } catch (err) {
    console.error(err);
    showStatusModal("Error", "Something went wrong deleting customer");
  }
};

  const handleReviewCustomer = () => {
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedEmail = email.trim();
    const trimmedMobileNumber = mobileNumber.trim();

    if (!trimmedFirstName || !trimmedLastName || !trimmedMobileNumber) {
      showStatusModal(
        "Incomplete Fields",
        "Please fill in all fields before continuing."
    );
      return;
    }

    // EMAIL VALIDATION
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (trimmedEmail && !emailRegex.test(trimmedEmail)) {
      setServerErrorMsg("Invalid email format");
      setOpenServerError(true);
      return;
    }

    if (!/^09\d{9}$/.test(trimmedMobileNumber)) {
      showStatusModal(
        "Invalid Mobile Number",
        "Mobile number must be 11 digits and start with 09."
      );
      return;
    }

    setOpenAdd(false);
    setOpenAddConfirm(true);
  };

  const handleCreateCustomer = async ({
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
    const res = await fetch("/api/admin/create-customer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        firstName,
        lastName,
        email,
        mobileNumber,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      showStatusModal("Error", data.error || "Failed to create customer");
      return;
    }

    showStatusModal("Success", "Customer created successfully!");

    loadCustomers();
    
    setOpenAddConfirm(false);
    setOpenAdd(false);

    setCustomers((prev) => [
      ...prev,
      data.customer,
    ]);

    setFirstName("");
    setLastName("");
    setEmail("");
    setMobileNumber("");
  };

  const handleUpdateCustomer = async () => {
  if (!selectedCustomer) return;

  try {
      const res = await fetch(
        `/api/customers/${selectedCustomer.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            firstName: editFirstName,
            lastName: editLastName,
            email: editEmail,
            mobileNumber: editMobileNumber,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        showStatusModal("Error", data.error || "Failed to update customer");
        return;
      }

      setCustomers((prev) =>
        prev.map((c) =>
          c.id === selectedCustomer.id
            ? {
                ...c,
                name: `${editFirstName} ${editLastName}`,
                email: editEmail,
                contactNumber: editMobileNumber,
              }
            : c
        )
      );

      showStatusModal("Success", "Customer updated successfully!");

      setOpenEdit(false);
      setOpenEditConfirm(false);
      setSelectedCustomer(null);

    } catch (error) {
      console.error(error);
      showStatusModal("Error", "Something went wrong");
    }
  };

  const router = useRouter();

  const loadCustomers = async () => {
      try {
        const res = await fetch('/api/customers');

        if (res.status === 403) {
          router.push("/unauthorized");
        }
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Unable to load customers.');
          setCustomers([]);
        } else {
          setError('');
          setCustomers(data.customers || []);
        }
      } catch (e) {
        setError('Unable to load customers.');
      }

      setLoading(false);
    };

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        const res = await fetch('/api/user/role')
        const data = await res.json()

        if (!['OWNER', 'RECEPTIONIST'].includes(data.role)) {
          router.push('/unauthorized')
          return
        }

      loadCustomers();
    }

    init()
  }, [router]);
    
  // Search and Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'CASUAL' | 'REGULAR'>('ALL');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | ''>('');

  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  const filteredCustomers = customers
    .filter((customer) => {
      const searchValue = searchTerm.toLowerCase();

      const matchesSearch =
        (customer.name || '').toLowerCase().includes(searchValue) ||
        (customer.email || '').toLowerCase().includes(searchValue) ||
        (customer.contactNumber || '').toLowerCase().includes(searchValue) ||
        (customer.customerCode || '').toLowerCase().includes(searchValue);

      const matchesType =
        typeFilter === 'ALL' ||
        customer.type.toUpperCase() === typeFilter;

      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      if (sortOrder === 'asc') return a.name.localeCompare(b.name);
      if (sortOrder === 'desc') return b.name.localeCompare(a.name);
      return 0;
    });

    const paginatedCustomers = filteredCustomers.slice(
      (page - 1) * itemsPerPage,
      page * itemsPerPage
    );

    const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);


  const handleExportCSV = () => {
    const headers = ['ID', 'Type', 'Name', 'Contact Number', 'Email', 'Total Appointments', 'Total Spent'];
    const rows = customers.map((c, idx) => [
      String(idx + 1).padStart(3, '0'),
      c.type,
      c.name,
      c.contactNumber,
      c.email,
      c.totalAppointments,
      c.totalSpent,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'customers.csv';
    link.click();
  };
  
  return (
      <Box sx={{ flex: 1, p: 4, backgroundColor: '#fff' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
          {/*}
          <Button
            component={Link}
            href="/"
            startIcon={<ArrowBackIosNewIcon />}
            sx={{ textTransform: 'none', color: '#000' }}
          >
            Back to home
          </Button>
          */}
          <Typography variant="h3" sx={{ mb: 0, fontWeight: 700 }}>
            Customers
          </Typography>
          <Box sx={{ width: 112 }} />
        </Box>

        {/* SEARCH, FILTER, ADD ROW */}
        <Box sx={{ display: 'flex', gap: 2, mb: 4, alignItems: 'center' }}>
          <TextField
            placeholder="Search Customer..."
            size="small"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#999' }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ flex: 1, maxWidth: 300 }}
          />
          <TextField
            select
            size="small"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as 'ALL' | 'CASUAL' | 'REGULAR');
              setPage(1);
            }}
            sx={{ width: 150, bgcolor: '#fff' }}
          >
            <MenuItem value="ALL">All</MenuItem>
            <MenuItem value="CASUAL">Casual</MenuItem>
            <MenuItem value="REGULAR">Regular</MenuItem>
          </TextField>

          {/* Sort Order */}
          <TextField
            select
            size="small"
            value={sortOrder}
            onChange={(e) => {
              setSortOrder(e.target.value as 'asc' | 'desc' | '');
              setPage(1);
            }}
            sx={{ width: 200, bgcolor: '#fff' }}
            slotProps={{
              select: {
                displayEmpty: true,
                renderValue: (value) => {
                  if (value === '') return <span style={{ color: '#000000' }}>Default Order</span>;
                  if (value === 'asc') return 'Name (A → Z)';
                  if (value === 'desc') return 'Name (Z → A)';
                },
              },
            }}
          >
            <MenuItem value="">Default Order</MenuItem>
            <MenuItem value="asc">Name (A → Z)</MenuItem>
            <MenuItem value="desc">Name (Z → A)</MenuItem>
          </TextField>
          <Box sx={{ flex: 1 }} />
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            onClick={() => setOpenAdd(true)}
            sx={{ textTransform: 'none' }}
          >
            Add
          </Button>
        </Box>

        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : customers.length === 0 ? (
          <Typography sx={{ textAlign: 'center', color: 'text.secondary' }}>
            No customers found.
          </Typography>
        ) : (
          <>
            <TableContainer component={Paper}>
              <Table>
                <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>ID</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Contact Number</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Total Appointments</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Total Spent</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedCustomers.map((customer, index) => (
                    <TableRow key={customer.id} sx={{ '&:hover': { backgroundColor: '#fafafa' } }}>
                      <TableCell>{customer.customerCode}</TableCell>
                      <TableCell sx={{ color: '#999' }}>{customer.type}</TableCell>
                      <TableCell>{customer.name}</TableCell>
                      <TableCell>{customer.contactNumber}</TableCell>
                      <TableCell>{customer.email}</TableCell>
                      <TableCell>{customer.totalAppointments}</TableCell>
                      <TableCell>₱ {customer.totalSpent}</TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => {
                            setSelectedCustomer(customer);

                            const names = customer.name.split(" ");

                            setEditFirstName(names[0] || "");
                            setEditLastName(names.slice(1).join(" ") || "");

                            setEditEmail(customer.email || "");
                            setEditMobileNumber(customer.contactNumber || "");

                            setOpenEdit(true);
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          color="error" 
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setOpenDel(true); 
                            }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* PAGINATION AND FOOTER */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 4 }}>
              <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>
                Showing 1 to {paginatedCustomers.length} of {filteredCustomers.length} Entries
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(_, value) => setPage(value)}
                  size="small"
                />
                <Button
                  startIcon={<GetAppIcon />}
                  size="small"
                  sx={{ textTransform: 'none', color: '#2196f3' }}
                  onClick={handleExportCSV}
                >
                  Export CSV
                </Button>
              </Box>
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
                  Add New Customer
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Account Type: Casual
                </Typography>
              </Box>
              <IconButton onClick={() => setOpenAdd(false)} size="small">
                <CloseIcon />
              </IconButton>
            </Box>

            <DialogContent sx={{ p: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
              placeholder="Juan"
              label={
                <>
                  First name <span style={{ color: 'red' }}>*</span>
                </>
              }
              fullWidth
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              slotProps={{
                htmlInput: {
                  maxLength: 50,
                },
              }}
              sx={{
                bgcolor: '#f6f6f6',
                borderRadius: 2,
              }}
            />

              <TextField
                placeholder="Dela Cruz"
                label={
                  <>
                    Last name <span style={{ color: 'red' }}>*</span>
                  </>
                }
                fullWidth
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                slotProps={{
                  htmlInput: {
                    maxLength: 50,
                  },
                }}
                sx={{ bgcolor: '#f6f6f6', borderRadius: 2 }}
              />

              <TextField
                placeholder="09123456789"
                label={
                  <>
                    Mobile Number <span style={{ color: 'red' }}>*</span>
                  </>
                }
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
                sx={{ bgcolor: '#f6f6f6', borderRadius: 2 }}
              />

              <TextField
                placeholder="juandelacruz@gmail.com"
                label="Email Address"
                fullWidth
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={
                  email.length !== 0 &&
                  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
                }
                helperText={
                  email.length !== 0 &&
                  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
                    ? "Please enter a valid email address"
                    : ""
                }
                slotProps={{
                  htmlInput: {
                    maxLength: 100,
                  }
                }}
                sx={{ bgcolor: '#f6f6f6', borderRadius: 2 }}
              />
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
                onClick={handleReviewCustomer}
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

        <Dialog
          open={openAddConfirm}
          onClose={() => setOpenAddConfirm(false)}
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
                  Add New Customer
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Account Type: Casual
                </Typography>
              </Box>
              <IconButton onClick={() => setOpenAddConfirm(false)} size="small">
                <CloseIcon />
              </IconButton>
            </Box>

            <DialogContent sx={{ p: 0 }}>
              <Typography sx={{ mb: 2, color: '#333' }}>
                Are you sure you want to Add New Customer?
              </Typography>
              <Typography sx={{ mb: 1, color: '#333' }}><strong>First Name:</strong> {firstName}</Typography>
              <Typography sx={{ mb: 1, color: '#333' }}><strong>Last Name:</strong> {lastName}</Typography>
              <Typography sx={{ mb: 1, color: '#333' }}><strong>Mobile Number:</strong> {mobileNumber}</Typography>
              <Typography sx={{ mb: 1, color: '#333' }}><strong>Email Address:</strong> {email}</Typography>
            </DialogContent>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mt: 4, mb: 2 }}>
              <Button
                onClick={() => {
                  setOpenAddConfirm(false);
                  setOpenAdd(true);
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
              <Button
                variant="contained"
                onClick={() =>
                  handleCreateCustomer({
                    firstName,
                    lastName,
                    email,
                    mobileNumber,
                  })
                }
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
      
      {/*Edit*/}
      <Dialog 
        open={openEdit} 
        onClose={() => setOpenEdit(false)} 
        maxWidth="sm" fullWidth
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
                  Edit Customer
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Account Type: Casual
                </Typography>
              </Box>
              <IconButton onClick={() => setOpenEdit(false)} size="small">
                <CloseIcon />
              </IconButton>
            </Box>

          <DialogContent sx={{ p: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label={
                <>
                  First Name <span style={{ color: 'red' }}>*</span>
                </>
              }
              fullWidth
              value={editFirstName}
              onChange={(e) => setEditFirstName(e.target.value)}
              slotProps={{
                htmlInput: {
                  maxLength: 50,
                },
              }}
              sx={{ bgcolor: '#f6f6f6', borderRadius: 2 }}
            />

            <TextField
              label={
                <>
                  Last Name <span style={{ color: 'red' }}>*</span>
                </>
              }
              fullWidth
              value={editLastName}
              onChange={(e) => setEditLastName(e.target.value)}
              slotProps={{
                htmlInput: {
                  maxLength: 50,
                },
              }}
              sx={{ bgcolor: '#f6f6f6', borderRadius: 2 }}
            />

            <TextField
              label={
                <>
                  Mobile Number <span style={{ color: 'red' }}>*</span>
                </>
              }
              fullWidth
              value={editMobileNumber}
              onChange={(e) => {
                  // Remove non-numeric characters
                const value = e.target.value.replace(/\D/g, '');

                // Limit to 11 digits
                if (value.length <= 11) {
                  setEditMobileNumber(value);
                }
              }}
              error={
                editMobileNumber.length > 0 &&
                !/^09\d{9}$/.test(editMobileNumber)
              }
              helperText={
                editMobileNumber.length > 0 &&
                !/^09\d{9}$/.test(editMobileNumber)
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
              
              sx={{ bgcolor: '#f6f6f6', borderRadius: 2 }}
            />

            <TextField
              label="Email"
              fullWidth
              value={editEmail}
              disabled
              sx={{ 
                bgcolor: '#f6f6f6', 
                borderRadius: 2,
                '& .MuiInputBase-input.Mui-disabled': {
                  WebkitTextFillColor: '#555',
                },
              }}
            />
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
                  Edit Customer Details
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Account Type: Casual
                </Typography>
              </Box>
              <IconButton onClick={() => setOpenEditConfirm(false)} size="small">
                <CloseIcon />
              </IconButton>
            </Box>

            <DialogContent sx={{ p: 0 }}>
              <Typography sx={{ mb: 2, color: '#333' }}>
                Are you sure you want to Modify Customer Details?
              </Typography>
              <Typography sx={{ mb: 1, color: '#333' }}><strong>First Name:</strong> {editFirstName}</Typography>
              <Typography sx={{ mb: 1, color: '#333' }}><strong>Last Name:</strong> {editLastName}</Typography>
              <Typography sx={{ mb: 1, color: '#333' }}><strong>Mobile Number:</strong> {editMobileNumber}</Typography>
              <Typography sx={{ mb: 1, color: '#333' }}><strong>Email Address:</strong> {editEmail}</Typography>
            </DialogContent>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mt: 4, mb: 2 }}>
              <Button
                onClick={() => {
                  setOpenEditConfirm(false);
                  setOpenEdit(true);
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
              <Button
                variant="contained"
                onClick={handleUpdateCustomer}
                sx={{
                  backgroundColor: '#000',
                  color: '#fff',
                  textTransform: 'none',
                  minWidth: 120,
                  py: 1.25,
                  ':hover': { backgroundColor: '#111' },
                }}
              >
                Update
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
        <Box
          sx={{
            m: 2,
            bgcolor: '#fff',
            borderRadius: 4,
            p: 3,
            pb: 2,
            width: 500,
            boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Delete Customer
          </Typography>

          <DialogContent
            sx={{
              p: 0,
              display: 'flex',
            flexDirection: 'column',
              gap: 2,
            }}
          >
            <Typography>
              Are you sure you want to delete
            </Typography>

            <Typography>
              <b>ID:</b> {selectedCustomer?.id}
            </Typography>

            <Typography>
              <b>Name:</b> {selectedCustomer?.name}
            </Typography>
          </DialogContent>

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 1,
              mt: 4,
              mb: 2,
            }}
          >
            <Button
              variant="contained"
              onClick={handleDeleteCustomer}
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
                Customer Management
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

      {/*Set Server Error Modal*/}
      <Dialog open={openServerError} onClose={() => setOpenServerError(false)}>
        <IconButton onClick={() => setOpenServerError(false)}
        sx={{ position: "absolute", right: 8, top: 8}}
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
            mt: 5
          }}
          >
          <ErrorIcon sx={{ fontSize: 80, color: "red"}} />
            {serverErrorMsg}
        </DialogContent>

      </Dialog>
    </Box>
  );
}
