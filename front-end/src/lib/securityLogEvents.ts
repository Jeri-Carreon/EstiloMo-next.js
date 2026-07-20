import { createSecurityLog, getRequestMeta } from "@/lib/securityLog";

type UserLike = {
  id: string;
  firstName: string;
  lastName: string;
};

function getUserName(user: UserLike) {
  return `${user.firstName} ${user.lastName}`;
}

/* =========================
   AUTHENTICATION
========================= */

export async function logLogin(req: Request, user: UserLike) {
  const meta = getRequestMeta(req);

  await createSecurityLog({
    userId: user.id,
    userName: getUserName(user),
    section: "Authentication",
    action: "Logged into the system",
    ...meta,
  });
}

export async function logSignup(req: Request, user: UserLike) {
  const meta = getRequestMeta(req);

  await createSecurityLog({
    userId: user.id,
    userName: getUserName(user),
    section: "Authentication",
    action: "Created account",
    ...meta,
  });
}

export async function logLogout(req: Request, user: UserLike) {
  const meta = getRequestMeta(req);

  await createSecurityLog({
    userId: user.id,
    userName: getUserName(user),
    section: "Authentication",
    action: "Logged out of the system",
    ...meta,
  });
}

export async function logFailedLogin(req: Request, email: string) {
  const meta = getRequestMeta(req);

  await createSecurityLog({
    userName: email,
    section: "Authentication",
    action: "Failed login attempt",
    ...meta,
  });
}

export async function logPasswordReset(req: Request, user: UserLike) {
  const meta = getRequestMeta(req);

  await createSecurityLog({
    userId: user.id,
    userName: getUserName(user),
    section: "Authentication",
    action: "Reset account password",
    ...meta,
  });
}

export async function logAccountLocked(req: Request, user: UserLike) {
  const meta = getRequestMeta(req);

  await createSecurityLog({
    userId: user.id,
    userName: getUserName(user),
    section: "Authentication",
    action: "Locked user account",
    ...meta,
  });
}

export async function logAccountUnlocked(req: Request, user: UserLike) {
  const meta = getRequestMeta(req);

  await createSecurityLog({
    userId: user.id,
    userName: getUserName(user),
    section: "Authentication",
    action: "Unlocked user account",
    ...meta,
  });
}

/* =========================
   APPOINTMENTS
========================= */

export async function logAppointmentCreated(
  req: Request,
  user: UserLike,
  appointmentCode: string
) {
  const meta = getRequestMeta(req);

  await createSecurityLog({
    userId: user.id,
    userName: getUserName(user),
    section: "Appointments",
    action: `Created Appointment ${appointmentCode}`,
    ...meta,
  });
}

export async function logAppointmentEdited(
  req: Request,
  user: UserLike,
  appointmentCode: string
) {
  const meta = getRequestMeta(req);

  await createSecurityLog({
    userId: user.id,
    userName: getUserName(user),
    section: "Appointments",
    action: `Edited Appointment ${appointmentCode}`,
    ...meta,
  });
}

export async function logAppointmentCancelled(
  req: Request,
  user: UserLike,
  appointmentCode: string
) {
  const meta = getRequestMeta(req);

  await createSecurityLog({
    userId: user.id,
    userName: getUserName(user),
    section: "Appointments",
    action: `Cancelled Appointment ${appointmentCode}`,
    ...meta,
  });
}

export async function logAppointmentNoShow(
  req: Request,
  user: UserLike,
  appointmentCode: string
) {
  const meta = getRequestMeta(req);

  await createSecurityLog({
    userId: user.id,
    userName: getUserName(user),
    section: "Appointments",
    action: `Marked Appointment ${appointmentCode} as No-show`,
    ...meta,
  });
}

export async function logAppointmentCompleted(
  req: Request,
  user: UserLike,
  appointmentCode: string
) {
  const meta = getRequestMeta(req);

  await createSecurityLog({
    userId: user.id,
    userName: getUserName(user),
    section: "Appointments",
    action: `Completed Appointment ${appointmentCode}`,
    ...meta,
  });
}

/* =========================
   CUSTOMERS
========================= */

export async function logCustomerCreated(
  req: Request,
  user: UserLike,
  customerName: string
) {
  const meta = getRequestMeta(req);

  await createSecurityLog({
    userId: user.id,
    userName: getUserName(user),
    section: "Customers",
    action: `Created Customer ${customerName}`,
    ...meta,
  });
}

