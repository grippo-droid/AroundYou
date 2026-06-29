import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Index from "./pages/Index";
import Explore from "./pages/Explore";
import BusinessProfile from "./pages/BusinessProfile";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Register from "./pages/Register";
import BusinessDashboard from "./pages/BusinessDashboard";
import AddBusiness from "./pages/AddBusiness";
import EditBusiness from "./pages/EditBusiness";
import BusinessStaff from "./pages/BusinessStaff";
import JobListing from "./pages/JobListing";
import Messages from "./pages/Messages";
import Profile from "./pages/Profile";
import Feed from "./pages/Feed";
import Admin from "./pages/Admin";
import AdminLogin from "./pages/AdminLogin";
import Bookings from "./pages/Bookings";
import ManageAvailability from "./pages/ManageAvailability";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/components/theme-provider";
import PrivateRoute from "@/components/PrivateRoute";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <div className="flex min-h-screen flex-col">
              <Navbar />
              <div className="flex-1">
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/explore" element={<Explore />} />
                  <Route path="/business/:id" element={<BusinessProfile />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/dashboard" element={<PrivateRoute><BusinessDashboard /></PrivateRoute>} />
                  <Route path="/add-business" element={<PrivateRoute><AddBusiness /></PrivateRoute>} />
                  <Route path="/edit-business/:id" element={<PrivateRoute><EditBusiness /></PrivateRoute>} />
                  <Route path="/business/:id/staff" element={<PrivateRoute><BusinessStaff /></PrivateRoute>} />
                  <Route path="/feed" element={<PrivateRoute><Feed /></PrivateRoute>} />
                  <Route path="/messages" element={<PrivateRoute><Messages /></PrivateRoute>} />
                  <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
                  <Route path="/admin" element={<PrivateRoute><Admin /></PrivateRoute>} />
                  <Route path="/admin-login" element={<AdminLogin />} />
                  <Route path="/jobs" element={<JobListing />} />
                  <Route path="/bookings" element={<PrivateRoute><Bookings /></PrivateRoute>} />
                  <Route path="/business/:id/availability" element={<PrivateRoute><ManageAvailability /></PrivateRoute>} />
                  <Route path="/profile/:id" element={<Profile />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </div>
              <Footer />
            </div>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
