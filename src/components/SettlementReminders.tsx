import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UnsettledBill {
  id: string;
  title: string;
  daysOld: number;
}

export const SettlementReminders = () => {
  const [unsettledBills, setUnsettledBills] = useState<UnsettledBill[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchUnsettledBills();
  }, []);

  const fetchUnsettledBills = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const { data: bills } = await supabase
        .from("bills")
        .select("id, title, created_at")
        .eq("user_id", user.id)
        .lt("created_at", threeDaysAgo.toISOString())
        .order("created_at", { ascending: false });

      if (!bills) return;

      const unsettled: UnsettledBill[] = bills.map(bill => {
        const billDate = new Date(bill.created_at);
        const diffTime = Math.abs(new Date().getTime() - billDate.getTime());
        const daysOld = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return {
          id: bill.id,
          title: bill.title,
          daysOld
        };
      });

      setUnsettledBills(unsettled);
    } catch (error) {
      console.error("Error fetching unsettled bills:", error);
    }
  };

  const handleDismiss = (billId: string) => {
    setDismissed(prev => new Set([...prev, billId]));
  };

  const visibleReminders = unsettledBills.filter(bill => !dismissed.has(bill.id));

  if (visibleReminders.length === 0) return null;

  return (
    <div className="space-y-2 mb-6">
      {visibleReminders.map(bill => (
        <Alert key={bill.id} className="bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800">
          <Bell className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="flex justify-between items-center">
            <span className="text-sm">
              <strong>{bill.title}</strong> was uploaded {bill.daysOld} days ago. Have you settled this bill?
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDismiss(bill.id)}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
};