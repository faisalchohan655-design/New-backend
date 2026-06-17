import axios from 'axios';
import dns from 'dns';
import { promisify } from 'util';

const resolveMx = promisify(dns.resolveMx);

// Improved Email Regex
const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Improved Phone Regex
const phoneRegex = /(?:\+?92|0)?[3-9][0-9]{9,14}|(?:\+?[1-9][0-9]{1,3})?[0-9]{7,15}/g;

// Generic domains to skip
const genericDomains = ['noreply', 'admin', 'webmaster', 'support', 'info', 'contact', 'test', 'demo'];

function extractEmails(text) {
  const matches = text.match(emailRegex) || [];
  return [...new Set(matches)].filter(email => {
    const local = email.split('@')[0].toLowerCase();
    const domain = email.split('@')[1]?.toLowerCase() || '';
    if (genericDomains.includes(local)) return false;
    if (domain.length < 4 || !domain.includes('.')) return false;
    return true;
  });
}

function extractPhones(text) {
  const matches = text.match(phoneRegex) || [];
  return [...new Set(matches)]
    .map(p => p.trim())
    .filter(p => {
      const cleaned = p.replace(/[^0-9+]/g, '');
      if (cleaned.length < 7 || cleaned.length > 15) return false;
      if (/^(\d)\1+$/.test(cleaned)) return false;
      return true;
    });
}

export async function verifyEmail(email) {
  const domain = email.split('@')[1];
  try {
    const mx = await resolveMx(domain);
    return mx && mx.length > 0;
  } catch { return false; }
}

// ✅ DYNAMIC IMPORT for cheerio – avoids module not found errors
async function loadCheerio() {
  const module = await import('cheerio');
  return module.default || module;
}

async function scrapePage(url) {
  try {
    const res = await axios.get(url, {
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
    });
    const cheerio = await loadCheerio();
    const $ = cheerio.load(res.data);
    $('script, style, noscript, meta, link').remove();
    const text = $('body').text().replace(/\s+/g, ' ');
    const emails = extractEmails(text);
    const phones = extractPhones(text);
    return { emails, phones };
  } catch (error) {
    console.error(`Scrape error ${url}:`, error.message);
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
    
    for (const email of emails) {
      if (!results.has(email)) {
        const verified = await verifyEmail(email);
        results.set(email, { 
          email, 
          source: current, 
          verified, 
          phone: phones.length > 0 ? phones[0] : '' 
        });
      }
    }
    
    if (deep && processed < maxPages) {
      try {
        const cheerio = await loadCheerio();
        const $ = cheerio.load((await axios.get(current)).data);
        $('a[href^="/"]').each((_, el) => {
          let href = $(el).attr('href');
          if (href && !href.startsWith('http')) href = new URL(href, current).href;
          if (href && !visited.has(href) && href.includes(new URL(startUrl).hostname)) {
            queue.push(href);
          }
        });
      } catch(e) {}
    }
  }
  return Array.from(results.values());
}
