import { useState } from 'react';
import { Bot, Send, PlusCircle, DollarSign, ShoppingBag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIAction {
  type: string;
  data: any;
}

interface CoachDrawerProps {
  onActionTrigger?: (action: AIAction) => void;
}

export function CoachDrawer({ onActionTrigger }: CoachDrawerProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm your AeonPay AI coach. I can help you create spending plans, manage vouchers, find deals, and optimize your group expenses. What would you like to do?",
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');

  const quickChips = [
    { label: 'Plan ₹300/head', message: 'Create a spending plan for ₹300 per person' },
    { label: 'Add ₹50 each', message: 'Add ₹50 vouchers for each group member' },
    { label: 'Find canteen deals', message: 'Find the best canteen deals near me' }
  ];

  const coachMutation = useMutation({
    mutationFn: (data: { message: string; campus_id?: string }) => 
      apiRequest('/api/ai/coach', 'POST', data),
    onSuccess: (response) => {
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);

      // Handle AI actions
      if (response.actions && response.actions.length > 0) {
        response.actions.forEach((action: AIAction) => {
          if (onActionTrigger) {
            onActionTrigger(action);
          }
          
          // Show action banner
          setTimeout(() => {
            toast({
              title: "AI Prepared Action",
              description: `Ready to ${action.type.replace('_', ' ')} - check the modal that opened.`,
            });
          }, 1000);
        });
      }
    },
    onError: () => {
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: "I'm having some technical difficulties right now. Please try again in a moment.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  });

  const handleSendMessage = (messageText: string = inputMessage) => {
    if (!messageText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');

    coachMutation.mutate({
      message: messageText,
      campus_id: 'campus-1' // Default campus
    });
  };

  const handleQuickChip = (chip: { label: string; message: string }) => {
    handleSendMessage(chip.message);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          className="fixed bottom-20 right-4 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg"
          data-testid="button-ai-coach"
        >
          <Bot className="w-6 h-6 text-white" />
        </Button>
      </SheetTrigger>
      
      <SheetContent side="right" className="w-full sm:max-w-md bg-gradient-to-br from-slate-900/95 to-purple-900/95 backdrop-blur-xl border-white/10">
        <SheetHeader>
          <SheetTitle className="text-white flex items-center space-x-2">
            <Bot className="w-5 h-5 text-purple-400" />
            <span>AI Coach</span>
          </SheetTitle>
          <SheetDescription className="text-white/70">
            Your personal financial planning assistant
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col h-full mt-6">
          {/* Quick Action Chips */}
          <div className="mb-4">
            <p className="text-white/60 text-sm mb-3">Quick actions:</p>
            <div className="flex flex-wrap gap-2">
              {quickChips.map((chip, index) => (
                <Button
                  key={index}
                  onClick={() => handleQuickChip(chip)}
                  variant="outline"
                  size="sm"
                  className="bg-white/10 border-white/20 text-white text-xs hover:bg-white/20"
                  data-testid={`chip-${chip.label.replace(/[^\w]/g, '-').toLowerCase()}`}
                >
                  {chip.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 mb-4">
            <div className="space-y-4 pr-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl p-3 ${
                      message.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white/10 text-white backdrop-blur-sm'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
              
              {coachMutation.isPending && (
                <div className="flex justify-start">
                  <div className="bg-white/10 rounded-2xl p-3 backdrop-blur-sm">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-white/60 text-xs">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="flex space-x-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask me anything about spending plans..."
              className="flex-1 bg-white/10 border-white/20 text-white placeholder-white/50"
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              data-testid="input-coach-message"
            />
            <Button
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim() || coachMutation.isPending}
              className="bg-purple-500 hover:bg-purple-600"
              data-testid="button-send-message"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}