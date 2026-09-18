function getSecret(): string {
  const secret = process.env.TURNSTILE_SECRET;
  if (!secret) {
    throw new Error('TURNSTILE_SECRET is not set');
  }
  return secret;
}

const secret = getSecret();

export async function verifyTurnstileToken(token: string, ip: string | undefined): Promise<boolean> {
  let formData = new FormData();
  formData.append('secret', secret);
  formData.append('response', token);
  if (ip) formData.append('remoteip', ip);

  const url = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
  const res = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  const outcome = await res.json() as { success: boolean };
  return outcome.success;
}
