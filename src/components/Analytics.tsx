import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";

interface WeeklySpending {
  weekNumber: number;
  weekStart: Date;
  weekEnd: Date;
  total: number;
}

interface Bill {
  id: string;
  title: string;
  created_at: string;
  tax: number;
  tip: number;
}

interface PersonSpending {
  personId: string;
  personName: string;
  personColor: string;
  total: number;
}

export const Analytics = () => {
  const [weeklyData, setWeeklyData] = useState<WeeklySpending[]>([]);
  const [totalSpending, setTotalSpending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [signupDate, setSignupDate] = useState<Date | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [selectedBills, setSelectedBills] = useState<Set<string>>(new Set());
  const [personSpending, setPersonSpending] = useState<PersonSpending[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  useEffect(() => {
    if (selectedBills.size > 0) {
      calculatePersonSpending();
    } else {
      setPersonSpending([]);
    }
  }, [selectedBills]);

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
      const { data: billsData } = await supabase
        .from("bills")
        .select("id, title, created_at, tax, tip")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!billsData) return;
      setBills(billsData);

      // Fetch all items for these bills
      const billIds = billsData.map(b => b.id);
      const { data: items } = await supabase
        .from("items")
        .select("bill_id, price")
        .in("bill_id", billIds);

      // Calculate total spending per bill
      const billTotals = billsData.map(bill => {
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

  const calculatePersonSpending = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const selectedBillIds = Array.from(selectedBills);

      // Fetch items for selected bills
      const { data: items } = await supabase
        .from("items")
        .select("id, bill_id, price")
        .in("bill_id", selectedBillIds);

      if (!items) return;

      // Fetch item assignments
      const itemIds = items.map(i => i.id);
      const { data: assignments } = await supabase
        .from("item_assignments")
        .select("item_id, person_id")
        .in("item_id", itemIds);

      if (!assignments) return;

      // Fetch people
      const { data: people } = await supabase
        .from("people")
        .select("id, name, color")
        .eq("user_id", user.id);

      if (!people) return;

      // Calculate spending per person
      const spendingMap = new Map<string, { name: string; color: string; total: number }>();

      people.forEach(person => {
        spendingMap.set(person.id, { name: person.name, color: person.color, total: 0 });
      });

      // Calculate item costs split among assigned people
      items.forEach(item => {
        const itemAssignments = assignments.filter(a => a.item_id === item.id);
        if (itemAssignments.length > 0) {
          const costPerPerson = Number(item.price) / itemAssignments.length;
          itemAssignments.forEach(assignment => {
            const personData = spendingMap.get(assignment.person_id);
            if (personData) {
              personData.total += costPerPerson;
            }
          });
        }
      });

      // Add tax and tip split equally among all people
      const selectedBillsData = bills.filter(b => selectedBillIds.includes(b.id));
      const totalTax = selectedBillsData.reduce((sum, b) => sum + Number(b.tax || 0), 0);
      const totalTip = selectedBillsData.reduce((sum, b) => sum + Number(b.tip || 0), 0);
      const taxTipPerPerson = (totalTax + totalTip) / people.length;

      spendingMap.forEach(personData => {
        personData.total += taxTipPerPerson;
      });

      const spending: PersonSpending[] = Array.from(spendingMap.entries())
        .map(([personId, data]) => ({
          personId,
          personName: data.name,
          personColor: data.color,
          total: data.total
        }))
        .sort((a, b) => b.total - a.total);

      setPersonSpending(spending);
    } catch (error) {
      console.error("Error calculating person spending:", error);
    }
  };

  const toggleBillSelection = (billId: string) => {
    setSelectedBills(prev => {
      const newSet = new Set(prev);
      if (newSet.has(billId)) {
        newSet.delete(billId);
      } else {
        newSet.add(billId);
      }
      return newSet;
    });
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
        <h3 className="text-xl font-semibold mb-4">Per-Person Spending</h3>
        {bills.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No bills yet. Create your first bill to get started!</p>
          </Card>
        ) : (
          <>
            <Card className="p-4 mb-4">
              <p className="text-sm font-medium mb-3">Select bills to analyze:</p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {bills.map((bill) => (
                  <div key={bill.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={bill.id}
                      checked={selectedBills.has(bill.id)}
                      onCheckedChange={() => toggleBillSelection(bill.id)}
                    />
                    <label
                      htmlFor={bill.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {bill.title} - {new Date(bill.created_at).toLocaleDateString()}
                    </label>
                  </div>
                ))}
              </div>
            </Card>

            {personSpending.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground mb-2">
                  Showing spending for {selectedBills.size} selected bill(s)
                </p>
                {personSpending.map((person) => (
                  <Card key={person.personId} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: person.personColor }}
                        />
                        <p className="font-semibold">{person.personName}</p>
                      </div>
                      <p className="text-2xl font-bold text-primary">${person.total.toFixed(2)}</p>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>

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