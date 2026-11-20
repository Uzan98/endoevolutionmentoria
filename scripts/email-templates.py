"""Modelos de e-mail do login (Supabase Auth) em português, com a identidade da Endo Evolution.

Gera os HTML em supabase/templates/ e, com --apply, envia para o projeto pela API de
gerenciamento (precisa de um token com acesso ao projeto no cabeçalho Authorization).

Uso:  python3 scripts/email-templates.py          (só gera os arquivos)
      python3 scripts/email-templates.py --apply  (gera e aplica no Supabase)
"""
import json, os, sys, urllib.request

REF = "gvqkdmbmuihcmpwikcgp"
SITE = "https://endoevolutionmentoria.vercel.app"


def button(label: str) -> str:
    return f"""<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px"><tr><td style="border-radius:999px;background:#126F65">
<a href="{{{{ .ConfirmationURL }}}}" style="display:inline-block;padding:15px 30px;border-radius:999px;color:#ffffff;font-weight:bold;font-size:16px;text-decoration:none">{label}</a>
</td></tr></table>
<p style="margin:18px 0 0;font-size:13px;line-height:1.5;color:#5B6765">Se o botão não funcionar, copie e cole este endereço no navegador:<br>
<a href="{{{{ .ConfirmationURL }}}}" style="color:#126F65;word-break:break-all">{{{{ .ConfirmationURL }}}}</a></p>"""


def layout(title: str, body: str, foot: str) -> str:
    return f"""<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{title}</title></head>
<body style="margin:0;padding:0;background:#F2F7F5;font-family:Arial,Helvetica,sans-serif;color:#252B2A">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F2F7F5;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;background:#ffffff;border-radius:22px;overflow:hidden">
<tr><td style="background:#073B38;padding:22px 28px">
<img src="{SITE}/icons/icon-192.png" width="40" height="40" alt="" style="border-radius:10px;vertical-align:middle;border:0">
<span style="color:#ffffff;font-size:18px;font-weight:bold;vertical-align:middle;padding-left:10px">Endo Evolution</span>
</td></tr>
<tr><td style="padding:34px 30px 30px;font-size:16px;line-height:1.6">
<h1 style="margin:0 0 14px;font-size:24px;line-height:1.25;color:#073B38">{title}</h1>
{body}
</td></tr>
<tr><td style="padding:18px 30px;background:#E3F5EF;font-size:12.5px;line-height:1.5;color:#3d4a48">{foot}</td></tr>
</table>
<p style="margin:16px 0 0;font-size:12px;color:#8A9593">Endo Evolution · Mentoria em Endodontia</p>
</td></tr></table>
</body></html>
"""


HELLO = "{{ if .Data.name }}Olá, {{ .Data.name }}!{{ else }}Olá!{{ end }}"
NOT_YOU = "Se você não fez esse pedido, pode ignorar este e-mail: nada muda na sua conta."

TEMPLATES = {
    "invite": (
        "Seu acesso à mentoria Endo Evolution",
        layout(
            "Bem-vindo(a) à mentoria",
            f"<p style=\"margin:0 0 12px\">{HELLO}</p>"
            "<p style=\"margin:0\">Seu acesso à área de membros da <b>Endo Evolution</b> está pronto. "
            "Crie sua senha para assistir às video-aulas, tirar dúvidas no fórum e acompanhar os encontros ao vivo.</p>"
            + button("Criar minha senha"),
            "O link vale por 24 horas. Se ele expirar, use “Esqueci minha senha” na tela de login com este mesmo e-mail.",
        ),
    ),
    "recovery": (
        "Redefinir sua senha · Endo Evolution",
        layout(
            "Redefinir sua senha",
            f"<p style=\"margin:0 0 12px\">{HELLO}</p>"
            "<p style=\"margin:0\">Recebemos um pedido para criar uma nova senha para a sua conta na Endo Evolution.</p>"
            + button("Criar nova senha"),
            "O link vale por 24 horas e só pode ser usado uma vez. " + NOT_YOU,
        ),
    ),
    "confirmation": (
        "Confirme seu e-mail · Endo Evolution",
        layout(
            "Confirme seu e-mail",
            f"<p style=\"margin:0 0 12px\">{HELLO}</p><p style=\"margin:0\">Confirme que este e-mail é seu para ativar o acesso à Endo Evolution.</p>"
            + button("Confirmar e-mail"),
            NOT_YOU,
        ),
    ),
    "magic_link": (
        "Seu link de acesso · Endo Evolution",
        layout(
            "Seu link de acesso",
            f"<p style=\"margin:0 0 12px\">{HELLO}</p><p style=\"margin:0\">Use o botão abaixo para entrar na área de membros.</p>" + button("Entrar na plataforma"),
            "O link vale por 24 horas e só pode ser usado uma vez. " + NOT_YOU,
        ),
    ),
    "email_change": (
        "Confirme seu novo e-mail · Endo Evolution",
        layout(
            "Confirme seu novo e-mail",
            f"<p style=\"margin:0 0 12px\">{HELLO}</p><p style=\"margin:0\">Recebemos um pedido para trocar o e-mail da sua conta de "
            "<b>{{ .Email }}</b> para <b>{{ .NewEmail }}</b>.</p>" + button("Confirmar novo e-mail"),
            NOT_YOU,
        ),
    ),
    "reauthentication": (
        "Seu código de verificação: {{ .Token }}",
        layout(
            "Código de verificação",
            "<p style=\"margin:0 0 18px\">Digite este código na plataforma para confirmar que é você:</p>"
            "<p style=\"margin:0;font-size:32px;letter-spacing:6px;font-weight:bold;color:#073B38\">{{ .Token }}</p>",
            NOT_YOU,
        ),
    ),
    "password_changed_notification": (
        "Sua senha foi alterada · Endo Evolution",
        layout(
            "Sua senha foi alterada",
            f"<p style=\"margin:0 0 12px\">{HELLO}</p><p style=\"margin:0\">A senha da sua conta na Endo Evolution acabou de ser alterada.</p>"
            f"<p style=\"margin:16px 0 0\">Se não foi você, use “Esqueci minha senha” em <a href=\"{SITE}/login\" style=\"color:#126F65\">{SITE.replace('https://', '')}/login</a> "
            "agora mesmo e avise a equipe da mentoria.</p>",
            "Este é um aviso automático de segurança.",
        ),
    ),
}

os.makedirs("supabase/templates", exist_ok=True)
for name, (subject, html) in TEMPLATES.items():
    with open(f"supabase/templates/{name}.html", "w") as f:
        f.write(html)
print(f"{len(TEMPLATES)} modelos gerados em supabase/templates/")

if "--apply" in sys.argv:
    body = {"mailer_otp_exp": 86400, "mailer_notifications_password_changed_enabled": True}
    for name, (subject, html) in TEMPLATES.items():
        body[f"mailer_subjects_{name}"] = subject
        body[f"mailer_templates_{name}_content"] = html
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{REF}/config/auth",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "Authorization": "Bearer " + os.environ.get("SUPABASE_ACCESS_TOKEN", "proxy-injected")},
        method="PATCH",
    )
    try:
        with urllib.request.urlopen(req) as r:
            d = json.loads(r.read())
        print("aplicado:", d.get("mailer_subjects_invite"), "|", d.get("mailer_subjects_recovery"), "| validade dos links:", d.get("mailer_otp_exp"), "s")
    except urllib.error.HTTPError as e:
        print("ERRO", e.code, e.read().decode()[:500])
        sys.exit(1)
