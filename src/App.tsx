import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Explore from "./pages/Explore";
import Services from "./pages/Services";
import EventDetails from "./pages/EventDetails";
import ServiceDetails from "./pages/ServiceDetails";
import Auth from "./pages/Auth";
import AccountType from "./pages/AccountType";
import Dashboard from "./pages/Dashboard";
import CreateEvent from "./pages/CreateEvent";
import CreateService from "./pages/CreateService";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
              path="/create-event" 
              element={
                <ProtectedRoute requireAuth={true} allowedRoles={['organizer', 'admin']}>
                  <CreateEvent />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/create-service" 
              element={
                <ProtectedRoute requireAuth={true} allowedRoles={['service_provider', 'admin']}>
                  <CreateService />
                </ProtectedRoute>
              } 
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
