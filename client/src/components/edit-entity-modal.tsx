import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { apiRepository } from "@/lib/apiRepository";
import { createApiMutation, formatApiError } from "@/lib/errorHandling";
import type { Entity } from "@/types/schema";
import { getFullImageUrl } from "@/lib/imageUtils";

const formSchema = z.object({
  Name: z.string().min(1, "Entity name is required"),
  Phone: z.string().min(1, "Phone number is required"),
  Address: z.string().min(1, "Address is required"),
  Type: z.number().min(1).max(2),
});

type FormData = z.infer<typeof formSchema>;

interface EditEntityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity: Entity | null;
}

export default function EditEntityModal({ open, onOpenChange, entity }: EditEntityModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string>("");
  const [certificatePicture, setCertificatePicture] = useState<string>("");
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      Name: "",
      Phone: "",
      Address: "",
      Type: 2, // Default to restaurant, will be overridden by API values
    },
  });

  useEffect(() => {
    if (entity && open) {
      // Determine the correct entity type from API response
      let entityType = 2; // Default to restaurant
      if (entity.type === 1 || entity.entityType === "hotel" || entity.entityType === "Hotel") {
        entityType = 1; // Hotel
      }
      
      form.reset({
        Name: entity.name || "",
        Phone: entity.phone || "",
        Address: entity.address || "",
        Type: entityType,
      });
      
      // Set image URLs with safe fallbacks and base URL prefix
      const profileUrl = entity.profilePictureUrl || entity.image || "";
      const certificateUrl = entity.certificateUrl || "";
      
      // Use the image utility to get full URLs with base URL
      if (profileUrl) {
        setProfilePicture(getFullImageUrl(profileUrl));
      } else {
        setProfilePicture("");
      }
      
      if (certificateUrl) {
        setCertificatePicture(getFullImageUrl(certificateUrl));
      } else {
        setCertificatePicture("");
      }
    }
  }, [entity, open, form]);

  const updateMutation = useMutation({
    mutationFn: createApiMutation<any, FormData>(async (data: FormData) => {
      if (!entity?.id) throw new Error("Entity ID not found");

      const apiFormData = new FormData();
      apiFormData.append('Id', String(entity.id));
      apiFormData.append('Name', data.Name);
      apiFormData.append('Phone', data.Phone);
      apiFormData.append('Address', data.Address);
      apiFormData.append('Type', String(data.Type));

      if (profileFile) {
        apiFormData.append('ProfilePicture', profileFile);
      }
      if (certificateFile) {
        apiFormData.append('CertificatePicture', certificateFile);
      }

      return await apiRepository.call('updateEntity', 'PUT', apiFormData, {}, true, {
        id: entity.id
      });
    }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Entity updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["entities"] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: formatApiError(error) || "Failed to update entity. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    form.reset();
    setProfilePicture("");
    setCertificatePicture("");
    setProfileFile(null);
    setCertificateFile(null);
  };

  const handleFileUpload = (file: File, type: 'profile' | 'certificate') => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file only",
        variant: "destructive",
      });
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const base64String = e.target?.result as string;
          if (type === 'profile') {
            setProfilePicture(base64String);
            setProfileFile(file);
          } else {
            setCertificatePicture(base64String);
            setCertificateFile(file);
          }
        } catch (error) {
          console.error('Error processing image:', error);
          toast({
            title: "Error",
            description: "Failed to process image file",
            variant: "destructive",
          });
        }
      };
      reader.onerror = () => {
        toast({
          title: "Error",
          description: "Failed to read image file",
          variant: "destructive",
        });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Error", 
        description: "Failed to upload image file",
        variant: "destructive",
      });
    }
  };

  const handleRemoveFile = (type: 'profile' | 'certificate') => {
    if (type === 'profile') {
      setProfilePicture("");
      setProfileFile(null);
    } else {
      setCertificatePicture("");
      setCertificateFile(null);
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      await updateMutation.mutateAsync(data);
    } finally {
      setIsLoading(false);
    }
  };

  const ProfileFileUpload = () => (
    <div className="space-y-2">
      <Label>Profile Picture (Optional)</Label>
      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
        {profilePicture ? (
          <div className="relative">
            <img
              src={profilePicture}
              alt="Profile preview"
              className="w-full h-32 object-cover rounded-lg"
            />
            <button
              type="button"
              onClick={() => handleRemoveFile('profile')}
              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 z-10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="text-center py-4">
            <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Upload profile picture
            </p>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file, 'profile');
              }}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
        )}
      </div>
    </div>
  );

  const CertificateFileUpload = () => (
    <div className="space-y-2">
      <Label>Certificate Picture (Optional)</Label>
      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
        {certificatePicture ? (
          <div className="relative">
            <img
              src={certificatePicture}
              alt="Certificate preview"
              className="w-full h-32 object-cover rounded-lg"
            />
            <button
              type="button"
              onClick={() => handleRemoveFile('certificate')}
              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 z-10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="text-center py-4">
            <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Upload certificate picture
            </p>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file, 'certificate');
              }}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Entity</DialogTitle>
          <DialogDescription>
            Update entity information. You can change basic details and upload new images.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="Name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entity Name *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter entity name" 
                        {...field} 
                        data-testid="input-edit-entity-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="Phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="+1234567890" 
                        {...field} 
                        data-testid="input-edit-entity-phone"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="Address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address *</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter complete address"
                      className="min-h-[80px]"
                      {...field} 
                      data-testid="textarea-edit-entity-address"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="Type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Entity Type *</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={String(field.value)}
                      onValueChange={(value) => field.onChange(Number(value))}
                      className="flex flex-row space-x-6"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="1" id="hotel" />
                        <Label htmlFor="hotel">Hotel</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="2" id="restaurant" />
                        <Label htmlFor="restaurant">Restaurant</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ProfileFileUpload />
              <CertificateFileUpload />
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
                data-testid="button-update-entity"
              >
                {isLoading ? "Updating..." : "Update Entity"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}