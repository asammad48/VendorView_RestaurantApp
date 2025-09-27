import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRepository } from "@/lib/apiRepository";
import { Eye, EyeOff, Lock, Smartphone } from "lucide-react";

interface ResetPasswordModalProps {
  email: string;
  userId: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ResetPasswordData {
  otp: string;
  password: string;
  confirmPassword: string;
}

export default function ResetPasswordModal({
  email,
  userId,
  isOpen,
  onClose,
  onSuccess,
}: ResetPasswordModalProps) {
  const [formData, setFormData] = useState<ResetPasswordData>({
    otp: "",
    password: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const validateForm = () => {
    if (!formData.otp.trim()) {
      toast({
        title: "Error",
        description: "Please enter the OTP sent to your email.",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.password.trim()) {
      toast({
        title: "Error",
        description: "Please enter a new password.",
        variant: "destructive",
      });
      return false;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiRepository.call(
        'resetPassword',
        'POST',
        {
          email,
          password: formData.password,
          otp: formData.otp,
          userId,
          otpType: 1, // For forgot password case
        },
        {},
        false // No authentication required for reset password
      );

      if (response.error) {
        toast({
          title: "Error",
          description: response.error,
          variant: "destructive",
        });
        return;
      }

      if (response.status === 200) {
        onSuccess();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid="reset-password-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid="modal-title">
            <Lock className="w-5 h-5" />
            Reset Your Password
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-sm text-gray-600" data-testid="modal-description">
            Enter the OTP sent to <strong>{email}</strong> and your new password.
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4" data-testid="reset-password-form">
            <div className="space-y-2">
              <Label htmlFor="otp" className="flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                OTP Code
              </Label>
              <Input
                id="otp"
                name="otp"
                type="text"
                placeholder="Enter 6-digit OTP"
                value={formData.otp}
                onChange={handleInputChange}
                maxLength={6}
                className="text-center text-lg tracking-widest"
                required
                data-testid="input-otp"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="pr-10"
                  required
                  data-testid="input-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={togglePasswordVisibility}
                  data-testid="button-toggle-password"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="pr-10"
                  required
                  data-testid="input-confirm-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={toggleConfirmPasswordVisibility}
                  data-testid="button-toggle-confirm-password"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isLoading || !formData.otp.trim() || !formData.password.trim() || !formData.confirmPassword.trim()}
                data-testid="button-reset-password"
              >
                {isLoading ? "Resetting..." : "Reset Password"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}