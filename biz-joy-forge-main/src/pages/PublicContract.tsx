import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { buildContractTemplate, formatCurrency, getPaymentMethodLabel } from "@/lib/documentHelpers";
import { downloadElementAsPdf } from "@/lib/generatePdf";
import Mustache from "mustache";

type SaleItem = {
  id: string;
  product_name: string;
  product_code_id?: string;
  quantity: number;
  unit_value: number;
  total_value: number;
};

type Sale = {
  id: string;
  sale_date: string;
  client_name: string;
  client_id?: string;
  total_value: number;
  down_payment?: number;
  payment_method?: string;
  installments?: number;
  installment_dates?: string[];
  notes?: string;
  status: string;
  franchise_id?: string;
  rental_start_date?: string;
  return_date?: string;
  return_time?: string;
  delivery_address?: string;
  delivery_city?: string;
  delivery_state?: string;
  delivery_cep?: string;
  party_start_time?: string;
  with_monitoring?: boolean;
  monitoring_value?: number;
  monitors_quantity?: number;
  freight_value?: number;
  discount_value?: number;
};

const formatDateBR = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "-";
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
};

const PublicContract = () => {
  const { saleId } = useParams<{ saleId: string }>();
  const [sale, setSale] = useState<Sale | null>(null);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [client, setClient] = useState<any>(null);
  const [franchise, setFranchise] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [salePayments, setSalePayments] = useState<any[]>([]);
  const [documentHtml, setDocumentHtml] = useState<string>("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (saleId) {
      fetchSaleData();
    }
  }, [saleId]);

  useEffect(() => {
    if (sale && settings) {
      generateDocumentContent();
    }
  }, [sale, settings, saleItems, client, franchise, salePayments]);

  const fetchSaleData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Buscar venda
      const { data: saleData, error: saleError } = await supabase
        .from("sales")
        .select("*")
        .eq("id", saleId)
        .single();

      if (saleError || !saleData) {
        setError("Contrato não encontrado");
        return;
      }

      setSale(saleData as Sale);

      // Buscar itens da venda
      const { data: itemsData } = await supabase
        .from("sale_items")
        .select("*")
        .eq("sale_id", saleId);

      setSaleItems(itemsData || []);

      // Buscar pagamentos da venda
      const { data: paymentsData } = await supabase
        .from("sale_payments")
        .select("payment_method")
        .eq("sale_id", saleId!);

      setSalePayments(paymentsData || []);

      // Buscar cliente se tiver ID
      if (saleData.client_id) {
        const { data: clientData } = await supabase
          .from("clients")
          .select("*")
          .eq("id", saleData.client_id)
          .single();
        setClient(clientData);
      }

      // Buscar franquia se tiver ID
      if (saleData.franchise_id) {
        const { data: franchiseData } = await supabase
          .from("franchises")
          .select("*")
          .eq("id", saleData.franchise_id)
          .single();
        setFranchise(franchiseData);
      }

      // Buscar settings
      const { data: settingsData } = await supabase
        .from("settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      setSettings(settingsData || {});
    } catch (err) {
      console.error("Erro ao buscar dados:", err);
      setError("Erro ao carregar o contrato");
    } finally {
      setLoading(false);
    }
  };

  const generateDocumentContent = () => {
    if (!sale) return;

    const primaryColor = settings?.primary_color || "#8B5CF6";
    const secondaryColor = settings?.secondary_color || "#EC4899";
    const signatureUrl = settings?.company_signature_url || undefined;

    const template = buildContractTemplate(
      settings?.contract_title || "📄 CONTRATO DE LOCAÇÃO",
      settings?.contract_clauses || "",
      primaryColor,
      secondaryColor,
      signatureUrl
    );

    // Preparar produtos
    const products = saleItems.map((item, index) => ({
      number: index + 1,
      name: item.product_name,
      code: item.product_code_id?.slice(0, 8) || "SEM CÓDIGO",
      quantity: item.quantity,
      unitValue: formatCurrency(item.unit_value).replace("R$", "").trim(),
      totalValue: formatCurrency(item.total_value).replace("R$", "").trim(),
    }));

    // Preparar parcelas
    const installmentDates = ((sale.installment_dates as string[]) || []).map(
      (date, index) => ({
        number: index + 1,
        date: new Date(date).toLocaleDateString("pt-BR"),
        installmentValue: formatCurrency(
          (sale.total_value - (sale.down_payment || 0)) / (sale.installments || 1)
        )
          .replace("R$", "")
          .trim(),
      })
    );

    const data = {
      logoUrl: settings?.logo_url || null,
      saleNumber: sale.id.slice(0, 8).toUpperCase(),
      saleDate: formatDateBR(sale.sale_date),

      // Dados da empresa (usa franquia se disponível)
      companyName: franchise?.name || settings?.company_name || "Empresa",
      companyCNPJ: franchise?.cnpj || settings?.company_cnpj || "Não informado",
      companyAddress: franchise?.address || settings?.company_address || "Não informado",
      companyCity: franchise?.city || settings?.company_city || "Não informado",
      companyState: franchise?.state || settings?.company_state || "Não informado",
      companyCEP: franchise?.cep || settings?.company_cep || "Não informado",
      companyPhone: franchise?.phone || settings?.company_phone || "Não informado",
      companyEmail: franchise?.email || settings?.company_email || "Não informado",

      // Dados do cliente
      clientName: client?.name || sale.client_name,
      clientDocument: client?.cpf || client?.cnpj || "Não informado",
      clientPhone: client?.phone || "Não informado",
      clientEmail: client?.email || null,
      clientAddress: client?.endereco || null,
      clientCity: client?.cidade || null,
      clientState: client?.estado || null,
      clientCEP: client?.cep || null,

      // Dados de locação
      hasRentalDates: !!sale.rental_start_date,
      rentalStartDate: formatDateBR(sale.rental_start_date),
      partyStartTime: sale.party_start_time || null,
      returnDate: formatDateBR(sale.return_date),
      returnTime: sale.return_time || null,
      rentalType: 'diaria',
      isRental4h: false,
      rentalEndTime: null,

      // Endereço de entrega
      hasDeliveryAddress: !!sale.delivery_address,
      deliveryAddress: sale.delivery_address || null,
      deliveryCity: sale.delivery_city || null,
      deliveryState: sale.delivery_state || null,
      deliveryCEP: sale.delivery_cep || null,

      // Produtos
      products,

      // Valores
      totalValue: formatCurrency(sale.total_value).replace("R$", "").trim(),
      hasFreight: (sale.freight_value || 0) > 0,
      freightValue: formatCurrency(sale.freight_value || 0).replace("R$", "").trim(),
      hasMonitoring: sale.with_monitoring && (sale.monitoring_value || 0) > 0,
      monitoringValue: formatCurrency(sale.monitoring_value || 0).replace("R$", "").trim(),
      monitorsQuantity: sale.monitors_quantity || 0,
      hasDiscount: (sale.discount_value || 0) > 0,
      discountValue: formatCurrency(sale.discount_value || 0).replace("R$", "").trim(),

      // Pagamento - agregar métodos reais dos pagamentos
      paymentMethod: (() => {
        if (salePayments.length > 0) {
          const uniqueMethods = [...new Set(salePayments.map(p => p.payment_method))];
          return uniqueMethods.map(m => getPaymentMethodLabel(m)).join(' / ');
        }
        return getPaymentMethodLabel(sale.payment_method || "cash");
      })(),
      installments: sale.installments || 1,
      installmentValue: formatCurrency(
        (sale.total_value - (sale.down_payment || 0)) / (sale.installments || 1)
      )
        .replace("R$", "")
        .trim(),
      hasDownPayment: (sale.down_payment || 0) > 0,
      downPayment: formatCurrency(sale.down_payment || 0).replace("R$", "").trim(),
      installmentAmount: formatCurrency(sale.total_value - (sale.down_payment || 0))
        .replace("R$", "")
        .trim(),

      // Parcelas
      installmentDates: installmentDates.length > 0 ? installmentDates : null,

      // Observações
      notes: sale.notes || null,
    };

    const rendered = Mustache.render(template, data);
    setDocumentHtml(rendered);
  };

  const handleDownloadPdf = async () => {
    if (!sale) return;
    
    setDownloading(true);
    try {
      const clientName = (client?.name || sale.client_name)
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9_]/g, "");
      const saleNumber = sale.id.slice(0, 8).toUpperCase();
      const fileName = `Contrato_${saleNumber}_${clientName}.pdf`;
      
      await downloadElementAsPdf("contract-content", fileName);
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">Carregando contrato...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-xl text-destructive font-medium">{error}</p>
          <p className="mt-2 text-muted-foreground">
            O contrato pode ter sido removido ou o link está incorreto.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Botão de download fixo */}
        <div className="sticky top-4 z-10 mb-4 flex justify-end">
          <Button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="shadow-lg"
          >
            {downloading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Baixar PDF
          </Button>
        </div>

        {/* Conteúdo do contrato */}
        <div
          id="contract-content"
          className="bg-white rounded-lg shadow-xl overflow-hidden max-w-full"
          style={{ overflowX: 'auto' }}
          dangerouslySetInnerHTML={{ __html: documentHtml }}
        />
      </div>
    </div>
  );
};

export default PublicContract;
