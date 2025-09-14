import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Settings, Edit, Trash2 } from "lucide-react";
import { getFullImageUrl } from "@/lib/imageUtils";

interface RestaurantCardProps {
  restaurant: {
    id: string;
    name: string;
    imageUrl: string;
    status: string;
  };
  onDelete: () => void;
}

export default function RestaurantCard({ restaurant, onDelete }: RestaurantCardProps) {
  return (
    <Card className="bg-white border border-gray-100 overflow-hidden" data-testid={`restaurant-card-${restaurant.id}`}>
      <div className="relative">
        <img 
          src={getFullImageUrl(restaurant.imageUrl) || "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=200"} 
          alt={`${restaurant.name} interior`} 
          className="w-full h-48 object-cover"
          data-testid={`restaurant-image-${restaurant.id}`}
        />
        <div className="absolute top-3 right-3">
          <Badge 
            className={restaurant.status === 'active' ? 'bg-primary hover:bg-green-600' : 'bg-gray-500 hover:bg-gray-600'}
            data-testid={`restaurant-status-${restaurant.id}`}
          >
            {restaurant.status === 'active' ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </div>
      
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4" data-testid={`restaurant-name-${restaurant.id}`}>
          {restaurant.name}
        </h3>
        
        <div className="flex items-center justify-around">
          <Button
            variant="ghost"
            size="sm"
            className="action-button action-button-manage"
            data-testid={`button-manage-${restaurant.id}`}
          >
            <Settings className="w-5 h-5 mb-1" />
            <span className="text-sm">Manage</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="action-button action-button-edit"
            data-testid={`button-edit-${restaurant.id}`}
          >
            <Edit className="w-5 h-5 mb-1" />
            <span className="text-sm">Edit</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="action-button action-button-delete"
            onClick={onDelete}
            data-testid={`button-delete-${restaurant.id}`}
          >
            <Trash2 className="w-5 h-5 mb-1" />
            <span className="text-sm">Delete</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
