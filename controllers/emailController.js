// backend/controllers/emailController.js - Updated extract function

import axios from 'axios';
import * as cheerio from 'cheerio';

// ============================================
// ✅ EXTRACT SOCIAL LINKS FROM WEBSITE
// ============================================
const extractSocialLinks = (html, baseUrl) => {
  const $ = cheerio.load(html);
  const socialLinks = [];
  
  // Social media patterns
  const socialPatterns = [
    /facebook\.com\//,
    /linkedin\.com\//,
    /instagram\.com\//,
    /twitter\.com\//,
    /x\.com\//,
    /github\.com\//,
    /youtube\.com\//,
    /pinterest\.com\//,
    /tiktok\.com\//
  ];

  // Search all links
  $('a[href]').each((i, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    
    // Convert relative to absolute
    let absoluteUrl = href;
    if (href.startsWith('/')) {
      absoluteUrl = new URL(href, baseUrl).href;
    }
    
    // Check if it's a social link
    for (const pattern of socialPatterns) {
      if (pattern.test(absoluteUrl)) {
        socialLinks.push(absoluteUrl);
        break;
      }
    }
  });

  return [...new Set(socialLinks)]; // Remove duplicates
};

// ============================================
// ✅ EXTRACT EMAILS & PHONES FROM SOCIAL PAGES
// ============================================
const extractFromSocialPage = async (socialUrl) => {
  try {
    const response = await axios.get(socialUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    const emails = [];
    const phones = [];
    
    // Email regex
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    
    // Phone regex (international)
    const phoneRegex = /(\+?\d{1,3}[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}/g;
    
    // Search in text
    const text = $('body').text();
    
    // Extract emails
    const foundEmails = text.match(emailRegex) || [];
    for (const email of foundEmails) {
      if (!email.includes('example') && !email.includes('test')) {
        emails.push(email);
      }
    }
    
    // Extract phones
    const foundPhones = text.match(phoneRegex) || [];
    for (const phone of foundPhones) {
      if (phone.length >= 10) {
        phones.push(phone);
      }
    }
    
    return { emails: [...new Set(emails)], phones: [...new Set(phones)] };
  } catch (error) {
    console.error(`Error extracting from ${socialUrl}:`, error.message);
    return { emails: [], phones: [] };
  }
};

// ============================================
// ✅ UPDATED EXTRACT FUNCTION
// ============================================
export const extractEmails = async (req, res) => {
  try {
    const { url, deep = false, maxPages = 10, extractSocial = true } = req.body;
    if (!url) return res.status(400).json({ error: 'URL required' });
    
    const allLeads = [];
    const visitedUrls = new Set();
    
    // Step 1: Extract from main URL
    const mainResult = await extractFromUrl(url, deep, maxPages);
    allLeads.push(...mainResult);
    
    // Step 2: Extract from social links
    if (extractSocial) {
      const socialLinks = await getSocialLinks(url);
      
      for (const socialUrl of socialLinks) {
        if (visitedUrls.has(socialUrl)) continue;
        visitedUrls.add(socialUrl);
        
        try {
          const socialData = await extractFromSocialPage(socialUrl);
          
          for (const email of socialData.emails) {
            allLeads.push({
              email,
              phone: socialData.phones[0] || '',
              source: socialUrl,
              socialSource: 'social',
              socialLinks: socialLinks,
              verified: true,
              website: url
            });
          }
        } catch (error) {
          console.error(`Error extracting from ${socialUrl}:`, error);
        }
      }
    }
    
    // Remove duplicates
    const unique = new Map();
    for (const lead of allLeads) {
      if (!unique.has(lead.email)) {
        unique.set(lead.email, lead);
      }
    }
    
    res.json({ 
      success: true, 
      count: unique.size, 
      leads: Array.from(unique.values()),
      socialLinksFound: extractSocial ? await getSocialLinks(url) : []
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================
// ✅ GET SOCIAL LINKS FROM WEBSITE
// ============================================
const getSocialLinks = async (url) => {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    
    return extractSocialLinks(response.data, url);
  } catch (error) {
    console.error('Error getting social links:', error);
    return [];
  }
};
