import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Upload, Plus, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ReceiptUploader } from "@/components/ReceiptUploader";
import { ItemsList } from "@/components/ItemsList";
import { SplitSummary } from "@/components/SplitSummary";
import { TaxTipManager } from "@/components/TaxTipManager";

interface Bill {
  id: string;
  title: string;
  receipt_image_url: string | null;
  raw_ocr_text: string | null;
}

export const BillDetail = () => {
  const { billId } = useParams<{ billId: string }>();
  const navigate = useNavigate();
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUploader, setShowUploader] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (billId) {
      fetchBill();
    }
  }, [billId]);

  const fetchBill = async () => {
    const { data, error } = await supabase
      .from("bills")
      .select("*")
      .eq("id", billId)
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load bill",
        variant: "destructive",
      });
      navigate("/");
    } else {
      setBill(data);
    }
    setLoading(false);
  };

  if (loading || !bill) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-md sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-5 flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/")}
            className="hover:bg-primary/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {bill.title}
            </h1>
            <p className="text-sm text-muted-foreground">Split this bill fairly among friends</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        <Card className="p-6 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg mb-1">👥 Add People First</h3>
              <p className="text-sm text-muted-foreground">
                Add roommates or friends to assign items and calculate split costs
              </p>
            </div>
            <Button 
              onClick={() => navigate("/?tab=people")} 
              className="shadow-md"
              size="lg"
            >
              Add People
            </Button>
          </div>
        </Card>

        {!bill.receipt_image_url && !showUploader && (
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold mb-1">Upload Receipt</h3>
                <p className="text-sm text-muted-foreground">
                  Scan receipt to automatically extract items
                </p>
              </div>
              <Button onClick={() => setShowUploader(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </Button>
            </div>
          </Card>
        )}

        {showUploader && (
          <ReceiptUploader
            billId={billId!}
            onSuccess={() => {
              setShowUploader(false);
              fetchBill();
            }}
            onCancel={() => setShowUploader(false)}
          />
        )}

        {bill.receipt_image_url && (
          <Card className="p-4">
            <img
              src={bill.receipt_image_url}
              alt="Receipt"
              className="max-h-64 mx-auto rounded-lg"
            />
          </Card>
        )}

        <ItemsList billId={billId!} onAssignmentChange={() => setRefreshKey(prev => prev + 1)} />

        <TaxTipManager billId={billId!} onUpdate={() => setRefreshKey(prev => prev + 1)} />

        <SplitSummary billId={billId!} refreshKey={refreshKey} />
      </main>
    </div>
  );
};

export default BillDetail;
