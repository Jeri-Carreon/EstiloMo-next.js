export function isStrongPassword(password: string) {
  return (
    password.length >= 8 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[!@#$%^&*(),.?":{}|<>]/.test(password)
  );
}

export function getPasswordRequirementChecks(password: string) {
  return [
    {
      label: "At least 8 characters",
      met: password.length >= 8,
    },
    {
      label: "At least 1 lowercase letter",
      met: /[a-z]/.test(password),
    },
    {
      label: "At least 1 uppercase letter",
      met: /[A-Z]/.test(password),
    },
    {
      label: "At least 1 number",
      met: /\d/.test(password),
    },
    {
      label: "At least 1 special character",
      met: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    },
  ];
}
