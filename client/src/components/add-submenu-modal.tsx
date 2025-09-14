import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRepository } from "@/lib/apiRepository";
import { createApiMutation, formatApiError } from "@/lib/errorHandling";
import { SubMenu, InsertSubMenu } from "@/types/schema";

const addSubMenuSchema = z.object({
  name: z.string().min(1, "SubMenu name is required"),
  price: z.number().min(0, "Price must be positive"),
  branchId: z.number().min(1, "Branch ID is required"),
});

type AddSubMenuFormData = z.infer<typeof addSubMenuSchema>;

interface AddSubMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchId: number;
  editSubMenu?: SubMenu;
}

export default function AddSubMenuModal({ isOpen, onClose, branchId, editSubMenu }: AddSubMenuModalProps) {
  const isEditMode = !!editSubMenu;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<AddSubMenuFormData>({
    resolver: zodResolver(addSubMenuSchema),
    defaultValues: {
      name: editSubMenu?.name || "",
      price: editSubMenu?.price || 0,
      branchId: branchId,
    },
  });

  const createSubMenuMutation = useMutation({
    mutationFn: createApiMutation<SubMenu, InsertSubMenu>(async (data: InsertSubMenu) => {
      return await apiRepository.call<SubMenu>(
        'createSubMenu',
        'POST',
        data
      );
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`submenus-branch-${branchId}`] });
      toast({ title: "SubMenu added successfully" });
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error adding submenu",
        description: formatApiError(error) || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const updateSubMenuMutation = useMutation({
    mutationFn: createApiMutation<SubMenu, { name: string; price: number }>(async (data: { name: string; price: number }) => {
      return await apiRepository.call<SubMenu>(
        'updateSubMenu',
        'PUT',
        data,
        undefined,
        true,
        { id: editSubMenu!.id }
      );
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`submenus-branch-${branchId}`] });
      toast({ title: "SubMenu updated successfully" });
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error updating submenu",
        description: formatApiError(error) || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: AddSubMenuFormData) => {
    try {
      if (isEditMode) {
        updateSubMenuMutation.mutate({
          name: data.name,
          price: data.price,
        });
      } else {
        createSubMenuMutation.mutate({
          name: data.name,
          price: data.price,
          branchId: data.branchId,
        });
      }
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {isEditMode ? "Edit SubMenu" : "Add New SubMenu"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SubMenu Name *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter submenu name" 
                      {...field}
                      data-testid="input-submenu-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price *</FormLabel>
                  <FormControl>
                    <Input 
                      type="number"
                      step="0.01"
                      placeholder="0.00" 
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      data-testid="input-submenu-price"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                data-testid="button-cancel-submenu"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="bg-green-500 hover:bg-green-600 text-white"
                disabled={createSubMenuMutation.isPending || updateSubMenuMutation.isPending}
                data-testid="button-submit-submenu"
              >
                {createSubMenuMutation.isPending || updateSubMenuMutation.isPending
                  ? (isEditMode ? "Updating..." : "Adding...") 
                  : (isEditMode ? "Update SubMenu" : "Add SubMenu")
                }
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}