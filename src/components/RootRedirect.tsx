import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import SplashVisual from "@/components/SplashVisual";
import Home from "@/pages/Home";

export default function RootRedirect() {
  const { loading, session } = useAuth();
  if (loading) return <SplashVisual />;
  if (session) return <Navigate to="/dashboard" replace />;
  return <Home />;
}
