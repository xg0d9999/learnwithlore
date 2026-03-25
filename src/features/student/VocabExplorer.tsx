import { useState } from 'react';
import { TopNavigation } from '../../components/layout/TopNavigation';

const CATEGORIES = ['All', 'Animals', 'Food', 'Professions', 'Travel', 'Home'];

const RECENT_VOCAB = [
    { id: 1, word: 'Apple', translation: 'Manzanaa', category: 'Food', color: 'bg-red-50', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBReEXmjc0SeFl72wX7SI6GHYWIsmf_zb-RDpR0hSSfV1_jDQF2poxGvnuWZBDi7jst9iMAr9uzgQeW3UUhG3Yn675SfBi-aabhOiSynXCiV8XQaSjJT8Hja-zqEEfLSqGd87UzDNSxJX2d6IzjlnS0t1LmaXhcFF_iCb3BdPO4sMuNeoievMcZc90EL16kExENB59NDRUqq8qNxjrUrS6ouquwcEWUGWxBv7zSyb5RKGv_lZrM3A0fT9UVHmCgb5eZ0dcWbp6S9Zk' },
    { id: 2, word: 'Run', translation: 'Correr', category: 'Travel', color: 'bg-blue-50', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAFlwWxrivB5PRGuXVuTsxiY7Yf_olt005wfxIkcbhhnXmpqyTOX_R40HHH2T75Tgo72i561Iyu0GFufqxNi7MlUs4_9o6-7I2qKOz1U4Lot6gs4TQTFpoZ2m0qkoKuMb1hx4pvxTyZCJr1LsxQB_L3QxZ52m7D71c6JILP9pUTbQhFcGxzRcWEbBzF0uuJkHomGva2r67Vd2wlAQ8bZdfCGeURyZQIyWLX1vTnvLzSNzWzODWB2Fbtw1DxLUCMU-4c8ku-nX_cDN4' },
    { id: 3, word: 'Happy', translation: 'Feliz', category: 'Home', color: 'bg-yellow-50', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBPy2XDNiRvbq3Tn_X2aO2pBMFNB-TPFbPmehBwKcMkzNtf1qIBXA6eTxGyaeqS7MoOa04scFWMSvvXhkNS4pwKOctKzU1YcCraeJJD6fpuLBXFgGHYsEvtYafE9Na1uYqMkt7PKycMdi4s1XjFX8XTisAltJWkIEPmEsUyI0oYaldPme3LXBDppnN3LD0Ny2fpnDuhV-o35Geuq_h85Ty6btuXNk4HHwNTj-8JFSUbPLFzL__jhnna0cj6zvq6bGyxCPnlzIKB7ZQ' },
    { id: 4, word: 'Book', translation: 'Libro', category: 'Home', color: 'bg-emerald-50', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCpyZnWKeDhP_uH_PsJPWWWaZhRpYqkQ8OdKQDFS8q7ysjDTxTVjVr6m8JtCR28Lq2_G5qnFx4kuXRj_k-lU1uXzJUxkvXQtxzd9dRyQPHeABOI0hUHCd8bacEhZbE-nW4Ya1fF3PXV1Z-AyivsIHmitfJXz2waAec47avnGBiWIG7HrrETofDz6PBXGvbl-JePhInuRjnhC6RrIsoDJO-h8SMxIwrncT5gEHJ56u9OOsKaqa2Ec2KKQutUiPizZm0tvfjxwnNupL4' },
    { id: 5, word: 'Cat', translation: 'Gato', category: 'Animals', color: 'bg-orange-50', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCtJhniJfm1VvO94c5f_PKyGvcolLDNvfujDrCWvs2QY2aNTTtx37tu1czR4045ZZarrV7YBYVJ6MKb4_g6ixbtzQpTch9JaLntAdAhGBUCN0XO6qVABM4tJXkBWkUyRKHWmdBJIrj3Q_M5RwJOaeENEOtzAOjFbiLcE-FwcS79khyAwO3WmOb4bhdAWoZV6MO0vqwKhnG2IfSEfFYPrfmvZM5RUoBmb7QUCsk8yIymbRa0-wZ_ja-TOb2Y4PWiRp5M1acb1MDD13E' },
    { id: 6, word: 'Airplane', translation: 'Avión', category: 'Travel', color: 'bg-sky-50', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAhV09HFamATq15868AVky0GO4cZa8TiSZBcduVj5TDFwKfd1UvcWmQDzr0NuVWiHGUrE6gZTZzdz9PevVw1Csnce0jkpjDIKXun1CJauBuEdR7Qw0caThxDKWUE7M-9uXvZawRqmmFD-Hf6qfsHObocEIJofvnb_reJhT_JTHpDyN9dHSgiBcY-TNwlbuYRZdKmrCyw73fMEkrlxC-BVIS3WNstnYFiNSSDO9zCxv-91zEitiNUMgp2E-8Ur4CbCiNVsbmY8kauAE' },
];

export default function VocabExplorer() {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');

    const filteredVocab = RECENT_VOCAB.filter(v => {
        const matchesCategory = activeCategory === 'All' || v.category === activeCategory;
        const matchesSearch = v.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
            v.translation.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <div className="flex flex-col min-h-full bg-slate-50/50">
            <TopNavigation
                activeTab={activeCategory}
                onTabChange={setActiveCategory}
                tabs={CATEGORIES.map(c => ({ label: c }))}
            >
                <div className="flex-1 max-w-xl relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                    <input
                        className="w-full pl-12 pr-4 py-3 bg-slate-100 border-none rounded-full text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder="Search vocabulary..."
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </TopNavigation>


            <main className="flex-1 max-w-6xl mx-auto w-full px-8 py-8 space-y-10">
                {/* Word of the Day */}
                <section>
                    <div className="relative overflow-hidden rounded-3xl bg-[#0f172a] text-white p-8 md:p-12 shadow-xl min-h-[400px] flex items-center">
                        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-16 w-full">
                            <div className="flex-1 text-center md:text-left">
                                <span className="inline-block px-4 py-1.5 rounded-full bg-primary/20 text-primary border border-primary/30 text-xs font-bold uppercase tracking-wider mb-6">Word of the Day</span>
                                <h1 className="text-6xl md:text-7xl font-bold mb-2">Relámpago</h1>
                                <p className="text-2xl text-slate-400 font-medium mb-10">Lightning</p>
                                <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                                    <button className="flex items-center gap-2 px-8 py-3.5 bg-primary hover:bg-blue-700 rounded-xl font-bold transition-all shadow-lg shadow-primary/25">
                                        <span className="material-symbols-outlined">volume_up</span>
                                        <span>Pronounce</span>
                                    </button>
                                    <button className="flex items-center gap-2 px-8 py-3.5 bg-white/10 hover:bg-white/20 backdrop-blur rounded-xl font-bold transition-all border border-white/10">
                                        <span className="material-symbols-outlined">bookmark</span>
                                        <span>Add to List</span>
                                    </button>
                                </div>
                            </div>
                            <div className="w-64 h-64 md:w-80 md:h-80 bg-white/5 rounded-3xl flex items-center justify-center p-4 backdrop-blur-sm border border-white/10 overflow-hidden shrink-0">
                                <div
                                    className="w-full h-full bg-cover bg-center rounded-2xl"
                                    style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAhV09HFamATq15868AVky0GO4cZa8TiSZBcduVj5TDFwKfd1UvcWmQDzr0NuVWiHGUrE6gZTZzdz9PevVw1Csnce0jkpjDIKXun1CJauBuEdR7Qw0caThxDKWUE7M-9uXvZawRqmmFD-Hf6qfsHObocEIJofvnb_reJhT_JTHpDyN9dHSgiBcY-TNwlbuYRZdKmrCyw73fMEkrlxC-BVIS3WNstnYFiNSSDO9zCxv-91zEitiNUMgp2E-8Ur4CbCiNVsbmY8kauAE")' }}
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Recent Vocabulary Grid */}
                <section className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-800">Recent Vocabulary</h2>
                        <button className="text-sm font-bold text-primary hover:underline">View All</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
                        {filteredVocab.map((v) => (
                            <div
                                key={v.id}
                                className="bg-white rounded-3xl border border-slate-100 p-4 flex gap-4 shadow-sm hover:shadow-md transition-all cursor-pointer group items-center"
                            >
                                <div className={`w-24 h-24 shrink-0 rounded-2xl ${v.color} flex items-center justify-center p-3`}>
                                    <div
                                        className="w-full h-full bg-contain bg-center bg-no-repeat"
                                        style={{ backgroundImage: `url(${v.image})` }}
                                    />
                                </div>
                                <div className="flex-1 flex flex-col justify-center min-w-0">
                                    <h3 className="text-lg font-bold text-slate-900">{v.word}</h3>
                                    <p className="text-sm font-medium text-slate-400">{v.translation}</p>
                                </div>
                                <div className="shrink-0">
                                    <button className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-all">
                                        <span className="material-symbols-outlined text-xl">volume_up</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                </section>
            </main>
        </div>
    );
}
