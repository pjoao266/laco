'use client'
import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  Heart, Ticket, Gift, Plane, PawPrint, Calendar as CalendarIcon, List, 
  ChevronLeft, ChevronRight, Plus, X, MoreHorizontal, Link as LinkIcon, 
  Upload, Edit, Save, Trash2, Play, Pause, Shuffle, Clock, Camera
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

const isVideo = (url: string) => /\.(mp4|webm|ogg|mov)$/i.test(url);

export default function LacoHome() {
  const router = useRouter();
  
  const [viewMode, setViewMode] = useState<'timeline' | 'calendar' | 'momentos'>('timeline');
  const [activeCategory, setActiveCategory] = useState('all');
  const [currentDate, setCurrentDate] = useState(new Date()); 

  const [isLoading, setIsLoading] = useState(true);
  const [lacoData, setLacoData] = useState<any>(null);
  const [partnerName, setPartnerName] = useState<string>('');
  const [events, setEvents] = useState<any[]>([]);
  const [dbCategories, setDbCategories] = useState<any[]>([]);

  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNewEventOpen, setIsNewEventOpen] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);

  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventCatId, setEventCatId] = useState(''); 
  const [eventMediaUrls, setEventMediaUrls] = useState<string[]>([]); 

  const [shipName, setShipName] = useState('');
  const [bgImgUrl, setBgImgUrl] = useState('');

  const [momentIndex, setMomentIndex] = useState(0);
  const [isPlayingMoments, setIsPlayingMoments] = useState(false);
  const [momentsOrder, setMomentsOrder] = useState<'cronologica' | 'aleatoria'>('cronologica');

  async function carregarDados() {
    try {
      const { data, error: userError } = await supabase.auth.getUser();
      const user = data?.user; 

      if (userError || !user) { router.push('/login'); return; }

      const { data: laco } = await supabase.from('lacos').select('*').or(`user_creator_id.eq.${user.id},user_invited_id.eq.${user.id}`).maybeSingle();
      if (!laco) { router.push('/onboarding'); return; }
      
      setLacoData(laco);
      setShipName(laco.ship_name || '');
      setBgImgUrl(laco.background_img_link || '');

      // Buscar nome da parceria se as duas vagas estiverem preenchidas
      if (laco.user_creator_id && laco.user_invited_id) {
        const partnerId = user.id === laco.user_creator_id ? laco.user_invited_id : laco.user_creator_id;
        const { data: profile } = await supabase.from('profiles').select('full_name, name').eq('id', partnerId).maybeSingle();
        if (profile) setPartnerName(profile.full_name || profile.name);
      }

      const { data: catDataDb } = await supabase.from('event_categories').select('*');
      if (catDataDb) setDbCategories(catDataDb);

      const { data: dbEvents } = await supabase.from('timeline_events').select(`id, laco_id, event_date, title, description, image_url, media_urls, category_id, event_categories (name)`);

      if (dbEvents) {
        const mappedEvents = dbEvents.filter(e => e.laco_id === laco.id || !e.laco_id).map((e: any) => {
          const catData = Array.isArray(e.event_categories) ? e.event_categories[0] : e.event_categories;
          const cleanName = catData?.name ? catData.name.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";

          let frontendCatId = 'outros'; 
          if (cleanName.includes('marco')) frontendCatId = 'marco';
          else if (cleanName.includes('presente')) frontendCatId = 'presente';
          else if (cleanName.includes('viagem')) frontendCatId = 'viagem';
          else if (cleanName.includes('pet')) frontendCatId = 'pet';
          else if (cleanName.includes('role') || cleanName.includes('date')) frontendCatId = 'role';

          let medias = e.media_urls || [];
          if (medias.length === 0 && e.image_url) medias = [e.image_url];

          return {
            id: e.id, date: e.event_date, title: e.title, description: e.description || "",
            media_urls: medias, categoryId: frontendCatId, rawCategoryId: e.category_id 
          };
        });
        setEvents(mappedEvents);
      }
      setIsLoading(false);
    } catch (err) { console.error(err); }
  }

  useEffect(() => { carregarDados(); }, [router]);

  const handleStorageUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'event' | 'background') => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      setUploading(true);
      const files = Array.from(e.target.files);
      const newUrls: string[] = [];
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const filePath = `${target}s/${Math.random()}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('laco-media').upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('laco-media').getPublicUrl(filePath);
        newUrls.push(data.publicUrl);
      }
      if (target === 'event') setEventMediaUrls(prev => [...prev, ...newUrls]);
      if (target === 'background') setBgImgUrl(newUrls[0]);
    } catch (error: any) { alert('Erro: ' + error.message); } finally { setUploading(false); }
  };

  const handleSaveEvent = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return alert('Sessão expirada. Faça login novamente.');
    if (!eventTitle || !eventDate || !eventCatId) return alert('Título, Data e Categoria são obrigatórios!');

    const payload = {
      laco_id: lacoData.id, title: eventTitle, description: eventDesc,
      event_date: eventDate, category_id: eventCatId, media_urls: eventMediaUrls, created_by: userData.user.id
    };

    if (isEditingEvent && selectedEvent) {
      await supabase.from('timeline_events').update(payload).eq('id', selectedEvent.id);
    } else {
      await supabase.from('timeline_events').insert([payload]);
    }

    setIsNewEventOpen(false); setIsEditingEvent(false); setSelectedEvent(null); carregarDados();
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent || !window.confirm("Tem certeza de que deseja excluir esta memória?")) return;
    await supabase.from('timeline_events').delete().eq('id', selectedEvent.id);
    setIsEditingEvent(false); setSelectedEvent(null); carregarDados();
  };

  const handleSaveSettings = async () => {
    if (!shipName || shipName.trim() === '') return alert('O nome não pode ficar vazio.');
    await supabase.from('lacos').update({ ship_name: shipName, background_img_link: bgImgUrl }).eq('id', lacoData.id);
    setIsSettingsOpen(false); carregarDados();
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}/invite?laco_id=${lacoData?.id}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const removeMedia = (index: number) => setEventMediaUrls(prev => prev.filter((_, i) => i !== index));

  const openNewEventModal = () => {
    setEventTitle(''); setEventDesc(''); setEventDate(new Date().toISOString().split('T')[0]);
    setEventCatId(dbCategories.length > 0 ? dbCategories[0].id : '');
    setEventMediaUrls([]); setIsEditingEvent(false); setIsNewEventOpen(true);
  };

  const openEditModal = (event: any) => {
    setSelectedEvent(event); setEventTitle(event.title); setEventDesc(event.description); setEventDate(event.date);
    setEventCatId(event.rawCategoryId || (dbCategories.length > 0 ? dbCategories[0].id : ''));
    setEventMediaUrls(event.media_urls || []); setIsEditingEvent(true);
  };

  const allMediaFlat = useMemo(() => {
    let medias = events.flatMap(e => (e.media_urls || []).map((url: string) => ({...e, url})));
    if (momentsOrder === 'cronologica') medias.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    else medias = medias.sort(() => Math.random() - 0.5);
    return medias;
  }, [events, momentsOrder]);

  useEffect(() => {
    let interval: any;
    if (isPlayingMoments && viewMode === 'momentos' && allMediaFlat.length > 0) {
      interval = setInterval(() => setMomentIndex(prev => (prev + 1) % allMediaFlat.length), 4000);
    }
    return () => clearInterval(interval);
  }, [isPlayingMoments, viewMode, allMediaFlat.length]);

  // LÓGICA DE MESES E ANOS CORRIGIDA E PRECISA
  const { pastMilestones, futureMilestones } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Zera as horas para comparar apenas datas

    const past: any[] = [];
    const future: any[] = [];
    
    const formatDuration = (m: number) => {
       if (m === 0) return 'O grande dia';
       const y = Math.floor(m / 12);
       const mo = m % 12;
       if (y > 0 && mo > 0) return `${y} ano${y>1?'s':''} e ${mo} mês${mo>1?'es':''}`;
       if (y > 0) return `${y} ano${y>1?'s':''}`;
       return `${mo} mês${mo>1?'es':''}`;
    };

    events.forEach(event => {
      const eDate = new Date(event.date + 'T00:00:00');
      if (eDate > today) return; 

      // Próximo mesversário/aniversário
      let nextMilestoneDate = new Date(eDate);
      nextMilestoneDate.setFullYear(today.getFullYear());
      nextMilestoneDate.setMonth(today.getMonth());
      if (nextMilestoneDate < today) {
          nextMilestoneDate.setMonth(nextMilestoneDate.getMonth() + 1);
      }

      let totalMonthsNext = (nextMilestoneDate.getFullYear() - eDate.getFullYear()) * 12 + nextMilestoneDate.getMonth() - eDate.getMonth();
      
      let pastMilestoneDate = new Date(nextMilestoneDate);
      pastMilestoneDate.setMonth(pastMilestoneDate.getMonth() - 1);
      let totalMonthsPast = totalMonthsNext - 1;

      const diffDaysNext = Math.ceil((nextMilestoneDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
      const diffDaysPast = Math.ceil((today.getTime() - pastMilestoneDate.getTime()) / (1000 * 3600 * 24));

      // Algoritmo de Prioridade: Checa se é Ano Fechado e está no raio de +/- 20 dias
      const isPriorityPast = (totalMonthsPast % 12 === 0 && diffDaysPast <= 20);
      const isPriorityNext = (totalMonthsNext % 12 === 0 && diffDaysNext <= 20);

      // Popula Passados
      if (totalMonthsPast > 0 || (totalMonthsPast === 0 && eDate.getTime() !== today.getTime())) {
          past.push({ ...event, anniversaryDate: pastMilestoneDate, diffDays: -diffDaysPast, label: formatDuration(totalMonthsPast), isPriority: isPriorityPast });
      }
      // Popula Futuros
      future.push({ ...event, anniversaryDate: nextMilestoneDate, diffDays: diffDaysNext, label: formatDuration(totalMonthsNext), isPriority: isPriorityNext });
    });

    return {
      pastMilestones: past.sort((a, b) => {
        if (a.isPriority !== b.isPriority) return a.isPriority ? -1 : 1;
        return Math.abs(a.diffDays) - Math.abs(b.diffDays);
      }).slice(0, 5),
      futureMilestones: future.sort((a, b) => {
        if (a.isPriority !== b.isPriority) return a.isPriority ? -1 : 1;
        return a.diffDays - b.diffDays;
      }).slice(0, 5)
    };
  }, [events]);

  const filteredEvents = events.filter(e => activeCategory === 'all' ? true : e.categoryId === activeCategory).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const daysOfWeek = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

  if (isLoading) return <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col items-center justify-center"><Heart className="w-8 h-8 text-[#E81633] animate-pulse" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col font-sans relative transition-colors pb-24">
      {lacoData?.background_img_link && (
        <div className="fixed inset-0 z-0 opacity-10 dark:opacity-[0.15] pointer-events-none">
          <Image src={lacoData.background_img_link} alt="Fundo" fill className="object-cover object-center" priority sizes="100vw" />
        </div>
      )}

      <Navbar onOpenSettings={() => setIsSettingsOpen(true)} />

      <div className="flex justify-center py-6 px-4 w-full z-10 relative">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 flex flex-col w-full">
            <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white leading-tight">{lacoData?.ship_name || 'Laço'}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Nossa história</p>
              </div>
              <div className="bg-gray-200/60 dark:bg-slate-800/80 p-1 rounded-xl flex space-x-1 border border-gray-200 dark:border-slate-700 w-fit">
                <button onClick={() => setViewMode('timeline')} className={`flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'timeline' ? 'bg-white dark:bg-slate-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:hover:text-gray-300'}`}><List className="w-4 h-4 mr-1.5 hidden sm:block" /> Feed</button>
                <button onClick={() => setViewMode('calendar')} className={`flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'calendar' ? 'bg-white dark:bg-slate-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:hover:text-gray-300'}`}><CalendarIcon className="w-4 h-4 mr-1.5 hidden sm:block" /> Mês</button>
                <button onClick={() => { setViewMode('momentos'); setIsPlayingMoments(false); }} className={`flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'momentos' ? 'bg-[#E81633] shadow-sm text-white' : 'text-gray-500 dark:hover:text-gray-300'}`}><Camera className="w-4 h-4 mr-1.5 hidden sm:block" /> Momentos</button>
              </div>
            </header>

            {viewMode !== 'momentos' && (
              <div className="flex flex-wrap gap-2 mb-6 p-1">
                {CATEGORIES.map(cat => (
                  <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition border flex items-center ${activeCategory === cat.id ? (cat.id === 'all' ? 'bg-gray-900 dark:bg-white text-white dark:text-slate-900' : cat.color + ' ring-2 ring-offset-2 ring-[#E81633]') : 'bg-white dark:bg-slate-800/60 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-700'}`}>
                    {cat.icon && <cat.icon className={`w-4 h-4 mr-1.5 ${activeCategory === cat.id && cat.id !== 'all' ? 'opacity-100' : 'opacity-70'}`} />} {cat.name}
                  </button>
                ))}
              </div>
            )}

            <div className={`bg-white dark:bg-slate-800/80 backdrop-blur-md rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 md:p-6 min-h-[60vh] transition-colors ${viewMode === 'momentos' ? 'p-0 overflow-hidden' : ''}`}>
              
              {/* VISTA 1: TIMELINE */}
              {viewMode === 'timeline' && (
                <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 dark:before:via-slate-600 before:to-transparent">
                  {filteredEvents.map((event) => {
                    const catData = CATEGORIES.find(c => c.id === event.categoryId) || CATEGORIES[0];
                    const Icon = catData.icon || Heart;
                    const dateObj = new Date(event.date + 'T12:00:00');
                    return (
                      <div key={event.id} onClick={() => { setSelectedEvent({...event, catData}); setIsEditingEvent(false); }} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group cursor-pointer">
                        <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-slate-800 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm ${catData.color} absolute left-0 md:left-1/2 md:-ml-5 z-10 transition-transform group-hover:scale-110`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] ml-auto md:ml-0 p-4 rounded-2xl border border-gray-100 dark:border-slate-700/50 bg-gray-50 dark:bg-slate-700/30 hover:bg-white dark:hover:bg-slate-700 transition">
                          {event.media_urls && event.media_urls.length > 0 && (
                            <div className="w-full h-32 md:h-48 mb-3 rounded-xl overflow-hidden relative bg-black/5">
                              {isVideo(event.media_urls[0]) ? <video src={event.media_urls[0]} className="w-full h-full object-cover opacity-80" /> : <Image src={`${event.media_urls[0]}?width=500&quality=75`} alt="Miniatura" fill className="object-cover" sizes="(max-width: 768px) 100vw, 400px" />}
                              {event.media_urls.length > 1 && <span className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md text-white text-[10px] px-2 py-1 rounded-full flex items-center font-bold"><Camera className="w-3 h-3 mr-1" /> {event.media_urls.length}</span>}
                            </div>
                          )}
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${catData.color}`}>{catData.name}</span>
                            <span className="text-xs font-bold text-gray-400">{String(dateObj.getDate()).padStart(2, '0')} {monthNames[dateObj.getMonth()]}</span>
                          </div>
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mt-1 truncate">{event.title}</h3>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* VISTA 2: MOMENTOS */}
              {viewMode === 'momentos' && (
                <div className="w-full h-[70vh] rounded-3xl overflow-hidden relative bg-black flex flex-col group">
                  {allMediaFlat.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400"><Camera className="w-12 h-12 mb-4 opacity-50" /><p>Nenhuma mídia no seu Laço.</p></div>
                  ) : (
                    <>
                      <div className="absolute top-0 inset-x-0 p-4 z-20 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setMomentsOrder(prev => prev === 'cronologica' ? 'aleatoria' : 'cronologica')} className="p-2 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full text-white transition">{momentsOrder === 'cronologica' ? <Clock className="w-4 h-4" /> : <Shuffle className="w-4 h-4" />}</button>
                        <button onClick={() => setIsPlayingMoments(!isPlayingMoments)} className="px-4 py-2 bg-[#E81633] hover:bg-[#c2122a] rounded-full text-white font-bold flex items-center shadow-lg transition">{isPlayingMoments ? <><Pause className="w-4 h-4 mr-2" /> Pausar</> : <><Play className="w-4 h-4 mr-2" /> Tocar</>}</button>
                      </div>

                      <div key={momentIndex} className="flex-1 relative w-full h-full animate-in fade-in duration-500">
                        {isVideo(allMediaFlat[momentIndex]?.url) ? (
                          <video src={allMediaFlat[momentIndex]?.url} controls={!isPlayingMoments} autoPlay={isPlayingMoments} loop muted={isPlayingMoments} className="w-full h-full object-contain" />
                        ) : (
                          <Image src={`${allMediaFlat[momentIndex]?.url}?width=800&quality=80`} alt="Momento" fill className="object-contain" sizes="100vw" priority />
                        )}
                      </div>

                      <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black via-black/80 to-transparent z-10 animate-in slide-in-from-bottom-2 duration-500">
                        <span className="text-[#E81633] font-bold text-xs uppercase tracking-wider mb-1 block">{new Date(allMediaFlat[momentIndex]?.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                        <h2 className="text-white text-2xl font-bold mb-2">{allMediaFlat[momentIndex]?.title}</h2>
                        <p className="text-gray-300 text-sm line-clamp-2">{allMediaFlat[momentIndex]?.desc}</p>
                      </div>

                      <button onClick={() => { setIsPlayingMoments(false); setMomentIndex(prev => prev === 0 ? allMediaFlat.length - 1 : prev - 1); }} className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/40 hover:bg-black/70 text-white rounded-full z-20 opacity-0 group-hover:opacity-100 transition"><ChevronLeft className="w-6 h-6" /></button>
                      <button onClick={() => { setIsPlayingMoments(false); setMomentIndex(prev => (prev + 1) % allMediaFlat.length); }} className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/40 hover:bg-black/70 text-white rounded-full z-20 opacity-0 group-hover:opacity-100 transition"><ChevronRight className="w-6 h-6" /></button>
                      
                      <div className="absolute top-2 inset-x-2 z-20 flex space-x-1 opacity-60">
                        {allMediaFlat.map((_, i) => <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i === momentIndex ? 'bg-white' : 'bg-white/30'}`} />)}
                      </div>
                    </>
                  )}
                </div>
              )}
              
              {/* VISTA 3: CALENDÁRIO */}
              {viewMode === 'calendar' && (
                <div className="animate-in fade-in duration-300">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 capitalize">{monthNames[currentDate.getMonth()]} <span className="text-gray-400 font-normal">{currentDate.getFullYear()}</span></h2>
                    <div className="flex space-x-1">
                      <button onClick={prevMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition"><ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" /></button>
                      <button onClick={nextMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition"><ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" /></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-1 md:gap-2">
                    {daysOfWeek.map(day => <div key={day} className="text-center py-2 text-xs font-medium text-gray-400 uppercase">{day}</div>)}
                    {Array.from({ length: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay() }).map((_, i) => <div key={`empty-${i}`} className="h-12 md:h-24 rounded-xl bg-transparent"></div>)}
                    {Array.from({ length: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate() }).map((_, i) => {
                      const dayNumber = i + 1;
                      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
                      const dayEvents = filteredEvents.filter(e => e.date === dateStr);
                      return (
                        <div key={dayNumber} className="min-h-14 md:min-h-24 p-1 md:p-2 rounded-xl border border-gray-100 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-700/20 hover:bg-white dark:hover:bg-slate-700/60 transition relative flex flex-col items-center md:items-start">
                          <span className={`text-xs md:text-sm font-medium ${dayEvents.length > 0 ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>{dayNumber}</span>
                          <div className="mt-1 flex flex-col w-full space-y-1 items-center md:items-start">
                            {dayEvents.map(event => {
                              const catData = CATEGORIES.find(c => c.id === event.categoryId) || CATEGORIES[0];
                              const Icon = catData.icon || Heart;
                              return (
                                <div key={event.id} onClick={() => { setSelectedEvent({...event, catData}); setIsEditingEvent(false); }} className={`w-2 h-2 md:w-full md:h-auto rounded-full md:rounded-md border md:px-1.5 md:py-1 flex items-center cursor-pointer transition hover:opacity-80 ${catData.color}`} title={event.title}>
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

          {/* CAIXA LATERAL - COM SCROLL INDEPENDENTE */}
          <div className="lg:col-span-1">
            {/* O max-h-[calc(100vh-7rem)] e overflow-y-auto ativam o scroll isolado nesta caixa */}
            <div className="bg-white dark:bg-slate-800/90 backdrop-blur-md rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto scrollbar-hide space-y-8">
              
              <div>
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-pink-50 dark:bg-pink-900/20 rounded-xl mr-3"><Gift className="w-5 h-5 text-pink-500" /></div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Chegando em Breve</h3>
                </div>
                <div className="space-y-4">
                  {futureMilestones.length === 0 ? <p className="text-sm text-gray-500 italic">Sem aniversários futuros.</p> : futureMilestones.map((m, i) => {
                    const catData = CATEGORIES.find(c => c.id === m.categoryId) || CATEGORIES[0];
                    const Icon = catData.icon || Heart;
                    return (
                      <div key={i} onClick={() => { setSelectedEvent({...m, catData}); setIsEditingEvent(false); }} className="flex items-start cursor-pointer p-2 rounded-2xl hover:bg-gray-50 dark:hover:bg-slate-700/50 transition">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mr-3 ${catData.color.split(' ')[0]} ${catData.color.split(' ')[1]}`}><Icon className="w-5 h-5" /></div>
                        <div>
                          <p className="text-xs font-bold text-[#E81633] uppercase">{String(m.anniversaryDate.getDate()).padStart(2, '0')} {monthNames[m.anniversaryDate.getMonth()]}</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">{m.label} de "{m.title}"</p>
                          <p className="text-xs text-gray-500 mt-1">{m.diffDays === 0 ? '✨ É HOJE!' : `Faltam ${m.diffDays} dias`}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-gray-100 dark:bg-slate-700 rounded-xl mr-3"><Clock className="w-5 h-5 text-gray-500" /></div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Aconteceu Recentemente</h3>
                </div>
                <div className="space-y-4">
                  {pastMilestones.length === 0 ? <p className="text-sm text-gray-500 italic">Sem aniversários passados.</p> : pastMilestones.map((m, i) => {
                    const catData = CATEGORIES.find(c => c.id === m.categoryId) || CATEGORIES[0];
                    const Icon = catData.icon || Heart;
                    return (
                      <div key={i} onClick={() => { setSelectedEvent({...m, catData}); setIsEditingEvent(false); }} className="flex items-start cursor-pointer p-2 rounded-2xl opacity-70 hover:opacity-100 transition">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mr-3 ${catData.color.split(' ')[0]} ${catData.color.split(' ')[1]}`}><Icon className="w-5 h-5" /></div>
                        <div>
                          <p className="text-xs font-bold text-gray-500 uppercase">{String(m.anniversaryDate.getDate()).padStart(2, '0')} {monthNames[m.anniversaryDate.getMonth()]}</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">{m.label} de "{m.title}"</p>
                          <p className="text-xs text-gray-500 mt-1">Há {Math.abs(m.diffDays)} dias</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      <button onClick={openNewEventModal} className="fixed bottom-6 right-6 w-14 h-14 bg-[#E81633] hover:bg-[#c2122a] text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform z-40">
        <Plus className="w-6 h-6" />
      </button>

      {/* MODAL 1: CRIAR / EDITAR */}
      {(isNewEventOpen || isEditingEvent) && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl p-6 relative border border-transparent dark:border-slate-700 max-h-[90vh] overflow-y-auto scrollbar-hide">
            <button onClick={() => {setIsNewEventOpen(false); setIsEditingEvent(false)}} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-full"><X className="w-5 h-5" /></button>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{isEditingEvent ? 'Editar Memória' : 'Nova Memória'}</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Título</label>
                <input type="text" value={eventTitle} onChange={e => setEventTitle(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#E81633]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Descrição</label>
                <textarea value={eventDesc} onChange={e => setEventDesc(e.target.value)} rows={2} className="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#E81633]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Data</label>
                  <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white text-sm outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Categoria</label>
                  <select value={eventCatId} onChange={e => setEventCatId(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white text-sm outline-none">
                    {dbCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Fotos & Vídeos</label>
                <div className="flex overflow-x-auto pb-2 space-x-2 snap-x scrollbar-hide">
                  {eventMediaUrls.map((url, idx) => (
                    <div key={idx} className="relative w-24 h-24 shrink-0 rounded-xl overflow-hidden snap-start border border-gray-200 dark:border-slate-700 group">
                      {isVideo(url) ? <video src={url} className="w-full h-full object-cover" /> : <Image src={`${url}?width=200&quality=60`} alt="Mídia" fill className="object-cover" sizes="100px" />}
                      <button onClick={() => removeMedia(idx)} className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                  <label className="w-24 h-24 shrink-0 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition snap-start text-gray-400 dark:hover:text-white">
                    <Upload className="w-6 h-6 mb-1" />
                    <span className="text-[10px] text-center px-1">{uploading ? 'Enviando...' : 'Adicionar Mídia'}</span>
                    <input type="file" multiple accept="image/*,video/*" onChange={e => handleStorageUpload(e, 'event')} className="hidden" disabled={uploading} />
                  </label>
                </div>
              </div>

              <div className="flex space-x-2 mt-4 pt-2 border-t border-gray-100 dark:border-slate-700">
                {isEditingEvent && <button onClick={handleDeleteEvent} className="w-1/4 py-3 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl flex items-center justify-center transition hover:bg-red-100 dark:hover:bg-red-900/40"><Trash2 className="w-5 h-5" /></button>}
                <button onClick={handleSaveEvent} className="flex-1 py-3 bg-[#E81633] text-white rounded-xl font-bold flex items-center justify-center hover:bg-[#c2122a] transition"><Save className="w-4 h-4 mr-2" /> {isEditingEvent ? 'Salvar Alterações' : 'Publicar'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: VISUALIZAÇÃO DE EVENTO */}
      {selectedEvent && !isEditingEvent && (
        <div onClick={() => setSelectedEvent(null)} className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in cursor-pointer">
          <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative border border-transparent dark:border-slate-700 cursor-default max-h-[90vh] overflow-y-auto group/modal">
            
            <button onClick={() => setSelectedEvent(null)} className="absolute top-4 right-4 p-2 bg-black/40 text-white rounded-full hover:bg-black/70 transition z-30"><X className="w-5 h-5" /></button>

            <div className="relative w-full aspect-square md:aspect-video bg-black flex items-center justify-center">
              {selectedEvent.media_urls && selectedEvent.media_urls.length > 0 ? (
                <>
                  {isVideo(selectedEvent.media_urls[momentIndex % selectedEvent.media_urls.length]) ? (
                    <video src={selectedEvent.media_urls[momentIndex % selectedEvent.media_urls.length]} controls className="w-full h-full object-contain" />
                  ) : (
                    <>
                      <Image src={`${selectedEvent.media_urls[momentIndex % selectedEvent.media_urls.length]}?width=100`} alt="Plano de fundo" fill className="object-cover blur-2xl opacity-40 scale-110" sizes="500px" />
                      <Image src={`${selectedEvent.media_urls[momentIndex % selectedEvent.media_urls.length]}?width=800&quality=80`} alt={selectedEvent.title} fill className="object-contain z-10 animate-in fade-in" sizes="(max-width: 768px) 100vw, 500px" key={momentIndex} />
                    </>
                  )}
                  {selectedEvent.media_urls.length > 1 && (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); setMomentIndex(prev => prev === 0 ? selectedEvent.media_urls.length - 1 : prev - 1); }} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/40 text-white rounded-full z-20 hover:bg-black/80 transition"><ChevronLeft className="w-5 h-5" /></button>
                      <button onClick={(e) => { e.stopPropagation(); setMomentIndex(prev => prev + 1); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/40 text-white rounded-full z-20 hover:bg-black/80 transition"><ChevronRight className="w-5 h-5" /></button>
                      <div className="absolute bottom-3 inset-x-0 flex justify-center space-x-1.5 z-20">
                        {selectedEvent.media_urls.map((_: any, i: number) => <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === (momentIndex % selectedEvent.media_urls.length) ? 'bg-white' : 'bg-white/40'}`} />)}
                      </div>
                    </>
                  )}
                </>
              ) : (
                 <div className={`w-full h-full flex items-center justify-center ${selectedEvent.catData.color.split(' ')[0]}`}>
                   {React.createElement(selectedEvent.catData.icon || Heart, { className: `w-20 h-20 ${selectedEvent.catData.color.split(' ')[1]}` })}
                 </div>
              )}
            </div>

            <div className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex space-x-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${selectedEvent.catData.color}`}>{selectedEvent.catData.name}</span>
                  <span className="text-xs font-bold text-gray-500 uppercase mt-0.5">{new Date(selectedEvent.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                </div>
                <button onClick={() => { openEditModal(selectedEvent); setMomentIndex(0); }} className="text-xs font-bold text-blue-500 flex items-center p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition"><Edit className="w-3.5 h-3.5 mr-1" /> Editar</button>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{selectedEvent.title}</h2>
              <p className="text-gray-600 dark:text-gray-300 text-sm whitespace-pre-line">{selectedEvent.description}</p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CONFIGURAÇÕES COM CHECAGEM DE PARCEIRO */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md p-6 relative border border-gray-100 dark:border-slate-700">
             <button onClick={() => setIsSettingsOpen(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-full"><X className="w-5 h-5" /></button>
             <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Configurações</h2>
             <div className="space-y-4">
               <div>
                 <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Nome do Casal</label>
                 <input type="text" value={shipName} onChange={e => setShipName(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#E81633]" />
               </div>
               <div>
                 <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Plano de fundo do App</label>
                 <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 relative overflow-hidden group">
                   {bgImgUrl ? <Image src={`${bgImgUrl}?width=400`} alt="Plano de fundo" fill className="object-cover" sizes="400px" /> : <Upload className="w-6 h-6 text-gray-400" />}
                   <input type="file" accept="image/*" onChange={e => handleStorageUpload(e, 'background')} className="hidden" />
                 </label>
               </div>
               
               {/* VERIFICAÇÃO SE ALGUÉM JÁ ENTROU PELO CONVITE */}
               {lacoData?.user_invited_id && lacoData?.user_creator_id ? (
                 <div className="pt-2">
                   <div className="w-full p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl flex items-center justify-center">
                     <Heart className="w-5 h-5 mr-2 text-[#E81633] animate-pulse" />
                     <span className="text-sm font-medium text-red-800 dark:text-red-200">
                       {partnerName ? `Conectado(a) com ${partnerName}` : 'Seu amor já está conectado a este Laço!'}
                     </span>
                   </div>
                 </div>
               ) : (
                 <div className="pt-2">
                   <button onClick={copyInviteLink} className="w-full p-3 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-700 transition">
                     <LinkIcon className="w-4 h-4 mr-2 text-[#E81633]" /> {copied ? 'Link Copiado!' : 'Copiar Link de Convite'}
                   </button>
                 </div>
               )}

               <button onClick={handleSaveSettings} className="w-full py-3 bg-[#E81633] hover:bg-[#c2122a] text-white rounded-xl font-bold transition">Salvar Configurações</button>
             </div>
           </div>
        </div>
      )}
    </div>
  );
}