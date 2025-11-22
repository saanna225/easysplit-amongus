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
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{bill.title}</h1>
            <p className="text-sm text-muted-foreground">Split this bill fairly</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        <Card className="p-6 bg-warning/10 border-warning/20">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold mb-1">Add People First</h3>
              <p className="text-sm text-muted-foreground">
                Add people in the People tab to assign items and split costs
              </p>
            </div>
            <Button onClick={() => navigate("/?tab=people")} variant="default">
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

        <ItemsList billId={billId!} />

        <SplitSummary billId={billId!} />
      </main>
    </div>
  );
};

export default BillDetail;
