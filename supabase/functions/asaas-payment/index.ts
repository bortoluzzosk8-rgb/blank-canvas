import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY');
// Production URL (use sandbox URL for testing: https://sandbox.asaas.com/api/v3)
const ASAAS_BASE_URL = 'https://api.asaas.com/api/v3';

// Plan prices in BRL
const PLAN_PRICES: Record<string, number> = {
  lancamento: 59,
};

interface CustomerData {
  name: string;
  cpfCnpj: string;
  email?: string;
  phone?: string;
}

interface PaymentData {
  customer: string;
  billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD';
  value: number;
  dueDate: string;
  description?: string;
  externalReference?: string;
}

interface SubscriptionData {
  franchiseId: string;
  plan: string;
  customerName: string;
  customerCpfCnpj: string;
  customerEmail?: string;
  customerPhone?: string;
  creditCard?: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
  creditCardHolderInfo?: {
    name: string;
    email: string;
    cpfCnpj: string;
    postalCode: string;
    addressNumber: string;
    phone: string;
  };
}

interface ChargeData {
  franchiseId: string;
  plan: string;
  billingType: 'PIX' | 'BOLETO';
  customerName: string;
  customerCpfCnpj: string;
  customerEmail?: string;
  customerPhone?: string;
}

// Helper to get or create customer in Asaas
async function getOrCreateCustomer(data: CustomerData): Promise<{ id: string; error?: string }> {
  const cpfCnpj = data.cpfCnpj.replace(/\D/g, '');
  
  // Search existing customer
  const searchResponse = await fetch(
    `${ASAAS_BASE_URL}/customers?cpfCnpj=${cpfCnpj}`,
    { headers: { 'access_token': ASAAS_API_KEY! } }
  );
  const searchData = await searchResponse.json();
  
  if (searchData.data && searchData.data.length > 0) {
    return { id: searchData.data[0].id };
  }
  
  // Create new customer
  const createResponse = await fetch(`${ASAAS_BASE_URL}/customers`, {
    method: 'POST',
    headers: {
      'access_token': ASAAS_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: data.name,
      cpfCnpj,
      email: data.email,
      phone: data.phone?.replace(/\D/g, ''),
    }),
  });
  
  const customerData = await createResponse.json();
  
  if (customerData.errors) {
    return { id: '', error: customerData.errors[0]?.description || 'Erro ao criar cliente' };
  }
  
  return { id: customerData.id };
}

