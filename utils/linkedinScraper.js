import axios from 'axios';

export const fetchLinkedInProfileData = async (profileUrl) => {
  const apiKey = process.env.LINKEDIN_API_KEY;
  if (!apiKey) throw new Error('LINKEDIN_API_KEY not set');

  const response = await axios.get('https://nubela.co/proxycurl/api/v2/linkedin', {
    params: {
      url: profileUrl,
      personal_email: 'include',
      personal_contact_number: 'include'
    },
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });
  const data = response.data;
  const lead = {
    platform: 'linkedin',
    name: data.full_name || '',
    email: data.personal_email || '',
    phone: data.personal_contact_number || '',
    website: data.website || '',
    headline: data.headline,
    location: data.country_full_name,
    company: data.experiences?.[0]?.company || '',
    jobTitle: data.experiences?.[0]?.title || '',
    connections: data.connections,
    placeId: `li_${data.profile_id || Date.now()}`,
    createdAt: new Date()
  };
  return lead.email || lead.phone || lead.website ? [lead] : [];
};
