import { NextApiRequest, NextApiResponse } from 'next';
import Amadeus from 'amadeus';

const amadeus = new Amadeus({
  clientId: process.env.AMADEUS_API_KEY,
  clientSecret: process.env.AMADEUS_API_SECRET,
  environment: 'test' // Use 'production' when ready
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { 
      originLocationCode,
      destinationLocationCode,
      departureDate,
      returnDate,
      adults = 1,
      max = 10
    } = req.body;

    // Search for flights
    const response = await amadeus.shopping.flightOffersSearch.get({
      originLocationCode,
      destinationLocationCode,
      departureDate,
      returnDate,
      adults,
      max
    });

    // Transform Amadeus data to our format
    const flights = response.data.map((offer: any, index: number) => {
      const itinerary = offer.itineraries[0];
      const segment = itinerary.segments[0];
      const lastSegment = itinerary.segments[itinerary.segments.length - 1];
      
      // Calculate total duration
      const totalDuration = itinerary.duration.replace('PT', '').replace('H', 'h ').replace('M', 'm');
      
      // Calculate stops
      const stops = itinerary.segments.length - 1;
      
      return {
        id: `${offer.id}-${index}`,
        airline: segment.carrierCode,
        origin: segment.departure.iataCode,
        destination: lastSegment.arrival.iataCode,
        departureTime: new Date(segment.departure.at).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        arrivalTime: new Date(lastSegment.arrival.at).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        duration: totalDuration,
        price: parseFloat(offer.price.total),
        currency: offer.price.currency,
        stops,
        rating: Math.random() * 2 + 3, // Mock rating for now
        aircraft: segment.aircraft?.code || 'Unknown',
        bookingToken: offer.id,
        segments: itinerary.segments
      };
    });

    res.status(200).json({ flights });
  } catch (error: any) {
    console.error('Amadeus API Error:', error.response?.data || error.message);
    res.status(500).json({ 
      message: 'Failed to search flights', 
      error: error.response?.data || error.message 
    });
  }
} 