import {
  LayoutDashboard,
  PlusCircle,
  ListChecks,
  QrCode,
  Bell,
  Users,
  Stethoscope,
  ScanLine,
  ClipboardList,
  ArrowRightLeft,
  Beef,
  ShoppingBag,
  Settings,
} from 'lucide-react';

export const NAV_ITEMS = {
  FARMER: [
    { to: '/farmer', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/farmer/cattle', label: 'My Cattle', icon: ListChecks, end: true },
    { to: '/farmer/marketplace', label: 'Marketplace', icon: ShoppingBag, end: true },
    { to: '/farmer/cattle/add', label: 'Add Cow', icon: PlusCircle, end: true },
    { to: '/farmer/requests', label: 'Requests', icon: ClipboardList, end: false },
    { to: '/farmer/notifications', label: 'Alerts', icon: Bell, end: true },
    { to: '/farmer/transfers', label: 'Transfers', icon: ArrowRightLeft, end: true },
    { to: '/farmer/profile', label: 'Settings', icon: Settings, end: true },
  ],
  VETERINARIAN: [
    { to: '/vet', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/vet/requests', label: 'Cases', icon: Stethoscope, end: false },
    { to: '/vet/scan', label: 'Scan QR', icon: ScanLine, end: true },
    { to: '/vet/notifications', label: 'Alerts', icon: Bell, end: true },
    { to: '/vet/profile', label: 'Settings', icon: Settings, end: true },
  ],
  ADMIN: [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/users', label: 'Users', icon: Users, end: true },
    { to: '/admin/cattle', label: 'Cattle', icon: Beef, end: true },
    { to: '/admin/requests', label: 'Requests', icon: ClipboardList, end: true },
  ],
};

export { QrCode };
