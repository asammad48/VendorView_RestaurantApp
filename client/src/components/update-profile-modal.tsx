import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { X, Upload, User } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRepository } from "@/lib/apiRepository";
import { useAuth } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";
import { STORAGE_KEYS } from "@/data/mockData";
import { getProfilePictureUrl, isTextAvatar } from "@/lib/imageUtils";

// Validation schema for profile update
const profileUpdateSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
  mobileNumber: z
    .string()
    .min(1, "Mobile number is required")
    .regex(/^\+?[\d\s\-\(\)]{7,15}$/, "Please enter a valid mobile number"),
});

type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;

// Avatar options for selection
const avatarOptions = [
  "👤",
  "👨",
  "👩",
  "🧑",
  "👶",
  "👦",
  "👧",
  "🧓",
  "👴",
  "👵",
  "🤵",
  "👰",
  "🕴️",
  "💼",
  "👨‍💻",
  "👩‍💻",
  "👨‍🍳",
  "👩‍🍳",
  "👨‍🎨",
  "👩‍🎨",
];

interface UpdateProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UpdateProfileModal({
  isOpen,
  onClose,
}: UpdateProfileModalProps) {
  const [profilePicture, setProfilePicture] = useState<File | string | null>(
    null,
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [useAvatar, setUseAvatar] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string>("");
  const { toast } = useToast();
  const { user, refreshUser } = useAuth();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileUpdateFormData>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      name: user?.fullName || "",
      mobileNumber: user?.mobileNumber || "",
    },
  });

  // API mutation for profile update
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileUpdateFormData) => {
      const formData = new FormData();
      formData.append("Name", data.name);
      formData.append("MobileNumber", data.mobileNumber);

      if (useAvatar && selectedAvatar) {
        // For avatar selection, we'll create a simple text file with the avatar emoji
        const avatarBlob = new Blob([selectedAvatar], { type: "text/plain" });
        formData.append("ProfilePicture", avatarBlob, "avatar.txt");
      } else if (profilePicture instanceof File) {
        formData.append("ProfilePicture", profilePicture);
      }

      // Call the profile update API
      const response = await apiRepository.call(
        "updateUserProfile",
        "PUT",
        formData,
        {},
        true, // requires authentication
      );

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    onSuccess: async (data) => {
      toast({
        title: "Success",
        description: "Profile updated successfully.",
      });

      // Update localStorage with new user data
      const apiData = data as any;
      const currentUser = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || "{}",
      );
      const updatedUser = {
        ...currentUser,
        fullName: apiData.name,
        mobileNumber: apiData.mobileNumber,
        profilePicture: apiData.profilePicture,
      };
      localStorage.setItem(
        STORAGE_KEYS.CURRENT_USER,
        JSON.stringify(updatedUser),
      );

      // Refresh the user in auth context
      await refreshUser();

      // Invalidate relevant queries to keep caches coherent
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });

      reset();
      setProfilePicture(null);
      setPreviewUrl(null);
      setUseAvatar(false);
      setSelectedAvatar("");
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to update profile.",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith("image/")) {
        setProfilePicture(file);
        setPreviewUrl(URL.createObjectURL(file));
        setUseAvatar(false);
        setSelectedAvatar("");
      } else {
        toast({
          title: "Invalid file type",
          description: "Please select an image file.",
          variant: "destructive",
        });
      }
    }
  };

  const handleAvatarSelect = (avatar: string) => {
    setSelectedAvatar(avatar);
    setUseAvatar(true);
    setProfilePicture(avatar);
    setPreviewUrl(null);
  };

  const onSubmit = (data: ProfileUpdateFormData) => {
    updateProfileMutation.mutate(data);
  };

  // Check if we should show text avatar (emoji) or image
  const shouldShowTextAvatar = () => {
    // If user selected an emoji avatar
    if (useAvatar && selectedAvatar) return true;
    // If there's a preview (uploaded new image), don't show text
    if (previewUrl) return false;
    // Otherwise check if current user profile picture is text
    return isTextAvatar(user?.profilePicture);
  };

  // Get the appropriate display value for profile picture
  const getProfilePictureDisplay = () => {
    // If user uploaded a new image, show preview
    if (previewUrl) return { type: "image", value: previewUrl };
    // If user selected an emoji avatar
    if (useAvatar && selectedAvatar)
      return { type: "text", value: selectedAvatar };
    // Otherwise show current user profile picture
    if (isTextAvatar(user?.profilePicture)) {
      return { type: "text", value: user?.profilePicture };
    }
    return { type: "image", value: getProfilePictureUrl(user?.profilePicture) };
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto"
      data-testid="update-profile-modal"
    >
      <div className="min-h-screen w-full flex items-center justify-center p-4">
        <Card className="w-full max-w-lg p-6 bg-white relative my-8">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            data-testid="button-close-modal"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="mb-6">
            <h2
              className="text-xl font-semibold text-center"
              data-testid="modal-title"
            >
              Update Profile
            </h2>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Current Profile Picture */}
            <div className="flex justify-center mb-4">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  {(() => {
                    const display = getProfilePictureDisplay();
                    if (display.type === "text") {
                      return (
                        <div className="h-full w-full flex items-center justify-center text-3xl bg-gray-100">
                          {display.value}
                        </div>
                      );
                    } else {
                      return (
                        <>
                          {display.value && (
                            <AvatarImage src={display.value} alt="Profile" />
                          )}
                          <AvatarFallback className="bg-green-500 text-white text-xl">
                            {user?.fullName ? (
                              user.fullName.charAt(0).toUpperCase()
                            ) : user?.name ? (
                              user.name.charAt(0).toUpperCase()
                            ) : (
                              <User className="h-8 w-8" />
                            )}
                          </AvatarFallback>
                        </>
                      );
                    }
                  })()}
                </Avatar>
              </div>
            </div>

            {/* Name Field */}
            <div>
              <Label htmlFor="name" className="text-sm font-medium">
                Name *
              </Label>
              <Input
                id="name"
                {...register("name")}
                className="mt-1"
                data-testid="input-name"
              />
              {errors.name && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Mobile Number Field */}
            <div>
              <Label htmlFor="mobileNumber" className="text-sm font-medium">
                Mobile Number *
              </Label>
              <Input
                id="mobileNumber"
                type="tel"
                {...register("mobileNumber")}
                className="mt-1"
                placeholder="e.g., +1234567890"
                data-testid="input-mobile"
              />
              {errors.mobileNumber && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.mobileNumber.message}
                </p>
              )}
            </div>

            {/* Profile Picture Selection */}
            <div>
              <Label className="text-sm font-medium mb-3 block">
                Profile Picture
              </Label>

              {/* File Upload Option */}
              <div className="mb-4">
                <div className="flex items-center space-x-2">
                  <Input
                    id="profilePicture"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    data-testid="input-profile-picture"
                  />
                  <Label
                    htmlFor="profilePicture"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md cursor-pointer text-sm text-gray-500 hover:border-gray-400 text-center"
                    data-testid="label-choose-file"
                  >
                    {profilePicture instanceof File
                      ? profilePicture.name
                      : "Choose Image File"}
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    className="bg-green-500 text-white hover:bg-green-600 border-green-500"
                    onClick={() =>
                      document.getElementById("profilePicture")?.click()
                    }
                    data-testid="button-browse"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Browse
                  </Button>
                </div>
              </div>

              {/* Avatar Selection Option */}
              <div>
                <Label className="text-sm font-medium text-gray-600 mb-2 block">
                  Or choose an avatar:
                </Label>
                <div className="grid grid-cols-10 gap-2 max-h-24 overflow-y-auto p-2 border rounded-md bg-gray-50">
                  {avatarOptions.map((avatar, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleAvatarSelect(avatar)}
                      className={`w-8 h-8 text-lg hover:bg-gray-200 rounded ${
                        selectedAvatar === avatar
                          ? "bg-green-200 ring-2 ring-green-500"
                          : ""
                      }`}
                      data-testid={`avatar-option-${index}`}
                    >
                      {avatar}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-center pt-4">
              <Button
                type="submit"
                disabled={updateProfileMutation.isPending}
                className="w-40 bg-green-500 hover:bg-green-600 text-white"
                data-testid="button-update-profile"
              >
                {updateProfileMutation.isPending
                  ? "Updating..."
                  : "Update Profile"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
