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
import {
  ADMIN_TABS,
  DEFAULT_ROLE_TAB_ACCESS,
  type AdminRole,
} from "@/lib/adminTabs";

interface User {
  id: string;
  name: string;
  mobileNumber: string;
  email: string;
  role: string;
  roleDisplayName?: string;
  roleIsArchived?: boolean;
  isActive: boolean;
  createdAt: string;
}

type RoleAccess = Record<AdminRole, string[]>;

type StaffRole = {
  role: string;
  displayName: string;
  isBuiltIn: boolean;
  isActive: boolean;
};

const DEFAULT_STAFF_ROLES: StaffRole[] = [
  { role: "OWNER", displayName: "Owner", isBuiltIn: true, isActive: true },
  { role: "RECEPTIONIST", displayName: "Receptionist", isBuiltIn: true, isActive: true },
  { role: "BARBER", displayName: "Barber", isBuiltIn: true, isActive: true },
];

function RoleModuleSelection({
  selectedTabs,
  onToggle,
  disabled = false,
}: {
  selectedTabs: string[];
  onToggle: (tabKey: string) => void;
  disabled?: boolean;
}) {
  return (
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
              checked={selectedTabs.includes(tab.key)}
              disabled={disabled}
              onChange={() => onToggle(tab.key)}
            />
          }
          label={tab.label}
        />
      ))}
    </Box>
  );
}

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
  const [openAddRole, setOpenAddRole] = useState(false);
  const [roleAccessRole, setRoleAccessRole] = useState<AdminRole>("RECEPTIONIST");
  const [roleAccess, setRoleAccess] = useState<RoleAccess>({
    OWNER: DEFAULT_ROLE_TAB_ACCESS.OWNER,
    RECEPTIONIST: DEFAULT_ROLE_TAB_ACCESS.RECEPTIONIST,
    BARBER: DEFAULT_ROLE_TAB_ACCESS.BARBER,
  });
  const [staffRoles, setStaffRoles] = useState<StaffRole[]>(DEFAULT_STAFF_ROLES);
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleNameError, setNewRoleNameError] = useState("");
  const [newRoleTabs, setNewRoleTabs] = useState<string[]>([]);
  const [creatingRole, setCreatingRole] = useState(false);
  const [openArchiveRole, setOpenArchiveRole] = useState(false);
  const [archiveRole, setArchiveRole] = useState("");
  const [archiveChecking, setArchiveChecking] = useState(false);
  const [archiveConfirm, setArchiveConfirm] = useState(false);
  const [archiveBlockMessage, setArchiveBlockMessage] = useState("");
  const [archivedStaffRoles, setArchivedStaffRoles] = useState<StaffRole[]>([]);
  const [openRestoreRole, setOpenRestoreRole] = useState(false);
  const [restoreRole, setRestoreRole] = useState("");
  const [restoreChecking, setRestoreChecking] = useState(false);
  const [restoreConfirm, setRestoreConfirm] = useState(false);
  const [restoreBlockMessage, setRestoreBlockMessage] = useState("");

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

  const activeStaffRoles = staffRoles.filter((staffRole) => staffRole.isActive);
  const assignableStaffRoles = activeStaffRoles.filter(
    (staffRole) => staffRole.role !== "OWNER"
  );
  const archiveableStaffRoles = activeStaffRoles.filter(
    (staffRole) => !staffRole.isBuiltIn
  );
  const restorableStaffRoles = archivedStaffRoles.filter(
    (staffRole) => !staffRole.isBuiltIn && !staffRole.isActive
  );
  const selectedRestoreRoleName =
    restorableStaffRoles.find((staffRole) => staffRole.role === restoreRole)
      ?.displayName || restoreRole;

  const roleNameExists = (name: string) => {
    const normalizedName = name.trim().toLowerCase();

    if (!normalizedName) return false;

    return [
      "CUSTOMER",
      ...staffRoles.map((staffRole) => staffRole.role),
      ...archivedStaffRoles.map((staffRole) => staffRole.role),
    ].some((existingRole) => existingRole.toLowerCase() === normalizedName);
  };

  const getRoleNameError = (name: string) => {
    const trimmedName = name.trim();

    if (!trimmedName) return "Role name is required.";
    if (roleNameExists(trimmedName)) return "This role already exists.";

    return "";
  };

  const resetAddRoleForm = () => {
    setNewRoleName("");
    setNewRoleNameError("");
    setNewRoleTabs([]);
    setCreatingRole(false);
  };

  const resetArchiveRoleForm = () => {
    setArchiveRole("");
    setArchiveChecking(false);
    setArchiveConfirm(false);
    setArchiveBlockMessage("");
  };

  const resetRestoreRoleForm = () => {
    setRestoreRole("");
    setRestoreChecking(false);
    setRestoreConfirm(false);
    setRestoreBlockMessage("");
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
          OWNER: data.access.OWNER ?? DEFAULT_ROLE_TAB_ACCESS.OWNER,
          RECEPTIONIST:
            data.access.RECEPTIONIST ?? DEFAULT_ROLE_TAB_ACCESS.RECEPTIONIST,
          BARBER: data.access.BARBER ?? DEFAULT_ROLE_TAB_ACCESS.BARBER,
          ...data.access,
        });
      }

      if (Array.isArray(data.roles)) {
        setStaffRoles(data.roles);
        const activeRoleNames = new Set(
          data.roles
            .filter((staffRole: StaffRole) => staffRole.isActive)
            .map((staffRole: StaffRole) => staffRole.role)
        );

        setRole((currentRole) =>
          activeRoleNames.has(currentRole) ? currentRole : "RECEPTIONIST"
        );
        setRoleAccessRole((currentRole) =>
          activeRoleNames.has(currentRole) ? currentRole : "RECEPTIONIST"
        );
      }

      if (Array.isArray(data.archivedRoles)) {
        setArchivedStaffRoles(data.archivedRoles);
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
          setCurrentUserRole(data.role || "")

          if (!data.accessibleTabs?.includes("user-management")) {
            router.push('/unauthorized')
            return
          }

          await loadUsers(true)

          if (data.role === "OWNER") {
            await loadRoleAccess()
          }
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

  const toggleNewRoleAccessTab = (tabKey: string) => {
    setNewRoleTabs((prev) =>
      prev.includes(tabKey)
        ? prev.filter((key) => key !== tabKey)
        : [...prev, tabKey]
    );
  };

  const handleOpenAddRole = async () => {
    resetAddRoleForm();
    await loadRoleAccess();
    setOpenAddRole(true);
  };

  const handleOpenArchiveRole = async () => {
    resetArchiveRoleForm();
    await loadRoleAccess();
    setOpenArchiveRole(true);
  };

  const handleOpenRestoreRole = async () => {
    resetRestoreRoleForm();
    await loadRoleAccess();
    setOpenRestoreRole(true);
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

  const handleCreateRole = async () => {
    const trimmedRoleName = newRoleName.trim();
    const validationError = getRoleNameError(trimmedRoleName);

    if (validationError) {
      setNewRoleNameError(validationError);
      return;
    }

    try {
      setCreatingRole(true);

      const res = await fetch("/api/admin/role-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: trimmedRoleName,
          tabs: newRoleTabs,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setNewRoleNameError("This role already exists.");
          return;
        }

        showStatusModal("Error", data.error || "Failed to create role.");
        return;
      }

      if (Array.isArray(data.roles)) {
        setStaffRoles(data.roles);
      } else {
        setStaffRoles((prev) => [
          ...prev,
          {
            role: trimmedRoleName,
            displayName: trimmedRoleName,
            isBuiltIn: false,
            isActive: true,
          },
        ]);
      }

      if (Array.isArray(data.archivedRoles)) {
        setArchivedStaffRoles(data.archivedRoles);
      }

      setRoleAccess((prev) => ({
        ...prev,
        [trimmedRoleName]: data.tabs || newRoleTabs,
      }));
      setRole(trimmedRoleName);
      setOpenAddRole(false);
      resetAddRoleForm();
      showStatusModal("Success", "Role created successfully.");
    } catch {
      showStatusModal("Error", "Something went wrong creating the role.");
    } finally {
      setCreatingRole(false);
    }
  };

  const buildArchiveBlockMessage = (
    assignedUsers: { name: string }[],
    assignedUserCount: number
  ) => {
    const names = assignedUsers.map((user) => `\u2022 ${user.name}`).join("\n");
    const remainingCount = Math.max(assignedUserCount - assignedUsers.length, 0);
    const moreText =
      remainingCount > 0 ? `\n\n...and ${remainingCount} more users.` : "";

    return `Cannot archive role.\n\nCurrently assigned to:\n\n${names}${moreText}\n\nReassign these users before archiving the role.`;
  };

  const handleArchiveRole = async () => {
    if (!archiveRole) {
      showStatusModal("Error", "Select a role to archive.");
      return;
    }

    try {
      setArchiveChecking(true);
      setArchiveBlockMessage("");

      const res = await fetch("/api/admin/role-access", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "archive",
          role: archiveRole,
          confirm: archiveConfirm,
        }),
      });

      const data = await res.json();

      if (res.status === 409 && Array.isArray(data.assignedUsers)) {
        setArchiveConfirm(false);
        setArchiveBlockMessage(
          buildArchiveBlockMessage(
            data.assignedUsers,
            Number(data.assignedUserCount || data.assignedUsers.length)
          )
        );
        return;
      }

      if (!res.ok) {
        showStatusModal("Error", data.error || "Failed to archive role.");
        return;
      }

      if (!archiveConfirm && data.canArchive) {
        setArchiveConfirm(true);
        return;
      }

      if (Array.isArray(data.roles)) {
        setStaffRoles(data.roles);
      }

      if (Array.isArray(data.archivedRoles)) {
        setArchivedStaffRoles(data.archivedRoles);
      }

      setRole((currentRole) =>
        currentRole === archiveRole ? "RECEPTIONIST" : currentRole
      );
      setRoleAccessRole((currentRole) =>
        currentRole === archiveRole ? "RECEPTIONIST" : currentRole
      );
      setOpenArchiveRole(false);
      resetArchiveRoleForm();
      await loadRoleAccess();
      showStatusModal("Success", "Role archived successfully.");
    } catch {
      showStatusModal("Error", "Something went wrong archiving the role.");
    } finally {
      setArchiveChecking(false);
    }
  };

  const buildRestoreBlockMessage = (activeRole: {
    displayName?: string;
    role?: string;
  }) => {
    const roleName =
      activeRole.displayName || activeRole.role || selectedRestoreRoleName;

    return `Cannot restore role.\n\nAn active role named "${roleName}" already exists.\n\nRename or archive the active role before restoring this one.`;
  };

  const handleRestoreRole = async () => {
    if (!restoreRole) {
      showStatusModal("Error", "Select a role to restore.");
      return;
    }

    try {
      setRestoreChecking(true);
      setRestoreBlockMessage("");

      const res = await fetch("/api/admin/role-access", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "restore",
          role: restoreRole,
          confirm: restoreConfirm,
        }),
      });

      const data = await res.json();

      if (res.status === 409 && data.activeRole) {
        setRestoreConfirm(false);
        setRestoreBlockMessage(buildRestoreBlockMessage(data.activeRole));
        return;
      }

      if (!res.ok) {
        showStatusModal("Error", data.error || "Failed to restore role.");
        return;
      }

      if (!restoreConfirm && data.canRestore) {
        setRestoreConfirm(true);
        return;
      }

      if (Array.isArray(data.roles)) {
        setStaffRoles(data.roles);
      }

      if (Array.isArray(data.archivedRoles)) {
        setArchivedStaffRoles(data.archivedRoles);
      }

      setRole(restoreRole);
      setOpenRestoreRole(false);
      resetRestoreRoleForm();
      await loadRoleAccess();
      showStatusModal("Success", "Role restored successfully.");
    } catch {
      showStatusModal("Error", "Something went wrong restoring the role.");
    } finally {
      setRestoreChecking(false);
    }
  };

  const sortedUsers = sortUsers(users);

  const paginatedUsers = sortedUsers.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);
  const selectedUserRoleIsArchived =
    selectedUser?.role === editRole && selectedUser?.roleIsArchived === true;
  const editRoleOptions = selectedUserRoleIsArchived
    ? [
        {
          role: selectedUser.role,
          displayName: `${selectedUser.roleDisplayName || selectedUser.role} (Archived)`,
          isBuiltIn: false,
          isActive: false,
        },
        ...assignableStaffRoles,
      ]
    : assignableStaffRoles;

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
        {currentUserRole === "OWNER" && (
          <>
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

            <Button
              startIcon={<AddIcon />}
              variant="outlined"
              onClick={handleOpenAddRole}
              sx={{ textTransform: "none" }}
            >
              Add Role
            </Button>

            <Button
              variant="contained"
              onClick={handleOpenArchiveRole}
              sx={{
                textTransform: "none",
                backgroundColor: "#d32f2f",
                color: "#fff",
                ":hover": { backgroundColor: "#b71c1c" },
              }}
            >
              Archive Role
            </Button>

            <Button
              variant="contained"
              onClick={handleOpenRestoreRole}
              sx={{
                textTransform: "none",
                backgroundColor: "#2e7d32",
                color: "#fff",
                ":hover": { backgroundColor: "#1b5e20" },
              }}
            >
              Restore Role
            </Button>
          </>
        )}
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
                    <TableCell sx={{ color: user.roleIsArchived ? "#9e6300" : "#666" }}>
                      {user.roleDisplayName || user.role}
                      {user.roleIsArchived ? " (Archived)" : ""}
                    </TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>

                    <TableCell>
                      {currentUserRole === "OWNER" && (
                        <>
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
                        </>
                      )}
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
                {assignableStaffRoles.map((staffRole) => (
                  <MenuItem key={staffRole.role} value={staffRole.role}>
                    {staffRole.displayName}
                  </MenuItem>
                ))}
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
                {assignableStaffRoles.map((staffRole) => (
                  <MenuItem key={staffRole.role} value={staffRole.role}>
                    {staffRole.displayName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <RoleModuleSelection
              selectedTabs={roleAccess[roleAccessRole] || []}
              onToggle={toggleRoleAccessTab}
            />
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
        open={openAddRole}
        onClose={() => {
          if (!creatingRole) {
            setOpenAddRole(false);
            resetAddRoleForm();
          }
        }}
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
              Add Role
            </Typography>

            <IconButton
              onClick={() => {
                setOpenAddRole(false);
                resetAddRoleForm();
              }}
              disabled={creatingRole}
              size="small"
            >
              <CloseIcon />
            </IconButton>
          </Box>

          <DialogContent
            sx={{ p: 1, display: "flex", flexDirection: "column", gap: 2 }}
          >
            <TextField
              label={
                <>
                  Role Name <span style={{ color: "red" }}>*</span>
                </>
              }
              fullWidth
              value={newRoleName}
              onChange={(e) => {
                const nextName = e.target.value;
                setNewRoleName(nextName);
                setNewRoleNameError(
                  nextName.trim() ? getRoleNameError(nextName) : ""
                );
              }}
              onBlur={() => {
                const trimmedName = newRoleName.trim();
                setNewRoleName(trimmedName);
                setNewRoleNameError(trimmedName ? getRoleNameError(trimmedName) : "");
              }}
              error={Boolean(newRoleNameError)}
              helperText={newRoleNameError}
              disabled={creatingRole}
              slotProps={{ htmlInput: { maxLength: 50 } }}
              sx={{ bgcolor: "#f6f6f6", borderRadius: 2 }}
            />

            <RoleModuleSelection
              selectedTabs={newRoleTabs}
              onToggle={toggleNewRoleAccessTab}
              disabled={creatingRole}
            />
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
              onClick={() => {
                setOpenAddRole(false);
                resetAddRoleForm();
              }}
              disabled={creatingRole}
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
              onClick={handleCreateRole}
              disabled={
                creatingRole ||
                !newRoleName.trim() ||
                Boolean(newRoleNameError)
              }
              sx={{
                backgroundColor: "#000",
                color: "#fff",
                textTransform: "none",
                minWidth: 120,
                py: 1.25,
                ":hover": { backgroundColor: "#111" },
                "&.Mui-disabled": {
                  backgroundColor: "#777",
                  color: "#eee",
                },
              }}
            >
              {creatingRole ? "Creating..." : "Create Role"}
            </Button>
          </Box>
        </Box>
      </Dialog>

      <Dialog
        open={openArchiveRole}
        onClose={() => {
          if (!archiveChecking) {
            setOpenArchiveRole(false);
            resetArchiveRoleForm();
          }
        }}
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
              Archive Role
            </Typography>

            <IconButton
              onClick={() => {
                setOpenArchiveRole(false);
                resetArchiveRoleForm();
              }}
              disabled={archiveChecking}
              size="small"
            >
              <CloseIcon />
            </IconButton>
          </Box>

          <DialogContent
            sx={{ p: 1, display: "flex", flexDirection: "column", gap: 2 }}
          >
            <FormControl fullWidth sx={{ bgcolor: "#f6f6f6", borderRadius: 2 }}>
              <InputLabel>Role</InputLabel>
              <Select
                value={archiveRole}
                label="Role"
                disabled={archiveChecking || archiveConfirm}
                onChange={(e) => {
                  setArchiveRole(e.target.value);
                  setArchiveConfirm(false);
                  setArchiveBlockMessage("");
                }}
              >
                {archiveableStaffRoles.map((staffRole) => (
                  <MenuItem key={staffRole.role} value={staffRole.role}>
                    {staffRole.displayName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {archiveableStaffRoles.length === 0 && (
              <Typography sx={{ fontSize: 14, color: "text.secondary" }}>
                No active custom roles are available to archive.
              </Typography>
            )}

            {archiveBlockMessage && (
              <Typography sx={{ whiteSpace: "pre-wrap", color: "#9e6300" }}>
                {archiveBlockMessage}
              </Typography>
            )}

            {archiveConfirm && (
              <Typography sx={{ whiteSpace: "pre-wrap", color: "#333" }}>
                {`Archive role "${archiveRole}"?\n\nArchived roles cannot be assigned to new users.\n\nHistorical data referencing this role will be preserved.\n\nYou can restore this role later.`}
              </Typography>
            )}
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
              onClick={() => {
                setOpenArchiveRole(false);
                resetArchiveRoleForm();
              }}
              disabled={archiveChecking}
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
              onClick={handleArchiveRole}
              disabled={
                archiveChecking ||
                !archiveRole ||
                archiveableStaffRoles.length === 0
              }
              sx={{
                backgroundColor: "#d32f2f",
                color: "#fff",
                textTransform: "none",
                minWidth: 120,
                py: 1.25,
                ":hover": { backgroundColor: "#b71c1c" },
                "&.Mui-disabled": {
                  backgroundColor: "#9e9e9e",
                  color: "#eee",
                },
              }}
            >
              {archiveChecking
                ? "Checking..."
                : archiveConfirm
                ? "Archive"
                : "Archive Role"}
            </Button>
          </Box>
        </Box>
      </Dialog>

      <Dialog
        open={openRestoreRole}
        onClose={() => {
          if (!restoreChecking) {
            setOpenRestoreRole(false);
            resetRestoreRoleForm();
          }
        }}
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
              Restore Role
            </Typography>

            <IconButton
              onClick={() => {
                setOpenRestoreRole(false);
                resetRestoreRoleForm();
              }}
              disabled={restoreChecking}
              size="small"
            >
              <CloseIcon />
            </IconButton>
          </Box>

          <DialogContent
            sx={{ p: 1, display: "flex", flexDirection: "column", gap: 2 }}
          >
            <FormControl fullWidth sx={{ bgcolor: "#f6f6f6", borderRadius: 2 }}>
              <InputLabel>Archived Role</InputLabel>
              <Select
                value={restoreRole}
                label="Archived Role"
                disabled={
                  restoreChecking ||
                  restoreConfirm ||
                  restorableStaffRoles.length === 0
                }
                onChange={(e) => {
                  setRestoreRole(e.target.value);
                  setRestoreConfirm(false);
                  setRestoreBlockMessage("");
                }}
              >
                {restorableStaffRoles.map((staffRole) => (
                  <MenuItem key={staffRole.role} value={staffRole.role}>
                    {staffRole.displayName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {restorableStaffRoles.length === 0 && (
              <Typography sx={{ fontSize: 14, color: "text.secondary" }}>
                No archived roles available.
              </Typography>
            )}

            {restoreBlockMessage && (
              <Typography sx={{ whiteSpace: "pre-wrap", color: "#9e6300" }}>
                {restoreBlockMessage}
              </Typography>
            )}

            {restoreConfirm && (
              <Typography sx={{ whiteSpace: "pre-wrap", color: "#333" }}>
                {`Restore role "${selectedRestoreRoleName}"?\n\nThe role will become active again.\n\nIts previously saved module permissions will be restored automatically.`}
              </Typography>
            )}
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
              onClick={() => {
                setOpenRestoreRole(false);
                resetRestoreRoleForm();
              }}
              disabled={restoreChecking}
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
              onClick={handleRestoreRole}
              disabled={
                restoreChecking ||
                !restoreRole ||
                restorableStaffRoles.length === 0
              }
              sx={{
                backgroundColor: "#2e7d32",
                color: "#fff",
                textTransform: "none",
                minWidth: 120,
                py: 1.25,
                ":hover": { backgroundColor: "#1b5e20" },
                "&.Mui-disabled": {
                  backgroundColor: "#9e9e9e",
                  color: "#eee",
                },
              }}
            >
              {restoreChecking
                ? "Checking..."
                : restoreConfirm
                ? "Restore"
                : "Restore Role"}
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
                onChange={(e) => setEditRole(e.target.value)}
              >
                {editRoleOptions.map((staffRole) => (
                  <MenuItem
                    key={staffRole.role}
                    value={staffRole.role}
                    disabled={!staffRole.isActive}
                  >
                    {staffRole.displayName}
                  </MenuItem>
                ))}
              </Select>
              {selectedUserRoleIsArchived && (
                <Typography sx={{ mt: 1, fontSize: 12, color: "#9e6300" }}>
                  This user's current role is archived. Select an active role before saving.
                </Typography>
              )}
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
              disabled={selectedUserRoleIsArchived}
              sx={{
                backgroundColor: "#000",
                color: "#fff",
                textTransform: "none",
                minWidth: 120,
                py: 1.25,
                ":hover": { backgroundColor: "#111" },
                "&.Mui-disabled": {
                  backgroundColor: "#777",
                  color: "#eee",
                },
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
