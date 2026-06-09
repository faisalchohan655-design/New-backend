import axios from 'axios';

export const fetchInstagramProfileData = async (profileUrl) => {
  const username = extractUsername(profileUrl);
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const businessId = process.env.INSTAGRAM_BUSINESS_ID;
  if (!accessToken || !businessId) throw new Error('Instagram tokens missing');

  const url = `https://graph.facebook.com/v18.0/${businessId}`;
  const response = await axios.get(url, {
    params: {
      fields: 'id,username,name,biography,website,email,phone,followers_count',
      access_token: accessToken
    }
  });
  const data = response.data;
  const lead = {
    platform: 'instagram',
    name: data.name || data.username,
    email: data.email || '',
    phone: data.phone || '',
    website: data.website || '',
    username: data.username,
    bio: data.biography,
    followers: data.followers_count,
    placeId: `ig_${data.id}`,
    createdAt: new Date()
  };
  return lead.email || lead.phone || lead.website ? [lead] : [];
};

function extractUsername(url) {
  const match = url.match(/instagram\.com\/([A-Za-z0-9_.]+)/);
  return match ? match[1] : url;
}
