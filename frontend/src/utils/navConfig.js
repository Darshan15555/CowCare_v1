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
} from 'lucide-react';

export const NAV_ITEMS = {
  FARMER: [
    { to: '/farmer', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/farmer/cattle', label: 'My Cattle', icon: ListChecks },
    { to: '/farmer/cattle/add', label: 'Add Cow', icon: PlusCircle },
    { to: '/farmer/requests', label: 'Requests', icon: ClipboardList },
    { to: '/farmer/notifications', label: 'Alerts', icon: Bell },
    { to: '/farmer/transfers', label: 'Transfers', icon: ArrowRightLeft },
  ],
  VETERINARIAN: [
    { to: '/vet', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/vet/requests', label: 'Requests', icon: Stethoscope },
    { to: '/vet/scan', label: 'Scan QR', icon: ScanLine },
    { to: '/vet/notifications', label: 'Alerts', icon: Bell },
  ],
  ADMIN: [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/users', label: 'Users', icon: Users },
  ],
};

export { QrCode };
