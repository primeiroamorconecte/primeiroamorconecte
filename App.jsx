import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabase'
import QRCode from 'qrcode'
import logoUrl from './assets/logo.svg'

const ORANGE = '#f97316'
const cx = (...a) => a.filter(Boolean).join(' ')

const Container = ({ children }) => <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">{children}</div>
const Card = ({ children, className }) => <div className={cx('rounded-2xl shadow-lg border border-neutral-800 bg-neutral-950', className)}>{children}</div>
const Button = ({ children, onClick, type='button', variant='primary', className }) => {
  const base = 'inline-flex items-center justify-center rounded-2xl px-4 py-2 font-semibold transition active:scale-95'
  const styles = { primary: 'bg-orange-500 hover:bg-orange-600 text-white', outline: 'border border-orange-500 text-orange-500 hover:bg-orange-500/10', ghost: 'text-white/80 hover:text-white', danger: 'bg-red-600 hover:bg-red-700 text-white' }
  return <button type={type} onClick={onClick} className={cx(base, styles[variant], className)}>{children}</button>
}
const Input = (props) => <input {...props} className={cx('w-full rounded-xl bg-neutral-900 border border-neutral-800 px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500', props.className)} />
const TextArea = (props) => <textarea {...props} className={cx('w-full rounded-xl bg-neutral-900 border border-neutral-800 px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500', props.className)} />
const Label = ({ children }) => <label className="block text-sm font-medium text-neutral-300 mb-1">{children}</label>
const Tag = ({ children }) => <span className="inline-block text-xs border border-orange-500/60 text-orange-400 px-2 py-0.5 rounded-full mr-1 mb-1">{children}</span>

const NavItem = ({ label, active, onClick }) => (<button onClick={onClick} className={cx('px-3 py-2 rounded-xl text-sm font-semibold', active ? 'bg-white text-black' : 'text-white/80 hover:text-white hover:bg-white/10')}>{label}</button>)
const Logo = () => (<div className='flex items-center gap-3'><img src={logoUrl} alt="Primeiro Amor Conecte" className="h-8"/><span className="sr-only">Primeiro Amor Conecte</span></div>)

