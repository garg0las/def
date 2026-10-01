#!/usr/bin/env node

// Builds assets/data/newsletter.json from the EmailOctopus campaigns API.
//
// Run by .github/workflows/newsletter-archive.yml on a schedule. The API key
// stays in GitHub Secrets and never reaches the browser: the site only ever
// reads the JSON file this script writes.
//
// The site reads OUR schema, not the vendor's. Everything vendor-specific is
// confined to fetchSentCampaigns() and toIssue() below, so switching providers
// later means editing this file only.
//
// VERIFY BEFORE THE FIRST REAL RUN: confirm the endpoint, the auth header, and
// the response field names against the current EmailOctopus API docs. If a
// field name is wrong the script exits non-zero and prints the keys it actually
// received, so the mismatch is obvious rather than silent.

import { writeFile, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = resolve(HERE, "..", "assets", "data", "newsletter.json");

const API_BASE = process.env.EMAILOCTOPUS_API_BASE || "https://api.emailoctopus.com";
const API_KEY = process.env.EMAILOCTOPUS_API_KEY;
const SUMMARY_LENGTH = 200;

const fail = (message) => {
  console.error(`build-newsletter-archive: ${message}`);
  process.exit(1);
};

// Email bodies arrive as HTML or as plain text. Reduce either to readable text.
const toPlainText = (value) => {
  if (!value) {
    return "";
  }

  return String(value)
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

const toSummary = (text) => {
  const flat = text.replace(/\s+/g, " ").trim();

  if (flat.length <= SUMMARY_LENGTH) {
    return flat;
  }

  const clipped = flat.slice(0, SUMMARY_LENGTH);
  const lastSpace = clipped.lastIndexOf(" ");

  if (lastSpace > 60) {
    return `${clipped.slice(0, lastSpace)}...`;
  }

  return `${clipped}...`;
};

// --- vendor-specific: EmailOctopus ------------------------------------------

const fetchSentCampaigns = async () => {
  const collected = [];
  let url = `${API_BASE}/campaigns?limit=100`;

  while (url) {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      const body = await response.text();
      fail(`campaigns request failed: HTTP ${response.status} ${body.slice(0, 400)}`);
    }

    const payload = await response.json();
    const page = payload.data;

    if (!Array.isArray(page)) {
      fail(
        `expected an array at payload.data, received keys: ${Object.keys(payload).join(", ")}. ` +
        `Check the API response shape and update fetchSentCampaigns().`
      );
    }

    collected.push(...page);

    // paging.next is an object carrying the full next-page URL, not a string.
    if (payload.paging && payload.paging.next && payload.paging.next.url) {
      url = payload.paging.next.url;
    } else {
      url = "";
    }
  }

  return collected.filter((campaign) => {
    return String(campaign.status).toLowerCase() === "sent";
  });
};

// The API has no hosted web-version URL for a campaign, so url stays empty and
// the site shows the full body text instead of a link. name is the internal
// label in the dashboard; subject is what subscribers actually saw.
const toIssue = (campaign) => {
  const bodyText = toPlainText(campaign.content?.plain_text || campaign.content?.html || "");

  return {
    id: String(campaign.id),
    title: campaign.subject || campaign.name || "Untitled issue",
    date: campaign.sent_at || campaign.created_at || null,
    summary: toSummary(bodyText),
    bodyText,
    url: campaign.web_version_url || ""
  };
};

// --- end vendor-specific ----------------------------------------------------

const readExisting = async () => {
  try {
    return JSON.parse(await readFile(OUTPUT_PATH, "utf8"));
  } catch (error) {
    return null;
  }
};

const main = async () => {
  if (!API_KEY) {
    fail("EMAILOCTOPUS_API_KEY is not set. Add it as a repository secret.");
  }

  const campaigns = await fetchSentCampaigns();
  const issues = campaigns.map(toIssue);

  issues.sort((a, b) => {
    return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
  });

  const existing = await readExisting();

  // Compare issues only. "updated" changes every run, so including it would
  // produce a commit a day even when nothing was sent.
  if (existing && JSON.stringify(existing.issues) === JSON.stringify(issues)) {
    console.log(`No change. ${issues.length} issue(s) already recorded.`);
    return;
  }

  const output = {
    updated: new Date().toISOString(),
    issues
  };

  await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(`Wrote ${issues.length} issue(s) to ${OUTPUT_PATH}`);
};

main().catch((error) => {
  fail(error.stack || String(error));
});
