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

  useEffect(() => {
    fetchTaxTip();
  }, [billId]);

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

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Tax & Tip</h3>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">
            Tax Amount
          </label>
          <div className="flex gap-2">
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={tax}
              onChange={(e) => setTax(e.target.value)}
              className="flex-1"
            />
          </div>
        </div>

        <div>
          <label className="text-sm text-muted-foreground mb-1 block">
            Tip Amount
          </label>
          <div className="flex gap-2">
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={tip}
              onChange={(e) => setTip(e.target.value)}
              className="flex-1"
            />
          </div>
        </div>

        <Button onClick={updateTaxTip} className="w-full">
          Update Tax & Tip
        </Button>
      </div>
    </Card>
  );
};