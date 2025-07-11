import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { bookingToken, passengerDetails, originalOffer } = req.body;

    if (!bookingToken) {
      return res.status(400).json({ message: 'Missing booking token' });
    }

    const Amadeus = require('amadeus');
    const amadeus = new Amadeus({
      clientId: process.env.AMADEUS_API_KEY,
      clientSecret: process.env.AMADEUS_API_SECRET,
      environment: 'test'
    });

    // If we have the original offer, use it for pricing confirmation
    if (originalOffer) {
      try {
        const flightOfferPricing = await amadeus.shopping.flightOffers.pricing.post(
          JSON.stringify({
            data: {
              type: 'flight-offers-pricing',
              flightOffers: [originalOffer]
            }
          })
        );

        if (flightOfferPricing.data && flightOfferPricing.data.flightOffers.length > 0) {
          const confirmedOffer = flightOfferPricing.data.flightOffers[0];
          const confirmedPrice = confirmedOffer.price.total;
          const segments = confirmedOffer.itineraries[0].segments;
          
          return res.status(200).json({
            success: true,
            confirmedPrice,
            currency: confirmedOffer.price.currency,
            segments,
            bookingReference: `FL${Date.now()}`,
            message: 'Flight pricing confirmed - redirecting to payment...'
          });
        }
      } catch (pricingError: any) {
        console.error('Pricing confirmation failed:', pricingError);
        // Fall through to alternative booking approach
      }
    }

    // Alternative approach: Skip pricing confirmation and return booking details
    // This happens when originalOffer is not available or pricing fails
    const bookingReference = `FL${Date.now()}`;
    
    res.status(200).json({
      success: true,
      confirmedPrice: 'TBD', // Price to be confirmed at airline website
      currency: 'USD',
      bookingReference,
      message: 'Booking initiated - redirecting to airline for final confirmation...',
      requiresAirlineConfirmation: true
    });

  } catch (error: any) {
    console.error('Booking Error:', error);
    res.status(500).json({ 
      message: 'Booking failed',
      error: error.message 
    });
  }
} 