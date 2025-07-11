import { NextApiRequest, NextApiResponse } from 'next';
import Amadeus from 'amadeus';

const amadeus = new Amadeus({
  clientId: process.env.AMADEUS_API_KEY,
  clientSecret: process.env.AMADEUS_API_SECRET,
  environment: 'test'
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { keyword } = req.query;

    if (!keyword || typeof keyword !== 'string') {
      return res.status(400).json({ message: 'Keyword is required' });
    }

    const response = await amadeus.referenceData.locations.get({
      keyword,
      subType: 'AIRPORT,CITY'
    });

    const airports = response.data.map((location: any) => ({
      iataCode: location.iataCode,
      name: location.name,
      city: location.address?.cityName,
      country: location.address?.countryName
    }));

    res.status(200).json({ airports });
  } catch (error: any) {
    console.error('Airport search error:', error);
    res.status(500).json({ 
      message: 'Failed to search airports',
      error: error.message 
    });
  }
} 