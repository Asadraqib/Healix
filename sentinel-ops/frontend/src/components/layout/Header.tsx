import React, { FormEvent, useEffect, useState } from 'react';
import {
  Bell,
  Search,
  Grid,
  Play,
  Pause,
  Zap,
  CheckCircle2,
  X,
  ChevronDown,
  LogIn,
  LogOut,
  UserPlus
} from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';
import { UserRole } from '../../types';
import { canPerform, roleLabel } from '../../services/accessControl';

interface HeaderProps {
  onNavigateTab?: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onNavigateTab }) => {
  const {
    isSimulating,
    toggleSimulation,
    userRole,
    setUserRole,
    notifications,
    markNotificationRead,
    clearAllNotifications,
    triggerFailurePreset,
    resetFleet,
    mode,
    modeError,
    requiresSignIn,
    isSwitchingMode,
    telemetryConnected,
    currentUser,
    switchMode,
    signIn,
    register,
    signOut
  } = useSimulation();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    if (!currentUser) { setShowNotifications(false); setShowRoleMenu(false); setShowPresetMenu(false); }
  }, [currentUser]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const roles: { id: UserRole; label: string }[] = [
    { id: 'RELIABILITY_ENGINEER', label: 'Reliability Engineer' },
    { id: 'ADMIN', label: 'Plant Administrator' },
    { id: 'TECHNICIAN', label: 'Field Technician' },
    { id: 'EXECUTIVE_VIEWER', label: 'Executive Viewer' },
    { id: 'VIEWER', label: 'Viewer' }
  ];

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSigningIn(true);
    try {
      await signIn(email, password);
      setPassword('');
      setShowLogin(false);
    } catch {
      // The provider exposes the service error in the header alert.
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSigningIn(true);
    try {
      await register(name, email, password);
      setPassword('');
      setShowLogin(false);
      setIsRegistering(false);
    } catch {
      // The provider surfaces registration or service errors in the dialog.
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <>
    <header className="sticky top-0 z-40 bg-[#002050] text-white h-12 flex items-center px-2 sm:px-4 justify-between border-b border-[#002b66] shadow-xs">
      
      {/* Left: App Launcher & Title (Defender style) */}
      <div className="flex items-center gap-3">
        <button
          className="hidden sm:inline-flex p-1 text-slate-300 hover:text-white rounded transition-colors"
          title="App Launcher"
        >
          <Grid className="w-4 h-4" />
        </button>

        <div
          onClick={() => onNavigateTab && onNavigateTab('dashboard')}
          className="flex items-center gap-2 cursor-pointer"
        >
          <span className="hidden sm:inline font-semibold text-sm tracking-tight text-white hover:text-blue-200 transition-colors">
            Self-Healing Assets ERP
          </span>
          <span className="sm:hidden font-semibold text-xs text-white">Self-Healing ERP</span>
          <span className="text-slate-400 text-xs hidden sm:inline">|</span>
          <span className="text-xs text-slate-300 hidden sm:inline font-normal">
            Plant 04 Nuremberg
          </span>
        </div>
      </div>

      {/* Center: Minimalist Search (Microsoft 365 / Defender style) */}
      {currentUser && <div className="hidden xl:flex flex-1 max-w-sm mx-6">
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search assets, telemetry, work orders..."
            className="w-full pl-9 pr-3 py-1 bg-[#001738] text-xs text-white placeholder-slate-400 rounded-md border border-[#003882] focus:outline-none focus:border-blue-400 focus:bg-[#001f4d] transition-all"
          />
        </div>
      </div>

      }
      {/* Right Controls */}
      {!currentUser && <button onClick={() => {setIsRegistering(false);setShowLogin(true);}} className="inline-flex items-center gap-2 rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"><LogIn className="h-4 w-4"/>Sign in</button>}
      {currentUser && <div className="flex items-center gap-1 sm:gap-2 shrink-0">

        <div className="flex items-center gap-0.5 rounded border border-slate-500/50 bg-[#001738] p-0.5" role="group" aria-label="Data source mode">
          <button
            onClick={() => void switchMode('LIVE')}
            disabled={isSwitchingMode || mode === 'LIVE'}
            aria-pressed={mode === 'LIVE'}
            className={`px-2 py-1 text-[10px] font-bold rounded transition-colors ${mode === 'LIVE' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300 hover:text-white'} disabled:cursor-default`}
          >
            {isSwitchingMode ? 'CONNECTING' : 'LIVE'}
          </button>
          <button
            onClick={() => void switchMode('SIMULATION')}
            disabled={isSwitchingMode || mode === 'SIMULATION'}
            aria-pressed={mode === 'SIMULATION'}
            className={`px-2 py-1 text-[10px] font-bold rounded transition-colors ${mode === 'SIMULATION' ? 'bg-amber-300 text-slate-950' : 'text-slate-300 hover:text-white'} disabled:cursor-default`}
          >
            SIMULATION
          </button>
        </div>

        {mode === 'LIVE' && (
          <span className={`hidden lg:inline text-[10px] ${telemetryConnected ? 'text-emerald-300' : 'text-amber-200'}`}>
            {telemetryConnected ? 'Telemetry connected' : 'Telemetry reconnecting'}
          </span>
        )}
        
        {/* Quick Demo Trigger Dropdown */}
        <div className="relative hidden sm:block">
          <button
            onClick={() => setShowPresetMenu(!showPresetMenu)}
            disabled={mode === 'LIVE' || !canPerform(userRole, 'override')}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-blue-600/40 hover:bg-blue-600/60 text-blue-100 border border-blue-400/40 rounded transition-colors"
          >
            <Zap className="w-3 h-3 text-amber-300" />
            <span>Test Failure</span>
            <ChevronDown className="w-3 h-3 text-slate-300" />
          </button>

          {showPresetMenu && (
            <div className="absolute right-0 mt-1.5 w-60 bg-white text-slate-900 border border-slate-200 rounded-lg shadow-xl p-1.5 z-50 text-xs">
              <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Simulate Anomaly
              </div>
              <button
                onClick={() => {
                  triggerFailurePreset('CNC_SPINDLE');
                  setShowPresetMenu(false);
                }}
                className="w-full text-left px-2 py-1.5 hover:bg-slate-100 rounded text-slate-700 font-medium"
              >
                CNC Spindle Bearing Anomaly
              </button>
              <button
                onClick={() => {
                  triggerFailurePreset('INVERTER_MELTDOWN');
                  setShowPresetMenu(false);
                }}
                className="w-full text-left px-2 py-1.5 hover:bg-slate-100 rounded text-slate-700 font-medium"
              >
                Drive Inverter Overheat
              </button>
              <button
                onClick={() => {
                  triggerFailurePreset('HYDRAULIC_BURST');
                  setShowPresetMenu(false);
                }}
                className="w-full text-left px-2 py-1.5 hover:bg-slate-100 rounded text-slate-700 font-medium"
              >
                Hydraulic Pressure Spike
              </button>
              <div className="border-t border-slate-100 mt-1 pt-1">
                <button
                  onClick={() => {
                    resetFleet();
                    setShowPresetMenu(false);
                  }}
                  className="w-full text-left px-2 py-1.5 hover:bg-slate-100 rounded text-slate-500 text-[11px]"
                >
                  Reset Fleet to Nominal
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Local Simulation Ticker */}
        {mode === 'SIMULATION' && <button
          onClick={toggleSimulation}
          className={`hidden sm:flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
            isSimulating
              ? 'text-emerald-300 hover:bg-emerald-950/40'
              : 'text-slate-400 hover:bg-slate-800'
          }`}
          title={isSimulating ? 'Simulation running (ticking every 2s)' : 'Simulation paused'}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isSimulating ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
            }`}
          />
          <span className="hidden sm:inline text-[11px]">
            {isSimulating ? 'Live' : 'Paused'}
          </span>
          {isSimulating ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
        </button>}

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-1.5 text-slate-300 hover:text-white rounded transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white text-slate-900 border border-slate-200 rounded-lg shadow-xl p-3 z-50 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="font-semibold text-slate-900">Notifications</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={clearAllNotifications}
                    className="text-[11px] text-blue-600 hover:underline"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto mt-2 space-y-1.5">
                {notifications.length === 0 ? (
                  <p className="text-center py-6 text-slate-400 text-xs">No active alerts</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markNotificationRead(n.id)}
                      className={`p-2 rounded text-xs cursor-pointer transition-colors ${
                        n.type === 'HEALED'
                          ? 'bg-blue-50 text-blue-900'
                          : 'bg-slate-50 text-slate-800'
                      }`}
                    >
                      <div className="font-semibold text-[11px]">{n.title}</div>
                      <div className="text-slate-500 text-[10px] mt-0.5">{n.message}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Role Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex items-center gap-1.5 px-2 py-1 text-slate-200 hover:text-white rounded text-xs transition-colors"
          >
            <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-[10px]">
              AV
            </div>
            <span className="hidden sm:inline text-xs font-medium">{currentUser?.name || currentUser?.email || 'Sign in'}</span>
            <ChevronDown className="hidden sm:block w-3 h-3 text-slate-400" />
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 mt-1.5 w-52 bg-white text-slate-900 border border-slate-200 rounded-lg shadow-xl p-1.5 z-50 text-xs">
              {mode === 'LIVE' ? (
                <>
                  <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    {currentUser?.email ?? 'Live session'} · {currentUser ? roleLabel(userRole) : 'Signed out'}
                  </div>
                  {currentUser && (
                    <button onClick={() => void signOut()} className="w-full text-left px-2 py-1.5 rounded flex items-center gap-2 text-slate-700 hover:bg-slate-100">
                      <LogOut className="w-3.5 h-3.5" /> Sign out
                    </button>
                  )}
                </>
              ) : (
                <>
                <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Simulation role preview
                </div>
                <button
                  onClick={() => {
                    setShowRoleMenu(false);
                    void switchMode('LIVE');
                  }}
                  className="w-full text-left px-2 py-1.5 rounded flex items-center gap-2 text-slate-700 hover:bg-slate-100"
                >
                  <LogIn className="w-3.5 h-3.5" /> Sign in or create account
                </button>
                <button onClick={() => void signOut()} className="w-full text-left px-2 py-1.5 rounded flex items-center gap-2 text-slate-700 hover:bg-slate-100"><LogOut className="w-3.5 h-3.5"/>Sign out</button>
                {roles.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setUserRole(r.id);
                    setShowRoleMenu(false);
                  }}
                  className={`w-full text-left px-2 py-1.5 rounded flex items-center justify-between ${
                    userRole === r.id ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>{r.label}</span>
                  {userRole === r.id && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                </button>
                ))}
                </>
              )}
            </div>
          )}
        </div>

      </div>}

    </header>

    {modeError && (
      <div role="alert" className="sticky top-12 z-30 flex items-center justify-between gap-3 bg-rose-50 border-b border-rose-200 px-4 py-2 text-xs text-rose-900">
        <span>{modeError}</span>
        {requiresSignIn && !currentUser && (
          <button onClick={() => setShowLogin(true)} className="shrink-0 font-semibold underline">Sign in</button>
        )}
      </div>
    )}

    {showLogin && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowLogin(false); }}>
        <form onSubmit={(event) => void (isRegistering ? handleRegister(event) : handleSignIn(event))} className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold">{isRegistering ? 'Create an account' : 'Sign in to live services'}</h2>
            <button type="button" onClick={() => setShowLogin(false)} aria-label="Close sign-in dialog" className="p-1 text-slate-500 hover:text-slate-900"><X className="h-4 w-4" /></button>
          </div>
          {isRegistering && (
            <>
              <label className="mb-3 block text-xs font-semibold text-slate-700">
                Name
                <input type="text" required autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm font-normal outline-none focus:border-blue-500" />
              </label>
              <p className="mb-3 rounded bg-slate-50 p-2 text-[11px] text-slate-600">New accounts receive Viewer access. An administrator must grant elevated roles.</p>
            </>
          )}
          <label className="mb-3 block text-xs font-semibold text-slate-700">
            Email
            <input type="email" required autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm font-normal outline-none focus:border-blue-500" />
          </label>
          <label className="mb-4 block text-xs font-semibold text-slate-700">
            Password
            <input type="password" required minLength={8} autoComplete={isRegistering ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm font-normal outline-none focus:border-blue-500" />
          </label>
          {modeError && <p role="alert" className="mb-3 text-xs text-rose-700">{modeError}</p>}
          <button type="submit" disabled={isSigningIn} className="flex w-full items-center justify-center gap-2 rounded bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
            {isRegistering ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />} {isSigningIn ? 'Please wait...' : isRegistering ? 'Create Viewer Account' : 'Sign in'}
          </button>
          <button type="button" onClick={() => setIsRegistering((value) => !value)} className="mt-3 w-full text-center text-xs font-semibold text-blue-700 hover:underline">
            {isRegistering ? 'Already have an account? Sign in' : 'Create a new account'}
          </button>
        </form>
      </div>
    )}
    </>
  );
};
