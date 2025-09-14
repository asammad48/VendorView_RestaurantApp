import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';

interface RevenueChartProps {
  data: Array<{
    name: string;
    income: number;
    pending: number;
  }>;
}

export default function RevenueChart({ data }: RevenueChartProps) {
  return (
    <div className="h-64" data-testid="revenue-chart-container">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="name" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#9CA3AF', fontSize: 12 }}
          />
          <YAxis hide />
          <Bar 
            dataKey="pending" 
            fill="#A7F3D0" 
            radius={[4, 4, 0, 0]} 
            name="Pending (10%)"
            data-testid="bar-pending"
          />
          <Bar 
            dataKey="income" 
            fill="#5CB85C" 
            radius={[4, 4, 0, 0]} 
            name="Income"
            data-testid="bar-income"
          />
        </BarChart>
      </ResponsiveContainer>
      
      <div className="flex items-center justify-center space-x-8 mt-4 text-sm">
        <div className="flex items-center" data-testid="legend-pending">
          <div className="w-3 h-3 bg-green-300 rounded-full mr-2"></div>
          <span className="text-gray-600">Pending (10%)</span>
        </div>
        <div className="flex items-center" data-testid="legend-income">
          <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
          <span className="text-gray-600">Income</span>
        </div>
      </div>
    </div>
  );
}
