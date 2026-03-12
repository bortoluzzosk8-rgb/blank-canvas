import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const getConfirmationTemplate = (name: string, confirmationUrl: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">
  <div style="background:#fff;border-radius:12px;padding:40px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="color:#7c3aed;font-size:28px;margin:0;">PlayGestor</h1>
    </div>
    <h2 style="color:#18181b;font-size:22px;margin:0 0 16px;">Confirme seu email, ${name}! ✉️</h2>
    <p style="color:#52525b;font-size:16px;line-height:1.6;margin:0 0 16px;">
      Obrigado por criar sua conta no <strong>PlayGestor</strong>! Para acessar o sistema, confirme seu email clicando no botão abaixo.
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${confirmationUrl}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:600;">
        Confirmar meu email
      </a>
    </div>
    <p style="color:#52525b;font-size:14px;line-height:1.6;margin:0 0 16px;">
      Se o botão não funcionar, copie e cole o link abaixo no seu navegador:
    </p>
    <p style="color:#7c3aed;font-size:13px;word-break:break-all;margin:0 0 24px;">
      ${confirmationUrl}
    </p>
    <div style="background:#fef3c7;border-radius:8px;padding:16px;margin:24px 0;">
      <p style="color:#92400e;font-size:14px;margin:0;">
        ⚠️ Se você não criou uma conta no PlayGestor, ignore este email.
      </p>
    </div>
    <hr style="border:none;border-top:1px solid #e4e4e7;margin:24px 0;">
    <p style="color:#a1a1aa;font-size:13px;text-align:center;margin:0;">
      PlayGestor — Gestão inteligente para seu negócio<br>
      <a href="https://playgestor.com.br" style="color:#7c3aed;">playgestor.com.br</a>
    </p>
  </div>
</div>
</body>
</html>
`;

const getPasswordResetTemplate = (email: string, resetUrl: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">
  <div style="background:#fff;border-radius:12px;padding:40px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="color:#7c3aed;font-size:28px;margin:0;">PlayGestor</h1>
    </div>
    <h2 style="color:#18181b;font-size:22px;margin:0 0 16px;">Recuperação de Senha 🔐</h2>
    <p style="color:#52525b;font-size:16px;line-height:1.6;margin:0 0 16px;">
      Recebemos uma solicitação de redefinição de senha para a conta associada ao email <strong>${email}</strong>.
    </p>
    <p style="color:#52525b;font-size:16px;line-height:1.6;margin:0 0 16px;">
      Clique no botão abaixo para definir uma nova senha:
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${resetUrl}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:600;">
        Redefinir minha senha
      </a>
    </div>
    <p style="color:#52525b;font-size:14px;line-height:1.6;margin:0 0 16px;">
      Se o botão não funcionar, copie e cole o link abaixo no seu navegador:
    </p>
    <p style="color:#7c3aed;font-size:13px;word-break:break-all;margin:0 0 24px;">
      ${resetUrl}
    </p>
    <div style="background:#fef3c7;border-radius:8px;padding:16px;margin:24px 0;">
      <p style="color:#92400e;font-size:14px;margin:0;">
        ⚠️ Se você não solicitou essa alteração, ignore este email. Sua senha continuará a mesma.
      </p>
    </div>
    <hr style="border:none;border-top:1px solid #e4e4e7;margin:24px 0;">
    <p style="color:#a1a1aa;font-size:13px;text-align:center;margin:0;">
      PlayGestor — Gestão inteligente para seu negócio<br>
      <a href="https://playgestor.com.br" style="color:#7c3aed;">playgestor.com.br</a>
    </p>
  </div>
</div>
</body>
</html>
`;

const getWelcomeTemplate = (name: string, email: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">
  <div style="background:#fff;border-radius:12px;padding:40px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="color:#7c3aed;font-size:28px;margin:0;">PlayGestor</h1>
    </div>
    <h2 style="color:#18181b;font-size:22px;margin:0 0 16px;">Bem-vindo(a), ${name}! 🎉</h2>
    <p style="color:#52525b;font-size:16px;line-height:1.6;margin:0 0 16px;">
      Sua conta foi criada com sucesso no <strong>PlayGestor</strong>. Estamos felizes em ter você conosco!
    </p>
    <p style="color:#52525b;font-size:16px;line-height:1.6;margin:0 0 24px;">
      Sua conta está associada ao email <strong>${email}</strong>.
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="https://playgestor.com.br/login" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:600;">
        Acessar o Painel
      </a>
    </div>
    <div style="background:#f0fdf4;border-radius:8px;padding:16px;margin:24px 0;">
      <p style="color:#166534;font-size:14px;margin:0 0 8px;font-weight:600;">🚀 Primeiros passos:</p>
      <ul style="color:#166534;font-size:14px;margin:0;padding-left:20px;">
        <li style="margin-bottom:4px;">Cadastre seus produtos no catálogo</li>
        <li style="margin-bottom:4px;">Configure suas informações da empresa</li>
        <li style="margin-bottom:4px;">Comece a registrar suas vendas</li>
      </ul>
    </div>
    <hr style="border:none;border-top:1px solid #e4e4e7;margin:24px 0;">
    <p style="color:#a1a1aa;font-size:13px;text-align:center;margin:0;">
      PlayGestor — Gestão inteligente para seu negócio<br>
      <a href="https://playgestor.com.br" style="color:#7c3aed;">playgestor.com.br</a>
    </p>
  </div>
</div>
</body>
</html>
`;


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, to, name, data } = await req.json();

    if (!type || !to) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: type, to' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let subject = '';
    let html = '';

    switch (type) {
      case 'confirmation': {
        // Generate confirmation link using Supabase Admin API
        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        );

        const origin = data?.origin || 'https://playgestor.com.br';

        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'signup',
          email: to,
          options: {
            redirectTo: `${origin}/auth/callback`,
          }
        });

        if (linkError || !linkData?.properties?.action_link) {
          console.error('Generate link error:', linkError);
          return new Response(
            JSON.stringify({ error: 'Failed to generate confirmation link', details: linkError?.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const confirmationUrl = linkData.properties.action_link;
        subject = 'Confirme seu email — PlayGestor ✉️';
        html = getConfirmationTemplate(name || 'Usuário', confirmationUrl);
        break;
      }
      case 'password_reset': {
        const supabaseAdminReset = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        );
        const resetOrigin = 'https://biz-joy-forge.lovable.app';
        const { data: resetLinkData, error: resetLinkError } = await supabaseAdminReset.auth.admin.generateLink({
          type: 'recovery',
          email: to,
          options: {
            redirectTo: `${resetOrigin}/auth/callback`,
          }
        });

        if (resetLinkError || !resetLinkData?.properties?.action_link) {
          console.error('Generate recovery link error:', resetLinkError);
          return new Response(
            JSON.stringify({ error: 'Failed to generate recovery link', details: resetLinkError?.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const resetUrl = resetLinkData.properties.action_link;
        subject = 'Recuperação de Senha — PlayGestor 🔐';
        html = getPasswordResetTemplate(to, resetUrl);
        break;
      }
      case 'welcome':
        subject = 'Bem-vindo ao PlayGestor! 🎉';
        html = getWelcomeTemplate(name || 'Usuário', to);
        break;
      default:
        return new Response(
          JSON.stringify({ error: `Unknown email type: ${type}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'PlayGestor <suporte@playgestor.com.br>',
        to: [to],
        subject,
        html,
      }),
    });

    const resData = await res.json();

    if (!res.ok) {
      console.error('Resend API error:', resData);
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: resData }),
        { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: resData.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Send email error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
