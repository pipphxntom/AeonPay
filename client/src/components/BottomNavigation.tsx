import { useLocation } from 'wouter';
import { Home, CreditCard, Users, ArrowLeftRight, User } from 'lucide-react';
import { useAppStore } from '@/lib/store';

export default function BottomNavigation() {
  const [location, navigate] = useLocation();
  const { setCurrentScreen } = useAppStore();

  const navItems = [
    { path: '/', icon: Home, label: 'Home', screen: 'home' },
    { path: '/pay', icon: CreditCard, label: 'Pay', screen: 'pay' },
    { path: '/plans', icon: Users, label: 'Plans', screen: 'plans' },
    { path: '/swap', icon: ArrowLeftRight, label: 'Swap', screen: 'swap' },
    { path: '/me', icon: User, label: 'Me', screen: 'me' },
  ];

  const handleNavigation = (path: string, screen: string) => {
    navigate(path);
    setCurrentScreen(screen);
  };

  return (
    <nav 
      className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md glass-nav"
      data-testid="bottom-navigation"
    >
      <div className="flex items-center justify-around py-3 px-4">
        {navItems.map(({ path, icon: Icon, label, screen }) => {
          const isActive = location === path;
          
          return (
            <button
              key={path}
              onClick={() => handleNavigation(path, screen)}
              className={`tap-target focus-ring flex flex-col items-center space-y-1 transition-colors ${
                isActive 
                  ? 'text-white' 
                  : 'text-white/60 hover:text-white'
              }`}
              data-testid={`nav-${screen}`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
