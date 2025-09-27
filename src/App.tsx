import GlobalErrorBoundary from '@/components/GlobalErrorBoundary';
import { LoadingBoundary } from '@/components/LoadingBoundary';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import ProtectedRoute from "@/components/ProtectedRoute";
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
import CreateEvent from "./pages/CreateEvent";
import EditEvent from "./pages/EditEvent";
import CreateService from "./pages/CreateService";
import WalletPage from "./pages/Wallet";
import PointsPage from "./pages/Points";
import MyEventsPage from "./pages/MyEvents";
import ManageEventsPage from "./pages/ManageEvents";
import ManageServicesPage from "./pages/ManageServices";
import AdminPanel from "./pages/AdminPanel";
import OrganizerDashboard from "./pages/OrganizerDashboard";
import ProviderDashboard from "./pages/ProviderDashboard";
import AttendeeDashboard from "./pages/AttendeeDashboard";
import Groups from "./pages/Groups";
import Notifications from "./pages/Notifications";
import QRScanner from "./pages/QRScanner";
import Help from "./pages/Help";
import Contact from "./pages/Contact";
import Safety from "./pages/Safety";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Refund from "./pages/Refund";
import NotFound from "./pages/NotFound";
import Checkout from "./pages/Checkout";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import Tickets from "./pages/Tickets";
import ServiceRequestsPage from "./pages/ServiceRequestsPage";
import EventParticipants from "./pages/EventParticipants";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <GlobalErrorBoundary>
        <ErrorBoundary>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <LanguageProvider>
              <AuthProvider>
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
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </AuthProvider>
        </LanguageProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </GlobalErrorBoundary>
</TooltipProvider>
</QueryClientProvider>
);

export default App;
