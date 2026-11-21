# Plano: vendas com Stripe na Endo Evolution

Objetivo: o dentista paga (cartão, Pix ou boleto), recebe o convite por e-mail na hora, cria a senha e entra.
Reembolso ou contestação removem o acesso sozinhos. Nada de liberar aluno à mão.

Legenda: ✅ confirmado · ⚠️ confirmar com a Stripe ou com o cliente antes de implementar.

---

## 0. Decisões do cliente (antes de qualquer código)

| Decisão | Opções | Sugestão |
|---|---|---|
| Preço da mentoria | — | definir |
| Formas de pagamento | cartão, Pix, boleto | cartão + Pix (boleto só se o público pedir) |
| Parcelamento no cartão | até 6x, 10x, 12x; juros pagos pelo cliente ou pelo aluno | ⚠️ confirmar se a conta Stripe Brasil oferece parcelamento no Checkout |
| Desconto no Pix | ex.: 5% à vista | sim: dois botões ("Pix à vista" e "Cartão") |
| Duração do acesso | 6, 12 meses, vitalício | 12 meses |
| Renovação | preço cheio ou com desconto | preço de renovação com desconto |
| Venda contínua ou por turma | sempre aberta / abre e fecha | começar sempre aberta; turma vira opção depois |
| Cupons | sim/não | sim (códigos promocionais da Stripe) |
| Reembolso | 7 dias (obrigatório por lei, CDC art. 49) ou mais | 7 dias |
| Nota fiscal | contador emite / integração automática | ⚠️ ver seção 8 |

## 1. Pré-requisitos (bloqueiam o lançamento)

1. **Conta Stripe no CNPJ do cliente**, ativada (documentos, conta bancária). Pode levar alguns dias.
2. **Pix ativado na conta.** ⚠️ Para empresas no Brasil, a Stripe informa que o Pix é "por convite": pedir no painel ou ao suporte logo no início.
3. **Domínio próprio + e-mail verificado no Resend.** **Bloqueador:** hoje o remetente provisório `onboarding@resend.dev` só entrega para o dono da conta Resend. Sem isso, o aluno paga e não recebe o convite.
4. **Termos de uso e política de privacidade** publicados (LGPD; dados ficam nos EUA), com a política de reembolso.
5. **Vídeos protegidos** (Panda Video ou Vimeo com restrição de domínio). Sem isso, o link do vídeo pago circula de graça.
6. Este ambiente de desenvolvimento precisa acessar a Stripe: liberar `api.stripe.com` (e `checkout.stripe.com` para os testes automáticos) e cadastrar a **chave de teste** como segredo, nunca no código.

## 2. Arquitetura

```
Página de vendas (/inscricao)
   │  botão "Comprar"
   ▼
Edge Function criar-checkout  ──► Stripe Checkout (página da Stripe, em português)
                                      │ cartão aprovado na hora / Pix e boleto depois
                                      ▼
                          Stripe envia evento (webhook)
                                      ▼
Edge Function stripe-webhook (confere assinatura, registra o evento uma vez só)
   ├─ pago ──► cria/encontra a conta ─► convite por e-mail ─► matrícula ativa até a data X
   ├─ Pix/boleto vencido ─► marca como expirado
   ├─ reembolso total ─► matrícula cancelada (acesso some)
   └─ contestação ─► suspende; se o cliente ganhar, reativa
```

- **Stripe Checkout (hospedado)**: a Stripe cuida do formulário de cartão, 3D Secure, QR Code do Pix e do boleto. Sem dados de cartão no nosso site.
- **Chave secreta só nas Edge Functions** (segredos do Supabase). Usar **chave restrita** com o mínimo de permissões.
- **Preço sempre definido no servidor** (tabela `offers` + preço cadastrado na Stripe). O navegador só envia "qual oferta".

## 3. Banco de dados (migração nova)

- `offers`: id, nome, `stripe_price_id`, valor (centavos), forma (`pix` | `card` | `boleto`), `access_days`, ativa.
- `enrollments` (matrículas): user_id, offer_id, status (`pending` | `active` | `expired` | `refunded` | `disputed` | `canceled`), `starts_at`, `ends_at`, sessão e pagamento da Stripe, valor pago, forma, origem (`stripe` | `manual`).
- `stripe_events`: id do evento (chave primária), tipo, recebido em. **Garante que cada evento é processado uma vez só** (a Stripe reenvia).
- `private.has_access(uid)`: mentor **ou** matrícula ativa com `ends_at > now()`.
- **Regras (RLS) passam a exigir acesso** para: aulas (vídeo e materiais), encontros (link da sala), fórum e chat. A vitrine de módulos continua pública. O perfil continua sempre acessível (para renovar).
- **Migração dos alunos atuais**: matrícula `manual` para quem já está na plataforma, para ninguém perder acesso no dia da troca.

## 4. Edge Functions

### `criar-checkout`
- Entrada: `offer_id` (e e-mail, se o aluno estiver logado, para renovação).
- Cria a Checkout Session: `mode: payment`, moeda BRL, `locale: pt-BR`, forma de pagamento da oferta, `customer_creation: always`, coleta de CPF ⚠️ (obrigatório no boleto; útil para nota fiscal), aceite dos termos (`consent_collection`), códigos promocionais, validade do Pix ⚠️ (ex.: 1 hora) e do boleto (ex.: 3 dias).
- Retorno: URL do Checkout. Sucesso volta para `/compra/concluida?session_id=...` e cancelamento para `/inscricao`.
- Proteções: só ofertas ativas; limite simples de chamadas por IP.

