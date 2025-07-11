import React, { useState, useRef, useEffect } from 'react';
import { Send, Plane, Clock, DollarSign, Star, Users, MapPin, Calendar } from 'lucide-react';

interface Flight {
  id: string;
  airline: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  price: number;
  currency?: string;
  stops: number;
  rating: number;
  aircraft: string;
  bookingToken?: string;
}

interface Message {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
  flights?: Flight[];
}

interface Airport {
  iataCode: string;
  name: string;
  city: string;
  country: string;
}

export default function FlightTrackerChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showFlightForm, setShowFlightForm] = useState(false);
  const [searchParams, setSearchParams] = useState({
    origin: '',
    destination: '',
    departureDate: '',
    returnDate: '',
    adults: 1
  });
  const [airportSuggestions, setAirportSuggestions] = useState<{origin: Airport[], destination: Airport[]}>({
    origin: [],
    destination: []
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize messages on client side only
  useEffect(() => {
    setMounted(true);
    setMessages([
      {
        id: '1',
        text: "Hi! I'm your AI flight assistant with access to REAL flight data! 🛫\n\nI can help you in two ways:\n\n1. **Quick Search**: Just tell me what you want like 'cheap flights from NYC to LA next week'\n\n2. **Detailed Search**: Use the flight form for specific dates and preferences\n\nWhat kind of flight are you looking for today?",
        isBot: true,
        timestamp: new Date()
      }
    ]);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Search airports
  const searchAirports = async (keyword: string, type: 'origin' | 'destination') => {
    if (keyword.length < 2) {
      setAirportSuggestions(prev => ({ ...prev, [type]: [] }));
      return;
    }

    try {
      const response = await fetch(`/api/airports/search?keyword=${encodeURIComponent(keyword)}`);
      const data = await response.json();
      setAirportSuggestions(prev => ({ ...prev, [type]: data.airports || [] }));
    } catch (error) {
      console.error('Airport search error:', error);
    }
  };

  // Extract flight search parameters from natural language
  const extractFlightParams = (text: string) => {
    const lowerText = text.toLowerCase();
    const fromMatch = lowerText.match(/from\s+([a-z\s]+?)(?:\s+to|\s+→)/);
    const toMatch = lowerText.match(/to\s+([a-z\s]+?)(?:\s|$)/);
    
    // Common city/airport codes
    const cityMappings: { [key: string]: string } = {
      'nyc': 'JFK', 'new york': 'JFK', 'la': 'LAX', 'los angeles': 'LAX',
      'sf': 'SFO', 'san francisco': 'SFO', 'chicago': 'ORD', 'miami': 'MIA',
      'london': 'LHR', 'paris': 'CDG', 'tokyo': 'NRT', 'dubai': 'DXB'
    };

    let origin = '';
    let destination = '';

    if (fromMatch) {
      const fromCity = fromMatch[1].trim();
      origin = cityMappings[fromCity] || fromCity.toUpperCase();
    }

    if (toMatch) {
      const toCity = toMatch[1].trim();
      destination = cityMappings[toCity] || toCity.toUpperCase();
    }

    // Default date (next week)
    const departureDate = new Date();
    departureDate.setDate(departureDate.getDate() + 7);

    return {
      origin,
      destination,
      departureDate: departureDate.toISOString().split('T')[0]
    };
  };

  // Search flights using real API
  const searchFlights = async (params: any) => {
    try {
      const response = await fetch('/api/flights/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        throw new Error('Flight search failed');
      }

      const data = await response.json();
      return data.flights;
    } catch (error) {
      console.error('Flight search error:', error);
      throw error;
    }
  };

  const analyzeUserIntent = (text: string) => {
    const lowerText = text.toLowerCase();
    const priorities = {
      price: 0,
      speed: 0,
      comfort: 0,
      convenience: 0
    };

    // Price keywords
    if (lowerText.includes('cheap') || lowerText.includes('budget') || lowerText.includes('affordable')) {
      priorities.price += 3;
    }
    if (lowerText.includes('under') || lowerText.includes('less than') || lowerText.includes('$')) {
      priorities.price += 2;
    }

    // Speed keywords
    if (lowerText.includes('fast') || lowerText.includes('quick') || lowerText.includes('shortest')) {
      priorities.speed += 3;
    }
    if (lowerText.includes('nonstop') || lowerText.includes('direct')) {
      priorities.speed += 2;
      priorities.convenience += 2;
    }

    // Comfort keywords
    if (lowerText.includes('comfortable') || lowerText.includes('good airline') || lowerText.includes('quality')) {
      priorities.comfort += 3;
    }

    return priorities;
  };

  const rankFlights = (flights: Flight[], priorities: any) => {
    return flights.map(flight => {
      let score = 0;
      
      // Price scoring (lower price = higher score)
      const maxPrice = Math.max(...flights.map(f => f.price));
      const priceScore = (maxPrice - flight.price) / maxPrice * 100;
      score += priceScore * priorities.price;

      // Speed scoring (shorter duration = higher score)  
      const durationMinutes = parseInt(flight.duration.split('h')[0]) * 60 + 
                             (parseInt(flight.duration.split('h')[1]?.replace('m', '')) || 0);
      const maxDuration = Math.max(...flights.map(f => {
        const h = parseInt(f.duration.split('h')[0]) || 0;
        const m = parseInt(f.duration.split('h')[1]?.replace('m', '')) || 0;
        return h * 60 + m;
      }));
      const speedScore = (maxDuration - durationMinutes) / maxDuration * 100;
      score += speedScore * priorities.speed;

      // Comfort scoring (rating)
      score += flight.rating * 20 * priorities.comfort;

      // Convenience scoring (fewer stops = higher score)
      const maxStops = Math.max(...flights.map(f => f.stops));
      const convenienceScore = maxStops === 0 ? 100 : (maxStops - flight.stops) / maxStops * 100;
      score += convenienceScore * priorities.convenience;

      return { ...flight, score };
    }).sort((a, b) => b.score - a.score);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      isBot: false,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputText;
    setInputText('');
    setIsLoading(true);

    try {
      // Check if user wants to use flight form
      if (currentInput.toLowerCase().includes('form') || 
          currentInput.toLowerCase().includes('specific') ||
          currentInput.toLowerCase().includes('detailed search')) {
        setShowFlightForm(true);
        setIsLoading(false);
        
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: "I've opened the detailed flight search form for you! Please fill in your travel details for the most accurate results.",
          isBot: true,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMessage]);
        return;
      }

      // Extract flight parameters from natural language
      const flightParams = extractFlightParams(currentInput);
      
      if (!flightParams.origin || !flightParams.destination) {
        setIsLoading(false);
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: "I need more details! Please tell me:\n- Where are you flying FROM?\n- Where are you flying TO?\n\nFor example: 'Find flights from NYC to LA' or use the detailed search form.",
          isBot: true,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMessage]);
        return;
      }

      // Search for real flights
      const searchData = {
        originLocationCode: flightParams.origin,
        destinationLocationCode: flightParams.destination,
        departureDate: flightParams.departureDate,
        adults: 1,
        max: 10
      };

      const flights = await searchFlights(searchData);
      
      if (!flights || flights.length === 0) {
        setIsLoading(false);
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: `No flights found for ${flightParams.origin} to ${flightParams.destination}. Try:\n- Different airport codes\n- Different dates\n- Using the detailed search form`,
          isBot: true,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMessage]);
        return;
      }

      // Analyze user preferences and rank flights
      const priorities = analyzeUserIntent(currentInput);
      const rankedFlights = rankFlights(flights, priorities);
      
      let explanation = `Found ${flights.length} real flights from ${flightParams.origin} to ${flightParams.destination}!\n\n`;
      
      if (priorities.price > Math.max(priorities.speed, priorities.comfort)) {
        explanation += "🔥 Showing the most affordable options first:\n\n";
      } else if (priorities.speed > Math.max(priorities.price, priorities.comfort)) {
        explanation += "⚡ Showing the fastest flights first:\n\n";
      } else if (priorities.comfort > Math.max(priorities.price, priorities.speed)) {
        explanation += "⭐ Showing flights with the best comfort ratings first:\n\n";
      } else {
        explanation += "📊 Showing flights ranked by overall value:\n\n";
      }

      setIsLoading(false);
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: explanation,
        isBot: true,
        timestamp: new Date(),
        flights: rankedFlights.slice(0, 5) // Show top 5 results
      };

      setMessages(prev => [...prev, botMessage]);

    } catch (error) {
      setIsLoading(false);
      console.error('Search error:', error);
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I had trouble searching for flights. This might be because:\n- Invalid airport codes\n- Amadeus API limits reached\n- Network issues\n\nTry again or use the detailed search form!",
        isBot: true,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
    }
  };

  const handleFlightFormSearch = async () => {
    if (!searchParams.origin || !searchParams.destination || !searchParams.departureDate) {
      alert('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    setShowFlightForm(false);

    try {
      const flights = await searchFlights({
        originLocationCode: searchParams.origin,
        destinationLocationCode: searchParams.destination,
        departureDate: searchParams.departureDate,
        returnDate: searchParams.returnDate || undefined,
        adults: searchParams.adults,
        max: 15
      });

      const explanation = `Found ${flights.length} flights from ${searchParams.origin} to ${searchParams.destination}:\n\n`;

      const botMessage: Message = {
        id: Date.now().toString(),
        text: explanation,
        isBot: true,
        timestamp: new Date(),
        flights: flights.slice(0, 8)
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Form search error:', error);
      
      const botMessage: Message = {
        id: Date.now().toString(),
        text: "Failed to search flights. Please check your inputs and try again.",
        isBot: true,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
    }

    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const FlightCard = ({ flight }: { flight: Flight }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center space-x-2">
          <Plane className="h-5 w-5 text-blue-600" />
          <span className="font-semibold text-gray-900">{flight.airline}</span>
          <span className="text-sm text-gray-500">({flight.aircraft})</span>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-green-600">
            {flight.currency ? `${flight.price} ${flight.currency}` : `$${flight.price}`}
          </div>
          <div className="flex items-center space-x-1">
            <Star className="h-4 w-4 text-yellow-500" />
            <span className="text-sm text-gray-600">{flight.rating.toFixed(1)}</span>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <div className="text-gray-500">Route</div>
          <div className="font-medium">{flight.origin} → {flight.destination}</div>
        </div>
        <div>
          <div className="text-gray-500">Time</div>
          <div className="font-medium">{flight.departureTime} - {flight.arrivalTime}</div>
        </div>
        <div>
          <div className="text-gray-500">Duration</div>
          <div className="font-medium flex items-center space-x-1">
            <Clock className="h-4 w-4" />
            <span>{flight.duration}</span>
          </div>
        </div>
      </div>
      
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-600">
            {flight.stops === 0 ? 'Direct flight' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}
          </span>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          Book Flight
        </button>
      </div>
    </div>
  );

  // Don't render until mounted
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Flight Tracker...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">✈️ AI Flight Finder</h1>
            <p className="text-lg text-gray-600">Real flight data + AI intelligence = BEST flights for you</p>
            <div className="mt-4 flex justify-center space-x-4">
              <button
                onClick={() => setShowFlightForm(!showFlightForm)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Calendar className="h-4 w-4" />
                <span>Detailed Search</span>
              </button>
            </div>
          </div>

          {/* Flight Search Form */}
          {showFlightForm && (
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
              <h3 className="text-lg font-semibold mb-4">Search Real Flights</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">From (Airport Code)</label>
                  <input
                    type="text"
                    placeholder="e.g., JFK, LAX, LHR"
                    value={searchParams.origin}
                    onChange={(e) => {
                      setSearchParams(prev => ({ ...prev, origin: e.target.value.toUpperCase() }));
                      searchAirports(e.target.value, 'origin');
                    }}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                  {airportSuggestions.origin.length > 0 && (
                    <div className="mt-1 bg-white border rounded shadow-lg max-h-40 overflow-y-auto">
                      {airportSuggestions.origin.map(airport => (
                        <div
                          key={airport.iataCode}
                          onClick={() => {
                            setSearchParams(prev => ({ ...prev, origin: airport.iataCode }));
                            setAirportSuggestions(prev => ({ ...prev, origin: [] }));
                          }}
                          className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                        >
                          <span className="font-medium">{airport.iataCode}</span> - {airport.name}
                          <div className="text-gray-500">{airport.city}, {airport.country}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">To (Airport Code)</label>
                  <input
                    type="text"
                    placeholder="e.g., JFK, LAX, LHR"
                    value={searchParams.destination}
                    onChange={(e) => {
                      setSearchParams(prev => ({ ...prev, destination: e.target.value.toUpperCase() }));
                      searchAirports(e.target.value, 'destination');
                    }}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                  {airportSuggestions.destination.length > 0 && (
                    <div className="mt-1 bg-white border rounded shadow-lg max-h-40 overflow-y-auto">
                      {airportSuggestions.destination.map(airport => (
                        <div
                          key={airport.iataCode}
                          onClick={() => {
                            setSearchParams(prev => ({ ...prev, destination: airport.iataCode }));
                            setAirportSuggestions(prev => ({ ...prev, destination: [] }));
                          }}
                          className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                        >
                          <span className="font-medium">{airport.iataCode}</span> - {airport.name}
                          <div className="text-gray-500">{airport.city}, {airport.country}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Departure Date</label>
                  <input
                    type="date"
                    value={searchParams.departureDate}
                    onChange={(e) => setSearchParams(prev => ({ ...prev, departureDate: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Return Date (Optional)</label>
                  <input
                    type="date"
                    value={searchParams.returnDate}
                    onChange={(e) => setSearchParams(prev => ({ ...prev, returnDate: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2"
                    min={searchParams.departureDate}
                  />
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <label className="block text-sm font-medium mb-1">Adults</label>
                  <select
                    value={searchParams.adults}
                    onChange={(e) => setSearchParams(prev => ({ ...prev, adults: parseInt(e.target.value) }))}
                    className="border rounded-lg px-3 py-2"
                  >
                    {[1,2,3,4,5,6,7,8,9].map(num => (
                      <option key={num} value={num}>{num}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleFlightFormSearch}
                  disabled={isLoading}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  Search Flights
                </button>
              </div>
            </div>
          )}

          {/* Chat Container */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Messages Area */}
            <div className="h-96 overflow-y-auto p-6 space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-xs lg:max-w-2xl px-4 py-2 rounded-2xl ${
                    message.isBot 
                      ? 'bg-gray-100 text-gray-800' 
                      : 'bg-blue-600 text-white'
                  }`}>
                    <div className="whitespace-pre-line">{message.text}</div>
                    {message.flights && (
                      <div className="mt-4 space-y-3">
                        {message.flights.map(flight => (
                          <FlightCard key={flight.id} flight={flight} />
                        ))}
                      </div>
                    )}
                    <div className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-2xl">
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                      <span>Searching real flights with Amadeus API...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-gray-200 p-4">
              <div className="flex space-x-4">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Try: 'cheap flights from NYC to LA next week' or 'fastest route to London'"
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isLoading || !inputText.trim()}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
                >
                  <Send className="h-4 w-4" />
                  <span>Send</span>
                </button>
              </div>
            </div>
          </div>

          {/* Examples */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <MapPin className="h-6 w-6 text-green-600 mb-2" />
              <h3 className="font-semibold mb-1">Natural Language</h3>
              <p className="text-sm text-gray-600">"Cheap flights from NYC to LA next week"</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <Clock className="h-6 w-6 text-blue-600 mb-2" />
              <h3 className="font-semibold mb-1">Real-Time Data</h3>
              <p className="text-sm text-gray-600">Live prices from Amadeus API</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <Star className="h-6 w-6 text-purple-600 mb-2" />
              <h3 className="font-semibold mb-1">Smart Ranking</h3>
              <p className="text-sm text-gray-600">AI sorts by your preferences</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}