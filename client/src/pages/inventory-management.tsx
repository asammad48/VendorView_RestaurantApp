import { useState, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, Edit, Eye, Check, X, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLocation } from "wouter";
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
import { Badge } from "@/components/ui/badge";
import { Recipe, RecipeDetail } from "@/types/schema";
import { Input } from "@/components/ui/input";
import { format, subMonths, addDays } from "date-fns";

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

const purchaseOrderStatusMap: { [key: number]: { label: string; variant: "default" | "secondary" | "outline" | "destructive" } } = {
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
  const [wastageFromDate, setWastageFromDate] = useState(() => format(subMonths(new Date(), 3), 'yyyy-MM-dd'));
  const [wastageToDate, setWastageToDate] = useState(() => format(addDays(new Date(), 1), 'yyyy-MM-dd'));
  
  // Modal states
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [showEditSupplierModal, setShowEditSupplierModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStockUpdateModal, setShowStockUpdateModal] = useState(false);
  const [showPurchaseOrderModal, setShowPurchaseOrderModal] = useState(false);
  const [showPurchaseOrderViewModal, setShowPurchaseOrderViewModal] = useState(false);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [showEditRecipeModal, setShowEditRecipeModal] = useState(false);
  const [showStockWastageModal, setShowStockWastageModal] = useState(false);
  const [showUtilityExpenseModal, setShowUtilityExpenseModal] = useState(false);
  const [showViewUtilityExpenseModal, setShowViewUtilityExpenseModal] = useState(false);
  
  // Selection states
  const [selectedSupplier, setSelectedSupplier] = useState<InventorySupplier | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem & { categoryId?: number; defaultSupplierId?: number } | null>(null);
  const [deleteItem, setDeleteItem] = useState<{ type: string; id: string; name: string } | null>(null);
  const [selectedStockItem, setSelectedStockItem] = useState<StockItem | null>(null);
  const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState<number | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeDetail | null>(null);
  const [selectedUtilityExpense, setSelectedUtilityExpense] = useState<UtilityExpense | null>(null);

  const branchId = parseInt(new URLSearchParams(window.location.search).get('branchId') || '0');

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
  const { data: categories = [], isLoading: isLoadingCategories, refetch: refetchCategories } = useQuery({
    queryKey: ["inventory-categories", branchId],
    queryFn: async () => {
      const result = await inventoryApi.getInventoryCategories(branchId);
      return result as InventoryCategory[];
    },
    enabled: !!branchId && activeTab === "categories",
  });

  // Fetch inventory suppliers (lazy load)
  const { data: suppliers = [], isLoading: isLoadingSuppliers, refetch: refetchSuppliers } = useQuery({
    queryKey: ["inventory-suppliers", branchId],
    queryFn: async () => {
      const result = await inventoryApi.getInventorySuppliers(branchId);
      return result as InventorySupplier[];
    },
    enabled: !!branchId && activeTab === "suppliers",
  });

  // Fetch inventory items (lazy load)
  const { data: items = [], isLoading: isLoadingItems, refetch: refetchItems } = useQuery({
    queryKey: ["inventory-items", branchId],
    queryFn: async () => {
      const result = await inventoryApi.getInventoryItemsByBranch(branchId);
      return result as InventoryItem[];
    },
    enabled: !!branchId && activeTab === "items",
  });

  // Fetch stock (lazy load)
  const { data: stock = [], isLoading: isLoadingStock, refetch: refetchStock } = useQuery({
    queryKey: ["inventory-stock", branchId],
    queryFn: async () => {
      const result = await inventoryApi.getInventoryStockByBranch(branchId);
      return result as StockItem[];
    },
    enabled: !!branchId && activeTab === "stock" && stockSubTab === "manage-stock",
  });

  // Fetch low stock (lazy load)
  const { data: lowStock = [], isLoading: isLoadingLowStock, refetch: refetchLowStock } = useQuery({
    queryKey: ["inventory-low-stock", branchId],
    queryFn: async () => {
      const result = await inventoryApi.getInventoryLowStockByBranch(branchId);
      return result as LowStockItem[];
    },
    enabled: !!branchId && activeTab === "stock" && stockSubTab === "low-stock",
  });

  // Fetch purchase orders (lazy load)
  const { data: purchaseOrders = [], isLoading: isLoadingPurchaseOrders, refetch: refetchPurchaseOrders } = useQuery({
    queryKey: ["purchase-orders", branchId],
    queryFn: async () => {
      const result = await inventoryApi.getPurchaseOrdersByBranch(branchId);
      return result as PurchaseOrder[];
    },
    enabled: !!branchId && activeTab === "stock" && stockSubTab === "purchase-orders",
  });

  // Fetch wastage (lazy load)
  const { data: wastageItems = [], isLoading: isLoadingWastage, refetch: refetchWastage } = useQuery({
    queryKey: ["inventory-wastage", branchId, wastageFromDate, wastageToDate],
    queryFn: async () => {
      const result = await inventoryApi.getInventoryWastageByBranch(branchId, wastageFromDate, wastageToDate);
      return result as WastageItem[];
    },
    enabled: !!branchId && activeTab === "stock" && stockSubTab === "stock-wastage",
  });

  // Fetch utility expenses (lazy load)
  const { data: utilityExpenses = [], isLoading: isLoadingUtilityExpenses, refetch: refetchUtilityExpenses } = useQuery({
    queryKey: ["utility-expenses", branchId],
    queryFn: async () => {
      const result = await inventoryApi.getUtilityExpensesByBranch(branchId);
      return result as UtilityExpense[];
    },
    enabled: !!branchId && activeTab === "expense",
  });

  // Fetch recipes (lazy load)
  const { data: recipes = [], isLoading: isLoadingRecipes, refetch: refetchRecipes } = useQuery<Recipe[]>({
    queryKey: ["recipes", branchId],
    queryFn: async () => {
      return await inventoryApi.getRecipesByBranch(branchId);
    },
    enabled: !!branchId && activeTab === "recipes",
  });

  // Refetch data when tab changes
  useEffect(() => {
    if (activeTab === "categories") refetchCategories();
    if (activeTab === "suppliers") refetchSuppliers();
    if (activeTab === "items") refetchItems();
    if (activeTab === "stock" && stockSubTab === "manage-stock") refetchStock();
    if (activeTab === "stock" && stockSubTab === "low-stock") refetchLowStock();
    if (activeTab === "stock" && stockSubTab === "purchase-orders") refetchPurchaseOrders();
    if (activeTab === "stock" && stockSubTab === "stock-wastage") refetchWastage();
    if (activeTab === "expense") refetchUtilityExpenses();
    if (activeTab === "recipes") refetchRecipes();
  }, [activeTab, stockSubTab]);

  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: (categoryId: number) => inventoryApi.deleteInventoryCategory(categoryId),
    onSuccess: () => {
      toast({ title: "Success", description: "Category deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["inventory-categories", branchId] });
      refetchCategories();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete category", variant: "destructive" });
    },
  });

  // Delete supplier mutation
  const deleteSupplierMutation = useMutation({
    mutationFn: (supplierId: number) => inventoryApi.deleteInventorySupplier(supplierId),
    onSuccess: () => {
      toast({ title: "Success", description: "Supplier deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["inventory-suppliers", branchId] });
      refetchSuppliers();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete supplier", variant: "destructive" });
    },
  });

  // Delete item mutation
  const deleteItemMutation = useMutation({
    mutationFn: (itemId: number) => inventoryApi.deleteInventoryItem(itemId),
    onSuccess: () => {
      toast({ title: "Success", description: "Item deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["inventory-items", branchId] });
      refetchItems();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete item", variant: "destructive" });
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
      toast({ title: "Error", description: error.message || "Failed to delete recipe", variant: "destructive" });
    },
  });

  // Delete utility expense mutation
  const deleteUtilityExpenseMutation = useMutation({
    mutationFn: (expenseId: number) => inventoryApi.deleteUtilityExpense(expenseId),
    onSuccess: () => {
      toast({ title: "Success", description: "Utility expense deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["utility-expenses", branchId] });
      refetchUtilityExpenses();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete utility expense", variant: "destructive" });
    },
  });

  const handleDelete = () => {
    if (!deleteItem) return;
    
    if (deleteItem.type === 'category') {
      deleteCategoryMutation.mutate(parseInt(deleteItem.id));
    } else if (deleteItem.type === 'supplier') {
      deleteSupplierMutation.mutate(parseInt(deleteItem.id));
    } else if (deleteItem.type === 'item') {
      deleteItemMutation.mutate(parseInt(deleteItem.id));
    } else if (deleteItem.type === 'recipe') {
      deleteRecipeMutation.mutate(parseInt(deleteItem.id));
    } else if (deleteItem.type === 'utility-expense') {
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
            <h1 className="text-2xl font-semibold text-gray-900" data-testid="page-title">
              Inventory Management
            </h1>
            {branchData && (
              <p className="text-sm text-gray-600">{branchData.name}</p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-6 w-full" data-testid="inventory-tabs">
          <TabsTrigger value="categories" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
            Categories
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
            Suppliers
          </TabsTrigger>
          <TabsTrigger value="items" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
            Items
          </TabsTrigger>
          <TabsTrigger value="stock" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
            Stock
          </TabsTrigger>
          <TabsTrigger value="expense" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
            Expense Management
          </TabsTrigger>
          <TabsTrigger value="recipes" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
            Recipes
          </TabsTrigger>
        </TabsList>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-6">
          <div className="flex justify-end">
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
                  <TableHead>Category Name</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingCategories ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-8">
                      Loading categories...
                    </TableCell>
                  </TableRow>
                ) : categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-8 text-gray-500">
                      No categories found
                    </TableCell>
                  </TableRow>
                ) : (
                  categories.map((category) => (
                    <TableRow key={category.id} data-testid={`category-row-${category.id}`}>
                      <TableCell className="font-medium" data-testid={`category-name-${category.id}`}>
                        {category.name}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDeleteItem({ type: 'category', id: category.id.toString(), name: category.name });
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
          </div>
        </TabsContent>

        {/* Suppliers Tab */}
        <TabsContent value="suppliers" className="space-y-6">
          <div className="flex justify-end">
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
                  <TableHead>Name</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingSuppliers ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Loading suppliers...
                    </TableCell>
                  </TableRow>
                ) : suppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No suppliers found
                    </TableCell>
                  </TableRow>
                ) : (
                  suppliers.map((supplier) => (
                    <TableRow key={supplier.id} data-testid={`supplier-row-${supplier.id}`}>
                      <TableCell className="font-medium" data-testid={`supplier-name-${supplier.id}`}>
                        {supplier.name}
                      </TableCell>
                      <TableCell data-testid={`supplier-contact-${supplier.id}`}>
                        {supplier.contactPerson}
                      </TableCell>
                      <TableCell data-testid={`supplier-phone-${supplier.id}`}>
                        {supplier.phone}
                      </TableCell>
                      <TableCell data-testid={`supplier-email-${supplier.id}`}>
                        {supplier.email}
                      </TableCell>
                      <TableCell data-testid={`supplier-address-${supplier.id}`}>
                        {supplier.address}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedSupplier(supplier);
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
                              setDeleteItem({ type: 'supplier', id: supplier.id.toString(), name: supplier.name });
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
          </div>
        </TabsContent>

        {/* Items Tab */}
        <TabsContent value="items" className="space-y-6">
          <div className="flex justify-end">
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
                  <TableHead>Item Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Reorder Level</TableHead>
                  <TableHead>Default Supplier</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingItems ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Loading items...
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No items found
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.id} data-testid={`item-row-${item.id}`}>
                      <TableCell className="font-medium" data-testid={`item-name-${item.id}`}>
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
                        {item.defaultSupplierName || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const category = categories.find(c => c.name === item.categoryName);
                              const supplier = suppliers.find(s => s.name === item.defaultSupplierName);
                              setSelectedItem({
                                ...item,
                                categoryId: category?.id,
                                defaultSupplierId: supplier?.id,
                              });
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
                              setDeleteItem({ type: 'item', id: item.id.toString(), name: item.name });
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
          </div>
        </TabsContent>

        {/* Stock Tab with Sub-tabs */}
        <TabsContent value="stock" className="space-y-6">
          <Tabs value={stockSubTab} onValueChange={setStockSubTab} className="space-y-6">
            <TabsList className="grid grid-cols-4 w-full" data-testid="stock-sub-tabs">
              <TabsTrigger value="manage-stock" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
                Manage Stock
              </TabsTrigger>
              <TabsTrigger value="low-stock" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
                Low Stock
              </TabsTrigger>
              <TabsTrigger value="purchase-orders" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
                Purchase Orders
              </TabsTrigger>
              <TabsTrigger value="stock-wastage" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
                Stock Wastage
              </TabsTrigger>
            </TabsList>

            {/* Manage Stock Sub-tab */}
            <TabsContent value="manage-stock" className="space-y-6">
              <div className="bg-white rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Current Stock</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingStock ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8">
                          Loading stock...
                        </TableCell>
                      </TableRow>
                    ) : stock.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                          No stock found
                        </TableCell>
                      </TableRow>
                    ) : (
                      stock.map((item) => (
                        <TableRow key={item.inventoryItemId} data-testid={`stock-row-${item.inventoryItemId}`}>
                          <TableCell className="font-medium" data-testid={`stock-name-${item.inventoryItemId}`}>
                            {item.itemName}
                          </TableCell>
                          <TableCell data-testid={`stock-current-${item.inventoryItemId}`}>
                            {item.currentStock}
                          </TableCell>
                          <TableCell data-testid={`stock-unit-${item.inventoryItemId}`}>
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
              </div>
            </TabsContent>

            {/* Low Stock Sub-tab */}
            <TabsContent value="low-stock" className="space-y-6">
              <div className="bg-white rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Current Stock</TableHead>
                      <TableHead>Reorder Level</TableHead>
                      <TableHead>Unit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingLowStock ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8">
                          Loading low stock...
                        </TableCell>
                      </TableRow>
                    ) : lowStock.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                          No low stock items
                        </TableCell>
                      </TableRow>
                    ) : (
                      lowStock.map((item) => (
                        <TableRow key={item.inventoryItemId} data-testid={`low-stock-row-${item.inventoryItemId}`}>
                          <TableCell className="font-medium" data-testid={`low-stock-name-${item.inventoryItemId}`}>
                            {item.itemName}
                          </TableCell>
                          <TableCell data-testid={`low-stock-current-${item.inventoryItemId}`}>
                            <span className="text-red-600 font-semibold">{item.currentStock}</span>
                          </TableCell>
                          <TableCell data-testid={`low-stock-reorder-${item.inventoryItemId}`}>
                            {item.reorderLevel}
                          </TableCell>
                          <TableCell data-testid={`low-stock-unit-${item.inventoryItemId}`}>
                            {item.unit}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Purchase Orders Sub-tab */}
            <TabsContent value="purchase-orders" className="space-y-6">
              <div className="flex justify-end">
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
                      <TableHead>Supplier</TableHead>
                      <TableHead>Order Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingPurchaseOrders ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          Loading purchase orders...
                        </TableCell>
                      </TableRow>
                    ) : purchaseOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          No purchase orders found
                        </TableCell>
                      </TableRow>
                    ) : (
                      purchaseOrders.map((order) => (
                        <TableRow key={order.id} data-testid={`purchase-order-row-${order.id}`}>
                          <TableCell className="font-medium" data-testid={`purchase-order-id-${order.id}`}>
                            #{order.id}
                          </TableCell>
                          <TableCell data-testid={`purchase-order-supplier-${order.id}`}>
                            {order.supplierName}
                          </TableCell>
                          <TableCell data-testid={`purchase-order-date-${order.id}`}>
                            {new Date(order.orderDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell data-testid={`purchase-order-status-${order.id}`}>
                            <Badge variant={purchaseOrderStatusMap[order.status]?.variant || "default"}>
                              {purchaseOrderStatusMap[order.status]?.label || "Unknown"}
                            </Badge>
                          </TableCell>
                          <TableCell data-testid={`purchase-order-amount-${order.id}`}>
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
                      <TableHead>Item Name</TableHead>
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
                        <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                          No wastage records found
                        </TableCell>
                      </TableRow>
                    ) : (
                      wastageItems.map((wastage) => (
                        <TableRow key={wastage.id} data-testid={`wastage-row-${wastage.id}`}>
                          <TableCell data-testid={`wastage-date-${wastage.id}`}>
                            {new Date(wastage.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-medium" data-testid={`wastage-item-${wastage.id}`}>
                            {wastage.itemName}
                          </TableCell>
                          <TableCell data-testid={`wastage-quantity-${wastage.id}`}>
                            {wastage.quantity}
                          </TableCell>
                          <TableCell data-testid={`wastage-reason-${wastage.id}`}>
                            {wastage.reason}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Expense Management Tab */}
        <TabsContent value="expense" className="space-y-6">
          <div className="flex justify-end">
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
                  <TableHead>Utility Type</TableHead>
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
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      No utility expenses found
                    </TableCell>
                  </TableRow>
                ) : (
                  utilityExpenses.map((expense) => (
                    <TableRow key={expense.id} data-testid={`expense-row-${expense.id}`}>
                      <TableCell className="font-medium" data-testid={`expense-type-${expense.id}`}>
                        {expense.utilityType}
                      </TableCell>
                      <TableCell data-testid={`expense-usage-${expense.id}`}>
                        {expense.usageUnit}
                      </TableCell>
                      <TableCell data-testid={`expense-unitcost-${expense.id}`}>
                        ${expense.unitCost.toFixed(2)}
                      </TableCell>
                      <TableCell data-testid={`expense-totalcost-${expense.id}`}>
                        ${expense.totalCost.toFixed(2)}
                      </TableCell>
                      <TableCell data-testid={`expense-billnumber-${expense.id}`}>
                        {expense.billNumber}
                      </TableCell>
                      <TableCell data-testid={`expense-period-${expense.id}`}>
                        {new Date(expense.billingPeriodStart).toLocaleDateString()} - {new Date(expense.billingPeriodEnd).toLocaleDateString()}
                      </TableCell>
                      <TableCell data-testid={`expense-status-${expense.id}`}>
                        <Badge variant={expense.isActive ? "default" : "secondary"}>
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
                              setDeleteItem({ type: 'utility-expense', id: expense.id.toString(), name: expense.utilityType });
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
          </div>
        </TabsContent>

        {/* Recipes Tab */}
        <TabsContent value="recipes" className="space-y-6">
          <div className="flex justify-end">
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
                  <TableHead>Name</TableHead>
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
                    <TableCell colSpan={3} className="text-center text-gray-500">
                      No recipes found
                    </TableCell>
                  </TableRow>
                ) : (
                  recipes.map((recipe) => (
                    <TableRow key={recipe.id}>
                      <TableCell className="font-medium" data-testid={`recipe-name-${recipe.id}`}>
                        {recipe.name}
                      </TableCell>
                      <TableCell data-testid={`recipe-type-${recipe.id}`}>
                        {recipe.type}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              const recipeDetails = await inventoryApi.getRecipeById(recipe.id);
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
                              setDeleteItem({ type: 'recipe', id: recipe.id.toString(), name: recipe.name });
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
            queryClient.invalidateQueries({ queryKey: ["inventory-categories", branchId] });
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
            queryClient.invalidateQueries({ queryKey: ["inventory-suppliers", branchId] });
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
            queryClient.invalidateQueries({ queryKey: ["inventory-suppliers", branchId] });
          }}
        />
      )}

      {showAddItemModal && (
        <AddInventoryItemModal
          open={showAddItemModal}
          onClose={() => setShowAddItemModal(false)}
          branchId={branchId}
          categories={categories}
          suppliers={suppliers}
          onSuccess={() => {
            refetchItems();
            queryClient.invalidateQueries({ queryKey: ["inventory-items", branchId] });
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
          categories={categories}
          suppliers={suppliers}
          onSuccess={() => {
            refetchItems();
            queryClient.invalidateQueries({ queryKey: ["inventory-items", branchId] });
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
          title={`Delete ${deleteItem.type === 'category' ? 'Category' : deleteItem.type === 'supplier' ? 'Supplier' : 'Item'}`}
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
            queryClient.invalidateQueries({ queryKey: ["inventory-stock", branchId] });
            queryClient.invalidateQueries({ queryKey: ["inventory-low-stock", branchId] });
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
            queryClient.invalidateQueries({ queryKey: ["purchase-orders", branchId] });
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
            queryClient.invalidateQueries({ queryKey: ["purchase-orders", branchId] });
            queryClient.invalidateQueries({ queryKey: ["inventory-stock", branchId] });
            queryClient.invalidateQueries({ queryKey: ["inventory-low-stock", branchId] });
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
            queryClient.invalidateQueries({ queryKey: ["inventory-wastage", branchId, wastageFromDate, wastageToDate] });
            queryClient.invalidateQueries({ queryKey: ["inventory-stock", branchId] });
          }}
        />
      )}
    </div>
  );
}
