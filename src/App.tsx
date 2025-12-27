import { lazy, Suspense } from 'react';
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

// Critical pages - loaded immediately
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Lazy loaded pages for better performance
const Services = lazy(() => import("./pages/Services"));
const DiscountServicesPage = lazy(() => import("./pages/DiscountServicesPage"));
const TrainingServicesPage = lazy(() => import("./pages/TrainingServicesPage"));
const OtherServicesPage = lazy(() => import("./pages/OtherServicesPage"));
const EventDetails = lazy(() => import("./pages/EventDetails"));
const ServiceDetails = lazy(() => import("./pages/ServiceDetails"));
const ServiceBooking = lazy(() => import("./pages/ServiceBooking"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Profile = lazy(() => import("./pages/Profile"));
const Settings = lazy(() => import("./pages/Settings"));
const CreateEvent = lazy(() => import("./pages/CreateEvent"));
const EditEvent = lazy(() => import("./pages/EditEvent"));
const CreateService = lazy(() => import("./pages/CreateService"));
const EditService = lazy(() => import("./pages/EditService"));
const ServiceTypeSelection = lazy(() => import("@/components/Services/ServiceTypeSelection"));
const DiscountServiceForm = lazy(() => import("@/components/Services/DiscountService/DiscountServiceForm"));
const TrainingServiceForm = lazy(() => import("@/components/Services/TrainingService/TrainingServiceForm"));
const OtherServiceForm = lazy(() => import("@/components/Services/OtherService/OtherServiceForm"));
const WalletPage = lazy(() => import("./pages/Wallet"));
const PointsPage = lazy(() => import("./pages/Points"));
const MyEventsPage = lazy(() => import("./pages/MyEvents"));
const ManageEventsPage = lazy(() => import("./pages/ManageEvents"));
const ManageServicesPage = lazy(() => import("./pages/ManageServices"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));

const ProviderDashboard = lazy(() => import("./pages/ProviderDashboard"));
const AttendeeDashboard = lazy(() => import("./pages/AttendeeDashboard"));
const GroupsOverview = lazy(() => import("./pages/GroupsOverview"));
const JoinedGroups = lazy(() => import("./pages/JoinedGroups"));
const OrganizedGroups = lazy(() => import("./pages/OrganizedGroups"));
const DiscoverGroups = lazy(() => import("./pages/DiscoverGroups"));
const FilterGroups = lazy(() => import("./pages/FilterGroups"));
const GroupDetails = lazy(() => import("./pages/GroupDetails"));
const GroupEventsPage = lazy(() => import("./pages/GroupEventsPage"));
const GroupCreateEvent = lazy(() => import("./pages/GroupCreateEvent"));
const EventsPage = lazy(() => import("./pages/EventsPage"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const Notifications = lazy(() => import("./pages/Notifications"));
const QRScanner = lazy(() => import("./pages/QRScanner"));
const Help = lazy(() => import("./pages/Help"));
const Contact = lazy(() => import("./pages/Contact"));
const Safety = lazy(() => import("./pages/Safety"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Refund = lazy(() => import("./pages/Refund"));
const Checkout = lazy(() => import("./pages/Checkout"));
const CheckoutSuccess = lazy(() => import("./pages/CheckoutSuccess"));
const ServiceCheckoutSuccess = lazy(() => import("./pages/ServiceCheckoutSuccess"));
const Tickets = lazy(() => import("./pages/Tickets"));
const ServiceRequestsPage = lazy(() => import("./pages/ServiceRequestsPage"));
const EventParticipants = lazy(() => import("./pages/EventParticipants"));
const InterestsSettings = lazy(() => import("./pages/InterestsSettings"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const DiscoverPeople = lazy(() => import("./pages/DiscoverPeople"));
const Followers = lazy(() => import("./pages/Followers"));
const Following = lazy(() => import("./pages/Following"));
const Messages = lazy(() => import("./pages/Messages"));
const JoinReferral = lazy(() => import("./pages/JoinReferral"));

// Optimized Query Client with caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

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
                        <Route 
                          path="/services" 
                          element={
                            <ProtectedRoute requireAuth={false}>
                              <Services />
                            </ProtectedRoute>
                          } 
                        />
                        <Route path="/services/discount-services" element={<DiscountServicesPage />} />
                        <Route path="/services/training-services" element={<TrainingServicesPage />} />
                        <Route path="/services/other-services" element={<OtherServicesPage />} />
            <Route path="/event/:id" element={<EventDetails />} />
            <Route path="/service/:id" element={<ServiceDetails />} />
            <Route 
              path="/services/:id/booking" 
              element={
                <ProtectedRoute requireAuth={true}>
                  <ServiceBooking />
                </ProtectedRoute>
              } 
            />
            <Route path="/auth" element={<Auth />} />
            <Route 
              path="/provider-dashboard" 
              element={
                <ProtectedRoute requireAuth={true} requiredRole="provider">
                  <ProviderDashboard />
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
              path="/interests-settings" 
              element={
                <ProtectedRoute requireAuth={true}>
                  <InterestsSettings />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/create-event" 
              element={
                <ProtectedRoute requireAuth={true} requiredRole={['attendee', 'admin']}>
                  <CreateEvent />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/edit-event/:id" 
              element={
                <ProtectedRoute requireAuth={true} requiredRole={['attendee', 'admin']}>
                  <EditEvent />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/create-service" 
              element={
                <ProtectedRoute requireAuth={true} requiredRole={['provider', 'admin']}>
                  <ServiceTypeSelection />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/create-service/discount" 
              element={
                <ProtectedRoute requireAuth={true} requiredRole={['provider', 'admin']}>
                  <DiscountServiceForm />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/create-service/training" 
              element={
                <ProtectedRoute requireAuth={true} requiredRole={['provider', 'admin']}>
                  <TrainingServiceForm />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/create-service/other" 
              element={
                <ProtectedRoute requireAuth={true} requiredRole={['provider', 'admin']}>
                  <OtherServiceForm />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/edit-service/:id" 
              element={
                <ProtectedRoute requireAuth={true} requiredRole={['provider', 'admin']}>
                  <EditService />
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
                <ProtectedRoute requireAuth={true} requiredRole={['attendee', 'admin']}>
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
                  <GroupsOverview />
                </ProtectedRoute>
              } 
            />
            <Route
              path="/groups/joined-groups" 
              element={
                <ProtectedRoute requireAuth={true}>
                  <JoinedGroups />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/groups/organized-groups" 
              element={
                <ProtectedRoute requireAuth={true}>
                  <OrganizedGroups />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/groups/discover-groups" 
              element={
                <ProtectedRoute requireAuth={false}>
                  <DiscoverGroups />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/groups/filter" 
              element={
                <ProtectedRoute requireAuth={true}>
                  <FilterGroups />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/groups/:groupId" 
              element={
                <ProtectedRoute requireAuth={false}>
                  <GroupDetails />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/groups/:groupId/events" 
              element={
                <ProtectedRoute requireAuth={true}>
                  <GroupEventsPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/groups/create-event" 
              element={
                <ProtectedRoute requireAuth={true}>
                  <GroupCreateEvent />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/events" 
              element={
                <ProtectedRoute requireAuth={true}>
                  <EventsPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/leaderboard" 
              element={
                <ProtectedRoute requireAuth={true}>
                  <Leaderboard />
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
                <ProtectedRoute requireAuth={true} requiredRole={['attendee', 'admin']}>
                  <QRScanner />
                </ProtectedRoute>
              } 
            />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/checkout/success" element={<CheckoutSuccess />} />
            <Route path="/service-checkout/success" element={<ServiceCheckoutSuccess />} />
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
                <ProtectedRoute requireAuth={true} requiredRole={['attendee', 'provider', 'admin']}>
                  <ServiceRequestsPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/event/:eventId/participants" 
              element={
                <ProtectedRoute requireAuth={true} requiredRole={['attendee', 'admin']}>
                  <EventParticipants />
                </ProtectedRoute>
              } 
            />
            {/* User Profile & Follow Routes */}
            <Route path="/user/:userId" element={<UserProfile />} />
            <Route path="/user/:userId/followers" element={<Followers />} />
            <Route path="/user/:userId/following" element={<Following />} />
            <Route path="/discover-people" element={<ProtectedRoute requireAuth={true}><DiscoverPeople /></ProtectedRoute>} />
            {/* Messages Routes */}
            <Route path="/messages" element={<ProtectedRoute requireAuth={true}><Messages /></ProtectedRoute>} />
            <Route path="/messages/:conversationId" element={<ProtectedRoute requireAuth={true}><Messages /></ProtectedRoute>} />
            {/* Referral Route */}
            <Route path="/join" element={<JoinReferral />} />
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
