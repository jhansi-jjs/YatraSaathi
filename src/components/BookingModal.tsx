import { useState } from 'react';
import { X, CheckCircle2, ShieldCheck, CreditCard, QrCode, Download, Armchair } from 'lucide-react';
import type { BusListingWithRoute } from '../lib/types';
import { useLanguage } from '../context/LanguageContext';

interface BookingModalProps {
  listing: BusListingWithRoute;
  onClose: () => void;
}

export default function BookingModal({ listing, onClose }: BookingModalProps) {
  const { t } = useLanguage();

  const [selectedSeats, setSelectedSeats] = useState<string[]>(['L4']);
  const [passengerName, setPassengerName] = useState('');
  const [passengerAge, setPassengerAge] = useState('');
  const [gender, setGender] = useState('male');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');

  const [isProcessing, setIsProcessing] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [pnrNumber, setPnrNumber] = useState('');

  const seatPrice = listing.price;
  const numSeats = selectedSeats.length || 1;
  const baseFare = seatPrice * numSeats;
  const gst = Math.round(baseFare * 0.05);
  const totalPayable = baseFare + gst;

  const toggleSeat = (seatId: string) => {
    if (selectedSeats.includes(seatId)) {
      if (selectedSeats.length > 1) {
        setSelectedSeats(selectedSeats.filter((s) => s !== seatId));
      }
    } else {
      setSelectedSeats([...selectedSeats, seatId]);
    }
  };

  const handlePayAndConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    setTimeout(() => {
      const generatedPnr = `YS${Math.floor(10000000 + Math.random() * 90000000)}`;
      setPnrNumber(generatedPnr);
      setIsProcessing(false);
      setIsConfirmed(true);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-100 my-8">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {!isConfirmed ? (
          <div>
            <div className="border-b border-slate-100 pb-4 mb-6">
              <span className="badge bg-blue-50 text-[#0066ff] font-semibold text-xs mb-1">
                {listing.ota_source} Partner Booking
              </span>
              <h2 className="text-xl font-extrabold text-slate-900">
                {listing.operator_name} ({listing.routes.origin_city} → {listing.routes.destination_city})
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {listing.departure_time} · {listing.bus_type.toUpperCase()} · {listing.ac_status.toUpperCase()}
              </p>
            </div>

            <form onSubmit={handlePayAndConfirm} className="flex flex-col gap-6">
              {/* Seat Selection */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Armchair className="h-4 w-4 text-[#0066ff]" /> {t('selectSeatTitle')}
                </h3>
                <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 border border-slate-200/60">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-2">{t('lowerBerth')}</p>
                    <div className="grid grid-cols-3 gap-2">
                      {['L1', 'L2', 'L3', 'L4', 'L5', 'L6'].map((seat) => (
                        <button
                          key={seat}
                          type="button"
                          onClick={() => toggleSeat(seat)}
                          className={`rounded-lg py-2 text-xs font-bold transition-all ${
                            selectedSeats.includes(seat)
                              ? 'bg-[#0066ff] text-white shadow-md scale-105'
                              : 'bg-white text-slate-700 border border-slate-200 hover:border-blue-400'
                          }`}
                        >
                          {seat}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-2">{t('upperBerth')}</p>
                    <div className="grid grid-cols-3 gap-2">
                      {['U1', 'U2', 'U3', 'U4', 'U5', 'U6'].map((seat) => (
                        <button
                          key={seat}
                          type="button"
                          onClick={() => toggleSeat(seat)}
                          className={`rounded-lg py-2 text-xs font-bold transition-all ${
                            selectedSeats.includes(seat)
                              ? 'bg-[#0066ff] text-white shadow-md scale-105'
                              : 'bg-white text-slate-700 border border-slate-200 hover:border-blue-400'
                          }`}
                        >
                          {seat}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-xs font-semibold text-[#0066ff] mt-2">
                  {t('selectedSeats')}: {selectedSeats.join(', ')} ({selectedSeats.length} seats)
                </p>
              </div>

              {/* Passenger Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">{t('passengerName')}</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter full name"
                    value={passengerName}
                    onChange={(e) => setPassengerName(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">{t('mobileNumber')}</label>
                  <input
                    type="tel"
                    required
                    placeholder="10-digit mobile no."
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">{t('emailAddress')}</label>
                  <input
                    type="email"
                    required
                    placeholder="ticket@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">{t('passengerAge')}</label>
                  <input
                    type="number"
                    required
                    min={5}
                    max={99}
                    placeholder="Age (e.g. 28)"
                    value={passengerAge}
                    onChange={(e) => setPassengerAge(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>

              {/* Payment Methods */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-[#0066ff]" /> {t('paymentMethod')}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label
                    onClick={() => setPaymentMethod('upi')}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      paymentMethod === 'upi'
                        ? 'border-[#0066ff] bg-blue-50/50 text-[#0066ff] font-bold'
                        : 'border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <QrCode className="h-5 w-5" />
                    <span className="text-xs">{t('upiPay')}</span>
                  </label>

                  <label
                    onClick={() => setPaymentMethod('card')}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      paymentMethod === 'card'
                        ? 'border-[#0066ff] bg-blue-50/50 text-[#0066ff] font-bold'
                        : 'border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <CreditCard className="h-5 w-5" />
                    <span className="text-xs">{t('cardPay')}</span>
                  </label>

                  <label
                    onClick={() => setPaymentMethod('netbanking')}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      paymentMethod === 'netbanking'
                        ? 'border-[#0066ff] bg-blue-50/50 text-[#0066ff] font-bold'
                        : 'border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <ShieldCheck className="h-5 w-5" />
                    <span className="text-xs">{t('netBanking')}</span>
                  </label>
                </div>
              </div>

              {/* Price Summary & Submit */}
              <div className="rounded-xl bg-slate-900 text-white p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
                <div>
                  <p className="text-xs text-slate-400">
                    {t('baseFare')}: ₹{baseFare} + GST (5%): ₹{gst}
                  </p>
                  <p className="text-xl font-black text-emerald-400">
                    {t('totalPayable')}: ₹{totalPayable.toLocaleString('en-IN')}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full sm:w-auto btn-primary px-8 py-3 bg-gradient-to-r from-blue-600 to-emerald-500 hover:scale-105 text-white font-extrabold shadow-lg disabled:opacity-50"
                >
                  {isProcessing ? 'Processing Payment...' : `${t('confirmPay')} (₹${totalPayable})`}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Confirmation Ticket View */
          <div className="flex flex-col items-center text-center py-6 animate-scale-in">
            <div className="h-16 w-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 shadow-lg">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">{t('ticketConfirmed')}</h2>
            <p className="text-sm font-semibold text-slate-500 mt-1">
              Your bus ticket has been generated & sent to {email || mobile}
            </p>

            <div className="w-full rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 my-6 text-left shadow-2xl border border-white/10">
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                <div>
                  <p className="text-xs text-blue-300 font-semibold">{t('pnrNumber')}</p>
                  <p className="text-xl font-black text-amber-400">{pnrNumber}</p>
                </div>
                <div className="text-right">
                  <span className="badge bg-emerald-500 text-white font-bold">{listing.ota_source} Confirmed</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-slate-400">Route</p>
                  <p className="font-bold text-white text-sm">{listing.routes.origin_city} → {listing.routes.destination_city}</p>
                </div>
                <div>
                  <p className="text-slate-400">Operator & Bus</p>
                  <p className="font-bold text-white text-sm">{listing.operator_name}</p>
                </div>
                <div>
                  <p className="text-slate-400">Seats</p>
                  <p className="font-bold text-emerald-400 text-sm">{selectedSeats.join(', ')}</p>
                </div>
                <div>
                  <p className="text-slate-400">Passenger</p>
                  <p className="font-bold text-white text-sm">{passengerName || 'Passenger'} ({passengerAge || '25'} yrs)</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                <p className="text-xs text-slate-400">Total Paid: <span className="text-white font-bold">₹{totalPayable}</span></p>
                <div className="flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                  <ShieldCheck className="h-4 w-4" /> 100% Verified OTA Booking
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => alert(`Downloading PDF Ticket for PNR: ${pnrNumber}`)}
                className="btn-primary flex items-center gap-2"
              >
                <Download className="h-4 w-4" /> {t('downloadTicket')}
              </button>
              <button onClick={onClose} className="btn-secondary">
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
