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
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800" data-testid="page-title">Analytics Dashboard</h2>
          <p className="text-gray-600">Comprehensive insights into your business performance</p>
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
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="sales" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Sales
          </TabsTrigger>
          <TabsTrigger value="menu" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Menu
          </TabsTrigger>
          <TabsTrigger value="customers" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Customers
          </TabsTrigger>
          <TabsTrigger value="operations" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Operations
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Inventory
          </TabsTrigger>
          <TabsTrigger value="staff" className="flex items-center gap-2">
            <UserCheck className="w-4 h-4" />
            Staff
          </TabsTrigger>
          <TabsTrigger value="heatmap" className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            Volume
          </TabsTrigger>
        </TabsList>

        {/* Sales Analytics */}
        <TabsContent value="sales" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">$89,420</div>
                <p className="text-xs text-green-600 flex items-center">
                  +12.5% from last period
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Orders</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2,847</div>
                <p className="text-xs text-green-600">+8.2% from last period</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$31.42</div>
                <p className="text-xs text-green-600">+3.8% from last period</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Peak Hour</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">7-8 PM</div>
                <p className="text-xs text-gray-600">486 orders/hour</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-6">
                <TrendsLineChart 
                  data={salesTrendsData} 
                  title="Sales Trends" 
                  height={350} 
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 flex items-center justify-center">
                <div className="text-center">
                  <DonutChart 
                    data={orderTypeBreakdown}
                    centerText="100%"
                    centerSubtext="Orders"
                    size={250}
                  />
                  <div className="flex items-center justify-center space-x-6 mt-4 text-sm">
                    {orderTypeBreakdown.map((item, index) => (
                      <div key={index} className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-2" 
                          style={{ backgroundColor: item.color }}
                        ></div>
                        <span className="text-gray-600">{item.name} ({item.value}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Menu Performance */}
        <TabsContent value="menu" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-6">
                <PerformanceBarChart 
                  data={topPerformingItems} 
                  title="Top Performing Items" 
                  height={350}
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <PerformanceBarChart 
                  data={worstPerformingItems} 
                  title="Items Needing Attention" 
                  height={350}
                />
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Profit Margins by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { category: "Pizza", margin: 68, revenue: 12450 },
                  { category: "Salads", margin: 62, revenue: 8930 },
                  { category: "Beverages", margin: 78, revenue: 6720 },
                  { category: "Desserts", margin: 85, revenue: 4680 },
                  { category: "Appetizers", margin: 45, revenue: 3820 }
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{item.category}</div>
                      <div className="text-sm text-gray-600">Revenue: ${item.revenue}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">{item.margin}%</div>
                      <div className="text-sm text-gray-600">Margin</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customer Analytics */}
        <TabsContent value="customers" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-6 flex items-center justify-center">
                <div className="text-center">
                  <DonutChart 
                    data={customerTypeData}
                    centerText="68%"
                    centerSubtext="Repeat"
                    size={250}
                  />
                  <div className="flex items-center justify-center space-x-6 mt-4 text-sm">
                    {customerTypeData.map((item, index) => (
                      <div key={index} className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-2" 
                          style={{ backgroundColor: item.color }}
                        ></div>
                        <span className="text-gray-600">{item.name} Customers ({item.value}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Customer Insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">$48.50</div>
                    <div className="text-sm text-blue-800">Avg Spend</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">4.2</div>
                    <div className="text-sm text-green-800">Avg Rating</div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Loyalty Program Members</span>
                    <span className="font-semibold">1,247</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Active This Month</span>
                    <span className="font-semibold">856</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Points Redeemed</span>
                    <span className="font-semibold">34,520</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Operational Analytics */}
        <TabsContent value="operations" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Table Turnover</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">3.2</div>
                <p className="text-sm text-gray-600">turns/day average</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Avg Service Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">18</div>
                <p className="text-sm text-gray-600">minutes per order</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Peak Efficiency</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">87%</div>
                <p className="text-sm text-gray-600">operational score</p>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Service Performance by Order Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { type: "Dine-in", avgTime: "22 min", efficiency: 85, orders: 1247 },
                  { type: "Takeaway", avgTime: "12 min", efficiency: 92, orders: 934 },
                  { type: "Delivery", avgTime: "35 min", efficiency: 78, orders: 568 }
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{item.type}</div>
                      <div className="text-sm text-gray-600">{item.orders} orders</div>
                    </div>
                    <div className="text-center mx-4">
                      <div className="font-bold">{item.avgTime}</div>
                      <div className="text-sm text-gray-600">Avg Time</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold">{item.efficiency}%</div>
                      <div className="text-sm text-gray-600">Efficiency</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Analytics */}
        <TabsContent value="inventory" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { item: "Tomatoes", usage: 85, wastage: 8, stock: "High", cost: 2.50 },
                  { item: "Cheese", usage: 92, wastage: 3, stock: "Medium", cost: 8.20 },
                  { item: "Chicken", usage: 78, wastage: 12, stock: "Low", cost: 12.40 },
                  { item: "Lettuce", usage: 65, wastage: 15, stock: "High", cost: 1.80 },
                  { item: "Flour", usage: 88, wastage: 5, stock: "Medium", cost: 3.60 }
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{item.item}</div>
                      <div className="text-sm text-gray-600">${item.cost}/unit</div>
                    </div>
                    <div className="text-center mx-4">
                      <div className="font-bold">{item.usage}%</div>
                      <div className="text-sm text-gray-600">Usage</div>
                    </div>
                    <div className="text-center mx-4">
                      <div className="font-bold text-red-600">{item.wastage}%</div>
                      <div className="text-sm text-gray-600">Wastage</div>
                    </div>
                    <div className="text-center">
                      <div className={`font-bold ${
                        item.stock === 'Low' ? 'text-red-600' : 
                        item.stock === 'Medium' ? 'text-yellow-600' : 'text-green-600'
                      }`}>{item.stock}</div>
                      <div className="text-sm text-gray-600">Stock</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Staff Performance */}
        <TabsContent value="staff" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Staff Performance Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: "Sarah Johnson", role: "Waiter", sales: 3420, orders: 142, time: "15 min", rating: 4.8 },
                  { name: "Mike Chen", role: "Chef", sales: 2890, orders: 98, time: "12 min", rating: 4.6 },
                  { name: "Emma Davis", role: "Waiter", sales: 2650, orders: 89, time: "18 min", rating: 4.7 },
                  { name: "John Smith", role: "Manager", sales: 2340, orders: 76, time: "10 min", rating: 4.9 },
                ].map((staff, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{staff.name}</div>
                      <div className="text-sm text-gray-600">{staff.role}</div>
                    </div>
                    <div className="text-center mx-4">
                      <div className="font-bold">${staff.sales}</div>
                      <div className="text-sm text-gray-600">Sales</div>
                    </div>
                    <div className="text-center mx-4">
                      <div className="font-bold">{staff.orders}</div>
                      <div className="text-sm text-gray-600">Orders</div>
                    </div>
                    <div className="text-center mx-4">
                      <div className="font-bold">{staff.time}</div>
                      <div className="text-sm text-gray-600">Avg Time</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-yellow-600">{staff.rating}</div>
                      <div className="text-sm text-gray-600">Rating</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Order Volume Heatmap */}
        <TabsContent value="heatmap" className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <HeatmapChart data={mockHeatmapData} height={300} />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Peak Hours Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Busiest Hours</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 bg-red-50 rounded">
                      <span>7:00 PM - 8:00 PM</span>
                      <span className="font-semibold">486 orders</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-orange-50 rounded">
                      <span>12:00 PM - 1:00 PM</span>
                      <span className="font-semibold">398 orders</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-yellow-50 rounded">
                      <span>6:00 PM - 7:00 PM</span>
                      <span className="font-semibold">352 orders</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-3">Quietest Hours</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                      <span>3:00 AM - 4:00 AM</span>
                      <span className="font-semibold">8 orders</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                      <span>4:00 AM - 5:00 AM</span>
                      <span className="font-semibold">12 orders</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                      <span>2:00 PM - 3:00 PM</span>
                      <span className="font-semibold">89 orders</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
