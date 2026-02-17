import { useState } from "react";
import { Plus, Pencil, Trash2, Check, X, MapPin, Settings as SettingsIcon, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mockAreas, mockCompany } from "@/lib/mock-data";
import { toast } from "@/hooks/use-toast";

export default function Settings() {
  const [areas, setAreas] = useState<string[]>([...mockAreas]);
  const [newArea, setNewArea] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [defaultDueDays, setDefaultDueDays] = useState(mockCompany.default_due_days);
  const [isEditingDueDays, setIsEditingDueDays] = useState(false);

  function handleSaveCompanySettings() {
    if (defaultDueDays < 1 || defaultDueDays > 365) {
      toast({ title: "Invalid value", description: "Due days must be between 1 and 365.", variant: "destructive" });
      return;
    }
    mockCompany.default_due_days = defaultDueDays;
    setIsEditingDueDays(false);
    toast({ title: "Settings saved", description: `Company default due days set to ${defaultDueDays}.` });
  }
  function handleAddArea() {
    const trimmed = newArea.trim();
    if (!trimmed) return;
    if (areas.some((a) => a.toLowerCase() === trimmed.toLowerCase())) {
      toast({ title: "Duplicate area", description: "This area already exists.", variant: "destructive" });
      return;
    }
    const updated = [...areas, trimmed];
    setAreas(updated);
    mockAreas.length = 0;
    mockAreas.push(...updated);
    setNewArea("");
    toast({ title: "Area added", description: `"${trimmed}" has been added.` });
  }

  function handleStartEdit(index: number) {
    setEditingIndex(index);
    setEditValue(areas[index]);
  }

  function handleSaveEdit(index: number) {
    const trimmed = editValue.trim();
    if (!trimmed) return;
    if (areas.some((a, i) => i !== index && a.toLowerCase() === trimmed.toLowerCase())) {
      toast({ title: "Duplicate area", description: "This area already exists.", variant: "destructive" });
      return;
    }
    const updated = [...areas];
    updated[index] = trimmed;
    setAreas(updated);
    mockAreas.length = 0;
    mockAreas.push(...updated);
    setEditingIndex(null);
    toast({ title: "Area updated", description: `Area renamed to "${trimmed}".` });
  }

  function handleDeleteArea(index: number) {
    const name = areas[index];
    const updated = areas.filter((_, i) => i !== index);
    setAreas(updated);
    mockAreas.length = 0;
    mockAreas.push(...updated);
    setEditingIndex(null);
    toast({ title: "Area removed", description: `"${name}" has been removed.` });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Company Settings</h1>
        <p className="text-sm text-muted-foreground">Manage company-wide configuration</p>
      </div>

      {/* Default Due Days */}
      <div className="rounded-xl bg-card p-5 stat-card-shadow max-w-xl">
        <div className="flex items-center gap-2 mb-4">
          <SettingsIcon className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Default Due Days</h2>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="space-y-2 flex-1 max-w-xs">
            <Label htmlFor="default_due_days">Company-wide Default</Label>
            <p className="text-xs text-muted-foreground">Applied when no invoice or customer-level due date is set.</p>
            <Input
              id="default_due_days"
              type="number"
              min={1}
              max={365}
              value={defaultDueDays}
              disabled={!isEditingDueDays}
              onChange={(e) => setDefaultDueDays(Number(e.target.value))}
            />
          </div>
          {isEditingDueDays ? (
            <div className="flex gap-2">
              <Button onClick={handleSaveCompanySettings} className="gradient-primary text-primary-foreground gap-2">
                <Save className="h-4 w-4" /> Save
              </Button>
              <Button variant="outline" onClick={() => { setDefaultDueDays(mockCompany.default_due_days); setIsEditingDueDays(false); }}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setIsEditingDueDays(true)}>Edit</Button>
          )}
        </div>
      </div>

      {/* Area Management */}
      <div className="rounded-xl bg-card p-5 stat-card-shadow max-w-xl">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Area List</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Manage the predefined list of areas used to classify customers across the application.
        </p>

        {/* Add new area */}
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Enter new area name"
            value={newArea}
            onChange={(e) => setNewArea(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddArea()}
            className="flex-1"
          />
          <Button onClick={handleAddArea} className="gradient-primary text-primary-foreground gap-2" disabled={!newArea.trim()}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>

        {/* Area list */}
        <ul className="divide-y divide-border rounded-lg border">
          {areas.map((area, index) => (
            <li key={index} className="flex items-center gap-2 px-3 py-2.5">
              {editingIndex === index ? (
                <>
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveEdit(index)}
                    className="flex-1 h-8"
                    autoFocus
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" onClick={() => handleSaveEdit(index)}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingIndex(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm">{area}</span>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleStartEdit(index)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDeleteArea(index)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </li>
          ))}
          {areas.length === 0 && (
            <li className="px-3 py-4 text-center text-sm text-muted-foreground">No areas defined yet.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
