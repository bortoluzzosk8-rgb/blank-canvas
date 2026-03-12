--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.7

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'user'
);


--
-- Name: get_lead_temperature(boolean, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_lead_temperature(p_cart_created boolean, p_whatsapp_sent boolean) RETURNS text
    LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF p_whatsapp_sent THEN
    RETURN 'hot';
  ELSIF p_cart_created THEN
    RETURN 'warm';
  ELSE
    RETURN 'cold';
  END IF;
END;
$$;


--
-- Name: handle_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


SET default_table_access_method = heap;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    icon text DEFAULT '📦'::text NOT NULL,
    color text DEFAULT 'gradient-primary'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    phone text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_access timestamp with time zone DEFAULT now() NOT NULL,
    is_client boolean DEFAULT false NOT NULL,
    cart_created boolean DEFAULT false NOT NULL,
    whatsapp_sent boolean DEFAULT false NOT NULL,
    email text,
    empresa text,
    cpf text,
    cnpj text,
    rg text,
    endereco text,
    cidade text,
    estado text,
    cep text
);


--
-- Name: product_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    code text NOT NULL,
    purchase_id uuid NOT NULL,
    sale_id uuid,
    status text DEFAULT 'available'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT product_codes_status_check CHECK ((status = ANY (ARRAY['available'::text, 'reserved'::text, 'sold'::text])))
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    cost_price numeric NOT NULL,
    sale_price numeric NOT NULL,
    image_url text[],
    stock_qty numeric DEFAULT 0 NOT NULL,
    lead_time_days integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    category_id uuid,
    visible boolean DEFAULT true NOT NULL,
    display_order integer DEFAULT 9999
);


--
-- Name: purchases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    purchase_date date NOT NULL,
    product text NOT NULL,
    quantity numeric NOT NULL,
    unit_value numeric NOT NULL,
    total_value numeric NOT NULL,
    supplier text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    product_id uuid,
    payment_method text DEFAULT 'cash'::text,
    installments integer DEFAULT 1,
    installment_dates jsonb DEFAULT '[]'::jsonb,
    CONSTRAINT purchases_quantity_check CHECK ((quantity > (0)::numeric)),
    CONSTRAINT purchases_total_value_check CHECK ((total_value >= (0)::numeric)),
    CONSTRAINT purchases_unit_value_check CHECK ((unit_value >= (0)::numeric))
);


--
-- Name: sale_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sale_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sale_id uuid NOT NULL,
    product_id uuid,
    product_code_id uuid,
    product_name text NOT NULL,
    quantity numeric DEFAULT 1 NOT NULL,
    unit_value numeric NOT NULL,
    total_value numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sale_date date NOT NULL,
    product text,
    quantity numeric,
    unit_value numeric,
    total_value numeric NOT NULL,
    client_name text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    client_id uuid,
    product_id uuid,
    product_code_id uuid,
    payment_method text DEFAULT 'cash'::text,
    installments integer DEFAULT 1,
    installment_dates jsonb DEFAULT '[]'::jsonb,
    down_payment numeric DEFAULT 0,
    status text DEFAULT 'pending'::text NOT NULL,
    delivery_date date,
    CONSTRAINT sales_quantity_check CHECK ((quantity > (0)::numeric)),
    CONSTRAINT sales_total_value_check CHECK ((total_value >= (0)::numeric)),
    CONSTRAINT sales_unit_value_check CHECK ((unit_value >= (0)::numeric))
);


--
-- Name: settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    monthly_interest numeric DEFAULT 0 NOT NULL,
    max_installments integer DEFAULT 12 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    whatsapp_number text,
    logo_url text,
    primary_color text DEFAULT '#8B5CF6'::text,
    secondary_color text DEFAULT '#EC4899'::text,
    catalog_title text DEFAULT 'Brinquedos Infláveis'::text,
    catalog_subtitle text DEFAULT 'Bem-vindo ao nosso catálogo!'::text,
    catalog_header_title text DEFAULT 'Catálogo ENGBRINK'::text,
    company_name text DEFAULT 'ENGBRINK'::text,
    company_cnpj text,
    company_address text,
    company_city text,
    company_state text,
    company_cep text,
    company_email text,
    company_phone text,
    receipt_template text DEFAULT '# RECIBO DE VENDA

