import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, MapPin, Star, Clock, Zap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { formatAmount } from '@/lib/i18n';

interface Merchant {
  id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  capDeal?: {
    title: string;
    discount: string;
    validUntil: string;
  };
  busyHours: { [hour: number]: number }; // 0-23 -> busy level 0-1
  rating: number;
  estimatedTime: number; // minutes
  distance: number; // meters
  isOpen: boolean;
}

interface CampusMapProps {
  onMerchantSelect?: (merchant: Merchant) => void;
  filterCategory?: string;
}

const CAMPUS_ZONES = [
  { id: 'academic', name: 'Academic Block', x: 200, y: 150, color: '#3B82F6' },
  { id: 'cafeteria', name: 'Main Cafeteria', x: 350, y: 200, color: '#EF4444' },
  { id: 'hostels', name: 'Hostel Area', x: 150, y: 300, color: '#10B981' },
  { id: 'sports', name: 'Sports Complex', x: 400, y: 320, color: '#F59E0B' },
  { id: 'library', name: 'Library', x: 250, y: 180, color: '#8B5CF6' },
  { id: 'gate', name: 'Main Gate', x: 300, y: 100, color: '#6B7280' }
];

const MOCK_MERCHANTS: Merchant[] = [
  {
    id: 'chai-point-1',
    name: 'Chai Point Express',
    category: 'chai',
    lat: 0.35,
    lng: 0.2,
    capDeal: {
      title: 'Student Special',
      discount: '₹5 off on orders above ₹30',
      validUntil: '2025-08-25'
    },
    busyHours: { 8: 0.9, 9: 0.7, 10: 0.4, 16: 0.8, 17: 0.9, 18: 0.6 },
    rating: 4.2,
    estimatedTime: 3,
    distance: 120,
    isOpen: true
  },
  {
    id: 'pizza-corner',
    name: 'Pizza Corner',
    category: 'pizza',
    lat: 0.4,
    lng: 0.32,
    capDeal: {
      title: 'Slice Deal',
      discount: 'Buy 2 Get 1 Free',
      validUntil: '2025-08-30'
    },
    busyHours: { 12: 0.8, 13: 0.9, 19: 0.8, 20: 0.9, 21: 0.7 },
    rating: 4.5,
    estimatedTime: 8,
    distance: 250,
    isOpen: true
  },
  {
    id: 'healthy-bites',
    name: 'Healthy Bites',
    category: 'canteen',
    lat: 0.25,
    lng: 0.18,
    rating: 4.0,
    estimatedTime: 5,
    distance: 80,
    isOpen: true,
    busyHours: { 12: 0.6, 13: 0.8, 14: 0.7, 18: 0.5, 19: 0.6 }
  },
  {
    id: 'stationery-hub',
    name: 'Campus Stationery',
    category: 'stationery',
    lat: 0.2,
    lng: 0.15,
    rating: 3.8,
    estimatedTime: 2,
    distance: 150,
    isOpen: false,
    busyHours: { 9: 0.5, 10: 0.7, 11: 0.8, 15: 0.6, 16: 0.7 }
  }
];

const CATEGORY_FILTERS = [
  { value: 'all', label: 'All', icon: '🏪' },
  { value: 'chai', label: 'Tea & Coffee', icon: '☕' },
  { value: 'canteen', label: 'Canteen', icon: '🍽️' },
  { value: 'pizza', label: 'Pizza', icon: '🍕' },
  { value: 'stationery', label: 'Stationery', icon: '📚' },
  { value: 'deals', label: 'Cap-Deals', icon: '💰' }
];

