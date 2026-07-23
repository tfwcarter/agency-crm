import tls from "node:tls";

export interface SslIntel {
  valid: boolean;
  issuer: string | null;
  validTo: Date | null;
  daysUntilExpiry: number | null;
  selfSigned: boolean;
}

const NO_SSL: SslIntel = { valid: false, issuer: null, validTo: null, daysUntilExpiry: null, selfSigned: false };

function extractHost(rawUrl: string): string | null {
  try {
    const url = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/**
 * Connects directly via Node's tls module to read the live certificate — real
 * expiry/issuer data, no third-party API or key involved.
 */
export function inspectSsl(websiteUrl: string, timeoutMs = 6000): Promise<SslIntel> {
  const host = extractHost(websiteUrl);
  if (!host) return Promise.resolve(NO_SSL);

  return new Promise((resolve) => {
    const socket = tls.connect({ host, port: 443, servername: host, timeout: timeoutMs, rejectUnauthorized: false }, () => {
      const cert = socket.getPeerCertificate();
      const authorized = socket.authorized;
      if (!cert || Object.keys(cert).length === 0) {
        resolve(NO_SSL);
      } else {
        const validTo = cert.valid_to ? new Date(cert.valid_to) : null;
        const daysUntilExpiry = validTo ? Math.round((validTo.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
        const issuerName = cert.issuer?.O ?? cert.issuer?.CN;
        resolve({
          valid: authorized,
          issuer: Array.isArray(issuerName) ? (issuerName[0] ?? null) : (issuerName ?? null),
          validTo,
          daysUntilExpiry,
          selfSigned: cert.issuer?.CN === cert.subject?.CN,
        });
      }
      socket.end();
    });

    socket.on("error", () => resolve(NO_SSL));
    socket.on("timeout", () => {
      socket.destroy();
      resolve(NO_SSL);
    });
  });
}
