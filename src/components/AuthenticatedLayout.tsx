import React from 'react';
import { Sidebar } from './Sidebar';
import Navbar from './Navbar';

export const AuthenticatedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-white">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
};
