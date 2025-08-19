import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface PerformanceMetrics {
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  ttfb: number; // Time to First Byte
}

interface PerformanceMonitorProps {
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
  showDebug?: boolean;
}

export function PerformanceMonitor({ onMetricsUpdate, showDebug = false }: PerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<Partial<PerformanceMetrics>>({});
  const [isVisible, setIsVisible] = useState(showDebug);

  useEffect(() => {
    // Performance observer for Core Web Vitals
    const observeWebVitals = () => {
      // First Contentful Paint
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name === 'first-contentful-paint') {
            updateMetric('fcp', entry.startTime);
          }
        });
      }).observe({ entryTypes: ['paint'] });

      // Largest Contentful Paint
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          updateMetric('lcp', lastEntry.startTime);
        }
      }).observe({ entryTypes: ['largest-contentful-paint'] });

      // First Input Delay
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          updateMetric('fid', entry.processingStart - entry.startTime);
        });
      }).observe({ entryTypes: ['first-input'] });

      // Cumulative Layout Shift
      new PerformanceObserver((list) => {
        let clsValue = 0;
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        updateMetric('cls', clsValue);
      }).observe({ entryTypes: ['layout-shift'] });

      // Time to First Byte
      if ('navigation' in performance) {
        const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
        if (navEntries.length > 0) {
          const ttfb = navEntries[0].responseStart - navEntries[0].requestStart;
          updateMetric('ttfb', ttfb);
        }
      }
    };

    const updateMetric = (key: keyof PerformanceMetrics, value: number) => {
      setMetrics(prev => {
        const newMetrics = { ...prev, [key]: value };
        onMetricsUpdate?.(newMetrics as PerformanceMetrics);
        return newMetrics;
      });
    };

    // Initialize performance monitoring
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      observeWebVitals();
    }

    // Bundle size check (development only)
    if (import.meta.env.DEV) {
      checkBundleSize();
    }

    // Memory usage monitoring
    const monitorMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        console.log('[Performance] Memory usage:', {
          used: Math.round(memory.usedJSHeapSize / 1048576) + 'MB',
          allocated: Math.round(memory.totalJSHeapSize / 1048576) + 'MB',
          limit: Math.round(memory.jsHeapSizeLimit / 1048576) + 'MB'
        });
      }
    };

    const memoryInterval = setInterval(monitorMemory, 30000); // Every 30 seconds

    return () => {
      clearInterval(memoryInterval);
    };
  }, [onMetricsUpdate]);

  const checkBundleSize = async () => {
    try {
      // This would be enhanced to check actual bundle sizes in production
      const budgetLimit = 200 * 1024; // 200KB budget
      
      if (import.meta.env.DEV) {
        console.log('[Performance] Bundle size check - Development mode');
        console.log('[Performance] Budget limit: 200KB for main bundle');
        
        // In production, this would check actual bundle metrics
        // For now, just log the budget enforcement
      }
    } catch (error) {
      console.error('[Performance] Bundle size check failed:', error);
    }
  };

  const getMetricStatus = (key: keyof PerformanceMetrics, value: number): 'good' | 'needs-improvement' | 'poor' => {
    const thresholds = {
      fcp: { good: 1800, poor: 3000 },
      lcp: { good: 2500, poor: 4000 },
      fid: { good: 100, poor: 300 },
      cls: { good: 0.1, poor: 0.25 },
      ttfb: { good: 800, poor: 1800 }
    };

    const threshold = thresholds[key];
    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  };

  const getStatusColor = (status: string): string => {
    const colors = {
      good: 'text-green-600',
      'needs-improvement': 'text-yellow-600',
      poor: 'text-red-600'
    };
    return colors[status as keyof typeof colors] || 'text-gray-600';
  };

  // Keyboard shortcut to toggle debug view
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'P') {
        setIsVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed bottom-4 right-4 bg-black/90 text-white p-4 rounded-lg text-xs font-mono z-50 max-w-sm"
      data-testid="performance-monitor"
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">Performance Metrics</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white"
          data-testid="button-close-performance-monitor"
        >
          ×
        </button>
      </div>
      
      <div className="space-y-1">
        {Object.entries(metrics).map(([key, value]) => {
          if (value === undefined) return null;
          
          const status = getMetricStatus(key as keyof PerformanceMetrics, value);
          const unit = key === 'cls' ? '' : 'ms';
          
          return (
            <div key={key} className="flex justify-between items-center">
              <span className="uppercase">{key}:</span>
              <span className={getStatusColor(status)}>
                {typeof value === 'number' ? Math.round(value) : value}{unit}
              </span>
            </div>
          );
        })}
      </div>
      
      <div className="mt-2 pt-2 border-t border-gray-600 text-gray-400">
        <div>Press Ctrl+Shift+P to toggle</div>
        <div>Budget: 200KB JS, &lt;2.5s LCP</div>
      </div>
    </motion.div>
  );
}

