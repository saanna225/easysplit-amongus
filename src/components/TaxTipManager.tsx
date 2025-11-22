import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TaxTipManagerProps {
  billId: string;
  onUpdate?: () => void;
}

export const TaxTipManager = ({ billId, onUpdate }: TaxTipManagerProps) => {
  const [tax, setTax] = useState("");
  const [tip, setTip] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTaxTip = async () => {
    const { data, error } = await supabase
      .from("bills")
      .select("tax, tip")
      .eq("id", billId)
      .single();

    if (data) {
      setTax(data.tax?.toString() || "0");
      setTip(data.tip?.toString() || "0");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTaxTip();
  }, [billId]);

  const updateTaxTip = async () => {
    const taxValue = parseFloat(tax) || 0;
    const tipValue = parseFloat(tip) || 0;

    if (taxValue < 0 || tipValue < 0) {
      toast({
        title: "Error",
        description: "Tax and tip must be positive values",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("bills")
      .update({ tax: taxValue, tip: tipValue })
      .eq("id", billId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update tax and tip",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Tax and tip updated",
      });
      onUpdate?.();
    }
  };

  if (loading) {
    return <div className="text-center text-muted-foreground">Loading...</div>;
  }

  const calculateTipPercentage = (percentage: number, subtotal: number) => {
    const calculatedTip = (subtotal * percentage) / 100;
    setTip(calculatedTip.toFixed(2));
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-card to-secondary/20 border-border/50 shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <DollarSign className="w-5 h-5 text-primary" />
        </div>
        <h3 className="text-xl font-bold">Tax & Tip</h3>
      </div>
      
      <div className="space-y-6">
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            Tax Amount
          </label>
          <Input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={tax}
            onChange={(e) => setTax(e.target.value)}
            className="text-lg h-12"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            Tip Amount
          </label>
          <Input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={tip}
            onChange={(e) => setTip(e.target.value)}
            className="text-lg h-12"
          />
          
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Calculate tip based on items total
                const fetchSubtotal = async () => {
                  const { data } = await supabase
                    .from("items")
                    .select("price")
                    .eq("bill_id", billId);
                  const subtotal = data?.reduce((sum, item) => sum + item.price, 0) || 0;
                  calculateTipPercentage(15, subtotal);
                };
                fetchSubtotal();
              }}
              className="flex-1"
            >
              15%
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const fetchSubtotal = async () => {
                  const { data } = await supabase
                    .from("items")
                    .select("price")
                    .eq("bill_id", billId);
                  const subtotal = data?.reduce((sum, item) => sum + item.price, 0) || 0;
                  calculateTipPercentage(18, subtotal);
                };
                fetchSubtotal();
              }}
              className="flex-1"
            >
              18%
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const fetchSubtotal = async () => {
                  const { data } = await supabase
                    .from("items")
                    .select("price")
                    .eq("bill_id", billId);
                  const subtotal = data?.reduce((sum, item) => sum + item.price, 0) || 0;
                  calculateTipPercentage(20, subtotal);
                };
                fetchSubtotal();
              }}
              className="flex-1"
            >
              20%
            </Button>
          </div>
        </div>

        <Button onClick={updateTaxTip} className="w-full h-12 text-base font-semibold shadow-md">
          Update Tax & Tip
        </Button>
      </div>
    </Card>
  );
};