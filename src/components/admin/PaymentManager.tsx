import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Upload, CheckCircle, Clock, AlertCircle, FileText, Download, Pencil, QrCode, Copy, RefreshCw, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export type Payment = {
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
  received_by?: 'franqueadora' | 'franqueado';
  created_at: string;
  card_fee?: number;
  // Campos temporários para modo local (antes de salvar)
  localReceiptFile?: File;
  localReceiptPreview?: string;
  // Campos Asaas
  asaas_customer_id?: string;
  asaas_payment_id?: string;
  asaas_status?: string;
  pix_qrcode?: string;
  pix_qrcode_image?: string;
  pix_expiration_date?: string;
  boleto_url?: string;
  boleto_barcode?: string;
  payment_link?: string;
};

type PaymentManagerProps = {
  saleId: string | null;
  totalValue: number;
  onPaymentsChange?: () => void;
  // Modo local para adicionar pagamentos antes de salvar a venda
  localPayments?: Payment[];
  onLocalPaymentsChange?: (payments: Payment[]) => void;
};

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const PaymentManager = ({ 
  saleId, 
  totalValue, 
  onPaymentsChange,
  localPayments = [],
  onLocalPaymentsChange
}: PaymentManagerProps) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Determina se está em modo local (sem saleId) ou modo banco (com saleId)
  const isLocalMode = !saleId && !!onLocalPaymentsChange;
  
  // Usa pagamentos locais ou do banco dependendo do modo
  const displayPayments = isLocalMode ? localPayments : payments;
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadPaymentId, setUploadPaymentId] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  
  // Estados para edição de pagamento
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editPayment, setEditPayment] = useState({
    payment_type: 'sinal' as 'sinal' | 'pagamento' | 'complemento',
    payment_method: 'pix' as 'dinheiro' | 'pix' | 'debito' | 'credito' | 'boleto' | 'asaas_pix' | 'asaas_boleto',
    amount: '',
    installments: '1',
    due_date: '',
    payment_date: '',
    notes: '',
    status: 'pending' as 'pending' | 'paid' | 'cancelled',
    card_fee: '',
  });
  
  const [newPayment, setNewPayment] = useState({
    payment_type: '' as 'sinal' | 'pagamento' | 'complemento' | '',
    payment_method: 'pix' as 'dinheiro' | 'pix' | 'debito' | 'credito' | 'boleto' | 'asaas_pix' | 'asaas_boleto',
    amount: '',
    installments: '1',
    notes: '',
    card_fee: '',
  });
  
  // Estados para upload de comprovante no formulário de novo pagamento
  const [newPaymentFile, setNewPaymentFile] = useState<File | null>(null);
  const [newPaymentPreview, setNewPaymentPreview] = useState<string | null>(null);

  // Estados Asaas
  const [asaasModalOpen, setAsaasModalOpen] = useState(false);
  const [asaasPaymentId, setAsaasPaymentId] = useState<string | null>(null);
  const [asaasType, setAsaasType] = useState<'PIX' | 'BOLETO'>('PIX');
  const [asaasLoading, setAsaasLoading] = useState(false);
  const [asaasResult, setAsaasResult] = useState<{
    pixQrCode?: string;
    pixQrCodeImage?: string;
    boletoUrl?: string;
    boletoBarcode?: string;
    paymentLink?: string;
  } | null>(null);
  const [clientData, setClientData] = useState<{
    name: string;
    cpfCnpj: string;
    email?: string;
    phone?: string;
  } | null>(null);

  // Carregar pagamentos existentes
  const loadPayments = async () => {
    if (!saleId) return;
    
    const { data, error } = await supabase
      .from('sale_payments')
      .select('*')
      .eq('sale_id', saleId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Erro ao carregar pagamentos:', error);
      return;
    }
    
    setPayments((data || []) as Payment[]);
  };

  // Adicionar pagamento (local ou banco)
  const handleAddPayment = async () => {
    if (!newPayment.payment_type) {
      toast.error('Selecione o tipo de pagamento');
      return;
    }
    
    const amount = parseFloat(newPayment.amount);
    if (!amount || amount <= 0) {
      toast.error('Informe um valor válido');
      return;
    }

    // Modo local: adiciona na lista local sem salvar no banco
    if (isLocalMode) {
      const localPayment: Payment = {
        id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        payment_type: newPayment.payment_type as 'sinal' | 'pagamento' | 'complemento',
        payment_method: newPayment.payment_method,
        amount,
        installments: parseInt(newPayment.installments),
        notes: newPayment.notes || undefined,
        status: 'pending',
        card_fee: newPayment.payment_method === 'credito' ? parseFloat(newPayment.card_fee) || 0 : 0,
        created_at: new Date().toISOString(),
        // Se tem arquivo anexado, adiciona ao pagamento local
        localReceiptFile: newPaymentFile || undefined,
        localReceiptPreview: newPaymentPreview || undefined,
      };
      
      onLocalPaymentsChange?.([...localPayments, localPayment]);
      toast.success('Pagamento adicionado!');
      setNewPayment({
        payment_type: '',
        payment_method: 'pix',
        amount: '',
        installments: '1',
        notes: '',
        card_fee: '',
      });
      // Limpar arquivo anexado
      setNewPaymentFile(null);
      setNewPaymentPreview(null);
      setShowAddForm(false);
      return;
    }

    // Modo banco: salva diretamente no Supabase
    if (!saleId) {
      toast.error('Salve a venda primeiro antes de adicionar pagamentos');
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
        sale_id: saleId,
        payment_type: newPayment.payment_type as 'sinal' | 'pagamento' | 'complemento',
        payment_method: newPayment.payment_method,
        amount,
        installments: parseInt(newPayment.installments),
        notes: newPayment.notes || null,
        status: 'pending',
        card_fee: newPayment.payment_method === 'credito' ? parseFloat(newPayment.card_fee) || 0 : 0,
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
      notes: '',
      card_fee: '',
    });
    // Limpar arquivo anexado
    setNewPaymentFile(null);
    setNewPaymentPreview(null);
    setShowAddForm(false);
    loadPayments();
    onPaymentsChange?.();
  };

  // Deletar pagamento local
  const handleDeleteLocalPayment = (paymentId: string) => {
    if (!confirm('Deseja realmente excluir este pagamento?')) return;
    
    const updatedPayments = localPayments.filter(p => p.id !== paymentId);
    onLocalPaymentsChange?.(updatedPayments);
    toast.success('Pagamento removido');
  };

  // Upload de comprovante para pagamento LOCAL
  const handleLocalUploadReceipt = (paymentId: string, file: File) => {
    // Buscar o pagamento diretamente da prop para garantir dados atualizados
    const currentPayments = [...localPayments];
    const paymentExists = currentPayments.some(p => p.id === paymentId);
    
    if (!paymentExists) {
      toast.error('Pagamento não encontrado');
      return;
    }
    
    if (!onLocalPaymentsChange) {
      toast.error('Erro: modo local não configurado');
      return;
    }
    
    const previewUrl = URL.createObjectURL(file);
    
    const updatedPayments = currentPayments.map(p => {
      if (p.id === paymentId) {
        return {
          ...p,
          localReceiptFile: file,
          localReceiptPreview: previewUrl,
        };
      }
      return p;
    });
    
    onLocalPaymentsChange(updatedPayments);
    toast.success('Comprovante anexado! Será salvo quando registrar a locação.');
  };

  // Marcar como pago LOCALMENTE
  const handleLocalMarkAsPaid = (paymentId: string) => {
    const payment = localPayments.find(p => p.id === paymentId);
    
    const updatedPayments = localPayments.map(p => {
      if (p.id === paymentId) {
        return {
          ...p,
          status: 'paid' as const,
          payment_date: new Date().toISOString().split('T')[0],
        };
      }
      return p;
    });
    
    onLocalPaymentsChange?.(updatedPayments);
    toast.success('Pagamento confirmado! Será salvo quando registrar a locação.');
  };

  // Marcar como pago (banco)
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
    onPaymentsChange?.();
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
    
    console.log('Public URL gerada:', publicUrl);
    
    const { data, error: updateError } = await supabase
      .from('sale_payments')
      .update({ receipt_url: publicUrl })
      .eq('id', paymentId)
      .select();
    
    if (updateError) {
      toast.error('Erro ao salvar comprovante no banco');
      console.error('Update error:', updateError);
      setUploading(false);
      return;
    }
    
    if (!data || data.length === 0) {
      toast.error('Não foi possível atualizar o pagamento. Verifique suas permissões.');
      console.error('Nenhuma linha atualizada');
      setUploading(false);
      return;
    }
    
    console.log('Comprovante salvo com sucesso:', data);
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

  // Lidar com drag & drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Confirmar upload
  const confirmUpload = async () => {
    if (!previewFile || !uploadPaymentId) {
      toast.error('Selecione um arquivo primeiro');
      return;
    }
    
    // Verifica se é um pagamento local ou do banco
    const isLocalPaymentUpload = uploadPaymentId.startsWith('local-');
    
    if (isLocalPaymentUpload) {
      if (!onLocalPaymentsChange) {
        toast.error('Erro: não é possível anexar comprovante neste momento');
        setUploadModalOpen(false);
        return;
      }
      // Para pagamentos locais, salva no estado local
      handleLocalUploadReceipt(uploadPaymentId, previewFile);
    } else {
      // Para pagamentos do banco, faz upload pro Supabase
      await handleUploadReceipt(uploadPaymentId, previewFile);
    }
    
    setUploadModalOpen(false);
    setPreviewFile(null);
    setPreviewUrl(null);
    setUploadPaymentId(null);
  };

  // Iniciar edição de pagamento
  const startEditing = (payment: Payment) => {
    setEditingPaymentId(payment.id);
    setEditPayment({
      payment_type: payment.payment_type,
      payment_method: payment.payment_method,
      amount: String(payment.amount),
      installments: String(payment.installments),
      due_date: payment.due_date || '',
      payment_date: payment.payment_date || '',
      notes: payment.notes || '',
      status: payment.status,
      card_fee: String(payment.card_fee || ''),
    });
  };

  // Salvar edição de pagamento
  const handleSaveEdit = async () => {
    if (!editingPaymentId) return;
    
    const amount = parseFloat(editPayment.amount);
    if (!amount || amount <= 0) {
      toast.error('Informe um valor válido');
      return;
    }
    
    const { error } = await supabase
      .from('sale_payments')
      .update({
        payment_type: editPayment.payment_type,
        payment_method: editPayment.payment_method,
        amount,
        installments: parseInt(editPayment.installments),
        due_date: editPayment.due_date || null,
        payment_date: editPayment.payment_date || null,
        notes: editPayment.notes || null,
        status: editPayment.status,
        card_fee: editPayment.payment_method === 'credito' ? parseFloat(editPayment.card_fee) || 0 : 0,
      })
      .eq('id', editingPaymentId);
    
    if (error) {
      toast.error('Erro ao atualizar pagamento');
      console.error(error);
      return;
    }
    
    toast.success('Pagamento atualizado!');
    setEditingPaymentId(null);
    loadPayments();
    onPaymentsChange?.();
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
    onPaymentsChange?.();
  };

  // Calcular saldo (usa displayPayments para incluir pagamentos locais)
  const totalPaid = displayPayments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + Number(p.amount), 0);
  
  // Calcular total registrado (pago + pendente) para exibir no resumo
  const totalRegistered = displayPayments
    .filter(p => p.status !== 'cancelled')
    .reduce((sum, p) => sum + Number(p.amount), 0);
  
  const balance = totalValue - totalPaid;
  const remainingToRegister = totalValue - totalRegistered;

  // Verificar pagamentos atrasados
  const hasOverduePayments = displayPayments.some(p => {
    if (p.status !== 'pending' || !p.due_date) return false;
    return new Date(p.due_date) < new Date();
  });

  // Carregar pagamentos ao montar (apenas quando há saleId)
  useEffect(() => {
    if (saleId) loadPayments();
  }, [saleId]);

  const getPaymentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      sinal: '🔐 Sinal/Caução',
      pagamento: '💰 Pagamento',
      complemento: '➕ Complemento',
    };
    return labels[type] || type;
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      dinheiro: '💵 Dinheiro',
      pix: '📱 PIX',
      debito: '💳 Débito',
      credito: '💳 Crédito',
      boleto: '🧾 Boleto',
      asaas_pix: '📱 PIX Asaas',
      asaas_boleto: '🧾 Boleto Asaas',
    };
    return labels[method] || method;
  };

  // Abrir modal Asaas
  const openAsaasModal = async (paymentId: string, type: 'PIX' | 'BOLETO') => {
    setAsaasPaymentId(paymentId);
    setAsaasType(type);
    setAsaasResult(null);
    setAsaasModalOpen(true);
    
    // Buscar dados do cliente da venda
    if (saleId) {
      const { data: sale } = await supabase
        .from('sales')
        .select('client_id, client_name')
        .eq('id', saleId)
        .single();
      
      if (sale?.client_id) {
        const { data: client } = await supabase
          .from('clients')
          .select('name, cpf, cnpj, email, phone')
          .eq('id', sale.client_id)
          .single();
        
        if (client) {
          setClientData({
            name: client.name,
            cpfCnpj: client.cnpj || client.cpf || '',
            email: client.email || undefined,
            phone: client.phone || undefined,
          });
        }
      }
    }
  };

  // Gerar cobrança Asaas
  const handleGenerateAsaasPayment = async () => {
    if (!clientData?.cpfCnpj) {
      toast.error('Cliente precisa ter CPF ou CNPJ cadastrado');
      return;
    }

    const payment = displayPayments.find(p => p.id === asaasPaymentId);
    if (!payment) {
      toast.error('Pagamento não encontrado');
      return;
    }

    setAsaasLoading(true);

    try {
      // 1. Criar ou buscar cliente no Asaas
      const customerUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/asaas-payment?action=create-customer`;
      const customerRes = await fetch(customerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: clientData.name,
          cpfCnpj: clientData.cpfCnpj,
          email: clientData.email,
          phone: clientData.phone,
        }),
      });

      const customerData = await customerRes.json();
      console.log('[Asaas] Customer response:', customerData);

      if (customerData.error) {
        toast.error(customerData.error);
        setAsaasLoading(false);
        return;
      }

      const customerId = customerData.customer?.id;
      if (!customerId) {
        toast.error('Não foi possível criar/encontrar cliente no Asaas');
        setAsaasLoading(false);
        return;
      }

      // 2. Criar cobrança
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 3); // 3 dias para vencimento

      const paymentUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/asaas-payment?action=create-payment`;
      const paymentRes = await fetch(paymentUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer: customerId,
          billingType: asaasType,
          value: payment.amount,
          dueDate: dueDate.toISOString().split('T')[0],
          description: `Pagamento - ${payment.payment_type}`,
          externalReference: payment.id,
        }),
      });

      const paymentData = await paymentRes.json();
      console.log('[Asaas] Payment response:', paymentData);

      if (paymentData.error) {
        toast.error(paymentData.error);
        setAsaasLoading(false);
        return;
      }

      const asaasPayment = paymentData.payment;
      const pixData = paymentData.pix;

      // 3. Atualizar pagamento no banco
      const updateData: Record<string, unknown> = {
        asaas_customer_id: customerId,
        asaas_payment_id: asaasPayment.id,
        asaas_status: asaasPayment.status,
        payment_method: asaasType === 'PIX' ? 'asaas_pix' : 'asaas_boleto',
        payment_link: asaasPayment.invoiceUrl,
      };

      if (asaasType === 'PIX' && pixData) {
        updateData.pix_qrcode = pixData.payload;
        updateData.pix_qrcode_image = pixData.encodedImage;
        updateData.pix_expiration_date = pixData.expirationDate;
      } else if (asaasType === 'BOLETO') {
        updateData.boleto_url = asaasPayment.bankSlipUrl;
        updateData.boleto_barcode = asaasPayment.identificationField;
      }

      const { error: updateError } = await supabase
        .from('sale_payments')
        .update(updateData)
        .eq('id', payment.id);

      if (updateError) {
        console.error('Erro ao atualizar pagamento:', updateError);
        toast.error('Cobrança criada, mas erro ao atualizar banco');
      }

      // 4. Exibir resultado
      setAsaasResult({
        pixQrCode: pixData?.payload,
        pixQrCodeImage: pixData?.encodedImage,
        boletoUrl: asaasPayment.bankSlipUrl,
        boletoBarcode: asaasPayment.identificationField,
        paymentLink: asaasPayment.invoiceUrl,
      });

      toast.success(`Cobrança ${asaasType} gerada com sucesso!`);
      loadPayments();
    } catch (error) {
      console.error('[Asaas] Error:', error);
      toast.error('Erro ao gerar cobrança');
    } finally {
      setAsaasLoading(false);
    }
  };

  // Copiar código PIX
  const copyPixCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    toast.success('Código PIX copiado!');
  };

  // Verificar status do pagamento Asaas
  const checkAsaasStatus = async (paymentId: string, asaasPaymentId: string) => {
    try {
      const statusUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/asaas-payment?action=get-payment-status`;
      const res = await fetch(statusUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentId: asaasPaymentId }),
      });

      const data = await res.json();
      
      if (data.payment) {
        const asaasStatus = data.payment.status;
        let newStatus: 'pending' | 'paid' | 'cancelled' = 'pending';
        
        if (asaasStatus === 'CONFIRMED' || asaasStatus === 'RECEIVED') {
          newStatus = 'paid';
        } else if (asaasStatus === 'REFUNDED' || asaasStatus === 'DELETED') {
          newStatus = 'cancelled';
        }

        await supabase
          .from('sale_payments')
          .update({
            asaas_status: asaasStatus,
            status: newStatus,
            payment_date: newStatus === 'paid' ? new Date().toISOString().split('T')[0] : null,
          })
          .eq('id', paymentId);

        toast.success(`Status atualizado: ${asaasStatus}`);
        loadPayments();
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
      toast.error('Erro ao verificar status');
    }
  };

  const getStatusBadge = (payment: Payment) => {
    if (payment.status === 'paid') {
      return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Pago</Badge>;
    }
    
    if (payment.status === 'cancelled') {
      return <Badge variant="destructive">Cancelado</Badge>;
    }
    
    if (payment.due_date && new Date(payment.due_date) < new Date()) {
      return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Atrasado</Badge>;
    }
    
    return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
  };

  return (
    <Card className="p-4 bg-blue-50/50 dark:bg-blue-950/20 border-blue-200/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">💰 Pagamentos</h3>
        {(saleId || isLocalMode) && (
          <Button 
            type="button"
            size="sm" 
            onClick={() => setShowAddForm(!showAddForm)}
            variant="outline"
          >
            <Plus className="w-4 h-4 mr-1" />
            Adicionar
          </Button>
        )}
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-3 mb-4 p-3 bg-white dark:bg-gray-900 rounded-lg border">
        <div>
          <p className="text-xs text-muted-foreground">Total da Venda</p>
          <p className="font-bold text-lg">{formatCurrency(totalValue)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total Registrado</p>
          <p className={`font-bold text-lg ${totalRegistered > 0 ? 'text-blue-600' : 'text-muted-foreground'}`}>
            {formatCurrency(totalRegistered)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Falta Registrar</p>
          <p className={`font-bold text-lg ${remainingToRegister > 0 ? 'text-orange-600' : 'text-green-600'}`}>
            {formatCurrency(remainingToRegister)}
          </p>
        </div>
      </div>

      {isLocalMode && displayPayments.length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-700 dark:text-amber-400 flex items-center">
            <Clock className="w-4 h-4 mr-2" />
            Pagamentos serão salvos quando você salvar a locação
          </p>
        </div>
      )}

      {hasOverduePayments && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-400 flex items-center">
            <AlertCircle className="w-4 h-4 mr-2" />
            Existem pagamentos atrasados!
          </p>
        </div>
      )}

      {/* Formulário de novo pagamento */}
      {showAddForm && (
        <Card className="p-4 mb-4 bg-white dark:bg-gray-900">
          <h4 className="font-medium mb-3">Novo Pagamento</h4>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo *</Label>
                <Select value={newPayment.payment_type} onValueChange={(v: any) => setNewPayment({...newPayment, payment_type: v})}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sinal">🔐 Sinal/Caução</SelectItem>
                    <SelectItem value="pagamento">💰 Pagamento</SelectItem>
                    <SelectItem value="complemento">➕ Complemento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Método *</Label>
                <Select value={newPayment.payment_method} onValueChange={(v: any) => setNewPayment({...newPayment, payment_method: v})}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dinheiro">💵 Dinheiro</SelectItem>
                    <SelectItem value="pix">📱 PIX</SelectItem>
                    <SelectItem value="debito">💳 Débito</SelectItem>
                    <SelectItem value="credito">💳 Crédito</SelectItem>
                    <SelectItem value="boleto">🧾 Boleto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newPayment.amount}
                  onChange={(e) => setNewPayment({...newPayment, amount: e.target.value})}
                  placeholder="0,00"
                  className="mt-1"
                />
              </div>
              
              {newPayment.payment_method === 'credito' && (
                <div>
                  <Label>Parcelas</Label>
                  <Select value={newPayment.installments} onValueChange={(v) => setNewPayment({...newPayment, installments: v})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                        <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {(newPayment.payment_method === 'credito' || newPayment.payment_method === 'debito') && (
                <div>
                  <Label>Taxa do Cartão (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newPayment.card_fee}
                    onChange={(e) => setNewPayment({...newPayment, card_fee: e.target.value})}
                    placeholder="0,00"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Taxa cobrada pela operadora
                  </p>
                </div>
              )}
            </div>


            <div>
              <Label>Observações</Label>
              <Textarea
                value={newPayment.notes}
                onChange={(e) => setNewPayment({...newPayment, notes: e.target.value})}
                placeholder="Informações adicionais..."
                className="mt-1"
                rows={2}
              />
            </div>

            {/* Campo de upload de comprovante opcional */}
            <div>
              <Label className="flex items-center gap-1">
                <Upload className="w-3 h-3" />
                Comprovante (opcional)
              </Label>
              {!newPaymentPreview ? (
                <div 
                  className="mt-1 border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 hover:border-primary/50 transition-all"
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
                  <Upload className="mx-auto h-6 w-6 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Arraste ou clique para anexar</p>
                </div>
              ) : (
                <div className="mt-1 flex items-center gap-3 p-2 bg-muted/30 rounded-lg">
                  <img 
                    src={newPaymentPreview} 
                    alt="Preview" 
                    className="w-12 h-12 object-cover rounded"
                  />
                  <span className="text-sm text-muted-foreground flex-1 truncate">
                    {newPaymentFile?.name}
                  </span>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setNewPaymentFile(null);
                      setNewPaymentPreview(null);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button type="button" onClick={handleAddPayment} className="flex-1">
                Adicionar Pagamento
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Lista de pagamentos */}
      {displayPayments.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-muted-foreground">
            {isLocalMode ? 'Pagamentos Adicionados' : 'Histórico de Pagamentos'}
          </h4>
          {displayPayments.map(payment => {
            const isLocalPayment = payment.id.startsWith('local-');
            
            return (
              <Card key={payment.id} className={`p-3 ${isLocalPayment ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200' : 'bg-white dark:bg-gray-900'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{getPaymentTypeLabel(payment.payment_type)}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-sm text-muted-foreground">{getPaymentMethodLabel(payment.payment_method)}</span>
                      {payment.installments > 1 && (
                        <span className="text-xs text-muted-foreground">({payment.installments}x)</span>
                      )}
                      {isLocalPayment && (
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            payment.status === 'paid' 
                              ? 'border-green-400 text-green-700 bg-green-50 dark:bg-green-950/20' 
                              : 'border-amber-400 text-amber-700'
                          }`}
                        >
                          {payment.status === 'paid' ? '✅ Pago (não salvo)' : '⏳ Não salvo'}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3 text-sm">
                      <span className="font-bold text-lg">{formatCurrency(Number(payment.amount))}</span>
                      {!isLocalPayment && getStatusBadge(payment)}
                      {isLocalPayment && payment.status === 'paid' && (
                        <Badge className="bg-green-500">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Pago
                        </Badge>
                      )}
                    </div>
                    
                    {payment.payment_date && (
                      <p className="text-xs text-green-600 mt-1">
                        Pago em: {new Date(payment.payment_date).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                    
                    {payment.notes && (
                      <p className="text-xs text-muted-foreground mt-1 italic">{payment.notes}</p>
                    )}
                    
                    
                    {payment.payment_method === 'credito' && payment.card_fee && payment.card_fee > 0 && (
                      <p className="text-xs text-orange-600 mt-1">
                        💳 Taxa do Cartão: {formatCurrency(payment.card_fee)}
                      </p>
                    )}
                    
                    {/* Comprovante salvo no banco */}
                    {payment.receipt_url && (
                      <div className="mt-2">
                        <div 
                          className="cursor-pointer inline-block"
                          onClick={() => setPreviewImage(payment.receipt_url!)}
                        >
                          <img 
                            src={payment.receipt_url} 
                            alt="Comprovante" 
                            className="w-16 h-16 object-cover rounded border hover:opacity-80 transition-opacity"
                          />
                          <span className="text-xs text-primary block mt-1">Clique para ampliar</span>
                        </div>
                      </div>
                    )}
                    
                    {/* Comprovante local (não salvo ainda) */}
                    {payment.localReceiptPreview && !payment.receipt_url && (
                      <div className="mt-2">
                        <div 
                          className="cursor-pointer inline-block"
                          onClick={() => setPreviewImage(payment.localReceiptPreview!)}
                        >
                          <img 
                            src={payment.localReceiptPreview} 
                            alt="Comprovante (não salvo)" 
                            className="w-16 h-16 object-cover rounded border border-amber-400 hover:opacity-80 transition-opacity"
                          />
                          <span className="text-xs text-amber-600 block mt-1">Comprovante anexado</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    {/* Ações para pagamentos LOCAIS */}
                    {isLocalPayment && payment.status === 'pending' && (
                      <>
                        <Button 
                          type="button"
                          size="sm" 
                          variant="outline"
                          onClick={() => handleLocalMarkAsPaid(payment.id)}
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Confirmar
                        </Button>
                        
                        <Button 
                          type="button"
                          variant="outline" 
                          size="sm"
                          onClick={() => openUploadModal(payment.id)}
                        >
                          <Upload className="w-3 h-3 mr-1" />
                          Comprovante
                        </Button>
                      </>
                    )}
                    
                    {/* Ações para pagamentos salvos no banco */}
                    {!isLocalPayment && payment.status === 'pending' && (
                      <>
                        {/* Botões Asaas */}
                        {!payment.asaas_payment_id && (
                          <div className="flex gap-1 mb-1">
                            <Button 
                              type="button"
                              size="sm" 
                              variant="outline"
                              className="text-xs px-2"
                              onClick={() => openAsaasModal(payment.id, 'PIX')}
                            >
                              <QrCode className="w-3 h-3 mr-1" />
                              PIX
                            </Button>
                            <Button 
                              type="button"
                              size="sm" 
                              variant="outline"
                              className="text-xs px-2"
                              onClick={() => openAsaasModal(payment.id, 'BOLETO')}
                            >
                              <FileText className="w-3 h-3 mr-1" />
                              Boleto
                            </Button>
                          </div>
                        )}
                        
                        {/* Exibir QR Code PIX se já gerado */}
                        {payment.pix_qrcode_image && (
                          <div className="mb-2 p-2 bg-white rounded border">
                            <img 
                              src={`data:image/png;base64,${payment.pix_qrcode_image}`} 
                              alt="QR Code PIX" 
                              className="w-20 h-20 mx-auto"
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="w-full mt-1 text-xs"
                              onClick={() => copyPixCode(payment.pix_qrcode || '')}
                            >
                              <Copy className="w-3 h-3 mr-1" />
                              Copiar código
                            </Button>
                          </div>
                        )}
                        
                        {/* Link do boleto se já gerado */}
                        {payment.boleto_url && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="w-full mb-1 text-xs"
                            onClick={() => window.open(payment.boleto_url, '_blank')}
                          >
                            <FileText className="w-3 h-3 mr-1" />
                            Ver Boleto
                          </Button>
                        )}
                        
                        {/* Verificar status Asaas */}
                        {payment.asaas_payment_id && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-xs"
                            onClick={() => checkAsaasStatus(payment.id, payment.asaas_payment_id!)}
                          >
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Atualizar status
                          </Button>
                        )}
                        
                        <Button 
                          type="button"
                          size="sm" 
                          variant="outline"
                          onClick={() => handleMarkAsPaid(payment.id)}
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Confirmar
                        </Button>
                        
                        <Button 
                          type="button"
                          variant="outline" 
                          size="sm" 
                          disabled={uploading}
                          onClick={() => openUploadModal(payment.id)}
                        >
                          <Upload className="w-3 h-3 mr-1" />
                          Comprovante
                        </Button>
                      </>
                    )}
                    
                    {!isLocalPayment && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => startEditing(payment)}
                      >
                        <Pencil className="w-3 h-3 mr-1" />
                        Editar
                      </Button>
                    )}
                    
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => isLocalPayment ? handleDeleteLocalPayment(payment.id) : handleDeletePayment(payment.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {!saleId && !isLocalMode && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Adicione itens à locação para poder registrar pagamentos
        </p>
      )}

      {/* Modal de upload com preview */}
      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>📤 Anexar Comprovante</DialogTitle>
            <DialogDescription>
              Arraste uma imagem ou clique para selecionar
            </DialogDescription>
          </DialogHeader>
          
          {!previewUrl ? (
            <div 
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center cursor-pointer hover:bg-muted/50 hover:border-primary/50 transition-all"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) handleFileSelect(file);
                };
                input.click();
              }}
            >
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Arraste a imagem aqui</p>
              <p className="text-sm text-muted-foreground">ou clique para selecionar do seu computador</p>
              <p className="text-xs text-muted-foreground mt-2">Formatos aceitos: JPG, PNG, GIF, WebP</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-muted/30 p-4 rounded-lg flex justify-center">
                <img 
                  src={previewUrl} 
                  alt="Preview" 
                  className="max-h-96 w-auto object-contain rounded"
                />
              </div>
              <p className="text-sm text-center text-muted-foreground">
                📎 {previewFile?.name}
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setPreviewFile(null);
                    setPreviewUrl(null);
                  }}
                >
                  Escolher Outra
                </Button>
                <Button 
                  className="flex-1"
                  onClick={confirmUpload}
                  disabled={uploading}
                >
                  {uploading ? 'Enviando...' : 'Confirmar e Enviar'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de visualização do comprovante */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>📄 Comprovante de Pagamento</DialogTitle>
            <DialogDescription className="sr-only">
              Visualização do comprovante de pagamento
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center bg-muted/30 p-4 rounded-lg">
            <img 
              src={previewImage || ''} 
              alt="Comprovante" 
              className="max-h-[70vh] w-auto object-contain"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPreviewImage(null)}>
              Fechar
            </Button>
            <Button onClick={async () => {
              if (!previewImage) return;
              try {
                const response = await fetch(previewImage);
                const blob = await response.blob();
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `comprovante-${Date.now()}.${previewImage.split('.').pop()}`;
                link.click();
                URL.revokeObjectURL(link.href);
                toast.success('Download iniciado!');
              } catch (error) {
                toast.error('Erro ao baixar comprovante');
              }
            }}>
              <Download className="w-4 h-4 mr-1" />
              Baixar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de edição de pagamento */}
      <Dialog open={!!editingPaymentId} onOpenChange={() => setEditingPaymentId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>✏️ Editar Pagamento</DialogTitle>
            <DialogDescription>
              Modifique as informações do pagamento conforme necessário
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo *</Label>
                <Select value={editPayment.payment_type} onValueChange={(v: any) => setEditPayment({...editPayment, payment_type: v})}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sinal">🔐 Sinal/Caução</SelectItem>
                    <SelectItem value="pagamento">💰 Pagamento</SelectItem>
                    <SelectItem value="complemento">➕ Complemento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Método *</Label>
                <Select value={editPayment.payment_method} onValueChange={(v: any) => setEditPayment({...editPayment, payment_method: v})}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dinheiro">💵 Dinheiro</SelectItem>
                    <SelectItem value="pix">📱 PIX</SelectItem>
                    <SelectItem value="debito">💳 Débito</SelectItem>
                    <SelectItem value="credito">💳 Crédito</SelectItem>
                    <SelectItem value="boleto">🧾 Boleto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editPayment.amount}
                  onChange={(e) => setEditPayment({...editPayment, amount: e.target.value})}
                  placeholder="0,00"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label>Parcelas</Label>
                <Select value={editPayment.installments} onValueChange={(v) => setEditPayment({...editPayment, installments: v})}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                      <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {editPayment.payment_method === 'credito' && (
                <div>
                  <Label>Taxa do Cartão (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editPayment.card_fee}
                    onChange={(e) => setEditPayment({...editPayment, card_fee: e.target.value})}
                    placeholder="0,00"
                    className="mt-1"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data de Vencimento</Label>
                <Input
                  type="date"
                  value={editPayment.due_date}
                  onChange={(e) => setEditPayment({...editPayment, due_date: e.target.value})}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label>Data de Pagamento</Label>
                <Input
                  type="date"
                  value={editPayment.payment_date}
                  onChange={(e) => setEditPayment({...editPayment, payment_date: e.target.value})}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Status *</Label>
                <Select value={editPayment.status} onValueChange={(v: any) => setEditPayment({...editPayment, status: v})}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">⏳ Pendente</SelectItem>
                    <SelectItem value="paid">✅ Pago</SelectItem>
                    <SelectItem value="cancelled">❌ Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea
                value={editPayment.notes}
                onChange={(e) => setEditPayment({...editPayment, notes: e.target.value})}
                placeholder="Informações adicionais..."
                className="mt-1"
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSaveEdit} className="flex-1">
                Salvar Alterações
              </Button>
              <Button variant="outline" onClick={() => setEditingPaymentId(null)} className="flex-1">
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Asaas */}
      <Dialog open={asaasModalOpen} onOpenChange={setAsaasModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {asaasType === 'PIX' ? '📱 Gerar Cobrança PIX' : '🧾 Gerar Boleto'}
            </DialogTitle>
            <DialogDescription>
              {asaasResult 
                ? 'Cobrança gerada com sucesso!' 
                : `Gerar cobrança via Asaas para este pagamento`
              }
            </DialogDescription>
          </DialogHeader>
          
          {!asaasResult ? (
            <div className="space-y-4">
              {clientData ? (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">{clientData.name}</p>
                  <p className="text-sm text-muted-foreground">
                    CPF/CNPJ: {clientData.cpfCnpj || 'Não cadastrado'}
                  </p>
                  {clientData.email && (
                    <p className="text-sm text-muted-foreground">Email: {clientData.email}</p>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200">
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    Carregando dados do cliente...
                  </p>
                </div>
              )}

              {!clientData?.cpfCnpj && clientData && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200">
                  <p className="text-sm text-red-700 dark:text-red-400">
                    ⚠️ Cliente não possui CPF/CNPJ cadastrado. Cadastre os dados do cliente antes de gerar a cobrança.
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  className="flex-1" 
                  onClick={handleGenerateAsaasPayment}
                  disabled={asaasLoading || !clientData?.cpfCnpj}
                >
                  {asaasLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      {asaasType === 'PIX' ? <QrCode className="w-4 h-4 mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
                      Gerar {asaasType === 'PIX' ? 'PIX' : 'Boleto'}
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={() => setAsaasModalOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Resultado PIX */}
              {asaasResult.pixQrCodeImage && (
                <div className="text-center">
                  <div className="bg-white p-4 rounded-lg inline-block mx-auto">
                    <img 
                      src={`data:image/png;base64,${asaasResult.pixQrCodeImage}`} 
                      alt="QR Code PIX" 
                      className="w-48 h-48 mx-auto"
                    />
                  </div>
                  
                  {asaasResult.pixQrCode && (
                    <div className="mt-4">
                      <p className="text-sm text-muted-foreground mb-2">Código PIX Copia e Cola:</p>
                      <div className="flex gap-2">
                        <Input 
                          value={asaasResult.pixQrCode} 
                          readOnly 
                          className="text-xs font-mono"
                        />
                        <Button
                          variant="outline"
                          onClick={() => copyPixCode(asaasResult.pixQrCode!)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Resultado Boleto */}
              {asaasResult.boletoUrl && (
                <div className="space-y-3">
                  <Button
                    className="w-full"
                    onClick={() => window.open(asaasResult.boletoUrl, '_blank')}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Abrir Boleto
                  </Button>
                  
                  {asaasResult.boletoBarcode && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Código de Barras:</p>
                      <div className="flex gap-2">
                        <Input 
                          value={asaasResult.boletoBarcode} 
                          readOnly 
                          className="text-xs font-mono"
                        />
                        <Button
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(asaasResult.boletoBarcode!);
                            toast.success('Código de barras copiado!');
                          }}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Link de pagamento */}
              {asaasResult.paymentLink && (
                <div className="pt-2 border-t">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.open(asaasResult.paymentLink, '_blank')}
                  >
                    🔗 Abrir Link de Pagamento
                  </Button>
                </div>
              )}
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  setAsaasModalOpen(false);
                  setAsaasResult(null);
                }}
              >
                Fechar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};
