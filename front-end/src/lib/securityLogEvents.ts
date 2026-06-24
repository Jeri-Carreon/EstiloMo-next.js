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
   SERVICES
========================= */

export async function logServiceAdded(
  req: Request,
  user: UserLike,
  serviceName: string
) {
  const meta = getRequestMeta(req);

  await createSecurityLog({
    userId: user.id,
    userName: getUserName(user),
    section: "Services",
    action: `Added Service ${serviceName}`,
    ...meta,
  });
}

export async function logServiceEdited(
  req: Request,
  user: UserLike,
  serviceName: string
) {
  const meta = getRequestMeta(req);

  await createSecurityLog({
    userId: user.id,
    userName: getUserName(user),
    section: "Services",
    action: `Edited Service ${serviceName}`,
    ...meta,
  });
}

export async function logServiceArchived(
  req: Request,
  user: UserLike,
  serviceName: string
) {
  const meta = getRequestMeta(req);

  await createSecurityLog({
    userId: user.id,
    userName: getUserName(user),
    section: "Services",
    action: `Archived Service ${serviceName}`,
    ...meta,
  });
}