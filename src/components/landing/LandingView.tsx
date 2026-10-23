import React, { useState, useEffect } from 'react';
import { Commodity } from '../../types/index.ts';
import { safeParseJson } from '../../lib/api.ts';
import { useLanguage } from '../../context/LanguageContext.tsx';
import {
  Sprout,
  ShoppingCart,
  Truck,
  ShieldCheck,
  ArrowRight,
  MapPin,
  CheckCircle2,
  Lock,
  Coins,
  LogIn,
  Package,
} from 'lucide-react';

interface LandingViewProps {
  onOpenSignIn: () => void;
  onExploreMarketplace?: () => void;
  onOpenRules?: () => void;
  onOpenContact?: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  onOpenSignIn,
  onExploreMarketplace,
  onOpenRules,
  onOpenContact,
}) => {
  const { t, language } = useLanguage();
  const [featuredCommodities, setFeaturedCommodities] = useState<Commodity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        const res = await fetch('/api/commodities?status=available');
        if (res.ok) {
          const list: Commodity[] = await safeParseJson(res, []);
          setFeaturedCommodities(list.slice(0, 6));
        }
      } catch (err) {
        console.error('Failed to load featured commodities:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPreview();
  }, []);

  return (
    <div className="space-y-12 pb-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900 via-green-900 to-stone-900 text-white p-8 sm:p-12 md:p-16 shadow-xl border border-emerald-800/40">
        <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px] opacity-15" />
        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold tracking-wide">
            <Sprout className="w-4 h-4 text-emerald-400" />
            <span>Mberalink • Malawi's Premier Agricultural Digital Exchange</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
            {language === 'ch'
              ? 'Mberalink: Kulunzanitsa Alimi, Ogula Katundu Wambiri & Onyamula pa Galimoto ku Malawi'
              : 'Mberalink: Connecting Malawian Farmers, Commercial Buyers & Freight Transporters'}
          </h1>

          <p className="text-stone-200 text-sm sm:text-base leading-relaxed">
            {language === 'ch'
              ? 'Malipiro otetezedwa a escrow, mitengo yowonekera bwino ya m\'minda, mayendedwe achindunji a katundu, ndi chitetezo m\'maboma onse 28 a Malawi.'
              : 'Secure escrow payments, transparent farmgate prices, direct transport logistics, and guaranteed settlement across all 28 districts of Malawi.'}
          </p>

          <div className="flex flex-wrap gap-3.5 pt-2">
            <button
              onClick={onOpenSignIn}
              className="px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-extrabold text-sm flex items-center gap-2.5 transition-all shadow-lg active:scale-95"
            >
              <LogIn className="w-4 h-4" />
              <span>{t('landing_btn_signin', 'Sign In / Join Hub')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            {onExploreMarketplace && (
              <button
                onClick={onExploreMarketplace}
                className="px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm border border-white/20 transition-all flex items-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>{t('landing_btn_explore', 'Explore Marketplace')}</span>
              </button>
            )}
            {onOpenRules && (
              <button
                onClick={onOpenRules}
                className="px-5 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm border border-white/20 transition-all flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-300" />
                <span>{language === 'ch' ? 'Malamulo a Nsanja' : 'Rules & Standards'}</span>
              </button>
            )}
            {onOpenContact && (
              <button
                onClick={onOpenContact}
                className="px-5 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm border border-white/20 transition-all flex items-center gap-2"
              >
                <span>{language === 'ch' ? 'Malumikizidwe & Maofesi' : 'Contact Directory'}</span>
              </button>
            )}
          </div>

          {/* Quick Pillars */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-emerald-800/60 text-xs">
            <div className="space-y-0.5">
              <span className="text-emerald-400 font-extrabold text-lg">28 Districts</span>
              <p className="text-stone-300 text-[11px]">{language === 'ch' ? 'Malawi konse' : 'Nationwide coverage'}</p>
            </div>
            <div className="space-y-0.5">
              <span className="text-emerald-400 font-extrabold text-lg">4% Escrow</span>
              <p className="text-stone-300 text-[11px]">{language === 'ch' ? 'Malipiro otetezeka' : 'Capped transaction fee'}</p>
            </div>
            <div className="space-y-0.5">
              <span className="text-emerald-400 font-extrabold text-lg">TNM &amp; Airtel</span>
              <p className="text-stone-300 text-[11px]">{language === 'ch' ? 'Ndalama pa foni' : 'Integrated mobile money'}</p>
            </div>
            <div className="space-y-0.5">
              <span className="text-emerald-400 font-extrabold text-lg">1 - 30 Ton</span>
              <p className="text-stone-300 text-[11px]">{language === 'ch' ? 'Magalimoto odalirika' : 'Verified truck fleet'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Role Value Propositions */}
      <section className="space-y-6">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <h2 className="text-2xl font-bold text-stone-900">
            {language === 'ch'
              ? 'Kulimbikitsa Aliyense pa Malonda ndi Mayendedwe a Ulimi'
              : 'Empowering Every Participant in the Agricultural Supply Chain'}
          </h2>
          <p className="text-xs sm:text-sm text-stone-600">
            {language === 'ch'
              ? 'Lowani kapena tsegulani akaunti yanu lero kuti muyambe kugulitsa, kugula, kapena kunyamula katundu.'
              : 'Sign in or create your specialized account to start trading, buying, or transporting produce today.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Farmers */}
          <div className="bg-white rounded-3xl border border-stone-200 p-6 space-y-4 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <Sprout className="w-6 h-6 text-emerald-700" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base">{t('role_farmer')}</h3>
              <p className="text-xs text-stone-500 mt-1">
                {language === 'ch'
                  ? 'Kugulitsa mwachindunji pamsika ndi kulandira ndalama zotsimikizika'
                  : 'Direct market access with guaranteed payments'}
              </p>
            </div>
            <ul className="text-xs text-stone-600 space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{language === 'ch' ? 'Gulititsani chimanga, mpunga, mtedza, soya & nyemba' : 'List maize, rice, groundnuts, soya & horticulture'}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{language === 'ch' ? 'Ndalama za wogula zimasungidwa mu escrow musanatumize' : 'Buyer funds held in 4% escrow before dispatch'}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{language === 'ch' ? 'Lembani magalimoto odalirika kuchokera pafamu panu' : 'Book verified transporters right from your depot'}</span>
              </li>
            </ul>
            <button
              onClick={onOpenSignIn}
              className="w-full py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs transition-colors flex items-center justify-center gap-2"
            >
              <span>{language === 'ch' ? 'Lowani Monga Mlimi' : 'Join as Farmer'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Buyers */}
          <div className="bg-white rounded-3xl border border-stone-200 p-6 space-y-4 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <ShoppingCart className="w-6 h-6 text-amber-700" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base">{t('role_buyer')}</h3>
              <p className="text-xs text-stone-500 mt-1">
                {language === 'ch'
                  ? 'Kugula zokolola zambiri zabwino mwachindunji ndi mtendere'
                  : 'Wholesale bulk sourcing with quality verification'}
              </p>
            </div>
            <ul className="text-xs text-stone-600 space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>{language === 'ch' ? 'Onani zokolola zatsopano zochokera kwa alimi ovomerezeka' : 'Browse live inventory from verified farming cooperatives'}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>{language === 'ch' ? 'Ikani ndalama mu escrow (National Bank / Airtel / TNM)' : 'Deposit to secure escrow (National Bank / Airtel / TNM)'}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>{language === 'ch' ? 'Phatikizani kugula zokolola pamodzi ndi mayendedwe' : 'Combine commodity purchase with freight delivery'}</span>
              </li>
            </ul>
            <button
              onClick={onOpenSignIn}
              className="w-full py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs transition-colors flex items-center justify-center gap-2"
            >
              <span>{language === 'ch' ? 'Lowani Monga Wogula Zokolola' : 'Join as Commercial Buyer'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Transporters */}
          <div className="bg-white rounded-3xl border border-stone-200 p-6 space-y-4 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
              <Truck className="w-6 h-6 text-blue-700" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base">{t('role_transporter')}</h3>
              <p className="text-xs text-stone-500 mt-1">
                {language === 'ch'
                  ? 'Ntchito zodalirika za katundu wa ulimi ndi kulipidwa mwachangu'
                  : 'Steady agricultural haulage jobs with prompt payouts'}
              </p>
            </div>
            <ul className="text-xs text-stone-600 space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>{language === 'ch' ? 'Pezani ntchito zonyamula katundu kuchoka kumidzi kupita m\'mizinda' : 'Access delivery jobs from rural depots to city hubs'}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>{language === 'ch' ? 'Ndalama zanu zimatulutsidwa nthawi yomweyo mukangopereka katundu' : 'Guaranteed freight fees released immediately on delivery'}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>{language === 'ch' ? 'Magalimoto a pickups, matani 3-5, mpaka magalimoto akulu a matani 30' : 'Support for pickups, 3-5T trucks, to 30T articulated trailers'}</span>
              </li>
            </ul>
            <button
              onClick={onOpenSignIn}
              className="w-full py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold text-xs transition-colors flex items-center justify-center gap-2"
            >
              <span>{language === 'ch' ? 'Lowani Monga Wonyamula Katundu' : 'Join as Freight Transporter'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* Live Produce Preview */}
      <section className="bg-stone-50/80 rounded-3xl border border-stone-200/80 p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-lg font-bold text-stone-900">
                {t('landing_live_produce_title', 'Fresh Agricultural Produce Available Now')}
              </h3>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              {t('landing_live_produce_subtitle', 'Direct farmgate listings with verified weights, moisture levels, and quality certifications.')}
            </p>
          </div>
          <button
            onClick={onOpenSignIn}
            className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-bold transition-colors flex items-center gap-2 shrink-0 self-start sm:self-auto"
          >
            <span>{language === 'ch' ? 'Lowani Kuti Muitanitse Oda' : 'Sign In to Place Orders'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-stone-500">
            {t('common_loading')}
          </div>
        ) : featuredCommodities.length === 0 ? (
          <div className="py-8 text-center text-xs text-stone-500">
            {language === 'ch'
              ? 'Palibe zokolola pakali pano. Lowani monga mlimi kuti muike mbewu zanu!'
              : 'No active commodities listed at this moment. Sign in as a farmer to post produce!'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredCommodities.map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-2xl border border-stone-200 p-4 space-y-3 shadow-xs hover:border-emerald-300 transition-colors"
              >
                {c.imageUrl && (
                  <img
                    src={c.imageUrl}
                    alt={c.commodityName}
                    className="w-full h-36 object-cover rounded-xl"
                  />
                )}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                      {t(c.category)}
                    </span>
                    <h4 className="font-bold text-stone-900 text-sm mt-1">{t(c.commodityName)}</h4>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-extrabold text-stone-900">
                      MK {Number(c.pricePerUnit).toLocaleString()}
                    </span>
                    <p className="text-[10px] text-stone-500">
                      {t('landing_card_price_per', 'Price per')} {t(c.unit)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-stone-500 pt-2 border-t border-stone-100">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-stone-400" />
                    <span>{t(c.district)}</span>
                  </div>
                  <span className="font-semibold text-stone-700">
                    {c.quantity} {t(c.unit)} {language === 'ch' ? 'zilipo' : 'available'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Escrow Guarantee & Administrator Oversight */}
      <section className="bg-gradient-to-r from-stone-900 via-stone-800 to-emerald-950 text-white rounded-3xl p-8 sm:p-10 space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{language === 'ch' ? 'Dongosolo Lovomerezeka la Escrow 4% • Oyang\'anira Akulu' : 'Official 4% Escrow System • Lead Administrators'}</span>
            </div>
            <h3 className="text-2xl font-bold tracking-tight">
              {language === 'ch'
                ? 'Malonda Otetezedwa & Chithandizo Chachindunji'
                : 'Regulated Transactions & Dedicated Help Desk'}
            </h3>
            <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
              {language === 'ch'
                ? 'Oda iliyonse imayang\'aniridwa ndi oyang\'anira a pa nsanja Peter Malikebu & Joshua Malikebu. Ndalama zimakhala zotetezeka mu escrow mpaka khalidwe la zokolola litsimikizidwe mukalandira.'
                : 'Every order is overseen by platform administrators Peter Malikebu & Joshua Malikebu. Funds remain in secure escrow until produce quality is verified upon delivery. Password resets, identity verifications, and disputes are approved with full audit transparency.'}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur rounded-2xl border border-white/20 p-5 space-y-3 text-xs w-full md:w-80 shrink-0">
            <div className="font-bold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>{language === 'ch' ? 'Maakaunti a Escrow a Boma' : 'Official Financial Escrow'}</span>
            </div>
            <div className="space-y-1 text-stone-300 text-[11px]">
              <p>National Bank of Malawi Acc: <span className="font-mono text-white">1011619688</span></p>
              <p>Account Holder: <span className="font-semibold text-white">PETER ADRIAN MALIKEBU</span></p>
              <p>Airtel Money: <span className="font-mono text-white">+265 999 036 912</span></p>
              <p>TNM Mpamba: <span className="font-mono text-white">+265 895 357 535</span></p>
            </div>
            <button
              onClick={onOpenSignIn}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-xs transition-colors flex items-center justify-center gap-2"
            >
              <span>{t('landing_btn_signin')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
