import axios from 'axios';
import * as cheerio from 'cheerio';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Lead from '../models/Lead.js';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }); // or 'gemini-1.5-pro'

// ---- Google Custom Search (as before) ----
const searchGoogle = async (query, count) => {
  const apiKey = process.env.GOOGLE_API_KEY;
  const cx = process.env.GOOGLE_CX_ID;
  if (!apiKey || !cx) throw new Error('Google API keys missing');

  const url = 'https://www.googleapis.com/customsearch/v1';
  const params = { key: apiKey, cx, q: query, num: Math.min(count, 10) };
  const response = await axios.get(url, { params });
  return response.data.items || [];
};

// ---- Gemini: Extract emails & phones from a URL ----
const extractContactsWithGemini = async (url) => {
  try {
    // 1. Fetch webpage content
    const { data: html } = await axios.get(url, {
      timeout: 8000,
      headers: { 'User-Agent': 'LeadConnect/1.0' }
    });
    const $ = cheerio.load(html);
    const text = $('body').text().replace(/\s+/g, ' ').slice(0, 15000); // limit tokens

    // 2. Send to Gemini
    const prompt = `
      Extract all email addresses and phone numbers from the following text.
      Return ONLY a JSON object with two keys: "emails" (array) and "phones" (array).
      If none found, return empty arrays.
      Text: """${text}"""
    `;
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    // Parse JSON from Gemini response (may contain markdown fences)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { emails: [], phones: [] };
    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error(`Gemini extraction failed for ${url}:`, err.message);
    return { emails: [], phones: [] };
  }
};

// ---- Main search endpoint (Google + Gemini enrichment) ----
export const socialSearch = async (req, res) => {
  try {
    const { platform, searchType, query, count = 10 } = req.body;
    console.log('📨 Incoming search:', { platform, searchType, query, count });

    if (!query) return res.status(400).json({ error: 'Query required' });

    // Step 1: Google Search
    let googleResults = [];
    try {
      googleResults = await searchGoogle(query, count);
      console.log(`✅ Google returned ${googleResults.length} results`);
    } catch (err) {
      console.error('Google Search error:', err.message);
      return res.status(500).json({ error: 'Search failed' });
    }

    // Step 2: Enrich each result with Gemini (emails/phones)
    const enrichedResults = [];
    for (const item of googleResults) {
      const website = item.link;
      const contacts = await extractContactsWithGemini(website);
      enrichedResults.push({
        name: item.title,
        platform: platform,
        email: contacts.emails?.[0] || '',
        phone: contacts.phones?.[0] || '',
        website: website,
        followers: 0,
        rating: 0,
        sourceUrl: website,
        verified: false,
        snippet: item.snippet || '',
        allEmails: contacts.emails,   // optional: store all emails
        allPhones: contacts.phones    // optional: store all phones
      });
    }

    res.json({ results: enrichedResults, mock: false });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ---- Save leads to database (unchanged, but now includes emails/phones) ----
export const saveSocialLeads = async (req, res) => {
  try {
    const { leads } = req.body;
    if (!leads || !leads.length) return res.status(400).json({ error: 'No leads to save' });

    const saved = [];
    for (const lead of leads) {
      // Skip if no website? But we want to save anyway.
      const existing = await Lead.findOne({ website: lead.website });
      if (!existing) {
        const newLead = new Lead({
          name: lead.name,
          phone: lead.phone || '',
          email: lead.email || '',
          website: lead.website || '',
          address: lead.address || '',
          rating: parseFloat(lead.rating) || 0,
          placeId: `${lead.platform}_${lead.sourceUrl || Date.now()}`,
          source: lead.platform,
          status: 'Untouched',
          createdAt: new Date()
        });
        await newLead.save();
        saved.push(newLead);
      }
    }
    res.json({ success: true, saved: saved.length, total: leads.length });
  } catch (error) {
    console.error('Save error:', error);
    res.status(500).json({ error: error.message });
  }
};
