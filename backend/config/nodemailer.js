// config/nodemailer.js
// Sends mail through Brevo's HTTPS API (port 443) instead of SMTP,
// because free Render services block outbound SMTP ports.
// Exposes the same sendMail({ from, to, subject, html }) shape the controllers already use.

const transporter = {
  async sendMail({ from, to, subject, html }) {
    if (!process.env.BREVO_API_KEY) {
      throw new Error("BREVO_API_KEY is not set");
    }

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": process.env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { name: "Instagram Clone", email: from },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || `Brevo API error ${response.status}`);
    }

    return data;
  },
};

export default transporter;