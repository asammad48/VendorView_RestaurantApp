import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Star, ChevronLeft, ChevronRight, Hash, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { Feedback } from "@/types/schema";
import { genericApi } from "@/lib/apiRepository";
import { createApiQuery } from "@/lib/errorHandling";

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${
            star <= rating
              ? "fill-yellow-400 text-yellow-400"
              : "text-gray-300"
          }`}
        />
      ))}
    </div>
  );
}

function FeedbackCard({ feedback }: { feedback: Feedback }) {
  return (
    <div className="flex gap-4 p-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="flex-shrink-0">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
          {feedback.branchName?.charAt(0) || 'F'}
        </div>
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">
              {feedback.branchName} - {feedback.entityName}
            </h3>
            <StarRating rating={feedback.stars} />
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <Hash className="w-3 h-3" />
              <span>{feedback.orderNumber}</span>
            </div>
            <div className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              <span>${feedback.price.toFixed(2)}</span>
            </div>
          </div>
        </div>
        <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
          {feedback.comments}
        </p>
      </div>
    </div>
  );
}

// Interfaces for API responses
interface Entity {
  id: number;
  name: string;
}

interface Branch {
  id: number;
  name: string;
  entityId: number;
}

interface EntitiesAndBranchesResponse {
  entities: Entity[];
  branches: Branch[];
}

export default function Feedbacks() {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEntityId, setSelectedEntityId] = useState<string>("");
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const itemsPerPage = 6;

  // Fetch entities and branches
  const { data: entitiesAndBranches, isLoading: entitiesLoading } = useQuery<EntitiesAndBranchesResponse>({
    queryKey: ["entities-and-branches"],
    queryFn: createApiQuery<EntitiesAndBranchesResponse>(() => genericApi.getEntitiesAndBranches() as Promise<{ data: EntitiesAndBranchesResponse, error?: string, status: number }>),
    staleTime: 0,
    retry: 2,
  });

  // Extract entities and branches from the response
  const entities = entitiesAndBranches?.entities || [];
  const allBranches = entitiesAndBranches?.branches || [];

  // Filter branches based on selected entity
  const filteredBranches = selectedEntityId 
    ? allBranches.filter(branch => branch.entityId.toString() === selectedEntityId)
    : allBranches;

  // Fetch feedbacks with filtering
  const { data: feedbacks = [], isLoading, error } = useQuery<Feedback[]>({
    queryKey: ["/api/VendorDashboard/feedbacks", selectedEntityId, selectedBranchId],
    queryFn: createApiQuery<Feedback[]>(() => {
      const baseUrl = 'https://5dtrtpzg-7261.inc1.devtunnels.ms';
      const params = new URLSearchParams();
      
      // Always send EntityId and BranchId parameters, use null values when not selected
      if (selectedEntityId) {
        params.append('EntityId', selectedEntityId);
      } else {
        params.append('EntityId', '');
      }
      
      if (selectedBranchId) {
        params.append('BranchId', selectedBranchId);
      } else {
        params.append('BranchId', '');
      }
      
      const endpoint = `${baseUrl}/api/VendorDashboard/feedbacks?${params.toString()}`;
      console.log('Fetching feedbacks from:', endpoint);
      
      return fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token') || localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
        },
      }).then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json().then(data => ({ data, status: res.status }));
      });
    }),
    staleTime: 0,
    retry: 2,
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
          Feedbacks
        </h1>
        <div className="space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex gap-4 p-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 animate-pulse">
              <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
          Feedbacks
        </h1>
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            Failed to load feedbacks. Please try again.
          </p>
        </div>
      </div>
    );
  }

  // Pagination logic
  const totalPages = Math.ceil(feedbacks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentFeedbacks = feedbacks.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  const goToPrevious = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Handle entity change
  const handleEntityChange = (entityId: string) => {
    const actualEntityId = entityId === "all" ? "" : entityId;
    setSelectedEntityId(actualEntityId);
    setSelectedBranchId(""); // Clear branch selection when entity changes
    setCurrentPage(1); // Reset to first page
  };

  // Handle branch change
  const handleBranchChange = (branchId: string) => {
    const actualBranchId = branchId === "all" ? "" : branchId;
    setSelectedBranchId(actualBranchId);
    setCurrentPage(1); // Reset to first page
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
        Feedbacks
      </h1>
      
      {/* Filter Controls */}
      <div className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="entity-filter" className="text-sm font-medium mb-2 block">
              Filter by Entity
            </Label>
            <Select value={selectedEntityId || "all"} onValueChange={handleEntityChange}>
              <SelectTrigger className="" data-testid="select-entity-filter">
                <SelectValue placeholder={entitiesLoading ? "Loading entities..." : "All entities"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="option-entity-all">
                  All entities
                </SelectItem>
                {entities.map((entity) => (
                  <SelectItem key={entity.id} value={entity.id.toString()} data-testid={`option-entity-${entity.id}`}>
                    {entity.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="branch-filter" className="text-sm font-medium mb-2 block">
              Filter by Branch
            </Label>
            <Select 
              value={selectedBranchId || "all"} 
              onValueChange={handleBranchChange}
              disabled={false}
            >
              <SelectTrigger className="" data-testid="select-branch-filter">
                <SelectValue placeholder={!selectedEntityId ? "All branches" : "Select branch"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="option-branch-all">
                  All branches
                </SelectItem>
                {filteredBranches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id.toString()} data-testid={`option-branch-${branch.id}`}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      {feedbacks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            {isLoading ? "Loading feedbacks..." : "No feedbacks available for the selected filters."}
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {currentFeedbacks.map((feedback) => (
              <FeedbackCard key={feedback.orderId} feedback={feedback} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Show result: {feedbacks.length}
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPrevious}
                  disabled={currentPage === 1}
                  className="p-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                  const pageNumber = i + 1;
                  return (
                    <Button
                      key={pageNumber}
                      variant={currentPage === pageNumber ? "default" : "outline"}
                      size="sm"
                      onClick={() => goToPage(pageNumber)}
                      className="w-8 h-8 p-0"
                    >
                      {pageNumber}
                    </Button>
                  );
                })}
                
                {totalPages > 5 && (
                  <>
                    <span className="text-gray-400">...</span>
                    <Button
                      variant={currentPage === totalPages ? "default" : "outline"}
                      size="sm"
                      onClick={() => goToPage(totalPages)}
                      className="w-8 h-8 p-0"
                    >
                      {totalPages}
                    </Button>
                  </>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNext}
                  disabled={currentPage === totalPages}
                  className="p-2"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
