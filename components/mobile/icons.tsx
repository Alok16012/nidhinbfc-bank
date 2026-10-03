/* Monochrome line icons for the mobile app — one stroke weight everywhere.
 * Colour comes from `c`, size from `s`, stroke width from `w`. */

type P = { c?: string; s?: number; w?: number };

const Svg = ({ c = "currentColor", s = 22, w = 1.8, children, fill = "none" }: P & { children: React.ReactNode; fill?: string }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill={fill} stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

export const BackIcon = (p: P) => <Svg {...p} w={p.w ?? 1.9}><path d="M19 12H5M11 6l-6 6 6 6" /></Svg>;
export const ArrowRight = (p: P) => <Svg {...p}><path d="M4 12h15M13 6l6 6-6 6" /></Svg>;
export const ChevronRight = (p: P) => <Svg {...p} w={p.w ?? 2.2}><path d="M9 18l6-6-6-6" /></Svg>;
export const ChevronDown = (p: P) => <Svg {...p} w={p.w ?? 2.2}><path d="M6 9l6 6 6-6" /></Svg>;
export const SearchIcon = (p: P) => <Svg {...p}><circle cx="11" cy="11" r="7.5" /><path d="M21 21l-4.6-4.6" /></Svg>;
export const BellIcon = (p: P) => <Svg {...p}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></Svg>;
export const CalendarIcon = (p: P) => <Svg {...p}><rect x="4" y="5" width="16" height="15" rx="2.5" /><path d="M8 3v4M16 3v4M4 10h16" /></Svg>;
export const ClockIcon = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></Svg>;
export const PhoneIcon = (p: P) => <Svg {...p}><path d="M21 16.4v2.9a1.9 1.9 0 0 1-2.1 1.9A18.8 18.8 0 0 1 2.8 5.1 1.9 1.9 0 0 1 4.7 3h2.9a1.9 1.9 0 0 1 1.9 1.6c.1.9.4 1.8.7 2.7a1.9 1.9 0 0 1-.4 2L8.6 10.5a15.2 15.2 0 0 0 5.9 5.9l1.2-1.2a1.9 1.9 0 0 1 2-.4c.9.3 1.8.6 2.7.7a1.9 1.9 0 0 1 1.6 1.9z" /></Svg>;
export const CheckIcon = (p: P) => <Svg {...p} w={p.w ?? 2.6}><path d="M5 12.5l4.5 4.5L19 7.5" /></Svg>;
export const PlusIcon = (p: P) => <Svg {...p} w={p.w ?? 2.2}><path d="M12 5v14M5 12h14" /></Svg>;
export const ShieldIcon = (p: P) => <Svg {...p}><path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.3-7.5 9.5-4.3-1.2-7.5-4.9-7.5-9.5V6z" /><path d="M8.8 12l2.2 2.2 4.2-4.2" /></Svg>;
export const HelpIcon = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M9.6 9.2a2.5 2.5 0 0 1 4.9.6c0 1.7-2.5 2-2.5 3.7M12 17h.01" /></Svg>;
export const InfoIcon = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5M12 7.8h.01" /></Svg>;
export const HistoryIcon = (p: P) => <Svg {...p}><path d="M3.5 12a8.5 8.5 0 1 0 2.5-6" /><path d="M3 4v4.5h4.5M12 7.5V12l3 2" /></Svg>;
export const GearIcon = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="3.2" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.3a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-2.8-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.5 15h-.3a2 2 0 1 1 0-4h.2A1.6 1.6 0 0 0 4.5 8.2l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-1.1V4a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 2.8 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7h.3a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.4 1z" /></Svg>;
export const WalletIcon = (p: P) => <Svg {...p}><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3" /><rect x="3.5" y="7.5" width="17" height="12" rx="2.5" /><path d="M16 13.5h2" /></Svg>;
export const EditIcon = (p: P) => <Svg {...p}><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" /><path d="M13.5 6.5l4 4" /></Svg>;
export const CloseIcon = (p: P) => <Svg {...p} w={p.w ?? 2.2}><path d="M6 6l12 12M18 6L6 18" /></Svg>;
export const CardIcon = (p: P) => <Svg {...p}><rect x="3" y="5.5" width="18" height="13" rx="2.5" /><path d="M3 10h18M7 15h4" /></Svg>;

/* Banking set, drawn to match. */
export const UsersIcon = (p: P) => <Svg {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14a6.5 6.5 0 0 1 3 6" /></Svg>;
export const UserIcon = (p: P) => <Svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4 20.5a8 8 0 0 1 16 0" /></Svg>;
export const UserPlusIcon = (p: P) => <Svg {...p}><circle cx="9.5" cy="8" r="3.8" /><path d="M2.5 20a7 7 0 0 1 14 0M19 8v6M16 11h6" /></Svg>;
export const PiggyIcon = (p: P) => <Svg {...p}><path d="M19 10.5c.9.2 1.8.9 2 2" /><path d="M5.5 9.5C6.6 7 9.1 5.5 12 5.5c4.1 0 7.5 2.9 7.5 6.5 0 1.9-.9 3.6-2.4 4.8V20h-3v-1.7a9 9 0 0 1-4.2 0V20h-3v-2.6A6.4 6.4 0 0 1 4.5 14H3v-4h2.5z" /><path d="M10 5.7V4.5a2 2 0 0 1 4 0v1.2" /><circle cx="15.5" cy="10.5" r=".6" /></Svg>;
export const CoinsIcon = (p: P) => <Svg {...p}><ellipse cx="9" cy="7" rx="5.5" ry="2.5" /><path d="M3.5 7v4c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5V7" /><path d="M9.5 16.4c.6.9 2.6 1.6 5 1.6 3 0 5.5-1.1 5.5-2.5v-4c0-1.4-2.5-2.5-5.5-2.5" /><path d="M20 15.5v4c0 1.4-2.5 2.5-5.5 2.5-2.4 0-4.4-.7-5.1-1.6" /></Svg>;
export const LoanIcon = (p: P) => <Svg {...p}><rect x="3" y="6" width="18" height="12.5" rx="2.5" /><circle cx="12" cy="12.25" r="2.6" /><path d="M6.5 9.5v.01M17.5 15v.01" /></Svg>;
export const BookIcon = (p: P) => <Svg {...p}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" /><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5M8.5 7.5h7M8.5 11h5" /></Svg>;
export const LedgerIcon = (p: P) => <Svg {...p}><rect x="4.5" y="3" width="15" height="18" rx="2.5" /><path d="M8.5 7.5h7M8.5 11.5h7M8.5 15.5h4" /></Svg>;
export const ChartIcon = (p: P) => <Svg {...p}><path d="M4 20V10M10 20V4M16 20v-7M21.5 20h-19" /></Svg>;
export const ReceiptIcon = (p: P) => <Svg {...p}><path d="M5.5 3h13v18l-2.6-1.6L13.3 21l-2.6-1.6L8.1 21l-2.6-1.6z" /><path d="M9 8h6M9 12h6M9 16h3" /></Svg>;
export const BuildingIcon = (p: P) => <Svg {...p}><path d="M3 21h18M5 21V5.5L12 3l7 2.5V21" /><path d="M9 9h.01M15 9h.01M9 13h.01M15 13h.01M10.5 21v-4h3v4" /></Svg>;
export const StaffIcon = (p: P) => <Svg {...p}><circle cx="12" cy="7.5" r="3.8" /><path d="M5 20.5a7 7 0 0 1 14 0" /><path d="M12 13.5l1.2 2.2L12 20l-1.2-4.3z" /></Svg>;
export const UploadIcon = (p: P) => <Svg {...p}><path d="M12 15.5V4M7 8.5l5-5 5 5M4 15v3.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V15" /></Svg>;
export const LogoutIcon = (p: P) => <Svg {...p}><path d="M14 4h3.5A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5H14M10 16.5L5.5 12 10 7.5M5.5 12H15" /></Svg>;
export const ArrowDownUpIcon = (p: P) => <Svg {...p}><path d="M7 4v16M3.5 16.5L7 20l3.5-3.5M17 20V4M13.5 7.5L17 4l3.5 3.5" /></Svg>;
export const RupeeIcon = (p: P) => <Svg {...p}><path d="M6.5 4h11M6.5 8.5h11M14 4c3.5 0 3.5 9-4 9H6.5l8 7" /></Svg>;
export const DesktopIcon = (p: P) => <Svg {...p}><rect x="3" y="4" width="18" height="12.5" rx="2" /><path d="M8.5 20.5h7M12 16.5v4" /></Svg>;
export const RefreshIcon = (p: P) => <Svg {...p}><path d="M20 11.5A8 8 0 0 0 5.6 6.6L4 8.5M4 4v4.5h4.5M4 12.5a8 8 0 0 0 14.4 4.9l1.6-1.9M20 20v-4.5h-4.5" /></Svg>;
