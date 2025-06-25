
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useCallback, useEffect } from 'react';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import EventPage from './pages/EventPage';
import BusinessMatchingPage from './pages/BusinessMatchingPage';
import HelpPage from './pages/HelpPage';
import Footer from './components/Footer';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage, { DashboardViewId as DashboardViewIdCreatorVisitor } from './pages/DashboardPage'; // Renamed import
import BusinessMatchingDashboardPage, { DashboardViewIdBM } from './pages/dashboard-bm/BusinessMatchingDashboardPage'; // New BM Dashboard
import EventDetailPage from './pages/EventDetailPage';
import CheckoutPage from './pages/CheckoutPage';
import PaymentLoadingPage from './pages/PaymentLoadingPage';
import TransactionSuccessPage from './pages/TransactionSuccessPage';
import TicketDisplayPage from './pages/TicketDisplayPage';
import CreateEventInfoPage from './pages/CreateEventInfoPage';
import ArticleListPage from './pages/ArticleListPage';
import ConfirmationModal from './components/ConfirmationModal';
import SubscriptionModal from './components/SubscriptionModal';
import FloatingHelpButton from './components/FloatingHelpButton';
import AuthSelectionModal from './components/auth/AuthSelectionModal';
import CreatorAuthPage from './pages/CreatorAuthPage';
import OtpInputPage from './pages/OtpInputPage';
import OtpInputModal from './components/OtpInputModal'; // New OTP Modal
import Home from './Home';
import FullScreenLoader from './components/FullScreenLoader';
import { BusinessMatchingCardData } from './components/BusinessMatchingCard';
import CompanyDetailPage from './pages/business-matching/CompanyDetailPage';
import RoleSwitchModal from './components/RoleSwitchModal';
import OrganizationVerificationModal from './components/auth/OrganizationVerificationModal';
import { ShoppingCart, Users, UserCog, PlusCircle, AlertTriangle } from 'lucide-react';


// Define core data types here or import from a types file
export interface TicketCategory {
  id: string;
  name: string;
  price: number;
  description?: string;
  maxQuantity?: number; // Max available for this category
  availabilityStatus?: 'sold-out' | 'almost-sold' | 'available'; // New prop
}

export interface EventData {
  id: number;
  category: 'B2C' | 'B2B' | 'B2G';
  name:string;
  location: string; // Main location name, e.g. "Rooftop ITC Depok"
  posterUrl?: string; // User provided URL for poster
  coverImageUrl?: string; // For uploaded image data URL / future path
  summary?: string;
  googleMapsQuery?: string;
  dateDisplay: string; // e.g., "2024/08/17" or "2024/08/17 - 2024/08/19"
  timeDisplay: string; // e.g., "19:00" or "09:00 - 17:00" or "09:00 - Selesai"
  timezone?: string; // e.g., "WIB", "WITA", "WIT"
  parkingAvailable?: boolean;
  ageRestriction?: string;
  arrivalInfo?: string;
  fullDescription: string;
  ticketCategories: TicketCategory[];
  displayPrice: string;
  organizerName?: string;
  organizerLogoUrl?: string;
  termsAndConditions?: string;
  // Dashboard specific fields now part of core EventData
  status: 'Draf' | 'Aktif' | 'Selesai';
  theme: string; // e.g., Festival, Konser, Seminar
  address: string; // Full address for display
  // New fields from form
  eventSlug?: string; // User-defined part of the URL
  narahubungName?: string;
  narahubungPhone?: string;
  narahubungEmail?: string;
  quotaProgress?: number; // For EventCard
  discountedPrice?: string; // For EventCard
}


export interface SelectedTicket {
  categoryId: string;
  categoryName: string;
  quantity: number;
  pricePerTicket: number;
}

export interface CheckoutInfo {
  event: EventData;
  selectedTickets: SelectedTicket[];
  totalPrice: number; // This will be the original total price before any coupon
}

export interface TransactionFormData {
  fullName: string;
  email: string;
  phoneNumber: string;
  gender?: string;
  dateOfBirth?: string;
  additionalTicketHolders?: Array<{
    fullName: string;
    whatsAppNumber: string;
  }>;
}

export interface TransactionData {
  checkoutInfo: CheckoutInfo; // This CheckoutInfo will contain the final price after discount
  formData: TransactionFormData;
  transactionId: string;
  orderId: string;
}


export type PageName =
  'landing' | 'events' | 'business' | 'help' |
  'login' | 'signup' | 'otpInput' | 'creatorAuth' | 
  'dashboard' |
  'eventDetail' | 'checkout' |
  'paymentLoading' | 'transactionSuccess' | 'ticketDisplay' |
  'createEventInfo' |
  'articlesPage' |
  'businessDetail' |
  'home';

export type UserRole = 'visitor' | 'creator' | 'organization' | null;
export type AuthRoleType = "Event Visitor" | "Event Creator" | "Organization";

export const mapAuthRoleToUserRole = (authRole: AuthRoleType | UserRole): UserRole => {
  if (authRole === 'visitor' || authRole === 'creator' || authRole === 'organization') {
    return authRole;
  }
  switch (authRole) {
    case "Event Visitor": return "visitor";
    case "Event Creator": return "creator";
    case "Organization": return "organization";
    default: return null;
  }
};

interface PendingNavigationTarget {
  page: PageName;
  data?: any;
  resetCallback?: () => void;
}

