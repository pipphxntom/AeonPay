import React from 'react';
import { Link, useLocation } from 'wouter';
import { useAuthStore } from '../store/auth';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { merchant, logout } = useAuthStore();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: '📊', current: location === '/' },
    { name: 'Offers', href: '/offers', icon: '🎯', current: location === '/offers' },
    { name: 'Settlements', href: '/settlements', icon: '💰', current: location === '/settlements' },
    { name: 'Analytics', href: '/analytics', icon: '📈', current: location === '/analytics' },
  ];

  return (
    <div className="min-h-screen gradient-mesh">
      {/* Header */}
      <header className="glass-card border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-white">Merchant OS</h1>
              <span className="ml-3 px-3 py-1 bg-white/10 rounded-full text-white/70 text-sm">
                {merchant?.name}
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-white/70 text-sm">Online</span>
              </div>
              
              <button
                onClick={logout}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                data-testid="button-logout"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="glass-card border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-3 py-4 text-sm font-medium transition-colors ${
                  item.current
                    ? 'text-white border-b-2 border-white'
                    : 'text-white/70 hover:text-white'
                }`}
                data-testid={`nav-${item.name.toLowerCase()}`}
              >
                <span className="mr-2">{item.icon}</span>
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}