import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { Save, Sparkles, Building, FileText, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { buildReceiptTemplate, buildContractTemplate, getAvailableVariables, type DocumentVariable } from "@/lib/documentHelpers";

const Settings = () => {
  const [settings, setSettings] = useState({
    monthlyInterest: 0,
    maxInstallments: 12,
    whatsappNumber: "",
    logoUrl: "",
    primaryColor: "#8B5CF6",
    secondaryColor: "#EC4899",
    catalogTitle: "Catálogo de Produtos",
    catalogSubtitle: "Bem-vindo ao nosso catálogo!",
    catalogHeaderTitle: "Título Principal",
    companyName: "PlayGestor",
    companyCNPJ: "",
    companyAddress: "",
    companyCity: "",
    companyState: "",
    companyCEP: "",
    companyPhone: "",
    companyEmail: "",
    receiptTemplate: "",
    contractTemplate: "",
    receiptTitle: "🧾 RECIBO DE VENDA",
    receiptNotes: "",
    contractTitle: "📄 CONTRATO DE LOCAÇÃO DE BRINQUEDOS",
    contractClauses: "",
    companySignatureUrl: ""
  });
  const receiptNotesRef = useRef<HTMLTextAreaElement>(null);
  const contractClausesRef = useRef<HTMLTextAreaElement>(null);
  const availableVariables = getAvailableVariables();
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string>("");
  const [uploadingSignature, setUploadingSignature] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from("settings")
          .select("*")
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setSettings({
            monthlyInterest: Number(data.monthly_interest),
            maxInstallments: Number(data.max_installments),
            whatsappNumber: data.whatsapp_number || "",
            logoUrl: data.logo_url || "",
            primaryColor: data.primary_color || "#8B5CF6",
            secondaryColor: data.secondary_color || "#EC4899",
            catalogTitle: data.catalog_title || "Catálogo de Produtos",
            catalogSubtitle: data.catalog_subtitle || "Bem-vindo ao nosso catálogo!",
            catalogHeaderTitle: data.catalog_header_title || "Título Principal",
            companyName: data.company_name || "PlayGestor",
            companyCNPJ: data.company_cnpj || "",
            companyAddress: data.company_address || "",
            companyCity: data.company_city || "",
            companyState: data.company_state || "",
            companyCEP: data.company_cep || "",
            companyPhone: data.company_phone || "",
            companyEmail: data.company_email || "",
            receiptTemplate: data.receipt_template || "",
            contractTemplate: data.contract_template || "",
            receiptTitle: data.receipt_title || "🧾 RECIBO DE LOCAÇÃO",
            receiptNotes: data.receipt_notes || "",
            contractTitle: data.contract_title || "📄 CONTRATO DE LOCAÇÃO DE EQUIPAMENTOS",
            contractClauses: data.contract_clauses || "",
            companySignatureUrl: data.company_signature_url || ""
          });
          setSettingsId(data.id);
          if (data.logo_url) {
            setLogoPreview(data.logo_url);
          }
          if (data.company_signature_url) {
            setSignaturePreview(data.company_signature_url);
          }
        }
      } catch (error) {
        console.error("Erro ao buscar configurações:", error);
        toast.error("Erro ao carregar configurações");
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: Number(value) || 0 }));
  };

  const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    setSettings((prev) => ({ ...prev, whatsappNumber: value }));
  };

  const handleCatalogTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validação de tipo e tamanho
    if (!file.type.startsWith('image/')) {
      toast.error("Por favor, selecione uma imagem");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo 5MB");
      return;
    }

    setLogoFile(file);
    const preview = URL.createObjectURL(file);
    setLogoPreview(preview);
  };

  const uploadLogoToStorage = async () => {
    if (!logoFile) return settings.logoUrl;

    setUploadingLogo(true);
    try {
      // Remove logo antigo se existir
      if (settings.logoUrl) {
        const oldPath = settings.logoUrl.split('/').pop();
        if (oldPath) {
          await supabase.storage.from('logos').remove([oldPath]);
        }
      }

      // Upload do novo logo
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, logoFile);

      if (uploadError) throw uploadError;

      // Pega URL pública
      const { data } = supabase.storage.from('logos').getPublicUrl(fileName);
      
      return data.publicUrl;
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast.error("Erro ao fazer upload do logo");
      return settings.logoUrl;
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Por favor, selecione uma imagem");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo 2MB");
      return;
    }

    setSignatureFile(file);
    setSignaturePreview(URL.createObjectURL(file));
  };

  const uploadSignatureToStorage = async () => {
    if (!signatureFile) return settings.companySignatureUrl;

    setUploadingSignature(true);
    try {
      // Remove assinatura antiga se existir
      if (settings.companySignatureUrl) {
        const oldPath = settings.companySignatureUrl.split('/').pop();
        if (oldPath) {
          await supabase.storage.from('logos').remove([oldPath]);
        }
      }

      const fileExt = signatureFile.name.split('.').pop();
      const fileName = `signature-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, signatureFile);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('logos').getPublicUrl(fileName);
      return data.publicUrl;
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast.error("Erro ao fazer upload da assinatura");
      return settings.companySignatureUrl;
    } finally {
      setUploadingSignature(false);
    }
  };

  const formatWhatsAppDisplay = (value: string) => {
    if (!value) return "";
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length <= 2) return `(${cleaned}`;
    if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
  };

  const insertVariable = (tag: string, isReceipt: boolean) => {
    const textarea = isReceipt ? receiptNotesRef.current : contractClausesRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = isReceipt ? settings.receiptNotes : settings.contractClauses;
    const newText = text.substring(0, start) + tag + text.substring(end);

    if (isReceipt) {
      setSettings(prev => ({ ...prev, receiptNotes: newText }));
    } else {
      setSettings(prev => ({ ...prev, contractClauses: newText }));
    }

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  const handleSave = async () => {
    try {
      // Faz upload do logo e assinatura se houver novos
      const logoUrl = await uploadLogoToStorage();
      const signatureUrl = await uploadSignatureToStorage();

      // Gera os templates HTML a partir dos campos simples
      const receiptHtml = buildReceiptTemplate(
        settings.receiptTitle,
        settings.receiptNotes,
        settings.primaryColor,
        settings.secondaryColor,
        signatureUrl
      );

      const contractHtml = buildContractTemplate(
        settings.contractTitle,
        settings.contractClauses,
        settings.primaryColor,
        settings.secondaryColor,
        signatureUrl
      );

      const updateData = {
        monthly_interest: settings.monthlyInterest,
        max_installments: settings.maxInstallments,
        whatsapp_number: settings.whatsappNumber,
        logo_url: logoUrl,
        primary_color: settings.primaryColor,
        secondary_color: settings.secondaryColor,
        catalog_title: settings.catalogTitle,
        catalog_subtitle: settings.catalogSubtitle,
        catalog_header_title: settings.catalogHeaderTitle,
        company_name: settings.companyName,
        company_cnpj: settings.companyCNPJ,
        company_address: settings.companyAddress,
        company_city: settings.companyCity,
        company_state: settings.companyState,
        company_cep: settings.companyCEP,
        company_phone: settings.companyPhone,
        company_email: settings.companyEmail,
        receipt_template: receiptHtml,
        contract_template: contractHtml,
        receipt_title: settings.receiptTitle,
        receipt_notes: settings.receiptNotes,
        contract_title: settings.contractTitle,
        contract_clauses: settings.contractClauses,
        company_signature_url: signatureUrl
      };

      if (settingsId) {
        const { error } = await supabase
          .from("settings")
          .update(updateData)
          .eq("id", settingsId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("settings")
          .insert(updateData)
          .select()
          .single();

        if (error) throw error;
        if (data) setSettingsId(data.id);
      }

      toast.success("Configurações salvas com sucesso");
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      toast.error("Erro ao salvar configurações");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6 max-w-2xl">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          🎨 Aparência do Catálogo
        </h2>
        <div className="space-y-4">
          {/* Upload de Logo */}
          <div className="space-y-2">
            <Label htmlFor="logo">Logo da Empresa</Label>
            {(logoPreview || (settings.logoUrl && settings.logoUrl.length > 0)) && (
              <div className="mb-4 p-4 border-2 rounded-lg bg-muted">
                <img 
                  src={logoPreview || settings.logoUrl} 
                  alt="Logo Preview" 
                  className="max-h-32 object-contain mx-auto"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}
            <Input
              id="logo"
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="cursor-pointer"
            />
            <p className="text-xs text-muted-foreground">
              Formatos aceitos: PNG, JPG, SVG. Máximo 5MB
            </p>
          </div>

          {/* Seletor de Cor Primária */}
          <div className="space-y-2">
            <Label htmlFor="primaryColor">Cor Primária</Label>
            <div className="flex gap-2 items-center">
              <Input
                id="primaryColor"
                type="color"
                value={settings.primaryColor}
                onChange={(e) => setSettings(prev => ({...prev, primaryColor: e.target.value}))}
                className="w-20 h-10 cursor-pointer"
              />
              <Input
                type="text"
                value={settings.primaryColor}
                onChange={(e) => setSettings(prev => ({...prev, primaryColor: e.target.value}))}
                placeholder="#8B5CF6"
                className="flex-1"
              />
              <div 
                className="w-20 h-10 rounded border-2"
                style={{ backgroundColor: settings.primaryColor }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Cor principal dos botões e destaques
            </p>
          </div>

          {/* Seletor de Cor Secundária */}
          <div className="space-y-2">
            <Label htmlFor="secondaryColor">Cor Secundária</Label>
            <div className="flex gap-2 items-center">
              <Input
                id="secondaryColor"
                type="color"
                value={settings.secondaryColor}
                onChange={(e) => setSettings(prev => ({...prev, secondaryColor: e.target.value}))}
                className="w-20 h-10 cursor-pointer"
              />
              <Input
                type="text"
                value={settings.secondaryColor}
                onChange={(e) => setSettings(prev => ({...prev, secondaryColor: e.target.value}))}
                placeholder="#EC4899"
                className="flex-1"
              />
              <div 
                className="w-20 h-10 rounded border-2"
                style={{ backgroundColor: settings.secondaryColor }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Cor de acentos e elementos secundários
            </p>
          </div>
        </div>
      </Card>

      {/* Card: Textos do Catálogo */}
      <Card className="p-6 max-w-2xl shadow-lg">
        <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Textos do Catálogo
        </h2>
        <div className="space-y-6">
          {/* Título Principal Grande */}
          <div>
            <Label htmlFor="catalogHeaderTitle" className="text-base font-semibold">
              Título Principal
            </Label>
            <Input
              id="catalogHeaderTitle"
              name="catalogHeaderTitle"
              type="text"
              value={settings.catalogHeaderTitle}
              onChange={handleCatalogTextChange}
              placeholder="Ex: Catálogo ENGBRINK"
              className="mt-2 text-xl font-bold"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Título grande que aparece no topo do catálogo com ✨
            </p>
          </div>

          {/* Frase Principal */}
          <div>
            <Label htmlFor="catalogTitle" className="text-base font-semibold">
              Frase Principal
            </Label>
            <Input
              id="catalogTitle"
              name="catalogTitle"
              type="text"
              value={settings.catalogTitle}
              onChange={handleCatalogTextChange}
              placeholder="Ex: Brinquedos Infláveis"
              className="mt-2 text-lg"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Texto destacado no topo do catálogo com emoji 🎈
            </p>
          </div>

          {/* Subtítulo */}
          <div>
            <Label htmlFor="catalogSubtitle" className="text-base font-semibold">
              Subfrase de Boas-Vindas
            </Label>
            <Input
              id="catalogSubtitle"
              name="catalogSubtitle"
              type="text"
              value={settings.catalogSubtitle}
              onChange={handleCatalogTextChange}
              placeholder="Ex: Bem-vindo ao nosso catálogo!"
              className="mt-2"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Mensagem que aparece antes do nome do cliente
            </p>
          </div>

          {/* Preview */}
          <div 
            className="p-4 rounded-lg text-white"
            style={{
              background: `linear-gradient(to right, ${settings.primaryColor}, ${settings.secondaryColor})`
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">✨</span>
              <p className="text-2xl font-black">
                {settings.catalogHeaderTitle}
              </p>
            </div>
            <p className="text-lg font-medium mb-1">
              🎈 {settings.catalogTitle}
            </p>
            <p className="text-sm font-medium opacity-90">
              {settings.catalogSubtitle.replace(/!$/, '')}, <span className="font-bold">[Nome do Cliente]</span>! 👋
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6 max-w-2xl">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Configurações de Pagamento
        </h2>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="monthlyInterest">Taxa de Juros Mensal (%)</Label>
            <Input
              id="monthlyInterest"
              name="monthlyInterest"
              type="number"
              step="0.01"
              min="0"
              value={settings.monthlyInterest}
              onChange={handleChange}
            />
            <p className="text-xs text-muted-foreground">
              Taxa aplicada no parcelamento com juros
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxInstallments">Número Máximo de Parcelas</Label>
            <Input
              id="maxInstallments"
              name="maxInstallments"
              type="number"
              min="1"
              max="24"
              value={settings.maxInstallments}
              onChange={handleChange}
            />
            <p className="text-xs text-muted-foreground">
              Limite de parcelas disponível para os clientes
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="whatsappNumber">Número do WhatsApp</Label>
            <Input
              id="whatsappNumber"
              name="whatsappNumber"
              type="tel"
              placeholder="(11) 99999-9999"
              value={formatWhatsAppDisplay(settings.whatsappNumber)}
              onChange={handleWhatsAppChange}
              maxLength={15}
            />
            <p className="text-xs text-muted-foreground">
              Número para receber os pedidos (com DDD)
            </p>
          </div>
          <Button onClick={handleSave} className="mt-4" disabled={uploadingLogo}>
            <Save className="w-4 h-4 mr-2" />
            {uploadingLogo ? "Fazendo upload..." : "Salvar Configurações"}
          </Button>
        </div>
      </Card>

      {/* Card: Dados da Empresa */}
      <Card className="p-6 max-w-2xl">
        <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
          <Building className="w-5 h-5 text-primary" />
          Dados da Empresa (Recibos e Contratos)
        </h2>
        
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="companyName">Nome da Empresa</Label>
            <Input
              id="companyName"
              value={settings.companyName}
              onChange={(e) => setSettings(prev => ({...prev, companyName: e.target.value}))}
              placeholder="ENGBRINK"
            />
          </div>
          
          <div>
            <Label htmlFor="companyCNPJ">CNPJ</Label>
            <Input
              id="companyCNPJ"
              value={settings.companyCNPJ}
              onChange={(e) => setSettings(prev => ({...prev, companyCNPJ: e.target.value}))}
              placeholder="00.000.000/0000-00"
            />
          </div>
          
          <div className="sm:col-span-2">
            <Label htmlFor="companyAddress">Endereço</Label>
            <Input
              id="companyAddress"
              value={settings.companyAddress}
              onChange={(e) => setSettings(prev => ({...prev, companyAddress: e.target.value}))}
              placeholder="Rua, Número, Bairro"
            />
          </div>
          
          <div>
            <Label htmlFor="companyCity">Cidade</Label>
            <Input
              id="companyCity"
              value={settings.companyCity}
              onChange={(e) => setSettings(prev => ({...prev, companyCity: e.target.value}))}
              placeholder="São Paulo"
            />
          </div>
          
          <div>
            <Label htmlFor="companyState">Estado</Label>
            <Input
              id="companyState"
              value={settings.companyState}
              onChange={(e) => setSettings(prev => ({...prev, companyState: e.target.value}))}
              placeholder="SP"
              maxLength={2}
            />
          </div>
          
          <div>
            <Label htmlFor="companyCEP">CEP</Label>
            <Input
              id="companyCEP"
              value={settings.companyCEP}
              onChange={(e) => setSettings(prev => ({...prev, companyCEP: e.target.value}))}
              placeholder="00000-000"
            />
          </div>
          
          <div>
            <Label htmlFor="companyPhone">Telefone</Label>
            <Input
              id="companyPhone"
              value={settings.companyPhone}
              onChange={(e) => setSettings(prev => ({...prev, companyPhone: e.target.value}))}
              placeholder="(11) 99999-9999"
            />
          </div>
          
          <div className="sm:col-span-2">
            <Label htmlFor="companyEmail">Email</Label>
            <Input
              id="companyEmail"
              type="email"
              value={settings.companyEmail}
              onChange={(e) => setSettings(prev => ({...prev, companyEmail: e.target.value}))}
              placeholder="contato@empresa.com"
            />
          </div>

          {/* Upload de Assinatura Digital */}
          <div className="sm:col-span-2 pt-4 border-t">
            <Label htmlFor="signature" className="text-base font-semibold">✍️ Assinatura Digital da Empresa</Label>
            <p className="text-xs text-muted-foreground mb-3">
              Esta imagem aparecerá como assinatura do LOCADOR nos contratos
            </p>
            {(signaturePreview || settings.companySignatureUrl) && (
              <div className="mb-4 p-4 border-2 border-dashed rounded-lg bg-muted">
                <img 
                  src={signaturePreview || settings.companySignatureUrl} 
                  alt="Assinatura Preview" 
                  className="max-h-24 object-contain mx-auto"
                />
              </div>
            )}
            <Input
              id="signature"
              type="file"
              accept="image/*"
              onChange={handleSignatureUpload}
              className="cursor-pointer"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Recomendado: PNG com fundo transparente. Máximo 2MB
            </p>
          </div>
        </div>
      </Card>

      {/* Card: Templates de Documentos */}
      <Card className="p-6 max-w-4xl">
        <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Configuração de Documentos
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Configure os textos dos recibos e contratos. Os dados da empresa, cliente e produtos são preenchidos automaticamente.
        </p>
        
        <Tabs defaultValue="receipt" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="receipt">Recibo</TabsTrigger>
            <TabsTrigger value="contract">Contrato</TabsTrigger>
          </TabsList>
          
          <TabsContent value="receipt" className="space-y-4">
            <div>
              <Label htmlFor="receiptTitle">Título do Recibo</Label>
              <Input
                id="receiptTitle"
                value={settings.receiptTitle}
                onChange={(e) => setSettings(prev => ({...prev, receiptTitle: e.target.value}))}
                placeholder="🧾 RECIBO DE VENDA"
              />
            </div>

            <div>
              <Label htmlFor="receiptNotes">Observações Adicionais (opcional)</Label>
              <Textarea
                id="receiptNotes"
                ref={receiptNotesRef}
                rows={4}
                value={settings.receiptNotes}
                onChange={(e) => setSettings(prev => ({...prev, receiptNotes: e.target.value}))}
                placeholder="Ex: Produto adquirido em perfeito estado. Garantia de 90 dias..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                Texto livre para adicionar informações extras ao recibo
              </p>
            </div>

            <Accordion type="single" collapsible className="border rounded-lg">
              <AccordionItem value="variables" className="border-none">
                <AccordionTrigger className="px-4 hover:no-underline">
                  <span className="flex items-center gap-2 text-sm">
                    🏷️ Variáveis Disponíveis (clique para inserir)
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="grid grid-cols-2 gap-2">
                    {availableVariables.map((v) => (
                      <Button
                        key={v.tag}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => insertVariable(v.tag, true)}
                        className="justify-start text-xs h-auto py-2"
                        title={v.description}
                      >
                        <span className="font-mono text-primary">{v.tag}</span>
                      </Button>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertTitle className="text-blue-900 dark:text-blue-100">Dados Automáticos</AlertTitle>
              <AlertDescription className="text-blue-800 dark:text-blue-200 text-sm">
                O recibo já inclui automaticamente:<br/>
                • Cabeçalho com logo e número da venda<br/>
                • Dados completos da empresa e cliente<br/>
                • Tabela detalhada de produtos<br/>
                • Resumo de valores e condições de pagamento<br/>
                • Espaço para assinaturas
              </AlertDescription>
            </Alert>
          </TabsContent>
          
          <TabsContent value="contract" className="space-y-4">
            <div>
              <Label htmlFor="contractTitle">Título do Contrato</Label>
              <Input
                id="contractTitle"
                value={settings.contractTitle}
                onChange={(e) => setSettings(prev => ({...prev, contractTitle: e.target.value}))}
                placeholder="📄 CONTRATO DE COMPRA E VENDA"
              />
            </div>

            <div>
              <Label htmlFor="contractClauses">Cláusulas Contratuais</Label>
              <Textarea
                id="contractClauses"
                ref={contractClausesRef}
                rows={15}
                value={settings.contractClauses}
                onChange={(e) => setSettings(prev => ({...prev, contractClauses: e.target.value}))}
                placeholder="Digite as cláusulas do contrato aqui..."
                className="font-sans"
              />
              <p className="text-xs text-muted-foreground mt-1">
                💡 Dica: Use **texto** para negrito e quebre linhas para separar cláusulas
              </p>
            </div>

            <Accordion type="single" collapsible className="border rounded-lg">
              <AccordionItem value="variables" className="border-none">
                <AccordionTrigger className="px-4 hover:no-underline">
                  <span className="flex items-center gap-2 text-sm">
                    🏷️ Variáveis Disponíveis (clique para inserir)
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="grid grid-cols-2 gap-2">
                    {availableVariables.map((v) => (
                      <Button
                        key={v.tag}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => insertVariable(v.tag, false)}
                        className="justify-start text-xs h-auto py-2"
                        title={v.description}
                      >
                        <span className="font-mono text-primary">{v.tag}</span>
                      </Button>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertTitle className="text-blue-900 dark:text-blue-100">Dados Automáticos</AlertTitle>
              <AlertDescription className="text-blue-800 dark:text-blue-200 text-sm">
                O contrato já inclui automaticamente:<br/>
                • Cabeçalho com logo e número do contrato<br/>
                • Seções completas de vendedor e comprador<br/>
                • Objeto do contrato com tabela de produtos<br/>
                • Condições de pagamento detalhadas<br/>
                • Local, data e espaço para assinaturas
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>

        <Button onClick={handleSave} className="mt-6 w-full sm:w-auto" disabled={uploadingLogo}>
          <Save className="w-4 h-4 mr-2" />
          {uploadingLogo ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </Card>
    </div>
  );
};

export default Settings;