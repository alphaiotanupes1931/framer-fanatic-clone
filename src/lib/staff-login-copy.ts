/**
 * Wording for the separate staff / board logins that page owners can hand out.
 *
 * Businesses call these "staff logins", community associations call them
 * "board logins", but the mechanism is identical: a separate email + password
 * that only ever unlocks the one page it was created for.
 */
export const STAFF_LOGIN_TYPES = ["business", "arts_org", "community_assoc"] as const;

export type StaffLoginType = (typeof STAFF_LOGIN_TYPES)[number];

export function supportsStaffLoginType(type: string): type is StaffLoginType {
  return (STAFF_LOGIN_TYPES as readonly string[]).includes(type);
}

export type StaffLoginCopy = {
  title: string;
  cardTitle: string;
  description: string;
  emailLabel: string;
  passwordLabel: string;
  placeholder: string;
  footer: string;
};

const BASE = {
  footer: "Team members sign in at planetbaltimore.com/business-login",
};

export const STAFF_LOGIN_COPY: Record<StaffLoginType, StaffLoginCopy> = {
  business: {
    ...BASE,
    title: "Staff login (optional)",
    cardTitle: "Employee login",
    description:
      "Create a separate staff email and password your employees can use to sign in and manage this business page, without ever using your own login. You can change or remove it later.",
    emailLabel: "Staff email",
    passwordLabel: "Staff password",
    placeholder: "e.g. team@joescafe.com",
  },
  arts_org: {
    ...BASE,
    title: "Staff login (optional)",
    cardTitle: "Staff login",
    description:
      "Create a separate staff email and password your employees can use to sign in and manage this arts organization page, without ever using your own login. You can change or remove it later.",
    emailLabel: "Staff email",
    passwordLabel: "Staff password",
    placeholder: "e.g. team@artsorg.com",
  },
  community_assoc: {
    ...BASE,
    title: "Board login (optional)",
    cardTitle: "Board login",
    description:
      "Create a separate board email and password your board members can use to sign in and manage this community association page, without ever using your own login. You can change or remove it later.",
    emailLabel: "Board email",
    passwordLabel: "Board password",
    placeholder: "e.g. board@ourassociation.org",
  },
};

export function staffLoginCopy(type: string): StaffLoginCopy {
  return supportsStaffLoginType(type) ? STAFF_LOGIN_COPY[type] : STAFF_LOGIN_COPY.business;
}

/** Path staff use to sign in to the one page they were given access to. */
export const STAFF_LOGIN_PATH = "/business-login";

/** Full, shareable sign-in link for staff. */
export function staffLoginUrl(): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://www.planetbaltimore.com";
  return `${origin}${STAFF_LOGIN_PATH}`;
}
