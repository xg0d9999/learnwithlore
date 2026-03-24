import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import './LandingPage.css';
import heroImg from '../../assets/landing/hero.webp';
import testimonial1 from '../../assets/landing/testimonial1.webp';
import testimonial2 from '../../assets/landing/testimonial2.webp';
import testimonial3 from '../../assets/landing/testimonial3.webp';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
          // Optional: unobserve after revealing
          // observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    const revealElements = document.querySelectorAll('.reveal');
    revealElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const handleGetStarted = () => {
    navigate('/login');
  };

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -100; // Offset for fixed header
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-surface font-body text-on-surface selection:bg-secondary-container selection:text-on-secondary-container mesh-bg min-h-screen">
      {/* Top Navigation Shell */}
      <header className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-8 py-3 rounded-full mt-4 mx-auto max-w-5xl border-2 border-white/20 bg-white/80 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,75,227,0.15)]">
        <div className="text-2xl font-black text-primary tracking-tighter font-headline cursor-pointer" onClick={() => navigate('/')}>LearnWithLore</div>
        <nav className="hidden md:flex gap-8 items-center">
          <a className="text-primary font-extrabold border-b-2 border-cyan-400 pb-1 font-['Lexend'] font-semibold tracking-tight" href="#features" onClick={(e) => scrollToSection(e, 'features')}>Features</a>
          <a className="text-slate-600 hover:text-primary transition-colors font-['Lexend'] font-semibold tracking-tight" href="#pricing" onClick={(e) => scrollToSection(e, 'pricing')}>Pricing</a>
          <Link className="text-slate-600 hover:text-primary transition-colors font-['Lexend'] font-semibold tracking-tight" to="/about">About us</Link>
        </nav>
        <button
          onClick={handleGetStarted}
          className="bg-primary text-white px-6 py-2 rounded-full font-bold hover:scale-105 transition-all duration-300 shadow-lg shadow-primary/20"
        >
          Get Started
        </button>
      </header>

      <main className="pt-32">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center mb-24 lg:mb-40 reveal">
          <div className="z-10">
            <span className="inline-block px-4 py-1 rounded-full bg-secondary-container/30 backdrop-blur-md text-secondary font-bold text-xs uppercase tracking-widest mb-6">Mastery through Lore</span>
            <h1 className="font-headline font-black text-5xl lg:text-7xl text-on-surface leading-[1.1] tracking-tighter mb-6">
              Master English with a <span className="text-primary italic">Personal Tutor</span>
            </h1>
            <p className="text-lg text-on-surface-variant max-w-md mb-10 leading-relaxed">
              Master global job opportunities through our personalized and highly effective approach. Results in weeks, not years!
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={handleGetStarted}
                className="bg-primary text-white px-8 py-4 rounded-full font-bold text-lg hover:shadow-[0_0_30px_rgba(0,75,227,0.4)] transition-all"
              >
                Book a Free Lesson
              </button>
              <button className="glass-pane px-8 py-4 rounded-full font-bold text-lg text-primary border-primary/20 hover:bg-white/90 transition-all">View Testimonials</button>
            </div>
          </div>
          <div className="relative flex justify-center items-center">
            {/* Decorative Elements */}
            <div className="absolute w-96 h-96 bg-primary-container/20 rounded-full blur-3xl -z-10"></div>
            <div className="absolute w-64 h-64 bg-secondary-container/30 rounded-full blur-3xl bottom-0 right-0 -z-10"></div>
            <div className="relative group">
              <div className="absolute -inset-4 bg-white/40 backdrop-blur-xl rounded-xl border border-white/50 transform rotate-3 group-hover:rotate-1 transition-transform duration-500 shadow-xl"></div>
              <div className="relative overflow-hidden rounded-xl border-4 border-white shadow-2xl w-full max-w-md aspect-[4/5] bg-surface-container">
                <img
                  alt="Professional woman smiling"
                  className="w-full h-full object-cover"
                  src={heroImg}
                />
              </div>
              {/* Stats Floating Card */}
              <div className="absolute -bottom-6 -left-10 glass-pane p-6 rounded-xl shadow-2xl max-w-[200px]">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-gradient-to-br from-[#FF9D6C] to-[#FF4D00] p-2 rounded-lg shadow-lg shadow-orange-500/20 flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <span className="font-bold text-2xl">500+</span>
                </div>
                <p className="text-xs font-semibold uppercase text-on-surface-variant tracking-wider">Lessons Completed This Month</p>
              </div>
            </div>
          </div>
        </section>

        {/* Why Learn with Lore (Benefits) */}
        <section id="features" className="max-w-7xl mx-auto px-6 mb-40 reveal">
          <div className="grid lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5 mb-12 lg:mb-0 lg:order-last">
              <h2 className="font-headline font-black text-4xl lg:text-6xl tracking-tighter leading-none mb-8">Elevate your English <br /><span className="text-primary">beyond boundaries.</span></h2>
              <div className="space-y-12">
                <div className="relative pl-16">
                  <span className="absolute left-0 top-0 text-7xl font-black text-primary/10 leading-none select-none">01</span>
                  <h3 className="font-black text-2xl mb-2">Adaptive Learning</h3>
                  <p className="text-on-surface-variant leading-relaxed">Dynamic curriculums that evolve based on your individual progress and speed.</p>
                </div>
                <div className="relative pl-16">
                  <span className="absolute left-0 top-0 text-7xl font-black text-primary/10 leading-none select-none">02</span>
                  <h3 className="font-black text-2xl mb-2">Accent Precision</h3>
                  <p className="text-on-surface-variant leading-relaxed">Specific phonetic coaching designed for Spanish speakers to master English sounds.</p>
                </div>
              </div>
            </div>
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-8 lg:order-first">
              <div className="bg-white/40 backdrop-blur-2xl p-10 rounded-2xl border border-white/60 shadow-[0_32px_64px_rgba(0,0,0,0.05)] transform translate-y-8 hover:-translate-y-2 transition-transform duration-500">
                <div className="w-16 h-16 rounded-2xl bg-primary shadow-[0_10px_30px_rgba(0,85,255,0.3)] flex items-center justify-center mb-8">
                  <span className="material-symbols-outlined text-4xl text-white" style={{ fontVariationSettings: "'FILL' 1" }}>schedule</span>
                </div>
                <h3 className="font-black text-2xl mb-4">Flex Schedule</h3>
                <p className="text-on-surface-variant">Book or reschedule with 24h notice via our digital portal. Your time, your rules.</p>
              </div>
              <div className="bg-primary p-10 rounded-2xl shadow-[0_32px_64px_rgba(0,85,255,0.2)] text-white hover:-translate-y-2 transition-transform duration-500">
                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-8">
                  <span className="material-symbols-outlined text-4xl text-white" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
                </div>
                <h3 className="font-black text-2xl mb-4">Certified Lore</h3>
                <p className="opacity-80">Official accreditation recognized by partner institutions across Europe and Latin America.</p>
              </div>
              <div className="cyan-intense-card p-10 rounded-2xl shadow-[0_32px_64px_rgba(34,211,238,0.15)] transform sm:translate-y-12 sm:translate-x-[120px] hover:-translate-y-2 transition-transform duration-500 sm:col-span-2 lg:col-span-1 border-none">
                <div className="w-16 h-16 rounded-2xl bg-sky-500 flex items-center justify-center mb-8 shadow-lg shadow-sky-500/30">
                  <span className="material-symbols-outlined text-4xl text-white" style={{ fontVariationSettings: "'FILL' 1" }}>route</span>
                </div>
                <h3 className="font-black text-2xl mb-4 text-sky-950 px-2 lg:px-4">Lore Path</h3>
                <p className="text-sky-900/90 leading-relaxed font-semibold px-2 lg:px-4">Tailored curriculum that adapts to your career goals and personal interests. Expert guidance, 24/7.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Real Stories (Bento Testimonials) */}
        <section className="max-w-7xl mx-auto px-6 mb-40 reveal">
          <div className="text-center mb-20">
            <h2 className="font-headline font-black text-4xl lg:text-5xl tracking-tighter mb-4">The Scholar's Community</h2>
            <p className="text-on-surface-variant text-lg">Real results from our global family of learners.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:h-[600px]">
            {/* Main Bento Card */}
            <div className="md:col-span-2 relative group overflow-hidden rounded-2xl bg-[#E6F3FF] border border-primary/10 shadow-xl p-12 flex flex-col justify-end">
              <div className="absolute top-12 left-12 opacity-10">
                <span className="material-symbols-outlined text-primary text-9xl">format_quote</span>
              </div>
              <div className="relative z-10">
                <div className="flex gap-1 mb-6 text-primary">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                </div>
                <p className="text-slate-900 text-3xl font-semibold leading-relaxed mb-10 max-w-xl italic">"The 1:1 sessions completely changed my confidence during board meetings. The focus on business terminology was exactly what I needed."</p>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full border-2 border-primary/20 p-1 overflow-hidden bg-white">
                    <img alt="Alejandro" className="w-full h-full rounded-full object-cover" src={testimonial1} />
                  </div>
                  <div>
                    <h4 className="text-slate-900 font-black text-lg">Alejandro M.</h4>
                    <p className="text-primary font-bold text-sm tracking-wide">Software Architect</p>
                  </div>
                </div>
              </div>
            </div>
            {/* Side Bento Cards */}
            <div className="flex flex-col gap-6">
              <div className="bg-white p-8 rounded-2xl border border-primary/10 shadow-lg flex-1 hover:shadow-xl transition-shadow">
                <p className="text-on-surface mb-6 font-medium italic text-lg leading-relaxed">"Learning English used to feel like a chore until Lore. Every lesson is an adventure."</p>
                <div className="flex items-center gap-3">
                  <img alt="Sofia" className="w-12 h-12 rounded-full object-cover" src={testimonial2} />
                  <div>
                    <h4 className="font-bold text-slate-900">Sofia R.</h4>
                    <p className="text-primary text-xs font-bold uppercase tracking-wider">Marketing</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-8 rounded-2xl border border-primary/10 shadow-lg flex-1 hover:shadow-xl transition-shadow">
                <p className="text-on-surface mb-6 font-medium italic text-lg leading-relaxed">"Passed my TOEFL in three months with two weeks to spare. Incredible service!"</p>
                <div className="flex items-center gap-3">
                  <img alt="Luis" className="w-12 h-12 rounded-full object-cover" src={testimonial3} />
                  <div>
                    <h4 className="font-bold text-slate-900">Luis D.</h4>
                    <p className="text-primary text-xs font-bold uppercase tracking-wider">PhD Student</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="max-w-7xl mx-auto px-6 mb-40 reveal">
          <div className="text-center mb-16">
            <span className="text-primary font-black uppercase tracking-[0.2em] text-xs">The Investment</span>
            <h2 className="font-headline font-black text-4xl lg:text-5xl tracking-tighter mt-4 mb-4">Choose your journey</h2>
            <p className="text-on-surface-variant">Simple, transparent pricing for every stage.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 items-end">
            {/* Basic */}
            <div className="glass-pane p-12 rounded-2xl flex flex-col items-center text-center hover:scale-[1.02] transition-all border-none">
              <h3 className="font-bold text-lg mb-4 text-slate-500 uppercase tracking-widest">Introduction</h3>
              <div className="text-6xl font-[800] mb-8 text-slate-900 font-headline">$0<span className="text-lg font-normal text-on-surface-variant">/trial</span></div>
              <ul className="space-y-6 mb-12 flex-grow text-on-surface-variant font-medium">
                <li className="flex items-center gap-3"><span className="material-symbols-outlined text-secondary font-bold">check_circle</span> 1x 30min Evaluation</li>
                <li className="flex items-center gap-3"><span className="material-symbols-outlined text-secondary font-bold">check_circle</span> Personal Roadmap</li>
              </ul>
              <button onClick={handleGetStarted} className="w-full bg-slate-900 text-white py-5 rounded-xl font-bold hover:shadow-xl transition-all">Claim Free Lesson</button>
            </div>
            {/* Scholar */}
            <div className="bg-white p-12 rounded-3xl flex flex-col items-center text-center shadow-[0_40px_100px_rgba(0,85,255,0.08)] scale-110 z-10 border-2 border-primary/10 relative group">
              <div className="absolute inset-0 bg-primary/[0.02] pointer-events-none"></div>
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-primary text-white px-8 py-2 rounded-full text-xs font-black uppercase tracking-tight shadow-lg shadow-primary/30 z-20">Most Popular</div>
              <h3 className="font-bold text-lg mb-4 text-primary uppercase tracking-widest relative z-10">Scholar</h3>
              <div className="text-7xl font-[800] mb-8 text-primary font-headline relative z-10">$20<span className="text-lg font-normal text-on-surface-variant">/hr</span></div>
              <ul className="space-y-6 mb-12 flex-grow text-slate-700 font-semibold relative z-10">
                <li className="flex items-center gap-3"><span className="material-symbols-outlined text-primary font-bold">check_circle</span> 1:1 Personal Sessions</li>
                <li className="flex items-center gap-3"><span className="material-symbols-outlined text-primary font-bold">check_circle</span> Full Library Access</li>
                <li className="flex items-center gap-3"><span className="material-symbols-outlined text-primary font-bold">check_circle</span> AI-Powered Feedback</li>
              </ul>
              <button onClick={handleGetStarted} className="w-full bg-primary text-white py-6 rounded-xl font-black text-lg shadow-[0_15px_40px_rgba(0,85,255,0.2)] hover:shadow-primary/40 transition-all relative z-10">Go Pro</button>
            </div>
            {/* Elite */}
            <div className="glass-pane p-12 rounded-2xl flex flex-col items-center text-center hover:scale-[1.02] transition-all border-none">
              <h3 className="font-bold text-lg mb-4 text-slate-500 uppercase tracking-widest">Elite</h3>
              <div className="text-6xl font-[800] mb-8 text-slate-900 font-headline">$35<span className="text-lg font-normal text-on-surface-variant">/hr</span></div>
              <ul className="space-y-6 mb-12 flex-grow text-on-surface-variant font-medium">
                <li className="flex items-center gap-3"><span className="material-symbols-outlined text-secondary font-bold">check_circle</span> Senior Lore Master</li>
                <li className="flex items-center gap-3"><span className="material-symbols-outlined text-secondary font-bold">check_circle</span> Priority Support</li>
                <li className="flex items-center gap-3"><span className="material-symbols-outlined text-secondary font-bold">check_circle</span> Career Mentorship</li>
              </ul>
              <button onClick={handleGetStarted} className="w-full bg-slate-900 text-white py-5 rounded-xl font-bold hover:shadow-xl transition-all">Select Elite</button>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="max-w-7xl mx-auto px-6 mb-32 reveal">
          <div className="relative bg-primary min-h-[500px] flex items-center justify-center rounded-[3rem] overflow-hidden shadow-[0_60px_100px_rgba(0,85,255,0.25)] border border-white/10 group">
            <div className="absolute inset-0 dots-pattern opacity-10"></div>
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-secondary-container/20 rounded-full blur-[100px] group-hover:scale-110 transition-transform duration-1000"></div>
            <div className="absolute -bottom-24 -right-24 w-[30rem] h-[30rem] bg-surface-tint/30 rounded-full blur-[100px] group-hover:scale-110 transition-transform duration-1000"></div>
            <div className="absolute top-20 right-20 w-32 h-32 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 rotate-12 group-hover:rotate-45 transition-transform duration-1000"></div>
            <div className="absolute bottom-20 left-40 w-24 h-24 bg-white/5 backdrop-blur-lg rounded-full border border-white/10 -rotate-12 group-hover:-translate-y-12 transition-transform duration-1000"></div>
            <div className="relative z-10 text-center px-6 py-20">
              <h2 className="font-headline font-black text-5xl lg:text-8xl text-white mb-8 tracking-tighter leading-[0.9]">Your future in English <br /><span className="text-secondary-container">starts today.</span></h2>
              <p className="text-xl lg:text-2xl text-white/80 mb-14 max-w-3xl mx-auto font-medium leading-relaxed">Join 10,000+ Spanish speakers who have transformed their careers with LearnWithLore's proprietary Electric Scholar method.</p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                <button onClick={handleGetStarted} className="bg-white text-primary px-16 py-6 rounded-2xl font-black text-2xl hover:scale-105 hover:shadow-[0_20px_60px_rgba(255,255,255,0.3)] transition-all">Start Free Trial</button>
                <Link to="/login" className="text-white/80 hover:text-white font-bold text-lg flex items-center gap-2 group/link">
                  Talk to an Advisor
                  <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white pt-32 pb-16 overflow-hidden relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full text-[15vw] font-black text-primary/[0.03] select-none leading-none pointer-events-none translate-y-12">
          LEARNWITHLORE
        </div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 mb-24">
            <div className="lg:col-span-5">
              <div className="text-3xl font-black text-primary mb-8">LearnWithLore</div>
              <p className="text-xl text-on-surface-variant leading-relaxed max-w-sm font-medium">
                The premium destination for Spanish speakers aiming for mastery in the English language.
              </p>
              <div className="flex gap-4 mt-10">
                <a className="w-12 h-12 rounded-full glass-pane flex items-center justify-center hover:bg-primary hover:text-white transition-all border-slate-200" href="#"><span className="material-symbols-outlined">language</span></a>
                <a className="w-12 h-12 rounded-full glass-pane flex items-center justify-center hover:bg-primary hover:text-white transition-all border-slate-200" href="#"><span className="material-symbols-outlined">person</span></a>
                <a className="w-12 h-12 rounded-full glass-pane flex items-center justify-center hover:bg-primary hover:text-white transition-all border-slate-200" href="#"><span className="material-symbols-outlined">share</span></a>
              </div>
            </div>
            <div className="lg:col-span-7 grid grid-cols-2 md:grid-cols-3 gap-12">
              <div className="space-y-6">
                <h5 className="font-black uppercase tracking-widest text-xs text-primary">Platform</h5>
                <nav className="flex flex-col gap-4">
                  <a className="text-on-surface-variant hover:text-primary transition-colors font-medium" href="#">Our Story</a>
                  <a className="text-on-surface-variant hover:text-primary transition-colors font-medium" href="#">Curriculum</a>
                  <a className="text-on-surface-variant hover:text-primary transition-colors font-medium" href="#">Lore Library</a>
                  <a className="text-on-surface-variant hover:text-primary transition-colors font-medium" href="#">Lore Plus</a>
                </nav>
              </div>
              <div className="space-y-6">
                <h5 className="font-black uppercase tracking-widest text-xs text-primary">Community</h5>
                <nav className="flex flex-col gap-4">
                  <a className="text-on-surface-variant hover:text-primary transition-colors font-medium" href="#">Success Stories</a>
                  <a className="text-on-surface-variant hover:text-primary transition-colors font-medium" href="#">Affiliates</a>
                  <a className="text-on-surface-variant hover:text-primary transition-colors font-medium" href="#">Newsletter</a>
                  <a className="text-on-surface-variant hover:text-primary transition-colors font-medium" href="#">Podcast</a>
                </nav>
              </div>
              <div className="space-y-6">
                <h5 className="font-black uppercase tracking-widest text-xs text-primary">Support</h5>
                <nav className="flex flex-col gap-4">
                  <a className="text-on-surface-variant hover:text-primary transition-colors font-medium" href="#">Help Center</a>
                  <a className="text-on-surface-variant hover:text-primary transition-colors font-medium" href="#">Privacy</a>
                  <a className="text-on-surface-variant hover:text-primary transition-colors font-medium" href="#">Terms</a>
                  <a className="text-on-surface-variant hover:text-primary transition-colors font-medium" href="#">Contact</a>
                </nav>
              </div>
            </div>
          </div>
          <div className="pt-12 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-slate-400 font-medium text-sm">© 2024 LearnWithLore. All rights reserved.</p>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
              <span className="text-slate-400 font-medium text-sm">Systems Operational</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
