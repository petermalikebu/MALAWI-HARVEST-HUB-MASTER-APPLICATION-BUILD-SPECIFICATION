import React, { useState } from 'react';
import { Phone, X, RefreshCw, Send, ArrowLeft, Smartphone, Radio, ShieldCheck } from 'lucide-react';

interface UssdKeypadSimulatorProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPhone?: string;
  defaultFarmerName?: string;
}

export const UssdKeypadSimulator: React.FC<UssdKeypadSimulatorProps> = ({
  isOpen,
  onClose,
  defaultPhone = '+265 993 210 302',
  defaultFarmerName = 'Joyce Gondwe (Zomba)',
}) => {
  const [phoneNumber, setPhoneNumber] = useState(defaultPhone);
  const [dialCode, setDialCode] = useState('*265#');
  const [sessionActive, setSessionActive] = useState(false);
  const [screenText, setScreenText] = useState('');
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionHistory, setSessionHistory] = useState<string[]>([]);

  if (!isOpen) return null;

  const handleDial = async () => {
    if (!dialCode.trim()) return;
    setLoading(true);
    setSessionHistory([]);
    try {
      const res = await fetch('/api/agent/ussd-simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber,
          text: '',
        }),
      });
      const data = await res.json();
      setSessionActive(true);
      setScreenText(data.response || 'No response from telecom USSD gateway.');
      setUserInput('');
    } catch (err) {
      setScreenText('Connection failed. Could not reach Mberalink telecom gateway.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendInput = async (inputToSend?: string) => {
    const val = inputToSend !== undefined ? inputToSend : userInput;
    if (!val.trim()) return;

    setLoading(true);
    setSessionHistory((prev) => [...prev, `> ${val}`]);
    try {
      const res = await fetch('/api/agent/ussd-simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber,
          text: val.trim(),
        }),
      });
      const data = await res.json();
      setScreenText(data.response || 'Session terminated.');
      setUserInput('');
      if (!data.continueSession) {
        // Session ended
      }
    } catch (err) {
      setScreenText('USSD Error: Request timed out.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (char: string) => {
    if (!sessionActive) {
      setDialCode((prev) => prev + char);
    } else {
      setUserInput((prev) => prev + char);
    }
  };

  const handleBackspace = () => {
    if (!sessionActive) {
      setDialCode((prev) => prev.slice(0, -1));
    } else {
      setUserInput((prev) => prev.slice(0, -1));
    }
  };

  const handleReset = () => {
    setSessionActive(false);
    setScreenText('');
    setUserInput('');
    setSessionHistory([]);
    setDialCode('*265#');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 max-w-md w-full shadow-2xl relative text-white space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>Rural Keypad Phone & USSD Simulator</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono font-bold">
                  *265#
                </span>
              </h3>
              <p className="text-[11px] text-stone-400">
                Experience how offline keypad farmers interact with Mberalink without internet
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Farmer Phone Selector */}
        <div className="p-2.5 rounded-2xl bg-stone-950 border border-stone-800 flex items-center justify-between text-xs">
          <div className="space-y-0.5">
            <span className="text-[10px] text-stone-400 uppercase tracking-wider block">Simulated Farmer Phone:</span>
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="bg-transparent font-mono font-bold text-emerald-400 focus:outline-none text-xs w-36"
              placeholder="+265 999 ..."
            />
          </div>
          <div className="text-right">
            <span className="text-[10px] text-stone-400 block">Preset:</span>
            <button
              onClick={() => setPhoneNumber('+265 993 210 302')}
              className="text-[11px] text-amber-400 hover:underline font-semibold"
            >
              Joyce Gondwe (Zomba)
            </button>
          </div>
        </div>

        {/* Physical Phone Casing */}
        <div className="bg-stone-950 p-4 rounded-3xl border-2 border-stone-700 shadow-inner space-y-3.5">
          {/* Top Speaker Grille & Signal */}
          <div className="flex items-center justify-between px-2 text-[10px] text-stone-400 font-mono">
            <span className="flex items-center gap-1 text-emerald-400">
              <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
              <span>TNM / Airtel MW</span>
            </span>
            <div className="w-8 h-1 rounded-full bg-stone-700 mx-auto" />
            <span>🔋 94%</span>
          </div>

          {/* LCD Screen (Monochrome LCD style) */}
          <div className="bg-[#8b9e7b] text-[#1a2e12] p-3 rounded-2xl font-mono text-xs shadow-inner min-h-[170px] flex flex-col justify-between border-2 border-[#768a67]">
            <div className="space-y-1">
              {!sessionActive ? (
                <div className="space-y-2 py-4 text-center">
                  <div className="text-[11px] font-bold uppercase tracking-wider">TNM Mpamba / Airtel Money</div>
                  <div className="text-lg font-black tracking-widest text-[#13230d] py-1 bg-[#819472] rounded-lg">
                    {dialCode || 'ENTER CODE'}
                  </div>
                  <div className="text-[10px] opacity-80">
                    Dial *265# for Mberalink Agricultural Services
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="text-[10px] pb-1 border-b border-[#768a67] flex items-center justify-between font-bold">
                    <span>Mberalink USSD (*265#)</span>
                    <span>{loading ? 'Dialing...' : 'Active'}</span>
                  </div>
                  <div className="whitespace-pre-line text-[11px] leading-tight font-semibold py-1">
                    {screenText}
                  </div>
                </div>
              )}
            </div>

            {/* Input Line if session active */}
            {sessionActive && (
              <div className="pt-1.5 border-t border-[#768a67] flex items-center gap-1">
                <span className="font-bold">&gt;</span>
                <input
                  type="text"
                  autoFocus
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendInput();
                  }}
                  placeholder="Enter option..."
                  className="bg-transparent w-full text-xs font-bold text-[#13230d] focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Control Softkeys (Call / End) */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            {!sessionActive ? (
              <button
                onClick={handleDial}
                disabled={loading || !dialCode}
                className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                <Phone className="w-3.5 h-3.5 fill-current" />
                <span>DIAL CALL</span>
              </button>
            ) : (
              <button
                onClick={() => handleSendInput()}
                disabled={loading || !userInput.trim()}
                className="py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>SEND</span>
              </button>
            )}

            <button
              onClick={handleReset}
              className="py-2.5 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
            >
              <Phone className="w-3.5 h-3.5 rotate-[135deg] fill-current" />
              <span>END / CLEAR</span>
            </button>
          </div>

          {/* 3x4 Number Keypad */}
          <div className="grid grid-cols-3 gap-2 pt-1 font-mono">
            {[
              { num: '1', sub: '.,' },
              { num: '2', sub: 'ABC' },
              { num: '3', sub: 'DEF' },
              { num: '4', sub: 'GHI' },
              { num: '5', sub: 'JKL' },
              { num: '6', sub: 'MNO' },
              { num: '7', sub: 'PQRS' },
              { num: '8', sub: 'TUV' },
              { num: '9', sub: 'WXYZ' },
              { num: '*', sub: '+' },
              { num: '0', sub: 'SPACE' },
              { num: '#', sub: 'DEL' },
            ].map((key) => (
              <button
                key={key.num}
                type="button"
                onClick={() => {
                  if (key.num === '#') {
                    if (!sessionActive && dialCode.endsWith('*265')) {
                      setDialCode((prev) => prev + '#');
                    } else if (sessionActive) {
                      handleBackspace();
                    } else {
                      setDialCode((prev) => prev + '#');
                    }
                  } else {
                    handleKeyPress(key.num);
                  }
                }}
                className="p-2.5 rounded-2xl bg-stone-800 hover:bg-stone-700 active:bg-stone-600 border border-stone-700 text-center transition-all shadow-xs active:scale-95"
              >
                <div className="text-sm font-bold text-stone-100">{key.num}</div>
                <div className="text-[8px] text-stone-400 font-sans tracking-widest">{key.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Feature Explanation Banner */}
        <div className="p-3 bg-stone-950 rounded-2xl border border-stone-800 text-[11px] text-stone-300 space-y-1">
          <div className="font-bold text-amber-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Digital Inclusion for 100% of Malawian Farmers</span>
          </div>
          <p className="leading-relaxed text-stone-400">
            This USSD interface operates on GSM network signaling and works on any basic 2G keypad device (Itel, Nokia torch). Farmers check their produce status, verify market prices, and contact their local district agent at zero internet data cost.
          </p>
        </div>
      </div>
    </div>
  );
};
