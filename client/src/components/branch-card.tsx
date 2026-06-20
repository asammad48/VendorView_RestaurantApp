import { Button } from "@/components/ui/button";
import { Settings, MapPin, Phone, Edit, Trash2, Package, Cog, GitBranch, AlertTriangle } from "lucide-react";
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
  const isConfigured = branch.isBranchConfigured;

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
      data-testid={`card-branch-${branch.id}`}
    >
      {/* Image section */}
      <div className="relative h-44 overflow-hidden bg-[#0f2417]">
        <img
          src={getBranchImageUrl(branch.restaurantLogo)}
          alt={branch.name}
          className="w-full h-full object-cover"
          data-testid={`branch-image-${branch.id}`}
        />

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-transparent" />

        {/* Type badge — top left */}
        <div className="absolute top-3 left-3">
          <span
            className="inline-flex items-center gap-1 bg-white/95 backdrop-blur-sm text-gray-800 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md tracking-wider uppercase"
            data-testid={`branch-type-${branch.id}`}
          >
            <GitBranch className="w-3 h-3 text-[#15803d]" />
            Branch
          </span>
        </div>

        {/* Status badge — top right */}
        <div className="absolute top-3 right-3">
          <span
            className="inline-flex items-center gap-1.5 bg-[#15803d]/90 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md"
            data-testid={`branch-status-${branch.id}`}
          >
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            Active
          </span>
        </div>

        {/* Name overlaid at bottom of image */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-3.5 pt-6">
          <div className="flex items-end justify-between">
            <div className="min-w-0">
              <h3
                className="text-white font-bold text-[15px] leading-tight truncate drop-shadow-sm"
                data-testid={`branch-name-${branch.id}`}
              >
                {branch.name}
              </h3>
              <p className="text-white/60 text-[11px] mt-0.5">Branch Location</p>
            </div>

            {/* Config needed pill on the image bottom-right */}
            {!isConfigured && (
              <span className="flex-shrink-0 ml-2 inline-flex items-center gap-1 bg-amber-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-full shadow">
                <AlertTriangle className="w-2.5 h-2.5" />
                Config
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        {/* Config warning banner */}
        {!isConfigured && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-3">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
            <p className="text-[11px] text-amber-700 font-medium">Branch configuration required</p>
          </div>
        )}

        {/* Info rows */}
        <div className="space-y-2 mb-4">
          <div className="flex items-start gap-2.5">
            <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Address</p>
              <p className="text-xs text-gray-700 mt-0.5 line-clamp-1">{branch.address || "Not provided"}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Contact</p>
              <p className="text-xs text-gray-700 mt-0.5">{branch.contactNumber || "Not available"}</p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-100 mb-4" />

        {/* Primary actions */}
        <Button
          className="w-full bg-[#15803d] hover:bg-[#166534] text-white text-xs font-semibold h-9 rounded-xl mb-2 shadow-sm"
          onClick={() => onManage(branch)}
          data-testid={`button-manage-${branch.id}`}
        >
          <Settings className="w-3.5 h-3.5 mr-2" />
          Manage Branch
        </Button>

        {onInventory && (
          <Button
            className="w-full bg-[#1e3a5f] hover:bg-[#162d4a] text-white text-xs font-semibold h-9 rounded-xl mb-2.5 shadow-sm"
            onClick={() => onInventory(branch)}
            data-testid={`button-inventory-${branch.id}`}
          >
            <Package className="w-3.5 h-3.5 mr-2" />
            Inventory Management
          </Button>
        )}

        {/* Secondary actions */}
        <div className={`grid gap-2 ${onConfigure ? "grid-cols-3" : "grid-cols-2"}`}>
          {onConfigure && (
            <Button
              variant="outline"
              className="h-8 text-xs font-medium border-gray-200 text-gray-600 hover:text-[#15803d] hover:bg-green-50 hover:border-[#15803d]/30 rounded-lg"
              onClick={() => onConfigure(branch)}
              data-testid={`button-configure-${branch.id}`}
            >
              <Cog className="w-3 h-3 mr-1" />
              Config
            </Button>
          )}
          {onEdit && (
            <Button
              variant="outline"
              className="h-8 text-xs font-medium border-gray-200 text-gray-600 hover:text-[#15803d] hover:bg-green-50 hover:border-[#15803d]/30 rounded-lg"
              onClick={() => onEdit(branch)}
              data-testid={`button-edit-${branch.id}`}
            >
              <Edit className="w-3 h-3 mr-1" />
              Edit
            </Button>
          )}
          {onDelete && (
            <Button
              variant="outline"
              className="h-8 text-xs font-medium border-gray-200 text-gray-600 hover:text-red-500 hover:bg-red-50 hover:border-red-200 rounded-lg"
              onClick={() => onDelete(branch)}
              data-testid={`button-delete-${branch.id}`}
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Delete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
