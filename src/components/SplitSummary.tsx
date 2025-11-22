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
    let subtotalSum = 0;
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

    // Calculate subtotal sum for proportional distribution
    splitMap.forEach((split) => {
      subtotalSum += split.total;
    });

    // Distribute tax and tip proportionally
    if (subtotalSum > 0 && (tax > 0 || tip > 0)) {
      splitMap.forEach((split) => {
        const proportion = split.total / subtotalSum;
        const taxShare = tax * proportion;
        const tipShare = tip * proportion;
        
        if (taxShare > 0) {
          split.items.push({
            description: "Tax (proportional)",
            share: taxShare,
          });
          split.total += taxShare;
        }
        
        if (tipShare > 0) {
          split.items.push({
            description: "Tip (proportional)",
            share: tipShare,
          });
          split.total += tipShare;
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
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold">Split Summary</h3>
        {splits.length > 0 && (
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        )}
      </div>

      {splits.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No splits calculated yet</p>
          <p className="text-sm mt-1">Assign people to items to see splits</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-primary/10 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">Total Bill</p>
            <p className="text-3xl font-bold text-primary">${grandTotal.toFixed(2)}</p>
          </div>

          <div className="space-y-3">
            {splits.map((split) => (
              <div
                key={split.personId}
                className="border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                      style={{ backgroundColor: split.personColor }}
                    >
                      {split.personName[0].toUpperCase()}
                    </div>
                    <span className="font-medium">{split.personName}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Owes</p>
                    <p className="text-2xl font-bold text-primary">
                      ${split.total.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="space-y-1 pt-3 border-t border-border">
                  {split.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex justify-between text-sm"
                    >
                      <span className="text-muted-foreground">{item.description}</span>
                      <span className="font-medium">${item.share.toFixed(2)}</span>
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
