'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from "@tanstack/react-query";

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
import { Image } from "@mui/icons-material";

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
  imageUrl?: string | null;
}

async function uploadServiceImage(file: File) {
  const uploadFormData = new FormData();
  uploadFormData.append("file", file);
  uploadFormData.append("bucket", "service-images");

  const uploadRes = await fetch("/api/upload", {
    method: "POST",
    body: uploadFormData,
  });

  const uploadData = await uploadRes.json();

  if (!uploadRes.ok || !uploadData.url) {
    throw new Error(uploadData.error || "Failed to upload service image.");
  }

  return uploadData.url as string;
}

export default function ServicesPage() {
  const router = useRouter();

  const [services, setServices] = useState<Service[]>([]);
  const queryClient = useQueryClient();

  // session
  const [loading, setLoading] = useState(true);
  const supabase = createClient()
  const [error, setError] = useState('');

  const [openAdd, setOpenAdd] = useState(false);
  const [serviceName, setServiceName] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [serviceDuration, setServiceDuration] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [staffList, setStaffList] = useState<{ id: string; name: string }[]>([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [serviceAvailability, setServiceAvailability] = useState(true);
  const [serviceImageFile, setServiceImageFile] = useState<File | null>(null);
  const [serviceImagePreview, setServiceImagePreview] = useState("");

  const [openEdit, setOpenEdit] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [editServiceName, setEditServiceName] = useState("");
  const [editServiceDescription, setEditServiceDescription] = useState("");
  const [editDuration, setEditDuration] = useState(0);
  const [editPrice, setEditPrice] = useState(0);
  const [editSelectedStaffIds, setEditSelectedStaffIds] = useState<string[]>([]);
  const [editAvailability, setEditAvailability] = useState(true);
  const [editOriginalSortOrder, setEditOriginalSortOrder] = useState(0);
  const [editServiceImageFile, setEditServiceImageFile] = useState<File | null>(null);
  const [editServiceImagePreview, setEditServiceImagePreview] = useState("");

  const [openImage, setOpenImage] = useState(false);
  const [imageToView, setImageToView] = useState("");

  const [openStatusModal, setOpenStatusModal] = useState(false);
  const [statusTitle, setStatusTitle] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [serviceFilter, setServiceFilter] = useState("ALL");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | "">("");
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState(false);

  const itemsPerPage = 5;

  const showStatusModal = (title: string, message: string) => {
    setStatusTitle(title);
    setStatusMessage(message);
    setOpenStatusModal(true);
  };

  useQuery({
    queryKey: ["adminServicesData"],
    queryFn: async () => {
      const res = await fetch("/api/admin/services", { cache: "no-store" });

      if (res.status === 403) {
        router.push("/unauthorized");
        return [];
      }

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Unable to load services.");
        setServices([]);
        return [];
      }

      setError("");
      setServices(data.services || []);
      setLoading(false);
      return data.services || [];
    },
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const loadServices = async () => {
      try {
        const res = await fetch('/api/admin/services')

        if (res.status === 403) {
          router.push('/unauthorized')
          return;
        }

        const data = await res.json()

        if (!res.ok) {
          setError(data.error || 'Unable to load services.')
          setServices([]);
        } else {
          setServices(data.services || [])
        }
      } catch (err) {
        setError('Unable to load services.')
      } finally {
        setLoading(false)
      }
    }

    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        const res = await fetch('/api/user/role')
        const data = await res.json()

        if (!['OWNER'].includes(data.role)) {
          router.push('/unauthorized')
          return
        }

        await loadServices()
      } catch (err) {
        console.error("Initialization failed:", err)
      }
    }
    init()
  }, [router]);

  useEffect(() => {
    const loadStaff = async () => {
      try {
        const res = await fetch("/api/admin/staff");
        const data = await res.json();
        setStaffList(data.staff || []);
      } catch (err) {
        console.error("Failed to load staff", err);
      }
    };

    loadStaff();
  }, []);

  const filteredServices = services
    .filter((service) => {
      const searchValue = searchTerm.toLowerCase();

      const matchesSearch =
        service.id.toLowerCase().includes(searchValue) ||
        service.serviceCode.toLowerCase().includes(searchValue) ||
        service.name.toLowerCase().includes(searchValue) ||
        service.isAvailable.toString().toLowerCase().includes(searchValue) ||
        service.assignedStaff.some((staff) =>
          staff.name.toLowerCase().includes(searchValue)
        );

      const matchesFilter =
        serviceFilter === "ALL" ||
        (serviceFilter === "AVAILABLE" && service.isAvailable) ||
        (serviceFilter === "UNAVAILABLE" && !service.isAvailable);

      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (sortOrder === "asc") return a.sortOrder - b.sortOrder;
      if (sortOrder === "desc") return b.sortOrder - a.sortOrder;
      return 0;
    });

  const paginatedServices = filteredServices.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const totalPages = Math.max(1, Math.ceil(filteredServices.length / itemsPerPage));

  const resetAddForm = () => {
    setServiceName("");
    setServiceDescription("");
    setServiceDuration("");
    setServicePrice("");
    setSelectedStaffIds([]);
    setServiceAvailability(true);
    setServiceImageFile(null);
    setServiceImagePreview("");
  };

  const handleCreateService = async () => {
    const trimmedName = serviceName.trim();
    const trimmedDesc = serviceDescription.trim();
    const duration = Number(serviceDuration);
    const price = Number(servicePrice);

    if (!trimmedName || !trimmedDesc || !serviceDuration || !servicePrice) {
      showStatusModal("Incomplete Fields", "Please complete all fields.");
      return;
    }

    if (serviceAvailability && selectedStaffIds.length < 1) {
      showStatusModal("Incomplete Fields", "Please assign at least 1 staff member.");
      return;
    }

    if (!serviceImageFile) {
      showStatusModal("Incomplete Fields", "Please upload a service image.");
      return;
    }

    if (Number.isNaN(duration) || duration < 1 || duration > 999) {
      showStatusModal("Error", "Duration must only be 3 digits (Minutes).");
      return;
    }

    if (Number.isNaN(price) || price < 1 || price > 99999) {
      showStatusModal("Error", "Price must only be 5 digits (Pesos).");
      return;
    }

    try {
      setSaving(true);

      const res = await fetch("/api/admin/services", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
          description: trimmedDesc,
          durationMinutes: duration,
          price,
          assignedStaffIds: selectedStaffIds,
          isAvailable: serviceAvailability,
          imageUrl: null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showStatusModal("Error", data.error || "Failed to create service.");
        return;
      }

      let createdService: Service = data.service;

      if (serviceImageFile) {
        const imageUrl = await uploadServiceImage(serviceImageFile);

        const updateRes = await fetch(`/api/admin/services/${createdService.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: createdService.name,
            description: createdService.description,
            durationMinutes: createdService.durationMinutes,
            price: createdService.price,
            isAvailable: createdService.isAvailable,
            sortOrder: createdService.sortOrder,
            assignedStaffIds: createdService.assignedStaff.map((staff) => staff.id),
            imageUrl,
          }),
        });

        const updateData = await updateRes.json();

        if (updateRes.ok) {
          createdService = updateData.service;
        }
      }

      await queryClient.invalidateQueries({ queryKey: ["adminServicesData"] });
      setServices((prev) => [...prev, createdService]);
      setOpenAdd(false);
      resetAddForm();
      showStatusModal("Success", "Service created successfully!");
    } catch (error) {
      console.error(error);
      showStatusModal("Error", "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateService = async () => {
    if (!selectedService) return;

    const trimmedName = editServiceName.trim();
    const trimmedDesc = editServiceDescription.trim();

    if (
      !trimmedName ||
      !trimmedDesc ||
      !editDuration ||
      !editPrice ||
      editOriginalSortOrder === null ||
      Number.isNaN(editOriginalSortOrder)
    ) {
      showStatusModal("Incomplete Fields", "Please complete all fields.");
      return;
    }

    if (editAvailability && editSelectedStaffIds.length < 1) {
      showStatusModal("Incomplete Fields", "Please assign at least 1 staff member.");
      return;
    }

    if (!selectedService.imageUrl && !editServiceImageFile) {
      showStatusModal("Incomplete Fields", "Please upload a service image.");
      return;
    }

    if (Number.isNaN(editDuration) || editDuration < 1 || editDuration > 999) {
      showStatusModal("Error", "Duration must only be 3 digits (Minutes).");
      return;
    }

    if (Number.isNaN(editPrice) || editPrice < 1 || editPrice > 99999) {
      showStatusModal("Error", "Price must only be 5 digits (Pesos).");
      return;
    }

    try {
      setSaving(true);

      let finalImageUrl = selectedService.imageUrl || null;

      if (editServiceImageFile) {
        finalImageUrl = await uploadServiceImage(editServiceImageFile);
      }

      const res = await fetch(`/api/admin/services/${selectedService.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
          description: trimmedDesc,
          durationMinutes: editDuration,
          price: editPrice,
          isAvailable: editAvailability,
          sortOrder: editOriginalSortOrder,
          assignedStaffIds: editSelectedStaffIds,
          imageUrl: finalImageUrl,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showStatusModal("Error", data.error || "Update failed.");
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["adminServicesData"] });
      setServices((prev) =>
        prev.map((service) =>
          service.id === selectedService.id ? data.service : service
        )
      );

      setOpenEdit(false);
      setSelectedService(null);
      setEditServiceImageFile(null);
      setEditServiceImagePreview("");
      showStatusModal("Success", "Service updated successfully!");
    } catch (error) {
      console.error(error);
      showStatusModal("Error", "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ flex: 1, p: 4, backgroundColor: "#fff" }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 4 }}>
        <Typography variant="h3" sx={{ mb: 0, fontWeight: 700 }}>
          Services
        </Typography>
        <Box sx={{ width: 112 }} />
      </Box>

      <Box sx={{ display: "flex", gap: 2, mb: 4, alignItems: "center" }}>
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
                  <SearchIcon sx={{ color: "#999" }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{ flex: 1, maxWidth: 300 }}
        />

        <TextField
          select
          size="small"
          value={serviceFilter}
          onChange={(e) => {
            setServiceFilter(e.target.value);
            setPage(1);
          }}
          sx={{ width: 170, bgcolor: "#fff" }}
        >
          <MenuItem value="ALL">ALL</MenuItem>
          <MenuItem value="AVAILABLE">Available Services</MenuItem>
          <MenuItem value="UNAVAILABLE">Unavailable Services</MenuItem>
        </TextField>

        <TextField
          select
          size="small"
          value={sortOrder}
          onChange={(e) => {
            setSortOrder(e.target.value as "asc" | "desc" | "");
            setPage(1);
          }}
          slotProps={{
            select: {
              displayEmpty: true,
              renderValue: (value) => {
                if (!value) return "Default Order";
                if (value === "asc") return "Sort Order (Asc)";
                return "Sort Order (Desc)";
              },
            },
          }}
          sx={{
            width: 240,
            bgcolor: "#fff",
            "& .MuiSelect-select": {
              display: "flex",
              alignItems: "center",
            },
          }}
        >
          <MenuItem value="">Default Order</MenuItem>
          <MenuItem value="asc">Sort Order (Asc)</MenuItem>
          <MenuItem value="desc">Sort Order (Desc)</MenuItem>
        </TextField>

        <Box sx={{ flex: 1 }} />

        <Button
          startIcon={<AddIcon />}
          variant="contained"
          onClick={() => setOpenAdd(true)}
          sx={{ textTransform: "none" }}
        >
          Add
        </Button>
      </Box>

      {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : services.length === 0 ? (
        <Typography sx={{ textAlign: "center", color: "text.secondary" }}>
          No services found.
        </Typography>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>ID</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Image</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Sort Order</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Service Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Duration</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Price</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Assigned Staff</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Availability</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {paginatedServices.map((service) => (
                  <TableRow key={service.id} sx={{ "&:hover": { backgroundColor: "#fafafa" } }}>
                    <TableCell>{service.serviceCode}</TableCell>
                    <TableCell>
                      {service.imageUrl ? (
                        <Box
                          component="img"
                          src={service.imageUrl}
                          alt={service.name}
                          onClick={() => {
                            setImageToView(service.imageUrl || "");
                            setOpenImage(true);
                          }}
                          sx={{
                            width: 70,
                            height: 45,
                            objectFit: "cover",
                            borderRadius: 1,
                            cursor: "pointer",
                            border: "1px solid #ddd",
                          }}
                        />
                      ) : (
                        <IconButton disabled>
                          <Image />
                        </IconButton>
                      )}
                    </TableCell>
                    <TableCell>{service.sortOrder}</TableCell>
                    <TableCell>{service.name}</TableCell>
                    <TableCell>{service.durationMinutes} mins</TableCell>
                    <TableCell>₱ {service.price}</TableCell>
                    <TableCell>
                      {service.assignedStaff.length > 0
                        ? service.assignedStaff.map((staff) => staff.name).join(", ")
                        : "No Staff"}
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ color: service.isAvailable ? "success.main" : "error.main", fontWeight: 600 }}>
                        {service.isAvailable ? "Available" : "Unavailable"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => {
                          setSelectedService(service);
                          setEditOriginalSortOrder(service.sortOrder);
                          setEditServiceName(service.name);
                          setEditServiceDescription(service.description || "");
                          setEditDuration(service.durationMinutes);
                          setEditPrice(service.price);
                          setEditSelectedStaffIds(service.assignedStaff.map((s) => s.id));
                          setEditAvailability(service.isAvailable);
                          setEditServiceImageFile(null);
                          setEditServiceImagePreview(service.imageUrl || "");
                          setOpenEdit(true);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 4 }}>
            <Typography sx={{ color: "text.secondary", fontSize: 14 }}>
              Showing {(page - 1) * itemsPerPage + 1} to {Math.min(page * itemsPerPage, filteredServices.length)} of {filteredServices.length} Entries
            </Typography>
            <Pagination count={totalPages} page={page} onChange={(_, value) => setPage(value)} size="small" />
          </Box>
        </>
      )}

      <Dialog open={openAdd} onClose={() => setOpenAdd(false)} maxWidth="sm" fullWidth>
        <Box sx={{ p: 4 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Add New Service</Typography>
            <IconButton onClick={() => setOpenAdd(false)} size="small"><CloseIcon /></IconButton>
          </Box>

          <DialogContent sx={{ p: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField label="Service Name *" fullWidth value={serviceName} onChange={(e) => setServiceName(e.target.value)} slotProps={{ htmlInput: { maxLength: 50 } }} />
            <TextField label="Description  *" fullWidth multiline minRows={3} value={serviceDescription} onChange={(e) => setServiceDescription(e.target.value)} slotProps={{ htmlInput: { maxLength: 150 } }} />
            <TextField label="Duration (Minutes)  *" type="number" fullWidth value={serviceDuration} onChange={(e) => e.target.value.length <= 3 && setServiceDuration(e.target.value)} />
            <TextField label="Price  *" type="number" fullWidth value={servicePrice} onChange={(e) => e.target.value.length <= 5 && setServicePrice(e.target.value)} />
            <TextField select label="Availability  *" fullWidth value={serviceAvailability ? "true" : "false"} onChange={(e) => setServiceAvailability(e.target.value === "true")}>
              <MenuItem value="true">Available</MenuItem>
              <MenuItem value="false">Unavailable</MenuItem>
            </TextField>

            <Button variant="outlined" component="label">
              Upload Service Image *
              <input
                hidden
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setServiceImageFile(file);
                  setServiceImagePreview(URL.createObjectURL(file));
                }}
              />
            </Button>

            {serviceImagePreview && (
              <Box>
                <Button
                  onClick={() => {
                    setImageToView(serviceImagePreview);
                    setOpenImage(true);
                  }}
                  sx={{
                    p: 0,
                    color: "#3b82f6",
                    textTransform: "none",
                    fontSize: 13,
                    mb: 1,
                  }}
                >
                  View Image
                </Button>

                <Box
                  component="img"
                  src={serviceImagePreview}
                  onClick={() => {
                    setImageToView(serviceImagePreview);
                    setOpenImage(true);
                  }}
                  sx={{
                    width: "100%",
                    height: 180,
                    objectFit: "cover",
                    borderRadius: 2,
                    border: "1px solid #ddd",
                    cursor: "pointer",
                  }}
                />
              </Box>
            )}

            {serviceAvailability && (
              <Box>
                <Typography sx={{ mb: 1, fontWeight: 600, fontSize: 14 }}>Assign Barbers</Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1, maxHeight: 160, overflowY: "auto", p: 1, border: "1px solid #ddd", borderRadius: 2 }}>
                  {staffList.map((staff) => (
                    <Box key={staff.id} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <input
                        type="checkbox"
                        checked={selectedStaffIds.includes(staff.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedStaffIds((prev) => [...prev, staff.id]);
                          else setSelectedStaffIds((prev) => prev.filter((id) => id !== staff.id));
                        }}
                      />
                      <Typography>{staff.name}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </DialogContent>

          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 3 }}>
            <Button onClick={() => setOpenAdd(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleCreateService} disabled={saving}>{saving ? "Saving..." : "Add"}</Button>
          </Box>
        </Box>
      </Dialog>

      <Dialog open={openEdit} onClose={() => setOpenEdit(false)} maxWidth="sm" fullWidth>
        <Box sx={{ p: 4 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Edit Service</Typography>
            <IconButton onClick={() => setOpenEdit(false)}><CloseIcon /></IconButton>
          </Box>

          <DialogContent sx={{ p: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField label="Sort Order" type="number" value={editOriginalSortOrder || ""} onChange={(e) => e.target.value.length <= 3 && setEditOriginalSortOrder(e.target.value === "" ? 0 : Number(e.target.value))} fullWidth />
            <TextField label="Service Name" value={editServiceName} onChange={(e) => e.target.value.length <= 50 && setEditServiceName(e.target.value)} fullWidth />
            <TextField label="Description" value={editServiceDescription} onChange={(e) => e.target.value.length <= 150 && setEditServiceDescription(e.target.value)} fullWidth multiline minRows={3} />
            <TextField label="Duration" type="number" value={editDuration || ""} onChange={(e) => e.target.value.length <= 3 && setEditDuration(e.target.value === "" ? 0 : Number(e.target.value))} fullWidth />
            <TextField label="Price" type="number" value={editPrice || ""} onChange={(e) => e.target.value.length <= 5 && setEditPrice(e.target.value === "" ? 0 : Number(e.target.value))} fullWidth />
            <TextField select label="Availability" fullWidth value={editAvailability ? "true" : "false"} onChange={(e) => setEditAvailability(e.target.value === "true")}>
              <MenuItem value="true">Available</MenuItem>
              <MenuItem value="false">Unavailable</MenuItem>
            </TextField>

            <Button variant="outlined" component="label">
              Upload New Image
              <input
                hidden
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setEditServiceImageFile(file);
                  setEditServiceImagePreview(URL.createObjectURL(file));
                }}
              />
            </Button>

            {editServiceImagePreview && (
              <Box>
                <Button
                  onClick={() => {
                    setImageToView(editServiceImagePreview);
                    setOpenImage(true);
                  }}
                  sx={{
                    p: 0,
                    color: "#3b82f6",
                    textTransform: "none",
                    fontSize: 13,
                    mb: 1,
                  }}
                >
                  View Image
                </Button>

                <Box
                  component="img"
                  src={editServiceImagePreview}
                  onClick={() => {
                    setImageToView(editServiceImagePreview);
                    setOpenImage(true);
                  }}
                  sx={{
                    width: "100%",
                    height: 180,
                    objectFit: "cover",
                    borderRadius: 2,
                    border: "1px solid #ddd",
                    cursor: "pointer",
                  }}
                />
              </Box>
            )}

            {editAvailability && (
              <Box>
                <Typography sx={{ mb: 1, fontWeight: 600, fontSize: 14 }}>Assign Barbers</Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1, maxHeight: 160, overflowY: "auto", p: 1, border: "1px solid #ddd", borderRadius: 2 }}>
                  {staffList.map((staff) => (
                    <Box key={staff.id} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <input
                        type="checkbox"
                        checked={editSelectedStaffIds.includes(staff.id)}
                        onChange={(e) => {
                          if (e.target.checked) setEditSelectedStaffIds((prev) => [...prev, staff.id]);
                          else setEditSelectedStaffIds((prev) => prev.filter((id) => id !== staff.id));
                        }}
                      />
                      <Typography>{staff.name}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </DialogContent>

          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 4 }}>
            <Button onClick={() => setOpenEdit(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleUpdateService} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </Box>
        </Box>
      </Dialog>

      <Dialog open={openImage} onClose={() => setOpenImage(false)} maxWidth="md" fullWidth>
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Service Image</Typography>
            <IconButton onClick={() => setOpenImage(false)}><CloseIcon /></IconButton>
          </Box>
          {imageToView && (
            <Box component="img" src={imageToView} sx={{ width: "100%", maxHeight: "75vh", objectFit: "contain", borderRadius: 2 }} />
          )}
        </Box>
      </Dialog>

      <Dialog open={openStatusModal} onClose={() => setOpenStatusModal(false)}>
        <Box sx={{ p: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{statusTitle}</Typography>
          <DialogContent sx={{ p: 0, mt: 2 }}><Typography>{statusMessage}</Typography></DialogContent>
          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 4 }}>
            <Button variant="contained" onClick={() => setOpenStatusModal(false)}>OK</Button>
          </Box>
        </Box>
      </Dialog>
    </Box>
  );
}
