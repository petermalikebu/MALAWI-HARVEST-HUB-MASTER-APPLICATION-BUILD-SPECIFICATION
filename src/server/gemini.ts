import { GoogleGenAI } from '@google/genai';

// Initialize the official Gemini SDK client strictly on the server-side
// Telemetry header set to 'aistudio-build' as mandated by Google GenAI guidelines
export const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// District coordinate lookup for precise Google Maps grounding across Malawi
export const MALAWI_DISTRICT_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'Lilongwe': { lat: -13.9626, lng: 33.7741 },
  'Blantyre': { lat: -15.7861, lng: 35.0058 },
  'Mzuzu': { lat: -11.4586, lng: 34.0151 },
  'Mchinji': { lat: -13.8000, lng: 32.8800 },
  'Kasungu': { lat: -13.0333, lng: 33.4833 },
  'Dedza': { lat: -14.3667, lng: 34.3333 },
  'Dowa': { lat: -13.6528, lng: 33.9378 },
  'Salima': { lat: -13.7804, lng: 34.4587 },
  'Ntcheu': { lat: -14.8203, lng: 34.6358 },
  'Nkhotakota': { lat: -12.9274, lng: 34.2961 },
  'Ntchisi': { lat: -13.3667, lng: 33.9167 },
  'Zomba': { lat: -15.3833, lng: 35.3333 },
  'Mangochi': { lat: -14.4782, lng: 35.2645 },
  'Mulanje': { lat: -16.0319, lng: 35.5000 },
  'Chiradzulu': { lat: -15.6989, lng: 35.1408 },
  'Thyolo': { lat: -16.1139, lng: 35.1408 },
  'Chikwawa': { lat: -16.0333, lng: 34.7833 },
  'Nsanje': { lat: -16.9167, lng: 35.2667 },
  'Mwanza': { lat: -15.6000, lng: 34.5167 },
  'Neno': { lat: -15.3983, lng: 34.6528 },
  'Phalombe': { lat: -15.8064, lng: 35.6517 },
  'Machinga': { lat: -15.1689, lng: 35.3000 },
  'Balaka': { lat: -14.9792, lng: 34.9558 },
  'Karonga': { lat: -9.9333, lng: 33.9333 },
  'Chitipa': { lat: -9.7022, lng: 33.2694 },
  'Rumphi': { lat: -11.0186, lng: 33.8575 },
  'Nkhata Bay': { lat: -11.6067, lng: 34.2908 },
  'Likoma': { lat: -12.0667, lng: 34.7333 },
};

export const MALAWI_DEFAULT_COORDS = { lat: -13.2543, lng: 34.3015 };
