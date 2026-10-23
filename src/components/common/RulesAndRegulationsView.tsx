import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import {
  ShieldCheck,
  Scale,
  Lock,
  Truck,
  Coins,
  AlertTriangle,
  CheckCircle2,
  FileText,
  BadgeCheck,
  HelpCircle,
  Phone,
  Sprout,
  Users,
} from 'lucide-react';

export const RulesAndRegulationsView: React.FC<{ onContactClick?: () => void }> = ({ onContactClick }) => {
  const { language, t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const rules = [
    {
      id: 'farmer_standards',
      category: 'farmer',
      title: language === 'ch' ? '1. Malamulo a Alimi & Zokolola' : '1. Smallholder Farmer Produce Standards',
      icon: Sprout,
      color: 'emerald',
      points: [
        language === 'ch'
          ? 'Zokolola zonse (chimanga, nyemba, mtedza, mpunga) ziyenera kukhala zouma bwino (Moisture Content yosapitirira 13.5%).'
          : 'All grain and pulse lots (Maize, Soya, Beans, Groundnuts, Rice) must be thoroughly cleaned, dried below 13.5% moisture content, and winnowed before depot loading.',
        language === 'ch'
          ? 'Kulongedza koyenera m\'matumba a 50kg osang\'ambika kapena onyowa.'
          : 'Produce must be packaged in clean, uniform 50kg polypropylene or jute sacks clearly labelled with the farmer or co-operative origin.',
        language === 'ch'
          ? 'Mtengo uliwonse wofotokozedwa pa nsanja uyenera kukhala womveka bwino popanda ndalama zobisika.'
          : 'Farmgate pricing must be transparent per kg or 50kg bag, with zero hidden or predatory middleman markups.',
        language === 'ch'
          ? 'Mlimi ali ndi udindo wotsimikizira kulemera pa masikelo ovomerezeka a m\'boma (weighbridge/certified digital scale).'
          : 'Accurate scale calibration is verified at registered district depots prior to freight pickup.',
      ],
    },
    {
      id: 'buyer_escrow',
      category: 'buyer',
      title: language === 'ch' ? '2. Chitetezo cha Escrow kwa Ogula' : '2. Buyer Escrow & Payment Protection',
      icon: Lock,
      color: 'blue',
      points: [
        language === 'ch'
          ? 'Ndalama zonse za oda zimalowetsedwa mu akaunti ya Escrow ya Boma ya Mberalink (National Bank of Malawi / Airtel Money / TNM Mpamba).'
          : 'All order payments are locked securely into the official Mberalink Escrow Account before produce dispatch.',
        language === 'ch'
          ? 'Ndalama siziperekedwa kwa mlimi mpaka wogula atalandira katundu ndi kutsimikizira khalidwe labwino (maola 24 a dispute window).'
          : 'Funds are never released to the farmer until produce arrives and the buyer verifies quality within a transparent 24-hour inspection window.',
        language === 'ch'
          ? 'Ngati katundu sasiyana ndi zomwe zinalonjezedwa kapena anawonongeka pa njira, wogula ali ndi ufulu wokana kapena kupempha kubwezeredwa ndalama.'
          : 'If produce deviates significantly from agreed grade or suffers transit damage, buyers can trigger an instant administrative resolution through our Support Desk.',
      ],
    },
    {
      id: 'transporter_rules',
      category: 'transporter',
      title: language === 'ch' ? '3. Malamulo a Onyamula Katundu (Transporters)' : '3. Freight & Transport Logistics Regulations',
      icon: Truck,
      color: 'indigo',
      points: [
        language === 'ch'
          ? 'Galimoto iliyonse iyenera kukhala ndi chivundikiro cholimba cha tarpaulin choteteza ku mvula kapena fumbi pa misewu ya m\'madera.'
          : 'All transport trucks must carry heavy-duty waterproof tarpaulins to protect agricultural consignments from rain and dust on rural transit roads.',
        language === 'ch'
          ? 'Dalaivala ayenera kutsimikizira kulemera kwa galimoto isananyamuke komanso ikafika (Tare Weight & Gross Weight).'
          : 'Drivers must verify vehicle tare weight and produce consignment weight at designated loading depots and destination weighbridges.',
        language === 'ch'
          ? 'Malipiro a mayendedwe amatetezedwa mu escrow ndipo amaperekedwa dalaivala akatsimikizira kubweretsa katundu popanda vuto.'
          : 'Haulage fees are locked in escrow upon job dispatch and disbursed promptly once destination delivery receipts are verified.',
      ],
    },
    {
      id: 'commission_policy',
      category: 'platform',
      title: language === 'ch' ? '4. Ndondomeko ya Commission ya pa Nsanja' : '4. Platform Commission & Fee Policy',
      icon: Coins,
      color: 'purple',
      points: [
        language === 'ch'
          ? 'Mberalink imatenga commission yotsika komanso yowonekera poyera yomwe imatsimikiziridwa ndi Oyang\'anira Akulu a pa nsanja.'
          : 'Mberalink operates on a transparent, dynamically regulated commission rate set and managed centrally by Platform Administration.',
        language === 'ch'
          ? 'Commission imagwiritsidwa ntchito posamalira njira za escrow, kulipira ndalama pa foni, ndi kuyang\'anira masikelo m\'maboma 28.'
          : 'Platform fees sustain digital escrow guarantees, nationwide bank/telecom gateway integrations, dispute arbitrations, and district depot supervision.',
        language === 'ch'
          ? 'Palibe ndalama zina zowonjezera kapena zosadziwika zomwe zimaperekedwa kwa wogulitsa kapena wogula.'
          : 'No unauthorized charges, hidden platform deductions, or speculative markups are permitted on the exchange.',
      ],
    },
    {
      id: 'integrity_conduct',
      category: 'platform',
      title: language === 'ch' ? '5. Kukhulupirika & Kusamvana pa Malonda' : '5. Zero-Tolerance Fraud & Dispute Protocol',
      icon: ShieldCheck,
      color: 'rose',
      points: [
        language === 'ch'
          ? 'Wogulitsa kapena wogula aliyense amene ayesa kubera, kusefukira manambala a akaunti, kapena kupereka mbewu zovunda amachotsedwa pa nsanja nthawi yomweyo.'
          : 'Immediate platform expulsion and account forfeiture apply to any user providing counterfeit produce, fraudulent payment slips, or misleading grade specs.',
        language === 'ch'
          ? 'Kusamvana kulikonse kumaweruzidwa ndi Oyang\'anira Akulu Peter Malikebu ndi Joshua Malikebu motsogozedwa ndi umboni wa masikelo a boma.'
          : 'All disputes are arbitrated with documented weighbridge tickets, depot photos, and payment slips overseen by Lead Administrators.',
      ],
    },
  ];

  const filteredRules =
    activeCategory === 'all' ? rules : rules.filter((r) => r.category === activeCategory);

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Hero Header */}
      <div className="rounded-3xl bg-gradient-to-br from-stone-900 via-emerald-950 to-stone-900 text-white p-8 sm:p-10 shadow-xl border border-emerald-800/40 relative overflow-hidden">
        <div className="relative z-10 space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
            <Scale className="w-4 h-4 text-emerald-400" />
            <span>Mberalink • Regulatory Standards &amp; Trading Code</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            {language === 'ch'
              ? 'Malamulo & Ndondomeko za Malonda a Ulimi'
              : 'Trading Rules, Produce Standards & Escrow Protections'}
          </h1>

          <p className="text-stone-300 text-xs sm:text-sm leading-relaxed">
            {language === 'ch'
              ? 'Mberalink ikuyendetsedwa ndi malamulo okhwima obweretsa chilungamo, chitetezo cha ndalama mu escrow, komanso khalidwe lapamwamba la zokolola kwa alimi, ogula, ndi onyamula katundu m\'maboma onse 28 a Malawi.'
              : 'Mberalink is established upon strict integrity protocols, transparent platform commission schedules, guaranteed escrow settlements, and verified grain calibration standards across all 28 districts of Malawi.'}
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-300 font-bold bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
              <BadgeCheck className="w-4 h-4 text-emerald-400" />
              <span>Full Legal Compliance</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-purple-200 font-bold bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
              <Lock className="w-4 h-4 text-amber-400" />
              <span>100% Escrow Backed</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-blue-200 font-bold bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
              <CheckCircle2 className="w-4 h-4 text-blue-400" />
              <span>Admin Arbitrated</span>
            </span>
          </div>
        </div>
      </div>

      {/* Filter Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'all', label: language === 'ch' ? 'Malamulo Onse' : 'All Rules' },
          { id: 'farmer', label: language === 'ch' ? 'Alimi (Farmers)' : 'Farmers & Produce' },
          { id: 'buyer', label: language === 'ch' ? 'Ogula (Buyers)' : 'Buyers & Escrow' },
          { id: 'transporter', label: language === 'ch' ? 'Onyamula (Transporters)' : 'Transporters & Logistics' },
          { id: 'platform', label: language === 'ch' ? 'Commission & Chitetezo' : 'Platform & Fees' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveCategory(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeCategory === tab.id
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'bg-white text-stone-600 hover:bg-stone-200/70 border border-stone-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Rules Grid */}
      <div className="space-y-5">
        {filteredRules.map((rule) => {
          const RuleIcon = rule.icon;
          return (
            <div
              key={rule.id}
              className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-xs space-y-4 hover:border-emerald-300 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <RuleIcon className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-stone-900">{rule.title}</h3>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                    Mberalink Binding Trading Code
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {rule.points.map((point, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/70 text-xs text-stone-700 leading-relaxed flex items-start gap-2.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Direct Administrative Assistance Banner */}
      <div className="rounded-3xl bg-emerald-50 border border-emerald-200 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-5">
        <div className="space-y-1.5 text-center sm:text-left">
          <h4 className="font-extrabold text-stone-900 text-base">
            {language === 'ch' ? 'Kodi muli ndi funso pa malamulo kapena ndondomeko?' : 'Questions or Need Dispute Mediation?'}
          </h4>
          <p className="text-xs text-stone-600 max-w-xl">
            {language === 'ch'
              ? 'Lumikizanani mwachindunji ndi oyang\'anira akulu Peter Malikebu ndi Joshua Malikebu kudzera pa desiki lothandizira.'
              : 'Our executive desk provides direct dispute mediation, scale verification assistance, and trade guidance across all districts.'}
          </p>
        </div>
        {onContactClick && (
          <button
            onClick={onContactClick}
            className="px-6 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md transition-all shrink-0 flex items-center gap-2"
          >
            <Phone className="w-4 h-4" />
            <span>{language === 'ch' ? 'Onani Malumikizidwe & Maofesi' : 'Contact Administration'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
