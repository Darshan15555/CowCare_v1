import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/layout/DashboardLayout';
import LoadingSpinner from './components/common/LoadingSpinner';

// Route-level code splitting: each page is fetched only when visited,
// keeping the initial bundle small (auth screens, farmer flow, vet flow,
// and admin flow are all independent chunks).
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const NotFoundPage = lazy(() =>
  import('./pages/StatusPages').then((m) => ({ default: m.NotFoundPage }))
);
const UnauthorizedPage = lazy(() =>
  import('./pages/StatusPages').then((m) => ({ default: m.UnauthorizedPage }))
);
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const ProfileSettings = lazy(() => import('./pages/ProfileSettings'));

const FarmerDashboard = lazy(() => import('./pages/farmer/FarmerDashboard'));
const MyCattle = lazy(() => import('./pages/farmer/MyCattle'));
const CattleTransfers = lazy(() => import('./pages/farmer/CattleTransfers'));
const AddCattle = lazy(() => import('./pages/farmer/AddCattle'));
const CattleProfile = lazy(() => import('./pages/farmer/CattleProfile'));
const BookVisit = lazy(() => import('./pages/farmer/BookVisit'));
const MyRequests = lazy(() => import('./pages/farmer/MyRequests'));
const FarmerRequestDetail = lazy(() => import('./pages/farmer/FarmerRequestDetail'));

const VetDashboard = lazy(() => import('./pages/vet/VetDashboard'));
const IncomingRequests = lazy(() => import('./pages/vet/IncomingRequests'));
const VetRequestDetail = lazy(() => import('./pages/vet/VetRequestDetail'));
const CattleHistoryView = lazy(() => import('./pages/vet/CattleHistoryView'));
const ScanQr = lazy(() => import('./pages/vet/ScanQr'));

const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const ManageUsers = lazy(() => import('./pages/admin/ManageUsers'));
const AdminCattle = lazy(() => import('./pages/admin/AdminCattle'));
const AdminRequests = lazy(() => import('./pages/admin/AdminRequests'));

const ROLE_HOME = { FARMER: '/farmer', VETERINARIAN: '/vet', ADMIN: '/admin' };

function RootRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner label="Loading CowCare..." />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={ROLE_HOME[user.role] || '/login'} replace />;
}

function PageFallback() {
  return <LoadingSpinner label="Loading..." />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <Toaster position="top-center" />
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<RootRedirect />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/unauthorized" element={<UnauthorizedPage />} />

              {/* FARMER */}
              <Route element={<ProtectedRoute allowedRoles={['FARMER']} />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/farmer" element={<FarmerDashboard />} />
                  <Route path="/farmer/cattle" element={<MyCattle />} />
                  <Route path="/farmer/cattle/add" element={<AddCattle />} />
                  <Route path="/farmer/cattle/:id" element={<CattleProfile />} />
                  <Route path="/farmer/transfers" element={<CattleTransfers />} />
                  <Route path="/farmer/book" element={<BookVisit />} />
                  <Route path="/farmer/requests" element={<MyRequests />} />
                  <Route path="/farmer/requests/:id" element={<FarmerRequestDetail />} />
                  <Route path="/farmer/notifications" element={<NotificationsPage />} />
                  <Route path="/farmer/profile" element={<ProfileSettings />} />
                </Route>
              </Route>

              {/* VETERINARIAN */}
              <Route element={<ProtectedRoute allowedRoles={['VETERINARIAN']} />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/vet" element={<VetDashboard />} />
                  <Route path="/vet/requests" element={<IncomingRequests />} />
                  <Route path="/vet/requests/:id" element={<VetRequestDetail />} />
                  <Route path="/vet/cattle/:id" element={<CattleHistoryView />} />
                  <Route path="/vet/scan" element={<ScanQr />} />
                  <Route path="/vet/notifications" element={<NotificationsPage />} />
                  <Route path="/vet/profile" element={<ProfileSettings />} />
                </Route>
              </Route>

              {/* ADMIN */}
              <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/users" element={<ManageUsers />} />
                  <Route path="/admin/cattle" element={<AdminCattle />} />
                  <Route path="/admin/requests" element={<AdminRequests />} />
                </Route>
              </Route>

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
