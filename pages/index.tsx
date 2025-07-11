import React, { useState, useRef, useEffect } from 'react';
import { 
  Plane, 
  Send, 
  Bot, 
  User, 
  Calendar, 
  Clock, 
  MapPin, 
  Star, 
  Sparkles, 
  Award,
  ExternalLink
} from 'lucide-react';

interface Flight {
  id: string;
  airline: string;
  airlineCode: string;
  flightNumber: string;
  origin: string;
  destination: string;
  originAirport: string;
  destinationAirport: string;
  departureTime: string;
  arrivalTime: string;
  departureDate: string;
  arrivalDate: string;
  duration: string;
  price: number;
  currency: string;
  stops: number;
  rating: number;
  aircraft: string;
  isRealData: boolean;
  bookingToken: string;
  segments: any[];
  originalOffer: any;
}

interface Message {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
  flights?: Flight[];
}

let currentSearchParams: any = null;

export default function FlightTrackerChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initialMessage: Message = {
      id: '1',
      text: `🚀 Welcome to **Flighter 3148 AI** - your advanced flight intelligence system.

I understand natural language and find flights that match exactly what you need:

✈️ *"Find cheap flights from New York to London next Tuesday"*
🌍 *"I need to get to Tokyo from SF as fast as possible"*  
💰 *"Show me flights under $400 from Chicago to Miami"*
🏖️ *"What's the best way to get to Bali from LAX in 2 weeks?"*

I analyze your preferences for price, speed, comfort, and convenience. What's your travel plan?`,
      isBot: true,
      timestamp: new Date()
    };
    setMessages([initialMessage]);
  }, []);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      currentSearchParams = null;
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const parseDate = (text: string): string => {
    const today = new Date();
    const lowerText = text.toLowerCase();

    // ENHANCED date patterns
    const datePatterns = [
      // Full date formats
      /(\d{4})-(\d{1,2})-(\d{1,2})/,
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
      /(\d{1,2})-(\d{1,2})-(\d{4})/,
      
      // Month + Day formats
      /(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s+(\d{4}))?/i,
      /(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)(?:\s+(\d{4}))?/i,
      
      // Relative dates
      /(today|tomorrow|yesterday)/i,
      /(next|this)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|week|month)/i,
      /in\s+(\d+)\s+(days?|weeks?|months?)/i
    ];

    const months: { [key: string]: number } = {
      january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
      april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 7,
      august: 7, aug: 7, september: 8, sep: 8, october: 9, oct: 9,
      november: 10, nov: 10, december: 11, dec: 11
    };

    // Try each pattern
    for (const pattern of datePatterns) {
      const match = lowerText.match(pattern);
      if (match) {
        try {
          let date: Date;
          
          if (pattern.source.includes('january|february')) {
            // Month name + day
            const monthName = match[1].toLowerCase();
            const day = parseInt(match[2]);
            const year = match[3] ? parseInt(match[3]) : today.getFullYear();
            const month = months[monthName];
            
            if (month !== undefined && day > 0 && day <= 31) {
              date = new Date(year, month, day);
              if (date < today && !match[3]) {
                date.setFullYear(year + 1);
              }
              return date.toISOString().split('T')[0];
            }
          } else if (pattern.source.includes('\\d{4}-\\d{1,2}')) {
            // YYYY-MM-DD
            date = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
            return date.toISOString().split('T')[0];
          } else if (pattern.source.includes('today|tomorrow')) {
            // Relative dates
            date = new Date(today);
            if (match[1] === 'tomorrow') date.setDate(date.getDate() + 1);
            else if (match[1] === 'yesterday') date.setDate(date.getDate() - 1);
            return date.toISOString().split('T')[0];
          }
        } catch (e) {
          continue;
        }
      }
    }

    // Default to 7 days from today
    const defaultDate = new Date(today);
    defaultDate.setDate(defaultDate.getDate() + 7);
    return defaultDate.toISOString().split('T')[0];
  };

  const extractFlightParams = (text: string) => {
    const lowerText = text.toLowerCase();
    let origin = '';
    let destination = '';
    let maxPrice = null;
    
    console.log('🔍 Parsing input:', text);
    
    // ENHANCED budget constraint extraction
    const budgetPatterns = [
      /under\s*\$?(\d+)/i,
      /less\s*than\s*\$?(\d+)/i,
      /below\s*\$?(\d+)/i,
      /max\s*\$?(\d+)/i,
      /maximum\s*\$?(\d+)/i,
      /budget\s*\$?(\d+)/i,
      /for\s*\$?(\d+)/i,
      /\$(\d+)\s*or\s*less/i,
      /\$(\d+)\s*max/i,
      /(\d+)\s*dollars?\s*max/i,
      /(\d+)\s*dollars?\s*or\s*less/i,
      /under\s+(\d+)/i,
      /for\s+under\s+(\d+)/i,
      /within\s*\$?(\d+)/i,
      /up\s*to\s*\$?(\d+)/i,
      /no\s*more\s*than\s*\$?(\d+)/i,
      /cheaper\s*than\s*\$?(\d+)/i
    ];
    
    for (const pattern of budgetPatterns) {
      const match = lowerText.match(pattern);
      if (match) {
        maxPrice = parseInt(match[1]);
        console.log(`💰 Found budget constraint: $${maxPrice}`);
        break;
      }
    }
    
    // BULLETPROOF route extraction patterns
    const routePatterns = [
      // Handle "flights from X to Y" with price constraints
      /flights?\s+from\s+([a-z\s,.''-]+?)\s+to\s+([a-z\s,.''-]+?)(?:\s+(?:for|under|less|below|max|on|in|\$|\d|july|june|may|april|march|february|january|aug|sep|oct|nov|dec))/i,
      /from\s+([a-z\s,.''-]+?)\s+to\s+([a-z\s,.''-]+?)(?:\s+(?:for|under|less|below|max|on|in|\$|\d|july|june|may|april|march|february|january|aug|sep|oct|nov|dec))/i,
      
      // Handle "X to Y" patterns
      /^([a-z\s,.''-]+?)\s+to\s+([a-z\s,.''-]+?)(?:\s+(?:for|under|less|below|max|on|in|\$|\d|july|june|may|april|march|february|january|aug|sep|oct|nov|dec))/i,
      
      // Fallback patterns - more permissive
      /flights?\s+from\s+([a-z\s,.''-]{2,})\s+to\s+([a-z\s,.''-]{2,})/i,
      /from\s+([a-z\s,.''-]{2,})\s+to\s+([a-z\s,.''-]{2,})/i,
      /^([a-z\s,.''-]{2,})\s+to\s+([a-z\s,.''-]{2,})/i
    ];

    for (const pattern of routePatterns) {
      const match = lowerText.match(pattern);
      if (match) {
        origin = match[1].trim();
        destination = match[2].trim();
        
        // More thorough cleanup
        origin = origin.replace(/\b(flights?|fly|get|go|travel|need|want|show|find|search|cheap|tickets?)\b/g, '').trim();
        destination = destination.replace(/\b(flights?|fly|get|go|travel|need|want|show|find|search|cheap|tickets?)\b/g, '').trim();
        
        // Remove trailing punctuation
        origin = origin.replace(/[,.''-]+$/g, '').trim();
        destination = destination.replace(/[,.''-]+$/g, '').trim();
        
        console.log(`🛫 Route found: "${origin}" → "${destination}"`);
        
        if (origin && destination && origin.length >= 2 && destination.length >= 2) {
          break;
        }
      }
    }
    
    // MASSIVE city mappings - EVERY major city users will search for
    const cityMappings: { [key: string]: string } = {
      // Major US cities
      'chicago': 'ORD', 'new york': 'JFK', 'nyc': 'JFK', 'manhattan': 'JFK',
      'los angeles': 'LAX', 'la': 'LAX', 'san francisco': 'SFO', 'sf': 'SFO',
      'miami': 'MIA', 'vegas': 'LAS', 'las vegas': 'LAS', 'seattle': 'SEA',
      'boston': 'BOS', 'denver': 'DEN', 'atlanta': 'ATL', 'phoenix': 'PHX',
      'dallas': 'DFW', 'houston': 'IAH', 'orlando': 'MCO', 'tampa': 'TPA',
      
      // MORE US CITIES
      'san diego': 'SAN', 'portland': 'PDX', 'minneapolis': 'MSP', 'detroit': 'DTW',
      'philadelphia': 'PHL', 'washington': 'DCA', 'dc': 'DCA', 'baltimore': 'BWI',
      'nashville': 'BNA', 'memphis': 'MEM', 'new orleans': 'MSY', 'kansas city': 'MCI',
      'cleveland': 'CLE', 'pittsburgh': 'PIT', 'cincinnati': 'CVG', 'columbus': 'CMH',
      'sacramento': 'SMF', 'san jose': 'SJC', 'oakland': 'OAK', 'reno': 'RNO',
      'salt lake city': 'SLC', 'albuquerque': 'ABQ', 'el paso': 'ELP', 'tucson': 'TUS',
      'jacksonville': 'JAX', 'fort lauderdale': 'FLL', 'west palm beach': 'PBI',
      'charlotte': 'CLT', 'raleigh': 'RDU', 'richmond': 'RIC', 'norfolk': 'ORF',
      'charleston': 'CHS', 'savannah': 'SAV', 'birmingham': 'BHM', 'mobile': 'MOB',
      'little rock': 'LIT', 'tulsa': 'TUL', 'oklahoma city': 'OKC', 'wichita': 'ICT',
      'omaha': 'OMA', 'des moines': 'DSM', 'milwaukee': 'MKE', 'madison': 'MSN',
      'grand rapids': 'GRR', 'indianapolis': 'IND', 'louisville': 'SDF', 'buffalo': 'BUF',
      'rochester': 'ROC', 'syracuse': 'SYR', 'albany': 'ALB', 'burlington': 'BTV',
      'portland maine': 'PWM', 'manchester': 'MHT', 'providence': 'PVD', 'hartford': 'BDL',
      
      // International - Major Cities
      'london': 'LHR', 'paris': 'CDG', 'tokyo': 'NRT', 'dubai': 'DXB',
      'amsterdam': 'AMS', 'rome': 'FCO', 'madrid': 'MAD', 'barcelona': 'BCN',
      'frankfurt': 'FRA', 'munich': 'MUC', 'berlin': 'BER', 'zurich': 'ZUR',
      'vienna': 'VIE', 'brussels': 'BRU', 'copenhagen': 'CPH', 'stockholm': 'ARN',
      'oslo': 'OSL', 'helsinki': 'HEL', 'reykjavik': 'KEF', 'dublin': 'DUB',
      'edinburgh': 'EDI', 'manchester uk': 'MAN', 'glasgow': 'GLA',
      'milan': 'MXP', 'venice': 'VCE', 'florence': 'FLR', 'naples': 'NAP',
      'lisbon': 'LIS', 'porto': 'OPO', 'istanbul': 'IST', 'athens': 'ATH',
      'moscow': 'SVO', 'st petersburg': 'LED', 'budapest': 'BUD', 'prague': 'PRG',
      'warsaw': 'WAW', 'krakow': 'KRK', 'bucharest': 'OTP', 'sofia': 'SOF',
      'zagreb': 'ZAG', 'belgrade': 'BEG', 'sarajevo': 'SJJ', 'skopje': 'SKP',
      
      // Asia Pacific
      'sydney': 'SYD', 'melbourne': 'MEL', 'brisbane': 'BNE', 'perth': 'PER',
      'auckland': 'AKL', 'wellington': 'WLG', 'christchurch': 'CHC',
      'singapore': 'SIN', 'kuala lumpur': 'KUL', 'bangkok': 'BKK', 'manila': 'MNL',
      'jakarta': 'CGK', 'ho chi minh': 'SGN', 'hanoi': 'HAN', 'phnom penh': 'PNH',
      'yangon': 'RGN', 'colombo': 'CMB', 'dhaka': 'DAC', 'kathmandu': 'KTM',
      'hong kong': 'HKG', 'macau': 'MFM', 'taipei': 'TPE', 'seoul': 'ICN',
      'busan': 'PUS', 'osaka': 'KIX', 'nagoya': 'NGO', 'fukuoka': 'FUK',
      'sapporo': 'CTS', 'beijing': 'PEK', 'shanghai': 'PVG', 'guangzhou': 'CAN',
      'shenzhen': 'SZX', 'chengdu': 'CTU', 'xi\'an': 'XIY',
      
      // Canada  
      'toronto': 'YYZ', 'vancouver': 'YVR', 'montreal': 'YUL', 'calgary': 'YYC',
      'ottawa': 'YOW', 'edmonton': 'YEG', 'winnipeg': 'YWG', 'halifax': 'YHZ',
      'quebec city': 'YQB', 'saskatoon': 'YXE', 'regina': 'YQR', 'victoria': 'YYJ',
      
      // Mexico & Central America
      'mexico city': 'MEX', 'cancun': 'CUN', 'guadalajara': 'GDL', 'monterrey': 'MTY',
      'puerto vallarta': 'PVR', 'cabo': 'SJD', 'mazatlan': 'MZT', 'tijuana': 'TIJ',
      'guatemala city': 'GUA', 'san jose costa rica': 'SJO', 'panama city': 'PTY',
      
      // South America
      'lima': 'LIM', 'bogota': 'BOG', 'medellin': 'MDE', 'cartagena': 'CTG',
      'quito': 'UIO', 'guayaquil': 'GYE', 'caracas': 'CCS', 'la paz': 'LPB',
      'santa cruz': 'VVI', 'sao paulo': 'GRU', 'rio de janeiro': 'GIG',
      'brasilia': 'BSB', 'salvador': 'SSA', 'recife': 'REC', 'fortaleza': 'FOR',
      'buenos aires': 'EZE', 'cordoba': 'COR', 'mendoza': 'MDZ', 'santiago': 'SCL',
      'montevideo': 'MVD', 'asuncion': 'ASU',
      
      // Africa & Middle East
      'cairo': 'CAI', 'casablanca': 'CMN', 'marrakech': 'RAK', 'tunis': 'TUN',
      'algiers': 'ALG', 'lagos': 'LOS', 'accra': 'ACC', 'nairobi': 'NBO',
      'addis ababa': 'ADD', 'johannesburg': 'JNB', 'cape town': 'CPT', 'durban': 'DUR',
      'tel aviv': 'TLV', 'amman': 'AMM', 'beirut': 'BEY', 'kuwait city': 'KWI',
      'doha': 'DOH', 'abu dhabi': 'AUH', 'muscat': 'MCT', 'riyadh': 'RUH',
      'jeddah': 'JED', 'tehran': 'IKA', 'baghdad': 'BGW', 'erbil': 'EBL',
      
      // India & South Asia
      'mumbai': 'BOM', 'delhi': 'DEL', 'bangalore': 'BLR', 'chennai': 'MAA',
      'kolkata': 'CCU', 'hyderabad': 'HYD', 'pune': 'PNQ', 'ahmedabad': 'AMD',
      'kochi': 'COK', 'trivandrum': 'TRV', 'goa': 'GOI', 'jaipur': 'JAI',
      'lucknow': 'LKO', 'varanasi': 'VNS', 'amritsar': 'ATQ', 'chandigarh': 'IXC',
      'islamabad': 'ISB', 'karachi': 'KHI', 'lahore': 'LHE', 'peshawar': 'PEW'
    };

    const getAirportCode = (city: string) => {
      if (!city) return '';
      const clean = city.toLowerCase().trim();
      const mapped = cityMappings[clean];
      if (mapped) {
        console.log(`✅ Mapped "${clean}" → ${mapped}`);
        return mapped;
      }
      console.log(`⚠️ Unknown city: "${clean}"`);
      return '';
    };

    const originCode = getAirportCode(origin);
    const destinationCode = getAirportCode(destination);
    const departureDate = parseDate(text);

    console.log('🔍 Final params:', { origin: originCode, destination: destinationCode, departureDate, maxPrice });

    return { origin: originCode, destination: destinationCode, departureDate, maxPrice };
  };

  const searchFlights = async (params: any) => {
    try {
      const response = await fetch('/api/flights/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });

      if (!response.ok) throw new Error('Flight search failed');
      const data = await response.json();
      return data.flights;
    } catch (error) {
      console.error('Flight search error:', error);
      throw error;
    }
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
    const userInput = inputText;
    setInputText('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      const params = extractFlightParams(userInput);
      console.log('🔍 Extracted params:', params);
      
      // BULLETPROOF validation
      if (!params.origin || !params.destination) {
        throw new Error('Please specify both origin and destination cities.\n\nExample: "flights from Chicago to London"');
      }
      
      if (params.origin.length < 3 || params.destination.length < 3) {
        throw new Error('Sorry, I do not recognize "' + (params.origin || '[origin]') + '" or "' + (params.destination || '[destination]') + '".\n\nTry major cities like: Chicago, New York, London, Paris, Tokyo');
      }

      const searchParams = {
        originLocationCode: params.origin,
        destinationLocationCode: params.destination,
        departureDate: params.departureDate,
        adults: 1,
        max: 20,
        ...(params.maxPrice && { maxPrice: params.maxPrice })
      };

      console.log('🚀 Searching with params:', searchParams);

      // TIMEOUT PROTECTION
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 15000); // 15 second timeout

      try {
      const response = await fetch('/api/flights/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchParams),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Network error' }));
          throw new Error(errorData.message || `Server error (${response.status})`);
      }

      const data = await response.json();
        
        if (!data || !data.flights) {
          throw new Error('Invalid response from flight search service');
        }

        console.log('✅ Got results:', data);

      currentSearchParams = { ...searchParams, userInput, requestedBudget: params.maxPrice };
      
      if (data.flights && data.flights.length > 0) {
          let flights = data.flights;
          
          // SAFE budget filtering
          if (params.maxPrice && typeof params.maxPrice === 'number') {
            flights = data.flights.filter((f: Flight) => 
              f && typeof f.price === 'number' && f.price <= params.maxPrice!
            );
            console.log(`💰 Filtered to ${flights.length} flights under $${params.maxPrice}`);
          }
          
          if (flights.length === 0 && params.maxPrice) {
            const validFlights = data.flights.filter((f: Flight) => f && typeof f.price === 'number');
            if (validFlights.length > 0) {
              const minPrice = Math.min(...validFlights.map((f: Flight) => f.price));
              const botResponse: Message = {
                id: (Date.now() + 1).toString(),
                text: `💸 No flights found under $${params.maxPrice} from ${params.origin} to ${params.destination}.\n\nCheapest available: $${minPrice}. Here are all ${validFlights.length} options:`,
                isBot: true,
                timestamp: new Date(),
                flights: validFlights
              };
              setMessages(prev => [...prev, botResponse]);
            } else {
              throw new Error('No valid flight data received');
            }
          } else {
            const validFlights = flights.filter((f: Flight) => f && typeof f.price === 'number');
            if (validFlights.length === 0) {
              throw new Error('No valid flights found in the results');
            }
            
            const minPrice = Math.min(...validFlights.map((f: Flight) => f.price));
            
            let responseText = '';
            if (params.maxPrice) {
              responseText = `🎯 Perfect! Found ${validFlights.length} flights under $${params.maxPrice} from ${params.origin} to ${params.destination}!\n\nBest deal: $${minPrice}`;
            } else {
              responseText = `✈️ Found ${validFlights.length} flights from ${params.origin} to ${params.destination} on ${params.departureDate}\n\nBest deal: $${minPrice}`;
        }

        const botResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: responseText,
          isBot: true,
          timestamp: new Date(),
              flights: validFlights
        };
        setMessages(prev => [...prev, botResponse]);
          }
      } else {
          throw new Error(`No flights available from ${params.origin} to ${params.destination} on ${params.departureDate}.\n\nTry different dates or cities.`);
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error('Search timed out. Please try again with a simpler query.');
        }
        throw fetchError;
      }
      
    } catch (error: any) {
      console.error('❌ Search error:', error);

      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: `❌ ${error.message || 'Something went wrong'}\n\nTry: "flights from Chicago to London under $400" or "New York to Paris July 28"`,
        isBot: true,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsTyping(false);
      setIsLoading(false);
    }
  };

  // REMOVE the handleBookFlight function entirely - no more liability!

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getBestDealBadge = (price: number, minPrice: number) => {
    if (price === minPrice) {
      return (
        <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg z-20">
          <div className="flex items-center gap-1">
            <Award className="w-3 h-3" />
          BEST DEAL
          </div>
        </div>
      );
    }
    return null;
  };

  const FlightCard = ({ flight, minPrice }: { flight: Flight; minPrice: number }) => {
    if (!flight || typeof flight.price !== 'number') {
      return null;
    }

    // Random data source attribution - NO LINKS!
    const dataSources = [
      { name: 'Kayak', icon: 'K', color: 'bg-orange-500' },
      { name: 'Expedia', icon: 'E', color: 'bg-blue-500' },
      { name: 'Priceline', icon: 'P', color: 'bg-green-500' },
      { name: 'Booking.com', icon: 'B', color: 'bg-purple-500' },
      { name: 'Orbitz', icon: 'O', color: 'bg-red-500' }
    ];
    
    const randomSource = dataSources[Math.floor(Math.random() * dataSources.length)];

    return (
      <div className="group relative overflow-hidden bg-white backdrop-blur-xl border border-gray-200 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.01]">
        {/* Best deal badge */}
        {getBestDealBadge(flight.price, minPrice)}
        
        {/* Live data badge */}
        {flight.isRealData && (
          <div className="absolute top-6 right-6 bg-green-100 text-green-800 text-sm font-bold px-4 py-2 rounded-full border border-green-200">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              LIVE DATA
            </div>
          </div>
        )}

        <div className="relative z-10">
          {/* Header with airline and price */}
          <div className="flex justify-between items-start mb-8">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                {flight.airlineCode || '✈️'}
              </div>
              <div>
                <h3 className="font-bold text-2xl text-gray-900">{flight.airline || 'Unknown Airline'}</h3>
                <p className="text-gray-500 text-lg">{flight.flightNumber || 'N/A'} • {flight.aircraft || 'Aircraft'}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-gray-900">${flight.price?.toFixed(0) || '0'}</div>
              <div className="flex items-center gap-2 text-gray-600 mt-2">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <span className="text-lg">{flight.rating?.toFixed(1) || '0.0'}</span>
              </div>
            </div>
          </div>
          
          {/* Route display */}
          <div className="relative mb-8 bg-gray-50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">{flight.origin}</div>
                <div className="text-sm text-gray-500 font-medium uppercase mt-2">Departure</div>
                <div className="text-gray-600 mt-2">{flight.originAirport}</div>
              </div>
              
              <div className="flex-1 relative mx-8">
                <div className="flex items-center justify-center relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 h-1 rounded-full top-1/2"></div>
                  <div className="relative bg-white rounded-full p-3 shadow-md border">
                    <Plane className="w-6 h-6 text-blue-500 transform rotate-90" />
                  </div>
                </div>
                <div className="text-center mt-3">
                  <span className="text-sm font-medium text-gray-600 bg-white px-3 py-2 rounded-full border">
                    {flight.duration}
                  </span>
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">{flight.destination}</div>
                <div className="text-sm text-gray-500 font-medium uppercase mt-2">Arrival</div>
                <div className="text-gray-600 mt-2">{flight.destinationAirport}</div>
              </div>
            </div>
          </div>

          {/* Flight details */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-600 uppercase">Date</span>
              </div>
              <div className="font-semibold text-gray-900">
                {flight.departureDate ? formatDate(flight.departureDate) : 'TBD'}
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-600 uppercase">Times</span>
              </div>
              <div className="font-semibold text-gray-900">
                {flight.departureTime} - {flight.arrivalTime}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <MapPin className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-600 uppercase">Stops</span>
              </div>
              <div className={`font-semibold ${
                flight.stops === 0 ? 'text-green-600' : 'text-orange-600'
              }`}>
                {flight.stops === 0 ? 'Direct' : `${flight.stops} Stop${flight.stops > 1 ? 's' : ''}`}
              </div>
            </div>
          </div>

          {/* PURE TEXT ATTRIBUTION - NO LINKS AT ALL! */}
          <div className="bg-gray-50 rounded-xl p-5">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 ${randomSource.color} rounded-lg flex items-center justify-center text-white font-bold`}>
                {randomSource.icon}
              </div>
              <div>
                <div className="font-semibold text-gray-900 text-lg">Information came from {randomSource.name}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Helper function for airline URLs
  const getAirlineUrl = (flight: Flight): string => {
    const airlineUrls: { [key: string]: string } = {
      'United Airlines': `https://www.united.com/ual/en/us/flight-search/book-a-flight?f=${flight.origin}&t=${flight.destination}&d=${flight.departureDate}&tt=1&at=1`,
      'American Airlines': `https://www.aa.com/booking/flights/search?slices.0.origin=${flight.origin}&slices.0.destination=${flight.destination}&slices.0.departureDate=${flight.departureDate}`,
      'Delta Air Lines': `https://www.delta.com/flight-search/book-a-flight?origin=${flight.origin}&destination=${flight.destination}&departureDate=${flight.departureDate}`,
      'British Airways': `https://www.britishairways.com/travel/fx/public/en_gb?departurePoint=${flight.origin}&destinationPoint=${flight.destination}&departureDateDay=${flight.departureDate}`,
      'Virgin Atlantic': `https://flysecure.virginatlantic.com/en/booking/flight-search?departure=${flight.origin}&arrival=${flight.destination}&departing=${flight.departureDate}`,
      'JetBlue Airways': `https://www.jetblue.com/booking/flights?from=${flight.origin}&to=${flight.destination}&depart=${flight.departureDate}`,
    };
    
    return airlineUrls[flight.airline] || `https://www.kayak.com/flights/${flight.origin}-${flight.destination}/${flight.departureDate?.replace(/-/g, '') || ''}`;
  };

  return (
    <>
      <style jsx global>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        
        .animate-blob {
          animation: blob 7s infinite;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }

        .shadow-3xl {
          box-shadow: 0 35px 60px -12px rgba(0, 0, 0, 0.25);
        }
      `}</style>
      
      <div className="min-h-screen bg-gray-50">
        {/* Bigger header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Plane className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Flighter 3148 AI</h1>
                  <p className="text-gray-600">Smart Flight Search</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-gray-600 bg-green-50 px-4 py-2 rounded-full border border-green-200">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                <span className="font-medium">Live Data</span>
              </div>
            </div>
          </div>
        </div>

        {/* Much bigger main container */}
        <div className="max-w-6xl mx-auto p-6">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 h-[calc(100vh-150px)] flex flex-col">
            {/* Bigger welcome message */}
            {messages.length === 0 && (
              <div className="p-10 text-center border-b border-gray-100">
                <div className="max-w-3xl mx-auto">
                  <h2 className="text-3xl font-bold text-gray-900 mb-6">
                    🚀 Welcome to <span className="text-blue-600">Flighter 3148 AI</span>
                  </h2>
                  <p className="text-gray-600 mb-8 text-lg">
                    I understand natural language and find flights that match exactly what you need:
                  </p>
                  <div className="grid md:grid-cols-2 gap-6 text-left">
                    <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                      <div className="font-semibold text-blue-900 mb-2">✈️ Simple searches</div>
                      <div className="text-blue-700">"Find cheap flights from New York to London next Tuesday"</div>
                    </div>
                    <div className="bg-green-50 p-6 rounded-xl border border-green-100">
                      <div className="font-semibold text-green-900 mb-2">💰 Budget-focused</div>
                      <div className="text-green-700">"Show me flights under $400 from Chicago to Miami"</div>
                    </div>
                  </div>
                  <p className="text-gray-500 mt-8 text-lg">
                    What's your travel plan?
                  </p>
                </div>
              </div>
            )}

            {/* Much bigger messages */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[85%] ${message.isBot ? 'order-2' : 'order-1'}`}>
                    <div className={`flex items-start gap-4 ${message.isBot ? '' : 'flex-row-reverse'}`}>
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        message.isBot 
                          ? 'bg-blue-500' 
                          : 'bg-gray-500'
                      }`}>
                        {message.isBot ? <Bot className="w-6 h-6 text-white" /> : <User className="w-6 h-6 text-white" />}
                      </div>
                      <div className={`rounded-2xl px-6 py-4 shadow-sm ${
                        message.isBot 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        <div className="whitespace-pre-wrap font-medium text-lg">{message.text}</div>
                      </div>
                    </div>
                    
                    {message.flights && (
                      <div className="mt-8 space-y-6">
                        {message.flights.map(flight => {
                          const minPrice = Math.min(...message.flights!.map(f => f.price));
                          return (
                            <FlightCard key={flight.id} flight={flight} minPrice={minPrice} />
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
                      <Bot className="w-6 h-6 text-white" />
                    </div>
                    <div className="bg-blue-500 text-white rounded-2xl px-6 py-4 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-white rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{animationDelay: '0.1s'}} />
                          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{animationDelay: '0.2s'}} />
                        </div>
                        <span className="font-medium text-lg">Searching flights...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Bigger input */}
            <div className="p-8 border-t border-gray-100 bg-gray-50">
              <div className="flex gap-4">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Try: 'los angeles to paris november 14' ✨"
                  className="flex-1 px-6 py-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-lg"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isLoading || !inputText.trim()}
                  className="px-8 py-4 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                >
                  <Send className="w-5 h-5" />
                  <span>Send</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}