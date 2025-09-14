import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface TrendsData {
  date: string;
  revenue: number;
  orders: number;
  customers: number;
}

interface TrendsLineChartProps {
  data: TrendsData[];
  title: string;
  height?: number;
  showRevenue?: boolean;
  showOrders?: boolean;
  showCustomers?: boolean;
}

export default function TrendsLineChart({ 
  data, 
  title, 
  height = 300,
  showRevenue = true,
  showOrders = true,
  showCustomers = true
}: TrendsLineChartProps) {
  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            fontSize={12}
            tickFormatter={(value) => {
              const date = new Date(value);
              return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }}
          />
          <YAxis fontSize={12} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '12px'
            }}
            labelFormatter={(value) => {
              const date = new Date(value);
              return date.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              });
            }}
            formatter={(value, name) => {
              if (name === 'revenue') return [`$${value}`, 'Revenue'];
              if (name === 'orders') return [value, 'Orders'];
              if (name === 'customers') return [value, 'Customers'];
              return [value, name];
            }}
          />
          <Legend />
          {showRevenue && (
            <Line 
              type="monotone" 
              dataKey="revenue" 
              stroke="#22c55e" 
              strokeWidth={2}
              dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }}
              name="Revenue"
            />
          )}
          {showOrders && (
            <Line 
              type="monotone" 
              dataKey="orders" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              name="Orders"
            />
          )}
          {showCustomers && (
            <Line 
              type="monotone" 
              dataKey="customers" 
              stroke="#f59e0b" 
              strokeWidth={2}
              dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
              name="Customers"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}