import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { X, Upload } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { insertBugReportSchema, BugCategory, BugSeverity } from "@/types/schema";
import { genericApi, bugReportingApi } from "@/lib/apiRepository";

const bugReportFormSchema = insertBugReportSchema;

type BugReportFormData = z.infer<typeof bugReportFormSchema>;

interface AddTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantId?: string;
}

export default function AddTicketModal({ isOpen, onClose, restaurantId }: AddTicketModalProps) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch bug categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['bug-categories'],
    queryFn: async () => {
      const response = await genericApi.getBugCategories();
      return response.data as BugCategory[] || [];
    },
  });

  // Fetch bug severities
  const { data: severities = [], isLoading: severitiesLoading } = useQuery({
    queryKey: ['bug-severities'],
    queryFn: async () => {
      const response = await genericApi.getBugSeverities();
      return response.data as BugSeverity[] || [];
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BugReportFormData>({
    resolver: zodResolver(bugReportFormSchema),
    defaultValues: {
      Title: "",
      Category: 0,
      Description: "",
      Severity: 0,
    },
  });

  const categoryValue = watch("Category");
  const severityValue = watch("Severity");

  const createBugReportMutation = useMutation({
    mutationFn: async (data: BugReportFormData) => {
      const formData = new FormData();
      formData.append('Title', data.Title);
      formData.append('Description', data.Description);
      formData.append('Category', data.Category.toString());
      formData.append('Severity', data.Severity.toString());
      
      if (imageFile) {
        formData.append('Attachment', imageFile);
      }
      
      const response = await bugReportingApi.createBugReport(formData);
      
      // Check for API errors and throw to trigger React Query's onError
      if (response.error) {
        throw new Error(response.error);
      }
      
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Bug report has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      reset();
      setImageFile(null);
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create bug report.",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith("image/")) {
        setImageFile(file);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please select an image file.",
          variant: "destructive",
        });
      }
    }
  };

  const onSubmit = (data: BugReportFormData) => {
    createBugReportMutation.mutate(data);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto" data-testid="add-ticket-modal">
      <div className="min-h-screen w-full flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6 bg-white relative my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          data-testid="button-close-modal"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="mb-6">
          <h2 className="text-xl font-semibold text-center" data-testid="modal-title">Report Issue</h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="Title" className="text-sm font-medium">
              Title
            </Label>
            <Input
              id="Title"
              {...register("Title")}
              className="mt-1"
              data-testid="input-title"
            />
            {errors.Title && (
              <p className="text-sm text-red-600 mt-1">{errors.Title.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="Category" className="text-sm font-medium">
              Category
            </Label>
            <Select value={categoryValue?.toString()} onValueChange={(value) => setValue("Category", parseInt(value))}>
              <SelectTrigger className="mt-1" data-testid="select-category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categoriesLoading ? (
                  <SelectItem value="loading" disabled data-testid="option-loading">Loading...</SelectItem>
                ) : (
                  categories.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()} data-testid={`option-category-${category.id}`}>
                      {category.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errors.Category && (
              <p className="text-sm text-red-600 mt-1">{errors.Category.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="Severity" className="text-sm font-medium">
              Severity
            </Label>
            <Select value={severityValue?.toString()} onValueChange={(value) => setValue("Severity", parseInt(value))}>
              <SelectTrigger className="mt-1" data-testid="select-severity">
                <SelectValue placeholder="Select severity" />
              </SelectTrigger>
              <SelectContent>
                {severitiesLoading ? (
                  <SelectItem value="loading" disabled data-testid="option-loading">Loading...</SelectItem>
                ) : (
                  severities.map((severity) => (
                    <SelectItem key={severity.id} value={severity.id.toString()} data-testid={`option-severity-${severity.id}`}>
                      {severity.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errors.Severity && (
              <p className="text-sm text-red-600 mt-1">{errors.Severity.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="Description" className="text-sm font-medium">
              Description
            </Label>
            <Textarea
              id="Description"
              {...register("Description")}
              className="mt-1 min-h-[100px]"
              data-testid="textarea-description"
            />
            {errors.Description && (
              <p className="text-sm text-red-600 mt-1">{errors.Description.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="image" className="text-sm font-medium">
              Image Upload
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
                {imageFile ? imageFile.name : "Choose File"}
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
              className="w-32 bg-emerald-500 hover:bg-emerald-600 text-white"
              data-testid="button-submit-report"
            >
              {isSubmitting ? "Submitting..." : "Submit Report"}
            </Button>
          </div>
        </form>
        </Card>
      </div>
    </div>
  );
}