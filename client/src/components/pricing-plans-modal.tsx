import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

interface PricingPlansModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPlanSelect: (plan: string) => void;
}

export default function PricingPlansModal({ open, onOpenChange, onPlanSelect }: PricingPlansModalProps) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");

  const plans = [
    {
      id: "basic",
      name: "Basic",
      description: "Ideal for small restaurant",
      price: billingCycle === "monthly" ? 0 : 0,
      features: [
        "1 Restaurant Branch",
        "Max 20 Items in Menu",
        "QR-based Ordering",
        "Basic Order Alerts",
        "Limited Daily Orders"
      ],
      buttonText: "Try for free",
      isPopular: false
    },
    {
      id: "standard",
      name: "Standard",
      description: "Best for growing restaurants",
      price: billingCycle === "monthly" ? 15 : 150,
      features: [
        "All starter features +",
        "1 Restaurant Branch",
        "Max 20 Items in Menu",
        "QR-based Ordering",
        "Basic Order Alerts",
        "Limited Daily Orders"
      ],
      buttonText: "Select plan",
      isPopular: true
    },
    {
      id: "premium",
      name: "Premium",
      description: "For large, multi-branch restaurants",
      price: billingCycle === "monthly" ? 30 : 300,
      features: [
        "All professional features +",
        "1 Restaurant Branch",
        "Max 20 Items in Menu",
        "QR-based Ordering",
        "Basic Order Alerts",
        "Limited Daily Orders"
      ],
      buttonText: "Select plan",
      isPopular: false
    }
  ];

  const handlePlanSelect = (planId: string) => {
    onPlanSelect(planId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto" data-testid="pricing-plans-modal">
        <DialogHeader className="text-center pb-6">
          <DialogTitle className="text-4xl font-bold text-gray-900 mb-4" data-testid="modal-title">
            Plans & Pricing
          </DialogTitle>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto" data-testid="modal-description">
            Choose the plan that fits your needs. All plans include essential features to get you started, with
            options to scale as you grow. No hidden fees and the flexibility to change anytime.
          </p>
        </DialogHeader>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-8">
          <div className="flex bg-gray-100 rounded-full p-1" data-testid="billing-toggle">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                billingCycle === "monthly"
                  ? "bg-green-500 text-white"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              data-testid="button-monthly"
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("annual")}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                billingCycle === "annual"
                  ? "bg-green-500 text-white"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              data-testid="button-annual"
            >
              Annual
            </button>
          </div>
        </div>

        {billingCycle === "annual" && (
          <div className="text-center mb-6">
            <span className="text-blue-600 font-medium text-sm" data-testid="annual-discount">
              -15% off on annual payments
            </span>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-white rounded-2xl border-2 p-8 ${
                plan.isPopular
                  ? "border-green-500 shadow-xl scale-105"
                  : "border-gray-200 shadow-lg"
              }`}
              data-testid={`plan-card-${plan.id}`}
            >
              {plan.isPopular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-green-500 text-white px-4 py-1" data-testid="popular-badge">
                    MOST POPULAR PLAN
                  </Badge>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2" data-testid={`plan-name-${plan.id}`}>
                  {plan.name}
                </h3>
                <p className="text-gray-600 text-sm" data-testid={`plan-description-${plan.id}`}>
                  {plan.description}
                </p>
              </div>

              <div className="text-center mb-8">
                <div className="flex items-baseline justify-center">
                  <span className="text-5xl font-bold text-gray-900" data-testid={`plan-price-${plan.id}`}>
                    ${plan.price}
                  </span>
                  <span className="text-gray-600 text-lg ml-2">
                    /per {billingCycle === "monthly" ? "month" : "year"}
                  </span>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                {plan.features.map((feature, index) => (
                  <div key={index} className="flex items-start">
                    <Check className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                    <span className="text-gray-700 text-sm" data-testid={`feature-${plan.id}-${index}`}>
                      {feature}
                    </span>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => handlePlanSelect(plan.id)}
                className={`w-full py-3 text-sm font-medium rounded-lg transition-all ${
                  plan.id === "basic"
                    ? "bg-gray-900 hover:bg-gray-800 text-white"
                    : "bg-gray-900 hover:bg-gray-800 text-white"
                }`}
                data-testid={`button-select-${plan.id}`}
              >
                {plan.buttonText}
              </Button>

              {plan.id === "standard" && (
                <div className="text-center mt-4">
                  <button className="text-gray-600 text-sm hover:text-gray-900 underline">
                    or contact sales
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}