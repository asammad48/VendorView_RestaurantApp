import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { UserListItem, UserDetailsResponse } from "@/types/user";
import { X, Eye, EyeOff } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { genericApi, userApi } from "@/lib/apiRepository";
import { createApiMutation, createApiQuery, formatApiError } from "@/lib/errorHandling";


// Create schema conditionally based on editing mode
const createUserFormSchema = (isEditing: boolean) => z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  password: isEditing 
    ? z.string().optional() 
    : z.string().min(6, "Password must be at least 6 characters"),
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
  role: z.string().min(1, "Role is required"),
  entityId: z.string().min(1, "Entity is required"),
  assignedBranch: z.string().min(1, "Assigned branch is required"),
  image: z.string().optional(),
});

type UserFormData = z.infer<ReturnType<typeof createUserFormSchema>>;

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingUser?: UserListItem | null;
}

// Interfaces for API responses
interface Role {
  id: number;
  name: string;
}

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

export default function AddUserModal({ isOpen, onClose, editingUser }: AddUserModalProps) {
  const [imageFile, setImageFile] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!editingUser;

  // Fetch roles - ALWAYS REFRESH when modal opens
  const { data: roles, isLoading: rolesLoading, error: rolesError } = useQuery<Role[]>({
    queryKey: ["roles", isOpen], // Include 'isOpen' to refresh when modal opens
    queryFn: createApiQuery<Role[]>(() => genericApi.getRoles() as Promise<{ data: Role[], error?: string, status: number }>),
    enabled: isOpen,
    staleTime: 0, // Always fetch fresh data when modal opens
    retry: 2,
  });

  // Fetch entities and branches in one call - ALWAYS REFRESH when modal opens
  const { data: entitiesAndBranches, isLoading: entitiesLoading, error: entitiesError } = useQuery<EntitiesAndBranchesResponse>({
    queryKey: ["entities-and-branches", isOpen], // Include 'isOpen' to refresh when modal opens
    queryFn: createApiQuery<EntitiesAndBranchesResponse>(() => genericApi.getEntitiesAndBranches() as Promise<{ data: EntitiesAndBranchesResponse, error?: string, status: number }>),
    enabled: isOpen,
    staleTime: 0, // Always fetch fresh data when modal opens
    retry: 2,
  });

  // Fetch user details when editing - ALWAYS REFRESH when modal opens
  const { data: userDetails, isLoading: userDetailsLoading, error: userDetailsError } = useQuery<UserDetailsResponse>({
    queryKey: ["user-details", editingUser?.id, isOpen], // Include 'isOpen' to refresh when modal opens
    queryFn: createApiQuery<UserDetailsResponse>(() => {
      if (!editingUser?.id) throw new Error('No user ID provided');
      return userApi.getUserById(editingUser.id.toString()) as Promise<{ data: UserDetailsResponse, error?: string, status: number }>;
    }),
    enabled: isOpen && isEditing && !!editingUser?.id,
    staleTime: 0, // Always fetch fresh data when modal opens for editing
    retry: 2,
  });

  // Extract entities and branches from the response
  const entities = entitiesAndBranches?.entities || [];
  const allBranches = entitiesAndBranches?.branches || [];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UserFormData>({
    resolver: zodResolver(createUserFormSchema(isEditing)),
  });

  // Reset form when modal opens/closes or when user details are loaded - MODAL BEHAVIOR IMPLEMENTATION
  React.useEffect(() => {
    if (isOpen) {
      setIsFormLoading(true);
      const defaultValues = isEditing && userDetails
        ? {
            name: userDetails.name || "",
            email: userDetails.email || "",
            password: "", // Password not required for editing
            phoneNumber: userDetails.mobileNumber || "",
            role: userDetails.roleId?.toString() || "",
            entityId: userDetails.entityId?.toString() || "",
            assignedBranch: userDetails.branchId?.toString() || "",
            image: userDetails.profilePicture || "",
          }
        : {
            name: "",
            email: "",
            password: "",
            phoneNumber: "",
            role: "",
            entityId: "",
            assignedBranch: "",
            image: "",
          };
      
      reset(defaultValues);
      if (isEditing && userDetails?.profilePicture) {
        setImageFile(userDetails.profilePicture);
      } else {
        setImageFile("");
      }
      
      // Delay to allow form population to complete before user interactions
      setTimeout(() => {
        setIsFormLoading(false);
      }, 100);
    } else {
      reset();
      setImageFile("");
      setIsFormLoading(false);
    }
  }, [isOpen, isEditing, userDetails, reset]);

  const roleValue = watch("role");
  const entityValue = watch("entityId");
  const branchValue = watch("assignedBranch");

  // Filter branches based on selected entity
  const filteredBranches = entityValue ? allBranches.filter(branch => branch.entityId === parseInt(entityValue)) : [];

  const createUserMutation = useMutation({
    mutationFn: createApiMutation<any, UserFormData>(async (data: UserFormData) => {
      if (isEditing && editingUser?.id) {
        // For editing - use PUT method with JSON payload
        const updatePayload = {
          id: editingUser.id,
          name: data.name,
          mobileNumber: data.phoneNumber,
          roleId: parseInt(data.role),
          branchId: parseInt(data.assignedBranch),
        };

        const response = await userApi.updateUser(updatePayload);
        return response; // Let createApiMutation handle errors
      } else {
        // For creating - use POST method with FormData
        const formData = new FormData();
        formData.append('Email', data.email);
        formData.append('Name', data.name);
        formData.append('Password', data.password || '');
        formData.append('MobileNumber', data.phoneNumber);
        formData.append('RoleId', data.role);
        formData.append('BranchId', data.assignedBranch);
        
        // Handle profile picture
        if (data.image && data.image.startsWith('data:')) {
          // Convert base64 to blob using fetch (this is for data URL conversion, not API call)
          const fetchResponse = await fetch(data.image);
          const blob = await fetchResponse.blob();
          formData.append('ProfilePicture', blob, 'profile.png');
        }

        return await userApi.createUser(formData); // Let createApiMutation handle errors
      }
    }),
    onSuccess: (responseData: any) => {
      toast({
        title: "Success", 
        description: `User "${responseData.name}" has been ${isEditing ? 'updated' : 'created'} successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      reset();
      setImageFile("");
      setShowPassword(false);
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: formatApiError(error) || `Failed to ${isEditing ? 'update' : 'create'} user. Please try again.`,
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = e.target?.result as string;
          setImageFile(base64);
          setValue("image", base64);
        };
        reader.readAsDataURL(file);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please select an image file.",
          variant: "destructive",
        });
      }
    }
  };

  const onSubmit = (data: UserFormData) => {
    createUserMutation.mutate(data);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto" data-testid="add-user-modal">
      <div className="min-h-screen w-full flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6 bg-white relative my-8 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          data-testid="button-close-modal"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="mb-6">
          <h2 className="text-xl font-semibold text-center" data-testid="modal-title">
            {isEditing ? "Edit User" : "Add User"}
          </h2>
          {(rolesError || entitiesError || userDetailsError) && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">
                {rolesError && "Failed to load roles. "}
                {entitiesError && "Failed to load entities and branches. "}
                {userDetailsError && "Failed to load user details. "}
                Please try again.
              </p>
            </div>
          )}
          {(rolesLoading || entitiesLoading || (isEditing && userDetailsLoading)) && (
            <div className="mt-2 p-3 text-center text-sm text-gray-600">
              Loading {isEditing ? "user details and " : ""}form data...
            </div>
          )}
        </div>

        {/* Only show form when required data is loaded */}
        {(!rolesLoading && !entitiesLoading && (!isEditing || !userDetailsLoading)) && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name" className="text-sm font-medium">
                Name
              </Label>
              <Input
                id="name"
                {...register("name")}
                className="mt-1"
                data-testid="input-name"
              />
              {errors.name && (
                <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                className="mt-1"
                data-testid="input-email"
                disabled={isEditing}
              />
              {errors.email && (
                <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
              )}
            </div>
          </div>

          <div className={`grid ${isEditing ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
            {!isEditing && (
              <div>
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    {...register("password")}
                    className="pr-10"
                    data-testid="input-password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-600 mt-1">{errors.password.message}</p>
                )}
              </div>
            )}

            <div>
              <Label htmlFor="phoneNumber" className="text-sm font-medium">
                Phone Number
              </Label>
              <Input
                id="phoneNumber"
                {...register("phoneNumber")}
                className="mt-1"
                data-testid="input-phone"
              />
              {errors.phoneNumber && (
                <p className="text-sm text-red-600 mt-1">{errors.phoneNumber.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="role" className="text-sm font-medium">
                Role
              </Label>
              <Select value={roleValue} onValueChange={(value) => setValue("role", value)}>
                <SelectTrigger className="mt-1" data-testid="select-role">
                  <SelectValue placeholder={rolesLoading ? "Loading roles..." : "Select role"} />
                </SelectTrigger>
                <SelectContent>
                  {roles?.map((role) => (
                    <SelectItem key={role.id} value={role.id.toString()} data-testid={`option-role-${role.id}`}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.role && (
                <p className="text-sm text-red-600 mt-1">{errors.role.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="entityId" className="text-sm font-medium">
                Entity
              </Label>
              <Select value={entityValue} onValueChange={(value) => {
                setValue("entityId", value);
                // Only clear branch selection if not during initial form loading
                if (!isFormLoading) {
                  setValue("assignedBranch", "");
                }
              }}>
                <SelectTrigger className="mt-1" data-testid="select-entity">
                  <SelectValue placeholder={entitiesLoading ? "Loading entities..." : "Select entity"} />
                </SelectTrigger>
                <SelectContent>
                  {entities.map((entity) => (
                    <SelectItem key={entity.id} value={entity.id.toString()} data-testid={`option-entity-${entity.id}`}>
                      {entity.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.entityId && (
                <p className="text-sm text-red-600 mt-1">{errors.entityId.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="assignedBranch" className="text-sm font-medium">
              Assigned Branch
            </Label>
            <Select 
              value={branchValue} 
              onValueChange={(value) => setValue("assignedBranch", value)}
              disabled={!entityValue || entitiesLoading}
            >
              <SelectTrigger className="mt-1" data-testid="select-branch">
                <SelectValue placeholder={!entityValue ? "Select entity first" : "Select branch"} />
              </SelectTrigger>
              <SelectContent>
                {filteredBranches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id.toString()} data-testid={`option-branch-${branch.id}`}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.assignedBranch && (
              <p className="text-sm text-red-600 mt-1">{errors.assignedBranch.message}</p>
            )}
          </div>



          <div>
            <Label htmlFor="image" className="text-sm font-medium">
              Image
            </Label>
            <div className="mt-1 flex items-center space-x-2">
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                data-testid="input-image"
              />
              <Label
                htmlFor="image"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md cursor-pointer text-sm text-gray-500 hover:border-gray-400"
                data-testid="label-choose-file"
              >
                {imageFile ? "Image selected" : "Choose File"}
              </Label>
              <Button
                type="button"
                variant="outline"
                className="bg-emerald-500 text-white hover:bg-emerald-600 border-emerald-500"
                onClick={() => document.getElementById("image")?.click()}
                data-testid="button-browse"
              >
                Browse
              </Button>
            </div>
          </div>

          <div className="flex justify-center pt-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-24 bg-emerald-500 hover:bg-emerald-600 text-white"
              data-testid="button-add-user"
            >
              {isSubmitting ? (isEditing ? "Updating..." : "Adding...") : (isEditing ? "Update" : "Add")}
            </Button>
          </div>
        </form>
        )}
        </Card>
      </div>
    </div>
  );
}