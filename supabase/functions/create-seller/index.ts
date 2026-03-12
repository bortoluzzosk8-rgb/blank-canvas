import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Get the authorization header to verify the requesting user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token to verify their role
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get the current user
    const { data: { user: currentUser }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !currentUser) {
      console.error('Error getting current user:', userError);
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has franqueadora role using the has_role function (SECURITY DEFINER)
    const { data: hasRole, error: roleError } = await supabaseUser.rpc('has_role', {
      _user_id: currentUser.id,
      _role: 'franqueadora'
    });

    if (roleError) {
      console.error('Error checking role:', roleError);
      return new Response(
        JSON.stringify({ error: 'Erro ao verificar permissões' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!hasRole) {
      console.error('User does not have franqueadora role');
      return new Response(
        JSON.stringify({ error: 'Apenas franqueadoras podem criar vendedores' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { name, email, password, phone } = await req.json();

    if (!name || !email || !password) {
      return new Response(
        JSON.stringify({ error: 'Nome, email e senha são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'A senha deve ter no mínimo 6 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Create user with admin API (doesn't log in)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
    });

    if (createError) {
      console.error('Error creating user:', createError);
      if (createError.message?.includes('already been registered')) {
        return new Response(
          JSON.stringify({ error: 'Este email já está cadastrado' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ error: 'Erro ao criar usuário' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!newUser.user) {
      return new Response(
        JSON.stringify({ error: 'Erro ao criar usuário' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Add vendedor role
    const { error: roleInsertError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role: 'vendedor',
      });

    if (roleInsertError) {
      console.error('Error inserting role:', roleInsertError);
      // Rollback: delete the created user
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ error: 'Erro ao atribuir role ao usuário' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Add seller record
    const { error: sellerInsertError } = await supabaseAdmin
      .from('sellers')
      .insert({
        user_id: newUser.user.id,
        name,
        email,
        phone: phone || null,
      });

    if (sellerInsertError) {
      console.error('Error creating seller record:', sellerInsertError);
      // Rollback: delete role and user
      await supabaseAdmin.from('user_roles').delete().eq('user_id', newUser.user.id);
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar registro do vendedor' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Link seller to the same franchise as the creator
    const { data: creatorFranchise } = await supabaseAdmin
      .from('user_franchises')
      .select('franchise_id')
      .eq('user_id', currentUser.id)
      .limit(1)
      .single();

    if (creatorFranchise) {
      const { error: franchiseLinkError } = await supabaseAdmin
        .from('user_franchises')
        .insert({
          user_id: newUser.user.id,
          franchise_id: creatorFranchise.franchise_id,
          name: name,
        });

      if (franchiseLinkError) {
        console.error('Error linking seller to franchise:', franchiseLinkError);
        // Non-fatal: seller was created, just log the error
      }
    } else {
      console.warn('Creator has no franchise link, seller created without franchise association');
    }

    console.log(`Seller created successfully: ${email} (${newUser.user.id})`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Vendedor criado com sucesso',
        user_id: newUser.user.id 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-seller function:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
