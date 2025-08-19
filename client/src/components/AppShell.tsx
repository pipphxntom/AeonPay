import { ReactNode } from 'react';
import BottomNavigation from './BottomNavigation';

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen gradient-mesh">
      <div className="max-w-md mx-auto min-h-screen bg-transparent relative">
        <main className="px-4 pt-12 pb-24">
          {children}
        </main>
        <BottomNavigation />
      </div>
    </div>
  );
}
