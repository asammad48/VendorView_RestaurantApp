import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Settings, MapPin, Phone, Edit, Trash2, Building, Package, Cog } from "lucide-react";
import type { Branch } from "@/types/schema";
import { getBranchImageUrl } from "@/lib/imageUtils";

interface BranchCardProps {
  branch: Branch;
  onManage: (branch: Branch) => void;
  onEdit?: (branch: Branch) => void;
  onDelete?: (branch: Branch) => void;
  onConfigure?: (branch: Branch) => void;
  onInventory?: (branch: Branch) => void;
}

export default function BranchCard({ branch, onManage, onEdit, onDelete, onConfigure, onInventory }: BranchCardProps) {
  return (
    <div
      className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200 overflow-hidden"
      data-testid={`card-branch-${branch.id}`}
    >
      {/* Cover strip */}
      <div className="relative h-32 bg-gradient-to-br from-gray-800 to-gray-600 overflow-hidden">
        <img
          src={getBranchImageUrl(branch.restaurantLogo)}
          alt={branch.name}
          className="w-full h-full object-cover opacity-70"
          data-testid={`branch-image-${branch.id}`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

        {/* Type badge */}
        <div className="absolute top-3 left-3">
          <span className="inline-flex items-center gap-1 bg-white/90 text-gray-700 text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm" data-testid={`branch-type-${branch.id}`}>
            <Building className="w-3 h-3 text-blue-500" />
            BRANCH
          </span>
        </div>

        {/* Status badge */}
        <div className="absolute top-3 right-3">
          <span className="inline-flex items-center gap-1.5 bg-[#15803d] text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm" data-testid={`branch-status-${branch.id}`}>
            <span className="w-1.5 h-1.5 bg-white rounded-full" />
            Active
          </span>
        </div>

        {/* Config needed indicator */}
        {!branch.isBranchConfigured && (
          <div className="absolute bottom-3 left-3">
            <span className="inline-flex items-center gap-1 bg-amber-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
              Config needed
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4">
        {/* Name */}
        <div className="mb-4">
          <h3 className="text-base font-bold text-gray-900 leading-tight" data-testid={`branch-name-${branch.id}`}>
            {branch.name}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">Branch Location</p>
        </div>

        {/* Info rows */}
        <div className="space-y-2.5 mb-5">
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-500">Address</p>
              <p className="text-sm text-gray-800 line-clamp-2">{branch.address}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
              <Phone className="w-3.5 h-3.5 text-[#15803d]" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Contact</p>
              <p className="text-sm text-gray-800">{branch.contactNumber || "Not available"}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <Button
          className="w-full bg-[#15803d] hover:bg-[#166534] text-white text-sm font-medium h-10 mb-2"
          onClick={() => onManage(branch)}
          data-testid={`button-manage-${branch.id}`}
        >
          <Settings className="w-4 h-4 mr-2" />
          Manage Branch
        </Button>

        {onInventory && (
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium h-10 mb-2.5"
            onClick={() => onInventory(branch)}
            data-testid={`button-inventory-${branch.id}`}
          >
            <Package className="w-4 h-4 mr-2" />
            Inventory Management
          </Button>
        )}

        <div className={`grid gap-2 ${onConfigure ? "grid-cols-3" : "grid-cols-2"}`}>
          {onConfigure && (
            <Button
              variant="outline"
              className="h-9 text-xs border-gray-200 text-[#15803d] hover:bg-green-50 hover:border-[#15803d]/30"
              onClick={() => onConfigure(branch)}
              data-testid={`button-configure-${branch.id}`}
            >
              <Cog className="w-3.5 h-3.5 mr-1" />
              Config
            </Button>
          )}
          {onEdit && (
            <Button
              variant="outline"
              className="h-9 text-xs border-gray-200 text-[#15803d] hover:bg-green-50 hover:border-[#15803d]/30"
              onClick={() => onEdit(branch)}
              data-testid={`button-edit-${branch.id}`}
            >
              <Edit className="w-3.5 h-3.5 mr-1" />
              Edit
            </Button>
          )}
          {onDelete && (
            <Button
              variant="outline"
              className="h-9 text-xs border-gray-200 text-red-500 hover:bg-red-50 hover:border-red-200"
              onClick={() => onDelete(branch)}
              data-testid={`button-delete-${branch.id}`}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Delete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
