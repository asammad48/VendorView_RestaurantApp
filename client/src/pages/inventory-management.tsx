import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLocation } from "wouter";
import { inventoryApi, branchApi } from "@/lib/apiRepository";
import AddInventoryCategoryModal from "@/components/add-inventory-category-modal";
import AddInventorySupplierModal from "@/components/add-inventory-supplier-modal";
import AddInventoryItemModal from "@/components/add-inventory-item-modal";
import SimpleDeleteModal from "@/components/simple-delete-modal";

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

export default function InventoryManagement() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("categories");
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [showEditSupplierModal, setShowEditSupplierModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<InventorySupplier | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem & { categoryId?: number; defaultSupplierId?: number } | null>(null);
  const [deleteItem, setDeleteItem] = useState<{ type: string; id: string; name: string } | null>(null);

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

  // Fetch inventory categories
  const { data: categories = [], isLoading: isLoadingCategories, refetch: refetchCategories } = useQuery({
    queryKey: ["inventory-categories", branchId],
    queryFn: async () => {
      const result = await inventoryApi.getInventoryCategories(branchId);
      return result as InventoryCategory[];
    },
    enabled: !!branchId,
  });

  // Fetch inventory suppliers
  const { data: suppliers = [], isLoading: isLoadingSuppliers, refetch: refetchSuppliers } = useQuery({
    queryKey: ["inventory-suppliers", branchId],
    queryFn: async () => {
      const result = await inventoryApi.getInventorySuppliers(branchId);
      return result as InventorySupplier[];
    },
    enabled: !!branchId,
  });

  // Fetch inventory items
  const { data: items = [], isLoading: isLoadingItems, refetch: refetchItems } = useQuery({
    queryKey: ["inventory-items", branchId],
    queryFn: async () => {
      const result = await inventoryApi.getInventoryItemsByBranch(branchId);
      return result as InventoryItem[];
    },
    enabled: !!branchId,
  });

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

  const handleDelete = () => {
    if (!deleteItem) return;
    
    if (deleteItem.type === 'category') {
      deleteCategoryMutation.mutate(parseInt(deleteItem.id));
    } else if (deleteItem.type === 'supplier') {
      deleteSupplierMutation.mutate(parseInt(deleteItem.id));
    } else if (deleteItem.type === 'item') {
      deleteItemMutation.mutate(parseInt(deleteItem.id));
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
        <TabsList className="grid grid-cols-3 w-full max-w-2xl" data-testid="inventory-tabs">
          <TabsTrigger value="categories" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
            Categories
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
            Suppliers
          </TabsTrigger>
          <TabsTrigger value="items" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
            Items
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
                              setSelectedItem(item as any);
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
    </div>
  );
}
