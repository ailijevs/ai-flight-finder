import React, { useState, useRef, useEffect } from 'react';
import { Send, Plane, Clock, DollarSign, Star, Users } from 'lucide-react';

interface Flight {
  id: string;
  airline: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  price: number;
  stops: number;
  rating: number;
  aircraft: string;
}

interface Message {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
  flights?: Flight[];
}

export default function FlightTrackerChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize messages on client side only to avoid hydration errors
  useEffect(() => {
    setMounted(true);
    setMessages([
      {
        id: '1',
        text: "Hi! I'm your AI flight assistant. Tell me what kind of flight you're looking for and I'll find the BEST options for you. You can say things like:\n\n• 'Find me the cheapest flight from NYC to LA'\n• 'I want the fastest route to Paris with good airlines'\n• 'Show me flights under $500 with minimal layovers'\n\nWhat can I help you find today?",
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

  // Mock flight data - in production, this would come from real APIs
  const mockFlights: Flight[] = [
    {
      id: '1',
      airline: 'Delta Airlines',
      origin: 'JFK',
      destination: 'LAX',
      departureTime: '08:30',
      arrivalTime: '11:45',
      duration: '6h 15m',
      price: 299,
      stops: 0,
      rating: 4.2,
      aircraft: 'Boeing 737'
    },
    {
      id: '2',
      airline: 'American Airlines',
      origin: 'JFK',
      destination: 'LAX',
      departureTime: '14:20',
      arrivalTime: '19:30',
      duration: '6h 10m',
      price: 245,
      stops: 1,
      rating: 3.8,
      aircraft: 'Airbus A321'
    },
    {
      id: '3',
      airline: 'JetBlue',
      origin: 'JFK',
      destination: 'LAX',
      departureTime: '11:15',
      arrivalTime: '14:30',
      duration: '6h 15m',
      price: 189,
      stops: 0,
      rating: 4.0,
      aircraft: 'Airbus A320'
    }
  ];

  const analyzeUserIntent = (text: string) => {
    const lowerText = text.toLowerCase();
    const priorities = {
      price: 0,
      speed: 0,
      comfort: 0,
      convenience: 0
    };

    // Price keywords
    if (lowerText.includes('cheap') || lowerText.includes('budget') || lowerText.includes('affordable') || lowerText.includes('low cost')) {
      priorities.price += 3;
    }
    if (lowerText.includes('under') || lowerText.includes('less than') || lowerText.includes('$')) {
      priorities.price += 2;
    }

    // Speed keywords
    if (lowerText.includes('fast') || lowerText.includes('quick') || lowerText.includes('shortest') || lowerText.includes('direct')) {
      priorities.speed += 3;
    }
    if (lowerText.includes('nonstop') || lowerText.includes('non-stop')) {
      priorities.speed += 2;
      priorities.convenience += 2;
    }

    // Comfort keywords
    if (lowerText.includes('comfortable') || lowerText.includes('good airline') || lowerText.includes('rating') || lowerText.includes('quality')) {
      priorities.comfort += 3;
    }

    // Convenience keywords
    if (lowerText.includes('no layover') || lowerText.includes('minimal') || lowerText.includes('few stops')) {
      priorities.convenience += 2;
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
      const durationMinutes = parseInt(flight.duration.split('h')[0]) * 60 + parseInt(flight.duration.split('h')[1]);
      const maxDuration = Math.max(...flights.map(f => parseInt(f.duration.split('h')[0]) * 60 + parseInt(f.duration.split('h')[1])));
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

  const generateResponse = (userText: string) => {
    const priorities = analyzeUserIntent(userText);
    const rankedFlights = rankFlights(mockFlights, priorities);
    
    let explanation = "Based on your preferences, I've found the best flights for you:\n\n";
    
    if (priorities.price > priorities.speed && priorities.price > priorities.comfort) {
      explanation = "I focused on finding you the most affordable options:\n\n";
    } else if (priorities.speed > priorities.price && priorities.speed > priorities.comfort) {
      explanation = "I prioritized the fastest flights for you:\n\n";
    } else if (priorities.comfort > priorities.price && priorities.comfort > priorities.speed) {
      explanation = "I found flights with the best ratings and comfort:\n\n";
    }

    return {
      text: explanation,
      flights: rankedFlights.slice(0, 3) // Show top 3 results
    };
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
    setInputText('');
    setIsLoading(true);

    // Simulate AI processing
    setTimeout(() => {
      const response = generateResponse(inputText);
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.text,
        isBot: true,
        timestamp: new Date(),
        flights: response.flights
      };

      setMessages(prev => [...prev, botMessage]);
      setIsLoading(false);
    }, 1500);
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
          <div className="text-2xl font-bold text-green-600">${flight.price}</div>
          <div className="flex items-center space-x-1">
            <Star className="h-4 w-4 text-yellow-500" />
            <span className="text-sm text-gray-600">{flight.rating}</span>
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

  // Don't render until mounted to avoid hydration errors
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
            <p className="text-lg text-gray-600">Tell me what you want, and I'll find the BEST flights for you</p>
          </div>

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
                      <span>Finding the best flights for you...</span>
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
                  placeholder="Tell me what kind of flight you want... (e.g., 'cheapest flight from NYC to LA')"
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isLoading || !inputText.trim()}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  <Send className="h-4 w-4" />
                  <span>Send</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Examples */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <DollarSign className="h-6 w-6 text-green-600 mb-2" />
              <h3 className="font-semibold mb-1">Price Priority</h3>
              <p className="text-sm text-gray-600">"Find me the cheapest flight to Miami"</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <Clock className="h-6 w-6 text-blue-600 mb-2" />
              <h3 className="font-semibold mb-1">Speed Priority</h3>
              <p className="text-sm text-gray-600">"I need the fastest route to London"</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <Star className="h-6 w-6 text-purple-600 mb-2" />
              <h3 className="font-semibold mb-1">Quality Priority</h3>
              <p className="text-sm text-gray-600">"Show me flights with good airlines"</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 