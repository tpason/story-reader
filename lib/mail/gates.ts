export type EmailUser = {
  email: string | null;
  emailVerified?: boolean;
  emailVerifiedAt?: string | Date | null;
};

export function isEmailVerified(user: EmailUser) {
  if (typeof user.emailVerified === "boolean") return Boolean(user.email && user.emailVerified);
  return Boolean(user.email && user.emailVerifiedAt);
}

export function requireVerifiedEmail(user: EmailUser) {
  return isEmailVerified(user);
}