// Helper to get Supabase admin client
function getSupabaseAdmin() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(supabaseUrl, supabaseKey);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let action = url.searchParams.get('action');

    const rawBody = await req.text();
    console.log(`[Asaas] Raw body length: ${rawBody.length}`);
    const body = rawBody ? JSON.parse(rawBody) : {};
    
    // Support action from body as well (supabase.functions.invoke doesn't support query params in name)
    if (!action && body.action) {
      action = body.action;
    }
    
    console.log(`[Asaas] Action: ${action}`);

    if (!ASAAS_API_KEY) {
      console.error('[Asaas] API Key not configured');
      return new Response(
        JSON.stringify({ error: 'API Key do Asaas não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Asaas] Request body keys:`, Object.keys(body).join(', '));

    switch (action) {
      case 'create-customer': {
        const { name, cpfCnpj, email, phone } = body as CustomerData;
        
        if (!name || !cpfCnpj) {
          return new Response(
            JSON.stringify({ error: 'Nome e CPF/CNPJ são obrigatórios' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const result = await getOrCreateCustomer({ name, cpfCnpj, email, phone });
        
        if (result.error) {
          return new Response(
            JSON.stringify({ error: result.error }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ customerId: result.id }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'create-payment': {
        const { customer, billingType, value, dueDate, description, externalReference } = body as PaymentData;
        
        if (!customer || !billingType || !value || !dueDate) {
          return new Response(
            JSON.stringify({ error: 'Dados incompletos para criar cobrança' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const paymentPayload: Record<string, unknown> = {
          customer,
          billingType,
          value,
          dueDate,
          description: description || 'Pagamento de locação',
          externalReference,
        };

        const paymentResponse = await fetch(`${ASAAS_BASE_URL}/payments`, {
          method: 'POST',
          headers: {
            'access_token': ASAAS_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(paymentPayload),
        });

        const paymentData = await paymentResponse.json();
        console.log('[Asaas] Payment created:', JSON.stringify(paymentData));

        if (paymentData.errors) {
          return new Response(
            JSON.stringify({ error: paymentData.errors[0]?.description || 'Erro ao criar cobrança' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        let pixData = null;
        if (billingType === 'PIX' && paymentData.id) {
          const pixResponse = await fetch(`${ASAAS_BASE_URL}/payments/${paymentData.id}/pixQrCode`, {
            headers: { 'access_token': ASAAS_API_KEY },
          });
          pixData = await pixResponse.json();
          console.log('[Asaas] PIX QR Code:', JSON.stringify(pixData));
        }

        return new Response(
          JSON.stringify({ payment: paymentData, pix: pixData }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'create-subscription': {
        const data = body as SubscriptionData;
        
        if (!data.franchiseId || !data.plan || !data.customerName || !data.customerCpfCnpj) {
          return new Response(
            JSON.stringify({ error: 'Dados incompletos para criar assinatura' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const planValue = PLAN_PRICES[data.plan];
        if (!planValue) {
          return new Response(
            JSON.stringify({ error: 'Plano inválido' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get or create customer
        const customerResult = await getOrCreateCustomer({
          name: data.customerName,
          cpfCnpj: data.customerCpfCnpj,
          email: data.customerEmail,
          phone: data.customerPhone,
        });

        if (customerResult.error) {
          return new Response(
            JSON.stringify({ error: customerResult.error }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create subscription
        const nextDueDate = new Date();
        nextDueDate.setDate(nextDueDate.getDate() + 1); // First charge tomorrow

        const subscriptionPayload: Record<string, unknown> = {
          customer: customerResult.id,
          billingType: 'CREDIT_CARD',
          value: planValue,
          nextDueDate: nextDueDate.toISOString().split('T')[0],
          cycle: 'MONTHLY',
          description: `Assinatura PlayGestor - Plano ${data.plan}`,
          externalReference: data.franchiseId,
        };

        // Add credit card info if provided
        if (data.creditCard) {
          subscriptionPayload.creditCard = data.creditCard;
          subscriptionPayload.creditCardHolderInfo = data.creditCardHolderInfo;
        }

        console.log('[Asaas] Creating subscription:', JSON.stringify(subscriptionPayload));

        const subscriptionResponse = await fetch(`${ASAAS_BASE_URL}/subscriptions`, {
          method: 'POST',
          headers: {
            'access_token': ASAAS_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(subscriptionPayload),
        });

        const subscriptionData = await subscriptionResponse.json();
        console.log('[Asaas] Subscription created:', JSON.stringify(subscriptionData));

        if (subscriptionData.errors) {
          return new Response(
            JSON.stringify({ error: subscriptionData.errors[0]?.description || 'Erro ao criar assinatura' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Update franchise in database
        const supabase = getSupabaseAdmin();
        const { error: updateError } = await supabase
          .from('franchises')
          .update({
            asaas_customer_id: customerResult.id,
            asaas_subscription_id: subscriptionData.id,
            subscription_status: 'active',
            subscription_plan: data.plan,
            payment_method: 'card',
            next_due_date: nextDueDate.toISOString().split('T')[0],
            subscription_expires_at: new Date(Date.now() + 32 * 24 * 60 * 60 * 1000).toISOString(), // +32 days buffer
          })
          .eq('id', data.franchiseId);

        if (updateError) {
          console.error('[Asaas] Error updating franchise:', updateError);
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            subscription: subscriptionData,
            customerId: customerResult.id
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'create-charge': {
        const data = body as ChargeData;
        
        if (!data.franchiseId || !data.plan || !data.billingType || !data.customerName || !data.customerCpfCnpj) {
          return new Response(
            JSON.stringify({ error: 'Dados incompletos para criar cobrança' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const planValue = PLAN_PRICES[data.plan];
        if (!planValue) {
          return new Response(
            JSON.stringify({ error: 'Plano inválido' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get or create customer
        const customerResult = await getOrCreateCustomer({
          name: data.customerName,
          cpfCnpj: data.customerCpfCnpj,
          email: data.customerEmail,
          phone: data.customerPhone,
        });

        if (customerResult.error) {
          return new Response(
            JSON.stringify({ error: customerResult.error }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create charge with 5 days due date
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 5);

        const chargePayload = {
          customer: customerResult.id,
          billingType: data.billingType,
          value: planValue,
          dueDate: dueDate.toISOString().split('T')[0],
          description: `Mensalidade PlayGestor - Plano ${data.plan}`,
          externalReference: data.franchiseId,
        };

        console.log('[Asaas] Creating charge:', JSON.stringify(chargePayload));

        const chargeResponse = await fetch(`${ASAAS_BASE_URL}/payments`, {
          method: 'POST',
          headers: {
            'access_token': ASAAS_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(chargePayload),
        });

        const chargeData = await chargeResponse.json();
        console.log('[Asaas] Charge created:', JSON.stringify(chargeData));

        if (chargeData.errors) {
          return new Response(
            JSON.stringify({ error: chargeData.errors[0]?.description || 'Erro ao criar cobrança' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get PIX QR Code if PIX
        let pixData = null;
        if (data.billingType === 'PIX' && chargeData.id) {
          const pixResponse = await fetch(`${ASAAS_BASE_URL}/payments/${chargeData.id}/pixQrCode`, {
            headers: { 'access_token': ASAAS_API_KEY },
          });
          pixData = await pixResponse.json();
          console.log('[Asaas] PIX QR Code:', JSON.stringify(pixData));
        }

        // Save to subscription_payments table
        const supabase = getSupabaseAdmin();
        
        const { error: insertError } = await supabase
          .from('subscription_payments')
          .insert({
            franchise_id: data.franchiseId,
            asaas_payment_id: chargeData.id,
            billing_type: data.billingType,
            value: planValue,
            status: 'pending',
            due_date: dueDate.toISOString().split('T')[0],
            boleto_url: chargeData.bankSlipUrl || null,
            boleto_barcode: chargeData.nossoNumero || null,
            pix_qrcode: pixData?.payload || null,
            pix_qrcode_image: pixData?.encodedImage || null,
            pix_expiration_date: pixData?.expirationDate || null,
          });

        if (insertError) {
          console.error('[Asaas] Error saving payment:', insertError);
        }

        // Update franchise status
        const { error: updateError } = await supabase
          .from('franchises')
          .update({
            asaas_customer_id: customerResult.id,
            subscription_status: 'past_due',
            subscription_plan: data.plan,
            payment_method: data.billingType.toLowerCase(),
            next_due_date: dueDate.toISOString().split('T')[0],
          })
          .eq('id', data.franchiseId);

        if (updateError) {
          console.error('[Asaas] Error updating franchise:', updateError);
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            payment: chargeData,
            pix: pixData,
            customerId: customerResult.id
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'cancel-subscription': {
        const { subscriptionId, franchiseId } = body;
        
        if (!subscriptionId) {
          return new Response(
            JSON.stringify({ error: 'ID da assinatura é obrigatório' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const cancelResponse = await fetch(`${ASAAS_BASE_URL}/subscriptions/${subscriptionId}`, {
          method: 'DELETE',
          headers: { 'access_token': ASAAS_API_KEY },
        });

        const cancelData = await cancelResponse.json();
        console.log('[Asaas] Subscription cancelled:', JSON.stringify(cancelData));

        if (cancelData.errors) {
          return new Response(
            JSON.stringify({ error: cancelData.errors[0]?.description || 'Erro ao cancelar assinatura' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Update franchise
        if (franchiseId) {
          const supabase = getSupabaseAdmin();
          await supabase
            .from('franchises')
            .update({
              subscription_status: 'cancelled',
              asaas_subscription_id: null,
            })
            .eq('id', franchiseId);
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'list-payments': {
        const { franchiseId } = body;
        
        if (!franchiseId) {
          return new Response(
            JSON.stringify({ error: 'ID da franquia é obrigatório' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const supabase = getSupabaseAdmin();
        const { data: payments, error } = await supabase
          .from('subscription_payments')
          .select('*')
          .eq('franchise_id', franchiseId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('[Asaas] Error fetching payments:', error);
          return new Response(
            JSON.stringify({ error: 'Erro ao buscar pagamentos' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ payments }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get-payment-status': {
        const { paymentId } = body;
        
        if (!paymentId) {
          return new Response(
            JSON.stringify({ error: 'ID do pagamento é obrigatório' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const statusResponse = await fetch(`${ASAAS_BASE_URL}/payments/${paymentId}`, {
          headers: { 'access_token': ASAAS_API_KEY },
        });

        const statusData = await statusResponse.json();
        console.log('[Asaas] Payment status:', JSON.stringify(statusData));

        return new Response(
          JSON.stringify({ payment: statusData }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get-pix-qrcode': {
        const { paymentId } = body;
        
        if (!paymentId) {
          return new Response(
            JSON.stringify({ error: 'ID do pagamento é obrigatório' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const pixResponse = await fetch(`${ASAAS_BASE_URL}/payments/${paymentId}/pixQrCode`, {
          headers: { 'access_token': ASAAS_API_KEY },
        });

        const pixData = await pixResponse.json();
        console.log('[Asaas] PIX QR Code:', JSON.stringify(pixData));

        return new Response(
          JSON.stringify({ pix: pixData }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'subscription-webhook':
      case 'webhook': {
        console.log('[Asaas] Webhook received:', JSON.stringify(body));
        
        const { event, payment, subscription } = body;
        const supabase = getSupabaseAdmin();
        
        // Handle payment events
        if (payment) {
          const franchiseId = payment.externalReference;
          
          if (!franchiseId) {
            console.log('[Asaas] No external reference, checking subscription_payments');
            // Try to find by asaas_payment_id
            const { data: existingPayment } = await supabase
              .from('subscription_payments')
              .select('franchise_id')
              .eq('asaas_payment_id', payment.id)
              .maybeSingle();
              
            if (existingPayment) {
              // Update subscription_payments
              let paymentStatus = 'pending';
              if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
                paymentStatus = 'paid';
              } else if (event === 'PAYMENT_OVERDUE') {
                paymentStatus = 'overdue';
              } else if (event === 'PAYMENT_DELETED' || event === 'PAYMENT_REFUNDED') {
                paymentStatus = 'cancelled';
              }

              await supabase
                .from('subscription_payments')
                .update({
                  status: paymentStatus,
                  payment_date: paymentStatus === 'paid' ? new Date().toISOString().split('T')[0] : null,
                })
                .eq('asaas_payment_id', payment.id);

              // Update franchise status if payment confirmed
              if (paymentStatus === 'paid') {
                const nextDueDate = new Date();
                nextDueDate.setMonth(nextDueDate.getMonth() + 1);
                
                await supabase
                  .from('franchises')
                  .update({
                    subscription_status: 'active',
                    next_due_date: nextDueDate.toISOString().split('T')[0],
                    subscription_expires_at: new Date(nextDueDate.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
                  })
                  .eq('id', existingPayment.franchise_id);
              } else if (paymentStatus === 'overdue') {
                await supabase
                  .from('franchises')
                  .update({ subscription_status: 'past_due' })
                  .eq('id', existingPayment.franchise_id);
              }
            }
          } else {
            // Has external reference = franchise_id
            let newSubscriptionStatus = null;
            let newPaymentStatus = 'pending';
            
            if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
              newSubscriptionStatus = 'active';
              newPaymentStatus = 'paid';
            } else if (event === 'PAYMENT_OVERDUE') {
              newSubscriptionStatus = 'past_due';
              newPaymentStatus = 'overdue';
            } else if (event === 'PAYMENT_DELETED' || event === 'PAYMENT_REFUNDED') {
              newPaymentStatus = 'cancelled';
            }

            // Update subscription_payments if exists
            await supabase
              .from('subscription_payments')
              .update({
                status: newPaymentStatus,
                payment_date: newPaymentStatus === 'paid' ? new Date().toISOString().split('T')[0] : null,
              })
              .eq('asaas_payment_id', payment.id);

            // Update sale_payments (for rental payments)
            await supabase
              .from('sale_payments')
              .update({
                asaas_status: payment.status,
                status: newPaymentStatus,
                payment_date: newPaymentStatus === 'paid' ? new Date().toISOString().split('T')[0] : null,
              })
              .eq('asaas_payment_id', payment.id);

            // Update franchise status
            if (newSubscriptionStatus) {
              const updateData: Record<string, unknown> = {
                subscription_status: newSubscriptionStatus,
              };
              
              if (newSubscriptionStatus === 'active') {
                const nextDueDate = new Date();
                nextDueDate.setMonth(nextDueDate.getMonth() + 1);
                updateData.next_due_date = nextDueDate.toISOString().split('T')[0];
                updateData.subscription_expires_at = new Date(nextDueDate.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString();
              }
              
              await supabase
                .from('franchises')
                .update(updateData)
                .eq('id', franchiseId);
            }

            console.log(`[Asaas] Payment ${payment.id} updated to ${newPaymentStatus}`);
          }
        }
        
        // Handle subscription events
        if (subscription) {
          const franchiseId = subscription.externalReference;
          
          if (franchiseId) {
            if (event === 'SUBSCRIPTION_DELETED' || event === 'SUBSCRIPTION_INACTIVE') {
              await supabase
                .from('franchises')
                .update({
                  subscription_status: 'cancelled',
                  asaas_subscription_id: null,
                })
                .eq('id', franchiseId);
                
              console.log(`[Asaas] Subscription cancelled for franchise ${franchiseId}`);
            }
          }
        }

        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Ação não reconhecida' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error: unknown) {
    console.error('[Asaas] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