export async function logCustomerUpdated(
  req: Request,
  user: UserLike,
  customerName: string
) {
  const meta = getRequestMeta(req);

  await createSecurityLog({
    userId: user.id,
    userName: getUserName(user),
    section: "Customers",
    action: `Updated Customer ${customerName}`,
    ...meta,
  });
}

export async function logCustomerDeactivated(
  req: Request,
  user: UserLike,
  customerName: string
) {
  const meta = getRequestMeta(req);

  await createSecurityLog({
    userId: user.id,
    userName: getUserName(user),
    section: "Customers",
    action: `Deactivated Customer ${customerName}`,
    ...meta,
  });
}

/* =========================
   STAFF
========================= */

export async function logBarberCreated(
  req: Request,
  user: UserLike,
  barberName: string
) {
  const meta = getRequestMeta(req);

  await createSecurityLog({
    userId: user.id,
    userName: getUserName(user),
    section: "Staff",
    action: `Created Barber ${barberName}`,
    ...meta,
  });
}

export async function logBarberUpdated(
  req: Request,
  user: UserLike,
  barberName: string
) {
  const meta = getRequestMeta(req);

  await createSecurityLog({
    userId: user.id,
    userName: getUserName(user),
    section: "Staff",
    action: `Updated Barber ${barberName}`,
    ...meta,
  });
}

export async function logScheduleUpdated(
  req: Request,
  user: UserLike,
  barberName: string
) {
  const meta = getRequestMeta(req);

  await createSecurityLog({
    userId: user.id,
    userName: getUserName(user),
    section: "Staff",
    action: `Updated Availability for ${barberName}`,
    ...meta,
  });
}

export async function logAfterServicePhotoUploaded(
  req: Request,
  user: UserLike,
  appointmentCode: string
) {
  const meta = getRequestMeta(req);

  await createSecurityLog({
    userId: user.id,
    userName: getUserName(user),
    section: "Appointments",
    action: `Uploaded After Service Photo for Appointment ${appointmentCode}`,
    ...meta,
  });
}

export async function logBarberAbsent(
  req: Request,
  user: UserLike,
  barberName: string,
  date: string
) {
  const meta = getRequestMeta(req);

  await createSecurityLog({
    userId: user.id,
    userName: getUserName(user),
    section: "Staff",
    action: `Marked ${barberName} absent on ${date}`,
    ...meta,
  });
}

export async function logBarberAvailable(
  req: Request,
  user: UserLike,
  barberName: string,
  date: string
) {
  const meta = getRequestMeta(req);

  await createSecurityLog({
    userId: user.id,
    userName: getUserName(user),
    section: "Staff",
    action: `Removed absence for ${barberName} on ${date}`,
    ...meta,
  });
}

/* =========================
   SALES
========================= */

export async function logSaleCreated(
  req: Request,
  user: UserLike,
  saleCode: string
) {
  const meta = getRequestMeta(req);

  await createSecurityLog({
    userId: user.id,
    userName: getUserName(user),
    section: "Sales",
    action: `Created Sale ${saleCode}`,
    ...meta,
  });
}

export async function logPaymentReceived(
  req: Request,
  user: UserLike,
  saleCode: string
) {
  const meta = getRequestMeta(req);

  await createSecurityLog({
    userId: user.id,
    userName: getUserName(user),
    section: "Sales",
    action: `Confirmed Payment for ${saleCode}`,
    ...meta,
  });
}

export async function logDiscountApplied(
  req: Request,
  user: UserLike,
  saleCode: string
) {
  const meta = getRequestMeta(req);

  await createSecurityLog({
    userId: user.id,
    userName: getUserName(user),
    section: "Sales",
    action: `Applied Discount to ${saleCode}`,
    ...meta,
  });
}

export async function logRefund(
  req: Request,
  user: UserLike,
  saleCode: string
) {
  const meta = getRequestMeta(req);

  await createSecurityLog({
    userId: user.id,
    userName: getUserName(user),
    section: "Sales",
    action: `Refunded ${saleCode}`,
    ...meta,
  });
}

export async function logSaleCancelled(
  req: Request,
  user: UserLike,
  saleCode: string
) {
  const meta = getRequestMeta(req);

  await createSecurityLog({
    userId: user.id,
    userName: getUserName(user),
    section: "Sales",
    action: `Cancelled Sale ${saleCode}`,
    ...meta,
  });
}

export async function logSaleDeleted(
  req: Request,
  user: UserLike,
  saleCode: string
) {
  const meta = getRequestMeta(req);

  await createSecurityLog({
    userId: user.id,
    userName: getUserName(user),
    section: "Sales",
    action: `Deleted Sale ${saleCode}`,
    ...meta,
  });
}

