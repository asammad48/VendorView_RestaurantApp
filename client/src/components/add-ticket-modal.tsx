import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Upload } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { insertTicketSchema } from "@/types/schema";
import { apiRequest } from "@/lib/queryClient";

const ticketFormSchema = insertTicketSchema.extend({
  subject: z.string().min(1, "Subject is required"),
  category: z.string().min(1, "Category is required"),
  description: z.string().min(1, "Description is required"),
  image: z.string().optional(),
});

type TicketFormData = z.infer<typeof ticketFormSchema>;

interface AddTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantId?: string;
}

const TICKET_CATEGORIES = [
  "Bug Report",
  "Feature Request",
  "Technical Issue",
  "Account Issue",
  "Payment Issue",
  "General Inquiry",
];

export default function AddTicketModal({ isOpen, onClose, restaurantId }: AddTicketModalProps) {
  const [imageFile, setImageFile] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TicketFormData>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: {
      subject: "",
      category: "",
      description: "",
      image: "",
      restaurantId: restaurantId || "",
    },
  });

  const categoryValue = watch("category");

  const createTicketMutation = useMutation({
    mutationFn: async (data: TicketFormData) => {
      return apiRequest("POST", "/api/tickets", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Ticket has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      reset();
      setImageFile("");
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create ticket.",
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

  const onSubmit = (data: TicketFormData) => {
    createTicketMutation.mutate(data);
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
          <h2 className="text-xl font-semibold text-center" data-testid="modal-title">Add ticket</h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="subject" className="text-sm font-medium">
              Subject
            </Label>
            <Input
              id="subject"
              {...register("subject")}
              className="mt-1"
              data-testid="input-subject"
            />
            {errors.subject && (
              <p className="text-sm text-red-600 mt-1">{errors.subject.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="category" className="text-sm font-medium">
              Category
            </Label>
            <Select value={categoryValue} onValueChange={(value) => setValue("category", value)}>
              <SelectTrigger className="mt-1" data-testid="select-category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {TICKET_CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category} data-testid={`option-category-${category.toLowerCase().replace(/\s+/g, '-')}`}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-sm text-red-600 mt-1">{errors.category.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="description" className="text-sm font-medium">
              Description
            </Label>
            <Textarea
              id="description"
              {...register("description")}
              className="mt-1 min-h-[100px]"
              data-testid="textarea-description"
            />
            {errors.description && (
              <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>
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
              data-testid="button-add-ticket"
            >
              {isSubmitting ? "Adding..." : "Add"}
            </Button>
          </div>
        </form>
        </Card>
      </div>
    </div>
  );
}