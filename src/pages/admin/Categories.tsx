import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

type Category = {
  id: string;
  name: string;
  icon: string;
  color: string;
  created_at: string;
  updated_at: string;
};

type FormState = {
  id: string | null;
  name: string;
  icon: string;
  color: string;
};

const iconOptions = [
  '', // Opção "Nenhum"
  '🎪', '🎈', '⚙️', '🎁', '🎯', '🎨', '🎮', '🎸', 
  '📦', '🛠️', '🏗️', '🚚', '💡', '⭐', '🔥', '✨'
];

const Categories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>({
    id: null,
    name: "",
    icon: "",
    color: ""
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");
      
      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar categorias:", error);
      toast.error("Erro ao carregar categorias");
    } finally {
      setLoading(false);
    }
  };

  const handleChangeForm = (field: keyof FormState, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm({
      id: null,
      name: "",
      icon: "",
      color: ""
    });
  };

  const handleSubmitCategory = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error("O nome da categoria é obrigatório");
      return;
    }

    try {
      if (form.id) {
        // Atualizar categoria existente
        const { error } = await supabase
          .from("categories")
          .update({
            name: form.name,
            icon: form.icon,
            color: form.color
          })
          .eq("id", form.id);

        if (error) throw error;
        toast.success("Categoria atualizada com sucesso");
      } else {
        // Criar nova categoria
        const { error } = await supabase
          .from("categories")
          .insert({
            name: form.name,
            icon: form.icon,
            color: form.color
          });

        if (error) throw error;
        toast.success("Categoria criada com sucesso");
      }

      resetForm();
      loadCategories();
    } catch (error: any) {
      console.error("Erro ao salvar categoria:", error);
      toast.error(`Erro ao salvar categoria: ${error.message}`);
    }
  };

  const handleEditCategory = (category: Category) => {
    setForm({
      id: category.id,
      name: category.name,
      icon: category.icon || "",
      color: category.color || ""
    });
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta categoria? Os produtos ficarão sem categoria.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Categoria excluída com sucesso");
      loadCategories();
    } catch (error: any) {
      console.error("Erro ao excluir categoria:", error);
      toast.error(`Erro ao excluir categoria: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📝 {form.id ? "Editar Categoria" : "Adicionar Categoria"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmitCategory} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Categoria</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => handleChangeForm("name", e.target.value)}
                  placeholder="Digite o nome da categoria"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="icon">Ícone (opcional)</Label>
                <Select value={form.icon} onValueChange={(v) => handleChangeForm("icon", v)}>
                  <SelectTrigger id="icon">
                    <SelectValue placeholder="Nenhum" />
                  </SelectTrigger>
                  <SelectContent>
                    {iconOptions.map((icon, index) => (
                      <SelectItem key={index} value={icon || "none"}>
                        {icon ? (
                          <span className="text-2xl">{icon}</span>
                        ) : (
                          <span className="text-muted-foreground">Nenhum</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Cor (opcional)</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    type="color"
                    id="color"
                    value={form.color || "#6366f1"}
                    onChange={(e) => handleChangeForm("color", e.target.value)}
                    className="w-16 h-10 p-1 cursor-pointer"
                  />
                  {form.color ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleChangeForm("color", "")}
                    >
                      Remover cor
                    </Button>
                  ) : (
                    <span className="text-sm text-muted-foreground">Sem cor definida</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                {form.id ? "Atualizar" : "Adicionar"} Categoria
              </Button>
              {form.id && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>📋 Categorias Cadastradas</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Carregando categorias...</p>
          ) : categories.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma categoria cadastrada
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Ícone</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead className="w-32">Cor</TableHead>
                    <TableHead className="w-24 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell>
                        {category.icon ? (
                          <span className="text-2xl">{category.icon}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell>
                        {category.color ? (
                          <div 
                            className="h-8 w-full rounded-md" 
                            style={{ backgroundColor: category.color }} 
                          />
                        ) : (
                          <span className="text-muted-foreground">Sem cor</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditCategory(category)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteCategory(category.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Categories;
