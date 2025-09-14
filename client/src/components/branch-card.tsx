import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Settings, MapPin, Phone, Edit, Trash2, Building, Cog, Clock, DollarSign, AlertTriangle } from "lucide-react";
import type { Branch } from "@/types/schema";
import { getBranchImageUrl } from "@/lib/imageUtils";

interface BranchCardProps {
  branch: Branch;
  onManage: (branch: Branch) => void;
  onEdit?: (branch: Branch) => void;
  onDelete?: (branch: Branch) => void;
  onConfigure?: (branch: Branch) => void;
}

export default function BranchCard({ branch, onManage, onEdit, onDelete, onConfigure }: BranchCardProps) {
  return (
    <Card className="group bg-white border-0 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden rounded-2xl" data-testid={`card-branch-${branch.id}`}>
      {/* Header Image Section */}
      <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
        <img 
          src={getBranchImageUrl(branch.restaurantLogo)} 
          alt={`${branch.name} logo`} 
          className="w-full h-full object-cover"
          data-testid={`branch-image-${branch.id}`}
        />
        <div className="absolute inset-0 bg-black/20"></div>
        
        {/* Status Badge */}
        <div className="absolute top-4 right-4">
          <Badge className="bg-[#15803d] text-white border-0 shadow-lg px-3 py-1" data-testid={`branch-status-${branch.id}`}>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              Active
            </div>
          </Badge>
        </div>

        {/* Type Badge */}
        <div className="absolute top-4 left-4">
          <Badge className="bg-white/95 text-gray-800 border-0 shadow-lg px-3 py-1" data-testid={`branch-type-${branch.id}`}>
            <div className="flex items-center gap-1.5">
              <Building className="w-3 h-3 text-blue-600" />
              BRANCH
            </div>
          </Badge>
        </div>
      </div>

      {/* Content Section */}
      <CardContent className="p-4 sm:p-6">
        {/* Title */}
        <div className="mb-4">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1" data-testid={`branch-name-${branch.id}`}>
            {branch.name}
          </h3>
          <p className="text-sm text-gray-500 font-medium">Branch Location</p>
        </div>

        {/* Configuration Alert */}
        {!branch.isBranchConfigured && (
          <Alert className="mb-4 border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 text-sm">
              Branch configuration incomplete. Please configure to continue.
            </AlertDescription>
          </Alert>
        )}

        {/* Details */}
        <div className="space-y-3 mb-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <MapPin className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700">Address</p>
              <p className="text-sm text-gray-500 line-clamp-2">{branch.address}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#15803d]/10 rounded-lg">
              <Phone className="w-4 h-4 text-[#15803d]" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Contact</p>
              <p className="text-sm text-gray-500">{branch.contactNumber || 'Not available'}</p>
            </div>
          </div>

          {/* Additional Info */}
          {(branch.timeZone || branch.currency) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {branch.timeZone && (
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-purple-50 rounded-lg">
                    <Clock className="w-3 h-3 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-700">Timezone</p>
                    <p className="text-xs text-gray-500">{branch.timeZone}</p>
                  </div>
                </div>
              )}
              {branch.currency && (
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-50 rounded-lg">
                    <DollarSign className="w-3 h-3 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-700">Currency</p>
                    <p className="text-xs text-gray-500">{branch.currency}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="w-full space-y-3">
          {/* Primary Action */}
          <Button
            className="w-full bg-[#15803d] hover:bg-[#166534] text-white font-medium h-10"
            onClick={() => onManage(branch)}
            data-testid={`button-manage-${branch.id}`}
          >
            <Settings className="w-4 h-4 mr-2" />
            Manage Branch
          </Button>
          
          {/* Secondary Actions */}
          <div className="w-full flex flex-wrap gap-2 justify-center">
            {onConfigure && (
              <Button
                variant="outline"
                size="sm"
                className="px-4 py-2 border-[#15803d] text-[#15803d] hover:bg-[#15803d]/5 font-medium h-9 text-xs"
                onClick={() => onConfigure(branch)}
                data-testid={`button-configure-${branch.id}`}
              >
                Config
              </Button>
            )}
            
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                className="px-4 py-2 border-[#15803d] text-[#15803d] hover:bg-[#15803d]/5 font-medium h-9 text-xs"
                onClick={() => onEdit(branch)}
                data-testid={`button-edit-${branch.id}`}
              >
                Edit
              </Button>
            )}
            
            {onDelete && (
              <Button
                variant="outline"
                size="sm"
                className="px-4 py-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-medium h-9 text-xs"
                onClick={() => onDelete(branch)}
                data-testid={`button-delete-${branch.id}`}
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}