**Número:** {{saleNumber}}  
**Data:** {{saleDate}}

---

## VENDEDOR
**{{companyName}}**  
CNPJ: {{companyCNPJ}}  
Endereço: {{companyAddress}}  
Telefone: {{companyPhone}}  
Email: {{companyEmail}}

---

## COMPRADOR
**{{clientName}}**  
CPF/CNPJ: {{clientDocument}}  
Telefone: {{clientPhone}}  
Endereço: {{clientAddress}}

---

## PRODUTOS
{{#products}}
- **{{name}}** (Código: {{code}})  
  Quantidade: {{quantity}} | Valor Unitário: {{unitValue}} | Total: {{totalValue}}
{{/products}}

---

## PAGAMENTO
**Total da Venda:** {{totalValue}}  
**Forma de Pagamento:** {{paymentMethod}}  
{{#hasDownPayment}}
**Entrada:** {{downPayment}}  
**Valor Parcelado:** {{installmentAmount}}  
{{/hasDownPayment}}
**Parcelas:** {{installments}}x de {{installmentValue}}

{{#installmentDates}}
- Parcela {{number}}: Vencimento {{date}}
{{/installmentDates}}

---

**Observações:** {{notes}}

_Recebemos de {{clientName}} a quantia referente aos produtos discriminados acima._

___________________________  
Assinatura do Vendedor'::text,
    contract_template text DEFAULT '# CONTRATO DE COMPRA E VENDA

**CONTRATO Nº:** {{saleNumber}}  
**DATA:** {{saleDate}}

---

## VENDEDOR (CONTRATADO)
**{{companyName}}**  
CNPJ: {{companyCNPJ}}  
Endereço: {{companyAddress}}, {{companyCity}}/{{companyState}} - CEP: {{companyCEP}}  
Telefone: {{companyPhone}}  
Email: {{companyEmail}}

---

## COMPRADOR (CONTRATANTE)
**{{clientName}}**  
CPF/CNPJ: {{clientDocument}}  
Telefone: {{clientPhone}}  
Email: {{clientEmail}}  
Endereço: {{clientAddress}}, {{clientCity}}/{{clientState}} - CEP: {{clientCEP}}

---

## OBJETO DO CONTRATO

O CONTRATADO vende ao CONTRATANTE os seguintes produtos:

{{#products}}
**{{number}}. {{name}}** (Código: {{code}})
- Quantidade: {{quantity}}
- Valor Unitário: R$ {{unitValue}}
- Subtotal: R$ {{totalValue}}
{{/products}}

**VALOR TOTAL DA VENDA:** R$ {{totalValue}}

---

## CONDIÇÕES DE PAGAMENTO

- **Forma de Pagamento:** {{paymentMethod}}
{{#hasDownPayment}}
- **Entrada:** R$ {{downPayment}} (pago em {{saleDate}})
- **Saldo a Parcelar:** R$ {{installmentAmount}}
{{/hasDownPayment}}
- **Número de Parcelas:** {{installments}}x de R$ {{installmentValue}}

{{#installmentDates}}
- **Parcela {{number}}:** Vencimento em {{date}} - R$ {{installmentValue}}
{{/installmentDates}}

---

## CONDIÇÕES GERAIS

1. **ENTREGA:** Os produtos serão entregues no endereço do CONTRATANTE conforme disponibilidade.

2. **GARANTIA:** Os produtos possuem garantia contra defeitos de fabricação conforme legislação vigente.

3. **INADIMPLÊNCIA:** O atraso no pagamento implicará em multa de 2% sobre o valor da parcela, além de juros de mora de 1% ao mês.

4. **RESCISÃO:** O não pagamento de qualquer parcela enseja a rescisão automática do contrato, com retenção dos valores já pagos a título de multa compensatória.

5. **FORO:** Fica eleito o foro da comarca de {{companyCity}}/{{companyState}} para dirimir quaisquer dúvidas oriundas deste contrato.

---

**Observações Adicionais:**  
{{notes}}

---

E por estarem assim justos e contratados, assinam o presente instrumento em duas vias de igual teor e forma.

{{companyCity}}/{{companyState}}, {{saleDate}}

_____________________________          _____________________________  
{{companyName}}                        {{clientName}}  
VENDEDOR                               COMPRADOR'::text,
    receipt_title text DEFAULT '🧾 RECIBO DE VENDA'::text,
    receipt_notes text,
    contract_title text DEFAULT '📄 CONTRATO DE COMPRA E VENDA'::text,
    contract_clauses text DEFAULT '## CONDIÇÕES GERAIS

**1. ENTREGA:** Os produtos serão entregues no endereço do COMPRADOR conforme disponibilidade.

**2. GARANTIA:** Os produtos possuem garantia contra defeitos de fabricação conforme legislação vigente.

**3. INADIMPLÊNCIA:** O atraso no pagamento implicará em multa de 2% sobre o valor da parcela, além de juros de mora de 1% ao mês.

**4. RESCISÃO:** O não pagamento de qualquer parcela enseja a rescisão automática do contrato, com retenção dos valores já pagos a título de multa compensatória.

**5. FORO:** Fica eleito o foro da comarca de {{companyCity}}/{{companyState}} para dirimir quaisquer dúvidas oriundas deste contrato.'::text
);


--
-- Name: stock_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.stock_summary WITH (security_invoker='on') AS
 SELECT p.id,
    p.name AS product_name,
    p.image_url,
    p.category_id,
    p.sale_price,
    p.cost_price,
    count(pc.id) FILTER (WHERE (pc.status = ANY (ARRAY['available'::text, 'sold'::text]))) AS total_purchased,
    count(pc.id) FILTER (WHERE (pc.status = 'sold'::text)) AS total_sold,
    count(pc.id) FILTER (WHERE (pc.status = 'available'::text)) AS stock_balance,
    ((count(pc.id) FILTER (WHERE (pc.status = 'available'::text)))::numeric * p.cost_price) AS stock_value
   FROM (public.products p
     LEFT JOIN public.product_codes pc ON ((pc.product_id = p.id)))
  GROUP BY p.id, p.name, p.image_url, p.category_id, p.sale_price, p.cost_price;


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: clients clients_phone_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_phone_key UNIQUE (phone);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: product_codes product_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_codes
    ADD CONSTRAINT product_codes_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: purchases purchases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_pkey PRIMARY KEY (id);


--
-- Name: sale_items sale_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_pkey PRIMARY KEY (id);


--
-- Name: sales sales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_pkey PRIMARY KEY (id);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: idx_clients_cart_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_cart_created ON public.clients USING btree (cart_created);


--
-- Name: idx_clients_is_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_is_client ON public.clients USING btree (is_client);


--
-- Name: idx_clients_whatsapp_sent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_whatsapp_sent ON public.clients USING btree (whatsapp_sent);


--
-- Name: idx_product_codes_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_codes_code ON public.product_codes USING btree (code);


--
-- Name: idx_product_codes_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_codes_product_id ON public.product_codes USING btree (product_id);


--
-- Name: idx_product_codes_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_codes_status ON public.product_codes USING btree (status);


--
-- Name: idx_products_display_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_display_order ON public.products USING btree (display_order);


--
-- Name: idx_products_visible; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_visible ON public.products USING btree (visible) WHERE (visible = true);


--
-- Name: idx_purchases_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchases_product_id ON public.purchases USING btree (product_id);


--
-- Name: idx_sale_items_product_code_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sale_items_product_code_id ON public.sale_items USING btree (product_code_id);


--
-- Name: idx_sale_items_sale_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sale_items_sale_id ON public.sale_items USING btree (sale_id);


--
-- Name: idx_sales_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_client_id ON public.sales USING btree (client_id);


--
-- Name: idx_sales_product_code_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_product_code_id ON public.sales USING btree (product_code_id);


--
-- Name: idx_sales_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_product_id ON public.sales USING btree (product_id);


--
-- Name: idx_sales_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_status ON public.sales USING btree (status);


--
-- Name: idx_unique_code_per_product; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_unique_code_per_product ON public.product_codes USING btree (product_id, code);


--
-- Name: purchases handle_purchases_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER handle_purchases_updated_at BEFORE UPDATE ON public.purchases FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: sales handle_sales_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER handle_sales_updated_at BEFORE UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: categories handle_updated_at_categories; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER handle_updated_at_categories BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: product_codes set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.product_codes FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: products update_products_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: settings update_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: product_codes product_codes_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_codes
    ADD CONSTRAINT product_codes_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_codes product_codes_purchase_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_codes
    ADD CONSTRAINT product_codes_purchase_id_fkey FOREIGN KEY (purchase_id) REFERENCES public.purchases(id) ON DELETE CASCADE;


--
-- Name: product_codes product_codes_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_codes
    ADD CONSTRAINT product_codes_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE SET NULL;


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: purchases purchases_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: sale_items sale_items_product_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_product_code_id_fkey FOREIGN KEY (product_code_id) REFERENCES public.product_codes(id);


--
-- Name: sale_items sale_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: sale_items sale_items_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE CASCADE;


--
-- Name: sales sales_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: sales sales_product_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_product_code_id_fkey FOREIGN KEY (product_code_id) REFERENCES public.product_codes(id) ON DELETE SET NULL;


--
-- Name: sales sales_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: clients Admins can delete clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete clients" ON public.clients FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: product_codes Admins can delete product codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete product codes" ON public.product_codes FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can delete roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: sale_items Admins can delete sale items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete sale items" ON public.sale_items FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: product_codes Admins can insert product codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert product codes" ON public.product_codes FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can insert roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: sale_items Admins can insert sale items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert sale items" ON public.sale_items FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: product_codes Admins can update product codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update product codes" ON public.product_codes FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: sale_items Admins can update sale items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update sale items" ON public.sale_items FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can view all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: product_codes Admins can view product codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view product codes" ON public.product_codes FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: sale_items Admins can view sale items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view sale items" ON public.sale_items FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: clients Anyone can insert clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert clients" ON public.clients FOR INSERT WITH CHECK (true);


--
-- Name: clients Anyone can update clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update clients" ON public.clients FOR UPDATE USING (true);


--
-- Name: categories Anyone can view categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view categories" ON public.categories FOR SELECT USING (true);


--
-- Name: clients Anyone can view clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view clients" ON public.clients FOR SELECT USING (true);


--
-- Name: products Anyone can view products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view products" ON public.products FOR SELECT USING (true);


--
-- Name: settings Anyone can view settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view settings" ON public.settings FOR SELECT USING (true);


--
-- Name: categories Only admins can delete categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can delete categories" ON public.categories FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: products Only admins can delete products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can delete products" ON public.products FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: purchases Only admins can delete purchases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can delete purchases" ON public.purchases FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: sales Only admins can delete sales; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can delete sales" ON public.sales FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: categories Only admins can insert categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can insert categories" ON public.categories FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: products Only admins can insert products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can insert products" ON public.products FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: purchases Only admins can insert purchases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can insert purchases" ON public.purchases FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: sales Only admins can insert sales; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can insert sales" ON public.sales FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: settings Only admins can insert settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can insert settings" ON public.settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: categories Only admins can update categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can update categories" ON public.categories FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: products Only admins can update products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can update products" ON public.products FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: purchases Only admins can update purchases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can update purchases" ON public.purchases FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: sales Only admins can update sales; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can update sales" ON public.sales FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: settings Only admins can update settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can update settings" ON public.settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: purchases Only admins can view purchases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can view purchases" ON public.purchases FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: sales Only admins can view sales; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can view sales" ON public.sales FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

--
-- Name: clients; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

--
-- Name: product_codes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_codes ENABLE ROW LEVEL SECURITY;

--
-- Name: products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

--
-- Name: purchases; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

--
-- Name: sale_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

--
-- Name: sales; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

--
-- Name: settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


