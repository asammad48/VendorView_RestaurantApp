import { useState, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit,
  Eye,
  Check,
  X,
  Package,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocation, Link } from "wouter";
import { inventoryApi, branchApi } from "@/lib/apiRepository";
import AddInventoryCategoryModal from "@/components/add-inventory-category-modal";
import AddInventorySupplierModal from "@/components/add-inventory-supplier-modal";
import AddInventoryItemModal from "@/components/add-inventory-item-modal";
import SimpleDeleteModal from "@/components/simple-delete-modal";
import StockUpdateModal from "@/components/stock-update-modal";
import PurchaseOrderModal from "@/components/purchase-order-modal";
import PurchaseOrderViewModal from "@/components/purchase-order-view-modal";
import RecipeModal from "@/components/recipe-modal";
import StockWastageModal from "@/components/stock-wastage-modal";
import UtilityExpenseModal from "@/components/utility-expense-modal";
import ViewUtilityExpenseModal from "@/components/view-utility-expense-modal";
import { Badge } from "@/components/ui/badge";
import { Recipe, RecipeDetail } from "@/types/schema";
import { Input } from "@/components/ui/input";
import { format, subMonths, addDays } from "date-fns";
import {
  DEFAULT_PAGINATION_CONFIG,
  PaginationResponse,
} from "@/types/pagination";
import { ColumnSearchPopover } from "@/components/ColumnSearchPopover";

interface InventoryCategory {
  id: number;
  name: string;
  branchId: number;
}

interface InventorySupplier {
  id: number;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  branchId: number;
}

interface InventoryItem {
  id: number;
  branchId: number;
  name: string;
  categoryName: string;
  unit: string;
  reorderLevel: number;
  defaultSupplierName: string | null;
}

interface StockItem {
  inventoryItemId: number;
  itemName: string;
  currentStock: number;
  unit: string;
}

interface LowStockItem {
  inventoryItemId: number;
  itemName: string;
  currentStock: number;
  reorderLevel: number;
  unit: string;
}

interface PurchaseOrder {
  id: number;
  supplierName: string;
  branchName: string;
  orderDate: string;
  status: number;
  totalAmount: number;
}

interface WastageItem {
  id: number;
  branchName: string;
  itemName: string;
  quantity: number;
  reason: string;
  createdBy: number;
  createdAt: string;
}

interface UtilityExpense {
  id: number;
  branchId: number;
  utilityType: string;
  usageUnit: number;
  unitCost: number;
  totalCost: number;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  billNumber: string;
  isActive: boolean;
}

const purchaseOrderStatusMap: {
  [key: number]: {
    label: string;
    variant: "default" | "secondary" | "outline" | "destructive";
  };
} = {
  0: { label: "Draft", variant: "secondary" },
  1: { label: "Ordered", variant: "default" },
  2: { label: "Received", variant: "outline" },
  3: { label: "Cancelled", variant: "destructive" },
};