export function CampusMap({ onMerchantSelect, filterCategory }: CampusMapProps) {
  const { t } = useTranslation(['common', 'campus']);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(filterCategory || 'all');
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  const currentHour = new Date().getHours();

  const filteredMerchants = useMemo(() => {
    return MOCK_MERCHANTS.filter(merchant => {
      const matchesSearch = merchant.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || 
                             merchant.category === selectedCategory ||
                             (selectedCategory === 'deals' && merchant.capDeal);
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const getBusyLevel = (merchant: Merchant): 'low' | 'medium' | 'high' => {
    const level = merchant.busyHours[currentHour] || 0;
    if (level > 0.7) return 'high';
    if (level > 0.4) return 'medium';
    return 'low';
  };

  const getBusyColor = (level: 'low' | 'medium' | 'high'): string => {
    const colors = {
      low: '#10B981',
      medium: '#F59E0B', 
      high: '#EF4444'
    };
    return colors[level];
  };

  const handleMerchantClick = (merchant: Merchant) => {
    setSelectedMerchant(merchant);
    onMerchantSelect?.(merchant);
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search merchants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-merchant-search"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-48" data-testid="select-category-filter">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_FILTERS.map(category => (
              <SelectItem key={category.value} value={category.value}>
                <span className="flex items-center gap-2">
                  <span>{category.icon}</span>
                  {category.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'map' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('map')}
            data-testid="button-map-view"
          >
            <MapPin className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
            data-testid="button-list-view"
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Map/List View */}
      <AnimatePresence mode="wait">
        {viewMode === 'map' ? (
          <motion.div
            key="map"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 rounded-xl border p-4 overflow-hidden"
            style={{ height: '400px' }}
            data-testid="campus-map-view"
          >
            {/* Campus Zones */}
            <svg className="absolute inset-0 w-full h-full">
              {CAMPUS_ZONES.map(zone => (
                <g key={zone.id}>
                  <circle
                    cx={zone.x}
                    cy={zone.y}
                    r="20"
                    fill={zone.color}
                    opacity="0.2"
                  />
                  <text
                    x={zone.x}
                    y={zone.y + 30}
                    textAnchor="middle"
                    className="text-xs font-medium fill-gray-600"
                  >
                    {zone.name}
                  </text>
                </g>
              ))}
            </svg>

            {/* Merchants */}
            {filteredMerchants.map(merchant => {
              const x = merchant.lng * 500;
              const y = merchant.lat * 400;
              const busyLevel = getBusyLevel(merchant);

              return (
                <motion.div
                  key={merchant.id}
                  className="absolute cursor-pointer"
                  style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleMerchantClick(merchant)}
                  data-testid={`merchant-pin-${merchant.id}`}
                >
                  <div className="relative">
                    {/* Pin */}
                    <div 
                      className={`w-6 h-6 rounded-full border-2 border-white shadow-lg ${
                        merchant.isOpen ? 'bg-green-500' : 'bg-gray-400'
                      }`}
                    />
                    
                    {/* Cap-Deal Badge */}
                    {merchant.capDeal && (
                      <div className="absolute -top-2 -right-2">
                        <Zap className="h-4 w-4 text-yellow-500" fill="currentColor" />
                      </div>
                    )}
                    
                    {/* Busy Indicator */}
                    <div 
                      className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-3 h-1 rounded-full"
                      style={{ backgroundColor: getBusyColor(busyLevel) }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-3"
            data-testid="campus-list-view"
          >
            {filteredMerchants.map(merchant => {
              const busyLevel = getBusyLevel(merchant);
              
              return (
                <Card 
                  key={merchant.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleMerchantClick(merchant)}
                  data-testid={`merchant-card-${merchant.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{merchant.name}</h3>
                          {!merchant.isOpen && (
                            <Badge variant="secondary" className="text-xs">Closed</Badge>
                          )}
                          {merchant.capDeal && (
                            <Badge variant="default" className="text-xs bg-yellow-500">
                              <Zap className="h-3 w-3 mr-1" />
                              Deal
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            {merchant.rating}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {merchant.estimatedTime}m
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {merchant.distance}m
                          </div>
                          <div className="flex items-center gap-1">
                            <div 
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: getBusyColor(busyLevel) }}
                            />
                            {busyLevel === 'low' ? 'Not busy' : busyLevel === 'medium' ? 'Moderately busy' : 'Very busy'}
                          </div>
                        </div>

                        {merchant.capDeal && (
                          <div className="mt-2 p-2 bg-yellow-50 rounded-lg border border-yellow-200">
                            <p className="text-sm font-medium text-yellow-800">{merchant.capDeal.title}</p>
                            <p className="text-xs text-yellow-600">{merchant.capDeal.discount}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Merchant Detail Modal */}
      <Dialog open={!!selectedMerchant} onOpenChange={() => setSelectedMerchant(null)}>
        <DialogContent className="max-w-md" data-testid="modal-merchant-detail">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedMerchant?.name}
              {selectedMerchant?.capDeal && (
                <Badge className="bg-yellow-500">
                  <Zap className="h-3 w-3 mr-1" />
                  Cap-Deal
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedMerchant && (
            <div className="space-y-4">
              {/* Basic Info */}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  {selectedMerchant.rating}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {selectedMerchant.estimatedTime} min
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {selectedMerchant.distance}m away
                </div>
              </div>

              {/* Cap-Deal */}
              {selectedMerchant.capDeal && (
                <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-yellow-800">
                      {selectedMerchant.capDeal.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-yellow-700 font-medium mb-2">
                      {selectedMerchant.capDeal.discount}
                    </p>
                    <p className="text-xs text-yellow-600">
                      Valid until {new Date(selectedMerchant.capDeal.validUntil).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Busy Hours */}
              <div>
                <h4 className="font-medium mb-2">Busy Hours Today</h4>
                <div className="grid grid-cols-12 gap-1">
                  {Array.from({ length: 12 }, (_, i) => {
                    const hour = i + 8; // 8 AM to 8 PM
                    const busyLevel = selectedMerchant.busyHours[hour] || 0;
                    const isCurrentHour = hour === currentHour;
                    
                    return (
                      <div key={hour} className="text-center">
                        <div 
                          className={`h-8 rounded-sm border ${isCurrentHour ? 'border-blue-500 border-2' : 'border-gray-200'}`}
                          style={{ 
                            backgroundColor: busyLevel > 0 ? getBusyColor(
                              busyLevel > 0.7 ? 'high' : busyLevel > 0.4 ? 'medium' : 'low'
                            ) : '#f3f4f6',
                            opacity: busyLevel > 0 ? 0.3 + (busyLevel * 0.7) : 0.3
                          }}
                        />
                        <p className="text-xs mt-1">{hour}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    Low
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                    Medium
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    High
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button 
                  className="flex-1" 
                  disabled={!selectedMerchant.isOpen}
                  data-testid="button-pay-now"
                >
                  Pay Now
                </Button>
                <Button variant="outline" className="flex-1" data-testid="button-get-directions">
                  Directions
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}