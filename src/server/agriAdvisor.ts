import { GoogleGenAI } from '@google/genai';
import { ai } from './gemini.ts';

// Comprehensive Malawian Agricultural Knowledge Repository
export interface CropGuide {
  id: string;
  name: string;
  chichewaName: string;
  category: string;
  optimalDistricts: string[];
  plantingSeason: string;
  harvestSeason: string;
  soilRequirements: string;
  fertilizerSchedule: {
    basal: string;
    topDressing: string;
    organic: string;
  };
  spacingAndPopulation: string;
  commonPestsAndDiseases: Array<{
    name: string;
    symptoms: string;
    remedy: string;
  }>;
  qualityStandardsMBS: {
    gradeA: string;
    maxMoisture: string;
    foreignMatterLimit: string;
    aflatoxinLimit?: string;
  };
  postHarvestAndStorage: string;
  valueAdditionIdeas: string[];
  keyBuyersInMalawi: string[];
}

export const MALAWI_CROP_KNOWLEDGE_BASE: CropGuide[] = [
  {
    id: 'white-maize',
    name: 'White Maize (Chimanga)',
    chichewaName: 'Chimanga Choyera',
    category: 'Grains & Cereals',
    optimalDistricts: ['Lilongwe', 'Mchinji', 'Kasungu', 'Dedza', 'Dowa', 'Ntcheu', 'Zomba', 'Mzimba'],
    plantingSeason: 'Mid-November to Mid-December (with onset of 25-30mm effective rainfall)',
    harvestSeason: 'Late April to June (when black layer forms at grain tip and husks turn straw-dry)',
    soilRequirements: 'Well-drained fertile sandy-clay loams with pH 5.5 - 6.8. Avoid waterlogged or saline depressions.',
    fertilizerSchedule: {
      basal: 'Apply 23:21:0+4S or NPK (e.g., 100 kg/ha or 1 bottle cap per station) at planting or within 7-10 days after germination, 5cm away from seed.',
      topDressing: 'Apply Urea (46% N) at knee-high stage (21-28 days after emergence, 100 kg/ha). For sandy soils, split into two applications.',
      organic: 'Apply 5 to 10 tonnes/ha of well-rotted animal manure or Mbeya organic compost during land preparation.'
    },
    spacingAndPopulation: 'Ridges 75cm apart. Single seed per planting station at 25cm interval (approx 53,333 plants/ha) or 2 seeds at 50cm interval.',
    commonPestsAndDiseases: [
      {
        name: 'Fall Armyworm (Nthenda ya Mphutsi ya Chinkhoma)',
        symptoms: 'Ragged holes in leaves, window-pane feeding, sawdust-like frass inside the plant whorl.',
        remedy: 'Scout twice weekly. Spray Belt (Chlorantraniliprole), Ampligo, or Emamectin Benzoate directly into whorl late afternoon. Traditional remedy: dry sand or wood ash in whorl for small plots.'
      },
      {
        name: 'Maize Streak Virus (MSV)',
        symptoms: 'Narrow translucent yellow or white streaks running parallel along veins of newly formed leaves.',
        remedy: 'Plant streak-resistant certified seed varieties (e.g., DKC, SC series). Control leafhopper vectors early with imidacloprid seed treatment.'
      },
      {
        name: 'Large Grain Borer & Weevil (Nankafumbwe)',
        symptoms: 'Powdered grain in storage, circular emergence holes in kernels.',
        remedy: 'Dry grain to <13.0% moisture. Treat with Actellic Super / Actellic Gold dust or store in hermetic PICS triple-layer bags without chemicals.'
      }
    ],
    qualityStandardsMBS: {
      gradeA: 'Clean, uniformly filled flint/dent kernels, moisture <= 13.0%, max 2% broken, zero live insects, aflatoxin < 10 ppb.',
      maxMoisture: '13.0% (MBS MS 31 / COMESA standard)',
      foreignMatterLimit: 'Max 2.0% (stones, chaff, cobs)',
      aflatoxinLimit: '10 ppb maximum total aflatoxins'
    },
    postHarvestAndStorage: 'Dry on clean tarpaulins or raised cribs—NEVER on bare dirt. Shell with wooden beaters in sacks or hand-crank shellers to avoid broken grain. Store in hermetic PICS bags or treated polypropylene sacks elevated 30cm off the ground on wooden pallets.',
    valueAdditionIdeas: [
      'Ufa Woyera refined maize flour packaging (5kg, 10kg, 25kg branded retail bags)',
      'Bran (Gaga) livestock feed production for dairy and poultry cooperatives',
      'Corn grits for commercial brewing and snack extrusion'
    ],
    keyBuyersInMalawi: ['National Food Reserve Agency (NFRA)', 'ADMARC Depots', 'Rab Processors Ltd', 'Bakhresa Grain Milling', 'Capital Foods', 'Farmers World']
  },
  {
    id: 'chalimbana-groundnuts',
    name: 'Chalimbana Groundnuts (Mtedza)',
    chichewaName: 'Mtedza wa Chalimbana / CG7',
    category: 'Oilseeds & Nuts',
    optimalDistricts: ['Mchinji', 'Kasungu', 'Lilongwe', 'Dowa', 'Salima', 'Rumphi', 'Nkhotakota'],
    plantingSeason: 'Late November to Early December (as soon as sufficient moisture allows soil penetration)',
    harvestSeason: 'April to May (lift when 70-80% of inner pod shells show brown/black markings)',
    soilRequirements: 'Light, loose, well-drained sandy loams. Friable soil is essential so pegs can penetrate and pods lift easily without stripping.',
    fertilizerSchedule: {
      basal: 'Legume inoculant (Rhizobium) applied to seed. Apply Gypsum (Calcium Sulphate) at 200-300 kg/ha at early flowering (30-40 days) for pod filling and "pops" prevention.',
      topDressing: 'Groundnuts fix atmospheric nitrogen; synthetic nitrogen top-dressing is not recommended as it promotes excessive vegetative foliage.',
      organic: 'Incorporate well-composted organic matter during ridge construction.'
    },
    spacingAndPopulation: 'Ridges 75cm apart. 1 seed per station at 10-15cm along ridge, or double-row planting on flat-topped ridges.',
    commonPestsAndDiseases: [
      {
        name: 'Groundnut Rosette Disease (Chitopa cha Mtedza)',
        symptoms: 'Stunted bushy plants with severe yellowing or mottling of leaves and very few small pods.',
        remedy: 'Transmitted by aphids. Maintain dense plant population to shade bare ground (aphids dislike dark canopy). Spray dimethoate or cypermethrin if aphid colonies appear early.'
      },
      {
        name: 'Aflatoxin Contamination (Aspergillus flavus)',
        symptoms: 'Olive green mould inside pods, bitter taste, invisible carcinogenic toxin produced in damp storage.',
        remedy: 'Harvest at proper maturity. Invert plants in windrows so pods dry facing upwards into the sun away from wet soil. Dry pods to 7-8% moisture before bagging.'
      }
    ],
    qualityStandardsMBS: {
      gradeA: 'Whole plump kernels, uniform size, zero mould, moisture <= 7.5%, zero aflatoxin (<4 ppb export standard).',
      maxMoisture: '7.5% - 8.0%',
      foreignMatterLimit: 'Max 1.0%',
      aflatoxinLimit: '4 ppb (export/EU) to 10 ppb (Malawi MBS standard)'
    },
    postHarvestAndStorage: 'Pluck pods when completely dried. Store in dry ventilated sheds in jute or breathable bags. Do not store shelled nuts in plastic sacks as heat causes sweating and rapid mould proliferation.',
    valueAdditionIdeas: [
      'Pure peanut butter processing (creamy and crunchy, certified by MBS)',
      'Roasted and salted snack packs in vacuum foil sachets',
      'Cold-pressed groundnut cooking oil and high-protein seed cake for poultry feed'
    ],
    keyBuyersInMalawi: ['Sunseed Oil Ltd', 'Rab Processors Ltd', 'NASFAM (National Smallholder Farmers Association)', 'Export Trading Group (ETG)', 'Lakhani Merchants']
  },
  {
    id: 'soya-beans',
    name: 'Soya Beans (Soya)',
    chichewaName: 'Mtedza wa Soya (Tikolore / Makwacha)',
    category: 'Legumes & Pulses',
    optimalDistricts: ['Kasungu', 'Mchinji', 'Lilongwe', 'Dedza', 'Dowa', 'Ntchisi', 'Mzimba'],
    plantingSeason: 'December 1 to December 25',
    harvestSeason: 'Late April to May (when leaves turn yellow and drop, and pods rattle when shaken)',
    soilRequirements: 'Deep, well-drained loamy soils with pH between 6.0 and 7.0.',
    fertilizerSchedule: {
      basal: 'Apply Super D or single superphosphate (SSP) at 100 kg/ha. Inoculate seed with Rhizobium inoculant (Bio-Fix / Nitro-Fix) at planting.',
      topDressing: 'Not required when effectively nodulated.',
      organic: 'Compost manure applied at 5t/ha.'
    },
    spacingAndPopulation: 'Ridges 75cm apart with 2 rows per ridge, 5cm between seeds (approx 300,000 plants/ha).',
    commonPestsAndDiseases: [
      {
        name: 'Soybean Rust (Phakopsora pachyrhizi)',
        symptoms: 'Small tan or reddish-brown lesions on underside of leaves, causing premature defoliation.',
        remedy: 'Plant tolerant varieties like Tikolore. Spray triazole fungicides (e.g., Folicur / Triadimenol) at first symptom detection.'
      },
      {
        name: 'Pod Shattering',
        symptoms: 'Pods burst open in the field under hot sun, dropping seeds to the ground before harvest.',
        remedy: 'Harvest promptly in the morning hours when humidity prevents pod bursting.'
      }
    ],
    qualityStandardsMBS: {
      gradeA: 'Bright clean yellow seed, uniform size, moisture <= 11.5%, max 1% split seeds, zero foreign matter.',
      maxMoisture: '11.5% - 12.0%',
      foreignMatterLimit: 'Max 1.5%',
      aflatoxinLimit: 'Not significant in sound dry soya'
    },
    postHarvestAndStorage: 'Thresh gently on clean tarpaulins to avoid cracking seed coats. Store in airtight PICS bags or dry storehouses on pallets.',
    valueAdditionIdeas: [
      'Soya milk and tofu production for local nutrition centers',
      'Full-fat soya meal extrusion for poultry and swine feeds',
      'Soya flour blend (Likuni Phala) for infant nutrition and school feeding programs'
    ],
    keyBuyersInMalawi: ['Mount Meru Millers', 'Sunseed Oil', 'Central Poultry (CP Feeds)', 'Profeed Malawi', 'Chibuku Products', 'ADMARC']
  },
  {
    id: 'kilombero-rice',
    name: 'Kilombero Aromatic Rice (Mpunga wa Kilombero)',
    chichewaName: 'Mpunga Wofunkha (Kilombero / Faya)',
    category: 'Grains & Cereals',
    optimalDistricts: ['Salima', 'Karonga', 'Nkhotakota', 'Machiga', 'Chikwawa', 'Nsanje', 'Mangochi'],
    plantingSeason: 'December to January (for rainfed / dambo) or July to August for winter irrigation schemes.',
    harvestSeason: 'May to July (when 85% of grains in the panicle turn golden straw colour).',
    soilRequirements: 'Heavy alluvial clay soils (Vertisols) that retain standing water or high moisture.',
    fertilizerSchedule: {
      basal: 'Apply 23:21:0+4S or D-Compound at 100 kg/ha before transplanting or broadcast at puddling.',
      topDressing: 'Apply Urea in two splits: 50 kg/ha at active tillering (3-4 weeks) and 50 kg/ha at panicle initiation.',
      organic: 'Incorporate rice straw and compost during dry season tillage.'
    },
    spacingAndPopulation: 'Transplant 2-3 seedlings per hill at 20cm x 20cm in puddled fields.',
    commonPestsAndDiseases: [
      {
        name: 'Rice Blast (Magnaporthe oryzae)',
        symptoms: 'Spindle-shaped diamond lesions on leaves and rotting of neck node (neck blast) causing empty whiteheads.',
        remedy: 'Avoid excessive nitrogen fertilizer. Treat seeds with fungicide. Use Tricyclazole or Benomyl if outbreak occurs.'
      },
      {
        name: 'Stalk Eyed Fly & Stem Borer',
        symptoms: 'Dead heart in young tillers or white heads in mature plants.',
        remedy: 'Maintain balanced field water depth. Remove stubble after harvest. Spray contact insecticide if >5% dead hearts.'
      }
    ],
    qualityStandardsMBS: {
      gradeA: 'Long grain, intact aroma, broken grain ratio < 5.0%, moisture <= 13.0%, translucent appearance, zero paddy or stones.',
      maxMoisture: '13.0% - 13.5%',
      foreignMatterLimit: 'Max 0.5% (zero stones permitted)',
      aflatoxinLimit: 'N/A'
    },
    postHarvestAndStorage: 'Dry paddy slowly in partial shade or gentle sun to 13.5% to avoid internal grain stress fractures that lead to high breakage during milling. Mill using rubber-roller dehullers and destoners.',
    valueAdditionIdeas: [
      'Destoned and polished Grade A aromatic 1kg, 2kg, and 5kg transparent retail packaging with barcode',
      'Broken rice for rice flour, porridge, and baby food blends',
      'Rice husk briquettes for clean cooking fuel'
    ],
    keyBuyersInMalawi: ['NASFAM Rice Milling', 'Rab Processors', 'Mota-Engil Schemes', 'National Supermarkets (Chipiku, Sana, Shoprite)', 'ADMARC']
  },
  {
    id: 'sugar-beans',
    name: 'Red Kidney / Sugar Beans (Nyemba)',
    chichewaName: 'Nyemba Zofiira / Sugar Beans',
    category: 'Legumes & Pulses',
    optimalDistricts: ['Dedza', 'Ntcheu', 'Mchinji', 'Chiradzulu', 'Thyolo', 'Rumphi', 'Neno'],
    plantingSeason: 'January to February (main rain) or June to July in dimba/dambo wetlands with residual moisture.',
    harvestSeason: 'April to May (main rain) or September to October (winter dimba).',
    soilRequirements: 'Well-aerated fertile soils with good organic matter. Avoid acidic soils with pH below 5.2.',
    fertilizerSchedule: {
      basal: 'Apply 23:21:0+4S at 100 kg/ha at planting. Beans respond very well to phosphorus.',
      topDressing: 'Generally not required. If pale, light Urea (30 kg/ha) after first weeding.',
      organic: 'Apply 5t/ha of cattle or chicken compost.'
    },
    spacingAndPopulation: 'Ridges 75cm apart. 2 rows per ridge, 10cm between stations (approx 133,000 plants/ha).',
    commonPestsAndDiseases: [
      {
        name: 'Bean Bruchid (Kafumbwe wa Nyemba - Acanthoscelides obtectus)',
        symptoms: 'Tiny round holes in dry beans in storage, eggs laid in field pods.',
        remedy: 'Treat immediately after threshing with Actellic Gold or store in airtight PICS bags. Sun dry periodically.'
      },
      {
        name: 'Angular Leaf Spot & Anthracnose',
        symptoms: 'Angular brown spots between leaf veins and sunken black lesions on pods.',
        remedy: 'Use certified disease-free seed, practice 2-year crop rotation, spray Mancozeb if humid spells occur.'
      }
    ],
    qualityStandardsMBS: {
      gradeA: 'Uniform colour, plump sound beans, moisture <= 12.0%, max 1% damaged/split, clean without weevil holes.',
      maxMoisture: '12.0%',
      foreignMatterLimit: 'Max 1.0%',
      aflatoxinLimit: 'N/A'
    },
    postHarvestAndStorage: 'Hand sort to remove discolored, wrinkled, or insect-damaged seeds. Pack in clean 50kg bags elevated on wooden pallets.',
    valueAdditionIdeas: [
      'Pre-cooked and canned sugar beans in savoury tomato sauce',
      'Graded and vacuum-sealed 500g and 1kg family packs for urban retail',
      'Bean flour for protein enrichment in school nutrition'
    ],
    keyBuyersInMalawi: ['ADMARC', 'World Food Programme (WFP)', 'Malawi Prisons & Police Canteen Procurement', 'Boarding Secondary Schools', 'Rab Processors']
  },
  {
    id: 'cassava',
    name: 'Cassava (Chinangwa)',
    chichewaName: 'Chinangwa (Manyokha - Sauti / Yizaso)',
    category: 'Roots & Tubers',
    optimalDistricts: ['Nkhotakota', 'Salima', 'Karonga', 'Nkhatabay', 'Mulanje', 'Zomba', 'Chikhwawa'],
    plantingSeason: 'November to January (with soaking rains), or anytime under irrigation.',
    harvestSeason: '9 to 12 months after planting for sweet varieties; can remain stored in the ground up to 18 months.',
    soilRequirements: 'Tolerant of poorer, acidic sandy soils, but yields highest in deep, friable sandy loams.',
    fertilizerSchedule: {
      basal: 'Apply 23:21:0+4S or compound D (100 kg/ha) 4 weeks after planting if commercial yield is targeted.',
      topDressing: 'Potassium chloride (Muriate of Potash) at 50 kg/ha at 3 months promotes tuber bulking.',
      organic: 'Animal manure applied along ridges during preparation.'
    },
    spacingAndPopulation: 'Mounds or ridges 90cm - 100cm apart. Plant healthy 25cm disease-free stem cuttings at 45 degree angle, 1m apart (10,000 plants/ha).',
    commonPestsAndDiseases: [
      {
        name: 'Cassava Mosaic Disease (CMD)',
        symptoms: 'Severe leaf distortion, yellow-green mottling, stunted plant growth.',
        remedy: 'Plant certified virus-free cuttings of improved varieties (e.g., Sauti, Yizaso, Mulanje). Rogue and burn infected young plants.'
      },
      {
        name: 'Cassava Brown Streak Disease (CBSD)',
        symptoms: 'Feathery yellow chlorosis along secondary leaf veins, dry brown/black corky rot inside mature storage roots.',
        remedy: 'Use clean cuttings from certified nurseries; control whitefly insect vectors; harvest early before root rot advances.'
      }
    ],
    qualityStandardsMBS: {
      gradeA: 'Fresh sound tubers free of rot or fiber, or dry white cassava chips (Makaka) with moisture <= 12.0% and zero mould.',
      maxMoisture: '12.0% (for dry chips/flour)',
      foreignMatterLimit: 'Max 1.0%',
      aflatoxinLimit: 'N/A'
    },
    postHarvestAndStorage: 'Fresh cassava deteriorates within 48 hours of harvest. Chip and sun-dry immediately on raised drying racks or clean tarpaulins to produce high-grade "Makaka". Never dry chips on bare soil.',
    valueAdditionIdeas: [
      'High Quality Cassava Flour (HQCF) for commercial bakeries (replaces up to 20% wheat flour)',
      'Industrial cassava starch for textile and packaging manufacturing',
      'Crispy cassava chips (flavoured snacks in retail foil packs)'
    ],
    keyBuyersInMalawi: ['Ethanol Company of Malawi (EthCo)', 'Universal Industries Ltd', 'Bakery Cooperatives', 'ADMARC', 'Local Starch Processors']
  }
];

