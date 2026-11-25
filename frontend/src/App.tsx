import { SpeedInsights } from "@vercel/speed-insights/react";
import { ProtectedDashboard } from "./components/ProtectedDashboard";

export const App = () => (
  <>
    <ProtectedDashboard />
    <SpeedInsights />
  </>
);