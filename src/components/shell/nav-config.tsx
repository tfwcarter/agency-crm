import {
  LayoutDashboard,
  Users,
  KanbanSquare,
  Target,
  FolderKanban,
  CalendarClock,
  Receipt,
  Bot,
  Workflow,
  Globe,
  Search,
  Gauge,
  Map,
  BarChart3,
  UserCog,
  FolderOpen,
  MonitorSmartphone,
  Settings,
  Phone,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  stub?: boolean;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Sales",
    items: [
      { label: "Clients", href: "/dashboard/clients", icon: Users },
      { label: "Pipeline", href: "/dashboard/pipeline", icon: KanbanSquare },
      { label: "Leads", href: "/dashboard/leads", icon: Target },
      { label: "Lead Finder", href: "/dashboard/lead-finder", icon: Search },
      { label: "Website Analyzer", href: "/dashboard/website-analyzer", icon: Gauge },
      { label: "Call Lists", href: "/dashboard/call-lists", icon: Phone },
      { label: "Appointments", href: "/dashboard/appointments", icon: CalendarClock },
      { label: "Invoices", href: "/dashboard/invoices", icon: Receipt },
    ],
  },
  {
    label: "Delivery",
    items: [
      { label: "Projects", href: "/dashboard/projects", icon: FolderKanban },
      { label: "Website Builder", href: "/dashboard/website-builder", icon: Globe },
      { label: "Files", href: "/dashboard/files", icon: FolderOpen },
      { label: "Client Portal", href: "/dashboard/client-portal", icon: MonitorSmartphone },
    ],
  },
  {
    label: "Growth",
    items: [
      { label: "AI Assistant", href: "/dashboard/ai-assistant", icon: Bot },
      { label: "Automations", href: "/dashboard/automations", icon: Workflow },
      { label: "Map View", href: "/dashboard/map", icon: Map },
      { label: "Reports", href: "/dashboard/reports", icon: BarChart3 },
    ],
  },
  {
    label: "Agency",
    items: [
      { label: "Team", href: "/dashboard/team", icon: UserCog },
      { label: "Settings", href: "/dashboard/settings", icon: Settings },
    ],
  },
];
