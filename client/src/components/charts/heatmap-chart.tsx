import { ResponsiveContainer, Cell, XAxis, YAxis, Tooltip } from "recharts";
import { useState } from "react";

interface HeatmapData {
  hour: number;
  dayOfWeek: number;
  intensity: number;
  orderCount: number;
}

interface HeatmapChartProps {
  data: HeatmapData[];
  width?: number;
  height?: number;
}

const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const hours = Array.from({ length: 24 }, (_, i) => i);

export default function HeatmapChart({ data, width = 800, height = 300 }: HeatmapChartProps) {
  const [hoveredCell, setHoveredCell] = useState<{ hour: number; day: number } | null>(null);

  const getIntensity = (hour: number, dayOfWeek: number) => {
    const entry = data.find(d => d.hour === hour && d.dayOfWeek === dayOfWeek);
    return entry ? entry.intensity : 0;
  };

  const getOrderCount = (hour: number, dayOfWeek: number) => {
    const entry = data.find(d => d.hour === hour && d.dayOfWeek === dayOfWeek);
    return entry ? entry.orderCount : 0;
  };

  const getColor = (intensity: number) => {
    if (intensity === 0) return '#f3f4f6';
    if (intensity <= 20) return '#dcfce7';
    if (intensity <= 40) return '#bbf7d0';
    if (intensity <= 60) return '#86efac';
    if (intensity <= 80) return '#4ade80';
    return '#22c55e';
  };

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Order Volume Heatmap</h3>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <span>Low</span>
          <div className="flex space-x-1">
            {[0, 20, 40, 60, 80, 100].map(intensity => (
              <div 
                key={intensity}
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: getColor(intensity) }}
              />
            ))}
          </div>
          <span>High</span>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <div className="min-w-full">
          {/* Hour labels */}
          <div className="flex mb-2">
            <div className="w-12"></div>
            {hours.map(hour => (
              <div key={hour} className="flex-1 text-center text-xs text-gray-500 min-w-[30px]">
                {hour % 6 === 0 ? `${hour}:00` : ''}
              </div>
            ))}
          </div>
          
          {/* Heatmap grid */}
          {days.map((day, dayIndex) => (
            <div key={day} className="flex items-center mb-1">
              <div className="w-12 text-sm text-gray-600 text-right pr-2">{day}</div>
              {hours.map(hour => {
                const intensity = getIntensity(hour, dayIndex);
                const orderCount = getOrderCount(hour, dayIndex);
                const isHovered = hoveredCell?.hour === hour && hoveredCell?.day === dayIndex;
                
                return (
                  <div
                    key={hour}
                    className="flex-1 h-6 min-w-[30px] border border-gray-200 cursor-pointer transition-all duration-200 hover:scale-110 hover:z-10 relative"
                    style={{ backgroundColor: getColor(intensity) }}
                    onMouseEnter={() => setHoveredCell({ hour, day: dayIndex })}
                    onMouseLeave={() => setHoveredCell(null)}
                    title={`${day} ${hour}:00 - ${orderCount} orders`}
                  >
                    {isHovered && (
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap z-20">
                        {day} {hour}:00 - {orderCount} orders
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}