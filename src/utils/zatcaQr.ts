// ZATCA Phase 1 (Fatoora) QR — TLV (Tag-Length-Value) → Base64
// Tags:
// 1: Seller name, 2: VAT registration number, 3: Timestamp (ISO 8601 UTC),
// 4: Invoice total (with VAT), 5: VAT total
// https://zatca.gov.sa/

const utf8Bytes = (s: string): Uint8Array => new TextEncoder().encode(s);

const tlv = (tag: number, value: string): Uint8Array => {
  const v = utf8Bytes(value);
  const out = new Uint8Array(2 + v.length);
  out[0] = tag;
  out[1] = v.length;
  out.set(v, 2);
  return out;
};

const concat = (chunks: Uint8Array[]): Uint8Array => {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
};

const toBase64 = (bytes: Uint8Array): string => {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  // Browser: btoa; SSR fallback: Buffer
  if (typeof btoa !== 'undefined') return btoa(bin);
  // @ts-ignore
  return Buffer.from(bytes).toString('base64');
};

export interface ZatcaQrInput {
  sellerName: string;
  vatNumber: string;
  timestamp: string | Date;
  invoiceTotal: number; // gross (with VAT)
  vatTotal: number;
}

export const buildZatcaQrBase64 = (input: ZatcaQrInput): string => {
  const ts = input.timestamp instanceof Date
    ? input.timestamp.toISOString()
    : new Date(input.timestamp).toISOString();
  const bytes = concat([
    tlv(1, input.sellerName || 'Hiwaya Platform'),
    tlv(2, input.vatNumber || '000000000000000'),
    tlv(3, ts),
    tlv(4, Number(input.invoiceTotal || 0).toFixed(2)),
    tlv(5, Number(input.vatTotal || 0).toFixed(2)),
  ]);
  return toBase64(bytes);
};
