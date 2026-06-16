export const saveSocialLeads = async (req, res) => {
  try {
    const { leads } = req.body;
    console.log('📦 Received leads to save:', leads?.length || 0);

    if (!leads || !leads.length) {
      return res.status(400).json({ error: 'No leads to save' });
    }

    const saved = [];
    const errors = [];

    for (const lead of leads) {
      try {
        // Skip leads without name or website
        if (!lead.name && !lead.website) {
          errors.push({ lead, error: 'No name or website' });
          continue;
        }

        // Create a unique placeId
        const placeId = `${lead.platform || 'social'}_${lead.website || lead.sourceUrl || Date.now()}`;

        // Check if lead already exists by website or email
        const existing = await Lead.findOne({
          $or: [
            { website: lead.website },
            { email: lead.email }
          ]
        });

        if (existing) {
          console.log(`⏭️ Lead already exists: ${lead.website || lead.email}`);
          continue;
        }

        const newLead = new Lead({
          name: lead.name || 'Unknown Business',
          phone: lead.phone || '',
          email: lead.email || '',
          website: lead.website || '',
          address: lead.address || '',
          rating: parseFloat(lead.rating) || 0,
          placeId: placeId,
          source: lead.platform || 'social',
          status: 'Untouched',
          createdAt: new Date()
        });

        await newLead.save();
        saved.push(newLead);
        console.log(`✅ Saved lead: ${newLead.name} (${newLead.website})`);
      } catch (err) {
        console.error('❌ Error saving individual lead:', err.message);
        errors.push({ lead, error: err.message });
      }
    }

    console.log(`📊 Summary: ${saved.length} saved, ${errors.length} errors`);

    res.json({
      success: true,
      saved: saved.length,
      total: leads.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('❌ SaveSocialLeads error:', error);
    res.status(500).json({ error: error.message });
  }
};