// Topic Categories for quick discovery
export const AGRI_KNOWLEDGE_TOPICS = [
  { id: 'all', label: 'All Knowledge Areas', labelNy: 'Zonse za Ulimi' },
  { id: 'crop_production', label: 'Crop Production & Varieties', labelNy: 'Mbewu ndi Mitundu Yake' },
  { id: 'soil_fertilizer', label: 'Soil Fertility & Fertilizers', labelNy: 'Nthaka ndi Manyowa' },
  { id: 'pest_disease', label: 'Pest & Disease Diagnosis', labelNy: 'Tizirombo ndi Matenda' },
  { id: 'post_harvest_quality', label: 'Grading, Quality & Storage', labelNy: 'Kusunga ndi Miyezo ya Mbewu' },
  { id: 'marketing_pricing', label: 'Market Pricing & Selling', labelNy: 'Misika ndi Mitengo' },
  { id: 'value_addition', label: 'Processing & Value Addition', labelNy: 'Kukonza Mbewu & Phindu' },
];

/**
 * Generate comprehensive AI-grounded agricultural advice
 */
export async function generateAgriAdvice(params: {
  message: string;
  history?: Array<{ role: 'user' | 'model'; text: string }>;
  imageBase64?: string;
  imageMimeType?: string;
  district?: string;
  preferredLanguage?: 'en' | 'ny';
  topic?: string;
}): Promise<{
  text: string;
  chichewaSummary: string;
  recommendedActions: string[];
  qualityAndGradingTip: string;
  suggestedFollowUps: string[];
  warningOrDisclaimer?: string;
  shouldEscalateToExpert: boolean;
}> {
  const {
    message,
    history = [],
    imageBase64,
    imageMimeType = 'image/jpeg',
    district = 'Lilongwe',
    preferredLanguage = 'en',
    topic,
  } = params;

  const hasApiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());

  // SYSTEM INSTRUCTION tailored for Malawian Farmers
  const systemInstruction = `
You are the "Mberalink Mlimi Wodziwa" (Malawi Harvest Hub AI Agricultural Advisor and Knowledge Scientist).
You are an expert agronomist, plant pathologist, and agricultural economist specializing in Malawian agriculture.

Your audience: Malawian smallholder and commercial farmers, agribusiness cooperatives, and Extension Planning Area (EPA) officers.
Tone: Warm, highly practical, authoritative, respectful, and easy to understand.
Language capability: Fluent in both English and Chichewa. Provide clear step-by-step actionable advice.

Agricultural Context to integrate:
- Soil and fertilizers in Malawi: 23:21:0+4S, Urea (46%), CAN (27%), D-Compound, Mbeya organic compost, liming.
- Pests & diseases in Malawi: Fall Armyworm (Mphutsi ya Chinkhoma), Maize Streak Virus, Groundnut Rosette, Soya Rust, Cassava Mosaic/CBSD, Bacterial wilt in potatoes, Aphids, Weevils (Kafumbwe).
- Post-harvest & grading standards: Malawi Bureau of Standards (MBS) & COMESA specifications. Moisture content thresholds (<13% for maize, <7.5% for groundnuts, <12% for beans/soya). Aflatoxin prevention. Hermetic PICS triple-layer bags, raised granary platforms, Actellic Super.
- Value addition: Sorting, destoning, grading into Grade A, packaging in retail branded sacks, milling, cold-press oil, seed cake feed.

RESPONSE STRUCTURE REQUIREMENTS:
1. Practical, structured advice directly addressing the farmer's question.
2. A dedicated summary section in clear Chichewa ("Chidule mu Chichewa") so farmers and extension workers can read or listen in the national language.
3. 3 to 4 clear action items formatted with checkboxes or bullets.
4. A specific Product Quality / Market Value Tip (how to get Grade A and maximize price).
5. 2 or 3 relevant follow-up questions the farmer can ask next.
6. If an image is analyzed, include a clear diagnostic observation, confidence assessment, and caution disclaimer.
`;

  if (hasApiKey) {
    try {
      // Build conversation contents
      const contents: any[] = [];

      // Add previous chat history
      for (const turn of history.slice(-6)) {
        contents.push({
          role: turn.role === 'model' ? 'model' : 'user',
          parts: [{ text: turn.text }],
        });
      }

      // Prepare user turn parts
      const userParts: any[] = [];

      if (imageBase64) {
        // Strip data URL header if present
        const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
        userParts.push({
          inlineData: {
            mimeType: imageMimeType,
            data: cleanBase64,
          },
        });
      }

      const promptText = `
District context: ${district}, Malawi.
Topic focus: ${topic || 'General Agriculture & Post-Harvest Quality'}.
Farmer's Question or Request:
${message}

${imageBase64 ? 'Please examine the uploaded image carefully. Identify any visible crop diseases, pest damage, nutrient deficiencies, or harvested grain quality defects (e.g. moisture damage, mold, shrivelled seeds). Provide practical remedies and grading guidance.' : ''}
`;

      userParts.push({ text: promptText });
      contents.push({ role: 'user', parts: userParts });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          systemInstruction,
        },
      });

      const responseText = response.text || 'Ndalandira funso lanu. (Advice processed successfully)';

      // Parse structured sections from the AI response
      const chichewaMatch = responseText.match(/(?:Chidule mu Chichewa|Chichewa Summary|Mwachidule)[\s\S]*?(?=(?:Action Items|Zoyenera Kuchita|Quality Tip|Follow-up|$))/i);
      const chichewaSummary = chichewaMatch ? chichewaMatch[0].trim() : 'Funsani mlimi wodziwa kapena alangizi a zaulimi (AEDO) a ku EPA yanu kuti akuthandizeni pa zaulimi wokhazikika.';

      // Extract recommended actions
      const actions: string[] = [];
      const lines = responseText.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (/^[-*•]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
          if (trimmed.length > 10 && trimmed.length < 160 && !trimmed.toLowerCase().includes('http')) {
            actions.push(trimmed.replace(/^[-*•\d.]\s+/, ''));
          }
        }
      }

      // Default actions if not extracted
      const recommendedActions = actions.slice(0, 4).length > 0
        ? actions.slice(0, 4)
        : [
            'Test grain moisture before bagging (ensure moisture is below 13% for maize, 7.5% for groundnuts).',
            'Sort out damaged, broken, discoloured, or moldy kernels onto a clean tarpaulin.',
            'Store in hermetic PICS bags or on elevated wooden pallets 30cm off the ground.',
            'Consult your local EPA Extension Officer for site-specific soil and pest guidance.'
          ];

      const qualityAndGradingTip = 'Achieve Grade A classification by winnowing out all chaff, maintaining moisture below 13%, and keeping foreign matter under 1.5%. Grade A produce commands up to 25% higher market prices at commercial depots.';

      const suggestedFollowUps = [
        'How do I perform the bottle and salt test to verify grain moisture without a digital meter?',
        'What is the current minimum farmgate price set by the Ministry of Agriculture for this crop?',
        'Where can I purchase genuine PICS bags and certified post-harvest storage dust in my district?'
      ];

      return {
        text: responseText,
        chichewaSummary,
        recommendedActions,
        qualityAndGradingTip,
        suggestedFollowUps,
        warningOrDisclaimer: imageBase64 ? 'Note: AI image diagnosis is an advisory tool. For severe or spreading crop symptoms, please submit an expert consultation request to your local EPA Agricultural Extension Development Officer (AEDO).' : undefined,
        shouldEscalateToExpert: Boolean(imageBase64 || message.toLowerCase().includes('disease') || message.toLowerCase().includes('wilting') || message.toLowerCase().includes('die')),
      };
    } catch (aiError: any) {
      console.warn('[AgriAdvisor] Gemini API call notice, using local knowledge engine fallback:', aiError?.message || aiError);
    }
  }

  // Resilient Knowledge-Engine Fallback (Matches keywords across our 6 core Malawian crops and domains)
  return fallbackKnowledgeEngine(message, district, preferredLanguage, Boolean(imageBase64));
}

