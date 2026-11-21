// Edge Function: envia notificações push.
// * Chamada pelo banco (gatilhos e agendamento), autorizada pelo cabeçalho x-push-secret.
// * Chamada pelo app com o login do usuário só para "enviar notificação de teste" para si mesmo.
// A chave privada VAPID e o segredo do gatilho ficam nos segredos da função.
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { sendPush, type Vapid } from "./webpush.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

type Pref = "chat" | "forum" | "meetings" | "lessons";
interface Note {
  title: string;
  body: string;
  url: string;
  tag?: string;
}

const clip = (s: string, n = 140) => {
  const t = (s ?? "").replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};

/** Comparação em tempo constante (o segredo não vaza pelo tempo de resposta). */
function sameSecret(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

let vapid: Vapid | null = null;
function getVapid(): Vapid {
  vapid ??= {
    publicKey: Deno.env.get("VAPID_PUBLIC_KEY")!,
    privateJwk: JSON.parse(Deno.env.get("VAPID_PRIVATE_JWK")!),
    subject: Deno.env.get("VAPID_SUBJECT") ?? "https://endoevolutionmentoria.vercel.app",
  };
  return vapid;
}

/** Envia para todos os aparelhos das pessoas, respeitando as preferências. */
async function deliver(db: SupabaseClient, userIds: string[], pref: Pref | null, note: Note, withBadge = false) {
  const ids = [...new Set(userIds)].filter(Boolean);
  if (!ids.length) return { sent: 0, failed: 0, removed: 0 };

  let allowed = ids;
  if (pref) {
    const { data: prefs } = await db.from("notification_prefs").select(`user_id, ${pref}`).in("user_id", ids);
    const off = new Set((prefs ?? []).filter((p: Record<string, unknown>) => p[pref] === false).map((p: { user_id: string }) => p.user_id));
    allowed = ids.filter((id) => !off.has(id));
  }
  if (!allowed.length) return { sent: 0, failed: 0, removed: 0 };

  const { data: subs } = await db.from("push_subscriptions").select("endpoint, user_id, p256dh, auth").in("user_id", allowed);
  if (!subs?.length) return { sent: 0, failed: 0, removed: 0 };

  const badges = new Map<string, number>();
  if (withBadge) {
    await Promise.all(
      allowed.map(async (id) => {
        const { data } = await db.rpc("push_unread_count", { p_user: id });
        if (typeof data === "number") badges.set(id, data);
      }),
    );
  }

  let sent = 0, failed = 0;
  const gone: string[] = [];
  await Promise.all(
    subs.map(async (s) => {
      try {
        const r = await sendPush(s, { ...note, badge: badges.get(s.user_id) }, getVapid(), { topic: note.tag });
        if (r.gone) gone.push(s.endpoint);
        else if (r.status >= 200 && r.status < 300) sent++;
        else failed++;
      } catch {
        failed++;
      }
    }),
  );
  if (gone.length) await db.from("push_subscriptions").delete().in("endpoint", gone);
  return { sent, failed, removed: gone.length };
}

async function names(db: SupabaseClient, ids: string[]) {
  const { data } = await db.from("profiles").select("id, name, role").in("id", ids);
  return new Map((data ?? []).map((p) => [p.id as string, p as { id: string; name: string; role: string }]));
}

async function mentors(db: SupabaseClient) {
  const { data } = await db.from("profiles").select("id").eq("role", "mentor");
  return (data ?? []).map((p) => p.id as string);
}

async function students(db: SupabaseClient) {
  const { data } = await db.from("profiles").select("id").neq("role", "mentor");
  return (data ?? []).map((p) => p.id as string);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply(405, { error: "Método não permitido." });

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  let input: { type?: string; record?: Record<string, string> | null };
  try {
    input = await req.json();
  } catch {
    return reply(400, { error: "Dados inválidos." });
  }

  // teste pelo app: só para o próprio usuário logado
  if (input.type === "test") {
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data } = await db.auth.getUser(token);
    if (!data.user) return reply(401, { error: "Entre na plataforma de novo." });
    const r = await deliver(db, [data.user.id], null, {
      title: "Notificações ativadas",
      body: "Tudo certo! Você vai ser avisado aqui de mensagens, respostas e encontros.",
      url: "/perfil",
      tag: "teste",
    });
    return reply(200, r);
  }

  if (!sameSecret(req.headers.get("x-push-secret") ?? "", Deno.env.get("PUSH_HOOK_SECRET") ?? "")) {
    return reply(401, { error: "Não autorizado." });
  }
  const rec = input.record ?? {};

  switch (input.type) {
    case "message": {
      const studentId = rec.student_id, senderId = rec.sender_id;
      const who = await names(db, [senderId]);
      const fromStudent = senderId === studentId;
      const to = fromStudent ? await mentors(db) : [studentId];
      const r = await deliver(
        db,
        to.filter((id) => id !== senderId),
        "chat",
        {
          title: fromStudent ? (who.get(senderId)?.name ?? "Aluno") : "Equipe Endo Evolution",
          body: clip(rec.body),
          url: fromStudent ? `/mensagens?aluno=${studentId}` : "/mensagens",
          tag: `chat-${studentId}`,
        },
        true,
      );
      return reply(200, r);
    }

    case "reply": {
      const { data: thread } = await db.from("threads").select("id, title, author_id").eq("id", rec.thread_id).single();
      if (!thread || thread.author_id === rec.author_id) return reply(200, { sent: 0 });
      const who = await names(db, [rec.author_id]);
      const author = who.get(rec.author_id);
      const r = await deliver(db, [thread.author_id], "forum", {
        title: author?.role === "mentor" ? "O mentor respondeu sua dúvida" : `${author?.name ?? "Alguém"} respondeu sua dúvida`,
        body: clip(`“${thread.title}”: ${rec.body}`),
        url: `/forum/${thread.id}`,
        tag: `forum-${thread.id}`,
      });
      return reply(200, r);
    }

    case "thread": {
      const who = await names(db, [rec.author_id]);
      if (who.get(rec.author_id)?.role === "mentor") return reply(200, { sent: 0 });
      const r = await deliver(db, await mentors(db), "forum", {
        title: `Nova dúvida de ${who.get(rec.author_id)?.name ?? "um aluno"}`,
        body: clip(rec.title),
        url: `/forum/${rec.id}`,
        tag: `forum-${rec.id}`,
      });
      return reply(200, r);
    }

    case "lesson": {
      const r = await deliver(db, await students(db), "lessons", {
        title: "Aula nova na plataforma",
        body: clip(rec.title),
        url: `/modulos/${rec.module_id}/aulas/${rec.id}`,
        tag: `aula-${rec.id}`,
      });
      return reply(200, r);
    }

    case "meetings": {
      const { data: due, error } = await db.rpc("push_due_meetings");
      if (error) return reply(500, { error: error.message });
      const everyone = [...(await students(db)), ...(await mentors(db))];
      const results = [];
      for (const m of (due ?? []) as { meeting_id: string; title: string; kind: string }[]) {
        results.push(
          await deliver(db, everyone, "meetings", {
            title: m.kind === "agora" ? "O encontro ao vivo está começando" : "Encontro ao vivo em 1 hora",
            body: clip(m.title),
            url: "/encontros",
            tag: `encontro-${m.meeting_id}`,
          }),
        );
      }
      return reply(200, { meetings: results.length, results });
    }

    default:
      return reply(400, { error: "Tipo desconhecido." });
  }
});
