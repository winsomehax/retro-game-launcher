
import React, { useRef, useEffect, useCallback, createRef } from 'react';
import { GameControllerIcon, CogIcon, SearchIcon, KeyIcon } from './Icons';
import { NavView } from '../types';

interface NavbarProps {
  currentView: NavView;
  onNavigate: (view: NavView) => void;
  gamesCount: number;
  platformsCount: number;
  emulatorsCount: number;
}

interface IconProps {
  className?: string;
}

const NavItem: React.FC<{
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  // Forwarding ref to the button element
  buttonRef?: React.RefObject<HTMLButtonElement | null>; 
}> = ({ label, icon, isActive, onClick, buttonRef }) => (
  <button
    ref={buttonRef}
    onClick={onClick}
    className={`flex w-full items-center px-4 py-3 space-x-3 rounded-lg transition-all duration-200 ease-in-out group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-800
                ${isActive 
                  ? 'bg-primary text-white shadow-lg transform scale-105' 
                  : 'text-neutral-400 hover:bg-neutral-700 hover:text-neutral-100'
                }`}
    aria-current={isActive ? 'page' : undefined}
    role="menuitem"
  >
    {React.cloneElement(icon as React.ReactElement<IconProps>, { className: `w-6 h-6 ${isActive ? 'text-white' : 'text-neutral-400 group-hover:text-neutral-100'}` })}
    <span className={`font-medium text-sm ${isActive ? 'text-white' : 'text-neutral-300 group-hover:text-neutral-100'}`}>{label}</span>
  </button>
);

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate, gamesCount, platformsCount, emulatorsCount }) => {
  const navItemsData: { view: NavView; label: string; icon: React.ReactNode }[] = [
    { view: 'games', label: 'Games', icon: <GameControllerIcon /> },
    { view: 'platforms', label: 'Platforms', icon: <CogIcon /> },
    { view: 'scan', label: 'Scan ROMs', icon: <SearchIcon /> },
    { view: 'apikeys', label: 'API Keys', icon: <KeyIcon /> },
  ];

  const navItemRefs = useRef(navItemsData.map(() => createRef<HTMLButtonElement>()));
  const navContainerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const currentIndex = navItemsData.findIndex(item => item.view === currentView);
      let nextIndex;
      if (event.key === 'ArrowDown') {
        nextIndex = (currentIndex + 1) % navItemsData.length;
      } else {
        nextIndex = (currentIndex - 1 + navItemsData.length) % navItemsData.length;
      }
      navItemRefs.current[nextIndex].current?.focus();
      // Optional: onNavigate(navItemsData[nextIndex].view); // if you want selection to change with arrows
    }
  }, [currentView, navItemsData, onNavigate]);

  // Focus the current view's nav item when currentView changes
  useEffect(() => {
    const currentIndex = navItemsData.findIndex(item => item.view === currentView);
    if (currentIndex !== -1) {
       // navItemRefs.current[currentIndex].current?.focus(); // Auto-focusing might be disruptive. User can tab into nav.
    }
  }, [currentView, navItemsData]);


  return (
    <nav 
      ref={navContainerRef}
      className="w-64 bg-neutral-800 p-5 flex flex-col shadow-xl h-full"
      onKeyDown={handleKeyDown}
      role="menu"
      aria-orientation="vertical"
      aria-label="Main navigation"
    >
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-display font-bold text-primary">LAUNCHER</h1>
        <p className="text-xs text-neutral-500 font-sans">HyperModern Edition</p>
      </div>
      <div className="space-y-3">
        {navItemsData.map((item, index) => (
          <NavItem
            key={item.view}
            buttonRef={navItemRefs.current[index]}
            label={item.label}
            icon={item.icon}
            isActive={currentView === item.view}
            onClick={() => onNavigate(item.view)}
          />
        ))}
      </div>
      <div className="mt-auto pt-4 border-t border-neutral-700">
        <div className="px-4 py-3 space-y-2 text-xs text-neutral-400">
          <div className="flex justify-between"><span>Games:</span> <span className="font-medium text-neutral-200">{gamesCount}</span></div>
          <div className="flex justify-between"><span>Platforms:</span> <span className="font-medium text-neutral-200">{platformsCount}</span></div>
          <div className="flex justify-between"><span>Emulators:</span> <span className="font-medium text-neutral-200">{emulatorsCount}</span></div>
        </div>
         <div className="mt-2 pt-4 border-t border-neutral-700">
            <p className="text-xs text-neutral-500 text-center">© 2024 Retro Systems Inc.</p>
         </div>
      </div>
    </nav>
  );
};