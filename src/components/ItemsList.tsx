import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";

interface Item {
  id: string;
  description: string;
  price: number;
}

interface Person {
  id: string;
  name: string;
  color: string;
}

interface ItemAssignment {
  item_id: string;
  person_id: string;
}

interface ItemsListProps {
  billId: string;
  onAssignmentChange?: () => void;
}

export const ItemsList = ({ billId, onAssignmentChange }: ItemsListProps) => {
  const [items, setItems] = useState<Item[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [assignments, setAssignments] = useState<ItemAssignment[]>([]);
  const [newItemDesc, setNewItemDesc] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [billId]);

  const fetchData = async () => {
    const [itemsRes, peopleRes, assignmentsRes] = await Promise.all([
      supabase.from("items").select("*").eq("bill_id", billId).order("created_at"),
      supabase.from("people").select("*").order("created_at"),
      supabase
        .from("item_assignments")
        .select("item_id, person_id")
        .in(
          "item_id",
          (await supabase.from("items").select("id").eq("bill_id", billId)).data?.map((i) => i.id) || []
        ),
    ]);

    if (itemsRes.data) setItems(itemsRes.data);
    if (peopleRes.data) setPeople(peopleRes.data);
    if (assignmentsRes.data) setAssignments(assignmentsRes.data);
    setLoading(false);
  };

  const addItem = async () => {
    if (!newItemDesc.trim() || !newItemPrice) return;

    const price = parseFloat(newItemPrice);
    if (isNaN(price) || price <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid price",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("items")
      .insert({ bill_id: billId, description: newItemDesc.trim(), price });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add item",
        variant: "destructive",
      });
    } else {
      setNewItemDesc("");
      setNewItemPrice("");
      fetchData();
    }
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase.from("items").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive",
      });
    } else {
      fetchData();
    }
  };

  const toggleAssignment = async (itemId: string, personId: string) => {
    const existing = assignments.find(
      (a) => a.item_id === itemId && a.person_id === personId
    );

    if (existing) {
      await supabase
        .from("item_assignments")
        .delete()
        .eq("item_id", itemId)
        .eq("person_id", personId);
    } else {
      await supabase
        .from("item_assignments")
        .insert({ item_id: itemId, person_id: personId });
    }

    fetchData();
    onAssignmentChange?.();
  };

  const isAssigned = (itemId: string, personId: string) => {
    return assignments.some(
      (a) => a.item_id === itemId && a.person_id === personId
    );
  };

  if (loading) {
    return <div className="text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Add Item</h3>
        <div className="flex gap-2">
          <Input
            placeholder="Item description"
            value={newItemDesc}
            onChange={(e) => setNewItemDesc(e.target.value)}
            className="flex-1"
          />
          <Input
            placeholder="Price"
            type="number"
            step="0.01"
            value={newItemPrice}
            onChange={(e) => setNewItemPrice(e.target.value)}
            className="w-24"
          />
          <Button onClick={addItem}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </Card>

      {items.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No items added yet</p>
          <p className="text-sm mt-1">Upload a receipt or add items manually</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {people.length === 0 && (
            <Card className="p-4 bg-accent/10 border-accent">
              <p className="text-sm text-center">
                Add people in the People tab to assign items
              </p>
            </Card>
          )}
          
          {items.map((item) => (
            <Card key={item.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-medium">{item.description}</h4>
                  <p className="text-lg font-semibold text-primary">
                    ${item.price.toFixed(2)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteItem(item.id)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>

              {people.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-2">
                    Who's splitting this?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {people.map((person) => (
                      <label
                        key={person.id}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-accent/5 cursor-pointer transition-colors"
                      >
                        <Checkbox
                          checked={isAssigned(item.id, person.id)}
                          onCheckedChange={() =>
                            toggleAssignment(item.id, person.id)
                          }
                        />
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs text-white font-semibold"
                          style={{ backgroundColor: person.color }}
                        >
                          {person.name[0].toUpperCase()}
                        </div>
                        <span className="text-sm">{person.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
