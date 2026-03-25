import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Settings } from "./pages/Settings";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Videos from "./pages/Videos";
import VideoGeneration from "./pages/VideoGeneration";
import CreatePost from "./pages/CreatePost";
import Inspiration from "./pages/Inspiration";
import Prompts from "./pages/Prompts";
import Coach from "./pages/Coach";
import Sources from "./pages/Sources";
import Calendar from "./pages/Calendar";
import Published from "./pages/Published";
import Failed from "./pages/Failed";
import ApiDashboard from "./pages/ApiDashboard";
import Help from "./pages/Help";
import { ContactPage, PrivacyPage, TermsPage } from "./pages/MarketingPages";
import { FirebaseProvider } from "./contexts/FirebaseContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";
import Dashboard from "./pages/Dashboard";

export default function App() {
  return (
    <ErrorBoundary>
    <FirebaseProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            
            <Route path="create" element={<CreatePost />} />
            <Route path="inspiration" element={<Inspiration />} />
            <Route path="prompts" element={<Prompts />} />
            <Route path="sources" element={<Sources />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="published" element={<Published />} />
            <Route path="failed" element={<Failed />} />
            <Route path="videos" element={<Videos />} />
            <Route path="video-generation" element={<VideoGeneration />} />
            <Route path="api-dashboard" element={<ApiDashboard />} />
            <Route path="coach" element={<Coach />} />
            <Route path="help" element={<Help />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </FirebaseProvider>
    </ErrorBoundary>
  );
}