export function formatEventTime(timeDisplay: string | undefined, timezone?: string | undefined): string {
  if (!timeDisplay || typeof timeDisplay !== 'string') return 'Informasi waktu tidak tersedia';

  const originalTimeDisplay = timeDisplay;
  let processedTimeDisplay = timeDisplay.replace(/^Mulai\s+/i, '').trim();
  let tzSuffix = timezone ? ` ${timezone.toUpperCase()}` : '';

  const timezoneRegex = /\b(WIB|WITA|WIT)\b/i;
  const tzMatch = processedTimeDisplay.match(timezoneRegex);
  if (tzMatch) {
    tzSuffix = ` ${tzMatch[0].toUpperCase()}`;
    processedTimeDisplay = processedTimeDisplay.replace(timezoneRegex, '').trim();
  }

  const extraInfoRegex = /\s*\(([^)]+)\)\s*$/;
  let extraInfo = '';
  const extraMatch = processedTimeDisplay.match(extraInfoRegex);
  if (extraMatch) {
    extraInfo = ` (${extraMatch[1].trim()})`;
    processedTimeDisplay = processedTimeDisplay.replace(extraInfoRegex, '').trim();
  }

  const timePattern = /(\d{1,2}:\d{2})/;

  if (processedTimeDisplay.includes(' - ')) {
    const parts = processedTimeDisplay.split(/\s+-\s+/);
    const startTimeMatch = parts[0].match(timePattern);

    if (startTimeMatch) {
      const startTime = startTimeMatch[0];
      let endTimeStr = parts[1].trim();

      if (endTimeStr.match(timePattern)) {
        return `${startTime} - ${endTimeStr}${tzSuffix}${extraInfo}`;
      } else if (endTimeStr.toLowerCase() === 'selesai') {
        return `${startTime} - Selesai${tzSuffix}${extraInfo}`;
      } else {
        return `${startTime} - Selesai${tzSuffix}${extraInfo}`;
      }
    }
  } else {
    const singleTimeMatch = processedTimeDisplay.match(timePattern);
    if (singleTimeMatch && processedTimeDisplay.trim() === singleTimeMatch[0]) {
      return `${singleTimeMatch[0]} - Selesai${tzSuffix}${extraInfo}`;
    }
  }
  return `${originalTimeDisplay}`;
}

