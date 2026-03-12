import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Plus, Loader2, Eye, Trash2, CheckCircle, Calendar, Pencil } from "lucide-react";
import { format, addMonths, isBefore, isToday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Loan {
  id: string;
  name: string;
  total_amount: number;
  installments: number;
  installment_amount: number;
  first_due_date: string;
  due_day: number;
  franchise_id: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

interface LoanInstallment {
  id: string;
  loan_id: string;
  installment_number: number;
  amount: number;
  due_date: string;
  payment_date: string | null;
  status: string;
}

export function LoanList() {
  const { userFranchise, checkingAdmin } = useAuth();
  const franchiseId = userFranchise?.id;
  const [loans, setLoans] = useState<Loan[]>([]);
  const [allInstallments, setAllInstallments] = useState<LoanInstallment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [selectedInstallments, setSelectedInstallments] = useState<LoanInstallment[]>([]);
  const [loadingInstallments, setLoadingInstallments] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    total_amount: "",
    installments: "12",
    first_due_date: format(new Date(), "yyyy-MM-dd"),
    notes: "",
  });

  // Estado para edição de parcela individual
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingInstallment, setEditingInstallment] = useState<LoanInstallment | null>(null);
  const [editFormData, setEditFormData] = useState({
    amount: "",
    due_date: "",
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return format(parseISO(dateStr), "dd/MM/yyyy", { locale: ptBR });
  };

  const fetchLoans = async () => {
    try {
      let loansQuery = supabase
        .from("loans")
        .select("*")
        .order("created_at", { ascending: false });

      let installmentsQuery = supabase
        .from("loan_installments")
        .select("*")
        .order("installment_number", { ascending: true });

      // Se tem franchiseId, busca da franquia + os sem franquia
      // Se não tem, busca apenas os sem franquia
      if (franchiseId) {
        loansQuery = loansQuery.or(`franchise_id.eq.${franchiseId},franchise_id.is.null`);
        installmentsQuery = installmentsQuery.or(`franchise_id.eq.${franchiseId},franchise_id.is.null`);
      } else {
        loansQuery = loansQuery.is("franchise_id", null);
        installmentsQuery = installmentsQuery.is("franchise_id", null);
      }

      const [loansResult, installmentsResult] = await Promise.all([loansQuery, installmentsQuery]);

      if (loansResult.error) throw loansResult.error;
      if (installmentsResult.error) throw installmentsResult.error;
      
      setLoans(loansResult.data || []);
      setAllInstallments(installmentsResult.data || []);
    } catch (error) {
      console.error("Error fetching loans:", error);
      toast.error("Erro ao carregar empréstimos");
    } finally {
      setLoading(false);
    }
  };

  const fetchInstallments = async (loanId: string) => {
    setLoadingInstallments(true);
    try {
      const { data, error } = await supabase
        .from("loan_installments")
        .select("*")
        .eq("loan_id", loanId)
        .order("installment_number", { ascending: true });

      if (error) throw error;
      setSelectedInstallments(data || []);
    } catch (error) {
      console.error("Error fetching installments:", error);
      toast.error("Erro ao carregar parcelas");
    } finally {
      setLoadingInstallments(false);
    }
  };

  useEffect(() => {
    if (!checkingAdmin) {
      fetchLoans();
    }
  }, [franchiseId, checkingAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const totalAmount = parseFloat(formData.total_amount.replace(/[^\d,]/g, "").replace(",", "."));
    const installmentsCount = parseInt(formData.installments);
    const installmentAmount = totalAmount / installmentsCount;
    const firstDueDate = parseISO(formData.first_due_date);
    const dueDay = firstDueDate.getDate();

    try {
      // Create the loan
      const { data: loanData, error: loanError } = await supabase
        .from("loans")
        .insert({
          name: formData.name,
          total_amount: totalAmount,
          installments: installmentsCount,
          installment_amount: installmentAmount,
          first_due_date: formData.first_due_date,
          due_day: dueDay,
          franchise_id: franchiseId || null,
          notes: formData.notes || null,
        })
        .select()
        .single();

      if (loanError) throw loanError;

      // Create installments
      const installmentsToCreate = [];
      for (let i = 0; i < installmentsCount; i++) {
        const dueDate = addMonths(firstDueDate, i);
        installmentsToCreate.push({
          loan_id: loanData.id,
          installment_number: i + 1,
          amount: installmentAmount,
          due_date: format(dueDate, "yyyy-MM-dd"),
          status: "pending",
          franchise_id: franchiseId || null,
        });
      }

      const { error: installmentsError } = await supabase
        .from("loan_installments")
        .insert(installmentsToCreate);

      if (installmentsError) throw installmentsError;

      toast.success("Empréstimo cadastrado com sucesso!");
      setDialogOpen(false);
      resetForm();
      fetchLoans();
    } catch (error) {
      console.error("Error creating loan:", error);
      toast.error("Erro ao cadastrar empréstimo");
    }
  };

  const handleDelete = async (loanId: string) => {
    if (!confirm("Tem certeza que deseja excluir este empréstimo? Todas as parcelas serão excluídas.")) {
      return;
    }

    try {
      const { error } = await supabase.from("loans").delete().eq("id", loanId);
      if (error) throw error;
      toast.success("Empréstimo excluído com sucesso!");
      fetchLoans();
    } catch (error) {
      console.error("Error deleting loan:", error);
      toast.error("Erro ao excluir empréstimo");
    }
  };

  const handleMarkAsPaid = async (installmentId: string) => {
    try {
      const { error } = await supabase
        .from("loan_installments")
        .update({
          status: "paid",
          payment_date: format(new Date(), "yyyy-MM-dd"),
        })
        .eq("id", installmentId);

      if (error) throw error;
      toast.success("Parcela marcada como paga!");
      
      // Refresh both the selected installments and all installments
      if (selectedLoan) {
        fetchInstallments(selectedLoan.id);
      }
      fetchLoans(); // This also refreshes allInstallments
    } catch (error) {
      console.error("Error marking installment as paid:", error);
      toast.error("Erro ao marcar parcela como paga");
    }
  };

  const openEditInstallment = (installment: LoanInstallment) => {
    setEditingInstallment(installment);
    setEditFormData({
      amount: installment.amount.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      }),
      due_date: installment.due_date,
    });
    setEditDialogOpen(true);
  };

  const handleSaveEditInstallment = async () => {
    if (!editingInstallment) return;

    const newAmount = parseFloat(
      editFormData.amount.replace(/[^\d,]/g, "").replace(",", ".")
    );

    if (isNaN(newAmount) || newAmount <= 0) {
      toast.error("Valor inválido");
      return;
    }

    try {
      const { error } = await supabase
        .from("loan_installments")
        .update({
          amount: newAmount,
          due_date: editFormData.due_date,
        })
        .eq("id", editingInstallment.id);

      if (error) throw error;

      toast.success("Parcela atualizada com sucesso!");
      setEditDialogOpen(false);
      setEditingInstallment(null);

      // Refresh data
      if (selectedLoan) {
        fetchInstallments(selectedLoan.id);
      }
      fetchLoans();
    } catch (error) {
      console.error("Error updating installment:", error);
      toast.error("Erro ao atualizar parcela");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      total_amount: "",
      installments: "12",
      first_due_date: format(new Date(), "yyyy-MM-dd"),
      notes: "",
    });
  };

  const openLoanDetails = (loan: Loan) => {
    setSelectedLoan(loan);
    fetchInstallments(loan.id);
    setDetailDialogOpen(true);
  };

  const getLoanProgress = (loan: Loan) => {
    const paidCount = allInstallments.filter((i) => i.loan_id === loan.id && i.status === "paid").length;
    return (paidCount / loan.installments) * 100;
  };

  const getInstallmentPreview = () => {
    const totalAmount = parseFloat(formData.total_amount.replace(/[^\d,]/g, "").replace(",", ".")) || 0;
    const installmentsCount = parseInt(formData.installments) || 1;
    const installmentAmount = totalAmount / installmentsCount;
    const firstDueDate = formData.first_due_date ? parseISO(formData.first_due_date) : new Date();

    const previews = [];
    for (let i = 0; i < Math.min(3, installmentsCount); i++) {
      const dueDate = addMonths(firstDueDate, i);
      previews.push({
        number: i + 1,
        total: installmentsCount,
        amount: installmentAmount,
        dueDate: format(dueDate, "dd/MM/yyyy"),
      });
    }

    return previews;
  };

  const getStatusBadge = (status: string, dueDate: string) => {
    const due = parseISO(dueDate);
    const today = new Date();

    if (status === "paid") {
      return <Badge className="bg-green-500">✅ Pago</Badge>;
    }

    if (isBefore(due, today) && !isToday(due)) {
      return <Badge variant="destructive">⚠️ Atrasado</Badge>;
    }

    if (isToday(due)) {
      return <Badge className="bg-yellow-500">📅 Vence Hoje</Badge>;
    }

    return <Badge variant="secondary">⏳ Pendente</Badge>;
  };

  if (loading || checkingAdmin) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">🏦 Empréstimos</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Empréstimo
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>🏦 Novo Empréstimo</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Empréstimo</Label>
                <Input
                  id="name"
                  placeholder="Ex: Financiamento Veículo, Empréstimo Banco X"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="total_amount">Valor Total</Label>
                  <Input
                    id="total_amount"
                    placeholder="R$ 0,00"
                    value={formData.total_amount}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");
                      const formatted = (parseInt(value) / 100).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      });
                      setFormData({ ...formData, total_amount: formatted });
                    }}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="installments">Parcelas</Label>
                  <Input
                    id="installments"
                    type="number"
                    min="1"
                    max="360"
                    value={formData.installments}
                    onChange={(e) => setFormData({ ...formData, installments: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="first_due_date">Data 1ª Parcela</Label>
                <Input
                  id="first_due_date"
                  type="date"
                  value={formData.first_due_date}
                  onChange={(e) => setFormData({ ...formData, first_due_date: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  placeholder="Observações adicionais..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              {formData.total_amount && parseInt(formData.installments) > 0 && (
                <Card className="bg-muted/50">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">📋 Prévia das Parcelas</CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    <div className="space-y-1 text-sm">
                      {getInstallmentPreview().map((preview) => (
                        <div key={preview.number} className="flex justify-between">
                          <span>
                            Parcela {preview.number}/{preview.total}
                          </span>
                          <span>
                            {formatCurrency(preview.amount)} - Venc: {preview.dueDate}
                          </span>
                        </div>
                      ))}
                      {parseInt(formData.installments) > 3 && (
                        <div className="text-muted-foreground">
                          ... e mais {parseInt(formData.installments) - 3} parcelas
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Cadastrar</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loans.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <p>Nenhum empréstimo cadastrado.</p>
            <p className="text-sm mt-2">Clique em "Novo Empréstimo" para adicionar.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {loans.map((loan) => {
            const loanInstallments = allInstallments.filter((i) => i.loan_id === loan.id);
            const paidInstallments = loanInstallments.filter((i) => i.status === "paid");
            const pendingInstallments = loanInstallments.filter((i) => i.status === "pending");
            const paidAmount = paidInstallments.reduce((sum, i) => sum + i.amount, 0);
            const remainingAmount = pendingInstallments.reduce((sum, i) => sum + i.amount, 0);
            const progress = (paidInstallments.length / loan.installments) * 100;
            const nextInstallment = pendingInstallments[0];

            return (
              <Card key={loan.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{loan.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Total: {formatCurrency(loan.total_amount)} | Parcelas: {loan.installments}x de{" "}
                        {formatCurrency(loan.installment_amount)}
                      </p>

                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <Progress value={progress} className="flex-1" />
                          <span className="text-sm font-medium">
                            {paidInstallments.length}/{loan.installments}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Pago: {formatCurrency(paidAmount)} | Restante:{" "}
                          {formatCurrency(remainingAmount)}
                        </p>
                      </div>

                      {nextInstallment && (
                        <div className="mt-2 flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4" />
                          <span>
                            Próximo vencimento: {formatDate(nextInstallment.due_date)} (Parcela{" "}
                            {nextInstallment.installment_number}/{loan.installments})
                          </span>
                        </div>
                      )}

                      {loan.status === "active" && paidInstallments.length === loan.installments && (
                        <Badge className="mt-2 bg-green-500">✅ Quitado</Badge>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openLoanDetails(loan)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(loan.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Loan Details Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>📋 {selectedLoan?.name} - Parcelas</DialogTitle>
          </DialogHeader>

          {loadingInstallments ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parcela</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedInstallments.map((installment) => (
                    <TableRow key={installment.id}>
                      <TableCell>
                        {installment.installment_number}/{selectedLoan?.installments}
                      </TableCell>
                      <TableCell>{formatDate(installment.due_date)}</TableCell>
                      <TableCell>{formatCurrency(installment.amount)}</TableCell>
                      <TableCell>
                        {getStatusBadge(installment.status, installment.due_date)}
                      </TableCell>
                      <TableCell>
                        {installment.payment_date
                          ? formatDate(installment.payment_date)
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {installment.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openEditInstallment(installment)}
                                title="Editar parcela"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMarkAsPaid(installment.id)}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Pagar
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex justify-between p-4 bg-muted rounded-lg">
                <div>
                  <span className="text-sm text-muted-foreground">Total Pago:</span>
                  <p className="font-semibold text-green-600">
                    {formatCurrency(
                      selectedInstallments
                        .filter((i) => i.status === "paid")
                        .reduce((sum, i) => sum + i.amount, 0)
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Total Pendente:</span>
                  <p className="font-semibold text-orange-600">
                    {formatCurrency(
                      selectedInstallments
                        .filter((i) => i.status === "pending")
                        .reduce((sum, i) => sum + i.amount, 0)
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Installment Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              ✏️ Editar Parcela {editingInstallment?.installment_number}/{selectedLoan?.installments}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit_amount">Valor da Parcela</Label>
              <Input
                id="edit_amount"
                value={editFormData.amount}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  const formatted = (parseInt(value) / 100).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  });
                  setEditFormData({ ...editFormData, amount: formatted });
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_due_date">Data de Vencimento</Label>
              <Input
                id="edit_due_date"
                type="date"
                value={editFormData.due_date}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, due_date: e.target.value })
                }
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button onClick={handleSaveEditInstallment}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
