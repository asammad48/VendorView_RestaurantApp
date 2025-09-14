import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, ShoppingCart, DollarSign, Clock, Users, Star, ChefHat, Eye, Target, Calendar, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from "recharts";
import type { DashboardStats, TopPerformingItems, OccupancyData, HourlyOrders, Feedback } from "@/types/schema";
import "../styles/chart-animations.css";

// Chart colors using the centralized primary color #15803d
const COLORS = {
  primary: '#15803d',
  primaryHover: '#166534',
  primaryLight: '#22c55e',
  secondary: '#3b82f6',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  neutral: '#6b7280',
  positive: '#15803d',
  negative: '#ef4444',
  feedbackColors: ['#15803d', '#f59e0b', '#ef4444'],
  gradients: {
    primary: 'linear-gradient(135deg, #15803d, #22c55e)',
    secondary: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
    warning: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
    purple: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
    pink: 'linear-gradient(135deg, #ec4899, #f472b6)',
  },
  chartColors: [
    '#15803d', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899',
    '#06b6d4', '#84cc16', '#f97316', '#6366f1', '#14b8a6'
  ]
};

export default function Dashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState<"today" | "this_week" | "this_month">("today");

  // Fetch dashboard data
  const { data: dashboardStats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/dashboard/stats', selectedPeriod],
    enabled: false
  });

  const { data: topItems, isLoading: topItemsLoading } = useQuery({
    queryKey: ['/api/dashboard/top-items', selectedPeriod],
    enabled: false
  });

  const { data: occupancyData, isLoading: occupancyLoading } = useQuery({
    queryKey: ['/api/dashboard/occupancy', selectedPeriod],
    enabled: false
  });

  const { data: hourlyOrders, isLoading: hourlyLoading } = useQuery({
    queryKey: ['/api/dashboard/hourly-orders', selectedPeriod],
    enabled: false
  });

  const { data: feedbacks, isLoading: feedbacksLoading } = useQuery({
    queryKey: ['/api/dashboard/feedbacks', selectedPeriod],
    enabled: false
  });

  // Loading state
  if (statsLoading || topItemsLoading || occupancyLoading || hourlyLoading || feedbacksLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#15803d]"></div>
      </div>
    );
  }

  // Process feedback data for pie chart
  const feedbackDistribution = (() => {
    if (!Array.isArray(feedbacks) || feedbacks.length === 0) return [
      { name: 'Positive', value: 45, percentage: 65 },
      { name: 'Neutral', value: 15, percentage: 22 },
      { name: 'Negative', value: 9, percentage: 13 },
    ];
    
    const positive = feedbacks.filter((f: any) => f.rating >= 4).length;
    const neutral = feedbacks.filter((f: any) => f.rating === 3).length;
    const negative = feedbacks.filter((f: any) => f.rating <= 2).length;
    const total = feedbacks.length;

    return [
      { name: 'Positive', value: positive, percentage: Math.round((positive / total) * 100) },
      { name: 'Neutral', value: neutral, percentage: Math.round((neutral / total) * 100) },
      { name: 'Negative', value: negative, percentage: Math.round((negative / total) * 100) },
    ];
  })();

  // Get best selling category
  const bestSellingCategory = Array.isArray(topItems) && topItems.length > 0 ? (topItems as any)[0]?.category || "Main Course" : "Main Course";

  // Format currency
  const formatCurrency = (amount: number) => `$${(amount / 100).toLocaleString()}`;

  // Current occupancy percentage
  const currentOccupancy = (occupancyData as any)?.occupancyPercentage || 75;

  // Mock data for trends
  const revenueData = [
    { name: 'Mon', revenue: 4200, orders: 32 },
    { name: 'Tue', revenue: 3800, orders: 28 },
    { name: 'Wed', revenue: 5200, orders: 45 },
    { name: 'Thu', revenue: 4800, orders: 38 },
    { name: 'Fri', revenue: 6200, orders: 52 },
    { name: 'Sat', revenue: 7800, orders: 68 },
    { name: 'Sun', revenue: 5500, orders: 42 }
  ];

  return (
    <div className="space-y-8 p-4 md:p-6 bg-gray-50 min-h-screen" data-testid="dashboard-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Restaurant Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Monitor your restaurant's performance and key metrics
          </p>
        </div>
        <Tabs value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as any)}>
          <TabsList className="bg-white shadow-sm border border-gray-200">
            <TabsTrigger value="today" className="data-[state=active]:bg-[#15803d] data-[state=active]:text-white">Today</TabsTrigger>
            <TabsTrigger value="this_week" className="data-[state=active]:bg-[#15803d] data-[state=active]:text-white">This Week</TabsTrigger>
            <TabsTrigger value="this_month" className="data-[state=active]:bg-[#15803d] data-[state=active]:text-white">This Month</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Revenue */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-white to-gray-50 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
          <div className="absolute inset-0 bg-gradient-to-br from-[#15803d]/5 to-green-100/30"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
            <div className="p-2 bg-[#15803d]/10 rounded-full">
              <DollarSign className="h-4 w-4 text-[#15803d]" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10 pt-0">
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency((dashboardStats as any)?.totalRevenue || 85420)}
            </div>
            <div className="flex items-center mt-2">
              <TrendingUp className="h-3 w-3 mr-1 text-[#15803d]" />
              <span className="text-xs text-[#15803d] font-medium">+12.5% from last week</span>
            </div>
          </CardContent>
        </Card>

        {/* Total Orders */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-white to-gray-50 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-blue-100/30"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-gray-600">Total Orders</CardTitle>
            <div className="p-2 bg-blue-500/10 rounded-full">
              <ShoppingCart className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10 pt-0">
            <div className="text-2xl font-bold text-gray-900">
              {(dashboardStats as any)?.totalOrders || 342}
            </div>
            <div className="flex items-center mt-2">
              <TrendingUp className="h-3 w-3 mr-1 text-blue-600" />
              <span className="text-xs text-blue-600 font-medium">+8.2% from last week</span>
            </div>
          </CardContent>
        </Card>

        {/* Average Order Value */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-white to-gray-50 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-purple-100/30"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-gray-600">Average Order</CardTitle>
            <div className="p-2 bg-purple-500/10 rounded-full">
              <Target className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10 pt-0">
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency((dashboardStats as any)?.averageOrderValue || 2497)}
            </div>
            <div className="flex items-center mt-2">
              <TrendingUp className="h-3 w-3 mr-1 text-purple-600" />
              <span className="text-xs text-purple-600 font-medium">+5.1% from last week</span>
            </div>
          </CardContent>
        </Card>

        {/* Customer Satisfaction */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-white to-gray-50 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-yellow-100/30"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-gray-600">Satisfaction</CardTitle>
            <div className="p-2 bg-yellow-500/10 rounded-full">
              <Star className="h-4 w-4 text-yellow-600" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10 pt-0">
            <div className="text-2xl font-bold text-gray-900">4.8/5</div>
            <div className="flex items-center mt-2">
              <Star className="h-3 w-3 mr-1 text-yellow-600 fill-current" />
              <span className="text-xs text-yellow-600 font-medium">{feedbackDistribution[0].percentage}% positive</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card className="bg-white shadow-lg border-0 hover:shadow-xl transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-[#15803d]" />
              Revenue Trend
            </CardTitle>
            <p className="text-sm text-gray-600">Daily revenue for the past week</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#15803d" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#15803d" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                  }}
                  formatter={(value) => [formatCurrency(value as number), 'Revenue']}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#15803d" 
                  strokeWidth={3}
                  fill="url(#revenueGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Performing Items */}
        <Card className="bg-white shadow-lg border-0 hover:shadow-xl transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChefHat className="h-5 w-5 text-[#15803d]" />
              Top Performing Items
            </CardTitle>
            <p className="text-sm text-gray-600">Best sellers for {selectedPeriod}</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart 
                data={Array.isArray(topItems) ? (topItems as any).slice(0, 5) : [
                  { itemName: "Chicken Karahi", salesAmount: 12500, category: "Main Course" },
                  { itemName: "Beef Biryani", salesAmount: 10200, category: "Rice" },
                  { itemName: "Fish Tikka", salesAmount: 8500, category: "BBQ" },
                  { itemName: "Mutton Pulao", salesAmount: 7300, category: "Rice" },
                  { itemName: "Chicken Wings", salesAmount: 6800, category: "Appetizer" }
                ]}
                margin={{ top: 20, right: 20, bottom: 60, left: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="itemName" 
                  stroke="#6b7280"
                  fontSize={11}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                  }}
                  formatter={(value) => [formatCurrency(value as number), 'Sales']}
                />
                <Bar 
                  dataKey="salesAmount" 
                  fill="#15803d"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Feedback */}
        <Card className="bg-white shadow-lg border-0 hover:shadow-xl transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-[#15803d]" />
              Customer Feedback
            </CardTitle>
            <p className="text-sm text-gray-600">Feedback distribution</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={40}
                  paddingAngle={5}
                  dataKey="value"
                  data={feedbackDistribution}
                >
                  {feedbackDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS.feedbackColors[index]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value, 'Feedbacks']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-4">
              {feedbackDistribution.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-1">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: COLORS.feedbackColors[index] }}
                  />
                  <span className="text-xs text-gray-600">{entry.name}: {entry.percentage}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Table Occupancy */}
        <Card className="bg-white shadow-lg border-0 hover:shadow-xl transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-[#15803d]" />
              Table Occupancy
            </CardTitle>
            <p className="text-sm text-gray-600">Current seating status</p>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="relative w-32 h-32 mb-4">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="#15803d"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={`${2.827 * currentOccupancy} 352`}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#15803d]">{currentOccupancy}%</div>
                  <div className="text-xs text-gray-500 font-medium">Occupied</div>
                </div>
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">
                <span className="font-bold text-[#15803d]">{(occupancyData as any)?.occupiedTables || 15}</span> of <span className="font-bold">{(occupancyData as any)?.totalTables || 20}</span> tables occupied
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Peak Hours */}
        <Card className="bg-white shadow-lg border-0 hover:shadow-xl transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#15803d]" />
              Peak Hours
            </CardTitle>
            <p className="text-sm text-gray-600">Today's busiest times</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart 
                data={Array.isArray(hourlyOrders) ? hourlyOrders : [
                  { hour: 12, orderCount: 45 }, { hour: 13, orderCount: 52 },
                  { hour: 18, orderCount: 48 }, { hour: 19, orderCount: 55 },
                  { hour: 20, orderCount: 42 }, { hour: 21, orderCount: 38 }
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="hour" 
                  stroke="#6b7280"
                  fontSize={12}
                  tickFormatter={(value) => `${value}:00`}
                />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                  }}
                  labelFormatter={(value) => `${value}:00`}
                  formatter={(value) => [value, 'Orders']}
                />
                <Line 
                  type="monotone" 
                  dataKey="orderCount" 
                  stroke="#15803d" 
                  strokeWidth={3}
                  dot={{ fill: '#15803d', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#15803d', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}