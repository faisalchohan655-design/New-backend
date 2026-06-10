import axios from 'axios';
import cheerio from 'cheerio';
import dns from 'dns';
import { promisify } from 'util';

const resolveMx = promisify(dns.resolveMx);

const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const genericDomains = ['noreply', 'admin', 'webmaster', 'support', 'info', 'contact'];

function extractEmails(text) {
  const matches = text.match(emailRegex) || [];
  return [...new Set(matches)].filter(email => {
    const local = email.split('@')[0].toLowerCase();
    return !genericDomains.includes(local);
  });
}

export async function verifyEmail(email) {
  const domain = email.split('@')[1];
  try {
    const mx = await resolveMx(domain);
    return mx && mx.length > 0;
  } catch {
    return false;
  }
}

async function scrapePage(url) {
  try {
    const res = await axios.get(url, { timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = cheerio.load(res.data);
    const text = $('body').text();
    const emails = extractEmails(text);
    const phoneRegex = /(?:\+?92|0)?[0-9]{10,14}/g;
    const phones = [...new Set(text.match(phoneRegex) || [])];
    return { emails, phones };
  } catch (err) {
    console.error(`Scrape error ${url}:`, err.message);
    return { emails: [], phones: [] };
  }
}

export async function extractEmailsFromUrl(startUrl, deep = false, maxPages = 10) {
  const results = new Map();
  const visited = new Set();
  const queue = [startUrl];
  let processed = 0;

  while (queue.length && processed < maxPages) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);
    processed++;
    const { emails, phones } = await scrapePage(current);
    for (let i = 0; i < emails.length; i++) {
      if (!results.has(emails[i])) {
        const verified = await verifyEmail(emails[i]);
        results.set(emails[i], { email: emails[i], source: current, verified, phone: phones[i] || '' });
      }
    }
    if (deep && processed < maxPages) {
      try {
        const $ = cheerio.load((await axios.get(current)).data);
        $('a[href^="/"]').each((_, el) => {
          let href = $(el).attr('href');
          if (href && !href.startsWith('http')) href = new URL(href, current).href;
          if (href && !visited.has(href) && href.includes(new URL(startUrl).hostname)) queue.push(href);
        });
      } catch(e) {}
    }
  }
  return Array.from(results.values());
}
