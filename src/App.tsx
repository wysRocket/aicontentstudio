import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import { FirebaseProvider } from "./contexts/FirebaseContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";
import Dashboard from "./pages/Dashboard";

// Placeholder component for empty routes
function Placeholder({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-full">
      <h1 className="text-2xl text-gray-400">{title}</h1>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
    <FirebaseProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
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
            <Route path="sources" element={<Placeholder title="Sources" />} />
            <Route path="calendar" element={<Placeholder title="Calendar" />} />
            <Route path="published" element={<Placeholder title="Published Posts" />} />
            <Route path="failed" element={<Placeholder title="Failed Posts" />} />
            <Route path="videos" element={<Videos />} />
            <Route path="video-generation" element={<VideoGeneration />} />
            <Route path="api-dashboard" element={<Placeholder title="API Dashboard" />} />
            <Route path="coach" element={<Coach />} />
            <Route path="help" element={<Placeholder title="Help" />} />

            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </FirebaseProvider>
    </ErrorBoundary>
  );
}
