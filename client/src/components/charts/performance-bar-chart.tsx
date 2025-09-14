import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface PerformanceData {
  name: string;
  value: number;
  profit?: number;
  orders?: number;
  type?: 'top' | 'worst';
}

interface PerformanceBarChartProps {
  data: PerformanceData[];
  title: string;
  valueKey?: string;
  height?: number;
}

const colors = {
  top: '#22c55e',
  worst: '#ef4444',
  default: '#3b82f6'
};

export default function PerformanceBarChart({ 
  data, 
  title, 
  valueKey = 'value', 
  height = 300 
}: PerformanceBarChartProps) {
  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="name" 
            angle={-45}
            textAnchor="end"
            height={80}
            interval={0}
            fontSize={12}
          />
          <YAxis fontSize={12} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '12px'
            }}
            formatter={(value: any) => [`$${value}`, 'Sales']}
            labelFormatter={(label, payload) => {
              if (payload && payload[0]) {
                const item = payload[0].payload;
                return (
                  <div>
                    <div className="font-medium">{label}</div>
                    <div className="text-sm text-gray-600">
                      {item.profit && <div>Profit Margin: {item.profit}%</div>}
                      {item.orders && <div>Orders: {item.orders}</div>}
                    </div>
                  </div>
                );
              }
              return label;
            }}
          />
          <Bar dataKey={valueKey} radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={colors[entry.type || 'default']} 
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}