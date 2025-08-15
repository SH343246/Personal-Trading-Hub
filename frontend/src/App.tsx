import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './login/Login';
import Dashboard from './pages/Dashboard';
import AuthCallback from './api/authcallback';
import './App.css';
import SignUp from "./login/Signup";
import AuthGuard from './api/authenticationguard';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
      <Route path="/dashboard" element={<AuthGuard><Dashboard /></AuthGuard>} />
    </Routes>
  );
}
