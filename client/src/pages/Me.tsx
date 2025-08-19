import { 
  Edit, 
  History, 
  Bell, 
  Settings, 
  HelpCircle, 
  LogOut,
  ChevronRight,
  User as UserIcon,
  Phone,
  Mail
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth, useLogout } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

interface MenuItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ComponentType;
  action: () => void;
  variant?: 'default' | 'destructive';
}

export default function Me() {
  const { data: user } = useAuth();
  const logoutMutation = useLogout();
  const { toast } = useToast();

  const handleFeatureClick = (feature: string) => {
    toast({
      title: "Feature Coming Soon",
      description: `${feature} will be available in future updates.`,
    });
  };

  const handleLogout = () => {
    toast({
      title: "Logging out...",
      description: "You have been successfully logged out.",
    });
    logoutMutation.mutate();
  };

  const menuItems: MenuItem[] = [
    {
      id: 'transactions',
      label: 'Transaction History',
      description: 'View all your payments and transactions',
      icon: History,
      action: () => handleFeatureClick('Transaction History'),
    },
    {
      id: 'notifications',
      label: 'Notifications',
      description: 'Manage your notification preferences',
      icon: Bell,
      action: () => handleFeatureClick('Notifications'),
    },
    {
      id: 'settings',
      label: 'Settings',
      description: 'Account and app preferences',
      icon: Settings,
      action: () => handleFeatureClick('Settings'),
    },
    {
      id: 'support',
      label: 'Help & Support',
      description: 'Get help and contact support',
      icon: HelpCircle,
      action: () => handleFeatureClick('Help & Support'),
    },
    {
      id: 'logout',
      label: 'Logout',
      description: 'Sign out of your account',
      icon: LogOut,
      action: handleLogout,
      variant: 'destructive',
    },
  ];

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Profile</h1>
        <p className="text-white/80">Manage your account and preferences</p>
      </div>

      {/* Profile Card */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-16 h-16 rounded-full brand-gradient flex items-center justify-center text-white font-bold text-xl">
            {user?.name ? getInitials(user.name) : 'U'}
          </div>
          <div className="flex-1">
            <h3 className="text-white font-semibold text-lg">{user?.name || 'User'}</h3>
            <div className="space-y-1">
              <div className="flex items-center space-x-2 text-white/70 text-sm">
                <Phone className="w-4 h-4" />
                <span>{user?.phone || '+91 98765 43210'}</span>
              </div>
              {user?.email && (
                <div className="flex items-center space-x-2 text-white/70 text-sm">
                  <Mail className="w-4 h-4" />
                  <span>{user.email}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <Button
          onClick={() => handleFeatureClick('Profile Edit')}
          className="w-full bg-white/20 hover:bg-white/30 transition-colors text-white font-medium py-3 px-4 tap-target focus-ring"
          data-testid="button-edit-profile"
        >
          <Edit className="w-4 h-4 mr-2" />
          Edit Profile
        </Button>
      </div>

      {/* Account Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass-card rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white mb-1">12</div>
          <p className="text-white/70 text-sm">Active Plans</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white mb-1">₹2,450</div>
          <p className="text-white/70 text-sm">Total Saved</p>
        </div>
      </div>

      {/* Menu Items */}
      <div className="space-y-3">
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <Button
              key={item.id}
              onClick={item.action}
              className={`w-full glass-card rounded-xl p-4 hover:bg-white/20 transition-all duration-300 h-auto tap-target focus-ring ${
                item.variant === 'destructive' 
                  ? 'hover:bg-red-500/20' 
                  : ''
              }`}
              variant="ghost"
              data-testid={`menu-item-${item.id}`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-3">
                  <div className={`w-5 h-5 flex items-center justify-center ${
                    item.variant === 'destructive' ? 'text-red-400' : 'text-white/70'
                  }`}>
                    <IconComponent />
                  </div>
                  <div className="text-left">
                    <span 
                      className={`font-medium ${
                        item.variant === 'destructive' 
                          ? 'text-red-400' 
                          : 'text-white'
                      }`}
                    >
                      {item.label}
                    </span>
                    {item.description && (
                      <p className="text-white/60 text-xs mt-0.5">{item.description}</p>
                    )}
                  </div>
                </div>
                <ChevronRight 
                  className={`w-4 h-4 ${
                    item.variant === 'destructive' 
                      ? 'text-red-400/50' 
                      : 'text-white/50'
                  }`} 
                />
              </div>
            </Button>
          );
        })}
      </div>

      {/* App Info */}
      <div className="glass-card rounded-xl p-4 text-center">
        <div className="w-12 h-12 brand-gradient rounded-xl mx-auto mb-3 flex items-center justify-center">
          <span className="text-white font-bold text-lg">Æ</span>
        </div>
        <h4 className="text-white font-semibold mb-1">AeonPay</h4>
        <p className="text-white/60 text-sm mb-2">Version 1.0.0</p>
        <p className="text-white/50 text-xs">
          Smart group payments made simple
        </p>
      </div>
    </div>
  );
}
