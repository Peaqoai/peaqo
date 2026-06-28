import { Html, Button, Text, Container } from "@react-email/components";

export function VerifyEmail({ url, name }: { url: string; name: string }) {
  return (
    <Html>
      <Container>
        <Text>Hi {name}, confirm your email to start using Peaqo.</Text>
        <Button href={url}>Verify email</Button>
      </Container>
    </Html>
  );
}
