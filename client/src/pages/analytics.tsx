import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Filter, Calendar, TrendingUp, Users, ShoppingCart, BarChart3, Clock, Package, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DonutChart from "@/components/charts/donut-chart";
import PerformanceBarChart from "@/components/charts/performance-bar-chart";
import TrendsLineChart from "@/components/charts/trends-line-chart";
import HeatmapChart from "@/components/charts/heatmap-chart";

export default function Analytics() {
  const [dateRange, setDateRange] = useState("7d");
  const [branchFilter, setBranchFilter] = useState("all");
  const [orderTypeFilter, setOrderTypeFilter] = useState("all");

  // Data queries
  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ["/api/analytics/sales", { dateRange, branchFilter, orderType: orderTypeFilter }],
  });

  const { data: menuPerformance, isLoading: menuLoading } = useQuery({
    queryKey: ["/api/analytics/menu-performance", { dateRange }],
  });

  const { data: customerAnalytics, isLoading: customerLoading } = useQuery({
    queryKey: ["/api/analytics/customers", { dateRange }],
  });

  const { data: operationalData, isLoading: operationalLoading } = useQuery({
    queryKey: ["/api/analytics/operational", { dateRange }],
  });

  const { data: inventoryData, isLoading: inventoryLoading } = useQuery({
    queryKey: ["/api/analytics/inventory", { dateRange }],
  });

  const { data: staffPerformance, isLoading: staffLoading } = useQuery({
    queryKey: ["/api/analytics/staff", { dateRange }],
  });

  const { data: heatmapData, isLoading: heatmapLoading } = useQuery({
    queryKey: ["/api/analytics/heatmap", { dateRange }],
  });

  if (salesLoading || menuLoading || customerLoading || operationalLoading || inventoryLoading || staffLoading || heatmapLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="loading-spinner" data-testid="loading-spinner"></div>
      </div>
    );
  }

  // Sample data - in a real app, this would come from your API
  const salesTrendsData = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    revenue: 2000 + Math.random() * 1000,
    orders: 50 + Math.random() * 30,
    customers: 40 + Math.random() * 25,
  }));

  const topPerformingItems = [
    { name: "Margherita Pizza", value: 3420, profit: 65, orders: 142, type: 'top' as const },
    { name: "Caesar Salad", value: 2890, profit: 58, orders: 123, type: 'top' as const },
    { name: "Grilled Chicken", value: 2650, profit: 62, orders: 98, type: 'top' as const },
    { name: "Pasta Carbonara", value: 2340, profit: 55, orders: 89, type: 'top' as const },
    { name: "Beef Burger", value: 2120, profit: 48, orders: 76, type: 'top' as const },
  ];

  const worstPerformingItems = [
    { name: "Seafood Platter", value: 320, profit: 15, orders: 8, type: 'worst' as const },
    { name: "Exotic Fruit Bowl", value: 450, profit: 22, orders: 12, type: 'worst' as const },
    { name: "Truffle Risotto", value: 680, profit: 28, orders: 18, type: 'worst' as const },
  ];

  const customerTypeData = [
    { name: "Repeat", value: 68, color: "#22c55e" },
    { name: "New", value: 32, color: "#a7f3d0" }
  ];

  const orderTypeBreakdown = [
    { name: "Dine-in", value: 45, color: "#3b82f6" },
    { name: "Takeaway", value: 35, color: "#f59e0b" },
    { name: "Delivery", value: 20, color: "#ef4444" }
  ];

  const mockHeatmapData = Array.from({ length: 7 * 24 }, (_, i) => {
    const dayOfWeek = Math.floor(i / 24);
    const hour = i % 24;
    let intensity = 0;
    
    // Simulate typical restaurant patterns
    if (hour >= 11 && hour <= 14) intensity += 30; // Lunch rush
    if (hour >= 17 && hour <= 21) intensity += 40; // Dinner rush
    if (dayOfWeek >= 5) intensity += 20; // Weekend boost
    
    intensity += Math.random() * 20; // Random variation
    
    return {
      hour,
      dayOfWeek,
      intensity: Math.min(100, intensity),
      orderCount: Math.floor(intensity / 10) + Math.floor(Math.random() * 5)
    };
  });

  return (
    <div className="space-y-6" data-testid="analytics-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-900" data-testid="page-title">Analytics</h1>
          <p className="text-xs text-gray-500 mt-0.5">Comprehensive insights into your business performance</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">Today</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 3 months</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              <SelectItem value="downtown">Downtown</SelectItem>
              <SelectItem value="mall">Shopping Mall</SelectItem>
              <SelectItem value="airport">Airport</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={orderTypeFilter} onValueChange={setOrderTypeFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              <SelectItem value="dine-in">Dine-in</SelectItem>
              <SelectItem value="takeaway">Takeaway</SelectItem>
              <SelectItem value="delivery">Delivery</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" data-testid="button-export">
            Export Report
          </Button>
        </div>
      </div>

      <Tabs defaultValue="sales" className="space-y-6">
        <TabsList className="grid grid-cols-7 w-full h-auto p-1 bg-gray-100 rounded-lg">
          <TabsTrigger value="sales" className="flex items-center gap-1.5 text-xs py-2 rounded-md data-[state=active]:bg-[#15803d] data-[state=active]:text-white data-[state=active]:shadow-sm">
            <TrendingUp className="w-3.5 h-3.5" />
            Sales
          </TabsTrigger>
          <TabsTrigger value="menu" className="flex items-center gap-1.5 text-xs py-2 rounded-md data-[state=active]:bg-[#15803d] data-[state=active]:text-white data-[state=active]:shadow-sm">
            <BarChart3 className="w-3.5 h-3.5" />
            Menu
          </TabsTrigger>
          <TabsTrigger value="customers" className="flex items-center gap-1.5 text-xs py-2 rounded-md data-[state=active]:bg-[#15803d] data-[state=active]:text-white data-[state=active]:shadow-sm">
            <Users className="w-3.5 h-3.5" />
            Customers
          </TabsTrigger>
          <TabsTrigger value="operations" className="flex items-center gap-1.5 text-xs py-2 rounded-md data-[state=active]:bg-[#15803d] data-[state=active]:text-white data-[state=active]:shadow-sm">
            <Clock className="w-3.5 h-3.5" />
            Operations
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center gap-1.5 text-xs py-2 rounded-md data-[state=active]:bg-[#15803d] data-[state=active]:text-white data-[state=active]:shadow-sm">
            <Package className="w-3.5 h-3.5" />
            Inventory
          </TabsTrigger>
          <TabsTrigger value="staff" className="flex items-center gap-1.5 text-xs py-2 rounded-md data-[state=active]:bg-[#15803d] data-[state=active]:text-white data-[state=active]:shadow-sm">
            <UserCheck className="w-3.5 h-3.5" />
            Staff
          </TabsTrigger>
          <TabsTrigger value="heatmap" className="flex items-center gap-1.5 text-xs py-2 rounded-md data-[state=active]:bg-[#15803d] data-[state=active]:text-white data-[state=active]:shadow-sm">
            <ShoppingCart className="w-3.5 h-3.5" />
            Volume
          </TabsTrigger>
        </TabsList>

        {/* Sales Analytics */}
        <TabsContent value="sales" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total Revenue", value: "$89,420", sub: "+12.5% from last period", subColor: "text-green-600", icon: <TrendingUp className="w-4 h-4 text-gray-400" /> },
              { label: "Orders", value: "2,847", sub: "+8.2% from last period", subColor: "text-green-600", icon: <ShoppingCart className="w-4 h-4 text-gray-400" /> },
              { label: "Avg Order Value", value: "$31.42", sub: "+3.8% from last period", subColor: "text-green-600", icon: <BarChart3 className="w-4 h-4 text-gray-400" /> },
              { label: "Peak Hour", value: "7–8 PM", sub: "486 orders/hour", subColor: "text-gray-500", icon: <Clock className="w-4 h-4 text-gray-400" /> },
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">Sales Trends</p>
              <TrendsLineChart data={salesTrendsData} title="" height={300} />
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-4 flex flex-col items-center justify-center">
              <p className="text-sm font-semibold text-gray-700 mb-3 self-start">Order Type Breakdown</p>
              <DonutChart data={orderTypeBreakdown} centerText="100%" centerSubtext="Orders" size={220} />
              <div className="flex items-center justify-center gap-4 mt-3">
                {orderTypeBreakdown.map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-gray-500">{item.name} ({item.value}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Menu Performance */}
        <TabsContent value="menu" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">Top Performing Items</p>
              <PerformanceBarChart data={topPerformingItems} title="" height={300} />
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">Items Needing Attention</p>
              <PerformanceBarChart data={worstPerformingItems} title="" height={300} />
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Profit Margins by Category</p>
            <div className="divide-y divide-gray-50">
              {[
                { category: "Pizza", margin: 68, revenue: 12450 },
                { category: "Salads", margin: 62, revenue: 8930 },
                { category: "Beverages", margin: 78, revenue: 6720 },
                { category: "Desserts", margin: 85, revenue: 4680 },
                { category: "Appetizers", margin: 45, revenue: 3820 },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2.5">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{item.category}</div>
                    <div className="text-xs text-gray-400">${item.revenue.toLocaleString()} revenue</div>
                  </div>
                  <span className="text-sm font-semibold text-[#15803d]">{item.margin}%</span>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Customer Analytics */}
        <TabsContent value="customers" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-100 rounded-xl p-4 flex flex-col items-center">
              <p className="text-sm font-semibold text-gray-700 mb-3 self-start">Customer Type</p>
              <DonutChart data={customerTypeData} centerText="68%" centerSubtext="Repeat" size={220} />
              <div className="flex items-center justify-center gap-4 mt-3">
                {customerTypeData.map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-gray-500">{item.name} ({item.value}%)</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">Customer Insights</p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-xl font-bold text-gray-900">$48.50</div>
                  <div className="text-xs text-gray-500 mt-0.5">Avg Spend</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-xl font-bold text-[#15803d]">4.2</div>
                  <div className="text-xs text-gray-500 mt-0.5">Avg Rating</div>
                </div>
              </div>
              <div className="divide-y divide-gray-50">
                {[
                  { label: "Loyalty Program Members", value: "1,247" },
                  { label: "Active This Month", value: "856" },
                  { label: "Points Redeemed", value: "34,520" },
                ].map((row, i) => (
                  <div key={i} className="flex justify-between items-center py-2.5">
                    <span className="text-xs text-gray-500">{row.label}</span>
                    <span className="text-sm font-semibold text-gray-900">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Operational Analytics */}
        <TabsContent value="operations" className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Table Turnover", value: "3.2", sub: "turns/day average" },
              { label: "Avg Service Time", value: "18 min", sub: "per order" },
              { label: "Peak Efficiency", value: "87%", sub: "operational score" },
            ].map((s, i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-xl p-4 text-center">
                <div className="text-xs text-gray-500 font-medium mb-1">{s.label}</div>
                <div className="text-2xl font-bold text-gray-900">{s.value}</div>
                <div className="text-xs text-gray-400 mt-0.5">{s.sub}</div>
              </div>
            ))}
          </div>

          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Service Performance by Order Type</p>
            <div className="divide-y divide-gray-50">
              {[
                { type: "Dine-in", avgTime: "22 min", efficiency: 85, orders: 1247 },
                { type: "Takeaway", avgTime: "12 min", efficiency: 92, orders: 934 },
                { type: "Delivery", avgTime: "35 min", efficiency: 78, orders: 568 },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{item.type}</div>
                    <div className="text-xs text-gray-400">{item.orders.toLocaleString()} orders</div>
                  </div>
                  <div className="flex items-center gap-6 text-right">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{item.avgTime}</div>
                      <div className="text-xs text-gray-400">Avg Time</div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#15803d]">{item.efficiency}%</div>
                      <div className="text-xs text-gray-400">Efficiency</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Inventory Analytics */}
        <TabsContent value="inventory" className="space-y-4">
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Inventory Status</p>
            <div className="divide-y divide-gray-50">
              {[
                { item: "Tomatoes", usage: 85, wastage: 8, stock: "High", cost: 2.50 },
                { item: "Cheese", usage: 92, wastage: 3, stock: "Medium", cost: 8.20 },
                { item: "Chicken", usage: 78, wastage: 12, stock: "Low", cost: 12.40 },
                { item: "Lettuce", usage: 65, wastage: 15, stock: "High", cost: 1.80 },
                { item: "Flour", usage: 88, wastage: 5, stock: "Medium", cost: 3.60 },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{item.item}</div>
                    <div className="text-xs text-gray-400">${item.cost}/unit</div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="text-sm font-semibold text-gray-900">{item.usage}%</div>
                      <div className="text-xs text-gray-400">Usage</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-semibold text-red-500">{item.wastage}%</div>
                      <div className="text-xs text-gray-400">Wastage</div>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      item.stock === "Low" ? "bg-red-50 text-red-600" :
                      item.stock === "Medium" ? "bg-amber-50 text-amber-600" :
                      "bg-green-50 text-green-700"
                    }`}>{item.stock}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Staff Performance */}
        <TabsContent value="staff" className="space-y-4">
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Staff Performance</p>
            <div className="divide-y divide-gray-50">
              {[
                { name: "Sarah Johnson", role: "Waiter", sales: 3420, orders: 142, time: "15 min", rating: 4.8 },
                { name: "Mike Chen", role: "Chef", sales: 2890, orders: 98, time: "12 min", rating: 4.6 },
                { name: "Emma Davis", role: "Waiter", sales: 2650, orders: 89, time: "18 min", rating: 4.7 },
                { name: "John Smith", role: "Manager", sales: 2340, orders: 76, time: "10 min", rating: 4.9 },
              ].map((staff, i) => (
                <div key={i} className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{staff.name}</div>
                    <div className="text-xs text-gray-400">{staff.role}</div>
                  </div>
                  <div className="flex items-center gap-5">
                    <div className="text-center">
                      <div className="text-sm font-semibold text-gray-900">${staff.sales.toLocaleString()}</div>
                      <div className="text-xs text-gray-400">Sales</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-semibold text-gray-900">{staff.orders}</div>
                      <div className="text-xs text-gray-400">Orders</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-semibold text-gray-900">{staff.time}</div>
                      <div className="text-xs text-gray-400">Avg Time</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-semibold text-amber-500">{staff.rating}</div>
                      <div className="text-xs text-gray-400">Rating</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Order Volume Heatmap */}
        <TabsContent value="heatmap" className="space-y-4">
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Order Volume Heatmap</p>
            <HeatmapChart data={mockHeatmapData} height={280} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">Busiest Hours</p>
              <div className="space-y-2">
                {[
                  { time: "7:00 PM – 8:00 PM", orders: 486 },
                  { time: "12:00 PM – 1:00 PM", orders: 398 },
                  { time: "6:00 PM – 7:00 PM", orders: 352 },
                ].map((row, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                    <span className="text-xs text-gray-600">{row.time}</span>
                    <span className="text-xs font-semibold text-gray-900">{row.orders} orders</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">Quietest Hours</p>
              <div className="space-y-2">
                {[
                  { time: "3:00 AM – 4:00 AM", orders: 8 },
                  { time: "4:00 AM – 5:00 AM", orders: 12 },
                  { time: "2:00 PM – 3:00 PM", orders: 89 },
                ].map((row, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                    <span className="text-xs text-gray-600">{row.time}</span>
                    <span className="text-xs font-semibold text-gray-900">{row.orders} orders</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
