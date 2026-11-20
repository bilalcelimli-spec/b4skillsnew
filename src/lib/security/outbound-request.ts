/**
 * Outbound HTTPS POST to a user-supplied URL (webhooks) without SSRF.
 *
 * A check on the URL text at registration is not enough: a public-looking host
 * can resolve to 10.x, 127.0.0.1 or a Render private-network service (Redis,
 * the app itself), and its DNS can change after registration. Here the
 * address actually connected to is checked:
 *  - IP-literal hosts are checked directly (Node does not call `lookup` for them);
 *  - named hosts go through `publicOnlyLookup`, which resolves every address
 *    and refuses the connection if any is non-public, inside the same socket
 *    connect — no gap between the check and the connection.
 * HTTPS only, no credentials in the URL, redirects are not followed, the
 * response body is read up to 500 characters.
 */
import https from "node:https";
import dns from "node:dns";
import net from "node:net";

const blocked = new net.BlockList();
for (const [prefix, bits] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16],
  ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15],
  ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
] as const) blocked.addSubnet(prefix, bits, "ipv4");
for (const [prefix, bits] of [
  ["::", 128], ["::1", 128], ["64:ff9b::", 96], ["100::", 64], ["2001:db8::", 32],
  ["fc00::", 7], ["fe80::", 10], ["ff00::", 8],
] as const) blocked.addSubnet(prefix, bits, "ipv6");

/** True for a globally routable unicast address. */
export function isPublicAddress(address: string): boolean {
  const family = net.isIP(address);
  if (family === 4) return !blocked.check(address, "ipv4");
  if (family === 6) {
    const mapped = address.toLowerCase().match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPublicAddress(mapped[1]);
    return !blocked.check(address, "ipv6");
  }
  return false;
}

export class OutboundAddressError extends Error {}

/** `dns.lookup` replacement that refuses hosts resolving to any non-public address. */
export function publicOnlyLookup(
  hostname: string,
  options: dns.LookupOptions,
  callback: (err: NodeJS.ErrnoException | null, address: string | dns.LookupAddress[], family?: number) => void,
): void {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, "");
    const list = addresses as dns.LookupAddress[];
    if (!list.length || list.some((entry) => !isPublicAddress(entry.address))) {
      return callback(new OutboundAddressError(`${hostname} resolves to a non-public address`) as NodeJS.ErrnoException, "");
    }
    if (options.all) return callback(null, list);
    callback(null, list[0].address, list[0].family);
  });
}

/** Parses and checks a URL for outbound delivery; throws OutboundAddressError when unusable. */
export function parseOutboundUrl(rawUrl: string): URL {
  let url: URL;
  try { url = new URL(rawUrl); } catch { throw new OutboundAddressError("Invalid URL"); }
  if (url.protocol !== "https:") throw new OutboundAddressError("Only https URLs are allowed");
  if (url.username || url.password) throw new OutboundAddressError("Credentials in URLs are not allowed");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(host) && !isPublicAddress(host)) throw new OutboundAddressError("Non-public address");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || !host.includes(".") && !net.isIP(host)) {
    throw new OutboundAddressError("Non-public host");
  }
  return url;
}

export interface OutboundResponse { status: number; body: string }

export function postToPublicHttps(
  rawUrl: string,
  init: { headers: Record<string, string>; body: string; timeoutMs: number },
): Promise<OutboundResponse> {
  return new Promise((resolve, reject) => {
    let url: URL;
    try { url = parseOutboundUrl(rawUrl); } catch (err) { reject(err); return; }
    const request = https.request(url, {
      method: "POST",
      headers: { ...init.headers, "Content-Length": Buffer.byteLength(init.body).toString() },
      lookup: publicOnlyLookup as unknown as typeof dns.lookup,
      timeout: init.timeoutMs,
    }, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk: string) => {
        if (body.length < 500) body += chunk;
        if (body.length >= 500) response.destroy();
      });
      const done = () => resolve({ status: response.statusCode ?? 0, body: body.slice(0, 500) });
      response.on("end", done);
      response.on("close", done);
    });
    request.on("timeout", () => request.destroy(new Error(`Timed out after ${init.timeoutMs} ms`)));
    request.on("error", reject);
    request.end(init.body);
  });
}