### `stripe-webhook`
- Confere a assinatura (segredo do webhook) **antes** de qualquer coisa; rejeita o resto.
- Grava o `event.id` em `stripe_events`; se já existe, responde 200 e não faz nada.
- Eventos tratados:
  - `checkout.session.completed`: se `payment_status = paid` (cartão), libera. Se `unpaid` (Pix/boleto), cria matrícula `pending`.
  - `checkout.session.async_payment_succeeded` ✅: Pix/boleto pago, libera.
  - `checkout.session.async_payment_failed` / `checkout.session.expired`: matrícula `expired`.
  - `charge.refunded`: reembolso total cancela o acesso; parcial só registra.
  - `charge.dispute.created`: suspende. `charge.dispute.closed`: se ganhou, reativa.
- **Liberar acesso**: confere valor e moeda contra a oferta; procura a conta pelo e-mail; se não existe, `inviteUserByEmail` (o mesmo convite que já usamos); se existe (renovação), estende `ends_at` a partir da data maior entre hoje e o fim atual.
- Responde rápido (a Stripe espera 2xx); erros retornam 500 para a Stripe tentar de novo (ela tenta por até 3 dias).

### `status-compra`
- A página de "compra concluída" consulta o status pela `session_id`: "Pagamento confirmado: enviamos o convite para seu e-mail" ou "Aguardando a confirmação do Pix/boleto".

## 5. Telas

- **`/inscricao`** (pública): o que a mentoria inclui, módulos (já vêm do banco), preço, botões "Pagar com Pix" e "Cartão em até Nx", perguntas frequentes, política de reembolso. Link a partir do login ("Ainda não é aluno?").
- **`/compra/concluida`**: confirmação e próximos passos (abrir o e-mail, criar a senha, instalar o app).
- **Acesso vencido**: em vez das aulas, a tela "Seu acesso terminou em dd/mm" com o botão "Renovar".
- **Painel do mentor → Vendas**: lista de matrículas (aluno, valor, forma, status, data, link para o pagamento na Stripe), totais do mês, e as ações: reenviar convite, liberar acesso manual (cortesia), estender, revogar.
- **Meu perfil**: "Seu acesso vai até dd/mm" + renovar.

## 6. Testes (no modo de teste da Stripe, antes de cobrar de verdade)

| Cenário | Esperado |
|---|---|
| Cartão aprovado | convite em até 1 min; acesso por N dias |
| Cartão recusado / 3D Secure falha | nada liberado; mensagem clara |
| 3D Secure aprovado | liberado |
| Pix pago | liberado no evento assíncrono |
| Pix não pago (expira) | matrícula expirada; nada liberado |
| Boleto pago / vencido | idem ao Pix |
| Evento repetido ou fora de ordem | processa uma vez só; estado final correto |
| Webhook fora do ar e depois volta | a Stripe reenvia; libera ao voltar |
| Assinatura do webhook inválida | recusado (400) |
| Valor alterado / oferta inativa | recusado |
| Aluno que já tem conta compra de novo | sem conta duplicada; acesso estendido |
| Reembolso total | acesso removido; aula some na hora |
| Contestação aberta / ganha | suspende / reativa |
| Acesso vence | tela de renovação; vídeo bloqueado também pela API |
| Aluno sem matrícula tenta ler aula pela API | bloqueado pelo banco (RLS) |
| Mentor | sempre com acesso |

Os testes automáticos rodam com cartões de teste, Pix e boleto de teste e eventos disparados pela Stripe.

## 7. Lançamento (checklist)

1. Conta ativada, Pix aprovado, domínio e e-mail verificados, termos publicados.
2. Ofertas e preços criados no **modo real**; IDs na tabela `offers`.
3. Chave real (restrita) e segredo do webhook real nos segredos do Supabase; webhook real apontando para `stripe-webhook`.
4. Recibos da Stripe ligados, em português, com a marca do cliente.
5. **Compra real de R$ 1** (oferta oculta) com cartão e Pix, seguida de reembolso, para confirmar que libera e remove.
6. Remover as contas de demonstração (`supabase/remove-demo.sql`) e desligar `VITE_DEMO_LOGIN`.
7. Avisar os alunos atuais (já com matrícula manual).

## 8. Fora do código, mas essencial

- **Nota fiscal**: ⚠️ a Stripe não emite NFS-e brasileira (confirmar). Opções: o contador emite a partir do relatório de vendas da Stripe, ou integração automática (NFE.io, eNotas etc.) disparada pelo mesmo webhook, numa fase 2.
- **Taxas**: ⚠️ pegar a tabela oficial na conta do cliente. Valores vistos em fontes de terceiros: cartão nacional ~3,99% + R$ 0,39; Pix ~1,19%. Parcelamento e antecipação mudam o custo.
- **Prazo de recebimento**: ⚠️ ver no painel da Stripe Brasil (afeta o caixa do cliente).
- **Fraude**: Radar (antifraude da Stripe) vem ligado; revisar as regras depois das primeiras vendas.

## 9. Ordem de execução e prazo

| Etapa | Quem | Prazo |
|---|---|---|
| Decisões da seção 0 | cliente | 1 reunião |
| Conta Stripe + pedido do Pix + domínio/Resend + termos | cliente (com nosso guia) | 3–10 dias (aprovação da Stripe) |
| Banco, funções, telas e testes no modo de teste | nós | 2–3 dias de trabalho, em paralelo |
| Ensaio completo com o cliente (compra de teste) | nós + cliente | 1 dia |
| Lançamento (seção 7) | nós | 1 dia |
