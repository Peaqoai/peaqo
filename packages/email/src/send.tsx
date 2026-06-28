import { Resend } from "resend";
import { render } from "@react-email/render";
import { VerifyEmail } from "./verify-email";
import { TeamInvite } from "./team-invite";

const resend = new Resend(process.env.RESEND_API_KEY);
const from = process.env.EMAIL_FROM ?? "Peaqo <onboarding@resend.dev>";

export async function sendVerificationEmail({
  to,
  name,
  url,
}: {
  to: string;
  name: string;
  url: string;
}) {
  const html = await render(<VerifyEmail url={url} name={name} />);
  return resend.emails.send({ from, to, subject: "Verify your email", html });
}

export async function sendTeamInvite({
  to,
  orgName,
  url,
}: {
  to: string;
  orgName: string;
  url: string;
}) {
  const html = await render(<TeamInvite url={url} orgName={orgName} />);
  return resend.emails.send({
    from,
    to,
    subject: `Join ${orgName} on Peaqo`,
    html,
  });
}
