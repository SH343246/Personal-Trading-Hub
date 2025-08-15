import { useEffect, useState } from "react";
import api from "../api/axiosinstance";
import { logout } from "../api/logout";
export default function Dashboard() {
  const [userInfo, setUserInfo] = useState<{ email: string} | null>(null); 

useEffect(() => {
    api.get("/me")
     .then((r) => setUserInfo(r.data))
     .catch(console.error);
  }, []);


return (
  <>
    <h1 className="lg:text-6xl font-bold text-center mb-2">
      Personal Trading Hub Dashboard
    </h1>

    {userInfo && (
      <p className="text-center mb-6 text-sm">
        Email: {userInfo.email}
      </p>
    )}

    <div className="flex justify-center mb-6">
      <button
        onClick={logout}
        className="p-2 rounded bg-red-600 text-white"
      >
        Logout
      </button>
    </div>
  </>
);

















}