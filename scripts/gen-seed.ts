// Gera supabase/seed.sql a partir do conteúdo de demonstração (src/data/*.ts).
// Uso: npm run seed:gen
import { writeFileSync } from "node:fs";
import { seedCompleted, seedMeetings, seedModules, seedNotes, seedUsers } from "../src/data/seed";
import { seedForum } from "../src/data/forum";
import { seedChat } from "../src/data/chat";

const q = (v: string | null | undefined) => (v == null ? "null" : `'${String(v).replace(/'/g, "''")}'`);
// ids fixos para as contas de demonstração
const uuid: Record<string, string> = {};
seedUsers.forEach((u, i) => (uuid[u.id] = `00000000-0000-4000-a000-${String(i + 1).padStart(12, "0")}`));
const U = (id: string) => q(uuid[id]);

const out: string[] = [
  "-- Conteúdo e contas de DEMONSTRAÇÃO. Gerado por scripts/gen-seed.ts; não edite à mão.",
  "-- Para remover as contas de demonstração depois: supabase/remove-demo.sql",
  "begin;",
];

// contas (senha demo123)
for (const u of seedUsers) {
  out.push(`insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
values ('00000000-0000-0000-0000-000000000000', ${U(u.id)}, 'authenticated', 'authenticated', ${q(u.email)}, extensions.crypt(${q(u.password ?? "demo123")}, extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', ${q(JSON.stringify({ name: u.name, city: u.city ?? null }))}, now(), now(), '', '', '', '')
on conflict (id) do nothing;`);
  out.push(`insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (gen_random_uuid(), ${U(u.id)}, ${U(u.id)}, ${q(JSON.stringify({ sub: uuid[u.id], email: u.email, email_verified: true }))}, 'email', now(), now(), now())
on conflict do nothing;`);
  out.push(`update public.profiles set name = ${q(u.name)}, role = ${q(u.role)}, genero = ${q(u.genero)}, city = ${q(u.city)}, joined_at = ${q(u.joinedAt)} where id = ${U(u.id)};`);
}

// módulos e aulas
seedModules.forEach((m, mi) => {
  out.push(`insert into public.modules (id, title, description, position) values (${q(m.id)}, ${q(m.title)}, ${q(m.description)}, ${mi}) on conflict (id) do nothing;`);
  m.lessons.forEach((l, li) =>
    out.push(
      `insert into public.lessons (id, module_id, title, description, duration_min, video_url, materials, position) values (${q(l.id)}, ${q(m.id)}, ${q(l.title)}, ${q(l.description)}, ${l.durationMin}, ${q(l.videoUrl)}, ${q(JSON.stringify(l.materials))}::jsonb, ${li}) on conflict (id) do nothing;`,
    ),
  );
});

// encontros
for (const m of seedMeetings)
  out.push(`insert into public.meetings (id, title, starts_at, duration_min, link) values (${q(m.id)}, ${q(m.title)}, ${q(m.startsAt)}, ${m.durationMin}, ${q(m.link)}) on conflict (id) do nothing;`);

// progresso, última aula e anotações
for (const [user, ids] of Object.entries(seedCompleted))
  ids.forEach((id, i) =>
    out.push(`insert into public.progress (user_id, lesson_id, completed_at) values (${U(user)}, ${q(id)}, now() - interval '${ids.length - i} days') on conflict do nothing;`),
  );
out.push(`update public.profiles set last_lesson_id = 'aula-9' where id = ${U("u-camila")};`);
for (const [user, notes] of Object.entries(seedNotes))
  for (const [lesson, body] of Object.entries(notes))
    out.push(`insert into public.notes (user_id, lesson_id, body) values (${U(user)}, ${q(lesson)}, ${q(body)}) on conflict do nothing;`);

// fórum
const { threads, replies } = seedForum();
for (const t of threads)
  out.push(
    `insert into public.threads (id, title, body, author_id, module_id, lesson_id, created_at) values (${q(t.id)}, ${q(t.title)}, ${q(t.body)}, ${U(t.authorId)}, ${q(t.moduleId)}, ${q(t.lessonId)}, ${q(t.createdAt)}) on conflict (id) do nothing;`,
  );
