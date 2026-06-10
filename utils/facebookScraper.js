import axios from 'axios';

export const fetchFacebookPageData = async (pageUrl) => {
  const pageId = extractPageId(pageUrl);
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
  if (!accessToken) throw new Error('FACEBOOK_ACCESS_TOKEN missing');

  const url = `https://graph.facebook.com/v18.0/${pageId}`;
  const response = await axios.get(url, {
    params: { fields: 'name,about,emails,phone,website,location,fan_count', access_token: accessToken }
  });
  const data = response.data;
  const lead = {
    platform: 'facebook',
    name: data.name || '',
    email: data.emails?.[0] || '',
    phone: data.phone || '',
    website: data.website || '',
    address: data.location?.address || '',
    rating: data.fan_count || 0,
    placeId: `fb_${pageId}`,
    createdAt: new Date()
  };
  return lead.email || lead.phone || lead.website ? [lead] : [];
};

function extractPageId(url) {
  const match = url.match(/facebook\.com\/([A-Za-z0-9.]+)/);
  return match ? match[1] : url;
}
