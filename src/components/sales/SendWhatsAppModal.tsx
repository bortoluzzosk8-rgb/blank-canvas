import { useState, useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import { MessageCircle, CheckCircle, Edit, X } from "lucide-react";

interface SaleData {
  id: string;
  client_name: string;
  client_phone?: string;
  rental_start_date?: string;
  party_start_time?: string;
  return_time?: string;
  delivery_address?: string;
  delivery_city?: string;
  total_value: number;
  items?: Array<{ product_name: string }>;
  monitoringSlots?: Array<{
    monitors_quantity: number;
    start_time: string;
    end_time: string;
  }>;
}

interface SendWhatsAppModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: SaleData | null;
  companyName?: string;
}

const formatDateBR = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "-";
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
};

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const SendWhatsAppModal = ({
  open,
  onOpenChange,
  sale,
  companyName = "Nossa Empresa",
}: SendWhatsAppModalProps) => {
  const [message, setMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (sale) {
      generateDefaultMessage();
    }
  }, [sale]);

  const generateDefaultMessage = () => {
    if (!sale) return;

    const contractUrl = `${window.location.origin}/contrato/${sale.id}`;
    const itemsList = sale.items?.map((item) => item.product_name).join(", ") || "";
    const dateFormatted = formatDateBR(sale.rental_start_date);
    const time = sale.party_start_time || "";
    const address = [sale.delivery_address, sale.delivery_city]
      .filter(Boolean)
      .join(", ");

    // Preparar texto de monitoria
    let monitoringText = "";
    if (sale.monitoringSlots && sale.monitoringSlots.length > 0) {
      const totalMonitors = sale.monitoringSlots.reduce((sum, s) => sum + s.monitors_quantity, 0);
      const slotsText = sale.monitoringSlots.map(s => `${s.start_time || '00:00'} - ${s.end_time || '00:00'}`).join(", ");
      monitoringText = `\n👤 *Monitores:* ${totalMonitors} monitor${totalMonitors > 1 ? 'es' : ''} (${slotsText})`;
    }

    // Calcular horário de disponibilidade (retirada + 1h)
    let returnTimeText = "";
    if (sale.return_time) {
      const [rh, rm] = sale.return_time.split(':').map(Number);
      returnTimeText = ` até ${sale.return_time} (retirada)`;
    }

    const defaultMessage = `Olá ${sale.client_name}! 👋

Sua reserva foi confirmada! 🎉

📅 *Data:* ${dateFormatted}${time ? ` às ${time}${returnTimeText}` : ""}
${address ? `📍 *Local:* ${address}` : ""}
🎪 *Itens:* ${itemsList}${monitoringText}
💰 *Valor Total:* ${formatCurrency(sale.total_value)}

Acesse seu contrato completo:
${contractUrl}

Qualquer dúvida, estamos à disposição!
${companyName}`;

    setMessage(defaultMessage);
  };

  const handleSendWhatsApp = () => {
    if (!sale?.client_phone) {
      alert("Cliente não possui telefone cadastrado.");
      return;
    }

    // Limpar número do telefone (remover caracteres não numéricos)
    const cleanPhone = sale.client_phone.replace(/\D/g, "");
    
    // Adicionar código do país se não tiver
    const phoneWithCountry = cleanPhone.startsWith("55")
      ? cleanPhone
      : `55${cleanPhone}`;

    // Codificar a mensagem para URL
    const encodedMessage = encodeURIComponent(message);

    // Abrir WhatsApp
    const whatsappUrl = `https://wa.me/${phoneWithCountry}?text=${encodedMessage}`;
    window.open(whatsappUrl, "_blank");

    onOpenChange(false);
  };

  const handleClose = () => {
    setIsEditing(false);
    onOpenChange(false);
  };

  if (!sale) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Locação salva com sucesso!
          </DialogTitle>
          <DialogDescription>
            Deseja enviar os detalhes da locação para o cliente via WhatsApp?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Info do cliente */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-1">
            <p className="text-sm">
              <span className="font-medium">Cliente:</span> {sale.client_name}
            </p>
            <p className="text-sm">
              <span className="font-medium">Telefone:</span>{" "}
              {sale.client_phone || (
                <span className="text-destructive">Não cadastrado</span>
              )}
            </p>
          </div>

          {/* Mensagem */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Mensagem prévia:</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Edit className="w-3 h-3 mr-1" />
                {isEditing ? "Concluir" : "Editar"}
              </Button>
            </div>
            {isEditing ? (
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={12}
                className="font-mono text-sm"
              />
            ) : (
              <div className="bg-muted/30 border rounded-lg p-3 max-h-64 overflow-y-auto">
                <pre className="text-sm whitespace-pre-wrap font-sans">
                  {message}
                </pre>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose}>
            <X className="w-4 h-4 mr-2" />
            Fechar
          </Button>
          <Button
            onClick={handleSendWhatsApp}
            disabled={!sale.client_phone}
            className="bg-green-600 hover:bg-green-700"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Enviar via WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
