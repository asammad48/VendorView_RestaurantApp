import React, { useRef, useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as z from "zod";
import { Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { insertEntitySchema } from "../types/schema";
import { apiRepository } from "../lib/apiRepository";
import { createApiMutation, formatApiError } from "@/lib/errorHandling";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const formSchema = insertEntitySchema;
type FormData = z.infer<typeof formSchema>;

interface EditEntityModalProps {
  entity: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditEntityModal({ entity, open, onOpenChange }: EditEntityModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string>("");
  const [certificatePicturePreview, setCertificatePicturePreview] = useState<string>("");
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const profileFileRef = useRef<HTMLInputElement>(null);
  const certificateFileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      Name: "",
      Phone: "",
      Address: "",
      Type: 2, // Default to restaurant
    },
  });

  // Update form values when entity changes
  useEffect(() => {
    if (entity) {
      form.reset({
        Name: entity.name || entity.Name,
        Phone: entity.phone || entity.Phone,
        Address: entity.address || entity.Address,
        Type: entity.entityType === "hotel" || entity.type === 1 ? 1 : 2, // 1 for hotel, 2 for restaurant
      });
      setProfilePicturePreview(entity.profilePictureUrl || entity.profilePicture || "");
      setCertificatePicturePreview(entity.certificateUrl || entity.certificatePicture || "");
    }
  }, [entity, form]);

  const updateMutation = useMutation({
    mutationFn: createApiMutation<any, FormData>(async (data: FormData) => {
      const apiFormData = new FormData();
      apiFormData.append('Name', data.Name);
      apiFormData.append('Phone', data.Phone);
      apiFormData.append('Address', data.Address);
      apiFormData.append('Type', String(data.Type));
      
      if (profilePictureFile) {
        apiFormData.append('ProfilePicture', profilePictureFile);
      }
      if (certificateFile) {
        apiFormData.append('CertificateFile', certificateFile);
      }

      return apiRepository.call('updateEntity', 'PUT', apiFormData, undefined, true, { id: entity.id });
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entities"] });
      toast({
        title: "Success",
        description: "Entity updated successfully",
      });
      form.reset();
      setProfilePicturePreview("");
      setCertificatePicturePreview("");
      setProfilePictureFile(null);
      setCertificateFile(null);
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: formatApiError(error) || "Failed to update entity",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (file: File, type: 'profile' | 'certificate') => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Please select an image file only",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64String = e.target?.result as string;
      if (type === 'profile') {
        setProfilePicturePreview(base64String);
        setProfilePictureFile(file);
      } else {
        setCertificatePicturePreview(base64String);
        setCertificateFile(file);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = (type: 'profile' | 'certificate') => {
    if (type === 'profile') {
      setProfilePicturePreview("");
      setProfilePictureFile(null);
      if (profileFileRef.current) {
        profileFileRef.current.value = "";
      }
    } else {
      setCertificatePicturePreview("");
      setCertificateFile(null);
      if (certificateFileRef.current) {
        certificateFileRef.current.value = "";
      }
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

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Profile Picture Upload */}
                <div className="space-y-2">
                  <Label>Profile Picture (Optional)</Label>
                  <div className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
                    {profilePicturePreview ? (
                      <div className="relative">
                        <img
                          src={profilePicturePreview}
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
                        <Button
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => profileFileRef.current?.click()}
                          className="text-xs"
                        >
                          Choose File
                        </Button>
                      </div>
                    )}
                    <input
                      ref={profileFileRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, 'profile');
                      }}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Certificate Upload */}
                <div className="space-y-2">
                  <Label>Certificate Picture (Optional)</Label>
                  <div className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
                    {certificatePicturePreview ? (
                      <div className="relative">
                        <img
                          src={certificatePicturePreview}
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
                        <Button
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => certificateFileRef.current?.click()}
                          className="text-xs"
                        >
                          Choose File
                        </Button>
                      </div>
                    )}
                    <input
                      ref={certificateFileRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, 'certificate');
                      }}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>
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