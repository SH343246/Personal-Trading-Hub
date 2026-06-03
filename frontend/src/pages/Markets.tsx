import { useEffect, useState } from "react";
import api from "../api/axiosinstance";
import { logout } from "../api/logout";
import  LivePrice  from "../components/LivePrice";
import { LivePriceSparkline } from "../components/LivePriceSparkline";
import { useDashboardStore, useEditing } from '../state/useDashboardStore'
export default function Dashboard() {
  const [userInfo, setUserInfo] = useState<{ email: string} | null>(null); 
  const seed = useDashboardStore((s) => s.seed)
  const setEditing = useDashboardStore((s) => s.setEditing)
  const editing = useEditing()
  useEffect(() => { seed() }, [])

const symbols: string[] = (import.meta.env.VITE_SYMBOLS ?? "AAPL,MSFT,NVDA")
  .split(",")
  .map((s: string) => s.trim().toUpperCase())
  .filter(Boolean);


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

      <div className="p-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {symbols.map((s) => (
          <LivePrice key={s} symbol={s} />
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {symbols.map((s) => (
          <LivePriceSparkline key={s} symbol={s} />
        ))}
    </div>
 <div className="p-4">
      <div className="flex items-center gap-3 mb-3">
        <button onClick={() => setEditing(!editing)} className="px-3 py-1.5 rounded-md border shadow-sm text-sm">
          {editing ? 'Done' : 'Edit layout'}
        </button>
        <span className="text-xs text-neutral-500">{editing ? 'Drag enabled' : 'View mode'}</span>
      </div>
    </div>
    </div>
  </>
);

















}