const sampleEvents: EventData[] = [
  {
    id: 1, category: 'B2C', name: 'Local Soundscape: Indie Music Night',
    location: 'Rooftop ITC Depok', posterUrl: 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=60',
    coverImageUrl: 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=450&q=80',
    dateDisplay: '2025/06/28 - 2025/06/29', timeDisplay: '15:00 - 22:00', timezone: 'WIB',
    fullDescription: 'Nikmati malam penuh alunan musik indie dari band-band lokal berbakat di Depok. Suasana rooftop yang cozy dengan city view menawan. Tersedia berbagai tenant makanan dan minuman.',
    ticketCategories: [
      { id: 'regular', name: 'Regular', price: 75000, description: 'Akses masuk reguler.', availabilityStatus: 'available' },
      { id: 'vip', name: 'VIP', price: 150000, description: 'Akses VIP, free drink, dan merchandise.', availabilityStatus: 'almost-sold' }
    ],
    displayPrice: 'Rp 75.000',
    organizerName: 'Kolektif Musik Depok',
    organizerLogoUrl: 'https://picsum.photos/seed/kmd/50/50',
    summary: 'Konser musik indie dengan suasana rooftop dan pemandangan kota.',
    googleMapsQuery: 'ITC Depok, Jawa Barat',
    parkingAvailable: true, ageRestriction: '18+', arrivalInfo: 'Pintu masuk dari Lobby Utara ITC Depok, naik lift ke lantai paling atas.',
    status: 'Aktif', theme: 'Konser Musik', address: 'Jl. Margonda Raya No.56, Depok, Kec. Pancoran Mas, Kota Depok, Jawa Barat 16431',
    termsAndConditions: 'Dilarang membawa makanan dan minuman dari luar. Dilarang membawa senjata tajam dan obat-obatan terlarang. Tiket yang sudah dibeli tidak dapat dikembalikan.',
    eventSlug: 'local-soundscape-depok', narahubungName: 'Panitia Soundscape', narahubungPhone: '081200001111', narahubungEmail: 'info@localsound.id'
  },
  {
    id: 2, category: 'B2B', name: 'Creator Connect 2025',
    location: 'Margo City Depok', posterUrl: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=60',
    coverImageUrl: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=450&q=80',
    dateDisplay: '2025/07/19', timeDisplay: '09:00 - 17:00', timezone: 'WIB',
    fullDescription: 'Konferensi tahunan untuk para content creator, influencer, dan agensi. Sesi networking, workshop, dan diskusi panel dengan para ahli di industri kreatif digital.',
    ticketCategories: [
      { id: 'early-bird-creator', name: 'Early Bird Creator Pass', price: 200000, description: 'Akses semua sesi, berlaku hingga 30 Juni.', availabilityStatus: 'sold-out' },
      { id: 'creator-pass', name: 'Creator Pass', price: 250000, description: 'Akses semua sesi konferensi.', availabilityStatus: 'available' },
      { id: 'business-pass', name: 'Business Pass', price: 500000, description: 'Akses semua sesi + area networking B2B.', availabilityStatus: 'available' }
    ],
    displayPrice: 'Mulai Rp 250.000',
    organizerName: 'Hegira Event Management',
    organizerLogoUrl: '/image/hegiralogo.png',
    summary: 'Konferensi networking dan workshop untuk content creator & influencer.',
    googleMapsQuery: 'Margo City, Depok',
    parkingAvailable: true, ageRestriction: '17+', arrivalInfo: 'Registrasi di Main Atrium Margo City, lantai dasar.',
    status: 'Aktif', theme: 'Konferensi & Workshop', address: 'Jl. Margonda Raya No.358, Kemiri Muka, Kecamatan Beji, Kota Depok, Jawa Barat 16423',
    eventSlug: 'creator-connect-2025', narahubungName: 'Tim Hegira Events', narahubungPhone: '081211112222', narahubungEmail: 'events@hegira.com'
  },
  {
    id: 3, category: 'B2G', name: 'Forum Digitalisasi UMKM Nasional',
    location: 'Hotel Indonesia Kempinski, Jakarta', posterUrl: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=60',
    coverImageUrl: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=450&q=80',
    dateDisplay: '2025/08/25 - 2025/08/26', timeDisplay: '08:30 - 17:00', timezone: 'WIB',
    fullDescription: 'Forum strategis yang mempertemukan perwakilan pemerintah, pelaku UMKM, dan penyedia teknologi untuk akselerasi transformasi digital UMKM di Indonesia. Diskusi kebijakan, showcase solusi, dan business matching.',
    ticketCategories: [
      { id: 'umkm-delegate', name: 'Delegasi UMKM', price: 0, description: 'Gratis untuk UMKM terpilih (perlu registrasi & seleksi).', availabilityStatus: 'available' },
      { id: 'gov-delegate', name: 'Delegasi Pemerintah', price: 0, description: 'Khusus perwakilan instansi pemerintah.', availabilityStatus: 'available' },
      { id: 'tech-provider', name: 'Penyedia Teknologi/Umum', price: 750000, description: 'Akses ke semua sesi dan area pameran.', availabilityStatus: 'available' }
    ],
    displayPrice: 'Gratis / Rp 750.000',
    organizerName: 'Kementerian Koperasi dan UKM & Hegira',
    organizerLogoUrl: 'https://picsum.photos/seed/kemenkop/50/50',
    summary: 'Forum pemerintah & UMKM untuk akselerasi transformasi digital.',
    googleMapsQuery: 'Hotel Indonesia Kempinski Jakarta',
    status: 'Draf', theme: 'Forum & Pameran', address: 'Jl. M.H. Thamrin No.1, Menteng, Kec. Menteng, Kota Jakarta Pusat, Daerah Khusus Ibukota Jakarta 10310',
    eventSlug: 'forum-umkm-digital-2025', narahubungName: 'Sekretariat Forum', narahubungPhone: '0215550011', narahubungEmail: 'info@forumumkm.go.id'
  },
   {
    id: 4, category: 'B2C', name: 'Pameran Seni Kontemporer "RuangRupa"',
    location: 'Galeri Nasional Indonesia, Jakarta', posterUrl: 'https://images.unsplash.com/photo-1547891654-e66ed7ebb968?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=60',
    coverImageUrl: 'https://images.unsplash.com/photo-1547891654-e66ed7ebb968?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=450&q=80',
    dateDisplay: '2025/09/05 - 2025/09/15', timeDisplay: '10:00 - 19:00', timezone: 'WIB',
    fullDescription: 'Pameran seni rupa kontemporer yang menampilkan karya-karya terbaru dari seniman muda Indonesia. Instalasi, lukisan, patung, dan seni media baru.',
    ticketCategories: [
      { id: 'student-pass', name: 'Pelajar/Mahasiswa', price: 25000, description: 'Wajib menunjukkan kartu pelajar/mahasiswa aktif.', availabilityStatus: 'available' },
      { id: 'general-admission', name: 'Umum', price: 50000, description: 'Tiket masuk reguler.', availabilityStatus: 'available' }
    ],
    displayPrice: 'Mulai Rp 25.000',
    organizerName: 'Komunitas Seniman Jakarta',
    organizerLogoUrl: 'https://picsum.photos/seed/ksj/50/50',
    summary: 'Pameran karya seni kontemporer dari seniman muda Indonesia.',
    googleMapsQuery: 'Galeri Nasional Indonesia',
    status: 'Aktif', theme: 'Pameran Seni', address: 'Jl. Medan Merdeka Tim. No.14, Gambir, Kecamatan Gambir, Kota Jakarta Pusat, Daerah Khusus Ibukota Jakarta 10110',
    eventSlug: 'ruangrupa-art-exhibition', narahubungName: 'Kurator Pameran', narahubungPhone: '085678901234', narahubungEmail: 'ruangrupa@artmail.com'
  },
  {
    id: 14, category: 'B2C', name: 'Cita Rasa Nusantara Food Festival',
    location: 'Lapangan Banteng, Jakarta', posterUrl: 'https://images.unsplash.com/photo-1506368249639-73a05d6f6488?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=60',
    coverImageUrl: 'https://images.unsplash.com/photo-1506368249639-73a05d6f6488?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=450&q=80',
    dateDisplay: '2025/09/20 - 2025/09/22', timeDisplay: '11:00 - 21:00', timezone: 'WIB',
    fullDescription: 'Festival kuliner terbesar yang menyajikan kelezatan hidangan dari seluruh penjuru Nusantara. Lebih dari 100 tenant makanan, demo masak, dan pertunjukan budaya.',
    ticketCategories: [
      { id: 'entry-voucher-50k', name: 'Voucher Masuk + Kuliner Rp 50.000', price: 50000, description: 'Termasuk voucher makan senilai Rp 50.000.', availabilityStatus: 'available' },
      { id: 'entry-voucher-100k', name: 'Voucher Masuk + Kuliner Rp 100.000', price: 90000, description: 'Termasuk voucher makan senilai Rp 100.000 (Hemat Rp 10.000).', availabilityStatus: 'available' },
    ],
    displayPrice: 'Mulai Rp 50.000',
    organizerName: 'Hegira Culinary',
    organizerLogoUrl: '/image/hegiralogo.png',
    summary: 'Festival kuliner Nusantara dengan ratusan tenant dan demo masak.',
    googleMapsQuery: 'Lapangan Banteng Jakarta',
    status: 'Aktif', theme: 'Festival Kuliner', address: 'Ps. Baru, Kecamatan Sawah Besar, Kota Jakarta Pusat, Daerah Khusus Ibukota Jakarta',
    eventSlug: 'cita-rasa-nusantara-fest', narahubungName: 'Tim Kuliner Hegira', narahubungPhone: '081233334444', narahubungEmail: 'foodfest@hegira.com'
  },
  {
    id: 15, category: 'B2C', name: 'Hegira E-Champions Cup 2025',
    location: 'Online & BritAma Arena, Jakarta', posterUrl: 'https://images.unsplash.com/photo-1580234810449-768879425721?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=60',
    coverImageUrl: 'https://images.unsplash.com/photo-1580234810449-768879425721?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=450&q=80',
    dateDisplay: '2025/12/01 - 2025/12/15', timeDisplay: 'Sesuai Jadwal Pertandingan', timezone: 'WIB',
    fullDescription: 'Turnamen e-sport bergengsi yang mempertandingkan game-game populer. Babak kualifikasi online dan grand final offline di BritAma Arena. Total hadiah ratusan juta rupiah!',
    ticketCategories: [
      { id: 'player-reg', name: 'Registrasi Pemain (per tim)', price: 250000, description: 'Untuk tim yang ingin berpartisipasi.', availabilityStatus: 'available' },
      { id: 'spectator-online', name: 'Tiket Nonton Online (Kualifikasi)', price: 0, description: 'Gratis nonton babak kualifikasi via streaming.', availabilityStatus: 'available' },
      { id: 'spectator-venue-gf', name: 'Tiket Nonton Grand Final (Venue)', price: 100000, description: 'Nonton langsung Grand Final di BritAma Arena.', availabilityStatus: 'almost-sold' },
    ],
    displayPrice: 'Gratis / Mulai Rp 100.000',
    organizerName: 'Hegira Gaming Division',
    organizerLogoUrl: '/image/hegiralogo.png',
    summary: 'Turnamen e-sport dengan kualifikasi online dan grand final offline.',
    googleMapsQuery: 'BritAma Arena Jakarta',
    status: 'Selesai', theme: 'Turnamen E-Sport', address: 'Jl. Raya Kelapa Nias, Kelapa Gading Tim., Kec. Klp. Gading, Jkt Utara, Daerah Khusus Ibukota Jakarta 14240',
    eventSlug: 'hegira-echampions-cup-2025', narahubungName: 'Panitia E-Sport Hegira', narahubungPhone: '089988887777', narahubungEmail: 'esports@hegira.com'
  }
];


