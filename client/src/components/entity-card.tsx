import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Settings, Edit, Trash2, MapPin, Phone, Crown } from "lucide-react";
import type { Entity } from "@/types/schema";
import { getEntityImageUrl } from "@/lib/imageUtils";

interface EntityCardProps {
  entity: Entity;
  onEdit: (entity: Entity) => void;
  onDelete: (entity: Entity) => void;
  onManage: (entity: Entity) => void;
}

export default function EntityCard({ entity, onEdit, onDelete, onManage }: EntityCardProps) {
  const entityType = entity.entityType || (entity.type === 1 ? "Hotel" : "Restaurant");
  const displayType = entityType.charAt(0).toUpperCase() + entityType.slice(1).toLowerCase();

  return (
    <div
      className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200 overflow-hidden"
      data-testid={`card-entity-${entity.id}`}
    >
      {/* Cover strip with logo */}
      <div className="relative h-32 bg-gradient-to-br from-gray-800 to-gray-600 overflow-hidden">
        <img
          src={getEntityImageUrl(entity.profilePictureUrl)}
          alt={entity.name}
          className="w-full h-full object-cover opacity-70"
          data-testid={`entity-image-${entity.id}`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

        {/* Type badge */}
        <div className="absolute top-3 left-3">
          <span className="inline-flex items-center gap-1 bg-white/90 text-gray-700 text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm" data-testid={`entity-type-${entity.id}`}>
            <Crown className="w-3 h-3 text-amber-500" />
            {entityType.toUpperCase()}
          </span>
        </div>

        {/* Status badge */}
        <div className="absolute top-3 right-3">
          <span className="inline-flex items-center gap-1.5 bg-[#15803d] text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm" data-testid={`entity-status-${entity.id}`}>
            <span className="w-1.5 h-1.5 bg-white rounded-full" />
            Active
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        {/* Name + subtitle */}
        <div className="mb-4">
          <h3 className="text-base font-bold text-gray-900 leading-tight" data-testid={`entity-name-${entity.id}`}>
            {entity.name}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">{displayType} Business</p>
        </div>

        {/* Info rows */}
        <div className="space-y-2.5 mb-5">
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-500">Address</p>
              <p className="text-sm text-gray-800 truncate">{entity.address}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
              <Phone className="w-3.5 h-3.5 text-[#15803d]" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Phone</p>
              <p className="text-sm text-gray-800">{entity.phone}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <Button
          className="w-full bg-[#15803d] hover:bg-[#166534] text-white text-sm font-medium h-10 mb-2.5"
          onClick={() => onManage(entity)}
          data-testid={`button-manage-${entity.id}`}
        >
          <Settings className="w-4 h-4 mr-2" />
          Manage
        </Button>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="h-9 text-sm border-gray-200 text-[#15803d] hover:bg-green-50 hover:border-[#15803d]/30"
            onClick={() => onEdit(entity)}
            data-testid={`button-edit-${entity.id}`}
          >
            <Edit className="w-3.5 h-3.5 mr-1.5" />
            Edit
          </Button>
          <Button
            variant="outline"
            className="h-9 text-sm border-gray-200 text-red-500 hover:bg-red-50 hover:border-red-200"
            onClick={() => onDelete(entity)}
            data-testid={`button-delete-${entity.id}`}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
