import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRepository } from "@/lib/apiRepository";
import { ArrowLeft, Mail } from "lucide-react";
import ResetPasswordModal from "@/components/reset-password-modal";

interface ForgotPasswordResponse {
  userId: number;
}

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await apiRepository.call<ForgotPasswordResponse>(
        'forgotPassword',
        'POST',
        { email },
        {},
        false // No authentication required for forgot password
      );

      if (response.error) {
        toast({
          title: "Error",
          description: response.error,
          variant: "destructive",
        });
        return;
      }

      if (response.data?.userId) {
        setUserId(response.data.userId);
        setShowResetModal(true);
        toast({
          title: "Success",
          description: "An OTP has been sent to your email address.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send reset email",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetComplete = () => {
    setShowResetModal(false);
    setEmail("");
    setUserId(null);
    toast({
      title: "Success",
      description: "Password reset successfully! You can now login with your new password.",
    });
    // Navigate back to login page
    setTimeout(() => {
      setLocation("/login");
    }, 1500); // Give time for user to see the success message
  };

  return (
    <>
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50" data-testid="forgot-password-page">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gray-300 rounded-lg mx-auto mb-4 flex items-center justify-center" data-testid="forgot-password-logo">
                <Mail className="w-8 h-8 text-gray-600" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900" data-testid="forgot-password-title">
                Forgot Password?
              </h1>
              <p className="text-sm text-gray-600 mt-2" data-testid="forgot-password-subtitle">
                Enter your email address and we'll send you an OTP to reset your password.
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="forgot-password-form">
              <div>
                <Input
                  type="email"
                  name="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                  required
                  data-testid="input-email"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || !email.trim()}
                data-testid="button-send-otp"
              >
                {isLoading ? "Sending OTP..." : "Send OTP"}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <Link 
                href="/login" 
                className="inline-flex items-center text-sm text-gray-600 hover:text-gray-800"
                data-testid="link-back-to-login"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {showResetModal && userId && (
        <ResetPasswordModal
          email={email}
          userId={userId}
          isOpen={showResetModal}
          onClose={() => setShowResetModal(false)}
          onSuccess={handleResetComplete}
        />
      )}
    </>
  );
}