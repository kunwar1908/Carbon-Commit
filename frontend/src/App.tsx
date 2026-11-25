import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";
import { ProtectedDashboard } from "./components/ProtectedDashboard";

export const App = () => (
  <>
    <ProtectedDashboard />
    <SpeedInsights />
    <Analytics />
  </>
);