/* =========================
   LOYALTY CARD
========================= */

export async function logLoyaltyCardStatusUpdated(
  req: Request,
  user: UserLike,
  customerName: string,
  status: string
) {
  const meta = getRequestMeta(req);

  await createSecurityLog({
    userId: user.id,
    userName: getUserName(user),
    section: "Loyalty Card",
    action: `Updated Loyalty Card Status for ${customerName} to ${status}`,
    ...meta,
  });
}

export async function logLoyaltyStickerEarned(
  req: Request,
  user: UserLike,
  customerName: string,
  stickerNumber: number,
  saleCode: string
) {
  const meta = getRequestMeta(req);

  await createSecurityLog({
    userId: user.id,
    userName: getUserName(user),
    section: "Loyalty Card",
    action: `Customer ${customerName} earned Sticker ${stickerNumber} from ${saleCode}`,
    ...meta,
  });
}

export async function logLoyaltyRewardRedeemed(
  req: Request,
  user: UserLike,
  customerName: string,
  rewardType: string,
  saleCode: string
) {
  const meta = getRequestMeta(req);

  await createSecurityLog({
    userId: user.id,
    userName: getUserName(user),
    section: "Loyalty Card",
    action: `Customer ${customerName} redeemed ${rewardType} reward from ${saleCode}`,
    ...meta,
  });
}

/* =========================
   SYSTEM
========================= */

export async function logChatbotSettingsChanged(
  req: Request,
  user: UserLike
) {
  const meta = getRequestMeta(req);

  await createSecurityLog({
    userId: user.id,
    userName: getUserName(user),
    section: "System",
    action: "Updated Chatbot Settings",
    ...meta,
  });
}

export async function logBusinessSettingsUpdated(
  req: Request,
  user: UserLike
) {
  const meta = getRequestMeta(req);

  await createSecurityLog({
    userId: user.id,
    userName: getUserName(user),
    section: "System",
    action: "Updated Business Settings",
    ...meta,
  });
}

export async function logLoyaltySettingsUpdated(
  req: Request,
  user: UserLike
) {
  const meta = getRequestMeta(req);

  await createSecurityLog({
    userId: user.id,
    userName: getUserName(user),
    section: "System",
    action: "Updated Loyalty Settings",
    ...meta,
  });
}

/* =========================
   USERS AND SERVICES
========================= */

async function logManagedRecord(
  req: Request,
  user: UserLike,
  section: "Users" | "Services",
  action: string
) {
  await createSecurityLog({
    userId: user.id,
    userName: getUserName(user),
    section,
    action,
    ...getRequestMeta(req),
  });
}

export function logUserCreated(req: Request, user: UserLike, name: string) {
  return logManagedRecord(req, user, "Users", `Added User ${name}`);
}

export function logUserUpdated(req: Request, user: UserLike, name: string) {
  return logManagedRecord(req, user, "Users", `Edited User ${name}`);
}

export function logUserRolesUpdated(
  req: Request,
  user: UserLike,
  name: string,
  metadata: unknown
) {
  return createSecurityLog({
    userId: user.id,
    userName: getUserName(user),
    section: "Users",
    action: `Updated roles for ${name}`,
    metadata,
    ...getRequestMeta(req),
  });
}

export function logUserDirectAccessUpdated(
  req: Request,
  user: UserLike,
  name: string,
  metadata: unknown
) {
  return createSecurityLog({
    userId: user.id,
    userName: getUserName(user),
    section: "Users",
    action: `Updated direct module access for ${name}`,
    metadata,
    ...getRequestMeta(req),
  });
}

export function logUserAvailabilityChanged(req: Request, user: UserLike, name: string, available: boolean) {
  return logManagedRecord(req, user, "Users", `Made User ${name} ${available ? "Available" : "Unavailable"}`);
}

export function logServiceCreated(req: Request, user: UserLike, name: string) {
  return logManagedRecord(req, user, "Services", `Added Service ${name}`);
}

export function logServiceUpdated(req: Request, user: UserLike, name: string) {
  return logManagedRecord(req, user, "Services", `Edited Service ${name}`);
}

export function logServiceAvailabilityChanged(req: Request, user: UserLike, name: string, available: boolean) {
  return logManagedRecord(req, user, "Services", `Made Service ${name} ${available ? "Available" : "Unavailable"}`);
}

export function logServiceDeleted(req: Request, user: UserLike, name: string) {
  return logManagedRecord(req, user, "Services", `Deleted Service ${name}`);
}
