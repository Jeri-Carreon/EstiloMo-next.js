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
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import CloseIcon from '@mui/icons-material/Close';
import Pagination from '@mui/material/Pagination';

import SearchIcon from '@mui/icons-material/Search';
import TuneIcon from '@mui/icons-material/Tune';
import AddIcon from '@mui/icons-material/Add';
import GetAppIcon from '@mui/icons-material/GetApp';

import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';

interface Service {
  id: string;
  serviceCode: string;
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
  assignedStaff: {
    id: string;
    name: string;
  }[];
  isAvailable: boolean;
  sortOrder: number;
}

export default function ServicesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  const itemsPerPage = 5;

  // ADD MODAL
  const [openAdd, setOpenAdd] = useState(false);

  const [serviceName, setServiceName] = useState('');

  const [serviceDescription, setServiceDescription] = useState('');

  const [serviceDuration, setServiceDuration] = useState('');

  const [servicePrice, setServicePrice] = useState('');
  
  const [staffList, setStaffList] = useState<{ id: string; name: string }[]>([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [serviceAvailability, setServiceAvailability] = useState(true);

  // Filters
  const [filterAnchorEl, setFilterAnchorEl] =
  useState<null | HTMLElement>(null);


const [availabilityFilter, setAvailabilityFilter] = useState<'ALL' | 'AVAILABLE' | 'UNAVAILABLE'>('ALL');
const [sortOrderFilter, setSortOrderFilter] = useState<'ASC' | 'DESC'>('ASC');

const filterOpen = Boolean(filterAnchorEl);
  useEffect(() => {
  if (status === 'loading') return;
  if (!session) return;

  const loadStaff = async () => {
    const res = await fetch('/api/admin/staff', {
      cache: 'no-store',
    });

    const data = await res.json();
    setStaffList(data.staff || []);
  };

  loadStaff();
}, [session, status]);

  // DELETE
  const [openDel, setOpenDel] = useState(false);

  // EDIT
  const [openEdit, setOpenEdit] = useState(false);

  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const [editServiceName, setEditServiceName] = useState('');
  const [editServiceDescription, setEditServiceDescription] = useState('');
  const [editDuration, setEditDuration] = useState(0);
  const [editPrice, setEditPrice] = useState(0);
  const [editSelectedStaffIds, setEditSelectedStaffIds] = useState<string[]>([]);
  const [editAvailability, setEditAvailability] = useState(true);
  const [editOriginalSortOrder, setEditOriginalSortOrder] = useState(0);

  // STATUS MODAL
  const [openStatusModal, setOpenStatusModal] = useState(false);

  const [statusTitle, setStatusTitle] = useState('');

  const [statusMessage, setStatusMessage] = useState('');

  const showStatusModal = (
    title: string,
    message: string
  ) => {
    setStatusTitle(title);
    setStatusMessage(message);
    setOpenStatusModal(true);
  };

  useEffect(() => {
    if (status === 'loading') return;

    const role = (session?.user as { role?: string })?.role;

    if (
      !session?.user?.email ||
      !['OWNER', 'RECEPTIONIST'].includes(role || '')
    ) {
      router.push('/unauthorized');
      return;
    }

    const loadServices = async () => {
      try {
        const res = await fetch('/api/admin/services');

        if (res.status === 403) {
          router.push('/unauthorized');
          return;
        }

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Unable to load services.');
          setServices([]);
        } else {
          setServices(data.services || []);
        }
      } catch (err) {
        setError('Unable to load services.');
      }

      setLoading(false);
    };

    loadServices();
  }, [session, status, router]);

 const filteredServices = services.filter((service) => {
  const matchesSearch = service.name
    .toLowerCase()
    .includes(searchTerm.toLowerCase());

  const matchesAvailability =
    availabilityFilter === 'ALL'
      ? true
      : availabilityFilter === 'AVAILABLE'
      ? service.isAvailable
      : !service.isAvailable;

  return matchesSearch && matchesAvailability;
})
  .sort((a, b) =>
    sortOrderFilter === 'ASC'
      ? a.sortOrder - b.sortOrder
      : b.sortOrder - a.sortOrder
  );

  const paginatedServices = filteredServices.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const totalPages = Math.ceil(
    filteredServices.length / itemsPerPage
  );

  const handleCreateService = async ({
    name,
    description,
    durationMinutes,
    price,
    isAvailable,
  }: {
    name: string;
    description: string;
    durationMinutes: number;
    price: number;
    isAvailable: boolean;
  }) => {
  try {
    const res = await fetch(
      '/api/admin/services',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description,
          durationMinutes,
          price,
          assignedStaffIds: selectedStaffIds,
          isAvailable,
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      showStatusModal('Error', data.error || 'Failed to create service');
      return;
    }

    // await loadServices(); pagisipan if dadagdag pa toh


    setServices((prev) => [...prev, data.service]);

    setOpenAdd(false);

    setServiceName('');
    setServiceDescription('');
    setServiceDuration('');
    setServicePrice('');
    setSelectedStaffIds([]);
    setServiceAvailability(false);

    showStatusModal('Success', 'Service created successfully!');
  } catch (error) {
    showStatusModal('Error', 'Something went wrong.');
  }
};

  const handleReviewService = () => {
  const trimmedName = serviceName.trim();
  const trimmedDesc = serviceDescription.trim();

  if (
    !trimmedName ||
    !trimmedDesc ||
    !serviceDuration ||
    !servicePrice
  ) {
    showStatusModal(
      "Incomplete Fields",
      "Please complete all fields."
    );
    return;
  }

  const hasStaff = Array.isArray(selectedStaffIds) && selectedStaffIds.length > 0;

  if (serviceAvailability && !hasStaff) {
    showStatusModal(
      "Incomplete Fields",
      "Please assign at least 1 staff member."
    );
    return;
  }
  
  const duration = Number(serviceDuration);
  const price = Number(servicePrice);

  if (Number.isNaN(duration) || duration < 1 || duration > 999) {
    showStatusModal("Error", "Duration must only be 3 digits(Minutes)");
    return;
  }

  if (Number.isNaN(price) || price < 1 || price > 99999) {
    showStatusModal("Error", "Price must only be 5 digits(Pesos)");
    return;
  }

  setOpenAdd(false);

  handleCreateService({
    name: trimmedName,
    description: trimmedDesc,
    durationMinutes: duration,
    price: price,
    isAvailable: serviceAvailability,
  });
};
  const handleDeleteService = async () => {
    if (!selectedService) return;

    try {
      const res = await fetch(
        `/api/admin/services/${selectedService.id}`,
        {
          method: 'DELETE',
        }
      );

      const data = await res.json();

      if (!res.ok) {
        showStatusModal(
          'Error',
          data.error || 'Delete failed'
        );
        return;
      }

      setServices((prev) =>
        prev.filter((s) => s.id !== selectedService.id)
      );

      setOpenDel(false);

      showStatusModal(
        'Success',
        'Service deleted successfully!'
      );
    } catch (err) {
      showStatusModal(
        'Error',
        'Something went wrong.'
      );
    }
  };

  const handleUpdateService = async () => {
  if (!selectedService) return;

  const trimmedName = editServiceName.trim();
  const trimmedDesc = editServiceDescription.trim();

  // REQUIRED FIELDS
  if (
    !trimmedName ||
    !trimmedDesc ||
    !editDuration ||
    !editPrice ||
    !editOriginalSortOrder === null
  ) {
    showStatusModal(
      'Incomplete Fields',
      'Please complete all fields.'
    );
    return;
  }

  // MAX LENGTH CHECKS
  if (trimmedName.length > 50) {
    showStatusModal(
      'Error',
      'Service name must only be 50 characters.'
    );
    return;
  }

  if (trimmedDesc.length > 150) {
    showStatusModal(
      'Error',
      'Description must only be 150 characters.'
    );
    return;
  }

  // STAFF VALIDATION
  const hasStaff =
    Array.isArray(editSelectedStaffIds) &&
    editSelectedStaffIds.length > 0;

  if (editAvailability && !hasStaff) {
    showStatusModal(
      'Incomplete Fields',
      'Please assign at least 1 staff member.'
    );
    return;
  }

  // NUMBER VALIDATION
  if (
    Number.isNaN(editDuration) ||
    editDuration < 1 ||
    editDuration > 999
  ) {
    showStatusModal(
      'Error',
      'Duration must only be 3 digits (Minutes)'
    );
    return;
  }

  if (
    Number.isNaN(editPrice) ||
    editPrice < 1 ||
    editPrice > 99999
  ) {
    showStatusModal(
      'Error',
      'Price must only be 5 digits (Pesos)'
    );
    return;
  }

  try {
    const res = await fetch(
      `/api/admin/services/${selectedService.id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: trimmedName,
          description: trimmedDesc,
          durationMinutes: editDuration,
          price: editPrice,
          isAvailable: editAvailability,
          sortOrder: editOriginalSortOrder,
          assignedStaffIds: editSelectedStaffIds,
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      showStatusModal(
        'Error',
        data.error || 'Update failed'
      );
      return;
    }

    setServices((prev) =>
      prev.map((service) =>
        service.id === selectedService.id
          ? {
              ...service,
              name: trimmedName,
              description: trimmedDesc,
              durationMinutes: editDuration,
              price: editPrice,
              assignedStaff: staffList
                .filter((staff) =>
                  editSelectedStaffIds.includes(
                    staff.id
                  )
                )
                .map((staff) => ({
                  id: staff.id,
                  name: staff.name,
                })),
              isAvailable: editAvailability,
              sortOrder: editOriginalSortOrder,
            }
          : service
      )
    );

    setOpenEdit(false);

    showStatusModal(
      'Success',
      'Service updated successfully!'
    );
  } catch (err) {
    showStatusModal(
      'Error',
      'Something went wrong.'
    );
  }
};


  return (
    <Box
      sx={{
        flex: 1,
        p: 4,
        backgroundColor: '#fff',
      }}
    >
      {/* HEADER */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 4,
        }}
      >
        <Typography
          variant="h3"
          sx={{
            mb: 0,
            fontWeight: 700,
          }}
        >
          Services
        </Typography>

        <Box sx={{ width: 112 }} />
      </Box>

      {/* SEARCH */}
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          mb: 4,
          alignItems: 'center',
        }}
      >
        <TextField
          placeholder="Search Service..."
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
          sx={{
            flex: 1,
            maxWidth: 300,
          }}
        />

        <Button
          startIcon={<TuneIcon />}
          onClick={(e) =>
            setFilterAnchorEl(e.currentTarget)
          }
          sx={{
            textTransform: 'none',
            color: '#666',
          }}
        >
          Filter
        </Button>

        <Menu
          anchorEl={filterAnchorEl}
          open={filterOpen}
          onClose={() => setFilterAnchorEl(null)}
        >
          <MenuItem
            onClick={() => {
              setAvailabilityFilter('ALL');
              setFilterAnchorEl(null);
              setPage(1);
            }}
          >
            All Services
          </MenuItem>

          <MenuItem
            onClick={() => {
              setAvailabilityFilter('AVAILABLE');
              setFilterAnchorEl(null);
              setPage(1);
            }}
          >
            Available Services
          </MenuItem>

          <MenuItem
            onClick={() => {
              setAvailabilityFilter('UNAVAILABLE');
              setFilterAnchorEl(null);
              setPage(1);
            }}
          >
            Unavailable Services
          </MenuItem>

          <MenuItem
            onClick={() => {
              setSortOrderFilter('ASC');
              setFilterAnchorEl(null);
            }}
          >
            Sort by Sort Order (Asc)
          </MenuItem>

          <MenuItem
            onClick={() => {
              setSortOrderFilter('DESC');
              setFilterAnchorEl(null);
            }}
          >
            Sort by Sort Order (Desc)
          </MenuItem>
        </Menu>

        {availabilityFilter !== 'ALL' && (
        <Chip
          label={
            availabilityFilter === 'AVAILABLE'
              ? 'Available Services'
              : 'Unavailable Services'
          }
          onDelete={() => {
            setAvailabilityFilter('ALL');
            setPage(1);
          }}
          color="secondary"
          size="small"
          sx={{
            borderRadius: 2,
          }}
        />
      )}

        {sortOrderFilter !== 'ASC' && (
          <Chip
            label = "Sort Order : Desc"
            onDelete={() => {setSortOrderFilter('ASC')}}
            color="secondary"
            size="small"
            sx={{borderRadius: 2, }}
          />
        )}

        <Box sx={{ flex: 1 }} />

        <Button
          startIcon={<AddIcon />}
          variant="contained"
          onClick={() => setOpenAdd(true)}
          sx={{
              textTransform: 'none',
          }}
        >
        Add
        </Button>
      </Box>

      {/* ERROR */}
      {error && (
        <Typography
          color="error"
          sx={{ mb: 2 }}
        >
          {error}
        </Typography>
      )}

      {/* LOADING */}
      {loading ? (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            py: 6,
          }}
        >
          <CircularProgress />
        </Box>
      ) : services.length === 0 ? (
        <Typography
          sx={{
            textAlign: 'center',
            color: 'text.secondary',
          }}
        >
          No services found.
        </Typography>
      ) : (
        <>
          {/* TABLE */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead
                sx={{
                  backgroundColor: '#f5f5f5',
                }}
              >
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>
                    ID
                  </TableCell>

                  <TableCell sx={{ fontWeight: 700 }}>
                    Sort Order
                  </TableCell>

                  <TableCell sx={{ fontWeight: 700 }}>
                    Service Name
                  </TableCell>

                  <TableCell sx={{ fontWeight: 700 }}>
                    Duration
                  </TableCell>

                  <TableCell sx={{ fontWeight: 700 }}>
                    Price
                  </TableCell>

                  <TableCell sx={{ fontWeight: 700 }}>
                    Assigned Staff
                  </TableCell>

                  <TableCell sx={{ fontWeight: 700 }}>
                    Availability
                  </TableCell>

                  <TableCell sx={{ fontWeight: 700 }}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {paginatedServices.map(
                  (service, index) => (
                    <TableRow
                      key={service.id}
                      sx={{
                        '&:hover': {
                          backgroundColor: '#fafafa',
                        },
                      }}
                    >
                      <TableCell>
                        {service.serviceCode}
                      </TableCell>

                      <TableCell>
                        {service.sortOrder}
                      </TableCell>

                      <TableCell>
                        {service.name}
                      </TableCell>

                      <TableCell>
                        {service.durationMinutes} mins
                      </TableCell>

                      <TableCell>
                        ₱ {service.price}
                      </TableCell>

                      <TableCell>
                        {service.assignedStaff
                          .length > 0
                          ? service.assignedStaff
                              .map(
                                (staff) =>
                                  staff.name
                              )
                              .join(', ')
                          : 'No Staff'}
                      </TableCell>

                      <TableCell>
                        <Typography
                          sx={{
                            color:
                              service.isAvailable
                                ? 'success.main'
                                : 'error.main',
                            fontWeight: 600,
                          }}
                        >
                          {service.isAvailable
                            ? 'Available'
                            : 'Unavailable'}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            setSelectedService(
                              service
                            );

                            setOpenDel(true);
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>

                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => {
                            setSelectedService(
                              service
                            );

                            setEditOriginalSortOrder(
                              service.sortOrder
                            );

                            setEditServiceName(
                              service.name
                            );

                            setEditServiceDescription(
                              service.description || ''
                            )
                            setEditDuration(
                              service.durationMinutes
                            );

                            setEditPrice(
                              service.price
                            );

                            setEditSelectedStaffIds(
                              service.assignedStaff.map(s => s.id)
                            );

                            setEditAvailability(
                              service.isAvailable
                            );

                            setOpenEdit(true);
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* FOOTER */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mt: 4,
            }}
          >
            <Typography
              sx={{
                color: 'text.secondary',
                fontSize: 14,
              }}
            >
              Showing 1 to{' '}
              {paginatedServices.length} of{' '}
              {filteredServices.length}{' '}
              Entries
            </Typography>

            <Box
              sx={{
                display: 'flex',
                gap: 2,
                alignItems: 'center',
              }}
            >
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, value) =>
                  setPage(value)
                }
                size="small"
              />

            </Box>
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
        boxShadow:
            '0 10px 40px rgba(0,0,0,0.08)',
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
            <Typography
            variant="h6"
            sx={{ fontWeight: 700 }}
            >
            Add New Service
            </Typography>

            <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.5 }}
            >
            Service Management
            </Typography>
        </Box>

        <IconButton
            onClick={() => setOpenAdd(false)}
            size="small"
        >
            <CloseIcon />
        </IconButton>
        </Box>

        {/* CONTENT */}
        <DialogContent
        sx={{
            p: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            maxHeight: '60vh',
            overflowY: 'auto',
        }}
        >
        <TextField
            label={
              <>
                Service Name <span style={{ color: 'red' }}>*</span>
              </>}
            placeholder="Enter service name"
            fullWidth
            value={serviceName}
            onChange={(e) =>
            setServiceName(e.target.value)
            }
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
            label={
              <>
                Description <span style={{ color: 'red' }}>*</span>
              </>}
            placeholder="Enter description"
            fullWidth
            multiline
            minRows={3}
            value={serviceDescription}
            onChange={(e) =>
            setServiceDescription(e.target.value)
            }
            slotProps={{
                htmlInput: {
                  maxLength: 150,
                },
              }}
            sx={{
            bgcolor: '#f6f6f6',
            borderRadius: 2,
            }}
        />

        <TextField
            label={
              <>
                Duration (Minutes) <span style={{ color: 'red' }}>*</span>
              </>}
            type="number"
            fullWidth
            value={serviceDuration}
            onChange={(e) => {
            const value = e.target.value;

              // only allow digits + max 3 chars
              if (value.length <= 3) {
                setServiceDuration(value);
              }
            }}
            slotProps={{
              htmlInput: {
                inputMode: 'numeric',
                pattern: '[0-9]*',
                maxLength: 3,
              }
            }}
            sx={{
            bgcolor: '#f6f6f6',
            borderRadius: 2,
            }}
        />

        <TextField
            label={
              <>
                Price <span style={{ color: 'red' }}>*</span>
              </>}
            type="number"
            fullWidth
            value={servicePrice}
            onChange={(e) => {
            const value = e.target.value;

              // only allow digits + max 3 chars
              if (value.length <= 5) {
                setServicePrice(value);
              }
            }}
            slotProps={{
              htmlInput: {
                inputMode: 'numeric',
                pattern: '[0-9]*',
                maxLength: 5,
              }
            }}
            sx={{
            bgcolor: '#f6f6f6',
            borderRadius: 2,
            }}
        />

        <TextField
          select
          label="Availability"
          fullWidth
          value={serviceAvailability ? 'true' : 'false'}
          onChange={(e) =>
            setServiceAvailability(e.target.value === 'true')
          }
          slotProps={{
            select: {
              native: true,
            },
          }}
        >
          <option value="true">Available</option>
          <option value="false">Unavailable</option>
        </TextField>

        {serviceAvailability && (
          <Box>
          <Typography
            sx={{
              mb: 1,
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            Assign Barbers <span style={{ color: 'red' }}>*</span>
          </Typography>

          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              maxHeight: 160,
              overflowY: 'auto',
              p: 1,
              border: '1px solid #ddd',
              borderRadius: 2,
              bgcolor: '#f6f6f6',
            }}
          >
            {staffList.length === 0 ? (
              <Typography
                variant="body2"
                color="text.secondary"
              >
                No staff available
              </Typography>
            ) : (
              staffList.map((staff) => (
                <Box
                  key={staff.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedStaffIds.includes(staff.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedStaffIds((prev) => [
                          ...prev,
                          staff.id,
                        ]);
                      } else {
                        setSelectedStaffIds((prev) =>
                          prev.filter(
                            (id) => id !== staff.id
                          )
                        );
                      }
                    }}
                  />

                  <Typography>
                    {staff.name}
                  </Typography>
                </Box>
              ))
            )}
          </Box>
        </Box>
        )}

        </DialogContent>

        {/* BUTTONS */}
        <Box
        sx={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 1,
            mt: 3,
            mb: 2,
        }}
        >
        <Button
            onClick={() => setOpenAdd(false)}
            sx={{
            backgroundColor: '#6d6d6d',
            color: '#f7c948',
            textTransform: 'none',
            minWidth: 120,
            py: 1.25,
            ':hover': {
                backgroundColor: '#5a5a5a',
            },
            }}
        >
            Cancel
        </Button>

        <Button
            variant="contained"
            onClick={handleReviewService}
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
            Add
        </Button>
        </Box>
    </Box>
    </Dialog>
      {/* DELETE MODAL */}
      <Dialog
        open={openDel}
        onClose={() => setOpenDel(false)}
      >
        <Box
          sx={{
            p: 4,
            width: 400,
          }}
        >
          <Typography
            variant="h6"
            sx={{ fontWeight: 700 }}
          >
            Delete Service
          </Typography>

          <DialogContent sx={{ p: 0, mt: 2 }}>
            <Typography>
              Are you sure you want to delete:
            </Typography>

            <Typography sx={{ mt: 2 }}>
              <strong>Name:</strong>{' '}
              {selectedService?.name}
            </Typography>
          </DialogContent>

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              mt: 4,
            }}
          >
            <Button
              variant="contained"
              color="error"
              onClick={handleDeleteService}
            >
              Delete
            </Button>

            <Button
              onClick={() =>
                setOpenDel(false)
              }
            >
              Cancel
            </Button>
          </Box>
        </Box>
      </Dialog>

      {/* EDIT MODAL */}
      <Dialog
        open={openEdit}
        onClose={() => setOpenEdit(false)}
        maxWidth="sm"
        fullWidth
      >
        <Box sx={{ p: 4 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent:
                'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <Typography
              variant="h6"
              sx={{ fontWeight: 700 }}
            >
              Edit Service
            </Typography>

            <IconButton
              onClick={() =>
                setOpenEdit(false)
              }
            >
              <CloseIcon />
            </IconButton>
          </Box>

          <DialogContent
            sx={{
              p: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <TextField
              label={
              <>
                Sort Order <span style={{ color: 'red' }}>*</span>
              </>}
              type="number"
              value={editOriginalSortOrder ?? ''}
              onChange={(e) => {
                const value = e.target.value;

                if (value.length <= 3) {
                  setEditOriginalSortOrder(
                    value === '' ? 0 : Number(value)
                  );
                }
              }}
              fullWidth
              slotProps={{
                htmlInput: {
                  inputMode: 'numeric',
                  pattern: '[0-9]*',
                  maxLength: 3,
                },
              }}
            />
            <TextField
              label={
              <>
                Service Name <span style={{ color: 'red' }}>*</span>
              </>}
              value={editServiceName}
              onChange={(e) => {
                if (e.target.value.length <= 50) {
                  setEditServiceName(e.target.value);
                }
              }}
              fullWidth
              slotProps={{
                htmlInput: {
                  maxLength: 50,
                },
              }}
            />

            <TextField
             label={
              <>
                Description <span style={{ color: 'red' }}>*</span>
              </>}
              value={editServiceDescription}
              onChange={(e) => {
                if (e.target.value.length <= 150) {
                  setEditServiceDescription(e.target.value);
                }
              }}
              fullWidth
              multiline
              minRows={3}
              slotProps={{
                htmlInput: {
                  maxLength: 150,
                },
              }}
            />

            <TextField
              label={
              <>
                Duration <span style={{ color: 'red' }}>*</span>
              </>}
              type="number"
              value={editDuration || ''}
              onChange={(e) => {
                const value = e.target.value;

                if (value.length <= 3) {
                  setEditDuration(
                    value === '' ? 0 : Number(value)
                  );
                }
              }}
              fullWidth
              slotProps={{
                htmlInput: {
                  inputMode: 'numeric',
                  pattern: '[0-9]*',
                  maxLength: 3,
                },
              }}
            />

            <TextField
              label={
              <>
                Price <span style={{ color: 'red' }}>*</span>
              </>}
              type="number"
              value={editPrice || ''}
              onChange={(e) => {
                const value = e.target.value;

                if (value.length <= 5) {
                  setEditPrice(
                    value === '' ? 0 : Number(value)
                  );
                }
              }}
              fullWidth
              slotProps={{
                htmlInput: {
                  inputMode: 'numeric',
                  pattern: '[0-9]*',
                  maxLength: 5,
                },
              }}
            />

            <TextField
              select
              label="Availability"
              fullWidth
              value={editAvailability ? 'true' : 'false'}
              onChange={(e) =>
                setEditAvailability(e.target.value === 'true')
              }
              slotProps={{
                select: {
                  native: true,
                },
              }}
            >
              <option value="true">Available</option>
              <option value="false">Unavailable</option>
            </TextField>
          {editAvailability && (
            <Box>
              <Typography sx={{ mb: 1, fontWeight: 600, fontSize: 14 }}>
                Assign Barbers <span style={{ color: 'red '}}>*</span>
              </Typography>

              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                  maxHeight: 160,
                  overflowY: 'auto',
                  p: 1,
                  border: '1px solid #ddd',
                  borderRadius: 2,
                  bgcolor: '#f6f6f6',
                }}
              >
                {staffList.map((staff) => (
                  <Box
                    key={staff.id}
                    sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                  >
                    <input
                      type="checkbox"
                      checked={editSelectedStaffIds.includes(staff.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setEditSelectedStaffIds((prev) => [...prev, staff.id]);
                        } else {
                          setEditSelectedStaffIds((prev) =>
                            prev.filter((id) => id !== staff.id)
                          );
                        }
                      }}
                    />

                    <Typography>{staff.name}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
          </DialogContent>

          <Box
            sx={{
              display: 'flex',
              justifyContent:
                'space-between',
              mt: 4,
            }}
          >
            <Button
              onClick={() =>
                setOpenEdit(false)
              }
            >
              Cancel
            </Button>

            <Button
              variant="contained"
              onClick={handleUpdateService}
            >
              Save
            </Button>
          </Box>
        </Box>
      </Dialog>

      {/* STATUS MODAL */}
      <Dialog
        open={openStatusModal}
        onClose={() =>
          setOpenStatusModal(false)
        }
      >
        <Box sx={{ p: 4 }}>
          <Typography
            variant="h6"
            sx={{ fontWeight: 700 }}
          >
            {statusTitle}
          </Typography>

          <DialogContent sx={{ p: 0, mt: 2 }}>
            <Typography>
              {statusMessage}
            </Typography>
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
              onClick={() =>
                setOpenStatusModal(false)
              }
            >
              OK
            </Button>
          </Box>
        </Box>
      </Dialog>
    </Box>
  );
}