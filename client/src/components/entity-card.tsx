import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Settings, Edit, Trash2, MapPin, Phone, Building2, Crown } from "lucide-react";
import type { Entity } from "@/types/schema";
import { getEntityImageUrl } from "@/lib/imageUtils";

interface EntityCardProps {
  entity: Entity;
  onEdit: (entity: Entity) => void;
  onDelete: (entity: Entity) => void;
  onManage: (entity: Entity) => void;
}

export default function EntityCard({ entity, onEdit, onDelete, onManage }: EntityCardProps) {
  return (
    <Card className="group bg-white border-0 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden rounded-2xl" data-testid={`card-entity-${entity.id}`}>
      {/* Header Image Section */}
      <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
        <img 
          src={getEntityImageUrl(entity.profilePictureUrl)} 
          alt={`${entity.name} profile`} 
          className="w-full h-full object-cover"
          data-testid={`entity-image-${entity.id}`}
        />
        <div className="absolute inset-0 bg-black/20"></div>
        
        {/* Status Badge */}
        <div className="absolute top-4 right-4">
          <Badge className="bg-[#15803d] text-white border-0 shadow-lg px-3 py-1" data-testid={`entity-status-${entity.id}`}>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              Active
            </div>
          </Badge>
        </div>

        {/* Type Badge */}
        <div className="absolute top-4 left-4">
          <Badge className="bg-white/95 text-gray-800 border-0 shadow-lg px-3 py-1" data-testid={`entity-type-${entity.id}`}>
            <div className="flex items-center gap-1.5">
              <Crown className="w-3 h-3 text-amber-500" />
              {(entity.entityType || (entity.type === 1 ? 'Hotel' : 'Restaurant')).toUpperCase()}
            </div>
          </Badge>
        </div>
      </div>

      {/* Content Section */}
      <CardContent className="p-4 sm:p-6">
        {/* Title */}
        <div className="mb-4">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1" data-testid={`entity-name-${entity.id}`}>
            {entity.name}
          </h3>
          <p className="text-sm text-gray-500 font-medium">
            {entity.entityType || (entity.type === 1 ? 'Hotel' : 'Restaurant')} Business
          </p>
        </div>

        {/* Details */}
        <div className="space-y-3 mb-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <MapPin className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700">Address</p>
              <p className="text-sm text-gray-500 line-clamp-2">{entity.address}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#15803d]/10 rounded-lg">
              <Phone className="w-4 h-4 text-[#15803d]" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Phone</p>
              <p className="text-sm text-gray-500">{entity.phone}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Primary Action */}
          <Button
            className="w-full bg-[#15803d] hover:bg-[#166534] text-white font-medium h-10 sm:h-11"
            onClick={() => onManage(entity)}
            data-testid={`button-manage-${entity.id}`}
          >
            <Settings className="w-4 h-4 mr-2" />
            <span className="text-sm sm:text-base">Manage</span>
          </Button>
          
          {/* Secondary Actions */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <Button
              variant="outline"
              className="w-full border-[#15803d] text-[#15803d] hover:bg-[#15803d]/5 font-medium h-9 sm:h-10"
              onClick={() => onEdit(entity)}
              data-testid={`button-edit-${entity.id}`}
            >
              <Edit className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="text-xs sm:text-sm">Edit</span>
            </Button>
            
            <Button
              variant="outline"
              className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-medium h-9 sm:h-10"
              onClick={() => onDelete(entity)}
              data-testid={`button-delete-${entity.id}`}
            >
              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="text-xs sm:text-sm">Delete</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}