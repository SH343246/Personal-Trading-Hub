import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    console.log("loc:", window.location.href);
    console.log("search:", window.location.search);

    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get("access_token");
    const refreshToken = urlParams.get("refresh_token");

    if (accessToken && refreshToken) {
      localStorage.setItem("access_token", accessToken);
      localStorage.setItem("refresh_token", refreshToken);

      navigate("/dashboard", { replace: true });
    } else {
      console.warn("Token/s missing:", { accessToken, refreshToken });
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  return <p>Redirecting...</p>;
}
