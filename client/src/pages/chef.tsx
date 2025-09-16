import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ChevronDown, ChevronLeft, ChevronRight, Eye, Edit, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { chefApi, ordersApi, reservationApi } from "@/lib/apiRepository";
import { useBranchCurrency } from "@/hooks/useBranchCurrency";
import type { DetailedOrder, Reservation, PaginatedResponse } from "@/types/schema";
import { PaginationRequest, PaginationResponse, DEFAULT_PAGINATION_CONFIG, buildPaginationQuery } from "@/types/pagination";
import { SearchTooltip } from "@/components/SearchTooltip";
import { ViewReservationModal } from "@/components/view-reservation-modal";
import { AddReservationModal } from "@/components/add-reservation-modal";
import DeleteConfirmationModal from "@/components/delete-confirmation-modal";

interface Order {
  id: string;
  items: number;
  orderNumber: string;
  date: string;
  tableNo: string;
  customer: string;
  payment: "Paid" | "Unpaid";
  status: "New" | "Preparing" | "Ready" | "Delivered" | "Cancelled";
  price: number;
}

const Chef = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State for branch ID - will be fetched from API
  const [branchId, setBranchId] = useState<number | null>(null);
  
  // Tab management
  const [activeMainTab, setActiveMainTab] = useState("orders");

  // Pagination state for orders
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_PAGINATION_CONFIG.defaultPageSize);
  const [searchTerm, setSearchTerm] = useState('');
  const [orderFilter, setOrderFilter] = useState("All Orders");

  // Pagination state for reservations
  const [reservationsCurrentPage, setReservationsCurrentPage] = useState(1);
  const [reservationsItemsPerPage, setReservationsItemsPerPage] = useState(DEFAULT_PAGINATION_CONFIG.defaultPageSize);
  const [reservationsSearchTerm, setReservationsSearchTerm] = useState('');

  // Modal states for orders
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [isViewOrderModalOpen, setIsViewOrderModalOpen] = useState(false);
  const [isUpdateOrderStatusModalOpen, setIsUpdateOrderStatusModalOpen] = useState(false);
  const [selectedStatusId, setSelectedStatusId] = useState<number | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Modal states for reservations
  const [selectedReservationId, setSelectedReservationId] = useState<number | null>(null);
  const [isViewReservationModalOpen, setIsViewReservationModalOpen] = useState(false);
  const [isAddReservationModalOpen, setIsAddReservationModalOpen] = useState(false);
  const [isEditReservationModalOpen, setIsEditReservationModalOpen] = useState(false);
  const [isDeleteReservationModalOpen, setIsDeleteReservationModalOpen] = useState(false);
  const [reservationToEdit, setReservationToEdit] = useState<any>(null);
  const [reservationToDelete, setReservationToDelete] = useState<any>(null);

  // Get branch ID for chef user
  const { data: chefBranchResponse, isLoading: isLoadingChefBranch, error: chefBranchError } = useQuery({
    queryKey: ['chef-branch'],
    queryFn: async () => {
      try {
        return await chefApi.getChefBranch();
      } catch (error) {
        console.error('Error fetching chef branch:', error);
        throw error;
      }
    },
    staleTime: 30 * 60 * 1000, // Cache for 30 minutes
  });

  // Set branchId when chef branch is loaded
  useEffect(() => {
    if (chefBranchResponse?.branchId) {
      setBranchId(chefBranchResponse.branchId);
    }
  }, [chefBranchResponse]);

  // Branch currency hook
  const { formatPrice } = useBranchCurrency(branchId || 0);

  // Query for orders using real API with pagination
  const { data: ordersResponse, isLoading: isLoadingOrders, refetch: refetchOrders } = useQuery({
    queryKey: [`/api/orders/branch/${branchId}`, currentPage, itemsPerPage, searchTerm, orderFilter],
    queryFn: async (): Promise<PaginationResponse<DetailedOrder>> => {
      if (!branchId) throw new Error('Branch ID not available');
      
      // Build search term that includes status filter
      const effectiveSearchTerm = orderFilter === "All Orders" ? searchTerm : 
        searchTerm ? `${searchTerm} ${orderFilter}` : orderFilter;
      
      const result = await ordersApi.getOrdersByBranch(
        branchId,
        currentPage,
        itemsPerPage,
        'createdAt', // Sort by creation date
        false // Descending order (newest first)
      );
      
      if (!result) {
        throw new Error('No data returned from orders API');
      }
      
      return result;
    },
    enabled: activeMainTab === "orders" && !!branchId, // Only fetch when orders tab is active and branchId is available
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Query for order status types from API
  const { data: orderStatusTypes = [], isLoading: isLoadingStatusTypes, error: statusTypesError } = useQuery({
    queryKey: ['order-status-types'],
    queryFn: async (): Promise<Array<{id: number, name: string}>> => {
      return await ordersApi.getOrderStatusTypes();
    },
    staleTime: 30 * 60 * 1000, // Cache for 30 minutes since this rarely changes
  });

  // Query for reservations using real API with pagination
  const { data: reservationsResponse, isLoading: isLoadingReservations, refetch: refetchReservations } = useQuery({
    queryKey: [`/api/reservations/branch/${branchId}`, reservationsCurrentPage, reservationsItemsPerPage, reservationsSearchTerm],
    queryFn: async (): Promise<PaginationResponse<Reservation>> => {
      if (!branchId) throw new Error('Branch ID not available');
      
      const result = await reservationApi.getReservationsByBranch(
        branchId,
        reservationsCurrentPage,
        reservationsItemsPerPage,
        'reservationDate', // Sort by reservation date
        false // Descending order (newest first)
      );
      
      if (!result) {
        throw new Error('No data returned from reservations API');
      }
      
      return result;
    },
    enabled: activeMainTab === "reservations" && !!branchId, // Only fetch when reservations tab is active and branchId is available
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Helper functions for date formatting
  const formatOrderDate = (dateString: string) => {
    try {
      const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, {
        timeZone: userTimeZone,
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting order date:', error);
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const formatOrderTime = (dateString: string) => {
    try {
      const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const date = new Date(dateString);
      return date.toLocaleTimeString(undefined, {
        timeZone: userTimeZone,
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting order time:', error);
      const date = new Date(dateString);
      return date.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  // Use DetailedOrders directly for the table to access createdAt
  const apiOrders = (ordersResponse as PaginationResponse<DetailedOrder>)?.items || [];
  const paginatedOrders = apiOrders; // Use DetailedOrder directly

  // Use pagination data from API response with proper typing
  const paginationData = ordersResponse as PaginationResponse<DetailedOrder>;
  const totalPages = paginationData?.totalPages || 0;
  const totalCount = paginationData?.totalCount || 0;
  const hasNext = paginationData?.hasNext || false;
  const hasPrevious = paginationData?.hasPrevious || false;

  // Helper functions for getting payment and status from DetailedOrder
  const getPaymentStatus = (order: DetailedOrder) => {
    return order.totalAmount > 0 ? "Paid" : "Unpaid";
  };

  const getOrderStatusName = (statusId: number) => {
    const status = orderStatusTypes.find(s => s.id === statusId);
    return status ? status.name : 'Unknown';
  };

  const getOrderStatusBadge = (statusId: number) => {
    const statusName = getOrderStatusName(statusId);
    
    const getStatusColor = (name: string) => {
      const lowercaseName = name.toLowerCase();
      if (lowercaseName.includes('new') || lowercaseName.includes('pending')) {
        return "bg-yellow-100 text-yellow-800";
      } else if (lowercaseName.includes('preparing') || lowercaseName.includes('process')) {
        return "bg-blue-100 text-blue-800";
      } else if (lowercaseName.includes('ready') || lowercaseName.includes('complet')) {
        return "bg-green-100 text-green-800";
      } else if (lowercaseName.includes('deliver')) {
        return "bg-purple-100 text-purple-800";
      } else if (lowercaseName.includes('cancel') || lowercaseName.includes('reject')) {
        return "bg-red-100 text-red-800";
      }
      return "bg-gray-100 text-gray-800";
    };

    return (
      <Badge variant="secondary" className={getStatusColor(statusName)}>
        {statusName}
      </Badge>
    );
  };

  // Reservations data
  const apiReservations = (reservationsResponse as PaginationResponse<Reservation>)?.items || [];
  const reservations = apiReservations;

  // Reservations pagination data
  const reservationsPaginationData = reservationsResponse as PaginationResponse<Reservation>;
  const reservationsTotalPages = reservationsPaginationData?.totalPages || 0;
  const reservationsTotalCount = reservationsPaginationData?.totalCount || 0;
  const reservationsHasNext = reservationsPaginationData?.hasNext || false;
  const reservationsHasPrevious = reservationsPaginationData?.hasPrevious || false;

  // Order status filters
  const statusFilters = useMemo(() => {
    const baseFilters = ["All Orders"];
    const dynamicFilters = orderStatusTypes.map(status => status.name);
    return [...baseFilters, ...dynamicFilters];
  }, [orderStatusTypes]);

  // Order action handlers
  const handleViewOrder = (orderId: number) => {
    setSelectedOrderId(orderId);
    setIsViewOrderModalOpen(true);
  };

  const handleUpdateOrderStatus = (orderId: number) => {
    setSelectedOrderId(orderId);
    setIsUpdateOrderStatusModalOpen(true);
  };

  // Reservation action handlers
  const handleViewReservation = (reservationId: number) => {
    setSelectedReservationId(reservationId);
    setIsViewReservationModalOpen(true);
  };

  const handleEditReservation = (reservation: Reservation) => {
    setReservationToEdit(reservation);
    setIsEditReservationModalOpen(true);
  };

  const handleDeleteReservation = (reservation: Reservation) => {
    setReservationToDelete(reservation);
    setIsDeleteReservationModalOpen(true);
  };

  const confirmDeleteReservation = async () => {
    if (!reservationToDelete) return;

    try {
      await reservationApi.deleteReservation(reservationToDelete.id);
      
      toast({
        title: "Success",
        description: "Reservation deleted successfully.",
      });

      // Refresh reservations data
      queryClient.invalidateQueries({ queryKey: [`/api/reservations/branch/${branchId}`] });
      
      setIsDeleteReservationModalOpen(false);
      setReservationToDelete(null);
    } catch (error) {
      console.error('Error deleting reservation:', error);
      toast({
        title: "Error",
        description: "Failed to delete reservation. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Loading state for chef branch
  if (isLoadingChefBranch) {
    return (
      <div className="p-8 space-y-6">
        <div className="text-center">
          <div className="text-xl font-semibold mb-2">Loading Chef Dashboard...</div>
          <div className="text-gray-500">Fetching your branch information...</div>
        </div>
      </div>
    );
  }

  // Error state for chef branch
  if (chefBranchError || !branchId) {
    return (
      <div className="p-8 space-y-6">
        <div className="text-center">
          <div className="text-xl font-semibold mb-2 text-red-600">Error Loading Chef Dashboard</div>
          <div className="text-gray-500">
            {chefBranchError ? 'Failed to fetch branch information.' : 'No branch assigned to your account.'}
          </div>
          <Button 
            onClick={() => window.location.reload()} 
            className="mt-4"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6" data-testid="chef-dashboard">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold" data-testid="chef-title">Chef Dashboard</h1>
        <p className="text-gray-500" data-testid="chef-subtitle">
          Manage orders and reservations for Branch ID: {branchId}
        </p>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="orders" data-testid="tab-orders">Orders</TabsTrigger>
          <TabsTrigger value="reservations" data-testid="tab-reservations">Reservations</TabsTrigger>
        </TabsList>

        {/* Orders Tab Content */}
        <TabsContent value="orders" className="space-y-6">
          <div className="space-y-4">
            {/* Orders Header with Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center space-x-4">
                <Select value={orderFilter} onValueChange={setOrderFilter}>
                  <SelectTrigger className="w-[200px]" data-testid="select-order-filter">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusFilters.map((filter) => (
                      <SelectItem key={filter} value={filter}>
                        {filter}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchOrders()}
                  data-testid="button-refresh-orders"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <div className="flex items-center space-x-2">
                        <span>Orders</span>
                        <SearchTooltip
                          placeholder="Search orders, table..."
                          onSearch={setSearchTerm}
                          onClear={() => setSearchTerm('')}
                          currentValue={searchTerm}
                        />
                      </div>
                    </TableHead>
                    <TableHead>Date & Time <ChevronDown className="w-4 h-4 inline ml-1" /></TableHead>
                    <TableHead>Payment <ChevronDown className="w-4 h-4 inline ml-1" /></TableHead>
                    <TableHead>Status <ChevronDown className="w-4 h-4 inline ml-1" /></TableHead>
                    <TableHead>Price <ChevronDown className="w-4 h-4 inline ml-1" /></TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingOrders ? (
                    Array.from({ length: itemsPerPage }, (_, i) => (
                      <TableRow key={`loading-${i}`}>
                        <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                        <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                        <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                        <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                        <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                        <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                      </TableRow>
                    ))
                  ) : paginatedOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No orders found for this branch.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedOrders.map((order) => (
                      <ContextMenu key={order.id}>
                        <ContextMenuTrigger asChild>
                          <TableRow data-testid={`order-row-${order.id}`} className="cursor-pointer hover:bg-gray-50">
                            <TableCell>
                              <div>
                                <div className="font-medium" data-testid={`order-number-${order.id}`}>
                                  {order.orderNumber}
                                </div>
                                <div className="text-sm text-gray-500" data-testid={`order-items-${order.id}`}>
                                  {order.orderItems?.length || 0} items • Location ID: {order.locationId}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell data-testid={`order-datetime-${order.id}`}>
                              <div>
                                <div className="font-medium">{formatOrderDate(order.createdAt)}</div>
                                <div className="text-sm text-gray-500">{formatOrderTime(order.createdAt)}</div>
                              </div>
                            </TableCell>
                            <TableCell data-testid={`order-payment-${order.id}`}>
                              <Badge variant={getPaymentStatus(order) === "Paid" ? "default" : "secondary"}>
                                {getPaymentStatus(order)}
                              </Badge>
                            </TableCell>
                            <TableCell data-testid={`order-status-${order.id}`}>
                              {getOrderStatusBadge(Number(order.orderStatus))}
                            </TableCell>
                            <TableCell className="font-medium" data-testid={`order-price-${order.id}`}>
                              {formatPrice(order.totalAmount)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewOrder(order.id)}
                                  data-testid={`button-view-order-${order.id}`}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleUpdateOrderStatus(order.id)}
                                  data-testid={`button-update-order-${order.id}`}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          <ContextMenuItem onClick={() => handleViewOrder(order.id)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </ContextMenuItem>
                          <ContextMenuItem onClick={() => handleUpdateOrderStatus(order.id)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Update Status
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Orders Pagination */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">
                  Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalCount)} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} orders
                </span>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">Rows per page:</span>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => {
                      setItemsPerPage(Number(value));
                      setCurrentPage(1); // Reset to first page when changing page size
                    }}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEFAULT_PAGINATION_CONFIG.pageSizeOptions.map(size => (
                        <SelectItem key={size} value={size.toString()}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={!hasPrevious}
                    data-testid="button-prev-page-orders"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  
                  <span className="text-sm font-medium">
                    Page {currentPage} of {totalPages}
                  </span>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={!hasNext}
                    data-testid="button-next-page-orders"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Reservations Tab Content */}
        <TabsContent value="reservations" className="space-y-6">
          <div className="space-y-4">
            {/* Reservations Header with Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center space-x-4">
                <Button
                  onClick={() => setIsAddReservationModalOpen(true)}
                  data-testid="button-add-reservation"
                >
                  Add Reservation
                </Button>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchReservations()}
                  data-testid="button-refresh-reservations"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Reservations Table */}
            <div className="bg-white rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <div className="flex items-center space-x-2">
                        <span>Reservation Name</span>
                        <SearchTooltip
                          placeholder="Search reservations..."
                          onSearch={setReservationsSearchTerm}
                          onClear={() => setReservationsSearchTerm('')}
                          currentValue={reservationsSearchTerm}
                        />
                      </div>
                    </TableHead>
                    <TableHead>Reservation Date <ChevronDown className="w-4 h-4 inline ml-1" /></TableHead>
                    <TableHead>Table Name <ChevronDown className="w-4 h-4 inline ml-1" /></TableHead>
                    <TableHead>Number of Guests <ChevronDown className="w-4 h-4 inline ml-1" /></TableHead>
                    <TableHead>Status <ChevronDown className="w-4 h-4 inline ml-1" /></TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingReservations ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        Loading reservations...
                      </TableCell>
                    </TableRow>
                  ) : reservations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        No reservations found
                      </TableCell>
                    </TableRow>
                  ) : (
                    reservations.map((reservation: Reservation) => (
                    <ContextMenu key={reservation.id}>
                      <ContextMenuTrigger asChild>
                        <TableRow className="hover:bg-gray-50 cursor-pointer" data-testid={`reservation-row-${reservation.id}`}>
                          <TableCell className="font-medium" data-testid={`reservation-name-${reservation.id}`}>
                            {reservation.reservationName}
                          </TableCell>
                          <TableCell data-testid={`reservation-date-${reservation.id}`}>
                            {new Date(reservation.reservationDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell data-testid={`reservation-table-${reservation.id}`}>
                            {reservation.tableName}
                          </TableCell>
                          <TableCell data-testid={`reservation-guests-${reservation.id}`}>
                            {reservation.numberOfGuests}
                          </TableCell>
                          <TableCell data-testid={`reservation-status-${reservation.id}`}>
                            <Badge 
                              variant="secondary" 
                              className={
                                reservation.actionTaken === 0 ? "bg-yellow-100 text-yellow-800" :
                                reservation.actionTaken === 1 ? "bg-green-100 text-green-800" :
                                "bg-red-100 text-red-800"
                              }
                            >
                              {reservation.actionTaken === 0 ? "Pending" :
                               reservation.actionTaken === 1 ? "Confirmed" : "Cancelled"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewReservation(reservation.id)}
                                data-testid={`button-view-reservation-${reservation.id}`}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditReservation(reservation)}
                                data-testid={`button-edit-reservation-${reservation.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem onClick={() => handleViewReservation(reservation.id)}>
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </ContextMenuItem>
                        <ContextMenuItem onClick={() => handleEditReservation(reservation)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Reservation
                        </ContextMenuItem>
                        <ContextMenuItem 
                          onClick={() => handleDeleteReservation(reservation)}
                          className="text-red-600"
                        >
                          Delete
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Reservations Pagination */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">
                  Showing {Math.min((reservationsCurrentPage - 1) * reservationsItemsPerPage + 1, reservationsTotalCount)} to {Math.min(reservationsCurrentPage * reservationsItemsPerPage, reservationsTotalCount)} of {reservationsTotalCount} reservations
                </span>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">Rows per page:</span>
                  <Select
                    value={reservationsItemsPerPage.toString()}
                    onValueChange={(value) => {
                      setReservationsItemsPerPage(Number(value));
                      setReservationsCurrentPage(1); // Reset to first page when changing page size
                    }}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEFAULT_PAGINATION_CONFIG.pageSizeOptions.map(size => (
                        <SelectItem key={size} value={size.toString()}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setReservationsCurrentPage(Math.max(1, reservationsCurrentPage - 1))}
                    disabled={!reservationsHasPrevious}
                    data-testid="button-prev-page-reservations"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  
                  <span className="text-sm font-medium">
                    Page {reservationsCurrentPage} of {reservationsTotalPages}
                  </span>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setReservationsCurrentPage(Math.min(reservationsTotalPages, reservationsCurrentPage + 1))}
                    disabled={!reservationsHasNext}
                    data-testid="button-next-page-reservations"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Reservation Modals */}
      {selectedReservationId && (
        <ViewReservationModal
          isOpen={isViewReservationModalOpen}
          onClose={() => {
            setIsViewReservationModalOpen(false);
            setSelectedReservationId(null);
          }}
          reservationId={selectedReservationId}
        />
      )}

      {branchId && (
        <AddReservationModal
          isOpen={isAddReservationModalOpen}
          onClose={() => setIsAddReservationModalOpen(false)}
          branchId={branchId.toString()}
        />
      )}

      {reservationToEdit && branchId && (
        <AddReservationModal
          isOpen={isEditReservationModalOpen}
          onClose={() => {
            setIsEditReservationModalOpen(false);
            setReservationToEdit(null);
          }}
          branchId={branchId.toString()}
          reservation={reservationToEdit}
          isEditMode={true}
        />
      )}

      {/* Simple Confirmation Dialog for Reservation Deletion */}
      <Dialog open={isDeleteReservationModalOpen} onOpenChange={setIsDeleteReservationModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Reservation</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Are you sure you want to delete the reservation "{reservationToDelete?.reservationName}"? This action cannot be undone.</p>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsDeleteReservationModalOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDeleteReservation}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Order Modal */}
      {selectedOrderId && (
        <Dialog open={isViewOrderModalOpen} onOpenChange={setIsViewOrderModalOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="view-order-modal">
            <DialogHeader className="pb-4">
              <DialogTitle className="text-xl font-semibold text-gray-900">Order Details</DialogTitle>
              <DialogDescription className="text-gray-600 mt-1">
                Complete information for order #{paginatedOrders.find(o => o.id === selectedOrderId)?.orderNumber}
              </DialogDescription>
            </DialogHeader>
            
            {(() => {
              const selectedOrder = paginatedOrders.find(o => o.id === selectedOrderId);
              if (!selectedOrder) return null;
              
              return (
                <div className="space-y-6">
                  {/* Order Details Grid - 2x2 layout */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-500">Order Number</label>
                      <p className="text-base font-semibold text-gray-900" data-testid="view-order-number">
                        {selectedOrder.orderNumber}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-500">Date & Time</label>
                      <p className="text-base text-gray-900" data-testid="view-order-datetime">
                        {formatOrderDate(selectedOrder.createdAt)} at {formatOrderTime(selectedOrder.createdAt)}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-500">Status</label>
                      <div data-testid="view-order-status">{getOrderStatusBadge(Number(selectedOrder.orderStatus))}</div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-500">Payment</label>
                      <div data-testid="view-order-payment">
                        <Badge variant={getPaymentStatus(selectedOrder) === "Paid" ? "default" : "secondary"}>
                          {getPaymentStatus(selectedOrder)}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Customer Information Section */}
                  <div className="space-y-4">
                    {selectedOrder.username && (
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-500">Customer Name</label>
                        <p className="text-base text-gray-900" data-testid="view-order-customer">{selectedOrder.username}</p>
                      </div>
                    )}

                    {selectedOrder.orderType && (
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-500">Order Type</label>
                        <p className="text-base text-gray-900 capitalize" data-testid="view-order-type">
                          {selectedOrder.orderType.toLowerCase()}
                        </p>
                      </div>
                    )}

                    {selectedOrder.branchName && (
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-500">Branch</label>
                        <p className="text-base text-gray-900" data-testid="view-order-branch">{selectedOrder.branchName}</p>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-500">Location ID</label>
                      <p className="text-base text-gray-900" data-testid="view-order-location">{selectedOrder.locationId}</p>
                    </div>
                  </div>

                  {/* Order Items Section */}
                  {selectedOrder.orderItems && selectedOrder.orderItems.length > 0 && (
                    <div className="space-y-4">
                      <label className="text-sm font-medium text-gray-500">Order Items</label>
                      <div className="border rounded-lg">
                        {selectedOrder.orderItems.map((item: any, index: number) => (
                          <div key={index} className="flex justify-between items-center p-3 border-b last:border-b-0">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{item.menuItemName || item.name || 'Item'}</p>
                              <p className="text-sm text-gray-500">
                                Quantity: {item.quantity} × {formatPrice(item.unitPrice)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-gray-900">
                                {formatPrice(item.quantity * item.unitPrice)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Final Total */}
                  <div className="border-t pt-4 mt-6">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-gray-900">Total Amount</span>
                      <span className="text-xl font-bold text-gray-900" data-testid="view-order-total">
                        {formatPrice(selectedOrder.totalAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
      )}

      {/* Update Order Status Modal */}
      {selectedOrderId && (
        <Dialog open={isUpdateOrderStatusModalOpen} onOpenChange={setIsUpdateOrderStatusModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Update Order Status</DialogTitle>
              <DialogDescription>
                Change the status for order #{paginatedOrders.find(o => o.id === selectedOrderId)?.orderNumber}
              </DialogDescription>
            </DialogHeader>
            
            {(() => {
              const selectedOrder = paginatedOrders.find(o => o.id === selectedOrderId);
              if (!selectedOrder) return null;
              
              return (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Current Status</label>
                    <div className="mt-1">
                      {getOrderStatusBadge(Number(selectedOrder.orderStatus))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Select New Status</label>
                    {isLoadingStatusTypes ? (
                      <div className="mt-1 p-2 border rounded">Loading status types...</div>
                    ) : statusTypesError ? (
                      <div className="mt-1 p-2 border rounded bg-red-50 text-red-600" data-testid="status-error">
                        Failed to load status options. Please try again.
                      </div>
                    ) : (
                      <Select 
                        value={selectedStatusId?.toString() || ""} 
                        onValueChange={(value) => setSelectedStatusId(Number(value))}
                      >
                        <SelectTrigger className="mt-1" data-testid="status-select">
                          <SelectValue placeholder="Select a status" />
                        </SelectTrigger>
                        <SelectContent>
                          {orderStatusTypes.map((status) => (
                            <SelectItem key={status.id} value={status.id.toString()}>
                              <div className="flex items-center space-x-2">
                                <span>{status.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 pt-4">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => {
                        setIsUpdateOrderStatusModalOpen(false);
                        setSelectedStatusId(null);
                        setSelectedOrderId(null);
                      }}
                      data-testid="button-cancel-status"
                    >
                      Cancel
                    </Button>
                    <Button 
                      className="flex-1 bg-green-500 hover:bg-green-600"
                      disabled={!selectedStatusId || isUpdatingStatus}
                      onClick={async () => {
                        if (!selectedStatusId || !selectedOrder) return;
                        
                        setIsUpdatingStatus(true);
                        try {
                          await ordersApi.updateOrderStatus(selectedOrder.id, selectedStatusId, 'Status updated via chef dashboard');
                          
                          // Refresh the orders list to show the updated status
                          refetchOrders();
                          
                          // Close the modal and reset state
                          setIsUpdateOrderStatusModalOpen(false);
                          setSelectedStatusId(null);
                          setSelectedOrderId(null);
                          
                          // Show success message
                          toast({
                            title: "Status Updated",
                            description: `Order ${selectedOrder.orderNumber} status has been updated successfully.`,
                          });
                        } catch (error) {
                          console.error('Failed to update order status:', error);
                          toast({
                            title: "Update Failed",
                            description: "Failed to update order status. Please try again.",
                            variant: "destructive",
                          });
                        } finally {
                          setIsUpdatingStatus(false);
                        }
                      }}
                      data-testid="button-update-status"
                    >
                      {isUpdatingStatus ? 'Updating...' : 'Update Status'}
                    </Button>
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Chef;