export default function InventoryManagement() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("categories");
  const [stockSubTab, setStockSubTab] = useState("manage-stock");

  // Date filter states (default: 3 months before to 1 day after current date)
  const [wastageFromDate, setWastageFromDate] = useState(() =>
    format(subMonths(new Date(), 3), "yyyy-MM-dd"),
  );
  const [wastageToDate, setWastageToDate] = useState(() =>
    format(addDays(new Date(), 1), "yyyy-MM-dd"),
  );

  // Modal states
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [showEditSupplierModal, setShowEditSupplierModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStockUpdateModal, setShowStockUpdateModal] = useState(false);
  const [showPurchaseOrderModal, setShowPurchaseOrderModal] = useState(false);
  const [showPurchaseOrderViewModal, setShowPurchaseOrderViewModal] =
    useState(false);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [showEditRecipeModal, setShowEditRecipeModal] = useState(false);
  const [showStockWastageModal, setShowStockWastageModal] = useState(false);
  const [showUtilityExpenseModal, setShowUtilityExpenseModal] = useState(false);
  const [showViewUtilityExpenseModal, setShowViewUtilityExpenseModal] =
    useState(false);

  // Selection states
  const [selectedSupplier, setSelectedSupplier] =
    useState<InventorySupplier | null>(null);
  const [selectedItem, setSelectedItem] = useState<
    (InventoryItem & { categoryId?: number; defaultSupplierId?: number }) | null
  >(null);
  const [deleteItem, setDeleteItem] = useState<{
    type: string;
    id: string;
    name: string;
  } | null>(null);
  const [selectedStockItem, setSelectedStockItem] = useState<StockItem | null>(
    null,
  );
  const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState<
    number | null
  >(null);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeDetail | null>(
    null,
  );
  const [selectedUtilityExpense, setSelectedUtilityExpense] =
    useState<UtilityExpense | null>(null);

  // Pagination states for all tabs
  const [categoriesPage, setCategoriesPage] = useState(1);
  const [categoriesPerPage, setCategoriesPerPage] = useState(
    DEFAULT_PAGINATION_CONFIG.defaultPageSize,
  );

  const [suppliersPage, setSuppliersPage] = useState(1);
  const [suppliersPerPage, setSuppliersPerPage] = useState(
    DEFAULT_PAGINATION_CONFIG.defaultPageSize,
  );

  const [itemsPage, setItemsPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(
    DEFAULT_PAGINATION_CONFIG.defaultPageSize,
  );

  const [stockPage, setStockPage] = useState(1);
  const [stockPerPage, setStockPerPage] = useState(
    DEFAULT_PAGINATION_CONFIG.defaultPageSize,
  );

  const [lowStockPage, setLowStockPage] = useState(1);
  const [lowStockPerPage, setLowStockPerPage] = useState(
    DEFAULT_PAGINATION_CONFIG.defaultPageSize,
  );

  const [purchaseOrdersPage, setPurchaseOrdersPage] = useState(1);
  const [purchaseOrdersPerPage, setPurchaseOrdersPerPage] = useState(
    DEFAULT_PAGINATION_CONFIG.defaultPageSize,
  );

  const [wastageItemsPage, setWastageItemsPage] = useState(1);
  const [wastageItemsPerPage, setWastageItemsPerPage] = useState(
    DEFAULT_PAGINATION_CONFIG.defaultPageSize,
  );

  const [expensesPage, setExpensesPage] = useState(1);
  const [expensesPerPage, setExpensesPerPage] = useState(
    DEFAULT_PAGINATION_CONFIG.defaultPageSize,
  );

  const [recipesPage, setRecipesPage] = useState(1);
  const [recipesPerPage, setRecipesPerPage] = useState(
    DEFAULT_PAGINATION_CONFIG.defaultPageSize,
  );

  // Search states for all tables
  const [categoriesSearch, setCategoriesSearch] = useState("");
  const [suppliersSearch, setSuppliersSearch] = useState("");
  const [itemsSearch, setItemsSearch] = useState("");
  const [stockSearch, setStockSearch] = useState("");
  const [lowStockSearch, setLowStockSearch] = useState("");
  const [purchaseOrdersSearch, setPurchaseOrdersSearch] = useState("");
  const [wastageSearch, setWastageSearch] = useState("");
  const [expensesSearch, setExpensesSearch] = useState("");
  const [recipesSearch, setRecipesSearch] = useState("");

  const branchId = parseInt(
    new URLSearchParams(window.location.search).get("branchId") || "0",
  );

  // Fetch branch information
  const { data: branchData } = useQuery({
    queryKey: ["branch", branchId],
    queryFn: async () => {
      const result = await branchApi.getBranchById(branchId);
      return result as any;
    },
    enabled: !!branchId,
  });

  // Fetch inventory categories (lazy load)
  const {
    data: categoriesData,
    isLoading: isLoadingCategories,
    refetch: refetchCategories,
  } = useQuery({
    queryKey: [
      "inventory-categories",
      branchId,
      categoriesPage,
      categoriesPerPage,
      categoriesSearch,
    ],
    queryFn: async () => {
      const result = await inventoryApi.getInventoryCategories(branchId, {
        PageNumber: categoriesPage,
        PageSize: categoriesPerPage,
        SortBy: "name",
        IsAscending: true,
        SearchTerm: categoriesSearch,
      });
      return result;
    },
    enabled: !!branchId && activeTab === "categories",
  });
  const categories = Array.isArray(categoriesData)
    ? categoriesData
    : (categoriesData as any)?.items || [];

  // Fetch simple categories for modals (non-paginated)
  const { data: simpleCategoriesData } = useQuery({
    queryKey: ["inventory-categories-simple", branchId],
    queryFn: async () => {
      const result = await inventoryApi.getInventoryCategoriesSimple(branchId);
      return result;
    },
    enabled: !!branchId && (showAddItemModal || showEditItemModal),
  });
  const simpleCategories = Array.isArray(simpleCategoriesData) ? simpleCategoriesData : [];

  // Fetch inventory suppliers (lazy load)
  const {
    data: suppliersData,
    isLoading: isLoadingSuppliers,
    refetch: refetchSuppliers,
  } = useQuery({
    queryKey: [
      "inventory-suppliers",
      branchId,
      suppliersPage,
      suppliersPerPage,
      suppliersSearch,
    ],
    queryFn: async () => {
      const result = await inventoryApi.getInventorySuppliers(branchId, {
        PageNumber: suppliersPage,
        PageSize: suppliersPerPage,
        SortBy: "name",
        IsAscending: true,
        SearchTerm: suppliersSearch,
      });
      return result as InventorySupplier[];
    },
    enabled: !!branchId && activeTab === "suppliers",
  });
  const suppliers = Array.isArray(suppliersData) ? suppliersData : [];

  // Fetch inventory items (lazy load)
  const {
    data: itemsData,
    isLoading: isLoadingItems,
    refetch: refetchItems,
  } = useQuery({
    queryKey: [
      "inventory-items",
      branchId,
      itemsPage,
      itemsPerPage,
      itemsSearch,
    ],
    queryFn: async () => {
      const result = await inventoryApi.getInventoryItemsByBranch(branchId, {
        PageNumber: itemsPage,
        PageSize: itemsPerPage,
        SortBy: "name",
        IsAscending: true,
        SearchTerm: itemsSearch,
      });
      return result;
    },
    enabled: !!branchId && activeTab === "items",
  });
  const items = Array.isArray(itemsData)
    ? itemsData
    : (itemsData as any)?.items || [];

  // Fetch stock (lazy load)
  const {
    data: stockData,
    isLoading: isLoadingStock,
    refetch: refetchStock,
  } = useQuery({
    queryKey: [
      "inventory-stock",
      branchId,
      stockPage,
      stockPerPage,
      stockSearch,
    ],
    queryFn: async () => {
      return await inventoryApi.getInventoryStockByBranch(branchId, {
        PageNumber: stockPage,
        PageSize: stockPerPage,
        SortBy: "itemName",
        IsAscending: true,
        SearchTerm: stockSearch,
      });
    },
    enabled:
      !!branchId && activeTab === "stock" && stockSubTab === "manage-stock",
  });
  const stock = Array.isArray(stockData)
    ? stockData
    : (stockData as any)?.items || [];

  // Fetch low stock (lazy load)
  const {
    data: lowStockData,
    isLoading: isLoadingLowStock,
    refetch: refetchLowStock,
  } = useQuery({
    queryKey: [
      "inventory-low-stock",
      branchId,
      lowStockPage,
      lowStockPerPage,
      lowStockSearch,
    ],
    queryFn: async () => {
      return await inventoryApi.getInventoryLowStockByBranch(branchId, {
        PageNumber: lowStockPage,
        PageSize: lowStockPerPage,
        SortBy: "itemName",
        IsAscending: true,
        SearchTerm: lowStockSearch,
      });
    },
    enabled: !!branchId && activeTab === "stock" && stockSubTab === "low-stock",
  });
  const lowStock = Array.isArray(lowStockData)
    ? lowStockData
    : (lowStockData as any)?.items || [];

  // Fetch purchase orders (lazy load)
  const {
    data: purchaseOrdersData,
    isLoading: isLoadingPurchaseOrders,
    refetch: refetchPurchaseOrders,
  } = useQuery({
    queryKey: [
      "purchase-orders",
      branchId,
      purchaseOrdersPage,
      purchaseOrdersPerPage,
      purchaseOrdersSearch,
    ],
    queryFn: async () => {
      return await inventoryApi.getPurchaseOrdersByBranch(branchId, {
        PageNumber: purchaseOrdersPage,
        PageSize: purchaseOrdersPerPage,
        SortBy: "supplierName",
        IsAscending: true,
        SearchTerm: purchaseOrdersSearch,
      });
    },
    enabled:
      !!branchId && activeTab === "stock" && stockSubTab === "purchase-orders",
  });
  const purchaseOrders = Array.isArray(purchaseOrdersData)
    ? purchaseOrdersData
    : (purchaseOrdersData as any)?.items || [];

  // Fetch wastage (lazy load)
  const {
    data: wastageItemsData,
    isLoading: isLoadingWastage,
    refetch: refetchWastage,
  } = useQuery({
    queryKey: [
      "inventory-wastage",
      branchId,
      wastageFromDate,
      wastageToDate,
      wastageItemsPage,
      wastageItemsPerPage,
      wastageSearch,
    ],
    queryFn: async () => {
      return await inventoryApi.getInventoryWastageByBranch(
        branchId,
        wastageFromDate,
        wastageToDate,
        {
          PageNumber: wastageItemsPage,
          PageSize: wastageItemsPerPage,
          SortBy: "itemName",
          IsAscending: true,
          SearchTerm: wastageSearch,
        },
      );
    },
    enabled:
      !!branchId && activeTab === "stock" && stockSubTab === "stock-wastage",
  });
  const wastageItems = Array.isArray(wastageItemsData)
    ? wastageItemsData
    : (wastageItemsData as any)?.items || [];

  // Fetch utility expenses (lazy load)
  const {
    data: utilityExpensesData,
    isLoading: isLoadingUtilityExpenses,
    refetch: refetchUtilityExpenses,
  } = useQuery({
    queryKey: [
      "utility-expenses",
      branchId,
      expensesPage,
      expensesPerPage,
      expensesSearch,
    ],
    queryFn: async () => {
      return await inventoryApi.getUtilityExpensesByBranch(branchId, {
        PageNumber: expensesPage,
        PageSize: expensesPerPage,
        SortBy: "utilityType",
        IsAscending: true,
        SearchTerm: expensesSearch,
      });
    },
    enabled: !!branchId && activeTab === "expense",
  });
  const utilityExpenses = Array.isArray(utilityExpensesData)
    ? utilityExpensesData
    : (utilityExpensesData as any)?.items || [];

  // Fetch recipes (lazy load)
  const {
    data: recipesData,
    isLoading: isLoadingRecipes,
    refetch: refetchRecipes,
  } = useQuery({
    queryKey: ["recipes", branchId, recipesPage, recipesPerPage, recipesSearch],
    queryFn: async () => {
      return await inventoryApi.getRecipesByBranch(branchId, {
        PageNumber: recipesPage,
        PageSize: recipesPerPage,
        SortBy: "menuItemName",
        IsAscending: true,
        SearchTerm: recipesSearch,
      });
    },
    enabled: !!branchId && activeTab === "recipes",
  });
  const recipes = Array.isArray(recipesData)
    ? recipesData
    : (recipesData as any)?.items || [];

  // For now, set total pages to 1 since we're using server-side pagination
  // TODO: Update this when the API returns total count information
  const categoriesTotalPages = Math.max(
    1,
    Math.ceil(
      (categories.length > 0
        ? categoriesPage * categoriesPerPage + 1
        : categories.length) / categoriesPerPage,
    ),
  );
  const suppliersTotalPages = Math.max(
    1,
    Math.ceil(
      (suppliers.length > 0
        ? suppliersPage * suppliersPerPage + 1
        : suppliers.length) / suppliersPerPage,
    ),
  );
  const itemsTotalPages = Math.max(
    1,
    Math.ceil(
      (items.length > 0 ? itemsPage * itemsPerPage + 1 : items.length) /
        itemsPerPage,
    ),
  );
  const stockTotalPages = Math.max(
    1,
    Math.ceil(
      (stock.length > 0 ? stockPage * stockPerPage + 1 : stock.length) /
        stockPerPage,
    ),
  );
  const lowStockTotalPages = Math.max(
    1,
    Math.ceil(
      (lowStock.length > 0
        ? lowStockPage * lowStockPerPage + 1
        : lowStock.length) / lowStockPerPage,
    ),
  );
  const purchaseOrdersTotalPages = Math.max(
    1,
    Math.ceil(
      (purchaseOrders.length > 0
        ? purchaseOrdersPage * purchaseOrdersPerPage + 1
        : purchaseOrders.length) / purchaseOrdersPerPage,
    ),
  );
  const wastageItemsTotalPages = Math.max(
    1,
    Math.ceil(
      (wastageItems.length > 0
        ? wastageItemsPage * wastageItemsPerPage + 1
        : wastageItems.length) / wastageItemsPerPage,
    ),
  );
  const expensesTotalPages = Math.max(
    1,
    Math.ceil(
      (utilityExpenses.length > 0
        ? expensesPage * expensesPerPage + 1
        : utilityExpenses.length) / expensesPerPage,
    ),
  );
  const recipesTotalPages = Math.max(
    1,
    Math.ceil(
      (recipes.length > 0 ? recipesPage * recipesPerPage + 1 : recipes.length) /
        recipesPerPage,
    ),
  );

  // Refetch data when tab changes
  useEffect(() => {
    if (activeTab === "categories") refetchCategories();
    if (activeTab === "suppliers") refetchSuppliers();
    if (activeTab === "items") refetchItems();
    if (activeTab === "stock" && stockSubTab === "manage-stock") refetchStock();
    if (activeTab === "stock" && stockSubTab === "low-stock") refetchLowStock();
    if (activeTab === "stock" && stockSubTab === "purchase-orders")
      refetchPurchaseOrders();
    if (activeTab === "stock" && stockSubTab === "stock-wastage")
      refetchWastage();
    if (activeTab === "expense") refetchUtilityExpenses();
    if (activeTab === "recipes") refetchRecipes();
  }, [activeTab, stockSubTab]);

  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: (categoryId: number) =>
      inventoryApi.deleteInventoryCategory(categoryId),
    onSuccess: () => {
      toast({ title: "Success", description: "Category deleted successfully" });
      queryClient.invalidateQueries({
        queryKey: ["inventory-categories", branchId],
      });
      refetchCategories();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete category",
        variant: "destructive",
      });
    },
  });

  // Delete supplier mutation
  const deleteSupplierMutation = useMutation({
    mutationFn: (supplierId: number) =>
      inventoryApi.deleteInventorySupplier(supplierId),
    onSuccess: () => {
      toast({ title: "Success", description: "Supplier deleted successfully" });
      queryClient.invalidateQueries({
        queryKey: ["inventory-suppliers", branchId],
      });
      refetchSuppliers();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete supplier",
        variant: "destructive",
      });
    },
  });

  // Delete item mutation
  const deleteItemMutation = useMutation({
    mutationFn: (itemId: number) => inventoryApi.deleteInventoryItem(itemId),
    onSuccess: () => {
      toast({ title: "Success", description: "Item deleted successfully" });
      queryClient.invalidateQueries({
        queryKey: ["inventory-items", branchId],
      });
      refetchItems();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete item",
        variant: "destructive",
      });
    },
  });

  // Delete recipe mutation
  const deleteRecipeMutation = useMutation({
    mutationFn: (recipeId: number) => inventoryApi.deleteRecipe(recipeId),
    onSuccess: () => {
      toast({ title: "Success", description: "Recipe deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["recipes", branchId] });
      refetchRecipes();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete recipe",
        variant: "destructive",
      });
    },
  });

  // Delete utility expense mutation
  const deleteUtilityExpenseMutation = useMutation({
    mutationFn: (expenseId: number) =>
      inventoryApi.deleteUtilityExpense(expenseId),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Utility expense deleted successfully",
      });
      queryClient.invalidateQueries({
        queryKey: ["utility-expenses", branchId],
      });
      refetchUtilityExpenses();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete utility expense",
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    if (!deleteItem) return;

    if (deleteItem.type === "category") {
      deleteCategoryMutation.mutate(parseInt(deleteItem.id));
    } else if (deleteItem.type === "supplier") {
      deleteSupplierMutation.mutate(parseInt(deleteItem.id));
    } else if (deleteItem.type === "item") {
      deleteItemMutation.mutate(parseInt(deleteItem.id));
    } else if (deleteItem.type === "recipe") {
      deleteRecipeMutation.mutate(parseInt(deleteItem.id));
    } else if (deleteItem.type === "utility-expense") {
      deleteUtilityExpenseMutation.mutate(parseInt(deleteItem.id));
    }

    setShowDeleteModal(false);
    setDeleteItem(null);
  };

  return (
    <div className="p-6 space-y-6" data-testid="inventory-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/branches")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1
              className="text-2xl font-semibold text-gray-900"
              data-testid="page-title"
            >
              Inventory Management
            </h1>
            {branchData && (
              <p className="text-sm text-gray-600">{branchData.name}</p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList
          className="grid grid-cols-6 w-full"
          data-testid="inventory-tabs"
        >
          <TabsTrigger
            value="categories"
            className="data-[state=active]:bg-green-500 data-[state=active]:text-white"
          >
            Categories
          </TabsTrigger>
          <TabsTrigger
            value="suppliers"
            className="data-[state=active]:bg-green-500 data-[state=active]:text-white"
          >
            Suppliers
          </TabsTrigger>
          <TabsTrigger
            value="items"
            className="data-[state=active]:bg-green-500 data-[state=active]:text-white"
          >
            Items
          </TabsTrigger>
          <TabsTrigger
            value="stock"
            className="data-[state=active]:bg-green-500 data-[state=active]:text-white"
          >
            Stock
          </TabsTrigger>
          <TabsTrigger
            value="expense"
            className="data-[state=active]:bg-green-500 data-[state=active]:text-white"
          >
            Expense Management
          </TabsTrigger>
          <TabsTrigger
            value="recipes"
            className="data-[state=active]:bg-green-500 data-[state=active]:text-white"
          >
            Recipes
          </TabsTrigger>
        </TabsList>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-6">
          <div className="flex justify-end items-center gap-4">
            <Button
              className="bg-green-500 hover:bg-green-600 text-white"
              onClick={() => setShowAddCategoryModal(true)}
              data-testid="button-add-category"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </Button>
          </div>

          <div className="bg-white rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      Category Name
                      <ColumnSearchPopover
                        placeholder="Search categories by name..."
                        currentValue={categoriesSearch}
                        tableName="categories"
                        onSearch={(value) => {
                          setCategoriesSearch(value);
                          setCategoriesPage(1);
                        }}
                        onClear={() => {
                          setCategoriesSearch("");
                          setCategoriesPage(1);
                        }}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingCategories ? (
                  Array.from({ length: categoriesPerPage }, (_, i) => (
                    <TableRow key={`loading-${i}`}>
                      <TableCell>
                        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      </TableCell>
                      <TableCell>
                        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : categories.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={2}
                      className="text-center py-8 text-gray-500"
                    >
                      No categories found
                    </TableCell>
                  </TableRow>
                ) : (
                  categories.map((category) => (
                    <TableRow
                      key={category.id}
                      data-testid={`category-row-${category.id}`}
                    >
                      <TableCell
                        className="font-medium"
                        data-testid={`category-name-${category.id}`}
                      >
                        {category.name}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDeleteItem({
                              type: "category",
                              id: category.id.toString(),
                              name: category.name,
                            });
                            setShowDeleteModal(true);
                          }}
                          data-testid={`button-delete-category-${category.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Categories Pagination */}
            <div className="flex items-center justify-between p-4 border-t bg-gray-50">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Show result:</span>
                <Select
                  value={categoriesPerPage.toString()}
                  onValueChange={(value) => {
                    setCategoriesPerPage(Number(value));
                    setCategoriesPage(1);
                  }}
                  data-testid="select-categories-per-page"
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEFAULT_PAGINATION_CONFIG.pageSizeOptions.map(
                      (pageSize) => (
                        <SelectItem key={pageSize} value={pageSize.toString()}>
                          {pageSize}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCategoriesPage(Math.max(1, categoriesPage - 1))
                  }
                  disabled={categoriesPage === 1}
                  data-testid="button-categories-prev-page"
                >
                  Previous
                </Button>

                {Array.from(
                  { length: categoriesTotalPages },
                  (_, i) => i + 1,
                ).map((page) => (
                  <Button
                    key={page}
                    variant={categoriesPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCategoriesPage(page)}
                    className={
                      categoriesPage === page
                        ? "bg-green-500 hover:bg-green-600"
                        : ""
                    }
                    data-testid={`button-categories-page-${page}`}
                  >
                    {page}
                  </Button>
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCategoriesPage(
                      Math.min(categoriesTotalPages, categoriesPage + 1),
                    )
                  }
                  disabled={categoriesPage === categoriesTotalPages}
                  data-testid="button-categories-next-page"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Suppliers Tab */}
        <TabsContent value="suppliers" className="space-y-6">
          <div className="flex justify-end items-center gap-4">
            <Button
              className="bg-green-500 hover:bg-green-600 text-white"
              onClick={() => setShowAddSupplierModal(true)}
              data-testid="button-add-supplier"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Supplier
            </Button>
          </div>

          <div className="bg-white rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      Name
                      <ColumnSearchPopover
                        placeholder="Search suppliers by name..."
                        currentValue={suppliersSearch}
                        tableName="suppliers"
                        onSearch={(value) => {
                          setSuppliersSearch(value);
                          setSuppliersPage(1);
                        }}
                        onClear={() => {
                          setSuppliersSearch("");
                          setSuppliersPage(1);
                        }}
                      />
                    </div>
                  </TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingSuppliers ? (
                  Array.from({ length: suppliersPerPage }, (_, i) => (
                    <TableRow key={`loading-${i}`}>
                      <TableCell>
                        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      </TableCell>
                      <TableCell>
                        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      </TableCell>
                      <TableCell>
                        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      </TableCell>
                      <TableCell>
                        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      </TableCell>
                      <TableCell>
                        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      </TableCell>
                      <TableCell>
                        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : suppliers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-gray-500"
                    >
                      No suppliers found
                    </TableCell>
                  </TableRow>
                ) : (
                  suppliers.map((supplier) => (
                    <TableRow
                      key={supplier.id}
                      data-testid={`supplier-row-${supplier.id}`}
                    >
                      <TableCell
                        className="font-medium"
                        data-testid={`supplier-name-${supplier.id}`}
                      >
                        {supplier.name}
                      </TableCell>
                      <TableCell
                        data-testid={`supplier-contact-${supplier.id}`}
                      >
                        {supplier.contactPerson}
                      </TableCell>
                      <TableCell data-testid={`supplier-phone-${supplier.id}`}>
                        {supplier.phone}
                      </TableCell>
                      <TableCell data-testid={`supplier-email-${supplier.id}`}>
                        {supplier.email}
                      </TableCell>
                      <TableCell
                        data-testid={`supplier-address-${supplier.id}`}
                      >
                        {supplier.address}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              const supplierDetails =
                                (await inventoryApi.getInventorySupplierById(
                                  supplier.id,
                                )) as InventorySupplier;
                              setSelectedSupplier(supplierDetails);
                              setShowEditSupplierModal(true);
                            }}
                            data-testid={`button-edit-supplier-${supplier.id}`}
                          >
                            <Edit className="w-4 h-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDeleteItem({
                                type: "supplier",
                                id: supplier.id.toString(),
                                name: supplier.name,
                              });
                              setShowDeleteModal(true);
                            }}
                            data-testid={`button-delete-supplier-${supplier.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Suppliers Pagination */}
            <div className="flex items-center justify-between p-4 border-t bg-gray-50">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Show result:</span>
                <Select
                  value={suppliersPerPage.toString()}
                  onValueChange={(value) => {
                    setSuppliersPerPage(Number(value));
                    setSuppliersPage(1);
                  }}
                  data-testid="select-suppliers-per-page"
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEFAULT_PAGINATION_CONFIG.pageSizeOptions.map(
                      (pageSize) => (
                        <SelectItem key={pageSize} value={pageSize.toString()}>
                          {pageSize}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSuppliersPage(Math.max(1, suppliersPage - 1))
                  }
                  disabled={suppliersPage === 1}
                  data-testid="button-suppliers-prev-page"
                >
                  Previous
                </Button>

                {Array.from(
                  { length: suppliersTotalPages },
                  (_, i) => i + 1,
                ).map((page) => (
                  <Button
                    key={page}
                    variant={suppliersPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSuppliersPage(page)}
                    className={
                      suppliersPage === page
                        ? "bg-green-500 hover:bg-green-600"
                        : ""
                    }
                    data-testid={`button-suppliers-page-${page}`}
                  >
                    {page}
                  </Button>
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSuppliersPage(
                      Math.min(suppliersTotalPages, suppliersPage + 1),
                    )
                  }
                  disabled={suppliersPage === suppliersTotalPages}
                  data-testid="button-suppliers-next-page"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Items Tab */}
        <TabsContent value="items" className="space-y-6">
          <div className="flex justify-end items-center gap-4">
            <Button
              className="bg-green-500 hover:bg-green-600 text-white"
              onClick={() => setShowAddItemModal(true)}
              data-testid="button-add-item"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>

          <div className="bg-white rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      Item Name
                      <ColumnSearchPopover
                        placeholder="Search items by name..."
                        currentValue={itemsSearch}
                        tableName="items"
                        onSearch={(value) => {
                          setItemsSearch(value);
                          setItemsPage(1);
                        }}
                        onClear={() => {
                          setItemsSearch("");
                          setItemsPage(1);
                        }}
                      />
                    </div>
                  </TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Reorder Level</TableHead>
                  <TableHead>Default Supplier</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingItems ? (
                  Array.from({ length: itemsPerPage }, (_, i) => (
                    <TableRow key={`loading-${i}`}>
                      <TableCell>
                        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      </TableCell>
                      <TableCell>
                        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      </TableCell>
                      <TableCell>
                        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      </TableCell>
                      <TableCell>
                        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      </TableCell>
                      <TableCell>
                        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      </TableCell>
                      <TableCell>
                        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-gray-500"
                    >
                      No items found
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.id} data-testid={`item-row-${item.id}`}>
                      <TableCell
                        className="font-medium"
                        data-testid={`item-name-${item.id}`}
                      >
                        {item.name}
                      </TableCell>
                      <TableCell data-testid={`item-category-${item.id}`}>
                        {item.categoryName}
                      </TableCell>
                      <TableCell data-testid={`item-unit-${item.id}`}>
                        {item.unit}
                      </TableCell>
                      <TableCell data-testid={`item-reorder-${item.id}`}>
                        {item.reorderLevel}
                      </TableCell>
                      <TableCell data-testid={`item-supplier-${item.id}`}>
                        {item.defaultSupplierName || "N/A"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              const itemDetails =
                                (await inventoryApi.getInventoryItemById(
                                  item.id,
                                )) as InventoryItem & {
                                  categoryId?: number;
                                  defaultSupplierId?: number;
                                };
                              setSelectedItem(itemDetails);
                              setShowEditItemModal(true);
                            }}
                            data-testid={`button-edit-item-${item.id}`}
                          >
                            <Edit className="w-4 h-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDeleteItem({
                                type: "item",
                                id: item.id.toString(),
                                name: item.name,
                              });
                              setShowDeleteModal(true);
                            }}
                            data-testid={`button-delete-item-${item.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Items Pagination */}
            <div className="flex items-center justify-between p-4 border-t bg-gray-50">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Show result:</span>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => {
                    setItemsPerPage(Number(value));
                    setItemsPage(1);
                  }}
                  data-testid="select-items-per-page"
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEFAULT_PAGINATION_CONFIG.pageSizeOptions.map(
                      (pageSize) => (
                        <SelectItem key={pageSize} value={pageSize.toString()}>
                          {pageSize}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setItemsPage(Math.max(1, itemsPage - 1))}
                  disabled={itemsPage === 1}
                  data-testid="button-items-prev-page"
                >
                  Previous
                </Button>
                {Array.from({ length: itemsTotalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <Button
                      key={page}
                      variant={itemsPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setItemsPage(page)}
                      className={
                        itemsPage === page
                          ? "bg-green-500 hover:bg-green-600"
                          : ""
                      }
                      data-testid={`button-items-page-${page}`}
                    >
                      {page}
                    </Button>
                  ),
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setItemsPage(Math.min(itemsTotalPages, itemsPage + 1))
                  }
                  disabled={itemsPage === itemsTotalPages}
                  data-testid="button-items-next-page"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Stock Tab with Sub-tabs */}
        <TabsContent value="stock" className="space-y-6">
          <Tabs
            value={stockSubTab}
            onValueChange={setStockSubTab}
            className="space-y-6"
          >
            <TabsList
              className="grid grid-cols-4 w-full"
              data-testid="stock-sub-tabs"
            >
              <TabsTrigger
                value="manage-stock"
                className="data-[state=active]:bg-green-500 data-[state=active]:text-white"
              >
                Manage Stock
              </TabsTrigger>
              <TabsTrigger
                value="low-stock"
                className="data-[state=active]:bg-green-500 data-[state=active]:text-white"
              >
                Low Stock
              </TabsTrigger>
              <TabsTrigger
                value="purchase-orders"
                className="data-[state=active]:bg-green-500 data-[state=active]:text-white"
              >
                Purchase Orders
              </TabsTrigger>
              <TabsTrigger
                value="stock-wastage"
                className="data-[state=active]:bg-green-500 data-[state=active]:text-white"
              >
                Stock Wastage
              </TabsTrigger>
            </TabsList>

            {/* Manage Stock Sub-tab */}
            <TabsContent value="manage-stock" className="space-y-6">
              <div className="bg-white rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <div className="flex items-center gap-2">
                          Item Name
                          <ColumnSearchPopover
                            placeholder="Search stock by item name..."
                            currentValue={stockSearch}
                            tableName="stock"
                            onSearch={(value) => {
                              setStockSearch(value);
                              setStockPage(1);
                            }}
                            onClear={() => {
                              setStockSearch("");
                              setStockPage(1);
                            }}
                          />
                        </div>
                      </TableHead>
                      <TableHead>Current Stock</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingStock ? (
                      Array.from({ length: stockPerPage }, (_, i) => (
                        <TableRow key={`loading-${i}`}>
                          <TableCell>
                            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                          </TableCell>
                          <TableCell>
                            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                          </TableCell>
                          <TableCell>
                            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                          </TableCell>
                          <TableCell>
                            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : stock.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center py-8 text-gray-500"
                        >
                          <div>
                            <p>No stock found</p>
                            <p className="text-xs mt-2">
                              No inventory items available.{" "}
                              <Link href="#" onClick={() => setActiveTab("items")} className="text-blue-600 hover:text-blue-700 inline-flex items-center gap-1" data-testid="link-inventory-items-stock">
                                Go to Inventory Items <ExternalLink className="w-3 h-3" />
                              </Link>
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      stock.map((item) => (
                        <TableRow
                          key={item.inventoryItemId}
                          data-testid={`stock-row-${item.inventoryItemId}`}
                        >
                          <TableCell
                            className="font-medium"
                            data-testid={`stock-name-${item.inventoryItemId}`}
                          >
                            {item.itemName}
                          </TableCell>
                          <TableCell
                            data-testid={`stock-current-${item.inventoryItemId}`}
                          >
                            {item.currentStock}
                          </TableCell>
                          <TableCell
                            data-testid={`stock-unit-${item.inventoryItemId}`}
                          >
                            {item.unit}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedStockItem(item);
                                setShowStockUpdateModal(true);
                              }}
                              data-testid={`button-update-stock-${item.inventoryItemId}`}
                            >
                              <Edit className="w-4 h-4 text-blue-600" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {/* Stock Pagination */}
                <div className="flex items-center justify-between p-4 border-t bg-gray-50">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Show result:</span>
                    <Select
                      value={stockPerPage.toString()}
                      onValueChange={(value) => {
                        setStockPerPage(Number(value));
                        setStockPage(1);
                      }}
                      data-testid="select-stock-per-page"
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DEFAULT_PAGINATION_CONFIG.pageSizeOptions.map(
                          (pageSize) => (
                            <SelectItem
                              key={pageSize}
                              value={pageSize.toString()}
                            >
                              {pageSize}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setStockPage(Math.max(1, stockPage - 1))}
                      disabled={stockPage === 1}
                      data-testid="button-stock-prev-page"
                    >
                      Previous
                    </Button>
                    {Array.from(
                      { length: stockTotalPages },
                      (_, i) => i + 1,
                    ).map((page) => (
                      <Button
                        key={page}
                        variant={stockPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStockPage(page)}
                        className={
                          stockPage === page
                            ? "bg-green-500 hover:bg-green-600"
                            : ""
                        }
                        data-testid={`button-stock-page-${page}`}
                      >
                        {page}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setStockPage(Math.min(stockTotalPages, stockPage + 1))
                      }
                      disabled={stockPage === stockTotalPages}
                      data-testid="button-stock-next-page"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Low Stock Sub-tab */}
            <TabsContent value="low-stock" className="space-y-6">
              <div className="bg-white rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <div className="flex items-center gap-2">
                          Item Name
                          <ColumnSearchPopover
                            placeholder="Search low stock by item name..."
                            currentValue={lowStockSearch}
                            tableName="low-stock"
                            onSearch={(value) => {
                              setLowStockSearch(value);
                              setLowStockPage(1);
                            }}
                            onClear={() => {
                              setLowStockSearch("");
                              setLowStockPage(1);
                            }}
                          />
                        </div>
                      </TableHead>
                      <TableHead>Current Stock</TableHead>
                      <TableHead>Reorder Level</TableHead>
                      <TableHead>Unit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingLowStock ? (
                      Array.from({ length: lowStockPerPage }, (_, i) => (
                        <TableRow key={`loading-${i}`}>
                          <TableCell>
                            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                          </TableCell>
                          <TableCell>
                            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                          </TableCell>
                          <TableCell>
                            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                          </TableCell>
                          <TableCell>
                            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : lowStock.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center py-8 text-gray-500"
                        >
                          No low stock items
                        </TableCell>
                      </TableRow>
                    ) : (
                      lowStock.map((item) => (
                        <TableRow
                          key={item.inventoryItemId}
                          data-testid={`low-stock-row-${item.inventoryItemId}`}
                        >
                          <TableCell
                            className="font-medium"
                            data-testid={`low-stock-name-${item.inventoryItemId}`}
                          >
                            {item.itemName}
                          </TableCell>
                          <TableCell
                            data-testid={`low-stock-current-${item.inventoryItemId}`}
                          >
                            <span className="text-red-600 font-semibold">
                              {item.currentStock}
                            </span>
                          </TableCell>
                          <TableCell
                            data-testid={`low-stock-reorder-${item.inventoryItemId}`}
                          >
                            {item.lowStockThreshold}
                          </TableCell>
                          <TableCell
                            data-testid={`low-stock-unit-${item.inventoryItemId}`}
                          >
                            {item.unit}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {/* Low Stock Pagination */}
                <div className="flex items-center justify-between p-4 border-t bg-gray-50">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Show result:</span>
                    <Select
                      value={lowStockPerPage.toString()}
                      onValueChange={(value) => {
                        setLowStockPerPage(Number(value));
                        setLowStockPage(1);
                      }}
                      data-testid="select-low-stock-per-page"
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DEFAULT_PAGINATION_CONFIG.pageSizeOptions.map(
                          (pageSize) => (
                            <SelectItem
                              key={pageSize}
                              value={pageSize.toString()}
                            >
                              {pageSize}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setLowStockPage(Math.max(1, lowStockPage - 1))
                      }
                      disabled={lowStockPage === 1}
                      data-testid="button-low-stock-prev-page"
                    >
                      Previous
                    </Button>
                    {Array.from(
                      { length: lowStockTotalPages },
                      (_, i) => i + 1,
                    ).map((page) => (
                      <Button
                        key={page}
                        variant={lowStockPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setLowStockPage(page)}
                        className={
                          lowStockPage === page
                            ? "bg-green-500 hover:bg-green-600"
                            : ""
                        }
                        data-testid={`button-low-stock-page-${page}`}
                      >
                        {page}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setLowStockPage(
                          Math.min(lowStockTotalPages, lowStockPage + 1),
                        )
                      }
                      disabled={lowStockPage === lowStockTotalPages}
                      data-testid="button-low-stock-next-page"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Purchase Orders Sub-tab */}
            <TabsContent value="purchase-orders" className="space-y-6">
              <div className="flex justify-end items-center gap-4">
                <Button
                  className="bg-green-500 hover:bg-green-600 text-white"
                  onClick={() => setShowPurchaseOrderModal(true)}
                  data-testid="button-add-purchase-order"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Purchase Order
                </Button>
              </div>

              <div className="bg-white rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>
                        <div className="flex items-center gap-2">
                          Supplier
                          <ColumnSearchPopover
                            placeholder="Search purchase orders by supplier name..."
                            currentValue={purchaseOrdersSearch}
                            tableName="purchase-orders"
                            onSearch={(value) => {
                              setPurchaseOrdersSearch(value);
                              setPurchaseOrdersPage(1);
                            }}
                            onClear={() => {
                              setPurchaseOrdersSearch("");
                              setPurchaseOrdersPage(1);
                            }}
                          />
                        </div>
                      </TableHead>
                      <TableHead>Order Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingPurchaseOrders ? (
                      Array.from({ length: purchaseOrdersPerPage }, (_, i) => (
                        <TableRow key={`loading-${i}`}>
                          <TableCell>
                            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                          </TableCell>
                          <TableCell>
                            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                          </TableCell>
                          <TableCell>
                            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                          </TableCell>
                          <TableCell>
                            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                          </TableCell>
                          <TableCell>
                            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                          </TableCell>
                          <TableCell>
                            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : purchaseOrders.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center py-8 text-gray-500"
                        >
                          No purchase orders found
                        </TableCell>
                      </TableRow>
                    ) : (
                      purchaseOrders.map((order) => (
                        <TableRow
                          key={order.id}
                          data-testid={`purchase-order-row-${order.id}`}
                        >
                          <TableCell
                            className="font-medium"
                            data-testid={`purchase-order-id-${order.id}`}
                          >
                            #{order.id}
                          </TableCell>
                          <TableCell
                            data-testid={`purchase-order-supplier-${order.id}`}
                          >
                            {order.supplierName}
                          </TableCell>
                          <TableCell
                            data-testid={`purchase-order-date-${order.id}`}
                          >
                            {new Date(order.orderDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell
                            data-testid={`purchase-order-status-${order.id}`}
                          >
                            <Badge
                              variant={
                                purchaseOrderStatusMap[order.status]?.variant ||
                                "default"
                              }
                            >
                              {purchaseOrderStatusMap[order.status]?.label ||
                                "Unknown"}
                            </Badge>
                          </TableCell>
                          <TableCell
                            data-testid={`purchase-order-amount-${order.id}`}
                          >
                            {order.totalAmount.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedPurchaseOrder(order.id);
                                setShowPurchaseOrderViewModal(true);
                              }}
                              data-testid={`button-view-purchase-order-${order.id}`}
                            >
                              <Eye className="w-4 h-4 text-blue-600" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {/* Purchase Orders Pagination */}
                <div className="flex items-center justify-between p-4 border-t bg-gray-50">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Show result:</span>
                    <Select
                      value={purchaseOrdersPerPage.toString()}
                      onValueChange={(value) => {
                        setPurchaseOrdersPerPage(Number(value));
                        setPurchaseOrdersPage(1);
                      }}
                      data-testid="select-purchase-orders-per-page"
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DEFAULT_PAGINATION_CONFIG.pageSizeOptions.map(
                          (pageSize) => (
                            <SelectItem
                              key={pageSize}
                              value={pageSize.toString()}
                            >
                              {pageSize}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPurchaseOrdersPage(
                          Math.max(1, purchaseOrdersPage - 1),
                        )
                      }
                      disabled={purchaseOrdersPage === 1}
                      data-testid="button-purchase-orders-prev-page"
                    >
                      Previous
                    </Button>
                    {Array.from(
                      { length: purchaseOrdersTotalPages },
                      (_, i) => i + 1,
                    ).map((page) => (
                      <Button
                        key={page}
                        variant={
                          purchaseOrdersPage === page ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => setPurchaseOrdersPage(page)}
                        className={
                          purchaseOrdersPage === page
                            ? "bg-green-500 hover:bg-green-600"
                            : ""
                        }
                        data-testid={`button-purchase-orders-page-${page}`}
                      >
                        {page}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPurchaseOrdersPage(
                          Math.min(
                            purchaseOrdersTotalPages,
                            purchaseOrdersPage + 1,
                          ),
                        )
                      }
                      disabled={purchaseOrdersPage === purchaseOrdersTotalPages}
                      data-testid="button-purchase-orders-next-page"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Stock Wastage Sub-tab */}
            <TabsContent value="stock-wastage" className="space-y-6">
              <div className="flex justify-between items-center gap-4">
                <div className="flex gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">From:</label>
                    <Input
                      type="date"
                      value={wastageFromDate}
                      onChange={(e) => setWastageFromDate(e.target.value)}
                      className="w-40"
                      data-testid="input-from-date"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">To:</label>
                    <Input
                      type="date"
                      value={wastageToDate}
                      onChange={(e) => setWastageToDate(e.target.value)}
                      className="w-40"
                      data-testid="input-to-date"
                    />
                  </div>
                </div>
                <Button
                  className="bg-red-500 hover:bg-red-600 text-white"
                  onClick={() => setShowStockWastageModal(true)}
                  data-testid="button-add-wastage"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Wastage
                </Button>
              </div>

              <div className="bg-white rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>
                        <div className="flex items-center gap-2">
                          Item Name
                          <ColumnSearchPopover
                            placeholder="Search wastage by item name..."
                            currentValue={wastageSearch}
                            tableName="wastage"
                            onSearch={(value) => {
                              setWastageSearch(value);
                              setWastageItemsPage(1);
                            }}
                            onClear={() => {
                              setWastageSearch("");
                              setWastageItemsPage(1);
                            }}
                          />
                        </div>
                      </TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingWastage ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8">
                          Loading wastage records...
                        </TableCell>
                      </TableRow>
                    ) : wastageItems.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center py-8 text-gray-500"
                        >
                          No wastage records found
                        </TableCell>
                      </TableRow>
                    ) : (
                      wastageItems.map((wastage) => (
                        <TableRow
                          key={wastage.id}
                          data-testid={`wastage-row-${wastage.id}`}
                        >
                          <TableCell data-testid={`wastage-date-${wastage.id}`}>
                            {new Date(wastage.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell
                            className="font-medium"
                            data-testid={`wastage-item-${wastage.id}`}
                          >
                            {wastage.itemName}
                          </TableCell>
                          <TableCell
                            data-testid={`wastage-quantity-${wastage.id}`}
                          >
                            {wastage.quantity}
                          </TableCell>
                          <TableCell
                            data-testid={`wastage-reason-${wastage.id}`}
                          >
                            {wastage.reason}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {/* Wastage Pagination */}
                <div className="flex items-center justify-between p-4 border-t bg-gray-50">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Show result:</span>
                    <Select
                      value={wastageItemsPerPage.toString()}
                      onValueChange={(value) => {
                        setWastageItemsPerPage(Number(value));
                        setWastageItemsPage(1);
                      }}
                      data-testid="select-wastage-per-page"
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DEFAULT_PAGINATION_CONFIG.pageSizeOptions.map(
                          (pageSize) => (
                            <SelectItem
                              key={pageSize}
                              value={pageSize.toString()}
                            >
                              {pageSize}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setWastageItemsPage(Math.max(1, wastageItemsPage - 1))
                      }
                      disabled={wastageItemsPage === 1}
                      data-testid="button-wastage-prev-page"
                    >
                      Previous
                    </Button>
                    {Array.from(
                      { length: wastageItemsTotalPages },
                      (_, i) => i + 1,
                    ).map((page) => (
                      <Button
                        key={page}
                        variant={
                          wastageItemsPage === page ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => setWastageItemsPage(page)}
                        className={
                          wastageItemsPage === page
                            ? "bg-green-500 hover:bg-green-600"
                            : ""
                        }
                        data-testid={`button-wastage-page-${page}`}
                      >
                        {page}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setWastageItemsPage(
                          Math.min(
                            wastageItemsTotalPages,
                            wastageItemsPage + 1,
                          ),
                        )
                      }
                      disabled={wastageItemsPage === wastageItemsTotalPages}
                      data-testid="button-wastage-next-page"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Expense Management Tab */}
        <TabsContent value="expense" className="space-y-6">
          <div className="flex justify-end items-center gap-4">
            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white"
              onClick={() => setShowUtilityExpenseModal(true)}
              data-testid="button-add-utility-expense"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Utility Expense
            </Button>
          </div>

          <div className="bg-white rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      Utility Type
                      <ColumnSearchPopover
                        placeholder="Search expenses by utility type..."
                        currentValue={expensesSearch}
                        tableName="expenses"
                        onSearch={(value) => {
                          setExpensesSearch(value);
                          setExpensesPage(1);
                        }}
                        onClear={() => {
                          setExpensesSearch("");
                          setExpensesPage(1);
                        }}
                      />
                    </div>
                  </TableHead>
                  <TableHead>Usage Unit</TableHead>
                  <TableHead>Unit Cost</TableHead>
                  <TableHead>Total Cost</TableHead>
                  <TableHead>Bill Number</TableHead>
                  <TableHead>Billing Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingUtilityExpenses ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Loading utility expenses...
                    </TableCell>
                  </TableRow>
                ) : utilityExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-8 text-gray-500"
                    >
                      No utility expenses found
                    </TableCell>
                  </TableRow>
                ) : (
                  utilityExpenses.map((expense) => (
                    <TableRow
                      key={expense.id}
                      data-testid={`expense-row-${expense.id}`}
                    >
                      <TableCell
                        className="font-medium"
                        data-testid={`expense-type-${expense.id}`}
                      >
                        {expense.utilityType}
                      </TableCell>
                      <TableCell data-testid={`expense-usage-${expense.id}`}>
                        {expense.usageUnit}
                      </TableCell>
                      <TableCell data-testid={`expense-unitcost-${expense.id}`}>
                        ${expense.unitCost.toFixed(2)}
                      </TableCell>
                      <TableCell
                        data-testid={`expense-totalcost-${expense.id}`}
                      >
                        ${expense.totalCost.toFixed(2)}
                      </TableCell>
                      <TableCell
                        data-testid={`expense-billnumber-${expense.id}`}
                      >
                        {expense.billNumber}
                      </TableCell>
                      <TableCell data-testid={`expense-period-${expense.id}`}>
                        {new Date(
                          expense.billingPeriodStart,
                        ).toLocaleDateString()}{" "}
                        -{" "}
                        {new Date(
                          expense.billingPeriodEnd,
                        ).toLocaleDateString()}
                      </TableCell>
                      <TableCell data-testid={`expense-status-${expense.id}`}>
                        <Badge
                          variant={expense.isActive ? "default" : "secondary"}
                        >
                          {expense.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedUtilityExpense(expense);
                              setShowViewUtilityExpenseModal(true);
                            }}
                            data-testid={`button-view-expense-${expense.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDeleteItem({
                                type: "utility-expense",
                                id: expense.id.toString(),
                                name: expense.utilityType,
                              });
                              setShowDeleteModal(true);
                            }}
                            data-testid={`button-delete-expense-${expense.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Expenses Pagination */}
            <div className="flex items-center justify-between p-4 border-t bg-gray-50">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Show result:</span>
                <Select
                  value={expensesPerPage.toString()}
                  onValueChange={(value) => {
                    setExpensesPerPage(Number(value));
                    setExpensesPage(1);
                  }}
                  data-testid="select-expenses-per-page"
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEFAULT_PAGINATION_CONFIG.pageSizeOptions.map(
                      (pageSize) => (
                        <SelectItem key={pageSize} value={pageSize.toString()}>
                          {pageSize}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExpensesPage(Math.max(1, expensesPage - 1))}
                  disabled={expensesPage === 1}
                  data-testid="button-expenses-prev-page"
                >
                  Previous
                </Button>
                {Array.from(
                  { length: expensesTotalPages },
                  (_, i) => i + 1,
                ).map((page) => (
                  <Button
                    key={page}
                    variant={expensesPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setExpensesPage(page)}
                    className={
                      expensesPage === page
                        ? "bg-green-500 hover:bg-green-600"
                        : ""
                    }
                    data-testid={`button-expenses-page-${page}`}
                  >
                    {page}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setExpensesPage(
                      Math.min(expensesTotalPages, expensesPage + 1),
                    )
                  }
                  disabled={expensesPage === expensesTotalPages}
                  data-testid="button-expenses-next-page"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Recipes Tab */}
        <TabsContent value="recipes" className="space-y-6">
          <div className="flex justify-end items-center gap-4">
            <Button
              className="bg-purple-500 hover:bg-purple-600 text-white"
              onClick={() => setShowRecipeModal(true)}
              data-testid="button-add-recipe"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Recipe
            </Button>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      Name
                      <ColumnSearchPopover
                        placeholder="Search recipes by menu item name..."
                        currentValue={recipesSearch}
                        tableName="recipes"
                        onSearch={(value) => {
                          setRecipesSearch(value);
                          setRecipesPage(1);
                        }}
                        onClear={() => {
                          setRecipesSearch("");
                          setRecipesPage(1);
                        }}
                      />
                    </div>
                  </TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingRecipes ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center">
                      Loading recipes...
                    </TableCell>
                  </TableRow>
                ) : recipes.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center text-gray-500"
                    >
                      No recipes found
                    </TableCell>
                  </TableRow>
                ) : (
                  recipes.map((recipe) => (
                    <TableRow key={recipe.id}>
                      <TableCell
                        className="font-medium"
                        data-testid={`recipe-name-${recipe.id}`}
                      >
                        {recipe.subMenuItemName 
                          ? recipe.subMenuItemName 
                          : `${recipe.menuItemName} - ${recipe.variantName}`}
                      </TableCell>
                      <TableCell data-testid={`recipe-type-${recipe.id}`}>
                        {recipe.description}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              const recipeDetails =
                                await inventoryApi.getRecipeById(recipe.id);
                              setSelectedRecipe(recipeDetails);
                              setShowEditRecipeModal(true);
                            }}
                            data-testid={`button-edit-recipe-${recipe.id}`}
                          >
                            <Edit className="w-4 h-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDeleteItem({
                                type: "recipe",
                                id: recipe.id.toString(),
                                name: recipe.name,
                              });
                              setShowDeleteModal(true);
                            }}
                            data-testid={`button-delete-recipe-${recipe.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Recipes Pagination */}
            <div className="flex items-center justify-between p-4 border-t bg-gray-50">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Show result:</span>
                <Select
                  value={recipesPerPage.toString()}
                  onValueChange={(value) => {
                    setRecipesPerPage(Number(value));
                    setRecipesPage(1);
                  }}
                  data-testid="select-recipes-per-page"
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEFAULT_PAGINATION_CONFIG.pageSizeOptions.map(
                      (pageSize) => (
                        <SelectItem key={pageSize} value={pageSize.toString()}>
                          {pageSize}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRecipesPage(Math.max(1, recipesPage - 1))}
                  disabled={recipesPage === 1}
                  data-testid="button-recipes-prev-page"
                >
                  Previous
                </Button>
                {Array.from({ length: recipesTotalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <Button
                      key={page}
                      variant={recipesPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setRecipesPage(page)}
                      className={
                        recipesPage === page
                          ? "bg-green-500 hover:bg-green-600"
                          : ""
                      }
                      data-testid={`button-recipes-page-${page}`}
                    >
                      {page}
                    </Button>
                  ),
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setRecipesPage(Math.min(recipesTotalPages, recipesPage + 1))
                  }
                  disabled={recipesPage === recipesTotalPages}
                  data-testid="button-recipes-next-page"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {showAddCategoryModal && (
        <AddInventoryCategoryModal
          open={showAddCategoryModal}
          onClose={() => setShowAddCategoryModal(false)}
          branchId={branchId}
          onSuccess={() => {
            refetchCategories();
            queryClient.invalidateQueries({
              queryKey: ["inventory-categories", branchId],
            });
          }}
        />
      )}

      {showAddSupplierModal && (
        <AddInventorySupplierModal
          open={showAddSupplierModal}
          onClose={() => setShowAddSupplierModal(false)}
          branchId={branchId}
          onSuccess={() => {
            refetchSuppliers();
            queryClient.invalidateQueries({
              queryKey: ["inventory-suppliers", branchId],
            });
          }}
        />
      )}

      {showEditSupplierModal && selectedSupplier && (
        <AddInventorySupplierModal
          open={showEditSupplierModal}
          onClose={() => {
            setShowEditSupplierModal(false);
            setSelectedSupplier(null);
          }}
          branchId={branchId}
          supplier={selectedSupplier}
          onSuccess={() => {
            refetchSuppliers();
            queryClient.invalidateQueries({
              queryKey: ["inventory-suppliers", branchId],
            });
          }}
        />
      )}

      {showAddItemModal && (
        <AddInventoryItemModal
          open={showAddItemModal}
          onClose={() => setShowAddItemModal(false)}
          branchId={branchId}
          categories={simpleCategories}
          suppliers={suppliers}
          onSuccess={() => {
            refetchItems();
            queryClient.invalidateQueries({
              queryKey: ["inventory-items", branchId],
            });
          }}
        />
      )}

      {showEditItemModal && selectedItem && (
        <AddInventoryItemModal
          open={showEditItemModal}
          onClose={() => {
            setShowEditItemModal(false);
            setSelectedItem(null);
          }}
          branchId={branchId}
          item={selectedItem}
          categories={simpleCategories}
          suppliers={suppliers}
          onSuccess={() => {
            refetchItems();
            queryClient.invalidateQueries({
              queryKey: ["inventory-items", branchId],
            });
          }}
        />
      )}

      {showDeleteModal && deleteItem && (
        <SimpleDeleteModal
          open={showDeleteModal}
          onOpenChange={(open) => {
            if (!open) {
              setShowDeleteModal(false);
              setDeleteItem(null);
            }
          }}
          title={`Delete ${deleteItem.type === "category" ? "Category" : deleteItem.type === "supplier" ? "Supplier" : "Item"}`}
          description={`Are you sure you want to delete "${deleteItem.name}"? This action cannot be undone.`}
          itemName={deleteItem.name}
          onConfirm={handleDelete}
        />
      )}

      {showStockUpdateModal && selectedStockItem && (
        <StockUpdateModal
          open={showStockUpdateModal}
          onClose={() => {
            setShowStockUpdateModal(false);
            setSelectedStockItem(null);
          }}
          branchId={branchId}
          stockItem={selectedStockItem}
          onSuccess={() => {
            refetchStock();
            queryClient.invalidateQueries({
              queryKey: ["inventory-stock", branchId],
            });
            queryClient.invalidateQueries({
              queryKey: ["inventory-low-stock", branchId],
            });
          }}
        />
      )}

      {showPurchaseOrderModal && (
        <PurchaseOrderModal
          open={showPurchaseOrderModal}
          onClose={() => setShowPurchaseOrderModal(false)}
          branchId={branchId}
          onSuccess={() => {
            refetchPurchaseOrders();
            queryClient.invalidateQueries({
              queryKey: ["purchase-orders", branchId],
            });
          }}
        />
      )}

      {showPurchaseOrderViewModal && selectedPurchaseOrder && (
        <PurchaseOrderViewModal
          open={showPurchaseOrderViewModal}
          onClose={() => {
            setShowPurchaseOrderViewModal(false);
            setSelectedPurchaseOrder(null);
          }}
          orderId={selectedPurchaseOrder}
          onSuccess={() => {
            refetchPurchaseOrders();
            refetchStock();
            queryClient.invalidateQueries({
              queryKey: ["purchase-orders", branchId],
            });
            queryClient.invalidateQueries({
              queryKey: ["inventory-stock", branchId],
            });
            queryClient.invalidateQueries({
              queryKey: ["inventory-low-stock", branchId],
            });
          }}
        />
      )}

      {showRecipeModal && (
        <RecipeModal
          open={showRecipeModal}
          onClose={() => setShowRecipeModal(false)}
          branchId={branchId}
          onSuccess={() => {
            refetchRecipes();
            queryClient.invalidateQueries({ queryKey: ["recipes", branchId] });
          }}
        />
      )}

      {showEditRecipeModal && selectedRecipe && (
        <RecipeModal
          open={showEditRecipeModal}
          onClose={() => {
            setShowEditRecipeModal(false);
            setSelectedRecipe(null);
          }}
          branchId={branchId}
          recipe={selectedRecipe}
          onSuccess={() => {
            refetchRecipes();
            queryClient.invalidateQueries({ queryKey: ["recipes", branchId] });
          }}
        />
      )}

      {showStockWastageModal && (
        <StockWastageModal
          open={showStockWastageModal}
          onClose={() => setShowStockWastageModal(false)}
          branchId={branchId}
          inventoryItems={stock}
          onSuccess={() => {
            refetchWastage();
            refetchStock();
            queryClient.invalidateQueries({
              queryKey: [
                "inventory-wastage",
                branchId,
                wastageFromDate,
                wastageToDate,
              ],
            });
            queryClient.invalidateQueries({
              queryKey: ["inventory-stock", branchId],
            });
          }}
        />
      )}

      {showUtilityExpenseModal && (
        <UtilityExpenseModal
          open={showUtilityExpenseModal}
          onClose={() => setShowUtilityExpenseModal(false)}
          branchId={branchId}
          onSuccess={() => {
            refetchUtilityExpenses();
            queryClient.invalidateQueries({
              queryKey: ["utility-expenses", branchId],
            });
          }}
        />
      )}

      {showViewUtilityExpenseModal && selectedUtilityExpense && (
        <ViewUtilityExpenseModal
          open={showViewUtilityExpenseModal}
          onClose={() => {
            setShowViewUtilityExpenseModal(false);
            setSelectedUtilityExpense(null);
          }}
          expense={selectedUtilityExpense}
          onSuccess={() => {
            refetchUtilityExpenses();
            queryClient.invalidateQueries({
              queryKey: ["utility-expenses", branchId],
            });
          }}
        />
      )}
    </div>
  );
}
