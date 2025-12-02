'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Database, 
  DollarSign, 
  Menu,
  Bell,
  Search,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShellProps {
  children: React.ReactNode;
}

export function Shell({ children }: ShellProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const links = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/tasks', label: 'Tasks', icon: CheckSquare },
    { href: '/registry', label: 'Registry', icon: Database },
    { href: '/income', label: 'Income', icon: DollarSign },
  ];

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-slate-950 selection:bg-cyan-500/30 font-sans">
      {/* Background Gradients */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-cyan-500/10 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-20 lg:w-64 flex-col bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-gray-200 dark:border-white/10 z-40 transition-all duration-300">
        <div className="h-16 flex items-center justify-center lg:justify-start lg:px-6 border-b border-gray-200 dark:border-white/10">
          <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-cyan-500/20">
            B
          </div>
          <span className="hidden lg:block ml-3 font-bold text-lg tracking-tight text-gray-900 dark:text-white">BrainOps</span>
        </div>

        <nav className="flex-1 py-6 px-2 lg:px-4 space-y-2">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || pathname?.startsWith(link.href);
            
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center justify-center lg:justify-start gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative",
                  isActive 
                    ? "bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400" 
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
                )}
              >
                <Icon className={cn("w-6 h-6", isActive && "fill-current opacity-20")} />
                <span className="hidden lg:block font-medium">{link.label}</span>
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-cyan-500 rounded-r-full lg:hidden" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-white/10">
          <button className="flex items-center justify-center lg:justify-start gap-3 w-full p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500" />
            <div className="hidden lg:block text-left">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Admin</p>
              <p className="text-xs text-gray-500">System Owner</p>
            </div>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="md:pl-20 lg:pl-64 flex flex-col min-h-screen relative z-10">
        {/* Top Bar */}
        <header className="sticky top-0 h-16 px-6 flex items-center justify-between bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl border-b border-gray-200 dark:border-white/5 z-30">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white md:hidden">
            BrainOps
          </h1>
          
          <div className="hidden md:flex items-center gap-4 w-full max-w-xl">
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-cyan-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Search agents, tasks, or metrics..." 
                className="w-full bg-gray-100 dark:bg-white/5 border-none rounded-xl py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-cyan-500/50 transition-all placeholder:text-gray-400 dark:text-white"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-950" />
            </button>
            <button className="md:hidden p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500">
               <User className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl border-t border-gray-200 dark:border-white/10 z-50 pb-safe">
        <div className="flex justify-around items-center h-16">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || pathname?.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
                  isActive ? "text-cyan-500" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                )}
              >
                <div className={cn("p-1 rounded-xl transition-all", isActive && "bg-cyan-500/10")}>
                  <Icon className={cn("w-6 h-6", isActive && "fill-current")} />
                </div>
                <span className="text-[10px] font-medium">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
