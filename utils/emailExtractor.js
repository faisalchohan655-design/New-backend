import axios from 'axios';
import * as cheerio from 'cheerio';
import dns from 'dns';
import { promisify } from 'util';

const resolveMx = promisify(dns.resolveMx);

// ✅ Better email regex
const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;

// ✅ Phone regex (international)
const phoneRegex = /(?:\+?[0-9]{1,3})?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g;

// ✅ Social links regex
const socialRegex = /(?:https?:\/\/)?(?:www\.)?(?:facebook|linkedin|twitter|instagram|youtube)\.com\/[A-Za-z0-9._/-]+/g;

// Priority pages
const priorityPaths = ['/contact', '/about', '/team', '/contact-us', '/about-us', '/our-team', '/support'];

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

function extractSocialLinks(text) {
  const matches = text.match(socialRegex) || [];
  return [...new Set(matches)];
}

export async function verifyEmail(email) {
  const domain = email.split('@')[1];
  try {
    const mx = await resolveMx(domain);
    return mx && mx.length > 0;
  } catch { return false; }
}

async function scrapePage(url, baseUrl) {
  try {
    const res = await axios.get(url, {
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    const $ = cheerio.load(res.data);
    $('script, style, noscript, meta, link').remove();
    const text = $('body').text().replace(/\s+/g, ' ');
    const emails = extractEmails(text);
    const phones = extractPhones(text);
    const socialLinks = extractSocialLinks(text);
    return { emails, phones, socialLinks };
  } catch (error) {
    console.error(`Scrape error ${url}:`, error.message);
    return { emails: [], phones: [], socialLinks: [] };
  }
}

function getAllLinks($, baseUrl) {
  const links = [];
  $('a[href]').each((_, el) => {
    let href = $(el).attr('href');
    if (!href) return;
    if (!href.startsWith('http')) {
      try { href = new URL(href, baseUrl).href; } catch { return; }
    }
    if (href.includes(new URL(baseUrl).hostname) && !href.includes('#')) {
      links.push(href);
    }
  });
  return [...new Set(links)];
}

export async function extractEmailsFromUrl(startUrl, deep = false, maxPages = 20) {
  const results = new Map();
  const visited = new Set();
  const queue = [startUrl];
  let processed = 0;

  if (deep) {
    const baseUrl = new URL(startUrl).origin;
    for (const path of priorityPaths) {
      const url = baseUrl + path;
      if (!visited.has(url)) {
        queue.unshift(url);
      }
    }
  }

  while (queue.length && processed < maxPages) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);
    processed++;
    const { emails, phones, socialLinks } = await scrapePage(current, startUrl);
    
    for (const email of emails) {
      if (!results.has(email)) {
        const verified = await verifyEmail(email);
        results.set(email, {
          email,
          source: current,
          verified,
          phone: phones.length > 0 ? phones[0] : '',
          socialLinks: socialLinks
        });
      }
    }
    
    if (deep && processed < maxPages) {
      try {
        const res = await axios.get(current, { timeout: 10000 });
        const $ = cheerio.load(res.data);
        const links = getAllLinks($, current);
        for (const link of links) {
          if (!visited.has(link)) queue.push(link);
        }
      } catch(e) {}
    }
  }
  return Array.from(results.values());
}
