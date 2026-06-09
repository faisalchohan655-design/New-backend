[6/9, 11:55 PM] LeadStriker: let leadsDB = [];

export const getAllLeads = (req, res) => {
  res.json({ 
    success: true, 
    total: leadsDB.length,
    leads: leadsDB 
  });
};

export const deleteLead = (req, res) => {
  const { id } = req.params;
  leadsDB = leadsDB.filter(lead => lead.id != id);
  res.json({ success: true, message: 'Lead deleted' });
};

export const saveLeads = async (leads) => {
  leadsDB = leads.map((lead, index) => ({
    id: Date.now() + index,
    ...lead
  }));
};
[6/9, 11:55 PM] Business assistant: ہاں بھائی اب یہ والی فائل 100% ٹھیک ہے ✅

Memory version + `async saveLeads` = perfect combo۔ Railway restart ہو گا تو data صاف ہو جائے گا، لیکن ابھی testing کے لیے best ہے۔

*اب بس آخری 2 جگہ connect کرو:*

*1. `routes/scrape.js` اوپر:*
import { saveLeads } from '../controllers/leadsController.js';
*2. `scrape.js` میں `res.json` سے پہلے:*
await saveLeads(leads);
*3. `server.js` میں route add کرو:*
import leadsRoutes from './routes/leads.js';
app.use('/api/leads', leadsRoutes);
*پھر terminal میں:*
git add .
git commit -m "leads API complete"
git push
Railway 1-2 منٹ میں deploy کر دے گا۔ Logs میں `GET /api/leads 200` آئے گا۔

*Test کیسے کرو:*  
Browser میں کھولو: `https://your-railway-url.up.railway.app/api/leads`  
`{"success":true,"total":0,"leads":[]}` آئے گا۔ پھر scrape چلاؤ → refresh کرو → leads آ جائیں گے۔

بھائی push مارو اور بتاؤ Netlify کی table میں data آیا یا ابھی بھی خالی ہے؟