for (const r of replies)
  out.push(`insert into public.replies (id, thread_id, author_id, body, created_at) values (${q(r.id)}, ${q(r.threadId)}, ${U(r.authorId)}, ${q(r.body)}, ${q(r.createdAt)}) on conflict (id) do nothing;`);
for (const t of threads) {
  if (t.solutionId) out.push(`update public.threads set solution_id = ${q(t.solutionId)} where id = ${q(t.id)};`);
  for (const v of t.votes) out.push(`insert into public.thread_votes (thread_id, user_id) values (${q(t.id)}, ${U(v)}) on conflict do nothing;`);
}
for (const r of replies) for (const v of r.votes) out.push(`insert into public.reply_votes (reply_id, user_id) values (${q(r.id)}, ${U(v)}) on conflict do nothing;`);

// chat com o mentor (conversas de exemplo, com datas passadas; ids fixos para não duplicar)
seedChat.forEach((m, i) =>
  out.push(
    `insert into public.messages (id, student_id, sender_id, body, created_at) values ('00000000-0000-4000-b000-${String(i + 1).padStart(12, "0")}', ${U(m.studentId)}, ${U(m.senderId)}, ${q(m.body)}, now() - interval '${Math.round(m.hoursAgo * 60)} minutes') on conflict (id) do nothing;`,
  ),
);
// a aluna e o mentor já leram a conversa da Camila; a mensagem do Rafael está sem resposta
out.push(
  `insert into public.chat_reads (user_id, student_id, last_read_at) values (${U("u-camila")}, ${U("u-camila")}, now() - interval '25 hours'), (${U("u-mentor")}, ${U("u-camila")}, now() - interval '25 hours'), (${U("u-mentor")}, ${U("u-juliana")}, now() - interval '49 hours'), (${U("u-juliana")}, ${U("u-juliana")}, now() - interval '48 hours') on conflict (user_id, student_id) do update set last_read_at = excluded.last_read_at;`,
);

out.push("commit;");
writeFileSync("supabase/seed.sql", out.join("\n") + "\n");

// remoção das contas de demonstração (mantém módulos e aulas)
writeFileSync(
  "supabase/remove-demo.sql",
  [
    "-- Remove as contas de demonstração e tudo o que elas criaram (progresso, anotações, dúvidas).",
    "-- Módulos, aulas e encontros continuam. Rode antes de liberar para alunos reais.",
    `delete from auth.users where id in (${seedUsers.map((u) => U(u.id)).join(", ")});`,
    "",
  ].join("\n"),
);
// volta os dados das contas de demonstração ao estado inicial (para testes e antes de apresentar)
const demoIds = seedUsers.map((u) => U(u.id)).join(", ");
writeFileSync(
  "supabase/reset-demo-data.sql",
  [
    "-- Desfaz o que as contas de DEMONSTRAÇÃO fizeram (progresso, anotações, fórum, chat) e reaplica o seed.",
    "-- Não toca em contas reais nem no conteúdo (módulos e aulas).",
    "begin;",
    `delete from public.threads where author_id in (${demoIds});`,
    `delete from public.replies where author_id in (${demoIds});`,
    `delete from public.thread_votes where user_id in (${demoIds});`,
    `delete from public.reply_votes where user_id in (${demoIds});`,
    `delete from public.progress where user_id in (${demoIds});`,
    `delete from public.notes where user_id in (${demoIds});`,
    `delete from public.messages where student_id in (${demoIds});`,
    `delete from public.chat_reads where user_id in (${demoIds}) or student_id in (${demoIds});`,
    `update public.profiles set last_lesson_id = null where id in (${demoIds});`,
    "commit;",
    "",
  ].join("\n") + out.join("\n") + "\n",
);
console.log(`seed.sql: ${out.length} comandos`);
