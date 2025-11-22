import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Person {
  id: string;
  name: string;
  color: string;
}

interface Item {
  id: string;
  description: string;
  price: number;
}

interface ItemAssignment {
  item_id: string;
  person_id: string;
}

interface Split {
  personId: string;
  personName: string;
  personColor: string;
  total: number;
  items: { description: string; share: number }[];
}

interface SplitSummaryProps {
  billId: string;
  refreshKey?: number;
}

export const SplitSummary = ({ billId, refreshKey }: SplitSummaryProps) => {
  const [splits, setSplits] = useState<Split[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    calculateSplits();
  }, [billId, refreshKey]);

  const calculateSplits = async () => {
    const [itemsRes, peopleRes, assignmentsRes, billRes] = await Promise.all([
      supabase.from("items").select("*").eq("bill_id", billId),
      supabase.from("people").select("*"),
      supabase
        .from("item_assignments")
        .select("item_id, person_id")
        .in(
          "item_id",
          (await supabase.from("items").select("id").eq("bill_id", billId)).data?.map((i) => i.id) || []
        ),
      supabase.from("bills").select("tax, tip").eq("id", billId).single(),
    ]);

    const items: Item[] = itemsRes.data || [];
    const people: Person[] = peopleRes.data || [];
    const assignments: ItemAssignment[] = assignmentsRes.data || [];
    const tax = billRes.data?.tax || 0;
    const tip = billRes.data?.tip || 0;

    // Calculate splits
    const splitMap = new Map<string, Split>();

    people.forEach((person) => {
      splitMap.set(person.id, {
        personId: person.id,
        personName: person.name,
        personColor: person.color,
        total: 0,
        items: [],
      });
    });

    // Calculate subtotal for each person
    items.forEach((item) => {
      const itemAssignments = assignments.filter((a) => a.item_id === item.id);
      const splitCount = itemAssignments.length;

      if (splitCount > 0) {
        const sharePerPerson = item.price / splitCount;

        itemAssignments.forEach((assignment) => {
          const split = splitMap.get(assignment.person_id);
          if (split) {
            split.total += sharePerPerson;
            split.items.push({
              description: item.description,
              share: sharePerPerson,
            });
          }
        });
      }
    });

    // Distribute tax and tip equally among all people
    const peopleWithItems = Array.from(splitMap.values()).filter(s => s.total > 0);
    const peopleCount = peopleWithItems.length;

    if (peopleCount > 0 && (tax > 0 || tip > 0)) {
      const taxShare = tax / peopleCount;
      const tipShare = tip / peopleCount;
      
      splitMap.forEach((split) => {
        if (split.total > 0) {
          if (taxShare > 0) {
            split.items.push({
              description: "Tax (split equally)",
              share: taxShare,
            });
            split.total += taxShare;
          }
          
          if (tipShare > 0) {
            split.items.push({
              description: "Tip (split equally)",
              share: tipShare,
            });
            split.total += tipShare;
          }
        }
      });
    }

    setSplits(Array.from(splitMap.values()).filter((s) => s.total > 0));
    setLoading(false);
  };

  const exportToCSV = () => {
    if (splits.length === 0) {
      toast({
        title: "Nothing to export",
        description: "Add items and assign people first",
      });
      return;
    }

    const headers = ["Person", "Total Owed", "Item", "Share"];
    const rows: string[][] = [];

    splits.forEach((split) => {
      split.items.forEach((item, index) => {
        rows.push([
          index === 0 ? split.personName : "",
          index === 0 ? `$${split.total.toFixed(2)}` : "",
          item.description,
          `$${item.share.toFixed(2)}`,
        ]);
      });
    });

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bill-split-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "Split exported to CSV",
    });
  };

  if (loading) {
    return <div className="text-center text-muted-foreground">Loading...</div>;
  }

  const grandTotal = splits.reduce((sum, split) => sum + split.total, 0);

  return (
    <Card className="p-6 bg-gradient-to-br from-card to-secondary/20 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-success" />
          </div>
          <h3 className="text-xl font-bold">Split Summary</h3>
        </div>
        {splits.length > 0 && (
          <Button onClick={exportToCSV} variant="outline" size="sm" className="shadow-sm">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        )}
      </div>

      {splits.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">
          <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
            <DollarSign className="w-8 h-8 opacity-50" />
          </div>
          <p className="font-medium">No splits calculated yet</p>
          <p className="text-sm mt-1">Assign people to items to see the breakdown</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl p-6 text-center border border-primary/20 shadow-md">
            <p className="text-sm text-muted-foreground mb-2">Total Bill Amount</p>
            <p className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              ${grandTotal.toFixed(2)}
            </p>
          </div>

          <div className="space-y-4">
            {splits.map((split) => (
              <div
                key={split.personId}
                className="border border-border/50 rounded-xl p-5 hover:shadow-lg transition-all duration-200 bg-card"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md"
                      style={{ backgroundColor: split.personColor }}
                    >
                      {split.personName[0].toUpperCase()}
                    </div>
                    <span className="font-semibold text-lg">{split.personName}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground mb-1">Owes</p>
                    <p className="text-3xl font-bold text-primary">
                      ${split.total.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-border/50">
                  {split.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex justify-between text-sm py-1"
                    >
                      <span className="text-muted-foreground">{item.description}</span>
                      <span className="font-semibold">${item.share.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};
