import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from "@/components/ui/select";
import { Plus, Edit, Trash2, Loader2, Eye, EyeOff, Package, GripVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type Category = { 
  id: string; 
  name: string; 
  icon: string;
  color: string;
};

type Product = {
  id: string;
  name: string;
  description: string | null;
  cost_price: number;
  sale_price: number;
  image_url: string[] | null;
  category_id: string | null;
  stock_qty: number;
  lead_time_days: number | null;
  visible: boolean;
  display_order: number;
};

type FormState = {
  idEditing: string;
  name: string;
  description: string;
  salePrice: string;
  imageUrls: string[];
  categoryId: string;
};

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Componente para cada item arrastável
const SortableProductItem = ({ 
  product, 
  category, 
  onEdit, 
  onDelete, 
  onToggleVisibility,
  formatCurrency
}: {
  product: Product;
  category: Category | undefined;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onToggleVisibility: (id: string, currentVisible: boolean) => void;
  formatCurrency: (v: number) => string;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const firstImage = product.image_url?.[0];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
    >
      {/* Handle de arrasto */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-2 hover:bg-muted rounded"
      >
        <GripVertical className="w-5 h-5 text-muted-foreground" />
      </div>

      {/* Imagem do produto */}
      {firstImage ? (
        <img
          src={firstImage}
          alt={product.name}
          className="w-16 h-16 object-cover rounded-md border"
        />
      ) : (
        <div className="w-16 h-16 flex items-center justify-center bg-muted rounded-md border">
          <Package className="w-8 h-8 text-muted-foreground" />
        </div>
      )}

      {/* Informações do produto */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground truncate">
                {product.name}
              </h3>
              {!product.visible && (
                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                  🔒 Oculto
                </span>
              )}
            </div>
            {category ? (
              <p className="text-sm text-muted-foreground">
                {category.icon} {category.name}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic">Sem categoria</p>
            )}
          </div>
        </div>

        <div className="mt-2">
          <p className="text-sm text-muted-foreground">Preço da Locação:</p>
          <p className="text-lg font-semibold text-primary">{formatCurrency(product.sale_price)}</p>
        </div>

        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
          <span>Estoque: {product.stock_qty}</span>
        </div>
      </div>

      {/* Botões de ação */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onToggleVisibility(product.id, product.visible)}
          title={product.visible ? "Ocultar produto" : "Mostrar produto"}
        >
          {product.visible ? (
            <Eye className="w-4 h-4 text-green-600" />
          ) : (
            <EyeOff className="w-4 h-4 text-muted-foreground" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(product)}
        >
          <Edit className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(product.id)}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

const Products = () => {
  const navigate = useNavigate();
  const { userFranchise } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState<FormState>({
    idEditing: "",
    name: "",
    description: "",
    salePrice: "",
    imageUrls: [],
    categoryId: "",
  });

  const isEditing = form.idEditing !== "";

  // Configurar sensores para drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load products from database
  useEffect(() => {
    loadCategories();
    loadProducts();
  }, []);

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
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
      setLoadingCategories(false);
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar produtos:", error);
      toast.error("Erro ao carregar produtos");
    } finally {
      setLoading(false);
    }
  };

  const handleChangeForm = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const readers = Array.from(files).map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    });
    
    Promise.all(readers).then(imageUrls => {
      setForm(prev => ({ 
        ...prev, 
        imageUrls: [...prev.imageUrls, ...imageUrls]
      }));
    });
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setForm(prev => ({
      ...prev,
      imageUrls: prev.imageUrls.filter((_, index) => index !== indexToRemove)
    }));
  };

  const resetForm = () =>
    setForm({
      idEditing: "",
      name: "",
      description: "",
      salePrice: "",
      imageUrls: [],
      categoryId: "",
    });

  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const sale = Number(form.salePrice.replace(",", "."));
    const categoryId = form.categoryId || null;

    if (!form.name || isNaN(sale)) {
      toast.error("Preencha nome e preço da locação corretamente.");
      return;
    }

    if (!userFranchise?.id) {
      toast.error("Franquia não encontrada. Faça login novamente.");
      return;
    }

    const productData = {
      name: form.name,
      description: form.description || null,
      cost_price: 0,
      sale_price: sale,
      image_url: form.imageUrls.length > 0 ? form.imageUrls : null,
      category_id: categoryId,
      franchise_id: userFranchise.id,
    };

    try {
      if (isEditing) {
        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", form.idEditing);

        if (error) throw error;
        toast.success("Produto atualizado com sucesso!");
      } else {
        const { error } = await supabase
          .from("products")
          .insert([productData]);

        if (error) throw error;
        toast.success("Produto cadastrado com sucesso!");
      }
      
      resetForm();
      loadProducts();
    } catch (error: any) {
      console.error("Erro ao salvar produto:", error);
      toast.error("Erro ao salvar produto");
    }
  };

  const handleEditProduct = (product: Product) => {
    setForm({
      idEditing: product.id,
      name: product.name,
      description: product.description || "",
      salePrice: product.sale_price.toString(),
      imageUrls: product.image_url || [],
      categoryId: product.category_id?.toString() || "",
    });
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;
    
    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Produto excluído com sucesso!");
      loadProducts();
    } catch (error: any) {
      console.error("Erro ao excluir produto:", error);
      toast.error("Erro ao excluir produto");
    }
  };

  const handleToggleVisibility = async (productId: string, currentVisibility: boolean) => {
    try {
      const newVisibility = !currentVisibility;
      
      const { error } = await supabase
        .from("products")
        .update({ visible: newVisibility })
        .eq("id", productId);

      if (error) throw error;

      toast.success(
        newVisibility 
          ? "Produto visível no catálogo" 
          : "Produto oculto do catálogo"
      );
      
      loadProducts();
    } catch (error: any) {
      console.error("Erro ao alterar visibilidade:", error);
      toast.error("Erro ao alterar visibilidade do produto");
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = products.findIndex((p) => p.id === active.id);
    const newIndex = products.findIndex((p) => p.id === over.id);

    // Atualizar ordem local imediatamente (optimistic update)
    const newProducts = arrayMove(products, oldIndex, newIndex);
    setProducts(newProducts);

    // Atualizar display_order no banco de dados
    try {
      const updates = newProducts.map((product, index) => ({
        id: product.id,
        display_order: index + 1,
      }));

      // Atualizar todos os produtos em batch
      for (const update of updates) {
        const { error } = await supabase
          .from('products')
          .update({ display_order: update.display_order })
          .eq('id', update.id);

        if (error) throw error;
      }

      toast.success('Ordem dos produtos atualizada!');
    } catch (error: any) {
      console.error('Erro ao atualizar ordem:', error);
      toast.error('Erro ao salvar nova ordem');
      // Reverter para ordem anterior em caso de erro
      loadProducts();
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          {isEditing ? "Editar Produto" : "Adicionar Novo Produto"}
        </h2>
        <form onSubmit={handleSubmitProduct} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Produto *</Label>
              <Input id="name" name="name" value={form.name} onChange={handleChangeForm} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoryId">Categoria</Label>
              <Select
                value={form.categoryId}
                onValueChange={(value) =>
                  handleChangeForm({
                    target: { name: "categoryId", value },
                  } as any)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {loadingCategories ? (
                    <SelectItem value="loading" disabled>Carregando...</SelectItem>
                  ) : (
                    categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </SelectItem>
                    ))
                  )}
                  <SelectSeparator />
                  <div 
                    className="relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground text-primary font-medium"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/admin/categories');
                    }}
                  >
                    <Plus className="absolute left-2 h-4 w-4" />
                    Cadastrar nova categoria
                  </div>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChangeForm}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="salePrice">Preço da Locação (R$) *</Label>
            <Input
              id="salePrice"
              name="salePrice"
              type="number"
              step="0.01"
              value={form.salePrice}
              onChange={handleChangeForm}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="imageFiles">Imagens do Produto (múltiplas)</Label>
            <Input 
              id="imageFiles" 
              type="file" 
              accept="image/*" 
              multiple
              onChange={handleImageFilesChange} 
            />
            {form.imageUrls.length > 0 && (
              <div className="mt-2 grid grid-cols-4 gap-2">
                {form.imageUrls.map((url, index) => (
                  <div key={index} className="relative w-24 h-24 rounded-lg overflow-hidden border group">
                    <img src={url} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      <Trash2 className="w-5 h-5 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1">
              <Plus className="w-4 h-4 mr-2" />
              {isEditing ? "Salvar Alterações" : "Adicionar Produto"}
            </Button>
            {isEditing && (
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </Card>

      {/* Lista de Produtos com Drag-and-Drop */}
      <div className="space-y-3">
        <h2 className="text-2xl font-bold text-foreground mb-4">
          Produtos Cadastrados
        </h2>

        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : products.length === 0 ? (
          <Card className="p-8 text-center">
            <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg text-muted-foreground">
              Nenhum produto cadastrado ainda.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Clique em "Adicionar Produto" para começar!
            </p>
          </Card>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={products.map((p) => p.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {products.map((product) => {
                  const category = categories.find((c) => c.id === product.category_id);
                  return (
                    <SortableProductItem
                      key={product.id}
                      product={product}
                      category={category}
                      onEdit={handleEditProduct}
                      onDelete={handleDeleteProduct}
                      onToggleVisibility={handleToggleVisibility}
                      formatCurrency={formatCurrency}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
};

export default Products;