/**
 * High-fidelity fallback knowledge engine grounded in Malawian agricultural best practices
 */
function fallbackKnowledgeEngine(
  query: string,
  district: string,
  language: 'en' | 'ny',
  hasImage: boolean
): {
  text: string;
  chichewaSummary: string;
  recommendedActions: string[];
  qualityAndGradingTip: string;
  suggestedFollowUps: string[];
  warningOrDisclaimer?: string;
  shouldEscalateToExpert: boolean;
} {
  const q = query.toLowerCase();

  // Match crop
  let crop = MALAWI_CROP_KNOWLEDGE_BASE[0]; // Default to White Maize
  for (const c of MALAWI_CROP_KNOWLEDGE_BASE) {
    if (q.includes(c.name.toLowerCase()) || q.includes(c.chichewaName.toLowerCase()) || q.includes(c.id.replace('-', ' '))) {
      crop = c;
      break;
    }
  }

  if (q.includes('groundnut') || q.includes('mtedza') || q.includes('chalimbana') || q.includes('aflatoxin')) {
    crop = MALAWI_CROP_KNOWLEDGE_BASE.find(c => c.id === 'chalimbana-groundnuts') || crop;
  } else if (q.includes('soya') || q.includes('soybean')) {
    crop = MALAWI_CROP_KNOWLEDGE_BASE.find(c => c.id === 'soya-beans') || crop;
  } else if (q.includes('rice') || q.includes('mpunga') || q.includes('kilombero')) {
    crop = MALAWI_CROP_KNOWLEDGE_BASE.find(c => c.id === 'kilombero-rice') || crop;
  } else if (q.includes('bean') || q.includes('nyemba') || q.includes('sugar')) {
    crop = MALAWI_CROP_KNOWLEDGE_BASE.find(c => c.id === 'sugar-beans') || crop;
  } else if (q.includes('cassava') || q.includes('chinangwa') || q.includes('manyokha')) {
    crop = MALAWI_CROP_KNOWLEDGE_BASE.find(c => c.id === 'cassava') || crop;
  }

  const adviceText = `
### Agricultural Advisory: ${crop.name} (${crop.chichewaName})
**Region & District Guidance:** Optimized for agricultural practices in **${district}** and surrounding agro-ecological zones.

#### 1. Crop Production & Agronomic Techniques
- **Planting Window:** ${crop.plantingSeason}.
- **Spacing & Ridge Management:** ${crop.spacingAndPopulation}.
- **Soil & Fertility Management:** ${crop.soilRequirements}.
  * **Basal Fertilizer:** ${crop.fertilizerSchedule.basal}
  * **Top Dressing:** ${crop.fertilizerSchedule.topDressing}
  * **Organic Matter:** ${crop.fertilizerSchedule.organic}

#### 2. Pest & Disease Management
${crop.commonPestsAndDiseases.map(p => `* **${p.name}:** ${p.symptoms}\n  * *Remedy:* ${p.remedy}`).join('\n')}

#### 3. Harvest, Post-Harvest Handling & Quality Grading
- **Harvest Indicator:** ${crop.harvestSeason}.
- **Moisture Threshold for Safe Storage:** Target moisture is strictly **${crop.qualityStandardsMBS.maxMoisture}**.
- **Grade A MBS Standard:** ${crop.qualityStandardsMBS.gradeA}.
- **Post-Harvest Handling:** ${crop.postHarvestAndStorage}.

#### 4. Value Addition & Market Opportunities
- **Value Addition Potential:** ${crop.valueAdditionIdeas.join(', ')}.
- **Major Commercial Buyers in Malawi:** ${crop.keyBuyersInMalawi.join(', ')}.
`;

  const chichewaSummary = `
**Mwachidule mu Chichewa:**
Kwa alimi a ku ${district} olima **${crop.chichewaName}**:
1. **Kubzala:** ${crop.plantingSeason}.
2. **Kuthira Manyowa:** Thirani feteleza wa ${crop.fertilizerSchedule.basal.slice(0, 80)}.
3. **Kuteteza ku Matenda:** Yang'anirani munda kawiri pa sabata. ${crop.commonPestsAndDiseases[0]?.name}: ${crop.commonPestsAndDiseases[0]?.remedy.slice(0, 100)}.
4. **Kusunga ndi Mtengo Wapamwamba:** Yanikani pa matheka kapena pansi powala bwino (osati pa dothi). Onetsetsani kuti chinyezi chatsika pansi pa ${crop.qualityStandardsMBS.maxMoisture} musanasunge m'zikhwama za PICS.
`;

  return {
    text: adviceText,
    chichewaSummary,
    recommendedActions: [
      `Dry harvested produce on clean tarpaulins to meet ${crop.qualityStandardsMBS.maxMoisture} moisture.`,
      `Winnow and hand-sort to eliminate damaged, discolored kernels and foreign stones.`,
      `Store in airtight PICS bags or elevated pallets inside well-ventilated granaries.`,
      `Monitor for pest infestation weekly and contact local EPA Agricultural Extension Officers for field inspection.`
    ],
    qualityAndGradingTip: `Commercial buyers pay premium prices for Grade A ${crop.name}. Removing broken grains and ensuring moisture is below ${crop.qualityStandardsMBS.maxMoisture} guarantees top tier market prices.`,
    suggestedFollowUps: [
      `How do I protect ${crop.name} from weevils and storage pests using chemical-free PICS bags?`,
      `What are the soil requirements and liming recommendations in ${district} for ${crop.name}?`,
      `How can our farmers cooperative process ${crop.name} into retail value-added products?`
    ],
    warningOrDisclaimer: hasImage
      ? 'Visual appraisal note: Photo diagnostic advice is for preliminary guidance. If symptoms persist or crops wilt rapidly, submit an Agricultural Expert consultation directly to your local EPA.'
      : undefined,
    shouldEscalateToExpert: hasImage || q.includes('disease') || q.includes('pest'),
  };
}
