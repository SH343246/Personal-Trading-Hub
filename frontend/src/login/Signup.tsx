import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import api from "../api/axiosinstance";

interface SignupFormData {
  email: string;
  password: string;
  confirmPassword: string;
}

export default function SignUp() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setOk(null);

    const formData: SignupFormData = {
      email,
      password,
      confirmPassword: confirm,
    };

    if (formData.password !== formData.confirmPassword) {
      setErr("Passwords do not match");
      return;
    }
    if (formData.password.length < 6) {
      setErr(" 6 characters min");
      return;
    }

    try {
      await api.post("/auth/register", {
        email: formData.email,
        password: formData.password,
      });

      setOk("Account created! You can log in now.");

      const { data } = await api.post("/auth/login", {
        email: formData.email,
        password: formData.password,
      });

      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      nav("/dashboard");
    } catch (err: unknown) {
      if (axios.isAxiosError<{ detail?: string }>(err)) {
        const detail = err.response?.data?.detail;
        setErr(detail === "email exists" ? "Email already registered" : "Sign up failed");
      } else {
        setErr("Sign up failed");
      }
      console.error("signup error", err);
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      <h1 className="text-xl font-semibold">Create your account</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-72">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="Email"
          className="border p-2 rounded"
          required
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="Password"
          className="border p-2 rounded"
          required
        />
        <input
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          type="password"
          placeholder="Confirm password"
          className="border p-2 rounded"
          required
        />
        <button type="submit" className="p-2 rounded bg-blue-600 text-white">
          Sign up
        </button>
      </form>

      {err && <div className="text-red-600 text-sm">{err}</div>}
      {ok && <div className="text-green-600 text-sm">{ok}</div>}

      <div className="text-sm">
        Already have an account?{" "}
        <Link to="/login" className="text-blue-600 underline">
          Log in
        </Link>
      </div>
    </div>
  );
}
