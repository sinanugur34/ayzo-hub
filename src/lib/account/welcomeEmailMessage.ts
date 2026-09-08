export const WELCOME_EMAIL_SUBJECT =
  "Welcome to AYZO";

export const WELCOME_EMAIL_APP_URL =
  "https://app.ayzo.io";

export function buildWelcomeEmailMessage() {
  const text = [
    "Welcome to AYZO",
    "",
    "Your AYZO account is ready.",
    "",
    "Investigate on-chain activity across supported networks, save important research, and organize monitored wallets and tokens.",
    "",
    `Open AYZO: ${WELCOME_EMAIL_APP_URL}`,
    "",
    "AYZO provides evidence-first on-chain intelligence and does not provide financial advice.",
  ].join("\n");

  const html = `
<!doctype html>
<html lang="en">
  <body style="margin:0;background:#050506;color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:600px;margin:0 auto;padding:48px 24px;">
      <div style="font-size:12px;letter-spacing:0.18em;color:#a78bfa;font-weight:700;">
        AYZO
      </div>

      <h1 style="margin:18px 0 0;font-size:30px;line-height:1.2;color:#ffffff;">
        Your AYZO account is ready.
      </h1>

      <p style="margin:18px 0 0;font-size:15px;line-height:1.7;color:#a1a1aa;">
        Investigate on-chain activity across supported networks,
        save important research, and organize monitored wallets and tokens.
      </p>

      <div style="margin-top:30px;">
        <a
          href="${WELCOME_EMAIL_APP_URL}"
          style="display:inline-block;background:#ffffff;color:#09090b;text-decoration:none;font-size:14px;font-weight:700;padding:13px 20px;border-radius:10px;"
        >
          Open AYZO
        </a>
      </div>

      <p style="margin:34px 0 0;font-size:11px;line-height:1.6;color:#52525b;">
        AYZO provides evidence-first on-chain intelligence and does not provide financial advice.
      </p>
    </div>
  </body>
</html>
`.trim();

  return {
    subject:
      WELCOME_EMAIL_SUBJECT,

    text,

    html,
  };
}
