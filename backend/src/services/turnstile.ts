function getSecret(): string {
  const secret = process.env.TURNSTILE_SECRET;
  if (!secret) {
    throw new Error('TURNSTILE_SECRET is not set');
  }
  return secret;
}

const secret = getSecret();

const SITEVERIFY_TIMEOUT_MS = 5_000;

export async function verifyTurnstileToken(token: string, ip: string | undefined): Promise<boolean> {
  const formData = new FormData();
  formData.append('secret', secret);
  formData.append('response', token);
  if (ip) formData.append('remoteip', ip);

  try {
    const url = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
    const res = await fetch(url, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(SITEVERIFY_TIMEOUT_MS),
    });
    if (!res.ok) return false;

    const outcome = (await res.json()) as { success: boolean };
    return outcome.success;
  } catch {
    return false;
  }
}
