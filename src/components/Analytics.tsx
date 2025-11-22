import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface WeeklySpending {
  weekNumber: number;
  weekStart: Date;
  weekEnd: Date;
  total: number;
}

export const Analytics = () => {
  const [weeklyData, setWeeklyData] = useState<WeeklySpending[]>([]);
  const [totalSpending, setTotalSpending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [signupDate, setSignupDate] = useState<Date | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user profile to find signup date
      const { data: profile } = await supabase
        .from("profiles")
        .select("created_at")
        .eq("user_id", user.id)
        .single();

      const userSignupDate = profile?.created_at ? new Date(profile.created_at) : new Date();
      setSignupDate(userSignupDate);

      // Fetch all bills
      const { data: bills } = await supabase
        .from("bills")
        .select("id, created_at, tax, tip")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (!bills) return;

      // Fetch all items for these bills
      const billIds = bills.map(b => b.id);
      const { data: items } = await supabase
        .from("items")
        .select("bill_id, price")
        .in("bill_id", billIds);

      // Calculate total spending per bill
      const billTotals = bills.map(bill => {
        const billItems = items?.filter(item => item.bill_id === bill.id) || [];
        const itemsTotal = billItems.reduce((sum, item) => sum + Number(item.price), 0);
        return {
          billId: bill.id,
          date: new Date(bill.created_at),
          total: itemsTotal + Number(bill.tax || 0) + Number(bill.tip || 0)
        };
      });

      // Calculate weeks since signup
      const getWeekNumber = (date: Date) => {
        const diffTime = Math.abs(date.getTime() - userSignupDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return Math.floor(diffDays / 7) + 1;
      };

      // Group by week
      const weeklyMap = new Map<number, number>();
      billTotals.forEach(bill => {
        const weekNum = getWeekNumber(bill.date);
        weeklyMap.set(weekNum, (weeklyMap.get(weekNum) || 0) + bill.total);
      });

      // Create weekly data with date ranges
      const getWeekRange = (weekNum: number) => {
        const weekStart = new Date(userSignupDate);
        weekStart.setDate(weekStart.getDate() + (weekNum - 1) * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        return { weekStart, weekEnd };
      };

      const weekly: WeeklySpending[] = Array.from(weeklyMap.entries())
        .map(([weekNumber, total]) => ({
          weekNumber,
          ...getWeekRange(weekNumber),
          total
        }))
        .sort((a, b) => a.weekNumber - b.weekNumber);

      setWeeklyData(weekly);
      const total = billTotals.reduce((sum, bill) => sum + bill.total, 0);
      setTotalSpending(total);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <h2 className="text-2xl font-bold mb-2">Total Spending</h2>
        <p className="text-4xl font-bold text-primary">${totalSpending.toFixed(2)}</p>
        {signupDate && (
          <p className="text-sm text-muted-foreground mt-2">
            Since {signupDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        )}
      </Card>

      <div>
        <h3 className="text-xl font-semibold mb-4">Weekly Breakdown</h3>
        {weeklyData.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No spending data yet. Upload your first bill to get started!</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {weeklyData.map((week) => (
              <Card key={week.weekNumber} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">Week {week.weekNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(week.weekStart)} - {formatDate(week.weekEnd)}
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-primary">${week.total.toFixed(2)}</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};