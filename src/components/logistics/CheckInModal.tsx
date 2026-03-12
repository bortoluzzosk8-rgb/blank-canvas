import { useState, useEffect } from "react";
import { Check, DollarSign, MessageSquare, Info, Pencil } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface MontagemInfo {
  paymentStatus: string | null;
  paymentAmount: number | null;
  notes: string | null;
  completedAt: string | null;
}

interface CheckInModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  type: "montagem" | "desmontagem" | "saida_deposito" | "volta_deposito" | "pausa";
  onConfirm: (data: CheckInData) => void;
  montagemInfo?: MontagemInfo | null;
  isEditing?: boolean;
  initialData?: {
    notes: string;
    paymentStatus: "dinheiro" | "cartao" | "pix" | "nao_recebido" | null;
    paymentAmount: number | null;
  };
}

export interface CheckInData {
  notes: string;
  paymentStatus: "dinheiro" | "cartao" | "pix" | "nao_recebido" | null;
  paymentAmount: number | null;
}

export const CheckInModal = ({
  open,
  onOpenChange,
  clientName,
  type,
  onConfirm,
  montagemInfo,
  isEditing = false,
  initialData,
}: CheckInModalProps) => {
  const [notes, setNotes] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"dinheiro" | "cartao" | "pix" | "nao_recebido" | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Preencher campos quando for edição
  useEffect(() => {
    if (open && initialData) {
      setNotes(initialData.notes || "");
      setPaymentStatus(initialData.paymentStatus);
      setPaymentAmount(initialData.paymentAmount?.toString() || "");
    } else if (!open) {
      // Reset quando fechar
      setNotes("");
      setPaymentStatus(null);
      setPaymentAmount("");
      setIsSubmitting(false);
    }
  }, [open, initialData]);

  const isMontagem = type === "montagem";
  const typeLabel = isMontagem ? "Entrega (Montagem)" : "Retirada (Desmontagem)";

  const handleConfirm = () => {
    if (isSubmitting) return; // Prevenir duplo clique
    setIsSubmitting(true);
    
    onConfirm({
      notes,
      paymentStatus,
      paymentAmount: paymentAmount ? parseFloat(paymentAmount) : null,
    });
    // Reset form
    setNotes("");
    setPaymentStatus(null);
    setPaymentAmount("");
  };

  const handleClose = () => {
    setNotes("");
    setPaymentStatus(null);
    setPaymentAmount("");
    setIsSubmitting(false);
    onOpenChange(false);
  };

  const getPaymentStatusLabel = (status: string | null) => {
    switch (status) {
      case "dinheiro":
        return "💵 Dinheiro";
      case "cartao":
        return "💳 Cartão";
      case "pix":
        return "📱 PIX";
      case "nao_recebido":
        return "❌ Não recebido";
      // Compatibilidade com valores antigos
      case "confirmado":
        return "✅ Confirmado";
      case "parcial":
        return "⚠️ Parcial";
      default:
        return "—";
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? (
              <Pencil className="w-5 h-5 text-blue-500" />
            ) : (
              <Check className="w-5 h-5 text-emerald-500" />
            )}
            {isEditing ? "Editar Check-in" : "Check-in"} - {typeLabel}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? "Editar informações do" : "Confirmar"} {isMontagem ? "entrega" : "retirada"} para <strong>{clientName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Informações da Montagem (apenas para desmontagem) */}
          {montagemInfo && type === "desmontagem" && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-2">
              <h4 className="font-medium text-blue-800 dark:text-blue-300 flex items-center gap-2">
                <Info className="w-4 h-4" />
                Informações da Entrega (Montagem)
              </h4>
              
              <div className="text-sm space-y-1 text-blue-700 dark:text-blue-200">
                <p>
                  <span className="font-medium">Pagamento:</span>{" "}
                  {getPaymentStatusLabel(montagemInfo.paymentStatus)}
                </p>
                
                {montagemInfo.paymentAmount != null && montagemInfo.paymentAmount > 0 && (
                  <p>
                    <span className="font-medium">Valor recebido:</span>{" "}
                    R$ {montagemInfo.paymentAmount.toFixed(2).replace(".", ",")}
                  </p>
                )}
                
                {montagemInfo.notes && (
                  <p>
                    <span className="font-medium">Observação:</span>{" "}
                    {montagemInfo.notes}
                  </p>
                )}
                
                {montagemInfo.completedAt && (
                  <p className="text-xs text-blue-500 dark:text-blue-400">
                    Concluído em: {format(new Date(montagemInfo.completedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Status do Pagamento */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <DollarSign className="w-4 h-4" />
              Status do Pagamento
            </Label>
            <RadioGroup
              value={paymentStatus || ""}
              onValueChange={(value) => setPaymentStatus(value as typeof paymentStatus)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="dinheiro" id="dinheiro" />
                <Label htmlFor="dinheiro" className="font-normal cursor-pointer">
                  Pagamento em dinheiro
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cartao" id="cartao" />
                <Label htmlFor="cartao" className="font-normal cursor-pointer">
                  Pagamento em cartão
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pix" id="pix" />
                <Label htmlFor="pix" className="font-normal cursor-pointer">
                  Pagamento em PIX
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="nao_recebido" id="nao_recebido" />
                <Label htmlFor="nao_recebido" className="font-normal cursor-pointer">
                  Não recebido
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Valor Recebido (se parcial ou confirmado) */}
          {(paymentStatus === "dinheiro" || paymentStatus === "cartao" || paymentStatus === "pix") && (
            <div className="space-y-2">
              <Label htmlFor="paymentAmount" className="text-sm">
                Valor recebido (R$)
              </Label>
              <Input
                id="paymentAmount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
            </div>
          )}

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="flex items-center gap-2 text-sm font-medium">
              <MessageSquare className="w-4 h-4" />
              Observações
            </Label>
            <Textarea
              id="notes"
              placeholder="Ex: Cliente solicitou cuidado extra com o tobogã, pagamento feito via PIX..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm} 
            className={isEditing ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"}
            disabled={isSubmitting}
          >
            {isEditing ? (
              <Pencil className="w-4 h-4 mr-2" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            {isSubmitting 
              ? (isEditing ? "Salvando..." : "Confirmando...") 
              : (isEditing ? "Salvar Alterações" : "Confirmar Check-in")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
