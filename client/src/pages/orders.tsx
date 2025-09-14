import { useState, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Search, ChevronDown, Edit, Trash2, Plus, MoreHorizontal, Eye, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import QRCodeModal from "@/components/qr-code-modal";
import AddTableModal from "@/components/add-table-modal";
import EditTableModal from "@/components/edit-table-modal";
import AddMenuModal from "@/components/add-menu-modal";
import AddCategoryModal from "@/components/add-category-modal";
import AddSubMenuModal from "@/components/add-submenu-modal";
import ApplyDiscountModal from "@/components/apply-discount-modal";
import AddDealsModal from "@/components/add-deals-modal";
import AddServicesModal from "@/components/add-services-modal";
import AddDiscountModal from "@/components/add-discount-modal";
import PricingPlansModal from "@/components/pricing-plans-modal";
import SimpleDeleteModal from "@/components/simple-delete-modal";
import ViewMenuModal from "@/components/view-menu-modal";
import ViewDealsModal from "@/components/view-deals-modal";
import { SearchTooltip } from "@/components/SearchTooltip";
import { useLocation } from "wouter";
import { locationApi, branchApi, dealsApi, discountsApi, apiRepository, servicesApi, ordersApi } from "@/lib/apiRepository";
import { useBranchCurrency } from "@/hooks/useBranchCurrency";
import type { Branch } from "@/types/schema";
// Use MenuItem and MenuCategory from schema
import type { MenuItem, MenuCategory, SubMenu, Deal, Discount, BranchService, DetailedOrder } from "@/types/schema";
import { PaginationRequest, PaginationResponse, DEFAULT_PAGINATION_CONFIG, buildPaginationQuery } from "@/types/pagination";

// Deal interface is now imported from schema

interface Order {
  id: string;
  items: number;
  orderNumber: string;
  date: string;
  tableNo: string;
  payment: "Paid" | "Unpaid";
  status: "Preparing" | "Delivered" | "Cancelled";
  price: number;
}

interface TableData {
  id: string;
  tableNumber: string;
  branch: string;
  waiter: string;
  seats: number;
  status: "Active" | "Inactive";
}

// API response interface for locations/tables
interface LocationApiResponse {
  id: number;
  branchId: number;
  locationType: number;
  name: string;
  qrCode: string;
  capacity: number;
}

// Extended interface with branch name
interface TableWithBranchData extends TableData {
  qrCode: string;
  branchName: string;
}


const mockTables: TableData[] = [
  {
    id: "1",
    tableNumber: "Table #5",
    branch: "Gulshan Branch",
    waiter: "Raza",
    seats: 4,
    status: "Active"
  },
  {
    id: "2",
    tableNumber: "Table #5",
    branch: "Gulshan Branch",
    waiter: "Raza",
    seats: 4,
    status: "Active"
  },
  {
    id: "3",
    tableNumber: "Table #5",
    branch: "Gulshan Branch",
    waiter: "Raza",
    seats: 4,
    status: "Active"
  },
  {
    id: "4",
    tableNumber: "Table #5",
    branch: "Gulshan Branch",
    waiter: "Raza",
    seats: 4,
    status: "Active"
  },
  {
    id: "5",
    tableNumber: "Table #5",
    branch: "Gulshan Branch",
    waiter: "Raza",
    seats: 4,
    status: "Active"
  },
  {
    id: "6",
    tableNumber: "Table #5",
    branch: "Gulshan Branch",
    waiter: "Raza",
    seats: 4,
    status: "Active"
  }
];

export default function Orders() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Extract branchId from URL query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const branchId = parseInt(urlParams.get('branchId') || '1', 10); // Get branchId from URL, no hardcoded default
  
  // Use branch currency for proper formatting
  const { formatPrice: formatBranchPrice, getCurrencySymbol } = useBranchCurrency(branchId);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [orderFilter, setOrderFilter] = useState("All Orders");
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, orderFilter, itemsPerPage]);
  
  // Pagination states for different tables
  const [menuCurrentPage, setMenuCurrentPage] = useState(1);
  const [categoryCurrentPage, setCategoryCurrentPage] = useState(1);
  const [subMenuCurrentPage, setSubMenuCurrentPage] = useState(1);
  const [dealsCurrentPage, setDealsCurrentPage] = useState(1);
  const [discountsCurrentPage, setDiscountsCurrentPage] = useState(1);
  const [menuItemsPerPage] = useState(6);
  const [categoryItemsPerPage] = useState(6);
  const [subMenuItemsPerPage] = useState(6);
  const [dealsItemsPerPage, setDealsItemsPerPage] = useState(DEFAULT_PAGINATION_CONFIG.defaultPageSize);
  const [discountsItemsPerPage, setDiscountsItemsPerPage] = useState(DEFAULT_PAGINATION_CONFIG.defaultPageSize);
  const [discountsSearchTerm, setDiscountsSearchTerm] = useState("");
  const [subMenuSearchTerm, setSubMenuSearchTerm] = useState("");
  const [showQRModal, setShowQRModal] = useState(false);
  const [showAddTableModal, setShowAddTableModal] = useState(false);
  const [showAddMenuModal, setShowAddMenuModal] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showAddSubMenuModal, setShowAddSubMenuModal] = useState(false);
  const [editSubMenu, setEditSubMenu] = useState<SubMenu | null>(null);
  const [showApplyDiscountModal, setShowApplyDiscountModal] = useState(false);
  const [showAddDealsModal, setShowAddDealsModal] = useState(false);
  const [showEditDealsModal, setShowEditDealsModal] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<any>(null);
  const [showAddDiscountModal, setShowAddDiscountModal] = useState(false);
  const [showEditDiscountModal, setShowEditDiscountModal] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState<any>(null);
  const [showAddServicesModal, setShowAddServicesModal] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState("orders");

  // Query for branch services with real API
  // LAZY LOADING: Only fetch when services tab is active
  const { data: branchServices = [], isLoading: isLoadingBranchServices, refetch: refetchBranchServices } = useQuery<BranchService[]>({
    queryKey: ['branch-services', branchId],
    queryFn: async (): Promise<BranchService[]> => {
      return await servicesApi.getBranchServices(branchId);
    },
    enabled: activeMainTab === "services", // LAZY LOADING: Only fetch when services tab is active
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showEditTableModal, setShowEditTableModal] = useState(false);
  const [selectedTable, setSelectedTable] = useState<TableWithBranchData | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<DetailedOrder | null>(null);
  const [showViewOrderModal, setShowViewOrderModal] = useState(false);
  const [showUpdateStatusModal, setShowUpdateStatusModal] = useState(false);
  const [selectedStatusId, setSelectedStatusId] = useState<number | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Check URL params for pricing modal trigger
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const showPricing = urlParams.get('showPricing');
    if (showPricing === 'true') {
      setShowPricingModal(true);
    }
  }, []);
  // Get branch details for the current branch
  const { data: branchData } = useQuery<Branch>({
    queryKey: ["branch", branchId],
    queryFn: async () => {
      const response = await branchApi.getBranchById(branchId);
      // getBranchById returns the data directly
      return response as Branch;
    },
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    retry: 2,
  });

  // Real API query for tables from the current branch
  // LAZY LOADING: Only fetch when tables tab is active
  const { data: tablesData, isLoading: isLoadingTables, refetch: refetchTables } = useQuery<LocationApiResponse[]>({
    queryKey: ["tables", "branch", branchId],
    queryFn: async () => {
      const response = await locationApi.getLocationsByBranch(branchId);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      return response.data as LocationApiResponse[];
    },
    enabled: activeMainTab === "tables", // LAZY LOADING: Only fetch when tables tab is active
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 2,
  });

  // Transform API data to match UI format with real branch name from API
  const tables: TableWithBranchData[] = (tablesData || []).map((location) => ({
    id: location.id.toString(),
    tableNumber: `Table ${location.name}`,
    branch: branchData?.name || "Loading branch...", // Use actual branch name from API (Rich pakistan)
    branchName: branchData?.name || "Loading branch...", // For QR modal - use actual API branch name (Rich pakistan)
    waiter: "Unassigned", // Keep for interface compatibility but won't display
    seats: location.capacity,
    status: location.capacity > 0 ? "Active" : "Inactive" as "Active" | "Inactive",
    qrCode: location.qrCode // Store QR code from API
  }));
  const [menuSearchTerm, setMenuSearchTerm] = useState("");
  const [categorySearchTerm, setCategorySearchTerm] = useState("");
  const [dealsSearchTerm, setDealsSearchTerm] = useState("");
  const [activeMenuTab, setActiveMenuTab] = useState("Menu");
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory | null>(null);
  const [selectedSubMenu, setSelectedSubMenu] = useState<SubMenu | null>(null);
  const [showEditMenuModal, setShowEditMenuModal] = useState(false);
  const [showViewMenuModal, setShowViewMenuModal] = useState(false);
  const [selectedMenuItemId, setSelectedMenuItemId] = useState<number | null>(null);
  const [showViewDealsModal, setShowViewDealsModal] = useState(false);
  const [selectedDealId, setSelectedDealId] = useState<number | null>(null);
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [showEditSubMenuModal, setShowEditSubMenuModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteItem, setDeleteItem] = useState<{type: 'menu' | 'category' | 'submenu' | 'deal' | 'table' | 'discount', id: string, name: string} | null>(null);

  // Query for orders using real API with pagination (following template pattern)
  const { data: ordersResponse, isLoading: isLoadingOrders, refetch: refetchOrders } = useQuery({
    queryKey: [`/api/orders/branch/${branchId}`, currentPage, itemsPerPage, searchTerm, orderFilter],
    queryFn: async (): Promise<PaginationResponse<DetailedOrder>> => {
      // Build search term that includes status filter
      const effectiveSearchTerm = orderFilter === "All Orders" ? searchTerm : 
        searchTerm ? `${searchTerm} ${orderFilter}` : orderFilter;
      
      const result = await ordersApi.getOrdersByBranch(
        branchId,
        currentPage,
        itemsPerPage,
        'createdAt', // Sort by creation date
        false, // Descending order (newest first)
        effectiveSearchTerm
      );
      
      if (!result) {
        throw new Error('No data returned from orders API');
      }
      
      return result;
    },
    enabled: activeMainTab === "orders", // Only fetch when orders tab is active
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

  // Helper functions for date formatting - properly convert UTC to local time
  const formatOrderDate = (dateString: string) => {
    try {
      // Use formatBranchTime to convert UTC to local time, then extract date part
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
      // Fallback to basic date formatting
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
      // Use user's timezone to display time correctly
      const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const date = new Date(dateString);
      return date.toLocaleTimeString(undefined, {
        timeZone: userTimeZone,
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting order time:', error);
      // Fallback to basic time formatting
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
    // Assuming paid if total amount is greater than 0, adjust based on actual API structure
    return order.totalAmount > 0 ? "Paid" : "Unpaid";
  };

  const getOrderStatus = (order: DetailedOrder) => {
    // Map API orderStatus to UI status format
    const status = order.orderStatus?.toLowerCase();
    if (status?.includes('prepar')) return 'Preparing';
    if (status?.includes('deliver') || status?.includes('complet') || status?.includes('served')) return 'Delivered';
    if (status?.includes('cancel')) return 'Cancelled';
    return order.orderStatus || 'Preparing';
  };

  const getOrderItems = (order: DetailedOrder) => {
    return (order.orderItems?.length || 0) + (order.orderPackages?.length || 0);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Preparing":
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-200">Preparing</Badge>;
      case "Delivered":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Delivered</Badge>;
      case "Cancelled":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPaymentBadge = (payment: string) => {
    return payment === "Paid" ? 
      <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Paid</Badge> :
      <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200">Unpaid</Badge>;
  };

  // Query for menu items
  // Query for menu items with real API and pagination support using generic API repository
  // LAZY LOADING: Only fetch when menu tab is active
  const { data: menuItemsResponse, isLoading: isLoadingMenu, refetch: refetchMenuItems } = useQuery({
    queryKey: [`menu-items-branch-${branchId}`, menuCurrentPage, menuSearchTerm, menuItemsPerPage],
    queryFn: async () => {
      const response = await apiRepository.call<{
        items: MenuItem[];
        pageNumber: number;
        pageSize: number;
        totalCount: number;
        totalPages: number;
        hasPrevious: boolean;
        hasNext: boolean;
      }>(
        'getMenuItemsByBranch',
        'GET',
        undefined,
        {
          PageNumber: menuCurrentPage.toString(),
          PageSize: menuItemsPerPage.toString(),
          SortBy: 'name',
          IsAscending: 'true',
          ...(menuSearchTerm && { SearchTerm: menuSearchTerm })
        },
        true,
        { branchId }
      );
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      return response.data;
    },
    enabled: activeMainTab === "menu", // LAZY LOADING: Only fetch when menu tab is active
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const menuItems = menuItemsResponse?.items || [];
  const menuTotalCount = menuItemsResponse?.totalCount || 0;
  const menuTotalPages = menuItemsResponse?.totalPages || 0;
  const menuHasNext = menuItemsResponse?.hasNext || false;
  const menuHasPrevious = menuItemsResponse?.hasPrevious || false;


  // Query for submenus with real API and pagination support using generic API repository
  // LAZY LOADING: Only fetch when menu tab is active
  const { data: subMenusResponse, isLoading: isLoadingSubMenus, refetch: refetchSubMenus } = useQuery({
    queryKey: [`submenus-branch-${branchId}`, subMenuCurrentPage, subMenuSearchTerm, subMenuItemsPerPage],
    queryFn: async () => {
      const response = await apiRepository.call<{
        items: SubMenu[];
        pageNumber: number;
        pageSize: number;
        totalCount: number;
        totalPages: number;
        hasPrevious: boolean;
        hasNext: boolean;
      }>(
        'getSubMenusByBranch',
        'GET',
        undefined,
        {
          PageNumber: subMenuCurrentPage.toString(),
          PageSize: subMenuItemsPerPage.toString(),
          SortBy: 'name',
          IsAscending: 'true',
          ...(subMenuSearchTerm && { SearchTerm: subMenuSearchTerm })
        },
        true,
        { branchId }
      );
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      return response.data;
    },
    enabled: activeMainTab === "menu", // LAZY LOADING: Only fetch when menu tab is active
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const subMenus = subMenusResponse?.items || [];
  const subMenuTotalPages = subMenusResponse?.totalPages || 1;

  // Fetch ALL submenu items for the branch to create a lookup map for deal display
  const { data: allSubMenuItems = [] } = useQuery({
    queryKey: [`all-submenus-branch-${branchId}`],
    queryFn: async () => {
      const response = await apiRepository.call<{
        items: SubMenu[];
        pageNumber: number;
        pageSize: number;
        totalCount: number;
        totalPages: number;
        hasPrevious: boolean;
        hasNext: boolean;
      }>(
        'getSubMenusByBranch',
        'GET',
        undefined,
        {
          PageNumber: '1',
          PageSize: '1000', // Get all items for lookup
          SortBy: 'name',
          IsAscending: 'true'
        },
        true,
        { branchId }
      );
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      return response.data?.items || [];
    },
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes since this is for lookup only
  });

  // Create a lookup map for submenu item names
  const subMenuItemsLookup = new Map(
    allSubMenuItems.map(item => [item.id, item.name])
  );

  // Stock status update mutation
  const updateStockStatusMutation = useMutation({
    mutationFn: async ({ itemId, isOutOfStock }: { itemId: number; isOutOfStock: boolean }) => {
      const response = await apiRepository.call(
        'updateMenuItemStockStatus',
        'PUT',
        { isOutOfStock: !isOutOfStock }, // Toggle the current status
        undefined,
        true,
        { id: itemId }
      );
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate menu items query to refresh data and show updated stock status
      queryClient.invalidateQueries({ queryKey: [`menu-items-branch-${branchId}`] });
      
      // Show success message
      toast({
        title: "Stock Status Updated",
        description: `Menu item stock status has been updated successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update stock status. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handler function for updating stock status
  const handleUpdateStockStatus = (itemId: number, currentStockStatus: boolean) => {
    updateStockStatusMutation.mutate({ 
      itemId, 
      isOutOfStock: currentStockStatus 
    });
  };

  // Query for categories with real API and pagination support using generic API repository
  // LAZY LOADING: Only fetch when menu tab is active
  const { data: categoriesResponse, isLoading: isLoadingCategories, refetch: refetchCategories } = useQuery({
    queryKey: [`menu-categories-branch-${branchId}`, categoryCurrentPage, categorySearchTerm, categoryItemsPerPage],
    queryFn: async () => {
      const response = await apiRepository.call<{
        items: MenuCategory[];
        pageNumber: number;
        pageSize: number;
        totalCount: number;
        totalPages: number;
        hasPrevious: boolean;
        hasNext: boolean;
      }>(
        'getMenuCategoriesByBranch',
        'GET',
        undefined,
        {
          PageNumber: categoryCurrentPage.toString(),
          PageSize: categoryItemsPerPage.toString(),
          SortBy: 'name',
          IsAscending: 'true',
          ...(categorySearchTerm && { SearchTerm: categorySearchTerm })
        },
        true,
        { branchId }
      );
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      return response.data;
    },
    enabled: activeMainTab === "menu", // LAZY LOADING: Only fetch when menu tab is active
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const categories = categoriesResponse?.items || [];
  const categoryTotalPages = categoriesResponse?.totalPages || 1;

  // Refresh tables after adding a new one
  const handleRefreshTables = () => {
    refetchTables();
  };

  // Removed handleEditTable function - now handled directly in the modal

  const handleDeleteTable = (table: TableData) => {
    setDeleteItem({ type: 'table', id: table.id, name: `Table ${table.tableNumber}` });
    setShowDeleteModal(true);
  };

  const handleEditDeal = (deal: any) => {
    setSelectedDeal(deal);
    setShowEditDealsModal(true);
  };

  const handleDeleteDeal = (deal: any) => {
    setDeleteItem({ type: 'deal', id: deal.id, name: deal.name });
    setShowDeleteModal(true);
  };

  // Discount handlers
  const handleEditDiscount = (discount: Discount) => {
    setSelectedDiscount(discount);
    setShowEditDiscountModal(true);
  };

  const handleDeleteDiscount = (discount: Discount) => {
    setDeleteItem({ type: 'discount', id: discount.id.toString(), name: discount.name });
    setShowDeleteModal(true);
  };

  // Filter menu items based on search
  // Since API handles filtering and pagination, we use the items directly
  const filteredMenuItems = menuItems;
  const paginatedMenuItems = menuItems;

  // Categories are already filtered and paginated by the API
  const filteredCategories = categories;
  const paginatedCategories = categories;


  // Query for deals with real API and pagination support using generic API repository
  // LAZY LOADING: Only fetch when deals tab is active
  const { data: dealsResponse, isLoading: dealsLoading, refetch: refetchDeals } = useQuery({
    queryKey: [`deals-branch-${branchId}`, dealsCurrentPage, dealsSearchTerm, dealsItemsPerPage],
    queryFn: async () => {
      const response = await apiRepository.call<{
        items: Deal[];
        pageNumber: number;
        pageSize: number;
        totalCount: number;
        totalPages: number;
        hasPrevious: boolean;
        hasNext: boolean;
      }>(
        'getDealsByBranch',
        'GET',
        undefined,
        {
          PageNumber: dealsCurrentPage.toString(),
          PageSize: dealsItemsPerPage.toString(),
          SortBy: 'name',
          IsAscending: 'true',
          ...(dealsSearchTerm && { SearchTerm: dealsSearchTerm })
        },
        true,
        { branchId }
      );
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      return response.data;
    },
    enabled: activeMainTab === "deals", // LAZY LOADING: Only fetch when deals tab is active
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const deals = dealsResponse?.items || [];
  const dealsTotalCount = dealsResponse?.totalCount || 0;
  const dealsTotalPages = dealsResponse?.totalPages || 0;
  const dealsHasNext = dealsResponse?.hasNext || false;
  const dealsHasPrevious = dealsResponse?.hasPrevious || false;

  // Fetch discounts with pagination using Generic API repository  
  // LAZY LOADING: Only fetch when discounts tab is active
  const { data: discountsResponse, isLoading: discountsLoading, refetch: refetchDiscounts } = useQuery<PaginationResponse<Discount>>({
    queryKey: [`discounts-branch-${branchId}`, discountsCurrentPage, discountsItemsPerPage, discountsSearchTerm],
    queryFn: async () => {
      const response = await discountsApi.getDiscountsByBranch(branchId, {
        PageNumber: discountsCurrentPage,
        PageSize: discountsItemsPerPage,
        SortBy: 'name',
        IsAscending: true,
        ...(discountsSearchTerm && { SearchTerm: discountsSearchTerm })
      });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      return response.data as PaginationResponse<Discount>;
    },
    enabled: activeMainTab === "discounts", // LAZY LOADING: Only fetch when discounts tab is active
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const discounts = discountsResponse?.items || [];
  const discountsTotalCount = discountsResponse?.totalCount || 0;
  const discountsTotalPages = discountsResponse?.totalPages || 0;
  const discountsHasNext = discountsResponse?.hasNext || false;
  const discountsHasPrevious = discountsResponse?.hasPrevious || false;

  // This local formatPrice function is no longer used - replaced with formatBranchPrice from useBranchCurrency

  return (
    <div className="p-6 space-y-6" data-testid="orders-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setLocation("/entities")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-semibold text-gray-900" data-testid="page-title">
            Restaurants
          </h1>
        </div>
        

      </div>

      {/* Navigation Tabs */}
      <Tabs 
        value={activeMainTab} 
        onValueChange={(value) => {
          setActiveMainTab(value);
          // LAZY LOADING: Data will be fetched automatically when tabs become active
          // No need to manually refetch here - React Query will handle it with enabled conditions
        }} 
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-6" data-testid="main-tabs">
          <TabsTrigger value="orders" className="bg-gray-100 text-gray-700 data-[state=active]:bg-green-500 data-[state=active]:text-white">
            Orders
          </TabsTrigger>
          <TabsTrigger value="menu" className="bg-gray-100 text-gray-700 data-[state=active]:bg-green-500 data-[state=active]:text-white">Menu</TabsTrigger>
          <TabsTrigger value="tables" className="bg-gray-100 text-gray-700 data-[state=active]:bg-green-500 data-[state=active]:text-white">Tables</TabsTrigger>
          <TabsTrigger value="deals" className="bg-gray-100 text-gray-700 data-[state=active]:bg-green-500 data-[state=active]:text-white">Deals</TabsTrigger>
          <TabsTrigger value="services" className="bg-gray-100 text-gray-700 data-[state=active]:bg-green-500 data-[state=active]:text-white">Services</TabsTrigger>
          <TabsTrigger value="discounts" className="bg-gray-100 text-gray-700 data-[state=active]:bg-green-500 data-[state=active]:text-white">Discounts</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-6">
          {/* Orders Filter Tabs */}
          <div className="flex items-center justify-between">
            <Tabs value={orderFilter} onValueChange={setOrderFilter}>
              <TabsList data-testid="order-filter-tabs">
                <TabsTrigger value="All Orders">All Orders</TabsTrigger>
                <TabsTrigger value="Preparing">Preparing</TabsTrigger>
                <TabsTrigger value="Delivered">Delivered</TabsTrigger>
                <TabsTrigger value="Cancelled">Cancelled</TabsTrigger>
              </TabsList>
            </Tabs>
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
                              <div className="font-medium">{getOrderItems(order)} Items</div>
                              <div className="text-sm text-gray-500">{order.orderNumber}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="text-sm font-medium">{formatOrderDate(order.createdAt)}</div>
                              <div className="text-xs text-gray-500">{formatOrderTime(order.createdAt)}</div>
                            </div>
                          </TableCell>
                          <TableCell>{getPaymentBadge(getPaymentStatus(order))}</TableCell>
                          <TableCell>{getStatusBadge(getOrderStatus(order))}</TableCell>
                          <TableCell className="font-medium">{formatBranchPrice(order.totalAmount)}</TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedOrder(order);
                                setShowViewOrderModal(true);
                              }}
                              data-testid={`button-view-order-${order.id}`}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowViewOrderModal(true);
                          }}
                          data-testid={`context-view-order-${order.id}`}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Order
                        </ContextMenuItem>
                        <ContextMenuItem
                          onClick={() => {
                            setSelectedOrder(order);
                            // Find the current status ID from orderStatusTypes
                            const currentStatus = orderStatusTypes.find(status => 
                              status.name.toLowerCase() === order.orderStatus.toLowerCase()
                            );
                            setSelectedStatusId(currentStatus?.id || null);
                            setShowUpdateStatusModal(true);
                          }}
                          data-testid={`context-update-status-${order.id}`}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Update Order Status
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Show result:</span>
              <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">6</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className={currentPage === page ? "bg-green-500 hover:bg-green-600" : ""}
                >
                  {page}
                </Button>
              ))}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="menu" className="space-y-6">
          {/* Menu Filter Tabs */}
          <div className="flex items-center justify-between">
            <Tabs value={activeMenuTab} onValueChange={setActiveMenuTab}>
              <TabsList className="bg-transparent border-b border-gray-200 rounded-none" data-testid="menu-filter-tabs">
                <TabsTrigger 
                  value="Menu" 
                  className="bg-gray-100 text-gray-700 border-b-2 border-transparent data-[state=active]:bg-gray-100 data-[state=active]:border-green-500 data-[state=active]:text-gray-900 rounded-none"
                >
                  Menu
                </TabsTrigger>
                <TabsTrigger 
                  value="Category"
                  className="bg-gray-100 text-gray-700 border-b-2 border-transparent data-[state=active]:bg-gray-100 data-[state=active]:border-green-500 data-[state=active]:text-gray-900 rounded-none"
                >
                  Category
                </TabsTrigger>
                <TabsTrigger 
                  value="SubMenu"
                  className="bg-gray-100 text-gray-700 border-b-2 border-transparent data-[state=active]:bg-gray-100 data-[state=active]:border-green-500 data-[state=active]:text-gray-900 rounded-none"
                >
                  SubMenu
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center space-x-4">
              {activeMenuTab === "Menu" ? (
                <>
                  <Button 
                    className="bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200"
                    onClick={() => setShowApplyDiscountModal(true)}
                    data-testid="button-apply-discount"
                  >
                    Apply Discount
                  </Button>
                  <Button 
                    className="bg-green-500 hover:bg-green-600 text-white"
                    onClick={() => setShowAddMenuModal(true)}
                    data-testid="button-add-item"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                </>
              ) : activeMenuTab === "Category" ? (
                <Button 
                  className="bg-green-500 hover:bg-green-600 text-white"
                  onClick={() => setShowAddCategoryModal(true)}
                  data-testid="button-add-category"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Category
                </Button>
              ) : activeMenuTab === "SubMenu" ? (
                <Button 
                  className="bg-green-500 hover:bg-green-600 text-white"
                  onClick={() => setShowAddSubMenuModal(true)}
                  data-testid="button-add-submenu"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add SubMenu
                </Button>
              ) : null}
            </div>
          </div>



          {/* Content Table */}
          <div className="bg-white rounded-lg border">
            {activeMenuTab === "Menu" ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <div className="flex items-center space-x-2">
                        <span>Item Name</span>
                        <SearchTooltip
                          placeholder="Search menu items..."
                          onSearch={setMenuSearchTerm}
                          onClear={() => setMenuSearchTerm('')}
                          currentValue={menuSearchTerm}
                        />
                      </div>
                    </TableHead>
                    <TableHead>Descriptions <ChevronDown className="w-4 h-4 inline ml-1" /></TableHead>
                    <TableHead>Category <ChevronDown className="w-4 h-4 inline ml-1" /></TableHead>
                    <TableHead>Discount <ChevronDown className="w-4 h-4 inline ml-1" /></TableHead>
                    <TableHead>Image <ChevronDown className="w-4 h-4 inline ml-1" /></TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingMenu ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        Loading menu items...
                      </TableCell>
                    </TableRow>
                  ) : filteredMenuItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        No menu items found
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedMenuItems.map((item) => {
                      // Get category name from categories list
                      const categoryName = categories.find(cat => cat.id === item.menuCategoryId)?.name || 'Unknown Category';
                      
                      return (
                      <TableRow key={item.id.toString()} data-testid={`menu-item-row-${item.id}`}>
                        <TableCell className="font-medium" data-testid={`menu-item-name-${item.id}`}>
                          <div className="flex items-center space-x-2">
                            <span className={item.isOutOfStock ? "text-gray-400 line-through" : ""}>
                              {item.name}
                            </span>
                            {item.isOutOfStock && (
                              <Badge className="bg-red-100 text-red-800 hover:bg-red-200" data-testid={`out-of-stock-badge-${item.id}`}>
                                Out of Stock
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 max-w-xs truncate" data-testid={`menu-item-description-${item.id}`}>
                          {item.description || "No description"}
                        </TableCell>
                        <TableCell data-testid={`menu-item-category-${item.id}`}>
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                            {categoryName}
                          </Badge>
                        </TableCell>
                        <TableCell data-testid={`menu-item-discount-${item.id}`}>
                          <span className="text-sm text-gray-600">
                            {item.disountName || 'No Discount'}
                          </span>
                        </TableCell>
                        <TableCell data-testid={`menu-item-image-${item.id}`}>
                          <span className="text-gray-500">
                            {item.menuItemPicture ? "Image" : "No image"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-gray-600 hover:text-gray-800"
                                data-testid={`button-menu-options-${item.id}`}
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setSelectedMenuItemId(item.id);
                                setShowViewMenuModal(true);
                              }}>
                                <Eye className="w-4 h-4 mr-2" />
                                View Menu Item
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setSelectedMenuItem(item);
                                setShowEditMenuModal(true);
                              }}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Menu Item
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleUpdateStockStatus(item.id, item.isOutOfStock || false)}
                                data-testid={`update-stock-status-${item.id}`}
                              >
                                <Package className="w-4 h-4 mr-2" />
                                {item.isOutOfStock ? 'Mark as In Stock' : 'Mark as Out of Stock'}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => {
                                  setDeleteItem({type: 'menu', id: item.id.toString(), name: item.name});
                                  setShowDeleteModal(true);
                                }}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Menu Item
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );})
                  )}
                </TableBody>
              </Table>
            ) : activeMenuTab === "Category" ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <div className="flex items-center space-x-2">
                        <span>Category Name</span>
                        <SearchTooltip
                          placeholder="Search categories..."
                          onSearch={setCategorySearchTerm}
                          onClear={() => setCategorySearchTerm('')}
                          currentValue={categorySearchTerm}
                        />
                      </div>
                    </TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingCategories ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center py-8">
                        Loading categories...
                      </TableCell>
                    </TableRow>
                  ) : filteredCategories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center py-8">
                        No categories found
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedCategories.map((category: MenuCategory) => (
                      <TableRow key={category.id} data-testid={`category-row-${category.id}`}>
                        <TableCell className="font-medium" data-testid={`category-name-${category.id}`}>
                          {category.name}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-gray-600 hover:text-gray-800"
                                data-testid={`button-category-options-${category.id}`}
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setSelectedCategory(category);
                                setShowEditCategoryModal(true);
                              }}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Category
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => {
                                  setDeleteItem({type: 'category', id: category.id.toString(), name: category.name});
                                  setShowDeleteModal(true);
                                }}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Category
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            ) : activeMenuTab === "SubMenu" ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <div className="flex items-center space-x-2">
                        <span>SubMenu Name</span>
                        <SearchTooltip
                          placeholder="Search submenus..."
                          onSearch={setSubMenuSearchTerm}
                          onClear={() => setSubMenuSearchTerm('')}
                          currentValue={subMenuSearchTerm}
                        />
                      </div>
                    </TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingSubMenus ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8">
                        Loading submenus...
                      </TableCell>
                    </TableRow>
                  ) : subMenus.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8">
                        No submenus found
                      </TableCell>
                    </TableRow>
                  ) : (
                    subMenus.map((subMenu: SubMenu) => (
                      <TableRow key={subMenu.id} data-testid={`submenu-row-${subMenu.id}`}>
                        <TableCell className="font-medium" data-testid={`submenu-name-${subMenu.id}`}>
                          {subMenu.name}
                        </TableCell>
                        <TableCell className="font-medium" data-testid={`submenu-price-${subMenu.id}`}>
                          {formatBranchPrice(subMenu.price)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-gray-600 hover:text-gray-800"
                                data-testid={`button-submenu-options-${subMenu.id}`}
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={async () => {
                                // Fetch the full submenu data for editing using the real API
                                try {
                                  const response = await apiRepository.call<SubMenu>(
                                    'getSubMenuById',
                                    'GET',
                                    undefined,
                                    undefined,
                                    true,
                                    { id: subMenu.id }
                                  );
                                  
                                  if (response.error) {
                                    throw new Error(response.error);
                                  }
                                  
                                  setEditSubMenu(response.data || null);
                                  setShowAddSubMenuModal(true);
                                } catch (error: any) {
                                  console.error('Failed to fetch submenu for edit:', error);
                                  // Fallback to using the existing data
                                  setEditSubMenu(subMenu);
                                  setShowAddSubMenuModal(true);
                                }
                              }}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit SubMenu
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => {
                                  setDeleteItem({type: 'submenu', id: subMenu.id.toString(), name: subMenu.name});
                                  setShowDeleteModal(true);
                                }}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete SubMenu
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            ) : null}
          </div>

          {/* Menu/Category/SubMenu Pagination */}
          <div className="flex items-center justify-between p-4 border-t bg-gray-50">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Show result:</span>
              <Select defaultValue="6">
                <SelectTrigger className="w-16">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">6</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                disabled={activeMenuTab === "Menu" ? !menuHasPrevious || isLoadingMenu : activeMenuTab === "Category" ? categoryCurrentPage === 1 : subMenuCurrentPage === 1}
                onClick={() => {
                  if (activeMenuTab === "Menu") {
                    setMenuCurrentPage(Math.max(1, menuCurrentPage - 1));
                  } else if (activeMenuTab === "Category") {
                    setCategoryCurrentPage(Math.max(1, categoryCurrentPage - 1));
                  } else if (activeMenuTab === "SubMenu") {
                    setSubMenuCurrentPage(Math.max(1, subMenuCurrentPage - 1));
                  }
                }}
              >
                &lt;
              </Button>
              
              <Button 
                variant="default" 
                size="sm" 
                className="bg-green-500 hover:bg-green-600"
              >
                {activeMenuTab === "Menu" ? menuCurrentPage : activeMenuTab === "Category" ? categoryCurrentPage : subMenuCurrentPage}
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                disabled={activeMenuTab === "Menu" ? !menuHasNext || isLoadingMenu : activeMenuTab === "Category" ? categoryCurrentPage === categoryTotalPages : subMenuCurrentPage === subMenuTotalPages}
                onClick={() => {
                  if (activeMenuTab === "Menu") {
                    const maxPage = menuTotalPages || 1;
                    setMenuCurrentPage(Math.min(maxPage, menuCurrentPage + 1));
                  } else if (activeMenuTab === "Category") {
                    const maxPage = categoryTotalPages || 1;
                    setCategoryCurrentPage(Math.min(maxPage, categoryCurrentPage + 1));
                  } else if (activeMenuTab === "SubMenu") {
                    const maxPage = subMenuTotalPages || 1;
                    setSubMenuCurrentPage(Math.min(maxPage, subMenuCurrentPage + 1));
                  }
                }}
              >
                &gt;
              </Button>
            </div>
          </div>

        </TabsContent>

        <TabsContent value="tables" className="space-y-6">
          {/* Tables Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Tables 
              {isLoadingTables && <span className="text-sm text-gray-500 ml-2">(Loading...)</span>}
            </h2>
            <Button 
              className="bg-green-500 hover:bg-green-600 text-white" 
              onClick={() => setShowAddTableModal(true)}
              data-testid="button-add-table"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Table
            </Button>
          </div>

          {/* Tables Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tables.map((table) => (
              <Card key={table.id} className="bg-white border border-gray-200 shadow-sm" data-testid={`table-card-${table.id}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1" data-testid={`table-name-${table.id}`}>
                        {table.tableNumber}
                      </h3>
                      <p className="text-sm text-gray-600" data-testid={`table-branch-${table.id}`}>
                        {table.branch}
                      </p>
                    </div>
                    <Badge 
                      className="bg-green-100 text-green-800 hover:bg-green-200" 
                      data-testid={`table-status-${table.id}`}
                    >
                      {table.status}
                    </Badge>
                  </div>

                  <div className="space-y-2 mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Capacity:</span>
                      <span className="font-medium text-red-500" data-testid={`table-capacity-${table.id}`}>
                        {table.seats} {table.seats === 1 ? 'person' : 'people'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Button 
                      className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 text-sm"
                      onClick={() => {
                        setSelectedTable(table);
                        setShowQRModal(true);
                      }}
                      data-testid={`button-view-qr-${table.id}`}
                    >
                      View QR Code
                    </Button>
                    
                    <div className="flex space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-gray-600 hover:text-gray-800"
                        onClick={() => {
                          setSelectedTable(table);
                          setShowEditTableModal(true);
                        }}
                        data-testid={`button-edit-table-${table.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => handleDeleteTable(table)}
                        data-testid={`button-delete-table-${table.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="deals">
          {/* Deals Tab Content */}
          <div className="space-y-4">
            <div className="flex items-center justify-end">
              <div className="flex items-center space-x-2">
                <Button
                  className="bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                  onClick={() => setShowApplyDiscountModal(true)}
                >
                  Apply Discount
                </Button>
                <Button 
                  className="bg-green-500 hover:bg-green-600 text-white"
                  onClick={() => setShowAddDealsModal(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Deals
                </Button>
              </div>
            </div>

            {/* Mock Deals Table */}
            <div className="bg-white rounded-lg border">

              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <div className="flex items-center space-x-2">
                        <span>Deal Name</span>
                        <SearchTooltip
                          placeholder="Search deals..."
                          onSearch={setDealsSearchTerm}
                          onClear={() => setDealsSearchTerm('')}
                          currentValue={dealsSearchTerm}
                        />
                      </div>
                    </TableHead>
                    <TableHead>Items <ChevronDown className="w-4 h-4 inline ml-1" /></TableHead>
                    <TableHead>Discount <ChevronDown className="w-4 h-4 inline ml-1" /></TableHead>
                    <TableHead>Status <ChevronDown className="w-4 h-4 inline ml-1" /></TableHead>
                    <TableHead>Price <ChevronDown className="w-4 h-4 inline ml-1" /></TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dealsLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        Loading deals...
                      </TableCell>
                    </TableRow>
                  ) : deals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        No deals found
                      </TableCell>
                    </TableRow>
                  ) : (
                    deals.map((deal: Deal) => (
                      <TableRow key={deal.id} data-testid={`deal-row-${deal.id}`}>
                        <TableCell className="font-medium" data-testid={`deal-name-${deal.id}`}>
                          {deal.name}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-600" data-testid={`deal-items-${deal.id}`}>
                            {[
                              // Menu Items with variants
                              ...(deal.menuItems?.flatMap(item => 
                                item.variants?.map(variant => 
                                  `${variant.quantity}x ${variant.variantName || 'Standard'} - ${item.menuItemName || `Item ${item.menuItemId}`}`
                                ) || []
                              ) || []),
                              // Sub Menu Items
                              ...(deal.subMenuItems?.map(subItem => {
                                const subMenuName = subMenuItemsLookup.get(subItem.subMenuItemId) || `SubItem ${subItem.subMenuItemId}`;
                                const quantity = subItem.quantity || 1;
                                return `${quantity}x ${subMenuName}`;
                              }) || [])
                            ].join(', ') || 'No items'}
                          </div>
                        </TableCell>
                        <TableCell data-testid={`deal-discount-${deal.id}`}>
                          <span className="text-sm text-gray-600">
                            {deal.disountName || 'No Discount'}
                          </span>
                        </TableCell>
                        <TableCell data-testid={`deal-status-${deal.id}`}>
                          <Badge className={deal.isActive ? "bg-green-100 text-green-800 hover:bg-green-200" : "bg-gray-100 text-gray-800 hover:bg-gray-200"}>
                            {deal.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium" data-testid={`deal-price-${deal.id}`}>
                          {formatBranchPrice(deal.price)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                data-testid={`button-deal-options-${deal.id}`}
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setSelectedDealId(deal.id);
                                setShowViewDealsModal(true);
                              }}>
                                <Eye className="w-4 h-4 mr-2" />
                                View Deal
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditDeal(deal)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Deal
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteDeal(deal)}>
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Deal
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              
              {/* Deals Pagination */}
              <div className="flex items-center justify-between p-4 border-t bg-gray-50">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Show result:</span>
                  <Select 
                    value={dealsItemsPerPage.toString()}
                    onValueChange={(value) => {
                      setDealsItemsPerPage(Number(value));
                      setDealsCurrentPage(1); // Reset to first page
                    }}
                  >
                    <SelectTrigger className="w-16">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEFAULT_PAGINATION_CONFIG.pageSizeOptions.map((pageSize) => (
                        <SelectItem key={pageSize} value={pageSize.toString()}>
                          {pageSize}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={dealsCurrentPage === 1}
                    onClick={() => setDealsCurrentPage(Math.max(1, dealsCurrentPage - 1))}
                  >
                    &lt;
                  </Button>
                  <span className="text-sm text-gray-600">
                    Page {dealsCurrentPage} of {dealsTotalPages}
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={dealsCurrentPage === dealsTotalPages}
                    onClick={() => {
                      const maxPage = dealsTotalPages || 1;
                      setDealsCurrentPage(Math.min(maxPage, dealsCurrentPage + 1));
                    }}
                  >
                    &gt;
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="services">
          {/* Services Tab Content */}
          <div className="space-y-4">
            <div className="flex items-center justify-end">
              <Button 
                className="bg-green-500 hover:bg-green-600 text-white"
                onClick={() => setShowAddServicesModal(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Services
              </Button>
            </div>

            {/* Branch Services Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {isLoadingBranchServices ? (
                <div className="col-span-3 text-center py-8 text-gray-500">
                  Loading services...
                </div>
              ) : branchServices.length === 0 ? (
                <div className="col-span-3 text-center py-8 text-gray-500">
                  No services added yet. Click "Add Services" to get started.
                </div>
              ) : (
                branchServices.map((service) => (
                  <Card key={service.serviceId} className="bg-white border border-gray-100 hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-medium text-gray-900" data-testid={`service-name-${service.serviceId}`}>
                          {service.serviceName}
                        </h4>
                        <Badge 
                          className={service.price === 0 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-blue-100 text-blue-800'
                          }
                        >
                          {service.price === 0 ? 'Free' : formatBranchPrice(service.price)}
                        </Badge>
                      </div>
                      {service.picture && (
                        <div className="text-sm text-gray-500">
                          📷 Image Available
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="discounts">
          {/* Discounts Tab Content */}
          <div className="space-y-4">
            <div className="flex items-center justify-end">
              <Button 
                className="bg-green-500 hover:bg-green-600 text-white"
                onClick={() => setShowAddDiscountModal(true)}
                data-testid="button-add-discount"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Discount
              </Button>
            </div>

            {/* Discounts Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold text-gray-700">Name</TableHead>
                    <TableHead className="font-semibold text-gray-700">Type</TableHead>
                    <TableHead className="font-semibold text-gray-700">Value</TableHead>
                    <TableHead className="font-semibold text-gray-700">Max Amount</TableHead>
                    <TableHead className="font-semibold text-gray-700">Valid Until</TableHead>
                    <TableHead className="font-semibold text-gray-700">Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {discountsLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        Loading discounts...
                      </TableCell>
                    </TableRow>
                  ) : discounts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        No discounts found
                      </TableCell>
                    </TableRow>
                  ) : (
                    discounts.map((discount: Discount) => (
                      <TableRow key={discount.id} data-testid={`discount-row-${discount.id}`}>
                        <TableCell className="font-medium" data-testid={`discount-name-${discount.id}`}>
                          {discount.name}
                        </TableCell>
                        <TableCell data-testid={`discount-type-${discount.id}`}>
                          <Badge className={discount.discountType === 2 ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"}>
                            {discount.discountType === 2 ? 'Percentage' : 'Flat'}
                          </Badge>
                        </TableCell>
                        <TableCell data-testid={`discount-value-${discount.id}`}>
                          {discount.discountType === 2 ? `${discount.discountValue}%` : `${formatBranchPrice(discount.discountValue)}`}
                        </TableCell>
                        <TableCell data-testid={`discount-max-amount-${discount.id}`}>
                          {discount.maxDiscountAmount ? formatBranchPrice(discount.maxDiscountAmount) : 'No limit'}
                        </TableCell>
                        <TableCell data-testid={`discount-end-date-${discount.id}`}>
                          {discount.endDate ? new Date(discount.endDate).toLocaleDateString() : 'No expiry'}
                        </TableCell>
                        <TableCell data-testid={`discount-status-${discount.id}`}>
                          <Badge className={discount.isActive ? "bg-green-100 text-green-800 hover:bg-green-200" : "bg-gray-100 text-gray-800 hover:bg-gray-200"}>
                            {discount.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                data-testid={`button-discount-options-${discount.id}`}
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditDiscount(discount)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Discount
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteDiscount(discount)}>
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Discount
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              
              {/* Discounts Pagination */}
              <div className="flex items-center justify-between p-4 border-t bg-gray-50">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Show result:</span>
                  <Select 
                    value={discountsItemsPerPage.toString()}
                    onValueChange={(value) => {
                      setDiscountsItemsPerPage(Number(value));
                      setDiscountsCurrentPage(1); // Reset to first page
                    }}
                  >
                    <SelectTrigger className="w-16">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEFAULT_PAGINATION_CONFIG.pageSizeOptions.map((pageSize) => (
                        <SelectItem key={pageSize} value={pageSize.toString()}>
                          {pageSize}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-gray-600">
                    Showing {discountsCurrentPage === 1 ? 1 : (discountsCurrentPage - 1) * discountsItemsPerPage + 1} to{' '}
                    {Math.min(discountsCurrentPage * discountsItemsPerPage, discountsTotalCount)} of {discountsTotalCount} results
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDiscountsCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={!discountsHasPrevious}
                    data-testid="button-discounts-prev-page"
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600">
                    Page {discountsCurrentPage} of {discountsTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDiscountsCurrentPage(prev => Math.min(prev + 1, discountsTotalPages))}
                    disabled={!discountsHasNext}
                    data-testid="button-discounts-next-page"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* QR Code Modal */}
      {selectedTable && (
        <QRCodeModal
          open={showQRModal}
          onOpenChange={setShowQRModal}
          tableNumber={selectedTable.tableNumber}
          branchName={selectedTable.branchName}
          qrCodeBase64={selectedTable.qrCode}
        />
      )}

      {/* Add Table Modal */}
      <AddTableModal
        open={showAddTableModal}
        onOpenChange={setShowAddTableModal}
        branchId={branchId}
      />

      {/* Edit Table Modal */}
      <EditTableModal
        open={showEditTableModal}
        onOpenChange={setShowEditTableModal}
        table={selectedTable}
      />

      {/* Add Menu Modal */}
      <AddMenuModal
        isOpen={showAddMenuModal}
        onClose={() => setShowAddMenuModal(false)}
        restaurantId="1"
        branchId={branchId}
      />


      {/* Add Category Modal */}
      <AddCategoryModal
        isOpen={showAddCategoryModal}
        onClose={() => setShowAddCategoryModal(false)}
        branchId={branchId}
      />

      {/* Edit Category Modal */}
      <AddCategoryModal
        isOpen={showEditCategoryModal}
        onClose={() => setShowEditCategoryModal(false)}
        branchId={branchId}
        editCategory={selectedCategory || undefined}
      />

      {/* Add SubMenu Modal */}
      <AddSubMenuModal
        isOpen={showAddSubMenuModal}
        onClose={() => {
          setShowAddSubMenuModal(false);
          setEditSubMenu(null);
        }}
        branchId={branchId}
        editSubMenu={editSubMenu || undefined}
      />

      {/* Apply Discount Modal */}
      <ApplyDiscountModal
        isOpen={showApplyDiscountModal}
        onClose={() => setShowApplyDiscountModal(false)}
        mode={activeMainTab === "menu" ? "menu" : "deals"}
        branchId={branchId}
      />

      {/* Add Deals Modal */}
      <AddDealsModal
        open={showAddDealsModal}
        onOpenChange={setShowAddDealsModal}
        restaurantId="1"
        branchId={branchId}
      />

      {/* Edit Deals Modal */}
      {selectedDeal && (
        <AddDealsModal
          open={showEditDealsModal}
          onOpenChange={(open) => {
            setShowEditDealsModal(open);
            if (!open) setSelectedDeal(null);
          }}
          restaurantId="1"
          branchId={branchId}
          editDealId={selectedDeal.id}
        />
      )}

      {/* Add Services Modal */}
      <AddServicesModal
        open={showAddServicesModal}
        onOpenChange={setShowAddServicesModal}
        branchId={branchId}
        onServicesUpdated={() => {
          refetchBranchServices();
        }}
      />

      {/* Pricing Plans Modal */}
      <PricingPlansModal
        open={showPricingModal}
        onOpenChange={setShowPricingModal}
        onPlanSelect={() => setShowPricingModal(false)}
      />

      {/* Add Discount Modal */}
      <AddDiscountModal
        open={showAddDiscountModal}
        onOpenChange={setShowAddDiscountModal}
        branchId={branchId}
      />

      {/* Edit Discount Modal */}
      {selectedDiscount && (
        <AddDiscountModal
          open={showEditDiscountModal}
          onOpenChange={(open) => {
            setShowEditDiscountModal(open);
            if (!open) setSelectedDiscount(null);
          }}
          branchId={branchId}
          editDiscountId={selectedDiscount.id}
        />
      )}

      {/* Edit Menu Modal - uses same component as Add Menu */}
      {selectedMenuItem && (
        <AddMenuModal
          isOpen={showEditMenuModal}
          onClose={() => {
            setShowEditMenuModal(false);
            setSelectedMenuItem(null);
          }}
          restaurantId="1"
          branchId={branchId}
          editMenuItem={selectedMenuItem}
        />
      )}

      {/* View Menu Modal */}
      <ViewMenuModal
        isOpen={showViewMenuModal}
        onClose={() => {
          setShowViewMenuModal(false);
          setSelectedMenuItemId(null);
        }}
        menuItemId={selectedMenuItemId || undefined}
        branchId={branchId}
      />

      {/* View Deals Modal */}
      <ViewDealsModal
        isOpen={showViewDealsModal}
        onClose={() => {
          setShowViewDealsModal(false);
          setSelectedDealId(null);
        }}
        dealId={selectedDealId || undefined}
        branchId={branchId}
      />


      {/* Delete Confirmation Modal */}
      {deleteItem && (
        <SimpleDeleteModal
          open={showDeleteModal}
          onOpenChange={(open) => {
            setShowDeleteModal(open);
            if (!open) setDeleteItem(null);
          }}
          title={
            deleteItem.type === 'menu' ? 'Delete Menu Item' :
            deleteItem.type === 'category' ? 'Delete Category' :
            deleteItem.type === 'submenu' ? 'Delete SubMenu' :
            deleteItem.type === 'deal' ? 'Delete Deal' :
            deleteItem.type === 'discount' ? 'Delete Discount' :
            'Delete Table'
          }
          description={`Are you sure you want to delete this ${deleteItem.type}?`}
          itemName={deleteItem.name}
          onConfirm={async () => {
            if (deleteItem.type === 'table') {
              // Delete table using real API endpoint
              try {
                const response = await locationApi.deleteLocation(deleteItem.id);
                // API returns 204 status on successful deletion
                if (response.error) {
                  throw new Error(response.error);
                }
                // Refresh the tables list after successful deletion
                refetchTables();
              } catch (error: any) {
                console.error('Failed to delete table:', error);
                throw error; // Re-throw so SimpleDeleteModal can handle the error
              }
            } else if (deleteItem.type === 'category') {
              // Delete category using real API endpoint
              try {
                const response = await apiRepository.call(
                  'deleteMenuCategory',
                  'DELETE',
                  undefined,
                  undefined,
                  true,
                  { id: deleteItem.id }
                );
                
                if (response.error) {
                  throw new Error(response.error);
                }
                
                // Refresh the categories list after successful deletion
                queryClient.invalidateQueries({ queryKey: [`menu-categories-branch-${branchId}`] });
              } catch (error: any) {
                console.error('Failed to delete category:', error);
                throw error; // Re-throw so SimpleDeleteModal can handle the error
              }
            } else if (deleteItem.type === 'submenu') {
              // Delete submenu using real API endpoint
              try {
                const response = await apiRepository.call(
                  'deleteSubMenu',
                  'DELETE',
                  undefined,
                  undefined,
                  true,
                  { id: deleteItem.id }
                );
                
                if (response.error) {
                  throw new Error(response.error);
                }
                
                // Refresh the submenus list after successful deletion
                queryClient.invalidateQueries({ queryKey: [`submenus-branch-${branchId}`] });
              } catch (error: any) {
                console.error('Failed to delete submenu:', error);
                throw error; // Re-throw so SimpleDeleteModal can handle the error
              }
            } else if (deleteItem.type === 'deal') {
              // Delete deal using real API endpoint
              try {
                const response = await apiRepository.call(
                  'deleteDeal',
                  'DELETE',
                  undefined,
                  undefined,
                  true,
                  { id: deleteItem.id }
                );
                
                if (response.error) {
                  throw new Error(response.error);
                }
                
                // Refresh the submenus list after successful deletion
                queryClient.invalidateQueries({ queryKey: [`submenus-branch-${branchId}`] });
              } catch (error: any) {
                console.error('Failed to delete submenu:', error);
                throw error; // Re-throw so SimpleDeleteModal can handle the error
              }
            } else if (deleteItem.type === 'menu') {
              // Delete menu item using real API endpoint
              try {
                const response = await apiRepository.call(
                  'deleteMenuItem',
                  'DELETE',
                  undefined,
                  undefined,
                  true,
                  { id: deleteItem.id }
                );
                
                if (response.error) {
                  throw new Error(response.error);
                }
                
                // Refresh the menu items list after successful deletion
                queryClient.invalidateQueries({ queryKey: [`menu-items-branch-${branchId}`] });
              } catch (error: any) {
                console.error('Failed to delete menu item:', error);
                throw error; // Re-throw so SimpleDeleteModal can handle the error
              }
            } else if (deleteItem.type === 'deal') {
              // Delete deal using Generic API repository
              try {
                await dealsApi.deleteDeal(Number(deleteItem.id));
                
                // Refresh the deals list after successful deletion
                queryClient.invalidateQueries({ queryKey: ['deals'] });
                queryClient.invalidateQueries({ queryKey: [`deals-branch-${branchId}`] });
              } catch (error: any) {
                console.error('Failed to delete deal:', error);
                throw error; // Re-throw so SimpleDeleteModal can handle the error
              }
            } else if (deleteItem.type === 'discount') {
              // Delete discount using Generic API repository
              try {
                await discountsApi.deleteDiscount(Number(deleteItem.id));
                
                // Refresh the discounts list after successful deletion
                queryClient.invalidateQueries({ queryKey: ['discounts'] });
                queryClient.invalidateQueries({ queryKey: [`discounts-branch-${branchId}`] });
              } catch (error: any) {
                console.error('Failed to delete discount:', error);
                throw error; // Re-throw so SimpleDeleteModal can handle the error
              }
            } else {
              // Handle other types if needed
              console.log(`Deleting ${deleteItem.type}: ${deleteItem.name}`);
            }
            setShowDeleteModal(false);
            setDeleteItem(null);
          }}
        />
      )}

      {/* View Order Modal */}
      {selectedOrder && (
        <Dialog open={showViewOrderModal} onOpenChange={setShowViewOrderModal}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="view-order-modal">
            <DialogHeader className="pb-4">
              <DialogTitle className="text-xl font-semibold text-gray-900">Order Details</DialogTitle>
              <DialogDescription className="text-gray-600 mt-1">
                Complete information for order #{selectedOrder.orderNumber}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Order Details Grid - 2x2 layout matching screenshot */}
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
                  <div data-testid="view-order-status">{getStatusBadge(getOrderStatus(selectedOrder))}</div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-500">Payment</label>
                  <div data-testid="view-order-payment">{getPaymentBadge(getPaymentStatus(selectedOrder))}</div>
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

                {selectedOrder.deliveryCharges && selectedOrder.deliveryCharges > 0 && (
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-500">Delivery Charges</label>
                    <p className="text-base font-semibold text-gray-900" data-testid="view-order-delivery-charges">
                      {formatBranchPrice(selectedOrder.deliveryCharges)}
                    </p>
                  </div>
                )}
              </div>

              {/* Order Items Section */}
              {selectedOrder.orderItems && selectedOrder.orderItems.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-base font-medium text-gray-500">Order Items</h3>
                  <div className="space-y-2">
                    {selectedOrder.orderItems.map((item, index) => (
                      <div 
                        key={index} 
                        className="flex justify-between items-start p-3 bg-gray-50 rounded-lg border"
                        data-testid={`view-order-item-${index}`}
                      >
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 text-base">{item.itemName || 'Menu Item'}</h4>
                          {item.variantName && (
                            <p className="text-sm text-gray-600 mt-1">Variant: {item.variantName}</p>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <p className="font-semibold text-gray-900">Qty: {item.quantity}</p>
                          <p className="text-base font-bold text-gray-900 mt-1">
                            {formatBranchPrice(item.totalPrice)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Deal Packages Section */}
              {selectedOrder.orderPackages && selectedOrder.orderPackages.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-base font-medium text-gray-500">Deal Packages</h3>
                  <div className="space-y-2">
                    {selectedOrder.orderPackages.map((pkg, index) => (
                      <div 
                        key={index} 
                        className="flex justify-between items-start p-3 bg-blue-50 rounded-lg border border-blue-200"
                        data-testid={`view-order-package-${index}`}
                      >
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 text-base">{pkg.packageName || 'Deal Package'}</h4>
                          {pkg.expiryDate && (
                            <p className="text-sm text-gray-600 mt-1">
                              Expires: {new Date(pkg.expiryDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <p className="font-semibold text-gray-900">Qty: {pkg.quantity}</p>
                          <p className="text-base font-bold text-gray-900 mt-1">
                            {formatBranchPrice(pkg.totalPrice)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Charges (only if they exist) */}
              {(selectedOrder.serviceCharges > 0 || selectedOrder.taxAmount > 0 || 
                selectedOrder.tipAmount > 0 || selectedOrder.discountAmount > 0) && (
                <div className="space-y-3">
                  <h3 className="text-base font-medium text-gray-500">Additional Charges</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedOrder.serviceCharges > 0 && (
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-500">Service Charges</label>
                        <p className="text-base text-gray-900" data-testid="view-order-service-charges">
                          {formatBranchPrice(selectedOrder.serviceCharges)}
                        </p>
                      </div>
                    )}
                    {selectedOrder.taxAmount > 0 && (
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-500">Tax Amount</label>
                        <p className="text-base text-gray-900" data-testid="view-order-tax">
                          {formatBranchPrice(selectedOrder.taxAmount)}
                        </p>
                      </div>
                    )}
                    {selectedOrder.tipAmount > 0 && (
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-500">Tip Amount</label>
                        <p className="text-base text-gray-900" data-testid="view-order-tip">
                          {formatBranchPrice(selectedOrder.tipAmount)}
                        </p>
                      </div>
                    )}
                    {selectedOrder.discountAmount > 0 && (
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-500">Discount</label>
                        <p className="text-base font-bold text-green-600" data-testid="view-order-discount">
                          -{formatBranchPrice(selectedOrder.discountAmount)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Final Total */}
              <div className="border-t pt-4 mt-6">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">Total Amount</span>
                  <span className="text-xl font-bold text-gray-900" data-testid="view-order-total">
                    {formatBranchPrice(selectedOrder.totalAmount)}
                  </span>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Update Status Modal */}
      {selectedOrder && (
        <Dialog open={showUpdateStatusModal} onOpenChange={setShowUpdateStatusModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Update Order Status</DialogTitle>
              <DialogDescription>
                Change the status for order #{selectedOrder.orderNumber}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Current Status</label>
                <div className="mt-1">
                  {getStatusBadge(getOrderStatus(selectedOrder))}
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
                  onClick={() => setShowUpdateStatusModal(false)}
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
                      await ordersApi.updateOrderStatus(selectedOrder.id, selectedStatusId, 'Status updated via management system');
                      
                      // Refresh the orders list to show the updated status
                      refetchOrders();
                      
                      // Close the modal and reset state
                      setShowUpdateStatusModal(false);
                      setSelectedStatusId(null);
                      setSelectedOrder(null);
                      
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
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}