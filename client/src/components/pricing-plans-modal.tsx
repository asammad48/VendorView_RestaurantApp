import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Sparkles } from "lucide-react";

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
      badge: null,
      description: "Ideal for small restaurants",
      price: { monthly: 0, annual: 0 },
      features: [
        "1 Restaurant Branch",
        "Max 20 Items in Menu",
        "QR-based Ordering",
        "Basic Order Alerts",
        "Limited Daily Orders",
      ],
      buttonText: "Try for Free",
      highlight: false,
    },
    {
      id: "standard",
      name: "Standard",
      badge: "Most Popular",
      description: "Best for growing restaurants",
      price: { monthly: 15, annual: 150 },
      features: [
        "All Basic features",
        "1 Restaurant Branch",
        "Max 20 Items in Menu",
        "QR-based Ordering",
        "Basic Order Alerts",
        "Limited Daily Orders",
      ],
      buttonText: "Select Plan",
      highlight: true,
    },
    {
      id: "premium",
      name: "Premium",
      badge: null,
      description: "For large, multi-branch restaurants",
      price: { monthly: 30, annual: 300 },
      features: [
        "All Standard features",
        "Full inventory management",
        "Automated reporting",
        "Priority support",
        "All advanced tools",
      ],
      buttonText: "Select Plan",
      highlight: false,
    },
  ];

  const handlePlanSelect = (planId: string) => {
    onPlanSelect(planId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 overflow-hidden border-0 shadow-2xl w-[95vw] max-w-3xl max-h-[92vh] overflow-y-auto"
        data-testid="pricing-plans-modal"
      >
        {/* Dark Header */}
        <div className="relative bg-[#0f2417] px-8 pt-7 pb-9 text-center flex-shrink-0">
          <div
            className="absolute bottom-0 left-0 right-0 h-[3px]"
            style={{ background: "linear-gradient(90deg, transparent, #15803d, #22c55e, #15803d, transparent)" }}
          />
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-[#22c55e]" />
            <span className="text-[#22c55e] text-xs font-semibold tracking-widest uppercase">Choose Your Plan</span>
          </div>
          <h1 className="text-white text-2xl font-black tracking-wide mb-2" data-testid="modal-title">
            Subscription Plans
          </h1>
          <p className="text-gray-400 text-sm max-w-md mx-auto" data-testid="modal-description">
            All plans include essential features. No hidden fees — flexibility to change anytime.
          </p>

          {/* Billing Toggle */}
          <div className="flex justify-center mt-5">
            <div className="flex bg-[#1a3020] rounded-full p-1 gap-1" data-testid="billing-toggle">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`px-5 py-1.5 rounded-full text-sm font-semibold transition-all ${
                  billingCycle === "monthly"
                    ? "bg-[#15803d] text-white shadow"
                    : "text-gray-400 hover:text-white"
                }`}
                data-testid="button-monthly"
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle("annual")}
                className={`px-5 py-1.5 rounded-full text-sm font-semibold transition-all ${
                  billingCycle === "annual"
                    ? "bg-[#15803d] text-white shadow"
                    : "text-gray-400 hover:text-white"
                }`}
                data-testid="button-annual"
              >
                Annual
                {billingCycle === "annual" && (
                  <span className="ml-1.5 text-[10px] bg-[#22c55e] text-white px-1.5 py-0.5 rounded-full">−15%</span>
                )}
              </button>
            </div>
          </div>
          {billingCycle === "annual" && (
            <p className="text-[#22c55e] text-xs font-medium mt-2" data-testid="annual-discount">
              Save 15% with annual billing
            </p>
          )}
        </div>

        {/* Plan Cards */}
        <div className="bg-[#f8f5f0] p-6">
          <div className="grid sm:grid-cols-3 gap-4 pt-4 overflow-visible">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-2xl flex flex-col ${
                  plan.highlight
                    ? "bg-[#0f2417] shadow-xl ring-2 ring-[#15803d]"
                    : "bg-white border border-gray-200 shadow-sm"
                }`}
                data-testid={`plan-card-${plan.id}`}
              >
                {plan.badge && (
                  <div className="absolute -top-3.5 left-0 right-0 flex justify-center z-10">
                    <span className="bg-[#15803d] text-white text-[10px] font-bold px-3 py-1 rounded-full tracking-widest uppercase shadow-lg whitespace-nowrap">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className={`p-5 flex flex-col flex-1 ${plan.highlight ? "pt-7" : ""}`}>
                  {/* Plan name & description */}
                  <div className="text-center mb-4">
                    <h3
                      className={`text-lg font-black mb-1 ${plan.highlight ? "text-white" : "text-[#0f2417]"}`}
                      data-testid={`plan-name-${plan.id}`}
                    >
                      {plan.name}
                    </h3>
                    <p
                      className={`text-xs ${plan.highlight ? "text-gray-400" : "text-gray-500"}`}
                      data-testid={`plan-description-${plan.id}`}
                    >
                      {plan.description}
                    </p>
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`h-px flex-1 ${plan.highlight ? "bg-[#15803d40]" : "bg-gray-100"}`} />
                    <div className={`w-1.5 h-1.5 rotate-45 ${plan.highlight ? "bg-[#15803d]" : "bg-gray-300"}`} />
                    <div className={`h-px flex-1 ${plan.highlight ? "bg-[#15803d40]" : "bg-gray-100"}`} />
                  </div>

                  {/* Price */}
                  <div className="text-center mb-5">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className={`text-4xl font-black ${plan.highlight ? "text-white" : "text-[#0f2417]"}`} data-testid={`plan-price-${plan.id}`}>
                        ${billingCycle === "monthly" ? plan.price.monthly : plan.price.annual}
                      </span>
                      <span className={`text-sm ${plan.highlight ? "text-gray-400" : "text-gray-400"}`}>
                        /{billingCycle === "monthly" ? "mo" : "yr"}
                      </span>
                    </div>
                    {plan.price.monthly === 0 && (
                      <span className="text-[10px] text-[#15803d] font-semibold uppercase tracking-wide">Free forever</span>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2" data-testid={`feature-${plan.id}-${i}`}>
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          plan.highlight ? "bg-[#15803d]" : "bg-[#15803d]/10"
                        }`}>
                          <Check className={`w-2.5 h-2.5 ${plan.highlight ? "text-white" : "text-[#15803d]"}`} />
                        </div>
                        <span className={`text-xs leading-relaxed ${plan.highlight ? "text-gray-300" : "text-gray-600"}`}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Button
                    onClick={() => handlePlanSelect(plan.id)}
                    className={`w-full font-semibold text-sm rounded-xl py-5 transition-all ${
                      plan.highlight
                        ? "bg-[#15803d] hover:bg-[#166534] text-white"
                        : "bg-[#0f2417] hover:bg-[#1a3020] text-white"
                    }`}
                    data-testid={`button-select-${plan.id}`}
                  >
                    {plan.buttonText}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Footer note */}
          <p className="text-center text-xs text-gray-400 mt-5">
            Need a custom plan?{" "}
            <button className="text-[#15803d] font-semibold underline underline-offset-2 hover:text-[#166534]">
              Contact sales
            </button>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
