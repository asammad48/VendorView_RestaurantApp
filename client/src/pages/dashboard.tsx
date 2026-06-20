import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, ShoppingCart, DollarSign, Clock, Users, Star, ChefHat, Eye, Target, Calendar, Activity } from "lucide-react";
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
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Dashboard</h1>
          <p className="text-xs text-gray-500 mt-0.5">Monitor your restaurant's performance</p>
        </div>
        <Tabs value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as any)}>
          <TabsList className="bg-white shadow-sm border border-gray-200">
            <TabsTrigger value="today" className="data-[state=active]:bg-[#15803d] data-[state=active]:text-white text-xs">Today</TabsTrigger>
            <TabsTrigger value="this_week" className="data-[state=active]:bg-[#15803d] data-[state=active]:text-white text-xs">This Week</TabsTrigger>
            <TabsTrigger value="this_month" className="data-[state=active]:bg-[#15803d] data-[state=active]:text-white text-xs">This Month</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Revenue", value: formatCurrency((dashboardStats as any)?.totalRevenue || 85420), sub: "+12.5% from last week", subColor: "text-[#15803d]", icon: <DollarSign className="h-4 w-4 text-gray-400" /> },
          { label: "Total Orders", value: (dashboardStats as any)?.totalOrders || 342, sub: "+8.2% from last week", subColor: "text-[#15803d]", icon: <ShoppingCart className="h-4 w-4 text-gray-400" /> },
          { label: "Average Order", value: formatCurrency((dashboardStats as any)?.averageOrderValue || 2497), sub: "+5.1% from last week", subColor: "text-[#15803d]", icon: <Target className="h-4 w-4 text-gray-400" /> },
          { label: "Satisfaction", value: "4.8/5", sub: `${feedbackDistribution[0].percentage}% positive`, subColor: "text-amber-500", icon: <Star className="h-4 w-4 text-gray-400" /> },
        ].map((s, i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 font-medium">{s.label}</span>
              {s.icon}
            </div>
            <div className="text-xl font-bold text-gray-900">{s.value}</div>
            <p className={`text-xs mt-0.5 ${s.subColor}`}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Trend */}
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-sm font-semibold text-gray-700 mb-1">Revenue Trend</p>
          <p className="text-xs text-gray-400 mb-3">Daily revenue for the past week</p>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#15803d" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#15803d" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} />
              <YAxis stroke="#9ca3af" fontSize={11} />
              <Tooltip
                contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: 12 }}
                formatter={(value) => [formatCurrency(value as number), 'Revenue']}
              />
              <Area type="monotone" dataKey="revenue" stroke="#15803d" strokeWidth={2} fill="url(#revenueGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top Performing Items */}
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-sm font-semibold text-gray-700 mb-1">Top Performing Items</p>
          <p className="text-xs text-gray-400 mb-3">Best sellers for {selectedPeriod.replace('_', ' ')}</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={Array.isArray(topItems) ? (topItems as any).slice(0, 5) : [
                { itemName: "Chicken Karahi", salesAmount: 12500 },
                { itemName: "Beef Biryani", salesAmount: 10200 },
                { itemName: "Fish Tikka", salesAmount: 8500 },
                { itemName: "Mutton Pulao", salesAmount: 7300 },
                { itemName: "Chicken Wings", salesAmount: 6800 },
              ]}
              margin={{ top: 5, right: 10, bottom: 55, left: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="itemName" stroke="#9ca3af" fontSize={10} angle={-40} textAnchor="end" height={70} />
              <YAxis stroke="#9ca3af" fontSize={11} />
              <Tooltip
                contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: 12 }}
                formatter={(value) => [formatCurrency(value as number), 'Sales']}
              />
              <Bar dataKey="salesAmount" fill="#15803d" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Customer Feedback */}
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-sm font-semibold text-gray-700 mb-1">Customer Feedback</p>
          <p className="text-xs text-gray-400 mb-2">Feedback distribution</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie cx="50%" cy="50%" outerRadius={70} innerRadius={35} paddingAngle={4} dataKey="value" data={feedbackDistribution}>
                {feedbackDistribution.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS.feedbackColors[index]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [value, 'Feedbacks']} contentStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-3 mt-2">
            {feedbackDistribution.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.feedbackColors[index] }} />
                <span className="text-xs text-gray-500">{entry.name}: {entry.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Table Occupancy */}
        <div className="bg-white border border-gray-100 rounded-xl p-4 flex flex-col items-center justify-center">
          <p className="text-sm font-semibold text-gray-700 mb-3 self-start">Table Occupancy</p>
          <div className="relative w-28 h-28 mb-3">
            <svg className="w-28 h-28 transform -rotate-90">
              <circle cx="56" cy="56" r="48" stroke="#e5e7eb" strokeWidth="7" fill="transparent" />
              <circle cx="56" cy="56" r="48" stroke="#15803d" strokeWidth="7" fill="transparent"
                strokeDasharray={`${2.827 * currentOccupancy * 0.96} 302`}
                strokeLinecap="round" className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-xl font-bold text-[#15803d]">{currentOccupancy}%</div>
                <div className="text-[10px] text-gray-500">Occupied</div>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            <span className="font-semibold text-[#15803d]">{(occupancyData as any)?.occupiedTables || 15}</span>
            {" "}of{" "}
            <span className="font-semibold text-gray-700">{(occupancyData as any)?.totalTables || 20}</span>
            {" "}tables occupied
          </p>
        </div>

        {/* Peak Hours */}
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-sm font-semibold text-gray-700 mb-1">Peak Hours</p>
          <p className="text-xs text-gray-400 mb-2">Today's busiest times</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart
              data={Array.isArray(hourlyOrders) ? hourlyOrders : [
                { hour: 12, orderCount: 45 }, { hour: 13, orderCount: 52 },
                { hour: 18, orderCount: 48 }, { hour: 19, orderCount: 55 },
                { hour: 20, orderCount: 42 }, { hour: 21, orderCount: 38 },
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="hour" stroke="#9ca3af" fontSize={11} tickFormatter={(v) => `${v}:00`} />
              <YAxis stroke="#9ca3af" fontSize={11} />
              <Tooltip
                contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: 12 }}
                labelFormatter={(v) => `${v}:00`}
                formatter={(value) => [value, 'Orders']}
              />
              <Line type="monotone" dataKey="orderCount" stroke="#15803d" strokeWidth={2}
                dot={{ fill: '#15803d', strokeWidth: 2, r: 3 }}
                activeDot={{ r: 5, stroke: '#15803d', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}