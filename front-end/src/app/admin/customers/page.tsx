'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
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
import DashboardIcon from '@mui/icons-material/Dashboard';
import PersonIcon from '@mui/icons-material/Person';
import BuildIcon from '@mui/icons-material/Build';
import GroupIcon from '@mui/icons-material/Group';
import EventIcon from '@mui/icons-material/Event';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import StarIcon from '@mui/icons-material/Star';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import DescriptionIcon from '@mui/icons-material/Description';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import SecurityIcon from '@mui/icons-material/Security';
import Avatar from '@mui/material/Avatar';
import Pagination from '@mui/material/Pagination';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { useRouter } from "next/navigation";

interface Customer {
  id: string;
  type: string;
  name: string;
  contactNumber: string;
  email: string;
  totalAppointments: number;
  totalSpent: number;
  createdAt: string;
}

export default function CustomersPage() {
  const { data: session, status } = useSession();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  // Add Modal
  const [openAdd, setOpenAdd] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");

  // Delete Modal
  const [openDel, setOpenDel] = useState(false);
  
  // Edit Modal
  const [openEdit, setOpenEdit] = useState(false);
  
  const [selectedCustomer, setSelectedCustomer ] = useState<Customer | null>(null);

 const handleDeleteCustomer = async () => {
  if (!selectedCustomer?.id) {
    console.log("No selected customer");
    return;
  }

  try {
    const res = await fetch(`/api/customers/${selectedCustomer.id}`, {
      method: "DELETE",
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Delete failed");
      return;
    }

    setCustomers((prev) =>
      prev.filter((c) => c.id !== selectedCustomer.id)
    );

    setOpenDel(false);
    setSelectedCustomer(null);
  } catch (err) {
    console.error(err);
    alert("Something went wrong deleting customer");
  }
};

  const handleCreateCustomer = async () => {
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
      alert(data.error || "Failed to create customer");
      return;
    }

    alert("Customer created!");

    setOpenAdd(false);

    setFirstName("");
    setLastName("");
    setEmail("");
    setMobileNumber("");

    location.reload();
  };

  const router = useRouter();

  

  useEffect(() => {
    if (status === "loading") return; // waits for status to go from loading to finished before deciding the role check logic below
    
    const role = (session?.user as { role?: string })?.role;
    
    // checks if user role is OWNER or RECEPTIONIST
    if (
      !session?.user?.email || 
      !["OWNER","RECEPTIONIST"].includes(role || "")
      ){
        router.push("/unauthorized");
        return;
      }

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

    loadCustomers();
  }, [session, status, router]); // session array = re-run useEffect whenever one of these changes

  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <Button
            startIcon={<TuneIcon />}
            sx={{ textTransform: 'none', color: '#666' }}
          >
            Filter
          </Button>
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
                      <TableCell>{String((page - 1) * itemsPerPage + index + 1).padStart(3, '0')}</TableCell>
                      <TableCell sx={{ color: '#999' }}>{customer.type}</TableCell>
                      <TableCell>{customer.name}</TableCell>
                      <TableCell>{customer.contactNumber}</TableCell>
                      <TableCell>{customer.email}</TableCell>
                      <TableCell>{customer.totalAppointments}</TableCell>
                      <TableCell>₱ {customer.totalSpent}</TableCell>
                      <TableCell>
                        <IconButton 
                          size="small" 
                          color="error" 
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setOpenDel(true); 
                            }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          color="primary"
                          onClick={() => setOpenEdit(true)}>
                          <EditIcon fontSize="small" />
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
        <Dialog open={openAdd} onClose={() => setOpenAdd(false)} maxWidth="sm" fullWidth>

          <DialogTitle>
            Add Customer
          </DialogTitle>

          <DialogContent
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              mt: 1,
            }}
          >
            <TextField
              label="First Name"
              fullWidth
              onChange={(e) => setFirstName(e.target.value)}
            />

            <TextField
              label="Last Name"
              fullWidth
              onChange={(e) => setLastName(e.target.value)}
            />

            <TextField
              label="Email"
              fullWidth
              onChange={(e) => setEmail(e.target.value)}
            />

            <TextField
              label="Mobile Number"
              fullWidth
              onChange={(e) => setMobileNumber(e.target.value)}
            />
          </DialogContent>

          <DialogActions>
            <Button onClick={() => setOpenAdd(false)}>
              Cancel
            </Button>

            <Button
              variant="contained"
              onClick={handleCreateCustomer}
            >
              Create Customer
            </Button>
          </DialogActions>
        </Dialog>

      {/*Delete*/}
      <Dialog open={openDel} onClose={() => setOpenDel(false)}>
        <DialogTitle>Delete Customer</DialogTitle>

        <DialogContent>
          Are you sure you want to delete{" "}
          <b>{selectedCustomer?.name}</b>?
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenDel(false)}>
            Cancel
          </Button>

          <Button
            color="error"
            variant="contained"
            onClick={handleDeleteCustomer}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      </Box>
  );
}
