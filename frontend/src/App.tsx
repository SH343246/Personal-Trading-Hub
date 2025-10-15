/* // src/App.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./components/tailwindadmin/layout/AppLayout";          // from TailAdmin
import Dashboard from "./pages/Dashboard";           // your page
import Portfolio from "./pages/Portfolio";           // your page
// import AuthGuard from "./api/authenticationguard"; // if you gate routes
 
export default function App() {
  return (
    <Routes>

      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/portfolio" element={<Portfolio />} />
        <Route index element={<Navigate to="/dashboard" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
 */

import { Routes, Route, Navigate } from 'react-router-dom'
import UpdatedShell from './UpdatedShell'
import Dashboard from './pages/Dashboard'
import Portfolio from './pages/Portfolio'
import News from './pages/News'
import StockFund from './pages/StockFund'
import Settings from './pages/Settings'
import Wallet from './pages/Wallet'
import Home from './pages/Home'

export default function App() {
  return (
    <Routes>
      <Route element={<UpdatedShell />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/portfolio" element={<Portfolio />} />
        <Route path="/news" element={<News />} />
        <Route path="/stock-fund" element={<StockFund />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/home" element={<Home />} />
        <Route index element={<Navigate to="/dashboard" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}