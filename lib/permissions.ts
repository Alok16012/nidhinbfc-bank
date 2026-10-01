// What a staff member is allowed to do. Admins can do everything; for other
// staff the admin ticks permissions on the Staff page and they are stored in
// staff.permissions. Branch, staff, settings and import pages stay admin-only.

export const PERMISSION_GROUPS = [
  {
    module: "Members",
    permissions: [
      { key: "members.view",   label: "View members" },
      { key: "members.manage", label: "Add & edit members" },
    ],
  },
  {
    module: "Deposits",
    permissions: [
      { key: "deposits.view",     label: "View deposits" },
      { key: "deposits.create",   label: "Open new deposits" },
      { key: "deposits.withdraw", label: "Withdrawals" },
      { key: "passbook.view",     label: "Passbook" },
      { key: "maturity.view",     label: "Maturity alerts" },
    ],
  },
  {
    module: "Loans",
    permissions: [
      { key: "loans.view",     label: "View loans" },
      { key: "loans.create",   label: "New loan application" },
      { key: "loans.approve",  label: "Approve loans" },
      { key: "loans.disburse", label: "Disburse loans" },
      { key: "loans.payment",  label: "Record loan payments" },
    ],
  },
  {
    module: "Collection",
    permissions: [
      { key: "collection.deposit", label: "Deposit collection" },
      { key: "collection.loan",    label: "Loan EMI collection" },
      { key: "collection.direct",  label: "Collect directly (no approval needed)" },
      { key: "collection.confirm", label: "Confirm staff collections" },
    ],
  },
  {
    module: "Accounting",
    permissions: [
      { key: "accounting.view",     label: "View books (Day Book, Ledger, Trial Balance)" },
      { key: "accounting.vouchers", label: "Create vouchers" },
    ],
  },
  {
    module: "Expenses",
    permissions: [
      { key: "expenses.view",   label: "View expenses" },
      { key: "expenses.create", label: "Add expenses" },
    ],
  },
  {
    module: "Reports",
    permissions: [
      { key: "reports.view", label: "View reports" },
    ],
  },
] as const;

export type Permission = (typeof PERMISSION_GROUPS)[number]["permissions"][number]["key"];

export const ALL_PERMISSIONS: Permission[] = PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.key));

// Starting points on the Staff form; the admin can tick or untick from there.
export const ROLE_PRESETS: { name: string; permissions: Permission[] }[] = [
  { name: "Branch Manager", permissions: ALL_PERMISSIONS },
  {
    name: "Cashier",
    permissions: [
      "members.view", "deposits.view", "deposits.withdraw", "passbook.view",
      "loans.view", "loans.payment",
      "collection.deposit", "collection.loan", "collection.direct",
    ],
  },
  {
    name: "Field Agent",
    permissions: ["members.view", "passbook.view", "collection.deposit", "collection.loan"],
  },
  {
    name: "Loan Officer",
    permissions: ["members.view", "members.manage", "loans.view", "loans.create", "loans.approve"],
  },
  {
    name: "Accountant",
    permissions: [
      "members.view", "deposits.view", "loans.view",
      "accounting.view", "accounting.vouchers", "expenses.view", "expenses.create", "reports.view",
    ],
  },
];

// Staff created before permissions existed keep the access their old role gave.
const LEGACY_MANAGER_ROLES = ["manager", "accountant", "loan_officer"];
const LEGACY_STAFF: Permission[] = [
  "members.view", "members.manage", "deposits.view", "deposits.create", "passbook.view", "maturity.view",
  "loans.view", "loans.create", "collection.deposit", "collection.loan", "expenses.view", "expenses.create",
];
const LEGACY_MANAGER: Permission[] = ALL_PERMISSIONS.filter((p) => p !== "loans.disburse");

export function resolvePermissions(stored: unknown, legacyRole: string | null | undefined): Permission[] {
  if (Array.isArray(stored)) {
    return stored.filter((p): p is Permission => ALL_PERMISSIONS.includes(p as Permission));
  }
  return LEGACY_MANAGER_ROLES.includes((legacyRole ?? "").toLowerCase()) ? LEGACY_MANAGER : LEGACY_STAFF;
}

// Which permission opens each page. "admin" pages are for admins only;
// pages not listed (dashboard, profile) are open to everyone signed in.
const ROUTE_RULES: { match: RegExp; need: Permission | "admin" }[] = [
  { match: /^\/(branches|staff|settings|import)(\/|$)/, need: "admin" },
  { match: /^\/members\/new$/,           need: "members.manage" },
  { match: /^\/members\/[^/]+\/edit$/,   need: "members.manage" },
  { match: /^\/members(\/|$)/,           need: "members.view" },
  { match: /^\/deposits\/new$/,          need: "deposits.create" },
  { match: /^\/deposits(\/|$)/,          need: "deposits.view" },
  { match: /^\/withdrawals(\/|$)/,       need: "deposits.withdraw" },
  { match: /^\/passbook(\/|$)/,          need: "passbook.view" },
  { match: /^\/maturity(\/|$)/,          need: "maturity.view" },
  { match: /^\/loans\/new$/,             need: "loans.create" },
  { match: /^\/loans(\/|$)/,             need: "loans.view" },
  { match: /^\/deposit-collection(\/|$)/, need: "collection.deposit" },
  { match: /^\/collection(\/|$)/,        need: "collection.loan" },
  { match: /^\/accounting(\/|$)/,        need: "accounting.view" },
  { match: /^\/expenses(\/|$)/,          need: "expenses.view" },
  { match: /^\/reports(\/|$)/,           need: "reports.view" },
];

export function routePermission(pathname: string): Permission | "admin" | null {
  return ROUTE_RULES.find((r) => r.match.test(pathname))?.need ?? null;
}
