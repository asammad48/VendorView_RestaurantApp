import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { entityApi } from "@/lib/apiRepository";

export default function Appearance() {
  const [location, navigate] = useLocation();
  const [selectedColor, setSelectedColor] = useState("rgb(22, 163, 74)"); // Green default
  const [hexColor, setHexColor] = useState("#16A34A"); // Green default in hex
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [pickerPosition, setPickerPosition] = useState({ x: 85, y: 30 }); // Position as percentage
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Capture and preserve URL query parameters from the referring page
  const urlParams = new URLSearchParams(window.location.search);
  const previousPageParams = urlParams.toString();

  // Get entity ID from localStorage (assuming it's stored during login)
  const getEntityId = () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.entityId || 14; // Default to 14 if not found
    }
    return 14; // Default entity ID as per API example
  };

  // Initialize Bearer token for API calls (only if not already present)
  useEffect(() => {
    // Only set default token if no token exists in localStorage
    const existingToken = localStorage.getItem('access_token');
    if (!existingToken) {
      const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1laWQiOiIxIiwidW5pcXVlX25hbWUiOiJPd25lciIsInJvbGUiOiJBY2NvdW50IE93bmVyIiwibmJmIjoxNzU2MjIzNDk5LCJleHAiOjE3NTY4MjgyOTksImlhdCI6MTc1NjIyMzQ5OSwiaXNzIjoiUmVzdGF1cmFudEFwcCIsImF1ZCI6IlJlc3RhdXJhbnRBcHAifQ.P3NOJYibCtz3SBiRsOPkiJqJs5A0wViiv_te-HOQL5s";
      localStorage.setItem('access_token', token);
    }
  }, []);

  // Load primary color from API when component mounts
  useEffect(() => {
    const loadPrimaryColor = async () => {
      setIsLoading(true);
      try {
        const entityId = getEntityId();
        const response = await entityApi.getEntityPrimaryColor(entityId);
        console.log("Fetched primary color:", response);
        
        const primaryColor = (response && typeof response === 'object' && 'primaryColor' in response) 
          ? (response as any).primaryColor || "#16A34A" 
          : "#16A34A";
        setHexColor(primaryColor);
        
        // Convert hex to RGB for the color picker
        const hexToRgb = (hex: string) => {
          const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
          return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
          } : { r: 22, g: 163, b: 74 };
        };
        
        const rgb = hexToRgb(primaryColor);
        setSelectedColor(`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`);
        
      } catch (error: any) {
        console.error("Failed to load primary color:", error);
        toast({
          title: "Warning",
          description: "Could not load current primary color. Using default.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadPrimaryColor();
  }, [toast]);

  // Extract RGB values from current color
  const getRGBValues = (color: string) => {
    const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      return {
        r: parseInt(match[1]),
        g: parseInt(match[2]),
        b: parseInt(match[3])
      };
    }
    return { r: 22, g: 163, b: 74 }; // Default green
  };

  const rgbToHex = (r: number, g: number, b: number) => {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  };

  const currentRGB = getRGBValues(selectedColor);
  const currentHex = rgbToHex(currentRGB.r, currentRGB.g, currentRGB.b);

  // Update hex color when selected color changes
  useEffect(() => {
    setHexColor(currentHex);
  }, [currentHex]);

  // Handle color picker interactions
  const handleColorStripClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    
    // Map percentage to color
    let newColor;
    if (percentage < 16.67) newColor = "rgb(239, 68, 68)"; // Red
    else if (percentage < 33.33) newColor = "rgb(245, 158, 11)"; // Orange
    else if (percentage < 50) newColor = "rgb(34, 197, 94)"; // Green
    else if (percentage < 66.67) newColor = "rgb(6, 182, 212)"; // Cyan
    else if (percentage < 83.33) newColor = "rgb(59, 130, 246)"; // Blue
    else newColor = "rgb(168, 85, 247)"; // Purple
    
    setSelectedColor(newColor);
  };

  const handlePickerClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    
    setPickerPosition({ x, y });
    
    // Generate color based on position (simplified)
    const baseColors = [
      { r: 232, g: 150, b: 35 }, // Orange
      { r: 22, g: 163, b: 74 },  // Green
      { r: 59, g: 130, b: 246 }  // Blue
    ];
    
    // Simple interpolation based on position
    const colorIndex = Math.floor((x / 100) * 2);
    const baseColor = baseColors[colorIndex] || baseColors[0];
    
    // Adjust brightness based on Y position
    const brightness = 1 - (y / 100) * 0.7;
    const r = Math.round(baseColor.r * brightness);
    const g = Math.round(baseColor.g * brightness);
    const b = Math.round(baseColor.b * brightness);
    
    setSelectedColor(`rgb(${r}, ${g}, ${b})`);
  };

  // Save primary color to API
  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      const entityId = getEntityId();
      await entityApi.updateEntityPrimaryColor(entityId, hexColor);
      
      toast({
        title: "Success",
        description: "Primary color updated successfully",
      });
    } catch (error: any) {
      console.error("Failed to save primary color:", error);
      toast({
        title: "Error", 
        description: error.message || "Failed to save primary color",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const previewItems = [
    {
      id: 1,
      name: "Pizza Combo",
      description: "Delicious pizza with your choice of toppings, served with garlic bread and a side of marinara sauce.",
      price: "Rs. 550.00",
      originalPrice: "Rs. 600.00"
    },
    {
      id: 2,
      name: "Pizza Combo",
      description: "Delicious pizza with your choice of toppings, served with garlic bread and a side of marinara sauce.",
      price: "Rs. 550.00",
      originalPrice: "Rs. 600.00"
    },
    {
      id: 3,
      name: "Pizza Combo",
      description: "Delicious pizza with your choice of toppings, served with garlic bread and a side of marinara sauce.",
      price: "Rs. 550.00",
      originalPrice: "Rs. 600.00"
    },
    {
      id: 4,
      name: "Pizza Combo",
      description: "Delicious pizza with your choice of toppings, served with garlic bread and a side of marinara sauce.",
      price: "Rs. 550.00",
      originalPrice: "Rs. 600.00"
    }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          data-testid="button-back"
          onClick={() => {
            // Navigate back to branches page with preserved query parameters
            const branchesUrl = previousPageParams ? `/branches?${previousPageParams}` : '/branches';
            navigate(branchesUrl);
          }}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="text-page-title">
          Appearance
        </h1>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Panel - Color Palette */}
        <div className="space-y-6">
          {/* Color Palette */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold" data-testid="text-color-palette-title">
                Color Palette
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Main Color Picker Area */}
              <div className="relative">
                <div 
                  className="h-64 w-full rounded-lg bg-gradient-to-br from-orange-400 via-orange-500 to-black relative overflow-hidden border-2 border-gray-200 cursor-crosshair"
                  onClick={handlePickerClick}
                  data-testid="color-picker-area"
                >
                  {/* Color picker circle */}
                  <div 
                    className="absolute w-5 h-5 border-2 border-white rounded-full shadow-lg cursor-pointer bg-white"
                    style={{ 
                      top: `${pickerPosition.y}%`, 
                      left: `${pickerPosition.x}%`,
                      transform: 'translate(-50%, -50%)'
                    }}
                    data-testid="color-picker-handle"
                  >
                    <div className="w-3 h-3 border border-gray-400 rounded-full m-0.5" />
                  </div>
                </div>
              </div>
              
              {/* Color Strip */}
              <div className="space-y-3">
                <div 
                  className="h-6 w-full rounded-lg bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-cyan-500 via-blue-500 via-purple-500 to-pink-500 border border-gray-200 cursor-pointer"
                  onClick={handleColorStripClick}
                  data-testid="color-strip"
                ></div>
                
                {/* Color Values */}
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div className="space-y-1" data-testid="color-hex-section">
                    <label className="text-gray-500 font-medium">Hex</label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                      <span className="font-mono text-gray-800">{hexColor}</span>
                    </div>
                  </div>
                  <div className="space-y-1" data-testid="color-rgb-r-section">
                    <label className="text-gray-500 font-medium">R</label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                      <span className="font-mono text-gray-800">{currentRGB.r}</span>
                    </div>
                  </div>
                  <div className="space-y-1" data-testid="color-rgb-g-section">
                    <label className="text-gray-500 font-medium">G</label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                      <span className="font-mono text-gray-800">{currentRGB.g}</span>
                    </div>
                  </div>
                  <div className="space-y-1" data-testid="color-rgb-b-section">
                    <label className="text-gray-500 font-medium">B</label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                      <span className="font-mono text-gray-800">{currentRGB.b}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Save Button */}
              <div className="pt-4 border-t">
                <Button 
                  onClick={handleSaveChanges}
                  disabled={isSaving || isLoading}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  data-testid="button-save-appearance"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Preview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold" data-testid="text-preview-title">
              Preview
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant={previewMode === "desktop" ? "default" : "outline"}
                size="sm"
                onClick={() => setPreviewMode("desktop")}
                data-testid="button-preview-desktop"
              >
                Desktop
              </Button>
              <Button
                variant={previewMode === "mobile" ? "default" : "outline"}
                size="sm"
                onClick={() => setPreviewMode("mobile")}
                data-testid="button-preview-mobile"
              >
                Mobile
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className={`${previewMode === "mobile" ? "max-w-sm mx-auto" : ""} space-y-4`}>
              {/* Restaurant Header Preview */}
              <div 
                className="relative h-24 rounded-lg overflow-hidden"
                style={{ 
                  background: `linear-gradient(to right, ${selectedColor}, ${selectedColor}dd)` 
                }}
              >
                <div className="w-full h-full bg-gradient-to-r from-gray-600 to-gray-700 flex items-center justify-center">
                  <span className="text-white font-semibold">Restaurant Header</span>
                </div>
                <div className="absolute inset-0 bg-black/30" />
                <div className="absolute bottom-2 left-4 text-white">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-white/20 text-white">
                      You're at TABLE #5
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Recommended Section */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3" data-testid="text-recommended-title">
                  Recommended For You
                </h3>
                <div className={`grid ${previewMode === "desktop" ? "grid-cols-4" : "grid-cols-2"} gap-3`}>
                  {previewItems.slice(0, 4).map((item) => (
                    <Card key={item.id} className="p-3" data-testid={`card-menu-item-${item.id}`}>
                      <div className="aspect-square bg-orange-400 rounded-lg mb-2 relative overflow-hidden flex items-center justify-center">
                        <span className="text-white text-xs font-medium">Pizza</span>
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-medium line-clamp-1" data-testid={`text-item-name-${item.id}`}>
                          {item.name}
                        </h4>
                        <p className="text-xs text-gray-500 line-clamp-2" data-testid={`text-item-description-${item.id}`}>
                          {item.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <span 
                              className="text-sm font-semibold" 
                              style={{ color: selectedColor }}
                              data-testid={`text-item-price-${item.id}`}
                            >
                              {item.price}
                            </span>
                            <span className="text-xs text-gray-400 line-through" data-testid={`text-item-original-price-${item.id}`}>
                              {item.originalPrice}
                            </span>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          className="w-full text-white hover:opacity-90"
                          style={{ backgroundColor: selectedColor }}
                          data-testid={`button-add-item-${item.id}`}
                        >
                          Add to Cart
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Menu Items List */}
              <div className="space-y-3">
                {previewItems.slice(0, 4).map((item) => (
                  <Card key={`list-${item.id}`} className="p-4" data-testid={`card-menu-list-item-${item.id}`}>
                    <div className="flex gap-4">
                      <div className="w-16 h-16 bg-orange-400 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center">
                        <span className="text-white text-xs font-medium">Pizza</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 dark:text-white" data-testid={`text-list-item-name-${item.id}`}>
                          {item.name}
                        </h4>
                        <p className="text-sm text-gray-500 line-clamp-2 mt-1" data-testid={`text-list-item-description-${item.id}`}>
                          {item.description}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2">
                            <span 
                              className="font-semibold"
                              style={{ color: selectedColor }}
                              data-testid={`text-list-item-price-${item.id}`}
                            >
                              {item.price}
                            </span>
                            <span className="text-sm text-gray-400 line-through" data-testid={`text-list-item-original-price-${item.id}`}>
                              {item.originalPrice}
                            </span>
                          </div>
                          <Button 
                            size="sm" 
                            className="text-white hover:opacity-90"
                            style={{ backgroundColor: selectedColor }}
                            data-testid={`button-add-list-item-${item.id}`}
                          >
                            Add to Cart
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}