import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Building2,
  ShieldCheck,
  TrendingUp,
  CreditCard,
  Wrench,
  Users,
  CheckCircle2,
  ArrowRight,
  FileText,
  DollarSign,
  Sparkles,
  BarChart3,
  Clock,
  Layers,
  Star,
  Check,
  Mail,
  Phone,
  MapPin,
  Send,
  MessageSquare,
  HelpCircle,
  Award,
  Globe,
  Menu,
  X,
  Compass,
  CheckCircle,
} from 'lucide-react';

export const LandingPage = () => {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currency, setCurrency] = useState('ETB'); // 'ETB' | 'USD'

  // Contact form state
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactSubject, setContactSubject] = useState('General Inquiry');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactSubmitted, setContactSubmitted] = useState(false);

  const handleContactSubmit = (e) => {
    e.preventDefault();
    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) {
      toast('Please fill in your name, email, and message.');
      return;
    }

    setContactSubmitting(true);
    setTimeout(() => {
      setContactSubmitting(false);
      setContactSubmitted(true);
      toast('Thank you! Your message has been sent to the EnkuRent team.');
      setContactName('');
      setContactEmail('');
      setContactPhone('');
      setContactMessage('');
    }, 600);
  };

  const features = [
    {
      title: 'Automated Invoicing & Cycles',
      description: 'Scheduled monthly rent generation, automated overdue tracking, and multi-channel payment receipts.',
      icon: CreditCard,
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      title: 'Properties & Offices Inventory',
      description: 'Manage diverse portfolios: office complexes, commercial plazas, and residential units in one place.',
      icon: Building2,
      color: 'bg-indigo-50 text-indigo-600',
    },
    {
      title: 'Self-Service Tenant Portal',
      description: 'Tenants view active leases, track upcoming invoices, and submit bank transfer receipts directly.',
      icon: Users,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      title: 'Real Ethiopian Payment Gateways',
      description: 'Full integration with Chapa, Telebirr, and CBE Birr instant verifications plus manual cash receipts.',
      icon: Sparkles,
      color: 'bg-amber-50 text-amber-600',
    },
    {
      title: 'Financial & Export Reports',
      description: 'Real-time revenue analytics, collection rates, and one-click PDF & Excel exports.',
      icon: BarChart3,
      color: 'bg-purple-50 text-purple-600',
    },
    {
      title: 'Multi-Tier Role Governance',
      description: 'Dedicated dashboards for System Admin, Approved Building Owners, Scoped Managers, and Tenants.',
      icon: ShieldCheck,
      color: 'bg-rose-50 text-rose-600',
    },
  ];

  const plans = [
    {
      name: 'Starter',
      priceETB: 'ETB 3,500',
      priceUSD: '$29',
      period: '/month',
      description: 'Perfect for independent landlords managing 1 or 2 small buildings.',
      features: [
        'Up to 15 Offices & Units',
        'Automated Invoices & Overdue Alerts',
        'Tenant Directory & Lease History',
        'Bank Transfer Slip Verification',
        'Email & Phone Support',
      ],
      highlighted: false,
    },
    {
      name: 'Growth',
      priceETB: 'ETB 9,500',
      priceUSD: '$79',
      period: '/month',
      description: 'Ideal for commercial building owners and active property managers.',
      features: [
        'Up to 75 Offices & Units',
        'Unlimited Leases & Invoices',
        'Multi-Manager & Accountant Scoping',
        'Chapa & Telebirr Payment Gateways',
        'Financial & Collection Reports (PDF/Excel)',
        'Priority Phone & On-Site Support',
      ],
      highlighted: true,
      badge: 'Most Popular',
    },
    {
      name: 'Enterprise',
      priceETB: 'ETB 24,000',
      priceUSD: '$199',
      period: '/month',
      description: 'Full capabilities for large real estate complexes and multi-tower portfolios.',
      features: [
        'Unlimited Units & Commercial Towers',
        'Custom Roles & Building Scoping',
        'Dedicated Account Manager',
        'Custom Data Exports & Audit Logs',
        '24/7 SLA & Custom Integration Stubs',
      ],
      highlighted: false,
    },
  ];

  const getDashboardLink = () => {
    if (!user) return '/login';
    if (user.role === 'SUPER_ADMIN') return '/admin/dashboard';
    if (user.role === 'OWNER') return '/owner/dashboard';
    if (user.role === 'MANAGER') return '/manager/dashboard';
    return '/tenant';
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Navigation Header */}
      <header className="landing-header">
        <div className="landing-header-inner">
          {/* Brand Logo */}
          <Link to="/" className="landing-brand">
            <div className="landing-brand-logo">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-center">
              <span className="landing-brand-title">EnkuRent</span>
              <span className="landing-brand-badge">Platform</span>
            </div>
          </Link>

          {/* Desktop Navigation Header Links */}
          <nav className="landing-nav-links">
            <a href="#features">Features</a>
            <a href="#about">About</a>
            <a href="#pricing" className="featured">Pricing</a>
            <a href="#contact">Contact</a>
            <a href="#faq">FAQ</a>
          </nav>

          {/* Header Action Buttons */}
          <div className="landing-nav-actions">
            {isAuthenticated ? (
              <Link
                to={getDashboardLink()}
                className="landing-btn-cta"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <Link to="/login" className="landing-btn-signin">
                  Sign In
                </Link>
                <Link to="/register" className="landing-btn-cta">
                  <span>Get Started</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            className="landing-mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="landing-mobile-menu">
            <a href="#features" onClick={() => setMobileMenuOpen(false)}>
              Features
            </a>
            <a href="#about" onClick={() => setMobileMenuOpen(false)}>
              About Us
            </a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)}>
              Pricing Plans
            </a>
            <a href="#contact" onClick={() => setMobileMenuOpen(false)}>
              Contact &amp; Support
            </a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)}>
              Frequently Asked Questions
            </a>
            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              {isAuthenticated ? (
                <Link
                  to={getDashboardLink()}
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg"
                >
                  Go to Dashboard →
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                  >
                    Register as Building Owner
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 bg-gradient-to-b from-indigo-50/60 via-slate-50 to-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100/80 text-indigo-700 text-xs font-semibold mb-6 shadow-xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Built for Commercial &amp; Residential Real Estate in Addis Ababa</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight">
              Property &amp; Rent Management,{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-500">
                Simplified.
              </span>
            </h1>

            <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Empower landlords, property managers, and accountants to track offices, leases, tenant payments in ETB, and maintenance tickets across multiple buildings seamlessly.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-7 py-3 text-sm font-semibold shadow-lg shadow-indigo-600/25 transition-all"
              >
                <span>Register as Building Owner</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#about"
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-white border border-slate-200 px-7 py-3 text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
              >
                Learn More About Us
              </a>
            </div>

            {/* Quick Metrics Bar */}
            <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-4 text-left border-y border-slate-200/80 py-6">
              <div>
                <div className="text-2xl font-bold text-slate-900">120+</div>
                <div className="text-xs text-slate-500 mt-0.5">Commercial Properties</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">4,500+</div>
                <div className="text-xs text-slate-500 mt-0.5">Offices &amp; Suites</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">99.2%</div>
                <div className="text-xs text-slate-500 mt-0.5">On-Time Collection</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">100%</div>
                <div className="text-xs text-slate-500 mt-0.5">ETB &amp; Local Gateways</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600">Enterprise Capabilities</h2>
            <h3 className="mt-2 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Everything required to run modern office buildings
            </h3>
            <p className="mt-3 text-slate-500 text-sm">
              From contract generation to payment verification, EnkuRent automates the real estate management lifecycle.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f, index) => {
              const Icon = f.icon;
              return (
                <div
                  key={index}
                  className="rounded-2xl border border-slate-200/80 p-7 bg-white hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-50 transition-all group"
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${f.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {f.title}
                  </h4>
                  <p className="mt-2 text-xs sm:text-sm text-slate-500 leading-relaxed">
                    {f.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-slate-50 border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Story */}
            <div className="lg:col-span-7">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-4">
                <Compass className="w-3.5 h-3.5" />
                <span>About EnkuRent</span>
              </div>
              <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Modernizing Ethiopian Real Estate through Technology &amp; Trust
              </h3>
              <p className="mt-4 text-slate-600 text-sm sm:text-base leading-relaxed">
                Founded in Addis Ababa, <b>EnkuRent</b> was engineered to solve the persistent operational headaches of manual rent collection, paper lease agreements, unverified bank transfer receipts, and scattered maintenance inquiries.
              </p>
              <p className="mt-3 text-slate-600 text-sm sm:text-base leading-relaxed">
                Whether managing commercial towers in Bole, business centers in Kazanchis, or mixed-use retail complexes in Piassa, EnkuRent provides landlords with real-time portfolio control and tenants with digital self-service convenience.
              </p>

              {/* 3 Pillars */}
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm mb-3">
                    01
                  </div>
                  <h5 className="font-bold text-slate-900 text-sm">Native ETB Context</h5>
                  <p className="text-xs text-slate-500 mt-1">
                    Integrated with Telebirr, CBE Birr, Chapa, and local bank slip reconciliations.
                  </p>
                </div>

                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm mb-3">
                    02
                  </div>
                  <h5 className="font-bold text-slate-900 text-sm">Multi-Tier Trust</h5>
                  <p className="text-xs text-slate-500 mt-1">
                    System Admin approves vetted landlords; owners manage scoped managers and tenants.
                  </p>
                </div>

                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-sm mb-3">
                    03
                  </div>
                  <h5 className="font-bold text-slate-900 text-sm">Paperless History</h5>
                  <p className="text-xs text-slate-500 mt-1">
                    Permanent audit trails, immutable rent records, and digital contract archives.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Mission Card */}
            <div className="lg:col-span-5 bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-3xl p-8 sm:p-10 shadow-xl relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center space-x-2 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-4">
                  <Award className="w-4 h-4" />
                  <span>Our Mission</span>
                </div>
                <h4 className="text-2xl font-bold text-white leading-snug">
                  "To make renting, leasing, and managing office buildings in Ethiopia as effortless and transparent as mobile banking."
                </h4>
                <div className="mt-8 pt-6 border-t border-indigo-800/80 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white text-sm">Addis Ababa Head Office</div>
                    <div className="text-xs text-indigo-200 mt-0.5">Bole Medhanialem • Ethiopia</div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-indigo-800 flex items-center justify-center text-white">
                    <Globe className="w-5 h-5 text-indigo-300" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-white border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600">Transparent Pricing Plans</h2>
            <h3 className="mt-2 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Predictable costs, maximum return
            </h3>
            <p className="mt-3 text-slate-500 text-sm">
              All plans include complete security, Prisma-backed database reliability, and automated invoice jobs.
            </p>

            {/* Currency Selector Toggle */}
            <div className="mt-6 inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setCurrency('ETB')}
                className={`px-4 py-1.5 rounded-lg transition-all ${
                  currency === 'ETB' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Ethiopian Birr (ETB)
              </button>
              <button
                type="button"
                onClick={() => setCurrency('USD')}
                className={`px-4 py-1.5 rounded-lg transition-all ${
                  currency === 'USD' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                US Dollars ($)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((p, index) => (
              <div
                key={index}
                className={`relative rounded-3xl p-8 bg-white border transition-all ${
                  p.highlighted
                    ? 'border-indigo-600 ring-2 ring-indigo-600/20 shadow-xl'
                    : 'border-slate-200/80 shadow-xs hover:shadow-md'
                }`}
              >
                {p.badge && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-md">
                    {p.badge}
                  </span>
                )}

                <h4 className="text-xl font-bold text-slate-900">{p.name}</h4>
                <p className="mt-2 text-xs text-slate-500">{p.description}</p>

                <div className="mt-6 flex items-baseline">
                  <span className="text-3xl sm:text-4xl font-extrabold text-slate-900">
                    {currency === 'ETB' ? p.priceETB : p.priceUSD}
                  </span>
                  <span className="ml-1 text-xs text-slate-400 font-medium">{p.period}</span>
                </div>

                <ul className="mt-8 space-y-3 text-xs sm:text-sm text-slate-600">
                  {p.features.map((f, fIdx) => (
                    <li key={fIdx} className="flex items-center">
                      <Check className="w-4 h-4 text-emerald-600 mr-2 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to="/register"
                  className={`mt-8 block text-center rounded-xl py-3 text-xs font-semibold transition-all ${
                    p.highlighted
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/20'
                      : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                  }`}
                >
                  Get Started with {p.name}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-slate-50 border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600">Get in Touch</h2>
            <h3 className="mt-2 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              We're here to help your property succeed
            </h3>
            <p className="mt-3 text-slate-500 text-sm">
              Have questions about building owner approval, payment integrations, or need a personalized demo? Contact our team.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Left: Contact Info Cards */}
            <div className="lg:col-span-5 space-y-5">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex items-start space-x-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Main Office Location</h4>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                    Bole Medhanialem, Morning Star Mall 4th Floor<br />
                    Addis Ababa, Ethiopia
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex items-start space-x-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Phone Numbers</h4>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1">
                    Direct: <a href="tel:+251911223344" className="text-indigo-600 font-medium">+251 911 22 33 44</a><br />
                    Office: <a href="tel:+251116123456" className="text-indigo-600 font-medium">+251 116 12 34 56</a>
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex items-start space-x-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Email Inquiries</h4>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1">
                    Support: <a href="mailto:support@enkurent.et" className="text-indigo-600 font-medium">support@enkurent.et</a><br />
                    Partnerships: <a href="mailto:contact@enkurent.et" className="text-indigo-600 font-medium">contact@enkurent.et</a>
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex items-start space-x-4">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Business Working Hours</h4>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1">
                    Monday – Friday: 8:30 AM – 5:30 PM (EAT)<br />
                    Saturday: 9:00 AM – 1:00 PM
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Contact Form */}
            <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-8 sm:p-10 shadow-xs">
              {contactSubmitted ? (
                <div className="text-center py-10">
                  <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                    ✓
                  </div>
                  <h4 className="text-xl font-bold text-slate-900">Message Received!</h4>
                  <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
                    Thank you for reaching out. An EnkuRent representative will review your inquiry and get in touch within 24 business hours.
                  </p>
                  <button
                    type="button"
                    onClick={() => setContactSubmitted(false)}
                    className="mt-6 inline-flex items-center space-x-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    <span>Send another inquiry</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit}>
                  <h4 className="text-xl font-bold text-slate-900 mb-1">Send us an Inquiry</h4>
                  <p className="text-xs text-slate-500 mb-6">
                    Fill out the form below and our team will get back to you promptly.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Your Full Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Almaz Tadesse"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        required
                        className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                      <input
                        type="email"
                        placeholder="almaz@company.et"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        required
                        className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                      <input
                        type="tel"
                        placeholder="0911223344"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Inquiry Topic</label>
                      <select
                        value={contactSubject}
                        onChange={(e) => setContactSubject(e.target.value)}
                        className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 bg-white"
                      >
                        <option value="General Inquiry">General Inquiry</option>
                        <option value="Building Owner Registration">Building Owner Registration</option>
                        <option value="Enterprise Portfolio Demo">Enterprise Portfolio Demo</option>
                        <option value="Payment Gateway Setup">Payment Gateway Setup (Chapa/Telebirr)</option>
                        <option value="Technical Support">Technical Support</option>
                      </select>
                    </div>
                  </div>

                  <div className="mb-5">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Your Message *</label>
                    <textarea
                      rows={4}
                      placeholder="Describe your property details or any questions you have..."
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      required
                      className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={contactSubmitting}
                    className="inline-flex items-center justify-center space-x-2 w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white py-3 text-xs font-semibold shadow-md shadow-indigo-600/20 transition-colors"
                  >
                    <span>{contactSubmitting ? 'Sending Message...' : 'Send Message'}</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-white border-t border-slate-200/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600">Got Questions?</h2>
            <h3 className="mt-2 text-3xl font-extrabold text-slate-900">Frequently Asked Questions</h3>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 p-6 bg-slate-50/50">
              <h4 className="font-semibold text-slate-900 text-sm">How does the Building Owner approval process work?</h4>
              <p className="mt-2 text-xs sm:text-sm text-slate-500 leading-relaxed">
                When a new building owner registers, their application enters a "Pending Approval" state. The System Administrator reviews their credentials and portfolio details in the System Admin portal. Once approved, the landlord receives access to add properties, invite managers, and onboard tenants.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-6 bg-slate-50/50">
              <h4 className="font-semibold text-slate-900 text-sm">Which Ethiopian payment methods are supported?</h4>
              <p className="mt-2 text-xs sm:text-sm text-slate-500 leading-relaxed">
                EnkuRent natively supports Chapa sandbox/production, Telebirr, CBE Birr instant verifications, and manual bank transfer receipt slip uploads with review and approval workflows for property accountants.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-6 bg-slate-50/50">
              <h4 className="font-semibold text-slate-900 text-sm">Can I scope property managers to specific buildings?</h4>
              <p className="mt-2 text-xs sm:text-sm text-slate-500 leading-relaxed">
                Yes! Building Owners can invite property managers and accountants and assign them to one or more specific buildings. Managers will only see offices, tenants, and payments within their designated properties.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="bg-indigo-600 py-16 text-white text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Ready to streamline your rental business with EnkuRent?
          </h2>
          <p className="mt-4 text-indigo-100 text-sm sm:text-base max-w-2xl mx-auto">
            Join hundreds of Ethiopian property managers and landlords saving hours each week on billing, leasing, and tenant verification.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-indigo-600 shadow-md hover:bg-indigo-50 transition-colors"
            >
              Register as Building Owner
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-indigo-700/60 hover:bg-indigo-700 px-7 py-3.5 text-sm font-semibold text-white border border-indigo-400/40 transition-colors"
            >
              Sign In to Existing Account
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-2.5">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">
              <Building2 className="w-4 h-4" />
            </div>
            <span className="text-base font-bold text-white">EnkuRent Platform</span>
          </div>

          <p className="text-xs text-slate-500 text-center md:text-left">
            &copy; {new Date().getFullYear()} EnkuRent. Modern Property &amp; Rent Management System for Addis Ababa. All rights reserved.
          </p>

          <div className="flex flex-wrap justify-center gap-6 text-xs">
            <a href="#features" className="hover:text-slate-300 transition-colors">
              Features
            </a>
            <a href="#about" className="hover:text-slate-300 transition-colors">
              About
            </a>
            <a href="#pricing" className="hover:text-slate-300 transition-colors">
              Pricing
            </a>
            <a href="#contact" className="hover:text-slate-300 transition-colors">
              Contact
            </a>
            <a href="#faq" className="hover:text-slate-300 transition-colors">
              FAQ
            </a>
            <Link to="/login" className="hover:text-slate-300 transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
