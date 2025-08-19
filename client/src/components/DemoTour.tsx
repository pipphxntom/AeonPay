import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { X, Play, SkipForward, RotateCcw } from 'lucide-react';

interface DemoStep {
  id: string;
  title: string;
  description: string;
  duration: number;
  action?: () => void;
  highlight?: string;
}

const DEMO_SCRIPTS = {
  core: {
    title: "Core Features (90 seconds)",
    description: "Create Plan → Reserve Vouchers → Scan & Pay → Guardrail → Top-up → Success",
    steps: [
      {
        id: "create-plan",
        title: "Create Spending Plan",
        description: "Set up a group plan with ₹300/head budget for 4 friends",
        duration: 15000,
        highlight: "#create-plan-button"
      },
      {
        id: "reserve-vouchers", 
        title: "Reserve Vouchers",
        description: "Allocate vouchers for food, transport, and entertainment",
        duration: 10000,
        highlight: "#voucher-section"
      },
      {
        id: "scan-pay",
        title: "Scan & Pay",
        description: "Use QR scanner to pay at campus merchant",
        duration: 20000,
        highlight: "#qr-scanner"
      },
      {
        id: "guardrail",
        title: "Smart Guardrail",
        description: "AI coaching prevents overspending with helpful nudge",
        duration: 15000,
        highlight: "#guardrail-dialog"
      },
      {
        id: "top-up",
        title: "Plan Top-up",
        description: "Add more funds when needed via mandate system",
        duration: 15000,
        highlight: "#mandate-section"
      },
      {
        id: "merchant-view",
        title: "Merchant Dashboard",
        description: "View redemption in Merchant OS with real-time updates",
        duration: 15000,
        highlight: "#merchant-dashboard"
      }
    ]
  },
  swap: {
    title: "Peer Swap (60 seconds)",
    description: "Cash→UPI with Two-Way QR in split browser windows",
    steps: [
      {
        id: "swap-request",
        title: "Create Swap Request", 
        description: "Request ₹500 UPI for ₹500 cash near campus",
        duration: 15000,
        highlight: "#swap-form"
      },
      {
        id: "match-peer",
        title: "Find Peer Match",
        description: "AI matches with nearby student based on trust score",
        duration: 10000,
        highlight: "#peer-matching"
      },
      {
        id: "two-way-qr",
        title: "Two-Way QR Exchange",
        description: "Both parties scan QR codes simultaneously",
        duration: 20000,
        highlight: "#qr-exchange"
      },
      {
        id: "trust-update",
        title: "Trust Score Update",
        description: "Successful swap increases both users' trust scores",
        duration: 15000,
        highlight: "#trust-score"
      }
    ]
  },
  ai: {
    title: "AI Coach (45 seconds)",
    description: "Natural language plan creation with smart suggestions",
    steps: [
      {
        id: "ai-input",
        title: "Natural Language Input",
        description: "'We are 4 friends, ₹300/head near campus'",
        duration: 10000,
        highlight: "#ai-chat"
      },
      {
        id: "ai-processing",
        title: "AI Plan Creation",
        description: "Coach analyzes request and creates optimized plan",
        duration: 15000,
        highlight: "#ai-thinking"
      },
      {
        id: "smart-suggestions",
        title: "Smart Merchant Selection",
        description: "AI suggests best campus merchants with discounts",
        duration: 10000,
        highlight: "#merchant-suggestions"
      },
      {
        id: "guardrail-demo",
        title: "Guardrail Variant",
        description: "Different nudge variants tested via bandit algorithm",
        duration: 10000,
        highlight: "#nudge-variants"
      }
    ]
  },
  pwa: {
    title: "PWA Offline (30 seconds)",
    description: "Install app, work offline, sync when reconnected",
    steps: [
      {
        id: "install-prompt",
        title: "Install App",
        description: "Add AeonPay to home screen as native app",
        duration: 10000,
        highlight: "#install-button"
      },
      {
        id: "offline-mode",
        title: "Offline Functionality", 
        description: "Create payments while disconnected from internet",
        duration: 10000,
        highlight: "#offline-indicator"
      },
      {
        id: "sync-resume",
        title: "Auto-Sync Resume",
        description: "Queued actions process when connection restored",
        duration: 10000,
        highlight: "#sync-status"
      }
    ]
  }
};

interface DemoTourProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DemoTour({ isOpen, onClose }: DemoTourProps) {
  const [selectedDemo, setSelectedDemo] = useState<keyof typeof DEMO_SCRIPTS | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isPlaying || !selectedDemo) return;

    const demo = DEMO_SCRIPTS[selectedDemo];
    const step = demo.steps[currentStep];
    
    const timer = setTimeout(() => {
      if (currentStep < demo.steps.length - 1) {
        setCurrentStep(prev => prev + 1);
        setProgress(0);
      } else {
        setIsPlaying(false);
        setProgress(100);
      }
    }, step.duration);

    const progressTimer = setInterval(() => {
      setProgress(prev => Math.min(prev + (100 / (step.duration / 100)), 100));
    }, 100);

    return () => {
      clearTimeout(timer);
      clearInterval(progressTimer);
    };
  }, [isPlaying, selectedDemo, currentStep]);

  const startDemo = (demoKey: keyof typeof DEMO_SCRIPTS) => {
    setSelectedDemo(demoKey);
    setCurrentStep(0);
    setProgress(0);
    setIsPlaying(true);
  };

  const pauseDemo = () => setIsPlaying(false);
  const resumeDemo = () => setIsPlaying(true);
  const skipStep = () => {
    if (selectedDemo && currentStep < DEMO_SCRIPTS[selectedDemo].steps.length - 1) {
      setCurrentStep(prev => prev + 1);
      setProgress(0);
    }
  };

  const resetDemo = () => {
    setCurrentStep(0);
    setProgress(0);
    setIsPlaying(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>AeonPay Demo Tour</CardTitle>
            <CardDescription>
              Guided walkthrough of key features and capabilities
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {!selectedDemo ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(DEMO_SCRIPTS).map(([key, demo]) => (
                <Card key={key} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{demo.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {demo.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button 
                      onClick={() => startDemo(key as keyof typeof DEMO_SCRIPTS)}
                      className="w-full"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start Demo
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">
                    {DEMO_SCRIPTS[selectedDemo].title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Step {currentStep + 1} of {DEMO_SCRIPTS[selectedDemo].steps.length}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={resetDemo}>
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={skipStep}>
                    <SkipForward className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={isPlaying ? pauseDemo : resumeDemo}
                  >
                    {isPlaying ? 'Pause' : 'Resume'}
                  </Button>
                </div>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-100"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {DEMO_SCRIPTS[selectedDemo].steps[currentStep].title}
                    <Badge variant="secondary">
                      {Math.ceil(DEMO_SCRIPTS[selectedDemo].steps[currentStep].duration / 1000)}s
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {DEMO_SCRIPTS[selectedDemo].steps[currentStep].description}
                  </CardDescription>
                </CardHeader>
              </Card>

              <div className="flex justify-between">
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedDemo(null)}
                >
                  Back to Menu
                </Button>
                <Badge variant="outline">
                  Demo running automatically...
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}