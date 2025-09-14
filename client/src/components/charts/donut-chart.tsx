import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface DonutChartProps {
  data: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  centerText?: string;
  centerSubtext?: string;
  size?: number;
}

export default function DonutChart({ 
  data, 
  centerText, 
  centerSubtext, 
  size = 200 
}: DonutChartProps) {
  return (
    <div className="relative" style={{ width: size, height: size }} data-testid="donut-chart-container">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={size * 0.35}
            outerRadius={size * 0.45}
            startAngle={90}
            endAngle={450}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      
      {(centerText || centerSubtext) && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center" data-testid="donut-chart-center">
            {centerText && (
              <p className="text-3xl font-bold text-gray-900" data-testid="donut-center-text">
                {centerText}
              </p>
            )}
            {centerSubtext && (
              <p className="text-sm text-gray-500" data-testid="donut-center-subtext">
                {centerSubtext}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
