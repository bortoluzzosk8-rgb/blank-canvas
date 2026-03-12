import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, CheckCircle, Clock, AlertCircle, Upload, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Payment = {
  id: string;
  payment_type: 'sinal' | 'pagamento' | 'complemento';
  payment_method: 'dinheiro' | 'pix' | 'debito' | 'credito' | 'boleto' | 'asaas_pix' | 'asaas_boleto';
  amount: number;
  installments: number;
  payment_date?: string;
  due_date?: string;
  status: 'pending' | 'paid' | 'cancelled';
  receipt_url?: string;
  notes?: string;
  created_at: string;
  card_fee?: number;
};

type QuickPaymentDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: {
    id: string;
    client_name: string;
    total_value: number;
    rental_start_date?: string;
  } | null;
  onPaymentAdded: () => void;
};

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDateBR = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "-";
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

export const QuickPaymentDrawer = ({
  open,
  onOpenChange,
  sale,
  onPaymentAdded,
}: QuickPaymentDrawerProps) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadPaymentId, setUploadPaymentId] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Estados para upload de comprovante no formulário de novo pagamento
  const [newPaymentFile, setNewPaymentFile] = useState<File | null>(null);
  const [newPaymentPreview, setNewPaymentPreview] = useState<string | null>(null);

  // Ref para scroll automático após adicionar pagamento
  const paymentsListRef = useRef<HTMLDivElement>(null);

  const [newPayment, setNewPayment] = useState({
    payment_type: '' as 'sinal' | 'pagamento' | 'complemento' | '',
    payment_method: 'pix' as 'dinheiro' | 'pix' | 'debito' | 'credito' | 'boleto',
    amount: '',
    installments: '1',
    card_fee: '',
  });

  // Carregar pagamentos quando o drawer abrir
  useEffect(() => {
    if (open && sale?.id) {
      loadPayments();
    }
  }, [open, sale?.id]);

  const loadPayments = async () => {
    if (!sale?.id) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('sale_payments')
      .select('*')
      .eq('sale_id', sale.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao carregar pagamentos:', error);
      setLoading(false);
      return;
    }

    setPayments((data || []) as Payment[]);
    setLoading(false);
  };

  // Adicionar pagamento
  const handleAddPayment = async () => {
    if (!sale?.id) return;

    if (!newPayment.payment_type) {
      toast.error('Selecione o tipo de pagamento');
      return;
    }

    const amount = parseFloat(newPayment.amount);
    if (!amount || amount <= 0) {
      toast.error('Informe um valor válido');
      return;
    }

    // Se tiver arquivo, faz upload primeiro
    let receiptUrl: string | null = null;
    if (newPaymentFile) {
      const fileExt = newPaymentFile.name.split('.').pop();
      const fileName = `new-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('payment-receipts')
        .upload(filePath, newPaymentFile);
      
      if (uploadError) {
        toast.error('Erro ao enviar comprovante');
        console.error('Upload error:', uploadError);
        return;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('payment-receipts')
        .getPublicUrl(filePath);
      
      receiptUrl = publicUrl;
    }

    const { error } = await supabase
      .from('sale_payments')
      .insert({
        sale_id: sale.id,
        payment_type: newPayment.payment_type,
        payment_method: newPayment.payment_method,
        amount,
        installments: parseInt(newPayment.installments),
        status: 'paid',
        payment_date: new Date().toISOString().split('T')[0],
        card_fee: (newPayment.payment_method === 'credito' || newPayment.payment_method === 'debito')
          ? parseFloat(newPayment.card_fee) || 0
          : 0,
        receipt_url: receiptUrl,
      });

    if (error) {
      toast.error('Erro ao adicionar pagamento');
      console.error(error);
      return;
    }

    toast.success('Pagamento adicionado!');
    setNewPayment({
      payment_type: '',
      payment_method: 'pix',
      amount: '',
      installments: '1',
      card_fee: '',
    });
    // Limpar arquivo anexado
    setNewPaymentFile(null);
    setNewPaymentPreview(null);
    loadPayments();
    onPaymentAdded();
  };

  // Marcar como pago
  const handleMarkAsPaid = async (paymentId: string) => {

    const { error } = await supabase
      .from('sale_payments')
      .update({
        status: 'paid',
        payment_date: new Date().toISOString().split('T')[0],
      })
      .eq('id', paymentId);

    if (error) {
      toast.error('Erro ao marcar como pago');
      return;
    }

    toast.success('Pagamento confirmado!');
    loadPayments();
    onPaymentAdded();
  };

  // Upload de comprovante
  const handleUploadReceipt = async (paymentId: string, file: File) => {
    setUploading(true);

    const fileExt = file.name.split('.').pop();
    const fileName = `${paymentId}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('payment-receipts')
      .upload(filePath, file);

    if (uploadError) {
      toast.error('Erro ao enviar comprovante');
      console.error('Upload error:', uploadError);
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('payment-receipts')
      .getPublicUrl(filePath);

    const { error: updateError } = await supabase
      .from('sale_payments')
      .update({ receipt_url: publicUrl })
      .eq('id', paymentId);

    if (updateError) {
      toast.error('Erro ao salvar comprovante');
      console.error('Update error:', updateError);
      setUploading(false);
      return;
    }

    toast.success('Comprovante anexado!');
    setUploading(false);
    loadPayments();
  };

  // Abrir modal de upload
  const openUploadModal = (paymentId: string) => {
    setUploadPaymentId(paymentId);
    setUploadModalOpen(true);
    setPreviewFile(null);
    setPreviewUrl(null);
  };

  // Lidar com seleção de arquivo
  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione apenas imagens');
      return;
    }
    setPreviewFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  // Confirmar upload
  const confirmUpload = async () => {
    if (!previewFile || !uploadPaymentId) {
      toast.error('Selecione um arquivo primeiro');
      return;
    }

    await handleUploadReceipt(uploadPaymentId, previewFile);

    setUploadModalOpen(false);
    setPreviewFile(null);
    setPreviewUrl(null);
    setUploadPaymentId(null);
  };

  // Deletar pagamento
  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm('Deseja realmente excluir este pagamento?')) return;

    const { error } = await supabase
      .from('sale_payments')
      .delete()
      .eq('id', paymentId);

    if (error) {
      toast.error('Erro ao excluir pagamento');
      return;
    }

    toast.success('Pagamento excluído');
    loadPayments();
    onPaymentAdded();
  };

  // Calcular totais
  const totalPaid = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const balance = (sale?.total_value || 0) - totalPaid;

  // Labels
  const getPaymentTypeLabel = (type: string) => {
    switch (type) {
      case 'sinal': return 'Sinal';
      case 'pagamento': return 'Pagamento';
      case 'complemento': return 'Complemento';
      default: return type;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'dinheiro': return 'Dinheiro';
      case 'pix': return 'Pix';
      case 'debito': return 'Débito';
      case 'credito': return 'Crédito';
      case 'boleto': return 'Boleto';
      default: return method;
    }
  };

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="border-b pb-4">
            <DrawerTitle className="flex items-center gap-2">
              💰 Pagamentos - {sale?.client_name}
            </DrawerTitle>
            <DrawerDescription>
              {sale?.rental_start_date && (
                <span>Festa: {formatDateBR(sale.rental_start_date)}</span>
              )}
            </DrawerDescription>

            {/* Resumo Financeiro */}
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <div className="text-xs text-muted-foreground">Valor Total</div>
                <div className="text-lg font-bold">{formatCurrency(sale?.total_value || 0)}</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                <div className="text-xs text-green-600 dark:text-green-400">Pago</div>
                <div className="text-lg font-bold text-green-600 dark:text-green-400">{formatCurrency(totalPaid)}</div>
              </div>
              <div className={`rounded-lg p-3 text-center ${balance > 0 ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-green-50 dark:bg-green-900/20'}`}>
                <div className={`text-xs ${balance > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
                  {balance > 0 ? 'Falta' : 'Saldo'}
                </div>
                <div className={`text-lg font-bold ${balance > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
                  {formatCurrency(Math.abs(balance))}
                </div>
              </div>
            </div>
          </DrawerHeader>

          <ScrollArea className="flex-1 px-4 py-4 max-h-[50vh]">
            {/* Formulário de Adicionar Pagamento */}
            <div className="border rounded-lg p-4 mb-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Adicionar Pagamento
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">Tipo *</Label>
                  <Select
                    value={newPayment.payment_type}
                    onValueChange={(v) => setNewPayment({ ...newPayment, payment_type: v as any })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sinal">Sinal</SelectItem>
                      <SelectItem value="pagamento">Pagamento</SelectItem>
                      <SelectItem value="complemento">Complemento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Método *</Label>
                  <Select
                    value={newPayment.payment_method}
                    onValueChange={(v) => setNewPayment({ ...newPayment, payment_method: v as any })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pix">Pix</SelectItem>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="debito">Débito</SelectItem>
                      <SelectItem value="credito">Crédito</SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Valor *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={newPayment.amount}
                    onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                    className="h-9"
                  />
                </div>

              </div>

              {/* Campos extras para cartão */}
              {(newPayment.payment_method === 'credito' || newPayment.payment_method === 'debito') && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  {newPayment.payment_method === 'credito' && (
                    <div>
                      <Label className="text-xs">Parcelas</Label>
                      <Select
                        value={newPayment.installments}
                        onValueChange={(v) => setNewPayment({ ...newPayment, installments: v })}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                            <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div>
                    <Label className="text-xs">Taxa do Cartão (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={newPayment.card_fee}
                      onChange={(e) => setNewPayment({ ...newPayment, card_fee: e.target.value })}
                      className="h-9"
                    />
                  </div>
                </div>
              )}

              {/* Campo de upload de comprovante opcional */}
              <div className="mt-3">
                <Label className="text-xs flex items-center gap-1">
                  <Upload className="w-3 h-3" />
                  Comprovante (opcional)
                </Label>
                {!newPaymentPreview ? (
                  <div 
                    className="mt-1 border-2 border-dashed border-muted-foreground/25 rounded-lg p-3 text-center cursor-pointer hover:bg-muted/50 hover:border-primary/50 transition-all"
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (file && file.type.startsWith('image/')) {
                        setNewPaymentFile(file);
                        setNewPaymentPreview(URL.createObjectURL(file));
                      }
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) {
                          setNewPaymentFile(file);
                          setNewPaymentPreview(URL.createObjectURL(file));
                        }
                      };
                      input.click();
                    }}
                  >
                    <Upload className="mx-auto h-5 w-5 text-muted-foreground mb-1" />
                    <p className="text-xs text-muted-foreground">Arraste ou clique para anexar</p>
                  </div>
                ) : (
                  <div className="mt-1 flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                    <img 
                      src={newPaymentPreview} 
                      alt="Preview" 
                      className="w-10 h-10 object-cover rounded"
                    />
                    <span className="text-xs text-muted-foreground flex-1 truncate">
                      {newPaymentFile?.name}
                    </span>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      className="h-7"
                      onClick={() => {
                        setNewPaymentFile(null);
                        setNewPaymentPreview(null);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>

              <Button
                onClick={handleAddPayment}
                className="w-full mt-4"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Pagamento
              </Button>
            </div>

            {/* Lista de Pagamentos */}
            <div ref={paymentsListRef}>
              <h3 className="font-semibold mb-3">📜 Pagamentos Registrados ({payments.length})</h3>

              {loading ? (
                <div className="text-center py-4 text-muted-foreground">Carregando...</div>
              ) : payments.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  Nenhum pagamento registrado
                </div>
              ) : (
                <div className="space-y-2">
                  {payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="border rounded-lg p-3 flex items-center justify-between gap-3"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">
                            {getPaymentTypeLabel(payment.payment_type)}
                          </span>
                          <span className="text-muted-foreground">-</span>
                          <span className="text-sm text-muted-foreground">
                            {getPaymentMethodLabel(payment.payment_method)}
                          </span>
                          <span className="text-muted-foreground">-</span>
                          <span className="font-semibold text-green-600">
                            {formatCurrency(payment.amount)}
                          </span>
                          {payment.installments > 1 && (
                            <span className="text-xs text-muted-foreground">
                              ({payment.installments}x)
                            </span>
                          )}
                        </div>
                        {payment.card_fee && payment.card_fee > 0 && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Taxa: {formatCurrency(payment.card_fee)}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {payment.status === 'paid' ? (
                          <Badge className="bg-green-500 hover:bg-green-600">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Pago
                          </Badge>
                        ) : (
                          <>
                            <Badge variant="secondary">
                              <Clock className="w-3 h-3 mr-1" />
                              Pendente
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openUploadModal(payment.id)}
                              className="h-7 text-xs"
                            >
                              <Upload className="w-3 h-3 mr-1" />
                              {payment.receipt_url ? 'Trocar' : 'Comprovante'}
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleMarkAsPaid(payment.id)}
                              className="h-7 text-xs"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Confirmar
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePayment(payment.id)}
                          className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>

          <DrawerFooter className="border-t pt-4">
            <DrawerClose asChild>
              <Button variant="outline">Fechar</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Modal de Upload */}
      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anexar Comprovante</DialogTitle>
          </DialogHeader>

          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) handleFileSelect(file);
            }}
            onClick={() => document.getElementById('quick-payment-file-input')?.click()}
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Preview"
                className="max-h-48 mx-auto rounded"
              />
            ) : (
              <>
                <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Arraste uma imagem ou clique para selecionar
                </p>
              </>
            )}
          </div>

          <input
            id="quick-payment-file-input"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
            }}
          />

          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setUploadModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmUpload} disabled={!previewFile || uploading}>
              {uploading ? 'Enviando...' : 'Confirmar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
