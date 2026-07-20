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
import DialogTitle from "@mui/material/DialogTitle";
import DialogActions from "@mui/material/DialogActions";
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
  roleIds?: string[];
  roles?: StaffRole[];
  directAccessTabs?: string[];
  inheritedTabs?: string[];
  accessibleTabs?: string[];
  roleDisplayName?: string;
  roleIsArchived?: boolean;
  isActive: boolean;
  createdAt: string;
}

type RoleAccess = Record<AdminRole, string[]>;

type StaffRole = {
  id: string;
  role: string;
  displayName: string;
  isBuiltIn: boolean;
  isSystemRole?: boolean;
  systemKey?: string | null;
  isActive: boolean;
};

let roleFieldCounter = 0;

function createRoleFieldId() {
  roleFieldCounter += 1;
  return `role-field-${Date.now()}-${roleFieldCounter}`;
}

const DEFAULT_STAFF_ROLES: StaffRole[] = [
  { id: "system_owner", role: "OWNER", displayName: "Owner", isBuiltIn: true, isSystemRole: true, systemKey: "OWNER", isActive: true },
  { id: "system_receptionist", role: "RECEPTIONIST", displayName: "Receptionist", isBuiltIn: true, isSystemRole: true, systemKey: "RECEPTIONIST", isActive: true },
  { id: "system_barber", role: "BARBER", displayName: "Barber", isBuiltIn: true, isSystemRole: true, systemKey: "BARBER", isActive: true },
];

