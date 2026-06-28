import { Html, Button, Text, Container } from "@react-email/components";

export function TeamInvite({ url, orgName }: { url: string; orgName: string }) {
  return (
    <Html>
      <Container>
        <Text>You&apos;ve been invited to join {orgName} on Peaqo.</Text>
        <Button href={url}>Accept invite</Button>
      </Container>
    </Html>
  );
}
