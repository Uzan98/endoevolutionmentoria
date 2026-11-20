// Edge Function: o mentor cadastra um aluno e o Supabase envia o convite por e-mail.
// A chave secreta (service role) só existe aqui dentro, no servidor do Supabase.
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply(405, { error: "Método não permitido." });

  const url = Deno.env.get("SUPABASE_URL")!;
  const asCaller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: caller } = await asCaller.auth.getUser();
  if (!caller.user) return reply(401, { error: "Entre na plataforma de novo." });

  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: profile } = await admin.from("profiles").select("role").eq("id", caller.user.id).single();
  if (profile?.role !== "mentor") return reply(403, { error: "Só o mentor pode cadastrar alunos." });

  let body: { name?: string; email?: string; city?: string; redirectTo?: string };
  try {
    body = await req.json();
  } catch {
    return reply(400, { error: "Dados inválidos." });
  }
  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  const city = (body.city ?? "").trim() || null;
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return reply(400, { error: "Preencha o nome e um e-mail válido." });

  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { name, city },
    redirectTo: body.redirectTo,
  });
  if (error) {
    if (/already.*registered|exists/i.test(error.message)) return reply(409, { error: "Já existe uma conta com este e-mail." });
    if (/rate limit/i.test(error.message))
      return reply(429, { error: "Limite de e-mails atingido. Configure o envio de e-mails (SMTP) do projeto ou tente mais tarde." });
    return reply(500, { error: "Não foi possível enviar o convite: " + error.message });
  }
  return reply(200, { message: `Convite enviado para ${email}. O aluno cria a senha pelo link do e-mail.` });
});
