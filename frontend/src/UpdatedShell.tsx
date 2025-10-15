import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AppShell from './mosaic/AppShell';




export default function UpdatedShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AppShell sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
      <Outlet />
    </AppShell>
  );
}
