import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Person {
  id: string;
  name: string;
  color: string;
}

const COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444", 
  "#8B5CF6", "#EC4899", "#14B8A6", "#F97316"
];

export const PeopleManager = () => {
  const [people, setPeople] = useState<Person[]>([]);
  const [newPersonName, setNewPersonName] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchPeople();
  }, []);

  const fetchPeople = async () => {
    const { data, error } = await supabase
      .from("people")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load people",
        variant: "destructive",
      });
    } else {
      setPeople(data || []);
    }
    setLoading(false);
  };

  const addPerson = async () => {
    if (!newPersonName.trim()) return;

    const color = COLORS[people.length % COLORS.length];
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase
      .from("people")
      .insert({ name: newPersonName.trim(), color, user_id: user.id });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add person",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `${newPersonName} added`,
      });
      setNewPersonName("");
      fetchPeople();
    }
  };

  const deletePerson = async (id: string, name: string) => {
    const { error } = await supabase
      .from("people")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete person",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `${name} removed`,
      });
      fetchPeople();
    }
  };

  if (loading) {
    return <div className="text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Add Roommate</h2>
        <div className="flex gap-2">
          <Input
            placeholder="Enter name..."
            value={newPersonName}
            onChange={(e) => setNewPersonName(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && addPerson()}
          />
          <Button onClick={addPerson}>
            <Plus className="w-4 h-4 mr-2" />
            Add
          </Button>
        </div>
      </Card>

      <div className="space-y-3">
        {people.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No roommates added yet</p>
            <p className="text-sm mt-1">Add people to start splitting bills</p>
          </Card>
        ) : (
          people.map((person) => (
            <Card key={person.id} className="p-4 flex items-center justify-between hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                  style={{ backgroundColor: person.color }}
                >
                  {person.name[0].toUpperCase()}
                </div>
                <span className="font-medium">{person.name}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deletePerson(person.id, person.name)}
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
