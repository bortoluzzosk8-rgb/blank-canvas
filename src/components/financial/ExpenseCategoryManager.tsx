import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, Save, X, ChevronRight } from "lucide-react";

interface ExpenseCategory {
  id: string;
  name: string;
  icon: string;
  franchise_id: string | null;
  parent_id: string | null;
}

interface CategoryWithSubs extends ExpenseCategory {
  subcategories: ExpenseCategory[];
}

export function ExpenseCategoryManager() {
  const { userFranchise, isFranqueadora } = useAuth();
  const franchiseId = userFranchise?.id;

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategory, setNewCategory] = useState({ name: "", icon: "📦", parent_id: "" });
  const [categoryType, setCategoryType] = useState<"main" | "sub">("main");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState({ name: "", icon: "" });

  useEffect(() => {
    fetchCategories();
  }, [franchiseId]);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("expense_categories")
        .select("*")
        .order("name");

      if (franchiseId && !isFranqueadora) {
        query = query.or(`franchise_id.eq.${franchiseId},franchise_id.is.null`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error("Erro ao carregar categorias");
    } finally {
      setLoading(false);
    }
  };

  // Get main categories (parent_id is null)
  const mainCategories = categories.filter(c => !c.parent_id);

  // Get categories grouped with their subcategories
  const categoriesWithSubs: CategoryWithSubs[] = mainCategories.map(main => ({
    ...main,
    subcategories: categories.filter(c => c.parent_id === main.id)
  }));

  const handleAdd = async () => {
    if (!newCategory.name.trim()) {
      toast.error("Informe o nome da categoria");
      return;
    }

    if (categoryType === "sub" && !newCategory.parent_id) {
      toast.error("Selecione a categoria pai");
      return;
    }

    try {
      const { error } = await supabase.from("expense_categories").insert({
        name: newCategory.name.trim(),
        icon: newCategory.icon || "📦",
        franchise_id: isFranqueadora ? null : franchiseId,
        parent_id: categoryType === "sub" ? newCategory.parent_id : null,
      });

      if (error) throw error;
      toast.success(categoryType === "sub" ? "Subcategoria criada com sucesso!" : "Categoria criada com sucesso!");
      setNewCategory({ name: "", icon: "📦", parent_id: "" });
      setCategoryType("main");
      fetchCategories();
    } catch (error) {
      console.error("Error creating category:", error);
      toast.error("Erro ao criar categoria");
    }
  };

  const handleEdit = (category: ExpenseCategory) => {
    setEditingId(category.id);
    setEditingData({ name: category.name, icon: category.icon });
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editingData.name.trim()) {
      toast.error("Informe o nome da categoria");
      return;
    }

    try {
      const { error } = await supabase
        .from("expense_categories")
        .update({
          name: editingData.name.trim(),
          icon: editingData.icon || "📦",
        })
        .eq("id", editingId);

      if (error) throw error;
      toast.success("Categoria atualizada com sucesso!");
      setEditingId(null);
      fetchCategories();
    } catch (error) {
      console.error("Error updating category:", error);
      toast.error("Erro ao atualizar categoria");
    }
  };

  const handleDelete = async (id: string, isGlobal: boolean) => {
    if (isGlobal && !isFranqueadora) {
      toast.error("Apenas a franqueadora pode excluir categorias globais");
      return;
    }

    // Check if category has subcategories
    const hasSubcategories = categories.some(c => c.parent_id === id);
    if (hasSubcategories) {
      if (!confirm("Esta categoria possui subcategorias que também serão excluídas. Continuar?")) return;
    } else {
      if (!confirm("Tem certeza que deseja excluir esta categoria?")) return;
    }

    try {
      const { error } = await supabase
        .from("expense_categories")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Categoria excluída com sucesso!");
      fetchCategories();
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("Erro ao excluir categoria");
    }
  };

  const COMMON_ICONS = ["📦", "⛽", "🏠", "🔧", "💼", "📣", "📋", "🛠️", "📝", "💰", "🚗", "💡", "📱", "🎯", "🛒", "🏭", "🏛️", "🖥️"];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add New Category */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">➕ Nova Categoria</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Category Type Selector */}
          <div className="space-y-2">
            <Label>Tipo</Label>
            <RadioGroup
              value={categoryType}
              onValueChange={(value) => {
                setCategoryType(value as "main" | "sub");
                if (value === "main") {
                  setNewCategory(prev => ({ ...prev, parent_id: "" }));
                }
              }}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="main" id="type-main" />
                <Label htmlFor="type-main" className="cursor-pointer">Categoria Principal</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sub" id="type-sub" />
                <Label htmlFor="type-sub" className="cursor-pointer">Subcategoria</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Parent Category Selector (only for subcategories) */}
          {categoryType === "sub" && (
            <div className="space-y-2">
              <Label>Categoria Pai *</Label>
              <Select
                value={newCategory.parent_id}
                onValueChange={(value) => setNewCategory({ ...newCategory, parent_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria pai" />
                </SelectTrigger>
                <SelectContent>
                  {mainCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>Ícone</Label>
              <div className="flex flex-wrap gap-1 max-w-xs">
                {COMMON_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setNewCategory({ ...newCategory, icon })}
                    className={`w-8 h-8 text-lg rounded border transition-all ${
                      newCategory.icon === icon
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 min-w-[200px] space-y-2">
              <Label>Nome {categoryType === "sub" ? "da Subcategoria" : "da Categoria"}</Label>
              <Input
                placeholder={categoryType === "sub" ? "Ex: Bebedouro" : "Ex: Equipamentos"}
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
            </div>
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Categories List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📂 Categorias Cadastradas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {categoriesWithSubs.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhuma categoria cadastrada
              </p>
            ) : (
              categoriesWithSubs.map((category) => {
                const isGlobal = !category.franchise_id;
                const canEdit = isFranqueadora || !isGlobal;
                const isEditing = editingId === category.id;

                return (
                  <div key={category.id}>
                    {/* Main Category */}
                    <div
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-2 flex-1">
                          <div className="flex gap-1">
                            {COMMON_ICONS.slice(0, 8).map((icon) => (
                              <button
                                key={icon}
                                type="button"
                                onClick={() => setEditingData({ ...editingData, icon })}
                                className={`w-7 h-7 text-sm rounded border transition-all ${
                                  editingData.icon === icon
                                    ? "border-primary bg-primary/10"
                                    : "border-border hover:border-primary/50"
                                }`}
                              >
                                {icon}
                              </button>
                            ))}
                          </div>
                          <Input
                            value={editingData.name}
                            onChange={(e) => setEditingData({ ...editingData, name: e.target.value })}
                            className="flex-1 max-w-xs"
                            onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
                          />
                          <Button size="sm" onClick={handleSaveEdit}>
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{category.icon}</span>
                            <span className="font-medium">{category.name}</span>
                            {isGlobal && (
                              <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                                Global
                              </span>
                            )}
                            {category.subcategories.length > 0 && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                {category.subcategories.length} sub
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {canEdit && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEdit(category)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDelete(category.id, isGlobal)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Subcategories */}
                    {category.subcategories.length > 0 && (
                      <div className="ml-6 mt-1 space-y-1">
                        {category.subcategories.map((sub) => {
                          const subIsGlobal = !sub.franchise_id;
                          const subCanEdit = isFranqueadora || !subIsGlobal;
                          const subIsEditing = editingId === sub.id;

                          return (
                            <div
                              key={sub.id}
                              className="flex items-center justify-between p-2 pl-4 rounded-lg border border-dashed bg-muted/30 hover:bg-accent/30 transition-colors"
                            >
                              {subIsEditing ? (
                                <div className="flex items-center gap-2 flex-1">
                                  <div className="flex gap-1">
                                    {COMMON_ICONS.slice(0, 6).map((icon) => (
                                      <button
                                        key={icon}
                                        type="button"
                                        onClick={() => setEditingData({ ...editingData, icon })}
                                        className={`w-6 h-6 text-xs rounded border transition-all ${
                                          editingData.icon === icon
                                            ? "border-primary bg-primary/10"
                                            : "border-border hover:border-primary/50"
                                        }`}
                                      >
                                        {icon}
                                      </button>
                                    ))}
                                  </div>
                                  <Input
                                    value={editingData.name}
                                    onChange={(e) => setEditingData({ ...editingData, name: e.target.value })}
                                    className="flex-1 max-w-[180px] h-8"
                                    onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
                                  />
                                  <Button size="sm" className="h-7" onClick={handleSaveEdit}>
                                    <Save className="h-3 w-3" />
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-7" onClick={() => setEditingId(null)}>
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center gap-2">
                                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-sm">{sub.icon}</span>
                                    <span className="text-sm">{sub.name}</span>
                                    {subIsGlobal && (
                                      <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">
                                        Global
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {subCanEdit && (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-7 w-7 p-0"
                                          onClick={() => handleEdit(sub)}
                                        >
                                          <Pencil className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                          onClick={() => handleDelete(sub.id, subIsGlobal)}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
