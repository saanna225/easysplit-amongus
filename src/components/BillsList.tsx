import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Receipt, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface Bill {
  id: string;
  title: string;
  created_at: string;
}

export const BillsList = () => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBillTitle, setNewBillTitle] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    const { data, error } = await supabase
      .from("bills")
      .select("id, title, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load bills",
        variant: "destructive",
      });
    } else {
      setBills(data || []);
    }
    setLoading(false);
  };

  const createBill = async () => {
    if (!newBillTitle.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("bills")
      .insert({ title: newBillTitle.trim(), user_id: user.id })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create bill",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Bill created",
      });
      setNewBillTitle("");
      setDialogOpen(false);
      navigate(`/bill/${data.id}`);
    }
  };

  const deleteBill = async (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const { error } = await supabase
      .from("bills")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete bill",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `"${title}" deleted`,
      });
      fetchBills();
    }
  };

  if (loading) {
    return <div className="text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex justify-center">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="gap-2">
              <Plus className="w-5 h-5" />
              New Bill
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Bill</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="e.g., Grocery Receipt, Restaurant Bill"
                value={newBillTitle}
                onChange={(e) => setNewBillTitle(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && createBill()}
              />
              <Button onClick={createBill} className="w-full">
                Create Bill
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {bills.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No bills yet</p>
            <p className="text-sm mt-1">Create your first bill to get started</p>
          </Card>
        ) : (
          bills.map((bill) => (
            <Card
              key={bill.id}
              className="p-4 flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/bill/${bill.id}`)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">{bill.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {new Date(bill.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => deleteBill(bill.id, bill.title, e)}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