function fmtDate(iso){ try { const d = new Date(iso); return d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'}) } catch { return iso } }
function fmtDateTime(iso){ try { const d = new Date(iso); return d.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) } catch { return iso } }

function Section({ title, right, children }){ return (<section className='mt-10'><div className='flex items-center justify-between mb-4'><h3 className='text-white font-bold text-xl'>{title}</h3>{right}</div>{children}</section>) }

export default function App(){
  const [page, setPage] = useState('home')
  const [user, setUser] = useState(null)
  const [admins] = useState((import.meta.env.VITE_ADMIN_EMAILS || '').split(',').map(s=>s.trim()).filter(Boolean))
  const [settings, setSettings] = useState({ id: 1, pix_key: 'CHAVE PIX AQUI', pix_qr_data_url: '' })

  const [events, setEvents] = useState([])
  const [sermons, setSermons] = useState([])
  const [notices, setNotices] = useState([])
  const [groups, setGroups] = useState([])
  const [prayers, setPrayers] = useState([])
  const [members, setMembers] = useState([])
  const [volunteers, setVolunteers] = useState([])
  const [courses, setCourses] = useState([])

  const isAdmin = !!(user?.email && admins.includes(user.email))

  useEffect(() => {
    async function load() {
      // Seleções tolerantes: se o Supabase não estiver configurado, ignora erros
      const safe = async (p) => { try { const { data } = await p; return data || [] } catch { return [] } }
      const [ev,se,no,gr,pr,me,vo,co,st] = await Promise.all([
        safe(supabase.from('events').select('*').order('date', { ascending: true })),
        safe(supabase.from('sermons').select('*').order('date', { ascending: false })),
        safe(supabase.from('notices').select('*').order('created_at', { ascending: false })),
        safe(supabase.from('groups').select('*').order('created_at', { ascending: true })),
        safe(supabase.from('prayers').select('*').order('created_at', { ascending: false })),
        safe(supabase.from('members').select('*').order('created_at', { ascending: false })),
        safe(supabase.from('volunteers').select('*').order('created_at', { ascending: false })),
        safe(supabase.from('courses').select('*').order('created_at', { ascending: false })),
        safe(supabase.from('settings').select('*').eq('id', 1)),
      ])
      setEvents(ev); setSermons(se); setNotices(no); setGroups(gr); setPrayers(pr); setMembers(me); setVolunteers(vo); setCourses(co)
      if (st && st[0]) setSettings(st[0])

      supabase.auth.getUser().then(({ data }) => setUser(data?.user || null)).catch(()=>{})
      const { data: sub } = supabase.auth.onAuthStateChange((_e, session)=> setUser(session?.user || null))
      return () => sub?.subscription?.unsubscribe?.()
    }
    load()
  }, [])

  async function updateSettings(patch){
    try{
      const next = { ...settings, ...patch }
      setSettings(next)
      const { data } = await supabase.from('settings').upsert(next, { onConflict: 'id' }).select()
      if (data?.[0]) setSettings(data[0])
    }catch{}
  }

  async function generatePixQR(){
    try{
      const text = settings.pix_key || ''
      const url = await QRCode.toDataURL(text, { margin: 1, scale: 6 })
      await updateSettings({ pix_qr_data_url: url })
    }catch{}
  }

  const wrap = (table, setter, prepend=False) => ({
    add: async (f) => { try { const { data } = await supabase.from(table).insert(f).select(); if(data) setter(p=> prepend ? [...data, ...p] : [...p, ...data]) } catch {} },
    del: async (id) => { try { await supabase.from(table).delete().eq('id', id); setter(p=>p.filter(i=>i.id!==id)) } catch {} },
    upd: async (id, patch) => { try { const { data } = await supabase.from(table).update(patch).eq('id', id).select(); if(data) setter(p=>p.map(x=>x.id===id?{...x, ...data[0]}:x)) } catch {} },
  })

  const EventsAPI = wrap('events', setEvents)
  const SermonsAPI = wrap('sermons', setSermons, true)
  const NoticesAPI = wrap('notices', setNotices, true)
  const GroupsAPI = wrap('groups', setGroups)
  const PrayersAPI = wrap('prayers', setPrayers, true)
  const MembersAPI = wrap('members', setMembers, true)
  const VolunteersAPI = wrap('volunteers', setVolunteers, true)
  const CoursesAPI = wrap('courses', setCourses, true)

  const nav = [
    ['home','Início'],
    ['events','Eventos'],
    ['sermons','Mensagens'],
    ['groups','Células'],
    ['donations','Doações'],
    ['prayer','Oração'],
    ['members','Membros'],
    ['volunteers','Voluntários'],
    ['courses','Cursos'],
    ['about','Sobre'],
    ['contact','Contato'],
  ]

  return (
    <div className="min-h-screen bg-neutral-950" style={{ backgroundImage: `radial-gradient(1200px 600px at 50% -10%, ${ORANGE}20, transparent), radial-gradient(800px 400px at 120% 10%, #ffffff10, transparent)` }}>
      <header className="sticky top-0 z-40 backdrop-blur border-b border-neutral-800 bg-neutral-950/70">
        <Container>
          <div className="flex items-center justify-between h-16">
            <Logo />
            <nav className="hidden xl:flex items-center gap-2">
              {nav.map(([k,label]) => <NavItem key={k} label={label} active={page===k} onClick={()=>setPage(k)} />)}
            </nav>
            <div className="flex items-center gap-2">
              {user ? (
                <>
                  {isAdmin && <span className="text-xs text-orange-400 border border-orange-500/40 rounded-full px-2 py-0.5">ADMIN</span>}
                  <Button variant="outline" onClick={()=>setPage('admin')}>Painel</Button>
                  <Button variant="ghost" onClick={()=>supabase.auth.signOut()}>Sair</Button>
                </>
              ) : (
                <Button onClick={()=>setPage('login')}>Entrar</Button>
              )}
            </div>
          </div>
        </Container>
      </header>

      <main>
        <Container>
          {page === 'home' && <Home events={events} notices={notices} />}
          {page === 'events' && <Events events={events} />}
          {page === 'sermons' && <Sermons sermons={sermons} />}
          {page === 'groups' && <Groups groups={groups} />}
          {page === 'donations' && <Donations settings={settings} generatePixQR={generatePixQR} />}
          {page === 'prayer' && <PrayerRequests prayers={prayers} onAdd={(f)=>PrayersAPI.add(f)} onUpdate={(id,patch)=>PrayersAPI.upd(id,patch)} onRemove={(id)=>PrayersAPI.del(id)} isAdmin={isAdmin} />}
          {page === 'members' && <Members members={members} />}
          {page === 'volunteers' && <Volunteers volunteers={volunteers} />}
          {page === 'courses' && <Courses courses={courses} />}
          {page === 'about' && <About />}
          {page === 'contact' && <Contact />}

          {page === 'login' && <Login onAuthed={(u)=>{ setUser(u); setPage(isAdmin? 'admin' : 'home') }} />}
          {page === 'admin' && (user && isAdmin ? <Admin
            eventsAPI={EventsAPI} sermonsAPI={SermonsAPI} noticesAPI={NoticesAPI} groupsAPI={GroupsAPI}
            prayersAPI={PrayersAPI} membersAPI={MembersAPI} volunteersAPI={VolunteersAPI} coursesAPI={CoursesAPI}
            settings={settings} updateSettings={updateSettings} generatePixQR={generatePixQR}
          /> : <Login onAuthed={(u)=>{ setUser(u); setPage(isAdmin? 'admin' : 'home') }} />)}
        </Container>
        <Footer />
      </main>
    </div>
  )
}

function Footer(){ return (<footer className="mt-16 border-t border-neutral-800"><Container><div className="py-8 text-neutral-400 text-sm flex flex-col sm:flex-row items-center justify-between gap-4"><div>© {new Date().getFullYear()} Igreja Cristã Primeiro Amor • "Sempre com você"</div><div className="flex items-center gap-4"><a className="hover:text-white" href="#">Instagram</a><a className="hover:text-white" href="#">YouTube</a><a className="hover:text-white" href="#">WhatsApp</a></div></div></Container></footer>) }

function Home({ events, notices }){
  const upcoming = useMemo(()=>[...events].sort((a,b)=>new Date(a.date)-new Date(b.date)).slice(0,3), [events])
  return (<div className="space-y-8"><Hero /><Section title="Próximos eventos"><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">{upcoming.map(ev => (<Card key={ev.id} className="p-5"><h4 className="text-white font-bold text-lg">{ev.title}</h4><p className="text-neutral-400 text-sm mt-1">{fmtDateTime(ev.date)} • {ev.location}</p><p className="text-neutral-300 mt-3">{ev.description}</p></Card>))}</div></Section><Section title="Avisos"><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">{notices.map(n => (<Card key={n.id} className="p-5"><h4 className="text-white font-bold">{n.title}</h4><p className="text-neutral-400 text-sm mt-1">{fmtDate(n.created_at)}</p><p className="text-neutral-300 mt-3 whitespace-pre-wrap">{n.body}</p></Card>))}</div></Section></div>)
}

function Hero(){ return (<div className="relative overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-950"><div className="absolute inset-0 opacity-20" style={{background: `radial-gradient(circle at 20% 10%, ${ORANGE}, transparent 40%)`}} /><div className="relative px-8 py-14 sm:px-16 sm:py-20"><h1 className="text-3xl sm:text-5xl font-extrabold text-white max-w-3xl leading-tight">PRIMEIRO AMOR CONECTE</h1><p className="text-neutral-300 mt-4 max-w-2xl">App oficial da Igreja Cristã Primeiro Amor.</p><div className="mt-6 flex flex-wrap gap-3"><Button onClick={()=>window.scrollTo({top:99999, behavior:'smooth'})}>Explorar</Button><Button variant="outline" onClick={()=>alert('Transmissão ao vivo em breve!')}>Ao vivo</Button></div></div></div>) }

function Events({ events }){
  const byDate = [...events].sort((a,b)=>new Date(a.date)-new Date(b.date))
  return (<div><Section title="Eventos e cultos"><div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">{byDate.map(ev => (<Card key={ev.id} className="p-5"><div className="flex items-start justify-between gap-4"><div><h4 className="text-white font-bold">{ev.title}</h4><p className="text-neutral-400 text-sm mt-1">{fmtDateTime(ev.date)} • {ev.location}</p></div></div><p className="text-neutral-300 mt-3">{ev.description}</p></Card>))}</div></Section></div>)
}

function Sermons({ sermons }){
  const list = [...sermons].sort((a,b)=>new Date(b.date)-new Date(a.date))
  return (<div><Section title="Mensagens / Sermões"><div className="grid lg:grid-cols-2 gap-6">{list.map(s => (<Card key={s.id} className="p-5"><h4 className="text-white font-bold text-lg">{s.title}</h4><p className="text-neutral-400 text-sm mt-1">{fmtDate(s.date)} • {s.speaker}</p>{s.tags?.length ? (<div className="mt-2">{s.tags.map(t => <Tag key={t}>{t}</Tag>)}</div>) : null}{s.video_url ? (<div className="mt-4 aspect-video w-full overflow-hidden rounded-xl border border-neutral-800"><iframe className="w-full h-full" src={s.video_url} title={s.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe></div>) : (<p className="text-neutral-400 italic mt-4">Vídeo em breve.</p>)}</Card>))}</div></Section></div>)
}

function Donations({ settings, generatePixQR }){
  return (<div><Section title="Doações"><Card className="p-6"><p className="text-neutral-300">Agradecemos sua contribuição! Você pode ofertar via PIX.</p><div className="mt-4 grid sm:grid-cols-2 gap-6 items-center"><div><Label>Chave PIX</Label><Input readOnly value={settings.pix_key || ''} onFocus={(e)=>e.target.select()} /><p className="text-neutral-400 text-sm mt-2">Copie a chave e use no seu banco.</p></div><div className="justify-self-center">{settings.pix_qr_data_url ? (<img src={settings.pix_qr_data_url} alt="QR PIX" className="w-48 h-48 bg-white rounded-xl p-2" />) : (<div className="w-48 h-48 bg-white rounded-xl flex items-center justify-center"><div className="text-xs text-black text-center px-2">QR Code PIX<br/>Clique no botão no painel Admin para gerar.</div></div>)}</div></div></Card></Section></div>)
}

function PrayerRequests({ prayers, onAdd, onUpdate, onRemove, isAdmin }){
  const [name, setName] = useState(''); const [request, setRequest] = useState('')
  const submit = async (e) => { e.preventDefault(); if (!request.trim()) return; await onAdd({ name: name || 'Anônimo', request }); setName(''); setRequest('') }
  return (<div><Section title="Pedidos de Oração"><div className="grid lg:grid-cols-2 gap-6"><Card className="p-6"><form onSubmit={submit} className="space-y-3"><div><Label>Seu nome (opcional)</Label><Input value={name} onChange={e=>setName(e.target.value)} placeholder="Seu nome" /></div><div><Label>Pedido de oração</Label><TextArea rows={5} value={request} onChange={e=>setRequest(e.target.value)} placeholder="Escreva seu pedido" /></div><Button type="submit">Enviar pedido</Button></form></Card><div className="space-y-4">{prayers.map(p => (<Card key={p.id} className="p-5"><div className="flex items-center justify-between"><div><h4 className="text-white font-semibold">{p.name}</h4><p className="text-neutral-400 text-sm mt-1">{fmtDateTime(p.created_at)}</p></div>{isAdmin && (<div className="flex gap-2"><Button variant="outline" onClick={()=>onUpdate(p.id, { status: p.status === 'Novo' ? 'Atendido' : 'Novo' })}>Marcar como {p.status === 'Novo' ? 'Atendido' : 'Novo'}</Button><Button variant="danger" onClick={()=>onRemove(p.id)}>Excluir</Button></div>)}</div><p className="text-neutral-200 mt-3 whitespace-pre-wrap">{p.request}</p></Card>))}</div></div></Section></div>)
}

function Groups({ groups }){
  return (<div><Section title="Células / Pequenos Grupos"><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">{groups.map(g => (<Card key={g.id} className="p-5"><h4 className="text-white font-bold">{g.name}</h4><p className="text-neutral-400 text-sm mt-1">{g.day} • {g.time}</p><p className="text-neutral-300 mt-2">Líder: {g.leader}</p><p className="text-neutral-300">Local: {g.address}</p></Card>))}</div></Section></div>)
}

function Members({ members }){
  return (<div><Section title="Membros"><div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">{members.map(m => (<Card key={m.id} className="p-5"><h4 className="text-white font-bold">{m.name}</h4><p className="text-neutral-400 text-sm">{m.role || 'Membro'}</p><p className="text-neutral-300 mt-2">{m.email || ''}</p></Card>))}</div></Section></div>)
}

function Volunteers({ volunteers }){
  return (<div><Section title="Voluntários"><div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">{volunteers.map(v => (<Card key={v.id} className="p-5"><h4 className="text-white font-bold">{v.name}</h4><p className="text-neutral-400 text-sm">{v.ministry || 'Ministério'}</p><p className="text-neutral-300 mt-2">{v.phone || ''}</p></Card>))}</div></Section></div>)
}

function Courses({ courses }){
  return (<div><Section title="Cursos"><div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">{courses.map(c => (<Card key={c.id} className="p-5"><h4 className="text-white font-bold">{c.title}</h4><p className="text-neutral-400 text-sm">{c.when || ''}</p><p className="text-neutral-300 mt-2">{c.description || ''}</p></Card>))}</div></Section></div>)
}

function About(){ return (<div><Section title="Sobre a ICPA"><Card className="p-6 text-neutral-300 leading-relaxed"><p>Somos a Igreja Cristã Primeiro Amor (Itaquera & Guaianases).</p><p className="mt-3">Missão: amar a Deus acima de tudo e ao próximo como a nós mesmos.</p></Card></Section></div>) }
function Contact(){ return (<div><Section title="Contato"><Card className="p-6"><p className="text-neutral-300">Endereços: Itaquera e Guaianases (SP). Para falar conosco:</p><ul className="mt-2 text-neutral-300 list-disc pl-6"><li>WhatsApp: (11) 99287-9753</li><li>Email: moriaportariaeservicos@gmail.com</li></ul></Card></Section></div>) }

function Login({ onAuthed }){
  const [email, setEmail] = useState(''); const [pwd, setPwd] = useState('')
  async function submit(e){ e.preventDefault(); try{ const { data, error } = await supabase.auth.signInWithPassword({ email, password: pwd }); if (error) { alert('Erro ao entrar: ' + error.message); return } onAuthed(data.user) } catch(e){ alert('Configurar Supabase nas variáveis do Netlify.') } }
  return (<div className="max-w-md mx-auto"><Card className="p-6"><h4 className="text-white font-bold text-xl">Entrar</h4><form className="mt-4 space-y-3" onSubmit={submit}><div><Label>Email</Label><Input value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@email.com" /></div><div><Label>Senha</Label><Input type="password" value={pwd} onChange={e=>setPwd(e.target.value)} placeholder="••••••••" /></div><Button type="submit" className="w-full">Continuar</Button></form></Card></div>)
}

function Admin({ eventsAPI, sermonsAPI, noticesAPI, groupsAPI, prayersAPI, membersAPI, volunteersAPI, coursesAPI, settings, updateSettings, generatePixQR }){
  const [tab, setTab] = useState('events')
  return (<div><Section title="Administração"><div className="flex flex-wrap gap-2 mb-4">{[['events','Eventos'],['sermons','Sermões'],['notices','Avisos'],['prayers','Orações'],['groups','Células'],['members','Membros'],['volunteers','Voluntários'],['courses','Cursos'],['settings','Configurações']].map(([k,label]) => (<NavItem key={k} label={label} active={tab===k} onClick={()=>setTab(k)} />))}</div>{tab==='events' && <AdminEvents api={eventsAPI} />}{tab==='sermons' && <AdminSermons api={sermonsAPI} />}{tab==='notices' && <AdminNotices api={noticesAPI} />}{tab==='prayers' && <AdminPrayers api={prayersAPI} />}{tab==='groups' && <AdminGroups api={groupsAPI} />}{tab==='members' && <AdminMembers api={membersAPI} />}{tab==='volunteers' && <AdminVolunteers api={volunteersAPI} />}{tab==='courses' && <AdminCourses api={coursesAPI} />}{tab==='settings' && <AdminSettings settings={settings} updateSettings={updateSettings} generatePixQR={generatePixQR} />}</Section></div>)
}

function Field({label,children}){ return (<div><Label>{label}</Label>{children}</div>) }

function AdminEvents({ api }){
  const [f, setF] = useState({ title:'', date:'', time:'20:00', location:'Itaquera', description:'' })
  const submit = async (e) => { e.preventDefault(); if(!f.title || !f.date) return; await api.add({ title: f.title, date: `${f.date}T${f.time}`, location: f.location, description: f.description }); setF({ title:'', date:'', time:'20:00', location:'Itaquera', description:'' }) }
  return (<div className="grid lg:grid-cols-3 gap-6"><Card className="p-5 lg:col-span-1"><h4 className="text-white font-bold mb-3">Novo evento</h4><form className="space-y-3" onSubmit={submit}><Field label="Título"><Input value={f.title} onChange={e=>setF({...f, title:e.target.value})} /></Field><div className="grid grid-cols-2 gap-3"><Field label="Data"><Input type="date" value={f.date} onChange={e=>setF({...f, date:e.target.value})} /></Field><Field label="Hora"><Input type="time" value={f.time} onChange={e=>setF({...f, time:e.target.value})} /></Field></div><Field label="Local"><Input value={f.location} onChange={e=>setF({...f, location:e.target.value})} /></Field><Field label="Descrição"><TextArea rows={3} value={f.description} onChange={e=>setF({...f, description:e.target.value})} /></Field><Button type="submit" className="w-full">Adicionar</Button></form></Card><ListTable table="events" onDelete={api.del} /></div>)
}

function AdminSermons({ api }){
  const [f, setF] = useState({ title:'', speaker:'', date:new Date().toISOString().slice(0,10), video_url:'', tags:'' })
  const submit = async (e) => { e.preventDefault(); if(!f.title) return; await api.add({ title: f.title, speaker: f.speaker, date: f.date, video_url: f.video_url, tags: f.tags.split(',').map(t=>t.trim()).filter(Boolean) }); setF({ title:'', speaker:'', date:new Date().toISOString().slice(0,10), video_url:'', tags:'' }) }
  return (<div className="grid lg:grid-cols-3 gap-6"><Card className="p-5 lg:col-span-1"><h4 className="text-white font-bold mb-3">Nova mensagem</h4><form className="space-y-3" onSubmit={submit}><Field label="Título"><Input value={f.title} onChange={e=>setF({...f, title:e.target.value})} /></Field><div className="grid grid-cols-2 gap-3"><Field label="Pregador"><Input value={f.speaker} onChange={e=>setF({...f, speaker:e.target.value})} /></Field><Field label="Data"><Input type="date" value={f.date} onChange={e=>setF({...f, date:e.target.value})} /></Field></div><Field label="URL do vídeo (YouTube)"><Input value={f.video_url} onChange={e=>setF({...f, video_url:e.target.value})} placeholder="https://www.youtube.com/embed/..."/></Field><Field label="Tags (vírgula)"><Input value={f.tags} onChange={e=>setF({...f, tags:e.target.value})} /></Field><Button type="submit" className="w-full">Adicionar</Button></form></Card><ListTable table="sermons" onDelete={api.del} /></div>)
}

function AdminNotices({ api }){
  const [f, setF] = useState({ title:'', body:'' })
  const submit = async (e) => { e.preventDefault(); if(!f.title) return; await api.add({ title: f.title, body: f.body }); setF({ title:'', body:'' }) }
  return (<div className="grid lg:grid-cols-3 gap-6"><Card className="p-5 lg:col-span-1"><h4 className="text-white font-bold mb-3">Novo aviso</h4><form className="space-y-3" onSubmit={submit}><Field label="Título"><Input value={f.title} onChange={e=>setF({...f, title:e.target.value})} /></Field><Field label="Conteúdo"><TextArea rows={5} value={f.body} onChange={e=>setF({...f, body:e.target.value})} /></Field><Button type="submit" className="w-full">Publicar</Button></form></Card><ListTable table="notices" onDelete={api.del} /></div>)
}

function AdminPrayers({ api }){
  return (<div className="space-y-4"><ListTable table="prayers" onDelete={api.del} toggleStatus={(row)=>api.upd(row.id, { status: row.status==='Novo' ? 'Atendido' : 'Novo' })} /></div>)
}

function AdminGroups({ api }){
  const [f, setF] = useState({ name:'', day:'Terça', time:'20:00', leader:'', address:'' })
  const submit = async (e) => { e.preventDefault(); if(!f.name) return; await api.add(f); setF({ name:'', day:'Terça', time:'20:00', leader:'', address:'' }) }
  return (<div className="grid lg:grid-cols-3 gap-6"><Card className="p-5 lg:col-span-1"><h4 className="text-white font-bold mb-3">Nova célula</h4><form className="space-y-3" onSubmit={submit}><Field label="Nome"><Input value={f.name} onChange={e=>setF({...f, name:e.target.value})} /></Field><div className="grid grid-cols-2 gap-3"><Field label="Dia"><Input value={f.day} onChange={e=>setF({...f, day:e.target.value})} /></Field><Field label="Hora"><Input type="time" value={f.time} onChange={e=>setF({...f, time:e.target.value})} /></Field></div><Field label="Líder"><Input value={f.leader} onChange={e=>setF({...f, leader:e.target.value})} /></Field><Field label="Endereço"><Input value={f.address} onChange={e=>setF({...f, address:e.target.value})} /></Field><Button type="submit" className="w-full">Adicionar</Button></form></Card><ListTable table="groups" onDelete={api.del} /></div>)
}

function AdminMembers({ api }){
  const [f, setF] = useState({ name:'', role:'Membro', email:'' })
  const submit = async (e) => { e.preventDefault(); if(!f.name) return; await api.add(f); setF({ name:'', role:'Membro', email:'' }) }
  return (<div className="grid lg:grid-cols-3 gap-6"><Card className="p-5 lg:col-span-1"><h4 className="text-white font-bold mb-3">Novo membro</h4><form className="space-y-3" onSubmit={submit}><Field label="Nome"><Input value={f.name} onChange={e=>setF({...f, name:e.target.value})} /></Field><Field label="Função"><Input value={f.role} onChange={e=>setF({...f, role:e.target.value})} /></Field><Field label="Email"><Input value={f.email} onChange={e=>setF({...f, email:e.target.value})} /></Field><Button type="submit" className="w-full">Adicionar</Button></form></Card><ListTable table="members" onDelete={api.del} /></div>)
}

function AdminVolunteers({ api }){
  const [f, setF] = useState({ name:'', ministry:'', phone:'' })
  const submit = async (e) => { e.preventDefault(); if(!f.name) return; await api.add(f); setF({ name:'', ministry:'', phone:'' }) }
  return (<div className="grid lg:grid-cols-3 gap-6"><Card className="p-5 lg:col-span-1"><h4 className="text-white font-bold mb-3">Novo voluntário</h4><form className="space-y-3" onSubmit={submit}><Field label="Nome"><Input value={f.name} onChange={e=>setF({...f, name:e.target.value})} /></Field><Field label="Ministério"><Input value={f.ministry} onChange={e=>setF({...f, ministry:e.target.value})} /></Field><Field label="Telefone"><Input value={f.phone} onChange={e=>setF({...f, phone:e.target.value})} /></Field><Button type="submit" className="w-full">Adicionar</Button></form></Card><ListTable table="volunteers" onDelete={api.del} /></div>)
}

function AdminCourses({ api }){
  const [f, setF] = useState({ title:'', when:'', description:'' })
  const submit = async (e) => { e.preventDefault(); if(!f.title) return; await api.add(f); setF({ title:'', when:'', description:'' }) }
  return (<div className="grid lg:grid-cols-3 gap-6"><Card className="p-5 lg:col-span-1"><h4 className="text-white font-bold mb-3">Novo curso</h4><form className="space-y-3" onSubmit={submit}><Field label="Título"><Input value={f.title} onChange={e=>setF({...f, title:e.target.value})} /></Field><Field label="Quando"><Input value={f.when} onChange={e=>setF({...f, when:e.target.value})} /></Field><Field label="Descrição"><TextArea rows={4} value={f.description} onChange={e=>setF({...f, description:e.target.value})} /></Field><Button type="submit" className="w-full">Adicionar</Button></form></Card><ListTable table="courses" onDelete={api.del} /></div>)
}

function AdminSettings({ settings, updateSettings, generatePixQR }){
  const [pix, setPix] = useState(settings.pix_key || '')
  useEffect(()=>setPix(settings.pix_key || ''), [settings.pix_key])
  const save = () => updateSettings({ id: 1, pix_key: pix, pix_qr_data_url: settings.pix_qr_data_url || '' })
  return (<Card className="p-5"><h4 className="text-white font-bold mb-3">Configurações</h4><div className="grid md:grid-cols-2 gap-6"><div><Label>Chave PIX</Label><Input value={pix} onChange={e=>setPix(e.target.value)} /><div className="mt-3 flex gap-2"><Button onClick={save}>Salvar</Button><Button variant="outline" onClick={generatePixQR}>Gerar QR (texto)</Button></div><p className="text-neutral-500 text-xs mt-2">Para QR EMV-Pix oficial (com valor/descrição), posso configurar conforme seus dados.</p></div><div className="justify-self-center">{settings.pix_qr_data_url ? (<img src={settings.pix_qr_data_url} alt="QR PIX" className="w-48 h-48 bg-white rounded-xl p-2" />) : (<div className="w-48 h-48 bg-white rounded-xl flex items-center justify-center"><div className="text-xs text-black text-center px-2">Sem QR gerado</div></div>)}</div></div></Card>)
}

function ListTable({ table, onDelete, toggleStatus }){
  const [rows, setRows] = useState([])
  useEffect(()=>{ supabase.from(table).select('*').order('created_at',{ascending: false}).then(({data})=>setRows(data||[])).catch(()=>setRows([])) }, [table])
  return (<div className="lg:col-span-2 space-y-4">{rows.map(r => (<Card key={r.id} className="p-5"><div className="flex items-start justify-between gap-3"><pre className="text-neutral-300 whitespace-pre-wrap text-sm">{JSON.stringify(r, null, 2)}</pre><div className="flex gap-2">{toggleStatus && <Button variant="outline" onClick={()=>toggleStatus(r)}>{r.status==='Novo' ? 'Marcar Atendido' : 'Marcar Novo'}</Button>}<Button variant="danger" onClick={()=>onDelete(r.id)}>Excluir</Button></div></div></Card>))}{!rows.length && <Card className="p-5 text-neutral-400">Sem registros ainda.</Card>}</div>)
}
