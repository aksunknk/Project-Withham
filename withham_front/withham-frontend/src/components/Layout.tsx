// src/components/Layout.tsx

import React from 'react';
import { NavLink, Link, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { HouseIcon, UserIcon, QuestionIcon, CompassIcon, BookmarkIcon, CalendarIcon } from './Icons';
import { RightSidebar } from './RightSidebar';

export function Layout() {
  const { currentUser, logout } = useAuth();
  
  const navLinkClass = "flex items-center gap-3 px-3 py-2 rounded-full text-text-main hover:bg-surface";
  const activeNavLinkClass = "flex items-center gap-3 px-3 py-2 rounded-full text-text-main bg-surface font-bold";

  return (
    <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 py-5">
      <div className="lg:grid lg:grid-cols-[250px_minmax(0,_1fr)_320px] lg:gap-8">
        
        {/* --- 左サイドバー --- */}
        <aside className="hidden lg:block h-screen sticky top-5">
            <div className="flex h-full flex-col justify-between p-4">
                <nav className="flex flex-col gap-2">
                    <Link to="/" className="text-2xl font-bold text-text-main hover:text-primary mb-4">withham</Link>
                    <NavLink to="/" className={({ isActive }) => isActive ? activeNavLinkClass : navLinkClass} end><HouseIcon /><p className="text-sm font-medium">Home</p></NavLink>
                    <NavLink to="/qa" className={({ isActive }) => isActive ? activeNavLinkClass : navLinkClass}><QuestionIcon /><p className="text-sm font-medium">Q&A</p></NavLink>
                    <NavLink to="/hamsters" className={({ isActive }) => isActive ? activeNavLinkClass : navLinkClass}><CompassIcon /><p className="text-sm font-medium">ハムスター管理</p></NavLink>
                    <NavLink to="/health-logs" className={({ isActive }) => isActive ? activeNavLinkClass : navLinkClass}><BookmarkIcon /><p className="text-sm font-medium">健康ログ</p></NavLink>
                    <NavLink to="/schedules" className={({ isActive }) => isActive ? activeNavLinkClass : navLinkClass}><CalendarIcon /><p className="text-sm font-medium">スケジュール</p></NavLink>
                    {currentUser && (
                        <NavLink to={`/profile/${currentUser.id}`} className={({ isActive }) => isActive ? activeNavLinkClass : navLinkClass}><UserIcon /><p className="text-sm font-medium">Profile</p></NavLink>
                    )}
                </nav>
                <button onClick={logout} className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 px-4 bg-primary text-white text-sm font-bold">
                    <span className="truncate">Sign out</span>
                </button>
            </div>
        </aside>

        {/* --- 中央コンテンツ --- */}
        <main className="w-full">
          <Outlet />
        </main>

        {/* --- 右サイドバー --- */}
        <RightSidebar />
      </div>
    </div>
  );
}
