import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Upload, X } from "lucide-react";
import { insertEntitySchema } from "@/types/schema";
import { apiRepository } from "@/lib/apiRepository";
import { createApiMutation, formatApiError } from "@/lib/errorHandling";
import { useToast } from "@/hooks/use-toast";
import { validateImage, getConstraintDescription } from "@/lib/imageValidation";
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

interface AddEntityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AddEntityModal({ open, onOpenChange }: AddEntityModalProps) {
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

  const createMutation = useMutation({
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

      return apiRepository.call('createEntity', 'POST', apiFormData, undefined, true);
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entities"] });
      toast({
        title: "Success",
        description: "Entity created successfully",
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
        description: formatApiError(error) || "Failed to create entity",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (file: File, type: 'profile' | 'certificate') => {
    try {
      // Validate the image before processing (both profile and certificate use 'entity' constraints)
      const validation = await validateImage(file, 'entity');
      
      if (!validation.isValid) {
        toast({
          title: "Invalid Image",
          description: validation.error,
          variant: "destructive",
        });
        // Clear the input
        if (type === 'profile' && profileFileRef.current) {
          profileFileRef.current.value = '';
        } else if (type === 'certificate' && certificateFileRef.current) {
          certificateFileRef.current.value = '';
        }
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
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to validate image. Please try again.",
        variant: "destructive",
      });
      // Clear the input
      if (type === 'profile' && profileFileRef.current) {
        profileFileRef.current.value = '';
      } else if (type === 'certificate' && certificateFileRef.current) {
        certificateFileRef.current.value = '';
      }
    }
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
      await createMutation.mutateAsync(data);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Entity</DialogTitle>
          <DialogDescription>
            Create a new hotel or restaurant entity in your system.
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
                        data-testid="input-entity-name"
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
                        data-testid="input-entity-phone"
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
                      placeholder="Enter full address" 
                      {...field}
                      rows={3}
                      data-testid="input-entity-address"
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
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={String(field.value)}
                      className="flex gap-6"
                      data-testid="radio-entity-type"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="2" id="restaurant" />
                        <Label htmlFor="restaurant">Restaurant</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="1" id="hotel" />
                        <Label htmlFor="hotel">Hotel</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FormLabel>Entity Profile Picture *</FormLabel>
                <div className="space-y-3 mt-2">
                  {profilePicturePreview ? (
                    <div className="relative">
                      <img
                        src={profilePicturePreview}
                        alt="Profile preview"
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => handleRemoveFile('profile')}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-gray-400 transition-colors"
                      onClick={() => profileFileRef.current?.click()}
                    >
                      <Upload className="w-6 h-6 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">Upload profile picture</p>
                      <p className="text-xs text-gray-400 mt-1">Required: {getConstraintDescription('entity')}</p>
                    </div>
                  )}
                  <input
                    ref={profileFileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'profile');
                    }}
                    data-testid="input-profile-picture"
                  />
                </div>
              </div>

              <div>
                <FormLabel>Certificate Picture *</FormLabel>
                <div className="space-y-3 mt-2">
                  {certificatePicturePreview ? (
                    <div className="relative">
                      <img
                        src={certificatePicturePreview}
                        alt="Certificate preview"
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => handleRemoveFile('certificate')}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-gray-400 transition-colors"
                      onClick={() => certificateFileRef.current?.click()}
                    >
                      <Upload className="w-6 h-6 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">Upload certificate</p>
                      <p className="text-xs text-gray-400 mt-1">Required: {getConstraintDescription('entity')}</p>
                    </div>
                  )}
                  <input
                    ref={certificateFileRef}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'certificate');
                    }}
                    data-testid="input-certificate-file"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6">
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
                disabled={isLoading || createMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
                data-testid="button-create-entity"
              >
                {isLoading || createMutation.isPending ? "Creating..." : "Create Entity"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}