// Shared CSV helpers for the Call List importer. Pure functions with no server
// or client imports, so both the client-side scan/preview wizard and the
// server action can use exactly the same parsing + column detection.

export type CsvField =
  | "businessName"
  | "phone"
  | "email"
  | "website"
  | "address"
  | "city"
  | "state"
  | "zip"
  | "ownerName"
  | "industry";

export const CSV_FIELDS: { key: CsvField; label: string; required?: boolean }[] = [
  { key: "businessName", label: "Business name", required: true },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "website", label: "Website" },
  { key: "address", label: "Address / location" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "zip", label: "ZIP" },
  { key: "ownerName", label: "Contact name" },
  { key: "industry", label: "Industry" },
];

export type ImportRow = {
  businessName: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  ownerName?: string;
  industry?: string;
};

// Header aliases, roughly widest → most specific. Matched case-insensitively,
// first exact then as a substring, so "Business Phone" still maps to phone.
const ALIASES: Record<CsvField, string[]> = {
  businessName: ["business name", "company name", "business", "company", "account name", "account", "name", "title", "place", "organization", "org", "dba"],
  ownerName: ["contact name", "owner name", "full name", "point of contact", "contact person", "contact", "owner", "poc", "rep", "manager"],
  phone: ["phone number", "phone_number", "phonenumber", "contact number", "telephone", "phone", "mobile", "cell", "tel", "number"],
  email: ["email address", "e-mail", "email", "mail"],
  website: ["website url", "web address", "website", "url", "domain", "homepage", "site", "web"],
  address: ["street address", "full address", "mailing address", "address line 1", "address1", "address", "street", "location", "addr"],
  city: ["city", "town", "municipality", "locality"],
  state: ["state/province", "state", "province", "region"],
  zip: ["zip code", "zipcode", "postal code", "postcode", "zip", "postal"],
  industry: ["business type", "category name", "categoryname", "industry", "category", "vertical", "niche", "type"],
};

const US_STATES = new Set([
  "al","ak","az","ar","ca","co","ct","de","fl","ga","hi","id","il","in","ia","ks","ky","la","me","md","ma","mi","mn","ms","mo","mt","ne","nv","nh","nj","nm","ny","nc","nd","oh","ok","or","pa","ri","sc","sd","tn","tx","ut","vt","va","wa","wv","wi","wy","dc",
  "alabama","alaska","arizona","arkansas","california","colorado","connecticut","delaware","florida","georgia","hawaii","idaho","illinois","indiana","iowa","kansas","kentucky","louisiana","maine","maryland","massachusetts","michigan","minnesota","mississippi","missouri","montana","nebraska","nevada","new hampshire","new jersey","new mexico","new york","north carolina","north dakota","ohio","oklahoma","oregon","pennsylvania","rhode island","south carolina","south dakota","tennessee","texas","utah","vermont","virginia","washington","west virginia","wisconsin","wyoming","district of columbia",
]);

function looksLikePhone(v: string) {
  const digits = v.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15 && /^[\d\s().+\-x]+$/i.test(v);
}
function looksLikeEmail(v: string) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
}
function looksLikeUrl(v: string) {
  return /^(https?:\/\/)?([\w-]+\.)+[a-z]{2,}(\/.*)?$/i.test(v) && !looksLikeEmail(v);
}
function looksLikeZip(v: string) {
  return /^\d{5}(-\d{4})?$/.test(v);
}
function looksLikeState(v: string) {
  return US_STATES.has(v.trim().toLowerCase());
}

/**
 * RFC-4180-ish CSV parser: handles quoted fields, embedded commas/newlines, and
 * escaped double-quotes. Returns rows of raw string cells (blank rows dropped).
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const chars = text.replace(/^﻿/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (inQuotes) {
      if (c === '"') {
        if (chars[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim().length > 0));
}

/**
 * Auto-detects which column feeds each CRM field. Three passes:
 *   1. exact header-alias match, 2. substring header match, then
 *   3. content sniffing (phone/email/website/zip/state by value shape, and a
 *      text-heavy fallback for the business name) over any still-unmapped column.
 * Returns a column index per field, or -1 when nothing fit.
 */
export function detectColumns(headers: string[], dataRows: string[][]): Record<CsvField, number> {
  const norm = headers.map((h) => h.trim().toLowerCase());
  const map: Partial<Record<CsvField, number>> = {};
  const used = new Set<number>();

  // 1. exact alias
  for (const { key } of CSV_FIELDS) {
    const idx = norm.findIndex((h, i) => !used.has(i) && ALIASES[key].includes(h));
    if (idx !== -1) {
      map[key] = idx;
      used.add(idx);
    }
  }
  // 2. substring alias (e.g. "business phone" contains "phone")
  for (const { key } of CSV_FIELDS) {
    if (map[key] !== undefined) continue;
    const idx = norm.findIndex((h, i) => !used.has(i) && h.length > 0 && ALIASES[key].some((a) => h.includes(a)));
    if (idx !== -1) {
      map[key] = idx;
      used.add(idx);
    }
  }

  // 3. content sniffing over unmapped columns
  const values = (i: number) => dataRows.map((r) => (r[i] ?? "").trim()).filter(Boolean);
  const frac = (vals: string[], pred: (v: string) => boolean) => (vals.length ? vals.filter(pred).length / vals.length : 0);

  for (let i = 0; i < headers.length; i++) {
    if (used.has(i)) continue;
    const vals = values(i);
    if (vals.length === 0) continue;
    if (map.email === undefined && frac(vals, looksLikeEmail) > 0.6) { map.email = i; used.add(i); continue; }
    if (map.phone === undefined && frac(vals, looksLikePhone) > 0.6) { map.phone = i; used.add(i); continue; }
    if (map.website === undefined && frac(vals, looksLikeUrl) > 0.6) { map.website = i; used.add(i); continue; }
    if (map.zip === undefined && frac(vals, looksLikeZip) > 0.7) { map.zip = i; used.add(i); continue; }
    if (map.state === undefined && frac(vals, looksLikeState) > 0.7) { map.state = i; used.add(i); continue; }
  }

  // 4. business-name fallback: first unused, mostly-text column
  if (map.businessName === undefined) {
    for (let i = 0; i < headers.length; i++) {
      if (used.has(i)) continue;
      const vals = values(i);
      if (vals.length === 0) continue;
      const textish = frac(vals, (v) => /[a-z]/i.test(v) && !looksLikePhone(v) && !looksLikeEmail(v) && !looksLikeUrl(v));
      if (textish > 0.6) {
        map.businessName = i;
        used.add(i);
        break;
      }
    }
  }

  const result = {} as Record<CsvField, number>;
  for (const { key } of CSV_FIELDS) result[key] = map[key] ?? -1;
  return result;
}

/** Applies a column mapping to the data rows, producing normalized import rows
 *  (only rows with a non-empty business name are kept). */
export function rowsFromMapping(dataRows: string[][], mapping: Record<CsvField, number>): ImportRow[] {
  const cell = (row: string[], idx: number) => (idx >= 0 ? (row[idx] ?? "").trim() : "");
  const out: ImportRow[] = [];
  for (const row of dataRows) {
    const businessName = cell(row, mapping.businessName);
    if (!businessName) continue;
    const r: ImportRow = { businessName };
    for (const { key } of CSV_FIELDS) {
      if (key === "businessName") continue;
      const v = cell(row, mapping[key]);
      if (v) r[key] = v;
    }
    out.push(r);
  }
  return out;
}
