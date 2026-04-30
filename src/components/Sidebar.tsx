import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Database, 
  Shield, 
  ChevronLeft, 
  ChevronRight,
  LogOut,
  History,
  Settings,
  Brain,
  Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';
import { EditProfileModal } from './EditProfileModal';
import { LogoutConfirmModal } from './LogoutConfirmModal';
import toast from 'react-hot-toast';

export const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const { signOut, patient } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (patient && !patient.profile_complete) {
      toast('Complete your Health Setup for deep AI recommendations.', {
        icon: '⚠️',
        duration: 3000,
        style: {
          background: '#0f172a',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.1)',
          cursor: 'pointer'
        },
      });
      // The onClick of toast isn't directly supported by react-hot-toast like this, 
      // but we can add a listener to the window or use a custom toast. Let's use a custom toast if possible or just rely on sidebar.
    }
  }, [patient?.profile_complete]);

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/portal/patient/dashboard' },
    { icon: Database, label: 'My Health Vault', path: '/portal/patient/vault' },
    { icon: Shield, label: 'Access Control', path: '/portal/patient/access' },
    { icon: History, label: 'Audit Trail', path: '/portal/patient/audit' },
  ];

  const handleAiPortalClick = (e: React.MouseEvent) => {
    if (patient && !patient.profile_complete) {
      e.preventDefault();
      toast.error("Access Restricted. Please complete your Profile Setup to unlock AI Recommendations.", {
        style: { background: '#0f172a', color: '#fff', border: '1px solid #ef4444' }
      });
    }
  };

  const handleProfileClick = () => {
    navigate('/portal/patient/profile');
  };

  return (
    <>
      <motion.div 
        animate={{ width: isCollapsed ? 80 : 260 }}
        className="relative flex flex-col h-screen border-r border-white/5 bg-slate-950/80 backdrop-blur-3xl transition-all z-40"
      >
        {/* Collapse Toggle */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-20 bg-brand-blue p-1 rounded-full text-white shadow-lg z-50 hover:scale-110 transition-transform"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Brand */}
        <div className={clsx("h-16 flex items-center px-6 mb-8 mt-4", isCollapsed ? "justify-center" : "justify-start")}>
          <motion.div
            animate={{ 
              opacity: [0.8, 1, 0.8],
              filter: ["drop-shadow(0 0 2px rgba(52,144,220,0.1))", "drop-shadow(0 0 10px rgba(52,144,220,0.4))", "drop-shadow(0 0 2px rgba(52,144,220,0.1))"]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <img 
              src="https://i.ibb.co/Cpsv0qY7/73024ef0-7fe4-4884-96b1-58af0a49ff7c.png" 
              alt="AXON Logo" 
              className={clsx("transition-all object-contain", isCollapsed ? "h-6 w-auto" : "w-[90px] md:w-[120px]")} 
            />
          </motion.div>
        </div>

        {/* Nav Items */}
        <div className="flex-1 px-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path + item.label}
              to={item.path}
              className={({ isActive }) => clsx(
                "flex items-center gap-4 px-3 py-3 rounded-xl transition-all group",
                isActive 
                  ? "bg-brand-blue/10 text-brand-blue border border-brand-blue/20" 
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon className={clsx("shrink-0", isCollapsed ? "w-6 h-6" : "w-5 h-5")} />
              {!isCollapsed && <span className="font-medium text-sm tracking-wide">{item.label}</span>}
            </NavLink>
          ))}
          
          <NavLink
            to="/portal/patient/ai-insights"
            onClick={handleAiPortalClick}
            className={({ isActive }) => clsx(
              "w-full flex items-center justify-between px-3 py-3 rounded-xl transition-all group border border-transparent",
              isActive 
                ? "bg-brand-purple/10 text-brand-purple border-brand-purple/20" 
                : "text-slate-400 hover:text-white hover:bg-white/5",
              isCollapsed && "justify-center"
            )}
          >
            <div className="flex items-center gap-4">
               {patient?.profile_complete ? (
                 <Brain className={clsx("shrink-0", isCollapsed ? "w-6 h-6" : "w-5 h-5")} />
               ) : (
                 <Lock className={clsx("shrink-0", isCollapsed ? "w-6 h-6" : "w-5 h-5")} />
               )}
               {!isCollapsed && <span className="font-medium text-sm tracking-wide">AI Insights</span>}
            </div>
            {!isCollapsed && patient && !patient.profile_complete && (
              <Lock className="w-4 h-4 opacity-70" />
            )}
          </NavLink>
        </div>

        {/* Profile / Bottom */}
        <div className="p-4 border-t border-white/5 flex flex-col gap-2">
          <button 
            onClick={handleProfileClick}
            className="flex items-center gap-3 p-2 bg-white/5 hover:bg-white/10 transition-colors rounded-2xl border border-white/5 text-left w-full cursor-pointer overflow-hidden shadow-sm"
          >
            <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center font-bold text-brand-blue border border-brand-blue/20 shrink-0 overflow-hidden">
               {patient?.profile_picture_url ? (
                  <img src={patient.profile_picture_url} alt="Profile" className="w-full h-full object-cover" />
               ) : (
                  patient?.name?.charAt(0) || 'P'
               )}
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0 pr-2 relative flex-1">
                <span className="text-xs font-bold text-white truncate group-hover:text-brand-blue transition-colors">
                  {patient?.name || 'Patient'}
                </span>
                <span className="text-[10px] text-slate-500 font-mono tracking-widest leading-tight">
                  ID: {patient?.clinical_id || '------'}
                </span>
                <Settings className="w-4 h-4 absolute right-0 top-1/2 -translate-y-1/2 text-slate-500 opacity-50 block md:hidden" />
              </div>
            )}
          </button>
          
          <button 
            onClick={() => setIsLogoutModalOpen(true)}
            className={clsx(
              "w-full flex items-center gap-4 px-3 py-3 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-400/5 transition-all text-xs font-bold uppercase tracking-wider",
              isCollapsed && "justify-center"
            )}
          >
            <LogOut className="w-5 h-5" />
            {!isCollapsed && <span>Log out</span>}
          </button>
        </div>
      </motion.div>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isProfileModalOpen && (
          <EditProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
        )}
      </AnimatePresence>

      <LogoutConfirmModal 
        isOpen={isLogoutModalOpen} 
        onClose={() => setIsLogoutModalOpen(false)} 
        onConfirm={signOut} 
      />
    </>
  );
};
