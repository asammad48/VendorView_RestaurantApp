import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { inventoryApi } from "@/lib/apiRepository";

const supplierSchema = z.object({
  name: z.string().min(1, "Supplier name is required"),
  contactPerson: z.string().min(1, "Contact person is required"),
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().email("Invalid email address"),
  address: z.string().min(1, "Address is required"),
});

type SupplierFormData = z.infer<typeof supplierSchema>;

interface InventorySupplier {
  id: number;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  branchId: number;
}

interface AddInventorySupplierModalProps {
  open: boolean;
  onClose: () => void;
  branchId: number;
  supplier?: InventorySupplier;
  onSuccess?: () => void;
}

export default function AddInventorySupplierModal({ open, onClose, branchId, supplier, onSuccess }: AddInventorySupplierModalProps) {
  const { toast } = useToast();
  const isEdit = !!supplier;
  
  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: supplier ? {
      name: supplier.name,
      contactPerson: supplier.contactPerson,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
    } : {
      name: "",
      contactPerson: "",
      phone: "",
      email: "",
      address: "",
    },
  });

  const createSupplierMutation = useMutation({
    mutationFn: (data: { name: string; contactPerson: string; phone: string; email: string; address: string; branchId: number }) => 
      inventoryApi.createInventorySupplier(data),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Supplier created successfully",
      });
      onSuccess?.();
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create supplier",
        variant: "destructive",
      });
    },
  });

  const updateSupplierMutation = useMutation({
    mutationFn: (data: { id: number; data: { name: string; contactPerson: string; phone: string; email: string; address: string } }) => 
      inventoryApi.updateInventorySupplier(data.id, data.data),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Supplier updated successfully",
      });
      onSuccess?.();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update supplier",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SupplierFormData) => {
    if (isEdit && supplier) {
      updateSupplierMutation.mutate({
        id: supplier.id,
        data: {
          name: data.name,
          contactPerson: data.contactPerson,
          phone: data.phone,
          email: data.email,
          address: data.address,
        },
      });
    } else {
      createSupplierMutation.mutate({
        ...data,
        branchId,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]" data-testid="add-supplier-modal">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Supplier" : "Add Supplier"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Supplier Name</Label>
              <Input
                id="name"
                {...form.register("name")}
                placeholder="Enter supplier name"
                data-testid="input-supplier-name"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="contactPerson">Contact Person</Label>
              <Input
                id="contactPerson"
                {...form.register("contactPerson")}
                placeholder="Enter contact person"
                data-testid="input-contact-person"
              />
              {form.formState.errors.contactPerson && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.contactPerson.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                {...form.register("phone")}
                placeholder="Enter phone number"
                data-testid="input-phone"
              />
              {form.formState.errors.phone && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.phone.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...form.register("email")}
                placeholder="Enter email"
                data-testid="input-email"
              />
              {form.formState.errors.email && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.email.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              {...form.register("address")}
              placeholder="Enter address"
              data-testid="input-address"
            />
            {form.formState.errors.address && (
              <p className="text-sm text-red-600 mt-1">{form.formState.errors.address.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-green-500 hover:bg-green-600"
              disabled={createSupplierMutation.isPending || updateSupplierMutation.isPending}
              data-testid="button-submit"
            >
              {(createSupplierMutation.isPending || updateSupplierMutation.isPending) 
                ? (isEdit ? "Updating..." : "Adding...") 
                : (isEdit ? "Update Supplier" : "Add Supplier")
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
