import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

const AboutPage: React.FC = () => {
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
        }
      });
    }, observerOptions);

    const revealElements = document.querySelectorAll('.reveal');
    revealElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="bg-surface font-body text-on-surface mesh-bg min-h-screen">
      {/* Navbar (Same as Landing) */}
      <header className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-8 py-3 rounded-full mt-4 mx-auto max-w-5xl border-2 border-white/20 bg-white/80 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,75,227,0.15)]">
        <div className="text-2xl font-black text-primary tracking-tighter font-headline cursor-pointer" onClick={() => navigate('/')}>LearnWithLore</div>
        <nav className="hidden md:flex gap-8 items-center">
          <button className="text-slate-600 hover:text-primary transition-colors font-['Lexend'] font-semibold tracking-tight" onClick={() => navigate('/')}>Features</button>
          <button className="text-slate-600 hover:text-primary transition-colors font-['Lexend'] font-semibold tracking-tight" onClick={() => navigate('/')}>Pricing</button>
          <button className="text-primary font-extrabold border-b-2 border-cyan-400 pb-1 font-['Lexend'] font-semibold tracking-tight" onClick={() => navigate('/about')}>About us</button>
        </nav>
        <button 
          onClick={() => navigate('/login')}
          className="bg-primary text-white px-6 py-2 rounded-full font-bold hover:scale-105 transition-all duration-300 shadow-lg shadow-primary/20"
        >
          Get Started
        </button>
      </header>

      <main className="pt-40 max-w-7xl mx-auto px-6 pb-24">
        {/* Mission Section */}
        <section className="text-center mb-32 reveal">
          <span className="inline-block px-4 py-1 rounded-full bg-secondary-container/30 backdrop-blur-md text-secondary font-bold text-xs uppercase tracking-widest mb-6">Our Mission</span>
          <h1 className="font-headline font-black text-5xl lg:text-7xl text-on-surface leading-[1.1] tracking-tighter mb-8 max-w-4xl mx-auto">
            Breaking language barriers with <span className="text-primary italic">Intelligence & Lore</span>
          </h1>
          <p className="text-xl text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
            LearnWithLore was born from a simple idea: English shouldn't be a hurdle for talent. We combine human expertise with cutting-edge AI to provide the ultimate learning experience for Spanish speakers worldwide.
          </p>
        </section>

        {/* Story Bento */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-40">
          <div className="lg:col-span-2 glass-pane p-12 rounded-3xl reveal">
            <h2 className="font-headline font-black text-4xl mb-6">The Electric Scholar Story</h2>
            <p className="text-lg text-on-surface-variant leading-relaxed mb-6">
              Founded in 2024 by Ismael and a team of passionate linguists, LearnWithLore revolutionized the way Spanish speakers approach English. By focusing on "Lore"—the context, the nuances, and the stories behind the language—we've helped thousands transition from basic users to fluent professionals.
            </p>
            <p className="text-lg text-on-surface-variant leading-relaxed">
              Our proprietary methodology, The Electric Scholar, focuses on adaptive learning patterns that mirror how we naturally acquire language, amplified by 24/7 AI simulation.
            </p>
          </div>
          <div className="bg-primary p-12 rounded-3xl text-white flex flex-col justify-center reveal">
            <h3 className="text-5xl font-black mb-2">15,000+</h3>
            <p className="text-primary-container font-bold uppercase tracking-widest text-sm mb-8">Active Students</p>
            <h3 className="text-5xl font-black mb-2">98%</h3>
            <p className="text-primary-container font-bold uppercase tracking-widest text-sm mb-8">Success Rate</p>
            <h3 className="text-5xl font-black mb-2">10+</h3>
            <p className="text-primary-container font-bold uppercase tracking-widest text-sm">Countries Reached</p>
          </div>
        </div>

        {/* Team / Vision */}
        <section className="reveal">
          <div className="relative bg-white/40 backdrop-blur-2xl p-12 lg:p-20 rounded-[3rem] border border-white/60 overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[100px]"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/10 rounded-full blur-[100px]"></div>
            
            <div className="relative z-10 grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="font-headline font-black text-4xl lg:text-5xl tracking-tighter mb-8 leading-tight">Driven by a vision of <br/><span className="text-primary">Global Fluency.</span></h2>
                <p className="text-lg text-on-surface-variant mb-10 leading-relaxed">
                  We envision a world where every Spaniard and Latin American can compete on the global stage without the friction of a second language. Our team is constantly pushing the boundaries of what's possible in EdTech.
                </p>
                <button 
                  onClick={() => navigate('/login')}
                  className="bg-primary text-white px-10 py-5 rounded-2xl font-black text-xl hover:shadow-[0_20px_60px_rgba(0,85,255,0.3)] transition-all"
                >
                  Join the Revolution
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="h-64 bg-surface-container rounded-2xl overflow-hidden shadow-lg border-2 border-white transform -rotate-3 hover:rotate-0 transition-transform">
                  <div className="w-full h-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center">
                     <span className="text-white text-4xl font-black">Innovation</span>
                  </div>
                </div>
                <div className="h-64 bg-surface-container rounded-2xl overflow-hidden shadow-lg border-2 border-white transform rotate-3 hover:rotate-0 transition-transform mt-8">
                   <div className="w-full h-full bg-gradient-to-br from-cyan-400 to-emerald-600 flex items-center justify-center">
                     <span className="text-white text-4xl font-black">Empathy</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer (Same as Landing) */}
      <footer className="bg-white pt-24 pb-16 overflow-hidden relative border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <div className="text-3xl font-black text-primary mb-6 italic">LearnWithLore</div>
          <p className="text-slate-400 font-medium text-sm">© 2024 LearnWithLore. The Electric Scholar Methodology.</p>
        </div>
      </footer>
    </div>
  );
};

export default AboutPage;
