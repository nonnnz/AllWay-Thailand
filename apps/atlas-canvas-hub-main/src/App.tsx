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
import AdminRiskQueue from "./pages/AdminRiskQueue.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false } },
});

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
          <Route path="/itinerary" element={<Itinerary />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={<AdminRiskQueue />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