const HegiraApp: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageName>('landing');
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);
  const [checkoutData, setCheckoutData] = useState<CheckoutInfo | null>(null);
  const [transactionResult, setTransactionResult] = useState<TransactionData | null>(null);
  const [allEventsData, setAllEventsData] = useState<EventData[]>(sampleEvents);
  const [eventBeingEdited, setEventBeingEdited] = useState<EventData | null>(null);
  const [currentConfirmationTarget, setCurrentConfirmationTarget] = useState<PendingNavigationTarget | null>(null);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [confirmationModalConfig, setConfirmationModalConfig] = useState<{ title: string; message: string; confirmText: string; cancelText: string; icon?: React.ElementType; iconColorClass?: string; confirmButtonClass?: string }>({ title: '', message: '', confirmText: 'Ya', cancelText: 'Tidak', icon: undefined, iconColorClass: undefined, confirmButtonClass: undefined });

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [userName, setUserName] = useState('');

  const [isAuthSelectionModalOpen, setIsAuthSelectionModalOpen] = useState(false);
  const [authPageToShow, setAuthPageToShow] = useState<'login' | 'signup' | 'otpInput' | 'creatorAuth' | null>(null);
  const [showOtpModalForVisitor, setShowOtpModalForVisitor] = useState(false); // New state for visitor OTP modal
  const [activeAuthRole, setActiveAuthRole] = useState<AuthRoleType | null>(null);
  const [userEmailForOtpContext, setUserEmailForOtpContext] = useState('');
  const [userNameForOtpContext, setUserNameForOtpContext] = useState<string | undefined>(undefined);

  const [isRoleSwitchModalOpen, setIsRoleSwitchModalOpen] = useState(false);
  const [isOrganizationVerificationModalOpen, setIsOrganizationVerificationModalOpen] = useState(false);
  const [pendingRoleSwitch, setPendingRoleSwitch] = useState<UserRole | null>(null);


  const [isAppLoading, setIsAppLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Memuat...');


  const handleAddNewEvent = (newEvent: EventData) => {
    setAllEventsData(prevEvents => [newEvent, ...prevEvents]);
  };

  const handleUpdateExistingEvent = (updatedEvent: EventData) => {
    setAllEventsData(prevEvents =>
      prevEvents.map(event => event.id === updatedEvent.id ? updatedEvent : event)
    );
    if (selectedEvent && selectedEvent.id === updatedEvent.id) {
      setSelectedEvent(updatedEvent);
    }
    if (eventBeingEdited && eventBeingEdited.id === updatedEvent.id) {
      setEventBeingEdited(updatedEvent);
    }
  };

  const handleSetEventForEditing = (event: EventData | null) => {
    setEventBeingEdited(event);
  };

  const handleNavigateRequestWithConfirmation = useCallback((targetPage: PageName, targetData?: any, resetCallback?: () => void) => {
    let modalTitle = "Konfirmasi Navigasi";
    let modalMessage = "Anda memiliki item di keranjang atau data yang belum disimpan. Apakah Anda yakin ingin meninggalkan halaman ini? Perubahan Anda akan hilang.";
    let confirmBtnText = "Ya, Tinggalkan";
    let cancelBtnText = "Tidak, Tetap di Sini";
    let icon: React.ElementType | undefined = AlertTriangle;
    let iconColor = "text-yellow-500";
    let confirmBtnClass = "bg-yellow-500 hover:bg-yellow-600 text-white";

    if (targetPage === 'checkout' && currentConfirmationTarget?.page === 'paymentLoading') {
      modalTitle = "Batalkan Pembayaran?";
      modalMessage = "Apakah Anda yakin ingin membatalkan proses pembayaran dan kembali ke halaman checkout? Pesanan Anda belum selesai.";
      confirmBtnText = "Ya, Batalkan";
      iconColor = "text-red-500";
      confirmBtnClass = "bg-red-600 hover:bg-red-700 text-white";
    }

    setConfirmationModalConfig({ title: modalTitle, message: modalMessage, confirmText: confirmBtnText, cancelText: cancelBtnText, icon: icon, iconColorClass: iconColor, confirmButtonClass: confirmBtnClass });
    setCurrentConfirmationTarget({ page: targetPage, data: targetData, resetCallback });
    setIsConfirmationModalOpen(true);
  }, [currentConfirmationTarget]);

  const handleConfirmNavigation = () => {
    if (currentConfirmationTarget) {
      if (currentConfirmationTarget.resetCallback) {
        currentConfirmationTarget.resetCallback();
      }
      navigate(currentConfirmationTarget.page, currentConfirmationTarget.data);
    }
    setIsConfirmationModalOpen(false);
    setCurrentConfirmationTarget(null);
  };

  const handleCancelNavigation = () => {
    setIsConfirmationModalOpen(false);
    setCurrentConfirmationTarget(null);
  };

  const navigate = useCallback((page: PageName, data?: any) => {
    setIsAppLoading(true);
    setLoadingMessage(page === 'landing' ? 'Kembali ke Beranda...' : `Menuju ${page}...`);

    setTimeout(() => {
      if (page === 'creatorAuth') {
        setActiveAuthRole("Event Creator");
        setAuthPageToShow('creatorAuth'); // Ensure CreatorAuthPage is treated as full screen
      }


      if (page === 'eventDetail' && data) {
        setSelectedEvent(data as EventData);
      } else if (page === 'checkout' && data) {
        setCheckoutData(data as CheckoutInfo);
      } else if (page === 'transactionSuccess' && transactionResult) {
        // Data is already in transactionResult
      } else if (page === 'ticketDisplay' && transactionResult) {
        // Data is already in transactionResult
      } else if (page === 'businessDetail' && data) {
        // Assuming data is BusinessMatchingCardData, can set a specific state if needed
        // For now, just navigating. The CompanyDetailPage might fetch its own data or use passed data.
        // setSelectedCompanyForDetail(data as BusinessMatchingCardData);
      }


      if (page !== 'login' && page !== 'signup' && page !== 'otpInput' && page !== 'creatorAuth' && page !== 'paymentLoading') {
        setAuthPageToShow(null);
        // Keep activeAuthRole if user is navigating away from an auth modal/page but is not fully logged out.
        // It will be cleared on explicit logout or successful auth completion.
        setIsAuthSelectionModalOpen(false);
        setShowOtpModalForVisitor(false); // Close OTP modal on general navigation
      }
      
      window.scrollTo(0, 0);
      setCurrentPage(page);
      setIsAppLoading(false);
    }, 300);
  }, [transactionResult, isLoggedIn]); // Added isLoggedIn to dependencies as it's read implicitly.


  const handleLogin = (role: UserRole, name?: string) => {
    setIsLoggedIn(true);
    setUserRole(role);
    setUserName(name || (role === 'visitor' ? 'Pengunjung Hegira' : role === 'creator' ? 'Kreator Event' : 'Organisasi Hegira'));
    setAuthPageToShow(null);
    setShowOtpModalForVisitor(false);
    setIsAuthSelectionModalOpen(false);
    if (role === 'creator' || role === 'organization') {
        navigate('dashboard');
    } else {
        navigate('landing');
    }
  };

  const handleLogout = () => {
    const logoutConfig = {
      title: "Konfirmasi Logout",
      message: "Apakah Anda yakin ingin keluar dari akun Anda?",
      confirmText: "Ya, Logout",
      cancelText: "Batal",
      icon: AlertTriangle,
      iconColorClass: "text-yellow-500", 
      confirmButtonClass: "bg-yellow-500 hover:bg-yellow-600 text-white"
    };
    setConfirmationModalConfig(logoutConfig);
    setCurrentConfirmationTarget({
      page: 'landing', 
      resetCallback: () => { 
        setIsLoggedIn(false);
        setUserRole(null);
        setUserName('');
        setActiveAuthRole(null);
        setAuthPageToShow(null);
        setShowOtpModalForVisitor(false);
        setIsRoleSwitchModalOpen(false);
        setIsOrganizationVerificationModalOpen(false);
      }
    });
    setIsConfirmationModalOpen(true);
  };


  const handleOpenAuthModal = (selectedAuthRole?: AuthRoleType) => {
    if (selectedAuthRole) {
      setActiveAuthRole(selectedAuthRole);
      setAuthPageToShow('login'); 
      setIsAuthSelectionModalOpen(false);
    } else {
      setIsAuthSelectionModalOpen(true);
    }
  };

  const handleSelectRoleFromAuthModal = (role: AuthRoleType) => {
    setActiveAuthRole(role);
    setIsAuthSelectionModalOpen(false);
    if (role === "Event Creator") {
      navigate('creatorAuth'); 
    } else {
      setAuthPageToShow('login'); 
    }
  };

  const handleLoginSuccess = (role: UserRole) => { 
    handleLogin(role, userNameForOtpContext || (role === 'visitor' ? "Pengunjung Baru" : (role === 'creator' ? "Kreator Baru" : "Organisasi Baru")));
    setUserNameForOtpContext(undefined);
  };

  const handleGenericSignupSuccess = (email: string, name?: string) => {
    setUserEmailForOtpContext(email);
    setUserNameForOtpContext(name); 
    
    if (activeAuthRole === "Event Visitor") {
        setAuthPageToShow(null); 
        setShowOtpModalForVisitor(true); 
    } else { 
        setAuthPageToShow('otpInput'); 
    }
  };

  const handleOtpVerificationSuccess = (verifiedEmail: string, verifiedName?: string) => {
    const roleToSet = activeAuthRole ? mapAuthRoleToUserRole(activeAuthRole) : 'visitor';
    handleLogin(roleToSet, verifiedName || (roleToSet === 'visitor' ? "Pengunjung Baru" : (roleToSet === 'creator' ? "Kreator Baru" : "Organisasi Baru")) );
    setShowOtpModalForVisitor(false); 
    setAuthPageToShow(null); 
  };
  
  const handleResendOtp = () => {
    console.log(`Resending OTP to ${userEmailForOtpContext}`);
  };

  const handleChangeEmailForOtp = () => {
    if (showOtpModalForVisitor) { 
      setShowOtpModalForVisitor(false);
      setActiveAuthRole("Event Visitor"); 
      setAuthPageToShow('signup');
    } else { 
      setAuthPageToShow('creatorAuth'); 
    }
  };
  
  const handleCloseAuthFlow = () => {
    setIsAuthSelectionModalOpen(false);
    setAuthPageToShow(null);
    setActiveAuthRole(null);
    setShowOtpModalForVisitor(false);
    setIsRoleSwitchModalOpen(false);
    setIsOrganizationVerificationModalOpen(false);
    navigate('landing');
  };

  const handleSwitchToSignup = () => {
    setAuthPageToShow('signup');
  };

  const handleSwitchToLogin = () => {
    setAuthPageToShow('login');
  };

  const handleSwitchRole = (newRole: UserRole) => {
    if (newRole === 'organization') {
      setPendingRoleSwitch(newRole);
      setIsRoleSwitchModalOpen(false);
      setIsOrganizationVerificationModalOpen(true);
    } else {
      handleLogin(newRole, newRole === 'creator' ? 'Kreator Hegira' : 'Pengunjung Hegira');
      setIsRoleSwitchModalOpen(false);
    }
  };

  const handleOrganizationVerificationSuccess = (verificationCode: string) => {
    console.log("Organization verified with code:", verificationCode);
    setIsOrganizationVerificationModalOpen(false);
    if (pendingRoleSwitch === 'organization') {
      handleLogin('organization', 'Nama Organisasi Anda'); 
    }
    setPendingRoleSwitch(null);
  };
  
  const handleCloseOrganizationVerification = () => {
    setIsOrganizationVerificationModalOpen(false);
    setPendingRoleSwitch(null); 
  };

  const handleProcessPayment = (formData: TransactionFormData, checkoutDataWithFinalPrice: CheckoutInfo) => {
    const newTransactionId = `TRX-HEGIRA-${Date.now().toString().slice(-8)}`;
    const newOrderId = `ORD-${Date.now().toString().slice(-6)}`;

    const newTransactionData: TransactionData = {
        checkoutInfo: checkoutDataWithFinalPrice, // This now contains the final price after discount
        formData: formData,
        transactionId: newTransactionId,
        orderId: newOrderId,
    };
    setTransactionResult(newTransactionData);
    navigate('paymentLoading');
  };


  const renderPage = () => {
    if (isAppLoading && currentPage !== 'paymentLoading') return <FullScreenLoader />;
    
    switch (currentPage) {
      case 'landing': return <LandingPage heroEvents={allEventsData.slice(0, 3)} featuredEvents={allEventsData.slice(0, 6)} onNavigate={navigate} onOpenLoginModal={() => handleOpenAuthModal()} />;
      case 'events': return <EventPage events={allEventsData.filter(e => e.status === 'Aktif')} onNavigate={navigate} />;
      case 'business': return <BusinessMatchingPage onNavigate={navigate} />;
      case 'help': return <HelpPage />;
      case 'dashboard': 
        if (!isLoggedIn || !userRole) {
          navigate('landing'); return null;
        }
        if (userRole === 'organization') {
          return <BusinessMatchingDashboardPage onNavigate={navigate} onLogout={handleLogout} userName={userName} userRole={userRole} onOpenRoleSwitchModal={() => setIsRoleSwitchModalOpen(true)} />;
        } else { 
          return <DashboardPage 
                    userRole={userRole} 
                    userName={userName} 
                    onNavigate={navigate} 
                    onLogout={handleLogout}
                    allEvents={allEventsData}
                    onAddNewEvent={handleAddNewEvent}
                    eventBeingEdited={eventBeingEdited}
                    onSetEventForEditing={handleSetEventForEditing}
                    onUpdateExistingEvent={handleUpdateExistingEvent}
                    onOpenRoleSwitchModal={() => setIsRoleSwitchModalOpen(true)}
                  />;
        }
      case 'eventDetail': return selectedEvent ? <EventDetailPage event={selectedEvent} onNavigate={navigate} onNavigateRequestWithConfirmation={handleNavigateRequestWithConfirmation}/> : <LandingPage heroEvents={allEventsData.slice(0, 3)} featuredEvents={allEventsData.slice(0, 6)} onNavigate={navigate} onOpenLoginModal={() => handleOpenAuthModal()} />;
      case 'checkout': return checkoutData ? <CheckoutPage checkoutInfo={checkoutData} eventForBackNav={checkoutData.event} onNavigate={navigate} onProcessPayment={handleProcessPayment} /> : <LandingPage heroEvents={allEventsData.slice(0, 3)} featuredEvents={allEventsData.slice(0, 6)} onNavigate={navigate} onOpenLoginModal={() => handleOpenAuthModal()}/>;
      case 'paymentLoading': return transactionResult ? <PaymentLoadingPage onNavigate={navigate} onNavigateRequestWithConfirmation={handleNavigateRequestWithConfirmation} checkoutInfoToReturnTo={transactionResult.checkoutInfo} /> : <LandingPage heroEvents={allEventsData.slice(0, 3)} featuredEvents={allEventsData.slice(0, 6)} onNavigate={navigate} onOpenLoginModal={() => handleOpenAuthModal()}/>;
      case 'transactionSuccess': return transactionResult ? <TransactionSuccessPage transactionData={transactionResult} onNavigate={navigate} /> : <LandingPage heroEvents={allEventsData.slice(0, 3)} featuredEvents={allEventsData.slice(0, 6)} onNavigate={navigate} onOpenLoginModal={() => handleOpenAuthModal()}/>;
      case 'ticketDisplay': return transactionResult ? <TicketDisplayPage transactionData={transactionResult} onNavigate={navigate}/> : <LandingPage heroEvents={allEventsData.slice(0,3)} featuredEvents={allEventsData.slice(0,6)} onNavigate={navigate} onOpenLoginModal={() => handleOpenAuthModal()}/>;
      case 'createEventInfo': return <CreateEventInfoPage onNavigate={navigate} onOpenAuthModal={() => handleOpenAuthModal()} isLoggedIn={isLoggedIn} userRole={userRole} />;
      case 'articlesPage': return <ArticleListPage onNavigate={navigate} />;
      case 'businessDetail': return selectedEvent ? <CompanyDetailPage company={selectedEvent as unknown as BusinessMatchingCardData} onNavigate={navigate} /> : <BusinessMatchingPage onNavigate={navigate} />; 
      case 'creatorAuth': 
        if (authPageToShow === 'otpInput' && activeAuthRole && activeAuthRole !== "Event Visitor") {
            return null; 
        }
        return <CreatorAuthPage 
                  initialMode="signup" 
                  onNavigate={navigate} 
                  onLoginSuccess={(name) => handleLogin('creator', name)} 
                  onSignupSuccess={handleGenericSignupSuccess}
               />;
      case 'otpInput': 
        if (authPageToShow !== 'otpInput' || !userEmailForOtpContext) {
          navigate('landing');
          return null;
        }
        return <OtpInputPage 
                    email={userEmailForOtpContext} 
                    userName={userNameForOtpContext}
                    onVerifySuccess={handleOtpVerificationSuccess} 
                    onResendOtp={handleResendOtp} 
                    onChangeEmail={handleChangeEmailForOtp} 
                    onNavigate={navigate}
                />;
      case 'home': return <Home onNavigate={navigate} />;
      default: return <LandingPage heroEvents={allEventsData.slice(0, 3)} featuredEvents={allEventsData.slice(0, 6)} onNavigate={navigate} onOpenLoginModal={() => handleOpenAuthModal()} />;
    }
  };
  
  const pagesWithoutNavFooter: PageName[] = ['paymentLoading'];
  const dashboardPages: PageName[] = ['dashboard']; 
  const authFullScreenPages: PageName[] = ['creatorAuth', 'otpInput']; 
  const isFullScreenPage = pagesWithoutNavFooter.includes(currentPage) || 
                           dashboardPages.includes(currentPage) || 
                           (authFullScreenPages.includes(currentPage) && authPageToShow === currentPage);

  const hideNavbar = isFullScreenPage || (authPageToShow === 'otpInput' && currentPage === 'creatorAuth');
  const hideFooter = isFullScreenPage || 
                     currentPage === 'eventDetail' || currentPage === 'checkout' || currentPage === 'transactionSuccess' ||
                     (authPageToShow === 'otpInput' && currentPage === 'creatorAuth');

  return (
    <>
      {!hideNavbar && (
        <Navbar 
          onNavigate={navigate} 
          currentPage={currentPage} 
          isLoggedIn={isLoggedIn}
          userRole={userRole!}
          userName={userName}
          onLogout={handleLogout}
          onOpenAuthModal={() => handleOpenAuthModal()}
          onOpenRoleSwitchModal={() => setIsRoleSwitchModalOpen(true)}
        />
      )}
      <div className={!hideNavbar ? "pt-20" : ""}> 
        {renderPage()}
      </div>
      {!hideFooter && (
        <Footer onNavigate={navigate} currentPage={currentPage} />
      )}
      {!hideNavbar && <FloatingHelpButton onNavigate={navigate} />}

      {isAuthSelectionModalOpen && (
        <AuthSelectionModal
          isOpen={isAuthSelectionModalOpen}
          onClose={handleCloseAuthFlow}
          onSelectRole={handleSelectRoleFromAuthModal}
        />
      )}

      {authPageToShow === 'login' && activeAuthRole && activeAuthRole !== "Event Creator" && (
        <LoginPage
          role={activeAuthRole}
          onLoginSuccess={(role) => handleLoginSuccess(role)}
          onClose={handleCloseAuthFlow}
          onSwitchToSignup={handleSwitchToSignup}
        />
      )}
      
      {authPageToShow === 'signup' && activeAuthRole && activeAuthRole !== "Event Creator" && (
        <SignupPage
          role={activeAuthRole}
          onSignupSuccess={handleGenericSignupSuccess}
          setUserEmailForVerification={setUserEmailForOtpContext} 
          onClose={handleCloseAuthFlow}
          onSwitchToLogin={handleSwitchToLogin}
        />
      )}
      
      {showOtpModalForVisitor && userEmailForOtpContext && (
        <OtpInputModal
          isOpen={showOtpModalForVisitor}
          email={userEmailForOtpContext}
          onVerifySuccess={(verifiedEmail) => handleOtpVerificationSuccess(verifiedEmail)} 
          onResendOtp={handleResendOtp}
          onChangeEmail={handleChangeEmailForOtp}
          onClose={handleCloseAuthFlow}
        />
      )}

      {authPageToShow === 'otpInput' && activeAuthRole && activeAuthRole !== "Event Visitor" && userEmailForOtpContext && currentPage !== 'otpInput' && (
        <OtpInputPage 
            email={userEmailForOtpContext} 
            userName={userNameForOtpContext}
            onVerifySuccess={handleOtpVerificationSuccess} 
            onResendOtp={handleResendOtp} 
            onChangeEmail={handleChangeEmailForOtp} 
            onNavigate={navigate}
        />
       )}


      {isConfirmationModalOpen && currentConfirmationTarget && (
        <ConfirmationModal
          isOpen={isConfirmationModalOpen}
          title={confirmationModalConfig.title}
          message={confirmationModalConfig.message}
          confirmText={confirmationModalConfig.confirmText}
          cancelText={confirmationModalConfig.cancelText}
          onConfirm={handleConfirmNavigation}
          onCancel={handleCancelNavigation}
          icon={confirmationModalConfig.icon}
          iconColorClass={confirmationModalConfig.iconColorClass}
          confirmButtonClass={confirmationModalConfig.confirmButtonClass}
        />
      )}
      
      {isRoleSwitchModalOpen && (
        <RoleSwitchModal
          isOpen={isRoleSwitchModalOpen}
          currentUserRole={userRole}
          onSwitchRole={handleSwitchRole}
          onClose={() => setIsRoleSwitchModalOpen(false)}
        />
      )}

      {isOrganizationVerificationModalOpen && (
        <OrganizationVerificationModal
          isOpen={isOrganizationVerificationModalOpen}
          onClose={handleCloseOrganizationVerification}
          onVerifySuccess={handleOrganizationVerificationSuccess}
          contextText="Verifikasi untuk Akses Organisasi"
        />
      )}

       <style>{`
        body {
          background-color: #FEFFFF; /* hegra-light-bg */
          color: #18093B; /* hegra-deep-navy */
        }
      `}</style>
    </>
  );
};

export default HegiraApp;
