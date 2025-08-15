import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axiosinstance";
import { Link } from "react-router-dom";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const base =
    import.meta.env.VITE_API_BASE_URL ??
    (import.meta.env.DEV ? "http://localhost:8000/api" : "/api");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log("submit local login");
    try {
      const { data } = await api.post("/auth/login", { email, password });
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      nav("/dashboard");
    } catch (err) {
      console.error("login error", err);
      alert("Email or Password is Incorrect. Please try again.");
    }
  }
  function googleLogin() {
    console.log("google login redirect to", base + "/auth/google");
    window.location.href = base + "/auth/google";
  }

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-72">
        <input
          value={email}
          onChange={e => setEmail(e.target.value)}
          type="email"
          placeholder="Email"
          className="border p-2 rounded"
        />
        <input
          value={password}
          onChange={e => setPassword(e.target.value)}
          type="password"
          placeholder="Password"
          className="border p-2 rounded"
        />
        <button type="submit" className="p-2 rounded bg-blue-600 text-white">
          Login
        </button>
      </form>
      <button type="button" onClick={googleLogin} className="p-2 rounded bg-red-600 text-white">
        Login with Google
      </button>



      <div className="text-sm">
      New here? <Link to="/signup" className="text-blue-600 underline">Create an account</Link>
      </div>

    </div>
  );
}
