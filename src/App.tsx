import GlobalErrorBoundary from '@/components/GlobalErrorBoundary';
import { LoadingBoundary } from '@/components/LoadingBoundary';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { MaintenanceCheck } from "@/middleware/maintenanceMode";
import ErrorBoundary from "@/components/ErrorBoundary";
import ProtectedRoute from "@/components/ProtectedRoute";
import { SuspensionCheck } from "@/components/SuspensionCheck";
import { lazy, Suspense } from "react";

// Immediate pages (no lazy loading)
import Index from "./pages/Index";
import Explore from "./pages/Explore";
import Services from "./pages/Services";
import EventDetails from "./pages/EventDetails";
import ServiceDetails from "./pages/ServiceDetails";
import Auth from "./pages/Auth";
import AccountType from "./pages/AccountType";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Help from "./pages/Help";
import Contact from "./pages/Contact";
import Safety from "./pages/Safety";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Refund from "./pages/Refund";
import NotFound from "./pages/NotFound";
import Checkout from "./pages/Checkout";
import CheckoutSuccess from "./pages/CheckoutSuccess";

// Lazy loaded pages (for performance)
const CreateEvent = lazy(() => import("./pages/CreateEvent"));
const EditEvent = lazy(() => import("./pages/EditEvent"));
const CreateService = lazy(() => import("./pages/CreateService"));
const WalletPage = lazy(() => import("./pages/Wallet"));
const PointsPage = lazy(() => import("./pages/Points"));
const MyEventsPage = lazy(() => import("./pages/MyEvents"));
const ManageEventsPage = lazy(() => import("./pages/ManageEvents"));
const ManageServicesPage = lazy(() => import("./pages/ManageServices"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const OrganizerDashboard = lazy(() => import("./pages/OrganizerDashboard"));
const ProviderDashboard = lazy(() => import("./pages/ProviderDashboard"));
const AttendeeDashboard = lazy(() => import("./pages/AttendeeDashboard"));
const Groups = lazy(() => import("./pages/Groups"));
const GroupDetails = lazy(() => import("./pages/GroupDetails"));
const Notifications = lazy(() => import("./pages/Notifications"));
const QRScanner = lazy(() => import("./pages/QRScanner"));
const Tickets = lazy(() => import("./pages/Tickets"));
const ServiceRequestsPage = lazy(() => import("./pages/ServiceRequestsPage"));
const EventParticipants = lazy(() => import("./pages/EventParticipants"));
const Friends = lazy(() => import("./pages/Friends"));
const SearchUsers = lazy(() => import("./pages/SearchUsers"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <GlobalErrorBoundary>
        <ErrorBoundary>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <div className="min-h-screen flex flex-col">
              <LanguageProvider>
                <AuthProvider>
                  <SuspensionCheck />
                  <MaintenanceCheck>
                    <Suspense fallback={<PageLoader />}>
                      <Routes>
                        <Route path="/" element={<Index />} />
                        <Route path="/explore" element={<Explore />} />
            <Route path="/services" element={<Services />} />
            <Route path="/event/:id" element={<EventDetails />} />
            <Route path="/service/:id" element={<ServiceDetails />} />
            <Route path="/auth" element={<Auth />} />
            <Route 
              path="/account-type" 
              element={
                <ProtectedRoute requireAuth={true}>
                  <AccountType />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute requireAuth={true}>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute requireAuth={true}>
                  <Profile />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/settings" 
              element={
                <ProtectedRoute requireAuth={true}>
                  <Settings />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/create-event" 
              element={
                <ProtectedRoute requireAuth={true} requiredRole={['organizer', 'admin']}>
                  <CreateEvent />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/edit-event/:id" 
              element={
                <ProtectedRoute requireAuth={true} requiredRole={['organizer', 'admin']}>
                  <EditEvent />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/create-service" 
              element={
                <ProtectedRoute requireAuth={true} requiredRole={['provider', 'admin']}>
                  <CreateService />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/wallet" 
              element={
                <ProtectedRoute requireAuth={true}>
                  <WalletPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/points" 
              element={
                <ProtectedRoute requireAuth={true}>
                  <PointsPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/my-events" 
              element={
                <ProtectedRoute requireAuth={true} requiredRole="attendee">
                  <MyEventsPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/manage-events" 
              element={
                <ProtectedRoute requireAuth={true} requiredRole={['organizer', 'admin']}>
                  <ManageEventsPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/manage-services" 
              element={
                <ProtectedRoute requireAuth={true} requiredRole={['provider', 'admin']}>
                  <ManageServicesPage />
                </ProtectedRoute>
              } 
            />
            <Route path="/help" element={<Help />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/safety" element={<Safety />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/refund" element={<Refund />} />
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute requireAuth={true} requiredRole="admin">
                  <AdminPanel />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/organizer-dashboard" 
              element={
                <ProtectedRoute requireAuth={true} requiredRole="organizer">
                  <OrganizerDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/provider-dashboard" 
              element={
                <ProtectedRoute requireAuth={true} requiredRole="provider">
                  <ProviderDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/attendee-dashboard" 
              element={
                <ProtectedRoute requireAuth={true} requiredRole="attendee">
                  <AttendeeDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/groups" 
              element={
                <ProtectedRoute requireAuth={true}>
                  <Groups />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/groups/:groupId" 
              element={
                <ProtectedRoute requireAuth={true}>
                  <GroupDetails />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/notifications" 
              element={
                <ProtectedRoute requireAuth={true}>
                  <Notifications />
                </ProtectedRoute>
              } 
            />
            <Route
              path="/qr-scanner" 
              element={
                <ProtectedRoute requireAuth={true} requiredRole={['organizer', 'admin']}>
                  <QRScanner />
                </ProtectedRoute>
              } 
            />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/checkout/success" element={<CheckoutSuccess />} />
            <Route 
              path="/tickets" 
              element={
                <ProtectedRoute requireAuth={true}>
                  <Tickets />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/service-requests" 
              element={
                <ProtectedRoute requireAuth={true} requiredRole={['organizer', 'provider', 'admin']}>
                  <ServiceRequestsPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/event/:eventId/participants" 
              element={
                <ProtectedRoute requireAuth={true} requiredRole={['organizer', 'admin']}>
                  <EventParticipants />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/friends" 
              element={
                <ProtectedRoute requireAuth={true}>
                  <Friends />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/search-users" 
              element={
                <ProtectedRoute requireAuth={true}>
                  <SearchUsers />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/profile/:userId" 
              element={
                <ProtectedRoute requireAuth={true}>
                  <PublicProfile />
                </ProtectedRoute>
              } 
            />
                        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Suspense>
                  </MaintenanceCheck>
                </AuthProvider>
              </LanguageProvider>
            </div>
          </BrowserRouter>
        </ErrorBoundary>
      </GlobalErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
