import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Recommendations from "./pages/Recommendations.tsx";
import PlaceDetail from "./pages/PlaceDetail.tsx";
import Explore from "./pages/Explore.tsx";
import RoutesPage from "./pages/Routes.tsx";
import Itinerary from "./pages/Itinerary.tsx";
import Profile from "./pages/Profile.tsx";
import AdminDashboard from "./pages/AdminDashboard.tsx";
import NotFound from "./pages/NotFound.tsx";

import { useAppStore } from "@/lib/store";
import { Navigate } from "react-router-dom";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false } },
});

const ProtectedRoute = ({ children, allow }: { children: React.ReactNode; allow: ('traveler' | 'admin')[] }) => {
  const { role } = useAppStore();
  if (role === 'guest') return <Navigate to="/" replace />;
  if (!allow.includes(role as any)) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/recommendations" element={<Recommendations />} />
          <Route path="/place/:id" element={<PlaceDetail />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/routes" element={<RoutesPage />} />
          <Route path="/itinerary" element={<ProtectedRoute allow={['traveler']}><Itinerary /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute allow={['traveler']}><Profile /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute allow={['admin']}><AdminDashboard /></ProtectedRoute>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