// Preloader component for critical screens
export function ScreenPreloader({ screens }: { screens: string[] }) {
  useEffect(() => {
    const preloadScreen = async (path: string) => {
      try {
        // Preload route components (this would be enhanced based on your routing setup)
        if (path === '/dashboard') {
          await import('../pages/Dashboard');
        } else if (path === '/pay') {
          await import('../pages/Pay');
        }
        
        console.log(`[Preloader] Screen preloaded: ${path}`);
      } catch (error) {
        console.error(`[Preloader] Failed to preload ${path}:`, error);
      }
    };

    // Preload after idle
    const preloadAfterIdle = () => {
      screens.forEach(screen => {
        requestIdleCallback(() => preloadScreen(screen));
      });
    };

    // Start preloading after 2 seconds
    const timer = setTimeout(preloadAfterIdle, 2000);
    
    return () => clearTimeout(timer);
  }, [screens]);

  return null;
}

// Skeleton loader component
export function SkeletonLoader({ 
  type = 'card',
  count = 1,
  className = ''
}: { 
  type?: 'card' | 'list' | 'text' | 'image';
  count?: number;
  className?: string;
}) {
  const renderSkeleton = () => {
    switch (type) {
      case 'card':
        return (
          <div className={`bg-gray-200 rounded-lg p-4 space-y-3 ${className}`}>
            <div className="h-4 bg-gray-300 rounded w-3/4 animate-pulse" />
            <div className="h-3 bg-gray-300 rounded w-1/2 animate-pulse" />
            <div className="h-3 bg-gray-300 rounded w-5/6 animate-pulse" />
          </div>
        );
      
      case 'list':
        return (
          <div className={`space-y-2 ${className}`}>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-300 rounded-full animate-pulse" />
              <div className="flex-1 space-y-1">
                <div className="h-3 bg-gray-300 rounded w-3/4 animate-pulse" />
                <div className="h-2 bg-gray-300 rounded w-1/2 animate-pulse" />
              </div>
            </div>
          </div>
        );
      
      case 'text':
        return (
          <div className={`space-y-2 ${className}`}>
            <div className="h-4 bg-gray-300 rounded animate-pulse" />
            <div className="h-4 bg-gray-300 rounded w-5/6 animate-pulse" />
            <div className="h-4 bg-gray-300 rounded w-3/4 animate-pulse" />
          </div>
        );
      
      case 'image':
        return (
          <div className={`bg-gray-300 rounded-lg animate-pulse ${className}`} 
               style={{ aspectRatio: '16/9' }} />
        );
      
      default:
        return <div className={`h-4 bg-gray-300 rounded animate-pulse ${className}`} />;
    }
  };

  return (
    <div data-testid={`skeleton-${type}`}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="mb-4 last:mb-0">
          {renderSkeleton()}
        </div>
      ))}
    </div>
  );
}