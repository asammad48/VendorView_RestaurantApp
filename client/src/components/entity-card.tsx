import { Button } from "@/components/ui/button";
import { Settings, Edit, Trash2, MapPin, Phone, Crown, Building2, UtensilsCrossed } from "lucide-react";
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
  const isHotel = displayType.toLowerCase() === "hotel";

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
      data-testid={`card-entity-${entity.id}`}
    >
      {/* Image section */}
      <div className="relative h-44 overflow-hidden bg-[#0f2417]">
        <img
          src={getEntityImageUrl(entity.profilePictureUrl)}
          alt={entity.name}
          className="w-full h-full object-cover"
          data-testid={`entity-image-${entity.id}`}
        />

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-transparent" />

        {/* Type badge — top left */}
        <div className="absolute top-3 left-3">
          <span
            className="inline-flex items-center gap-1 bg-white/95 backdrop-blur-sm text-gray-800 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md tracking-wider uppercase"
            data-testid={`entity-type-${entity.id}`}
          >
            <Crown className="w-3 h-3 text-amber-500" />
            {displayType}
          </span>
        </div>

        {/* Status badge — top right */}
        <div className="absolute top-3 right-3">
          <span
            className="inline-flex items-center gap-1.5 bg-[#15803d]/90 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md"
            data-testid={`entity-status-${entity.id}`}
          >
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            Active
          </span>
        </div>

        {/* Name + type overlaid at bottom of image */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-3.5 pt-6">
          <div className="flex items-end justify-between">
            <div className="min-w-0">
              <h3
                className="text-white font-bold text-[15px] leading-tight truncate drop-shadow-sm"
                data-testid={`entity-name-${entity.id}`}
              >
                {entity.name}
              </h3>
              <p className="text-white/60 text-[11px] mt-0.5">{displayType} Business</p>
            </div>
            <div className="flex-shrink-0 ml-2 w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
              {isHotel
                ? <Building2 className="w-3.5 h-3.5 text-white/80" />
                : <UtensilsCrossed className="w-3.5 h-3.5 text-white/80" />
              }
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        {/* Info rows */}
        <div className="space-y-2 mb-4">
          <div className="flex items-start gap-2.5">
            <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Address</p>
              <p className="text-xs text-gray-700 mt-0.5 line-clamp-1">{entity.address}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Phone</p>
              <p className="text-xs text-gray-700 mt-0.5">{entity.phone || "Not available"}</p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-100 mb-4" />

        {/* Manage button */}
        <Button
          className="w-full bg-[#15803d] hover:bg-[#166534] text-white text-xs font-semibold h-9 rounded-xl mb-2.5 shadow-sm"
          onClick={() => onManage(entity)}
          data-testid={`button-manage-${entity.id}`}
        >
          <Settings className="w-3.5 h-3.5 mr-2" />
          Manage
        </Button>

        {/* Secondary actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="h-8 text-xs font-medium border-gray-200 text-gray-600 hover:text-[#15803d] hover:bg-green-50 hover:border-[#15803d]/30 rounded-lg"
            onClick={() => onEdit(entity)}
            data-testid={`button-edit-${entity.id}`}
          >
            <Edit className="w-3 h-3 mr-1.5" />
            Edit
          </Button>
          <Button
            variant="outline"
            className="h-8 text-xs font-medium border-gray-200 text-gray-600 hover:text-red-500 hover:bg-red-50 hover:border-red-200 rounded-lg"
            onClick={() => onDelete(entity)}
            data-testid={`button-delete-${entity.id}`}
          >
            <Trash2 className="w-3 h-3 mr-1.5" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
