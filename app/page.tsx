'use client'
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Heart, Ticket, Gift, Plane, PawPrint, 
  Calendar as CalendarIcon, List, ChevronLeft, ChevronRight, Plus, X, MoreHorizontal
} from 'lucide-react';
import { supabase } from '@/utils/supabase';
import Navbar from './components/Navbar';

const CATEGORIES = [
  { id: 'all', name: 'Todos', color: 'bg-gray-900 text-white border-transparent' },
  { id: 'marco', name: 'Marco Histórico', icon: Heart, color: 'bg-red-50 text-red-700 border-red-200' },
  { id: 'role', name: 'Date/Rolê', icon: Ticket, color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { id: 'presente', name: 'Presente', icon: Gift, color: 'bg-pink-50 text-pink-700 border-pink-200' },
  { id: 'viagem', name: 'Viagem', icon: Plane, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'pet', name: 'Pet', icon: PawPrint, color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'outros', name: 'Outros', icon: MoreHorizontal, color: 'bg-slate-50 text-slate-700 border-slate-200' },
];

export default function LacoHome() {
  const router = useRouter();
  
  const [viewMode, setViewMode] = useState('timeline');
  const [activeCategory, setActiveCategory] = useState('all');
  const [currentDate, setCurrentDate] = useState(new Date()); 

  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lacoData, setLacoData] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    async function carregarDados() {
      try {
        const { data, error: userError } = await supabase.auth.getUser();
        const user = data?.user; 

        if (userError || !user || !user.id) {
          router.push('/login');
          return;
        }

        const { data: laco, error: lacoError } = await supabase
          .from('lacos')
          .select('*')
          .or(`user_creator_id.eq.${user.id},user_invited_id.eq.${user.id}`)
          .maybeSingle();

        if (!laco) {
          router.push('/onboarding');
          return;
        }
        
        setLacoData(laco);

        const { data: dbEvents, error: eventsError } = await supabase
          .from('timeline_events')
          .select(`id, event_date, title, description, image_url, event_categories (name)`)
          .eq('laco_id', laco.id);

        if (dbEvents) {
          const mappedEvents = dbEvents.map((e: any) => {
            const catData = Array.isArray(e.event_categories) ? e.event_categories[0] : e.event_categories;
            const dbCatName = catData?.name;
            const cleanName = dbCatName ? dbCatName.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";

            let frontendCatId = 'outros'; 
            if (cleanName.includes('marco')) frontendCatId = 'marco';
            else if (cleanName.includes('presente')) frontendCatId = 'presente';
            else if (cleanName.includes('viagem')) frontendCatId = 'viagem';
            else if (cleanName.includes('pet')) frontendCatId = 'pet';
            else if (cleanName.includes('role') || cleanName.includes('date')) frontendCatId = 'role';
            else if (cleanName.includes('outro')) frontendCatId = 'outros';

            return {
              id: e.id,
              date: e.event_date,
              title: e.title,
              description: e.description || "",
              image_url: e.image_url, 
              categoryId: frontendCatId
            };
          });
          setEvents(mappedEvents);
        }
        setIsLoading(false);
      } catch (err) {
        console.error(err);
      }
    }
    carregarDados();
  }, [router]);

  const filteredEvents = events.filter(event => 
    activeCategory === 'all' ? true : event.categoryId === activeCategory
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const daysOfWeek = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col items-center justify-center font-sans">
        <Heart className="w-8 h-8 text-[#E81633] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col font-sans relative transition-colors">
      
      {lacoData?.background_img_link && (
        <div 
          className="fixed inset-0 z-0 opacity-10 dark:opacity-20 pointer-events-none bg-cover bg-center"
          style={{ backgroundImage: `url(${lacoData.background_img_link})` }}
        />
      )}

      <Navbar />

      <div className="flex flex-col items-center py-6 px-4 w-full z-10 relative">
        <div className="w-full max-w-3xl">
          
          <header className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white leading-tight">
                {lacoData?.ship_name || 'Laço'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Nossa história</p>
            </div>
            
            <div className="bg-gray-200/60 dark:bg-slate-800/80 p-1 rounded-xl flex space-x-1 border border-gray-200 dark:border-slate-700">
              <button 
                onClick={() => setViewMode('timeline')}
                className={`flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'timeline' ? 'bg-white dark:bg-slate-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
              >
                <List className="w-4 h-4 mr-1.5" /> Feed
              </button>
              <button 
                onClick={() => setViewMode('calendar')}
                className={`flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'calendar' ? 'bg-white dark:bg-slate-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
              >
                <CalendarIcon className="w-4 h-4 mr-1.5" /> Mês
              </button>
            </div>
          </header>

          <div className="flex flex-wrap gap-2 mb-6 p-1">
            {CATEGORIES.map(cat => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition border flex items-center
                    ${isActive 
                      ? (cat.id === 'all' ? 'bg-gray-900 dark:bg-white text-white dark:text-slate-900' : cat.color + ' ring-2 ring-offset-2 dark:ring-offset-slate-900 ring-[#E81633]') 
                      : 'bg-white dark:bg-slate-800/60 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                >
                  {cat.icon && <cat.icon className={`w-4 h-4 mr-1.5 ${isActive && cat.id !== 'all' ? 'opacity-100' : 'opacity-70'}`} />}
                  {cat.name}
                </button>
              )
            })}
          </div>

          {/* O BLOCO PRINCIPAL (Fundo branco/escuro) */}
          <div className="bg-white dark:bg-slate-800/80 backdrop-blur-md rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 md:p-6 min-h-[60vh] transition-colors">
            
            {viewMode === 'timeline' && (
              <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 dark:before:via-slate-600 before:to-transparent">
                {filteredEvents.map((event) => {
                  const catData = CATEGORIES.find(c => c.id === event.categoryId) || CATEGORIES[0];
                  const Icon = catData.icon || Heart;
                  const dateObj = new Date(event.date + 'T12:00:00');
                  
                  const eventYear = dateObj.getFullYear();
                  const currentYear = new Date().getFullYear();
                  const isPreviousYear = eventYear < currentYear;

                  return (
                    <div key={event.id} onClick={() => setSelectedEvent({...event, catData})} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group cursor-pointer">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-slate-800 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm ${catData.color} absolute left-0 md:left-1/2 md:-ml-5 z-10 transition-transform group-hover:scale-110`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] ml-auto md:ml-0 p-4 rounded-2xl border border-gray-100 dark:border-slate-700/50 bg-gray-50 dark:bg-slate-700/30 hover:bg-white dark:hover:bg-slate-700 hover:shadow-md hover:border-[#E81633]/30 transition">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${catData.color}`}>
                            {catData.name}
                          </span>
                          <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                            {String(dateObj.getDate()).padStart(2, '0')} {monthNames[dateObj.getMonth()].substring(0,3)}
                            {isPreviousYear && ` ${eventYear}`}
                          </span>
                        </div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mt-2">{event.title}</h3>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {viewMode === 'calendar' && (
              <div className="animate-in fade-in duration-300">
                <div className="flex items-center justify-between mb-6">
                  {/* CORREÇÃO DO TÍTULO DO MÊS NO MODO NOTURNO */}
                  <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 capitalize">
                    {monthNames[currentDate.getMonth()]} <span className="text-gray-400 dark:text-gray-500 font-normal">{currentDate.getFullYear()}</span>
                  </h2>
                  <div className="flex space-x-1">
                    <button onClick={prevMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition"><ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" /></button>
                    <button onClick={nextMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition"><ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" /></button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 md:gap-2">
                  {daysOfWeek.map(day => (
                    <div key={day} className="text-center py-2 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase">{day}</div>
                  ))}
                  
                  {Array.from({ length: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay() }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-12 md:h-24 rounded-xl bg-transparent"></div>
                  ))}

                  {Array.from({ length: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate() }).map((_, i) => {
                    const dayNumber = i + 1;
                    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
                    const dayEvents = filteredEvents.filter(e => e.date === dateStr);

                    return (
                      // CORREÇÃO DOS QUADRADOS DOS DIAS NO MODO NOTURNO (Mais suaves e translúcidos)
                      <div key={dayNumber} className="min-h-14 md:min-h-24 p-1 md:p-2 rounded-xl border border-gray-100 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-700/20 hover:bg-white dark:hover:bg-slate-700/60 transition relative flex flex-col items-center md:items-start">
                        {/* CORREÇÃO DA COR DO NÚMERO DO DIA */}
                        <span className={`text-xs md:text-sm font-medium ${dayEvents.length > 0 ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                          {dayNumber}
                        </span>
                        
                        <div className="mt-1 flex flex-col w-full space-y-1 items-center md:items-start">
                          {dayEvents.map(event => {
                            const catData = CATEGORIES.find(c => c.id === event.categoryId) || CATEGORIES[0];
                            const Icon = catData.icon || Heart;
                            return (
                              <div key={event.id} onClick={() => setSelectedEvent({...event, catData})} className={`w-2 h-2 md:w-full md:h-auto rounded-full md:rounded-md border md:px-1.5 md:py-1 flex items-center cursor-pointer transition hover:opacity-80 ${catData.color}`} title={event.title}>
                                <Icon className="hidden md:block w-3 h-3 shrink-0" />
                                <span className="hidden md:block ml-1 text-[10px] font-medium truncate w-full">{event.title}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <button className="fixed bottom-6 right-6 w-14 h-14 bg-[#E81633] hover:bg-[#c2122a] text-white rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 z-40">
        <Plus className="w-6 h-6" />
      </button>

      {/* POPUP NO MODO NOTURNO */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative border border-transparent dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <button onClick={() => setSelectedEvent(null)} className="absolute top-4 right-4 p-2 bg-white/50 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-800 backdrop-blur-md rounded-full text-gray-800 dark:text-white transition z-10 shadow-sm">
              <X className="w-5 h-5" />
            </button>

            {selectedEvent.image_url && (selectedEvent.image_url.startsWith('http://') || selectedEvent.image_url.startsWith('https://')) && !selectedEvent.image_url.includes('photos.app.goo.gl') ? (
               <img src={selectedEvent.image_url} alt={selectedEvent.title} className="w-full h-72 md:h-80 object-cover object-top" />
            ) : (
               <div className={`w-full h-48 flex items-center justify-center ${selectedEvent.catData.color.split(' ')[0]}`}>
                  {React.createElement(selectedEvent.catData.icon, { 
                    className: `w-16 h-16 ${selectedEvent.catData.color.split(' ')[1]}` 
                  })}
               </div>
            )}

            <div className="p-6">
              <div className="flex items-center space-x-2 mb-3">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${selectedEvent.catData.color}`}>
                  {selectedEvent.catData.name}
                </span>
                <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">
                   {new Date(selectedEvent.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight mb-2">{selectedEvent.title}</h2>
              <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{selectedEvent.description}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}