function RoleModuleSelection({
  selectedTabs,
  onToggle,
  disabled = false,
  inheritedTabs = [],
  inheritedSources = {},
  showSources = false,
}: {
  selectedTabs: string[];
  onToggle: (tabKey: string) => void;
  disabled?: boolean;
  inheritedTabs?: string[];
  inheritedSources?: Record<string, string[]>;
  showSources?: boolean;
}) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
        gap: 0.5,
      }}
    >
      {ADMIN_TABS.map((tab) => {
        const isDirect = selectedTabs.includes(tab.key);
        const sources = inheritedSources[tab.key] || [];
        const isInherited = inheritedTabs.includes(tab.key) || sources.length > 0;
        const helperText = showSources
          ? [
              isDirect ? "Direct user access" : null,
              sources.length > 0 ? `Inherited from: ${sources.join(", ")}` : null,
              !isDirect && !isInherited ? "No access" : null,
            ]
              .filter(Boolean)
              .join(" · ")
          : "";

        return (
          <Box key={tab.key}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={isDirect}
                  disabled={disabled}
                  onChange={() => onToggle(tab.key)}
                />
              }
              label={tab.label}
            />
            {helperText && (
              <Typography sx={{ ml: 4, mt: -0.5, fontSize: 12, color: "text.secondary" }}>
                {helperText}
              </Typography>
            )}
          </Box>
        );
      })}
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
  const [roleIds, setRoleIds] = useState<string[]>(["RECEPTIONIST"]);
  const [roleFieldIds, setRoleFieldIds] = useState<string[]>([
    createRoleFieldId(),
  ]);

  const [openEdit, setOpenEdit] = useState(false);
  const [openEditConfirm, setOpenEditConfirm] = useState(false);

  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editMobileNumber, setEditMobileNumber] = useState("");
  const [editRoleIds, setEditRoleIds] = useState<string[]>([]);
  const [editRoleFieldIds, setEditRoleFieldIds] = useState<string[]>([]);
  const [editDirectAccessTabs, setEditDirectAccessTabs] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

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
    (staffRole) => staffRole.systemKey !== "OWNER" && staffRole.systemKey !== "CUSTOMER"
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
  const roleById = new Map(staffRoles.map((staffRole) => [staffRole.id, staffRole]));

  const resolveRoleId = (value: unknown) => {
    const rawValue = typeof value === "string" ? value.trim() : "";
    if (!rawValue) return null;

    const normalized = rawValue.toLowerCase();
    const upper = rawValue.toUpperCase();
    const match = staffRoles.find(
      (staffRole) =>
        staffRole.id === rawValue ||
        staffRole.systemKey?.toUpperCase() === upper ||
        staffRole.role.toUpperCase() === upper ||
        staffRole.displayName.toLowerCase() === normalized
    );

    return match?.id ?? null;
  };

  const normalizeSelectedRoleIds = (values: unknown) => {
    const input = Array.isArray(values) ? values : [];
    return Array.from(
      new Set(
        input
          .map((value) => resolveRoleId(value))
          .filter((roleId): roleId is string => Boolean(roleId))
      )
    );
  };

  const getDefaultRoleId = () =>
    assignableStaffRoles.find((staffRole) => staffRole.systemKey === "RECEPTIONIST")
      ?.id ||
    assignableStaffRoles[0]?.id ||
    "";

  const getAvailableRolesForSelection = (
    selectedIds: string[],
    currentIndex: number
  ) => {
    const currentExistingRole = selectedUser?.roles?.find(
      (staffRole) => staffRole.id === selectedIds[currentIndex]
    );
    const roles = assignableStaffRoles.filter(
      (staffRole) =>
        staffRole.id === selectedIds[currentIndex] ||
        !selectedIds.includes(staffRole.id)
    );

    return currentExistingRole &&
      !roles.some((staffRole) => staffRole.id === currentExistingRole.id)
      ? [currentExistingRole, ...roles]
      : roles;
  };

  const setRoleIdAt = (
    selectedIds: string[],
    setter: (nextIds: string[]) => void,
    index: number,
    value: string
  ) => {
    setter(selectedIds.map((roleId, roleIndex) => (roleIndex === index ? value : roleId)));
  };

  const addRoleBox = (
    selectedIds: string[],
    setter: (nextIds: string[]) => void,
    fieldSetter?: (nextIds: string[]) => void,
    currentFieldIds: string[] = []
  ) => {
    const nextRole = assignableStaffRoles.find(
      (staffRole) => !selectedIds.includes(staffRole.id)
    );

    if (nextRole) {
      setter([...selectedIds, nextRole.id]);
      fieldSetter?.([...currentFieldIds, createRoleFieldId()]);
    }
  };

  const removeRoleBox = (
    selectedIds: string[],
    setter: (nextIds: string[]) => void,
    index: number,
    fieldSetter?: (nextIds: string[]) => void,
    currentFieldIds: string[] = []
  ) => {
    setter(selectedIds.filter((_, roleIndex) => roleIndex !== index));
    fieldSetter?.(currentFieldIds.filter((_, roleIndex) => roleIndex !== index));
  };

  const getInheritedAccessSources = (selectedIds: string[]) => {
    const sources: Record<string, string[]> = {};

    selectedIds.forEach((roleId) => {
      const staffRole = roleById.get(roleId);
      if (!staffRole || !staffRole.isActive) return;
      const tabs = roleAccess[staffRole.role] || [];
      tabs.forEach((tabKey) => {
        sources[tabKey] = sources[tabKey] || [];
        sources[tabKey].push(staffRole.displayName);
      });
    });

    return sources;
  };

  const getInheritedAccessTabs = (selectedIds: string[]) =>
    Object.keys(getInheritedAccessSources(selectedIds));

  const renderEffectiveAccessPreview = (
    selectedIds: string[],
    directTabs: string[] = []
  ) => {
    const inheritedTabs = getInheritedAccessTabs(selectedIds);
    const effectiveTabs = Array.from(new Set([...inheritedTabs, ...directTabs]));
    const labels = ADMIN_TABS.filter((tab) => effectiveTabs.includes(tab.key)).map(
      (tab) => tab.label
    );

    return (
      <Box sx={{ bgcolor: "#f6f6f6", borderRadius: 2, p: 1.5 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 0.5 }}>
          Effective Access
        </Typography>
        {labels.length > 0 ? (
          labels.map((label) => (
            <Typography key={label} sx={{ fontSize: 13, color: "#555" }}>
              {`\u2022 ${label}`}
            </Typography>
          ))
        ) : (
          <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
            No modules selected.
          </Typography>
        )}
      </Box>
    );
  };

  const toggleEditDirectAccessTab = (tabKey: string) => {
    setEditDirectAccessTabs((currentTabs) =>
      currentTabs.includes(tabKey)
        ? currentTabs.filter((tab) => tab !== tabKey)
        : [...currentTabs, tabKey]
    );
  };

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
        const activeRoleIds = new Set(
          data.roles
            .filter((staffRole: StaffRole) => staffRole.isActive)
            .map((staffRole: StaffRole) => staffRole.id)
        );
        const defaultRoleId =
          data.roles.find(
            (staffRole: StaffRole) =>
              staffRole.systemKey === "RECEPTIONIST" && staffRole.isActive
          )?.id ||
          data.roles.find((staffRole: StaffRole) => staffRole.isActive)?.id ||
          "";
        const activeRoleNames = new Set(
          data.roles
            .filter((staffRole: StaffRole) => staffRole.isActive)
            .map((staffRole: StaffRole) => staffRole.role)
        );

        setRoleIds((currentRoleIds) => {
          const currentCanonicalRoleIds = normalizeSelectedRoleIds(currentRoleIds);
          const nextRoleIds =
            currentCanonicalRoleIds.length > 0 &&
            currentCanonicalRoleIds.every((roleId) => activeRoleIds.has(roleId))
              ? currentCanonicalRoleIds
              : defaultRoleId
              ? [defaultRoleId]
              : [];
          setRoleFieldIds(nextRoleIds.map(() => createRoleFieldId()));
          return nextRoleIds;
        });
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
          roleIds: normalizeSelectedRoleIds(roleIds),
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
      const defaultRoleId = getDefaultRoleId();
      setRoleIds(defaultRoleId ? [defaultRoleId] : []);
      setRoleFieldIds(defaultRoleId ? [createRoleFieldId()] : []);

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
      !confirmPassword ||
      normalizeSelectedRoleIds(roleIds).length === 0
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
    if (isUpdating) return;

    const normalizedEditRoleIds = normalizeSelectedRoleIds(editRoleIds);

    if (normalizedEditRoleIds.length === 0) {
      showStatusModal("Incomplete Fields", "Select at least one unique role.");
      return;
    }

    setIsUpdating(true);

    try {
      const res = await fetch(`/api/admin/user-management/${selectedUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: editFirstName,
          lastName: editLastName,
          email: editEmail,
          mobileNumber: editMobileNumber,
          roleIds: normalizedEditRoleIds,
          directAccessTabs: editDirectAccessTabs,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        console.error("Update user failed", {
          status: res.status,
          response: data,
          payload: { roleIds: normalizedEditRoleIds },
        });
        showStatusModal(
          "Error",
          data?.error || data?.message || `Failed to update user (${res.status})`
        );
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["adminUsersData"] });
      const savedUser = data?.user;
      const savedRoleIds = normalizeSelectedRoleIds(
        savedUser?.roleIds?.length
          ? savedUser.roleIds
          : savedUser?.roles?.map((staffRole: StaffRole) => staffRole.id)
      );
      const nextRoleIds = savedRoleIds.length ? savedRoleIds : normalizedEditRoleIds;
      const nextDirectAccessTabs = Array.isArray(savedUser?.directAccessTabs)
        ? savedUser.directAccessTabs
        : editDirectAccessTabs;
      setUsers((prev) =>
        sortUsers(
          prev.map((user) =>
            user.id === selectedUser.id
              ? {
                  ...user,
                  ...(savedUser || {}),
                  name:
                    savedUser?.name ||
                    `${editFirstName} ${editLastName}`.trim(),
                  email: savedUser?.email || editEmail,
                  mobileNumber: savedUser?.mobileNumber || editMobileNumber,
                  roleIds: nextRoleIds,
                  directAccessTabs: nextDirectAccessTabs,
                  inheritedTabs: savedUser?.inheritedTabs,
                  accessibleTabs: savedUser?.accessibleTabs,
                  roles:
                    savedUser?.roles ||
                    nextRoleIds
                      .map((roleId) => roleById.get(roleId))
                      .filter((staffRole): staffRole is StaffRole => Boolean(staffRole)),
                  role: savedUser?.role || roleById.get(nextRoleIds[0])?.role || user.role,
                }
              : user
          )
        )
      );
      setSelectedUser(savedUser || null);
      setEditRoleIds(nextRoleIds);
      setEditRoleFieldIds(nextRoleIds.map(() => createRoleFieldId()));
      setEditDirectAccessTabs(nextDirectAccessTabs);

      setOpenEdit(false);
      setOpenEditConfirm(false);
      setSelectedUser(null);

      showStatusModal("Success", "User updated successfully!");
    } catch (error) {
      console.error("Update user request failed", error);
      showStatusModal("Error", "Something went wrong");
    } finally {
      setIsUpdating(false);
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
            id: trimmedRoleName,
            role: trimmedRoleName,
            displayName: trimmedRoleName,
            isBuiltIn: false,
            isSystemRole: false,
            systemKey: null,
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
      const createdRoleId =
        data.roles?.find((staffRole: StaffRole) => staffRole.role === trimmedRoleName)
          ?.id || trimmedRoleName;
      setRoleIds([createdRoleId]);
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

      setRoleIds((currentRoleIds) => {
        const archivedRoleId = staffRoles.find(
          (staffRole) => staffRole.role === archiveRole
        )?.id;
        const nextRoleIds = currentRoleIds.filter(
          (roleId) => roleId !== archivedRoleId
        );
        return nextRoleIds.length > 0
          ? nextRoleIds
          : getDefaultRoleId()
          ? [getDefaultRoleId()]
          : [];
      });
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

      const restoredRoleId =
        data.roles?.find((staffRole: StaffRole) => staffRole.role === restoreRole)
          ?.id || "";
      if (restoredRoleId) {
        setRoleIds([restoredRoleId]);
      }
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
    selectedUser?.roleIsArchived === true &&
    editRoleIds.some((roleId) => !roleById.get(roleId)?.isActive);

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
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                        {(user.roles?.length
                          ? user.roles
                          : [
                              {
                                id: user.role,
                                role: user.role,
                                displayName: user.roleDisplayName || user.role,
                                isBuiltIn: false,
                                isActive: !user.roleIsArchived,
                              },
                            ]
                        ).slice(0, 3).map((staffRole) => (
                          <Box
                            key={staffRole.id}
                            component="span"
                            sx={{
                              border: "1px solid #d7d7d7",
                              borderRadius: 1,
                              px: 0.75,
                              py: 0.25,
                              fontSize: 12,
                              bgcolor: staffRole.isActive ? "#f7f7f7" : "#fff3cd",
                            }}
                          >
                            {staffRole.displayName}
                            {staffRole.isActive ? "" : " (Archived)"}
                          </Box>
                        ))}
                        {(user.roles?.length || 0) > 3 && (
                          <Box component="span" sx={{ fontSize: 12, color: "#666" }}>
                            +{(user.roles?.length || 0) - 3}
                          </Box>
                        )}
                      </Box>
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
                              const assignedRoleIds =
                                user.roleIds?.length
                                  ? user.roleIds
                                  : user.roles?.map((staffRole) => staffRole.id) || [];
                              const nextEditRoleIds =
                                assignedRoleIds.length > 0
                                  ? normalizeSelectedRoleIds(assignedRoleIds)
                                  : [getDefaultRoleId()].filter(Boolean)
                              setEditRoleIds(nextEditRoleIds);
                              setEditRoleFieldIds(
                                nextEditRoleIds.map(() => createRoleFieldId())
                              );
                              setEditDirectAccessTabs(
                                Array.isArray(user.directAccessTabs)
                                  ? user.directAccessTabs
                                  : []
                              );

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
            width: { xs: "calc(100vw - 32px)", sm: "100%" },
            maxHeight: "90vh",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
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
            display: "flex",
            flexDirection: "column",
            height: "calc(90vh - 32px)",
            maxHeight: "calc(90vh - 32px)",
            minHeight: 0,
            overflow: "hidden",
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
            sx={{
              p: 1,
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              overflowX: "hidden",
            }}
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

            {roleIds.map((roleId, index) => (
              <Box
                key={roleFieldIds[index] || `role-${roleId}-${index}`}
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                <FormControl fullWidth sx={{ bgcolor: "#f6f6f6", borderRadius: 2 }}>
                  <InputLabel>
                    {index === 0 ? "Role" : `Role ${index + 1}`}{" "}
                    {index === 0 && <span style={{ color: "red" }}>*</span>}
                  </InputLabel>
                  <Select
                    value={roleId}
                    label={index === 0 ? "Role *" : `Role ${index + 1}`}
                    onChange={(e) =>
                      setRoleIdAt(roleIds, setRoleIds, index, e.target.value)
                    }
                  >
                    {getAvailableRolesForSelection(roleIds, index).map((staffRole) => (
                      <MenuItem
                        key={staffRole.id}
                        value={staffRole.id}
                        disabled={!staffRole.isActive || staffRole.systemKey === "OWNER"}
                      >
                        {staffRole.displayName}
                        {staffRole.isActive ? "" : " (Archived)"}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {index > 0 && (
                  <Button
                    onClick={() =>
                      removeRoleBox(
                        roleIds,
                        setRoleIds,
                        index,
                        setRoleFieldIds,
                        roleFieldIds
                      )
                    }
                    sx={{ textTransform: "none", minWidth: 88 }}
                  >
                    Remove
                  </Button>
                )}
              </Box>
            ))}

            <Button
              onClick={() =>
                addRoleBox(roleIds, setRoleIds, setRoleFieldIds, roleFieldIds)
              }
              disabled={roleIds.length >= assignableStaffRoles.length}
              sx={{ alignSelf: "flex-start", textTransform: "none", px: 0 }}
            >
              + New Role
            </Button>

            {renderEffectiveAccessPreview(roleIds)}
          </DialogContent>

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              gap: 1,
              mt: 2,
              pt: 2,
              pb: 1,
              flexShrink: 0,
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
        maxWidth="md"
        fullWidth
        sx={{
          "& .MuiPaper-root": {
            borderRadius: 4,
            bgcolor: "#fff",
            boxShadow: "0 10px 40px rgba(0,0,0,0.08)",
            display: "flex",
            flexDirection: "column",
            maxHeight: "90vh",
            overflow: "hidden",
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            p: 3,
            pb: 2,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Edit User Details
          </Typography>

          <IconButton onClick={() => setOpenEdit(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent
          dividers
          sx={{
            display: "flex",
            flex: "1 1 auto",
            flexDirection: "column",
            gap: 2,
            minHeight: 0,
            overflowY: "auto",
            p: 3,
          }}
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

            {editRoleIds.map((roleId, index) => (
              <Box
                key={editRoleFieldIds[index] || `edit-role-${roleId}-${index}`}
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                <FormControl fullWidth sx={{ bgcolor: "#f6f6f6", borderRadius: 2 }}>
                  <InputLabel>
                    {index === 0 ? "Role" : `Role ${index + 1}`}{" "}
                    {index === 0 && <span style={{ color: "red" }}>*</span>}
                  </InputLabel>

                  <Select
                    value={roleId}
                    label={index === 0 ? "Role *" : `Role ${index + 1}`}
                    onChange={(e) =>
                      setRoleIdAt(editRoleIds, setEditRoleIds, index, e.target.value)
                    }
                  >
                    {getAvailableRolesForSelection(editRoleIds, index).map(
                      (staffRole) => (
                        <MenuItem
                          key={staffRole.id}
                          value={staffRole.id}
                          disabled={!staffRole.isActive || staffRole.systemKey === "OWNER"}
                        >
                          {staffRole.displayName}
                          {staffRole.isActive ? "" : " (Archived)"}
                        </MenuItem>
                      )
                    )}
                  </Select>
                </FormControl>

                {index > 0 && (
                  <Button
                    onClick={() =>
                      removeRoleBox(
                        editRoleIds,
                        setEditRoleIds,
                        index,
                        setEditRoleFieldIds,
                        editRoleFieldIds
                      )
                    }
                    sx={{ textTransform: "none", minWidth: 88 }}
                  >
                    Remove
                  </Button>
                )}
              </Box>
            ))}

            <Button
              onClick={() =>
                addRoleBox(
                  editRoleIds,
                  setEditRoleIds,
                  setEditRoleFieldIds,
                  editRoleFieldIds
                )
              }
              disabled={editRoleIds.length >= assignableStaffRoles.length}
              sx={{ alignSelf: "flex-start", textTransform: "none", px: 0 }}
            >
              + New Role
            </Button>

            {selectedUserRoleIsArchived && (
              <Typography sx={{ mt: 1, fontSize: 12, color: "#9e6300" }}>
                This user&apos;s current role is archived. Select an active role before saving.
              </Typography>
            )}

            <Box sx={{ bgcolor: "#f6f6f6", borderRadius: 2, p: 1.5 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 0.5 }}>
                Direct Module Access
              </Typography>
              <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 1 }}>
                Checked modules are direct user grants. Inherited role access remains active even when unchecked here.
              </Typography>
              <RoleModuleSelection
                selectedTabs={editDirectAccessTabs}
                inheritedTabs={getInheritedAccessTabs(editRoleIds)}
                inheritedSources={getInheritedAccessSources(editRoleIds)}
                showSources
                onToggle={toggleEditDirectAccessTab}
              />
            </Box>

            {renderEffectiveAccessPreview(editRoleIds, editDirectAccessTabs)}
        </DialogContent>

        <DialogActions
          sx={{
            bgcolor: "background.paper",
            flexShrink: 0,
            justifyContent: "space-between",
            gap: 1,
            p: 3,
            position: "sticky",
            bottom: 0,
            zIndex: 1,
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
        </DialogActions>
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
              disabled={isUpdating}
              sx={{
                backgroundColor: "#000",
                color: "#fff",
                textTransform: "none",
                minWidth: 120,
                py: 1.25,
                ":hover": { backgroundColor: "#111" },
              }}
            >
              {isUpdating ? "Updating..." : "Update"}
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
