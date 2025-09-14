import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Plus, Search, ArrowLeft, Palette, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import BranchCard from "../components/branch-card";
import AddBranchModal from "@/components/add-branch-modal";
import PricingPlansModal from "@/components/pricing-plans-modal";
import DeleteConfirmationModal from "@/components/delete-confirmation-modal";
import BranchConfigModal from "@/components/branch-config-modal";
import type { Branch, Entity } from "@/types/schema";
import { branchApi } from "@/lib/apiRepository";

export default function Branches() {
  const [location, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [currentEntity, setCurrentEntity] = useState<Entity | null>(null);
  const [isTrialUser, setIsTrialUser] = useState(true); // Assume trial for demo
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Extract entity ID from URL query params
  const rawEntityId = new URLSearchParams(window.location.search).get('entityId');
  const entityType = new URLSearchParams(window.location.search).get('entityType');
  
  // Convert frontend entityId format (entity-X) to backend format (X)
  const entityIdStr = rawEntityId?.startsWith('entity-') ? rawEntityId.replace('entity-', '') : rawEntityId;
  const entityId = entityIdStr ? parseInt(entityIdStr, 10) : null;

  const { data: entity } = useQuery<Entity>({
    queryKey: ["entities", entityId],
    enabled: !!entityId,
  });

  const { data: branches = [], isLoading } = useQuery({
    queryKey: ["branches", entityId],
    queryFn: async () => {
      if (!entityId) return [];
      const result = await branchApi.getBranchesByEntity(entityId);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!entityId,
  });

  useEffect(() => {
    if (entity) {
      setCurrentEntity(entity);
    }
  }, [entity]);

  const filteredBranches = Array.isArray(branches) ? branches.filter((branch: any) =>
    (branch.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (branch.address || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (branch.restaurantType || '').toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  // Count unconfigured branches
  const unconfiguredBranches = Array.isArray(branches) ? branches.filter((branch: any) => !branch.isBranchConfigured) : [];
  const hasUnconfiguredBranches = unconfiguredBranches.length > 0;

  const handleManage = (branch: Branch) => {
    // Always navigate to the management page - pricing modal will show there for trial users
    const managementPath = entityType === "hotel" ? "/hotel-management" : "/restaurant-management";
    const queryParams = new URLSearchParams({
      entityId: rawEntityId || "",
      branchId: branch.id.toString(),
      entityType: entityType || "restaurant",
      showPricing: isTrialUser ? "true" : "false"
    });
    navigate(`${managementPath}?${queryParams.toString()}`);
  };

  const handleAddBranch = () => {
    // Show add branch modal directly - pricing modal should show after branch creation or when accessing management
    setShowAddModal(true);
  };

  const handlePricingModalClose = () => {
    setShowPricingModal(false);
  };

  const handleBack = () => {
    navigate("/entities");
  };

  const handleEdit = (branch: Branch) => {
    console.log('=== EDIT BRANCH CLICKED ===');
    console.log('Branch to edit:', branch);
    setSelectedBranch(branch);
    setShowEditModal(true);
  };

  const handleDelete = (branch: Branch) => {
    setSelectedBranch(branch);
    setShowDeleteModal(true);
  };

  const handleConfigure = (branch: Branch) => {
    setSelectedBranch(branch);
    setShowConfigModal(true);
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-lg">Loading branches...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Entities
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              {currentEntity?.name} Branches
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage branches for your {entityType}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => {
              // Preserve current URL query parameters when navigating to appearance
              const currentParams = new URLSearchParams(window.location.search);
              const appearanceUrl = currentParams.toString() ? `/appearance?${currentParams.toString()}` : '/appearance';
              navigate(appearanceUrl);
            }}
            variant="outline"
            className="w-full md:w-auto"
            data-testid="button-appearance"
          >
            <Palette className="w-4 h-4 mr-2" />
            Appearance
          </Button>
          <Button 
            onClick={handleAddBranch}
            className="w-full md:w-auto"
            data-testid="button-add-branch"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Branch
          </Button>
        </div>
      </div>

      {/* Configuration Alert */}
      {hasUnconfiguredBranches && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            {unconfiguredBranches.length === 1 
              ? `1 branch needs configuration to continue operating.`
              : `${unconfiguredBranches.length} branches need configuration to continue operating.`
            } Please configure them using the Config button on each branch card.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400 group-focus-within:text-green-500 transition-colors duration-200" />
          </div>
          <Input
            placeholder="Search branches by name, type, or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-3 w-full border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200 bg-white shadow-sm group-focus-within:shadow-md"
            data-testid="input-search-branches"
          />
        </div>
        <div className="flex gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Badge variant="outline" data-testid="badge-total-branches">
            Total Branches: {Array.isArray(branches) ? branches.length : 0}
          </Badge>
          <Badge variant="outline" data-testid="badge-active-branches">
            Active: {Array.isArray(branches) ? branches.filter((b: any) => (b.status || "active") === "active").length : 0}
          </Badge>
        </div>
      </div>

      {filteredBranches.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {searchTerm ? "No branches found" : "No branches yet"}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {searchTerm
                  ? "Try adjusting your search terms"
                  : "Get started by adding your first branch"}
              </p>
              {!searchTerm && (
                <Button onClick={handleAddBranch} data-testid="button-add-first-branch">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Branch
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredBranches.map((branch: any) => (
            <BranchCard
              key={branch.id}
              branch={branch}
              onManage={handleManage}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onConfigure={handleConfigure}
            />
          ))}
        </div>
      )}

      {showAddModal && entityId && (
        <AddBranchModal
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          entityId={entityId}
        />
      )}

      {showEditModal && selectedBranch && (
        <AddBranchModal
          open={showEditModal}
          onClose={() => {
            console.log('=== EDIT MODAL CLOSING ===');
            setShowEditModal(false);
            setSelectedBranch(null);
          }}
          entityId={currentEntity?.id || entityId || 0}
          branchToEdit={selectedBranch}
          isEdit={true}
        />
      )}

      {showDeleteModal && selectedBranch && (
        <Dialog open={showDeleteModal} onOpenChange={(open) => {
          if (!open) {
            setShowDeleteModal(false);
            setSelectedBranch(null);
          }
        }}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Delete Branch</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{selectedBranch.name}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-3 mt-6">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedBranch(null);
                }}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={async () => {
                  try {
                    await branchApi.deleteBranch(selectedBranch.id);
                    // Refresh branches list
                    if (entityId) {
                      const refreshedBranches = await branchApi.getBranchesByEntity(entityId);
                      // Force re-fetch by invalidating query
                      queryClient.invalidateQueries({ queryKey: ["branches", entityId] });
                    }
                    toast({
                      title: "Success",
                      description: "Branch deleted successfully",
                    });
                  } catch (error: any) {
                    toast({
                      title: "Error",
                      description: error.message || "Failed to delete branch",
                      variant: "destructive",
                    });
                  }
                  setShowDeleteModal(false);
                  setSelectedBranch(null);
                }}
              >
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {showConfigModal && selectedBranch && (
        <BranchConfigModal
          open={showConfigModal}
          onClose={() => {
            setShowConfigModal(false);
            setSelectedBranch(null);
          }}
          branch={selectedBranch}
        />
      )}

      {showPricingModal && (
        <PricingPlansModal
          open={showPricingModal}
          onOpenChange={(open) => setShowPricingModal(open)}
          onPlanSelect={(plan) => {
            console.log("Selected plan:", plan);
            setShowPricingModal(false);
            // In real app, you would upgrade user's subscription here
          }}
        />
      )}
    </div>
  );
}