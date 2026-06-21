import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Plus, Search, ArrowLeft, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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

  // Use the entity GUID directly — do not parseInt (backend expects Guid)
  const entityId = rawEntityId ?? null;

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

  const handleInventory = (branch: Branch) => {
    const queryParams = new URLSearchParams({
      branchId: branch.id.toString(),
      entityType: entityType || "restaurant",
      entityId: rawEntityId || ""
    });
    navigate(`/inventory-management?${queryParams.toString()}`);
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
          </Button>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Branches</h1>
            <p className="text-xs text-gray-500 mt-0.5">Manage branches for your restaurant</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search branches..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
              data-testid="input-search-branches"
            />
          </div>
          <Button
            onClick={() => {
              const currentParams = new URLSearchParams(window.location.search);
              const appearanceUrl = currentParams.toString() ? `/appearance?${currentParams.toString()}` : '/appearance';
              navigate(appearanceUrl);
            }}
            variant="outline"
            data-testid="button-appearance"
          >
            <Palette className="w-4 h-4 mr-2" />
            Appearance
          </Button>
          <Button
            onClick={handleAddBranch}
            data-testid="button-add-branch"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Branch
          </Button>
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
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBranches.map((branch: any) => (
            <BranchCard
              key={branch.id}
              branch={branch}
              onManage={handleManage}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onConfigure={handleConfigure}
              onInventory={handleInventory}
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
          entityId={currentEntity?.id || entityId || ""}
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
