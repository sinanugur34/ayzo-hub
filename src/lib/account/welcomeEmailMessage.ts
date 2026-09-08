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
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
    <title>${WELCOME_EMAIL_SUBJECT}</title>
  </head>
  <body
    style="
      margin:0;
      padding:0;
      width:100%;
      background-color:#050506;
      color:#f4f4f5;
      font-family:Arial,Helvetica,sans-serif;
      -webkit-text-size-adjust:100%;
      -ms-text-size-adjust:100%;
    "
  >
    <table
      role="presentation"
      width="100%"
      cellspacing="0"
      cellpadding="0"
      border="0"
      style="
        width:100%;
        margin:0;
        padding:0;
        background-color:#050506;
        border-collapse:collapse;
      "
    >
      <tr>
        <td align="center" style="padding:0;margin:0;">
          <table
            role="presentation"
            width="100%"
            cellspacing="0"
            cellpadding="0"
            border="0"
            style="
              width:100%;
              max-width:600px;
              border-collapse:collapse;
            "
          >
            <tr>
              <td style="padding:48px 24px 52px 24px;">
                <table
                  role="presentation"
                  width="100%"
                  cellspacing="0"
                  cellpadding="0"
                  border="0"
                  style="width:100%;border-collapse:collapse;"
                >
                  <tr>
                    <td
                      style="
                        font-size:12px;
                        line-height:18px;
                        letter-spacing:0.18em;
                        color:#a78bfa;
                        font-weight:700;
                      "
                    >
                      AYZO
                    </td>
                  </tr>

                  <tr>
                    <td
                      style="
                        padding-top:18px;
                        font-size:30px;
                        line-height:36px;
                        color:#ffffff;
                        font-weight:700;
                      "
                    >
                      Your AYZO account is ready.
                    </td>
                  </tr>

                  <tr>
                    <td
                      style="
                        padding-top:18px;
                        font-size:15px;
                        line-height:26px;
                        color:#a1a1aa;
                      "
                    >
                      Investigate on-chain activity across supported networks,
                      save important research, and organize monitored wallets and tokens.
                    </td>
                  </tr>

                  <tr>
                    <td style="padding-top:30px;">
                      <table
                        role="presentation"
                        cellspacing="0"
                        cellpadding="0"
                        border="0"
                        style="border-collapse:separate;"
                      >
                        <tr>
                          <td
                            align="center"
                            bgcolor="#ffffff"
                            style="
                              border-radius:10px;
                              background-color:#ffffff;
                            "
                          >
                            <a
                              href="${WELCOME_EMAIL_APP_URL}"
                              target="_blank"
                              rel="noopener noreferrer"
                              style="
                                display:inline-block;
                                padding:13px 20px;
                                border:1px solid #ffffff;
                                border-radius:10px;
                                color:#09090b;
                                background-color:#ffffff;
                                text-decoration:none;
                                font-size:14px;
                                line-height:20px;
                                font-weight:700;
                              "
                            >
                              Open AYZO
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <tr>
                    <td
                      style="
                        padding-top:34px;
                        font-size:11px;
                        line-height:18px;
                        color:#52525b;
                      "
                    >
                      AYZO provides evidence-first on-chain intelligence and does not provide financial advice.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
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
