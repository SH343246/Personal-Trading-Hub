

import { Routes, Route, Navigate } from 'react-router-dom'
import UpdatedShell from './UpdatedShell'
import Dashboard from './pages/Dashboard'
import Portfolio from './pages/Portfolio'
import News from './pages/News'
import StockFund from './pages/StockFund'
import Settings from './pages/Settings'
import Wallet from './pages/Wallet'
import Home from './pages/Home'
import BacktestPage from './pages/BacktestPage'

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
        <Route path="/backtest" element={<BacktestPage />} />
        <Route index element={<Navigate to="/dashboard" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}