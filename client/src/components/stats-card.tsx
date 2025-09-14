import { Card, CardContent } from "@/components/ui/card";
import { FileText, DollarSign, Users, ShoppingBag } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string;
  icon: "menu" | "revenue" | "customers" | "orders";
}

const iconMap = {
  menu: FileText,
  revenue: DollarSign,
  customers: Users,
  orders: ShoppingBag,
};

const colorMap = {
  menu: "bg-green-100 text-green-600",
  revenue: "bg-blue-100 text-blue-600",
  customers: "bg-purple-100 text-purple-600",
  orders: "bg-orange-100 text-orange-600",
};

export default function StatsCard({ title, value, icon }: StatsCardProps) {
  const Icon = iconMap[icon];
  const colorClass = colorMap[icon];

  return (
    <Card className="bg-white border border-gray-100">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500" data-testid={`stat-title-${icon}`}>{title}</p>
            <p className="text-2xl font-bold text-gray-900" data-testid={`stat-value-${icon}`}>{value}</p>
          </div>
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClass}`} data-testid={`stat-icon-${icon}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
