import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import RestaurantCard from "@/components/restaurant-card";
import AddBranchModal from "@/components/add-branch-modal";

export default function Restaurants() {
  const [location] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [showAddBranchModal, setShowAddBranchModal] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Determine page type based on current location
  const isHotelManagement = location === "/hotel-management";
  const isRestaurantManagement = location === "/restaurant-management";
  const pageTitle = isHotelManagement ? "Hotel Management" : isRestaurantManagement ? "Restaurant Management" : "Restaurants";

  const { data: restaurants, isLoading } = useQuery({
    queryKey: ["/api/restaurants"],
  });

  const deleteRestaurantMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/restaurants/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants"] });
      toast({
        title: "Success",
        description: "Restaurant deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete restaurant",
        variant: "destructive",
      });
    },
  });

  const filteredRestaurants = Array.isArray(restaurants) ? restaurants.filter((restaurant: any) =>
    restaurant.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  const totalPages = Math.ceil(filteredRestaurants.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRestaurants = filteredRestaurants.slice(startIndex, startIndex + itemsPerPage);

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this restaurant?")) {
      deleteRestaurantMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="loading-spinner" data-testid="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="restaurants-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-800" data-testid="page-title">{pageTitle}</h2>
        <Button 
          onClick={() => setShowAddBranchModal(true)}
          data-testid="button-add-branch"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Branch
        </Button>
      </div>

      {/* Search Bar */}
      <div className="max-w-lg">
        <div className="search-input">
          <Search className="search-icon" />
          <Input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="search-restaurants"
          />
        </div>
      </div>

      {/* Restaurant Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedRestaurants.map((restaurant: any) => (
          <RestaurantCard
            key={restaurant.id}
            restaurant={restaurant}
            onDelete={() => handleDelete(restaurant.id)}
            data-testid={`restaurant-card-${restaurant.id}`}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between" data-testid="pagination-container">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Show result:</span>
            <select 
              className="border border-gray-300 rounded px-3 py-1 text-sm"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              data-testid="select-items-per-page"
            >
              <option value={6}>6</option>
              <option value={12}>12</option>
              <option value={24}>24</option>
            </select>
          </div>
          
          <div className="pagination">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              data-testid="button-prev-page"
            >
              ←
            </Button>
            
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = i + 1;
              return (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  className=""
                  onClick={() => setCurrentPage(page)}
                  data-testid={`button-page-${page}`}
                >
                  {page}
                </Button>
              );
            })}
            
            {totalPages > 5 && (
              <>
                <span className="px-3 py-1 text-gray-500">...</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  data-testid={`button-page-${totalPages}`}
                >
                  {totalPages}
                </Button>
              </>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              data-testid="button-next-page"
            >
              →
            </Button>
          </div>
        </div>
      )}

      <AddBranchModal
        open={showAddBranchModal}
        onOpenChange={setShowAddBranchModal}
      />
    </div>
  );
}
