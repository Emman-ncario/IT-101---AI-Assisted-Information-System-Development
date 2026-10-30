import { useEffect, useState, createContext, useContext } from "react";
import { Link, NavLink, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { CalendarDays, Building2, Users, ClipboardList, UserCircle, Sun, Moon, LogOut, Search, Clock3, Plus, Trash2, CheckCircle2, X, Menu } from "lucide-react";
import { api, refreshCsrf } from "./api";
import { flushSync } from "react-dom";
import type { User, Building, Reservation, QueueItem, ClassInfo, Room } from "./types";

type AuthContextType = { user: User | null; setUser: (user: User | null) => void };
const AuthContext = createContext<AuthContextType>({ user: null, setUser: () => undefined });
const useAuth = () => useContext(AuthContext);

function useTheme() {
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === "dark" || localStorage.getItem("roomwise-theme") === "dark");
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("roomwise-theme", dark ? "dark" : "light");
  }, [dark]);

  const toggle = () => {
    const next = !dark;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!document.startViewTransition || reduce) {
      document.documentElement.classList.add("theme-switching");
      setDark(next);
      setTimeout(() => document.documentElement.classList.remove("theme-switching"), 700);
      return;
    }

    document.startViewTransition(() => {
      flushSync(() => setDark(next));
      document.documentElement.dataset.theme = next ? "dark" : "light";;
    });
  };

  return { dark, toggle };
}


//<----------------------------Login Page---------------------------->
function LoginPage() {
  const { user, setUser } = useAuth();

  const [email, setEmail] = useState("rep.it1a@example.test");
  const [password, setPassword] = useState("DemoPass!234");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const navigate = useNavigate();
  const theme = useTheme();

  if (user) {
    return <Navigate to="/" replace />;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      await refreshCsrf();

      const result = await api.post<{
        user: User;
        csrfToken: string;
      }>("/auth/login", {
        email,
        password,
      });

      api.setCsrf(result.csrfToken);
      setUser(result.user);
      navigate("/");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to sign in."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-brand">
        <div className="brand-mark">W</div>

        <span className="eyebrow">
          BSIT - 1B IT 101 Group Project
        </span>

        <h1>Room for More?</h1>

        <p>
          Find the right room. Keep your class moving.
        </p>

        <div className="login-art">
          <div className="art-card">
            <Building2 size={28} />
            <span>Classrooms, organized.</span>
          </div>

          <div className="art-grid">
            {Array.from({ length: 16 }, (_, i) => (
              <span key={i} />
            ))}
          </div>
        </div>
      </section>

      <section className="login-form-wrap">
        <button
          type="button"
          className="icon-button login-theme-toggle"
          onClick={theme.toggle}
          aria-label={theme.dark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme.dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <form className="login-form" onSubmit={submit}>
          <span className="eyebrow">WELCOME BACK</span>

          <h2>Sign in to your account</h2>

          <p className="muted">
            Use your school account to check classroom availability.
          </p>

          {error && (
            <div className="alert error" role="alert">
              {error}
            </div>
          )}

          <label>
            Email address

            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@school.edu"
            />
          </label>

          <label>
            Password

            <div className="password-field">
              <input
                type={show ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <button
                type="button"
                className="text-button"
                onClick={() => setShow((v) => !v)}
              >
                {show ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          <button
            className="btn primary full"
            disabled={busy}
          >
            {busy ? "Signing in…" : "Sign in"}
            <span>→</span>
          </button>

          <p className="fine-print">
            Password reset is not enabled in this demo.
            Contact your institution's account administrator.
          </p>

          <div className="demo-hint">
            <strong>Development demo</strong>
            <span>
              rep.it1a@example.test · DemoPass!234
            </span>
          </div>
        </form>
      </section>
    </main>
  );
}

//<----------------------------Main Page (Dashboard)---------------------------->

function AppShell({ children }: { children: React.ReactNode }) {
  const { user, setUser } = useAuth();
  const theme = useTheme();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function logout() {
    try {
      await api.post("/auth/logout");
    } finally {
      setUser(null);
      navigate("/login");
    }
  }

  const links = [
    { to: "/", label: "Dashboard", icon: CalendarDays },
    { to: "/rooms", label: "Find rooms", icon: Building2 },
    ...(user?.role === "REPRESENTATIVE" || user?.role === "ADMIN"
      ? [{ to: "/queue", label: "Booking queue", icon: ClipboardList }]
      : []),
    { to: "/classes", label: "Classes", icon: Users },
    { to: "/profile", label: "Profile", icon: UserCircle },
  ];

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="wordmark">
          <span className="brand-mark small">R</span>
          <span>
            roomwise<span className="wordmark-dot">.</span>
          </span>
        </Link>

        <nav
          className={`main-nav ${mobileOpen ? "open" : ""}`}
          aria-label="Main navigation"
        >
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="top-actions">
          <button
            className="icon-button"
            onClick={theme.toggle}
            aria-label={theme.dark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme.dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <div className="profile-chip">
            <span className="avatar">
              {user?.fullName
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")}
            </span>
            <span className="profile-chip-name">
              {user?.fullName}
              <small>
                {user?.role === "REPRESENTATIVE"
                  ? "Class representative"
                  : user?.role === "ADMIN"
                    ? "Administrator"
                    : "Student"}
              </small>
            </span>
          </div>

          <button
            className="icon-button"
            onClick={logout}
            aria-label="Log out"
            title="Log out"
          >
            <LogOut size={17} />
          </button>

          <button
            className="icon-button mobile-menu"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle navigation"
          >
            <Menu size={19} />
          </button>
        </div>
      </header>

      <main className="main-content">{children}</main>

      <footer className="footer">
        <span>ROOMWISE / CAMPUS SPACE MANAGEMENT</span>
        <span>Made for better learning spaces.</span>
      </footer>
    </div>
  );
}

function Protected({ children, representative = false }: { children: React.ReactNode; representative?: boolean }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (representative && user.role !== "REPRESENTATIVE" && user.role !== "ADMIN") return <Navigate to="/" replace />;
  return <AppShell>{children}</AppShell>;
}
function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="page-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}
function StatCard({ label, value, note, icon: Icon }: { label: string; value: string | number; note: string; icon: React.ElementType }) {
  return <article className="stat-card"><div className="stat-top"><span>{label}</span><span className="stat-icon"><Icon size={18}/></span></div><strong>{value}</strong><small>{note}</small></article>;
}
function ReservationCard({ reservation, onCancel }: { reservation: Reservation; onCancel?: (id: string) => void }) {
  const start = new Date(reservation.startAt), end = new Date(reservation.endAt);
  return <article className="reservation-card"><div className="reservation-date"><span>{start.toLocaleDateString("en-PH",{month:"short"})}</span><strong>{start.getDate()}</strong><small>{start.toLocaleDateString("en-PH",{weekday:"short"})}</small></div><div className="reservation-info"><div className="reservation-title-row"><h3>{reservation.room.floor?.building?.name ?? "Campus building"} · Room {reservation.room.number}</h3><span className={`status ${reservation.status.toLowerCase()}`}>{reservation.status.toLowerCase()}</span></div><p>{reservation.class.block} <span className="dot-separator">·</span> Floor {reservation.room.floor?.number ?? "—"}</p><div className="reservation-meta"><span><Clock3 size={14}/>{start.toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})} – {end.toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}</span><span>Booked by {reservation.createdBy.fullName}</span></div></div>{onCancel && reservation.status === "CONFIRMED" && <button className="icon-button cancel-btn" onClick={() => onCancel(reservation.id)} aria-label="Cancel reservation"><X size={17}/></button>}</article>;
}
function DashboardPage() {
  const { user } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [error, setError] = useState("");
  const [month, setMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [busy, setBusy] = useState(true);
  async function load() {
    setBusy(true);
    try { const [r,b] = await Promise.all([api.get<Reservation[]>("/reservations"), api.get<Building[]>("/buildings")]); setReservations(r); setBuildings(b); setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load dashboard."); } finally { setBusy(false); }
  }
  useEffect(() => { load(); }, []);
  async function cancel(id: string) { if (!confirm("Cancel this reservation?")) return; try { await api.post(`/reservations/${id}/cancel`); await load(); } catch (e) { setError(e instanceof Error ? e.message : "Cancellation failed."); } }
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
  const firstDay = (monthStart.getDay() + 6) % 7;
  const days = new Date(month.getFullYear(), month.getMonth()+1, 0).getDate();
  const dayReservations = reservations.filter(r => new Date(r.startAt).toDateString() === selectedDate.toDateString());
  return <><PageHeading eyebrow="OVERVIEW / YOUR CAMPUS" title={`Good ${new Date().getHours()<12?"morning":new Date().getHours()<18?"afternoon":"evening"}, ${(user?.fullName.split(" ")[0] ?? "there")}.`} description="Here's what's happening with your class spaces." action={<Link className="btn primary" to="/rooms"><Search size={16}/> Find a room</Link>}/>
    {error && <div className="alert error" role="alert">{error}</div>}
    <div className="stats-grid"><StatCard label="UPCOMING RESERVATIONS" value={reservations.filter(r=>r.status==="CONFIRMED" && new Date(r.startAt)>new Date()).length} note="Across your classes" icon={CalendarDays}/><StatCard label="BUILDINGS" value={buildings.length} note="Available to explore" icon={Building2}/><StatCard label="YOUR ROLE" value={user?.role==="REPRESENTATIVE"?"REP":user?.role==="ADMIN"?"ADMIN":"STUDENT"} note="Campus access level" icon={UserCircle}/></div>
    <div className="dashboard-grid"><section className="panel reservations-panel"><div className="panel-heading"><div><span className="eyebrow">YOUR CLASS</span><h2>Upcoming reservations</h2></div><Link to="/classes" className="inline-link">View classes →</Link></div>
      {busy ? <div className="loading-state">Loading reservations…</div> : reservations.filter(r=>r.status==="CONFIRMED" && new Date(r.endAt)>new Date()).slice(0,5).length ? <div className="reservation-list">{reservations.filter(r=>r.status==="CONFIRMED" && new Date(r.endAt)>new Date()).slice(0,5).map(r=><ReservationCard key={r.id} reservation={r} onCancel={user?.role==="REPRESENTATIVE"?cancel:undefined}/>)}</div> : <div className="empty-state"><CalendarDays size={25}/><strong>No upcoming reservations</strong><span>When your class reserves a room, it will appear here.</span><Link to="/rooms" className="inline-link">Browse rooms</Link></div>}
    </section><section className="panel calendar-panel"><div className="panel-heading"><div><span className="eyebrow">SCHEDULE</span><h2>Calendar</h2></div><div className="calendar-controls"><button className="icon-button" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))} aria-label="Previous month">‹</button><button className="icon-button" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))} aria-label="Next month">›</button></div></div><div className="calendar-month">{month.toLocaleDateString("en-PH",{month:"long",year:"numeric"})}</div><div className="calendar-grid">{["M","T","W","T","F","S","S"].map((d,i)=><span className="weekday" key={`${d}${i}`}>{d}</span>)}{Array.from({length:firstDay},(_,i)=><span key={`blank${i}`}/>)}{Array.from({length:days},(_,i)=>{const date=new Date(month.getFullYear(),month.getMonth(),i+1);const count=reservations.filter(r=>new Date(r.startAt).toDateString()===date.toDateString()&&r.status==="CONFIRMED").length;return <button key={i} className={`calendar-day ${date.toDateString()===selectedDate.toDateString()?"selected":""} ${count?"has-booking":""}`} onClick={()=>setSelectedDate(date)} aria-label={`${date.toDateString()}, ${count} reservations`}>{i+1}{count>0&&<i/>}</button>})}</div><div className="calendar-legend"><span><i className="legend-blue"/> Has reservations</span><span><i className="legend-gray"/> No reservations</span></div><div className="selected-day"><strong>{selectedDate.toLocaleDateString("en-PH",{weekday:"long",month:"short",day:"numeric"})}</strong><span>{dayReservations.length} class reservation{dayReservations.length===1?"":"s"}</span></div></section></div>
    <section className="panel buildings-preview"><div className="panel-heading"><div><span className="eyebrow">CAMPUS DIRECTORY</span><h2>Explore buildings</h2></div><Link className="inline-link" to="/rooms">All buildings →</Link></div><div className="building-grid compact">{buildings.slice(0,3).map(b=><BuildingCard key={b.id} building={b}/>)}</div></section>
  </>;
}
function BuildingCard({ building, onSelect }: { building: Building; onSelect?: (id: string) => void }) {
  return <article className="building-card"><div className="building-visual"><div className="building-visual-lines"/><div className="building-symbol"><Building2 size={27}/></div><span className="building-code">{building.code}</span></div><div className="building-card-body"><h3>{building.name}</h3><p>{building.description}</p><div className="building-stats"><span><Building2 size={14}/>{building.floorCount} floors</span><span>{building.roomCount} rooms</span></div><button className="btn secondary full" onClick={()=>onSelect ? onSelect(building.id) : window.location.assign("/rooms")}>Explore building <span>→</span></button></div></article>;
}
function RoomsPage() {
  const [buildings,setBuildings] = useState<Building[]>([]);
  const [selected,setSelected] = useState<string>("");
  const [rooms,setRooms] = useState<Room[]>([]);
  const [roomId,setRoomId] = useState("");
  const [date,setDate] = useState(new Date().toLocaleDateString("en-CA"));
  const [availability,setAvailability] = useState<any>(null);
  const [start,setStart] = useState("08:00");
  const [end,setEnd] = useState("09:00");
  const [classId,setClassId] = useState("");
  const [classes,setClasses] = useState<ClassInfo[]>([]);
  const [message,setMessage] = useState("");
  const {user} = useAuth();
  const canBook = user?.role==="REPRESENTATIVE" || user?.role==="ADMIN";
  useEffect(()=>{api.get<Building[]>("/buildings").then(setBuildings).catch(e=>setMessage(e.message));api.get<ClassInfo[]>("/classes").then(setClasses).catch(()=>undefined);},[]);
  async function chooseBuilding(id:string) {
    setSelected(id);setRoomId("");setAvailability(null);
    try { const b = await api.get<any>(`/buildings/${id}`); setRooms(b.floors.flatMap((f:any)=>f.rooms.map((r:Room)=>({...r,floor:{number:f.number,building:{name:b.name}}})))); }
    catch(e){setMessage(e instanceof Error?e.message:"Unable to load rooms.");}
  }
  async function inspectRoom(id:string, selectedDate=date) {
    setRoomId(id);setMessage("");
    try { setAvailability(await api.get(`/buildings/rooms/${id}/availability?date=${selectedDate}`)); }
    catch(e){setMessage(e instanceof Error?e.message:"Could not load availability.");}
  }
  async function addQueue() {
    if(!classId){setMessage("Select the class for this booking.");return;}
    try { await api.post("/booking-queue",{roomId,classId,startAt:`${date}T${start}`,endAt:`${date}T${end}`});setMessage("Added to your booking queue."); }
    catch(e){setMessage(e instanceof Error?e.message:"Unable to add booking.");}
  }
  const selectedRoom=rooms.find(r=>r.id===roomId);
  return <><PageHeading eyebrow="CAMPUS DIRECTORY" title="Find a room" description="Browse buildings, inspect room schedules, and find an open slot for your class."/><div className="rooms-layout">
    <section className="panel directory-panel"><div className="panel-heading"><div><span className="eyebrow">01 / BUILDINGS</span><h2>Choose a building</h2></div></div><div className="building-grid">{buildings.map(b=><button key={b.id} className={`building-select ${selected===b.id?"active":""}`} onClick={()=>chooseBuilding(b.id)}><span className="building-select-icon"><Building2 size={20}/></span><strong>{b.name}</strong><small>{b.floorCount} floors · {b.roomCount} rooms</small><span className="inline-link">View rooms →</span></button>)}</div>
    {selected && <><div className="section-subheading"><span className="eyebrow">02 / FLOORS & ROOMS</span><h2>Rooms by floor</h2></div>{[...new Set(rooms.map(r=>r.floor?.number))].sort((a,b)=>(b??0)-(a??0)).map(floor=><div className="floor-group" key={floor}><h3>Floor {floor}</h3><div className="room-grid">{rooms.filter(r=>r.floor?.number===floor).map(r=><button className={`room-tile ${roomId===r.id?"active":""}`} key={r.id} onClick={()=>inspectRoom(r.id)}><span className="room-number">{r.number}</span><span>{r.roomType}</span><small>Capacity {r.capacity}</small></button>)}</div></div>)}</>}
    </section><section className="panel availability-panel"><div className="panel-heading"><div><span className="eyebrow">03 / AVAILABILITY</span><h2>{selectedRoom?`Room ${selectedRoom.number}`:"Room schedule"}</h2></div></div>
      {!roomId?<div className="empty-state"><Clock3 size={28}/><strong>Select a room to inspect its schedule</strong><span>Availability is checked against confirmed reservations.</span></div>:<><label className="field-label">Reservation date<input type="date" value={date} onChange={e=>{setDate(e.target.value);inspectRoom(roomId,e.target.value)}}/></label><div className="slot-legend"><span><i className="slot-available"/>Available</span><span><i className="slot-occupied"/>Occupied</span><span><i className="slot-past"/>Past</span></div><div className="slot-grid">{(availability?.slots??[]).map((slot:any)=><button key={slot.startAt} disabled={!slot.available} className={`time-slot ${slot.available?"available":slot.past?"past":"occupied"} ${start===new Date(slot.startAt).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",timeZone:"Asia/Manila"})?"chosen":""}`} onClick={()=>{const s=new Date(slot.startAt);setStart(s.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",timeZone:"Asia/Manila"}));const e=new Date(s.getTime()+60*60*1000);setEnd(e.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",timeZone:"Asia/Manila"}));}}>{new Date(slot.startAt).toLocaleTimeString("en-PH",{hour:"numeric",minute:"2-digit",timeZone:"Asia/Manila"})}</button>)}</div><div className="booking-fields"><label className="field-label">Start time<input type="time" step="1800" value={start} onChange={e=>setStart(e.target.value)}/></label><label className="field-label">End time<input type="time" step="1800" value={end} onChange={e=>setEnd(e.target.value)}/></label>{canBook&&<label className="field-label wide">Reserve for class<select value={classId} onChange={e=>setClassId(e.target.value)}><option value="">Select your class</option>{classes.filter((c:any)=>user?.role==="ADMIN"||user?.memberships?.some(m=>m.class.id===c.id&&m.isRep)).map((c:any)=><option key={c.id} value={c.id}>{c.block}</option>)}</select></label>}{canBook?<button className="btn primary full wide" onClick={addQueue}><Plus size={16}/> Add to booking queue</button>:<p className="helper-text wide">You can check availability, but only assigned class representatives can reserve rooms.</p>}</div></>}
      {message&&<div className={`alert ${message.includes("Added")?"success":"error"}`} role="status">{message}</div>}
    </section></div></>;
}
function QueuePage() {
  const [items,setItems]=useState<QueueItem[]>([]);
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(true);
  async function load(){setBusy(true);try{setItems(await api.get<QueueItem[]>("/booking-queue"));}catch(e){setMessage(e instanceof Error?e.message:"Could not load queue.");}finally{setBusy(false);}}
  useEffect(()=>{load();},[]);
  async function remove(id:string){try{await api.delete(`/booking-queue/${id}`);await load();}catch(e){setMessage(e instanceof Error?e.message:"Could not remove item.");}}
  async function confirmBookings(){if(!items.length)return;if(!confirm(`Confirm ${items.length} reservation(s)?`))return;try{await api.post("/booking-queue/confirm",{itemIds:items.map(i=>i.id)});setMessage("Reservations confirmed.");await load();}catch(e){setMessage(e instanceof Error?e.message:"Confirmation failed.");}}
  return <><PageHeading eyebrow="RESERVATION WORKFLOW" title="Booking queue" description="Review your proposed bookings before confirming them." action={<button className="btn primary" onClick={confirmBookings} disabled={!items.length}><CheckCircle2 size={16}/> Confirm all</button>}/>{message&&<div className="alert" role="status">{message}</div>}<section className="panel queue-panel"><div className="panel-heading"><div><span className="eyebrow">PENDING CONFIRMATION</span><h2>{items.length} queued reservation{items.length===1?"":"s"}</h2></div><span className="status pending">Not yet confirmed</span></div>{busy?<div className="loading-state">Loading queue…</div>:items.length===0?<div className="empty-state"><ClipboardList size={28}/><strong>Your queue is clear</strong><span>Choose a room and add a proposed reservation to get started.</span><Link className="btn secondary" to="/rooms">Find a room</Link></div>:<div className="queue-list">{items.map(item=><article className="queue-item" key={item.id}><div className="queue-room-icon"><Building2 size={21}/></div><div className="queue-item-info"><h3>{item.room.floor?.building?.name??"Building"} · Room {item.room.number}</h3><p>{item.class.block} · Floor {item.room.floor?.number}</p><div className="reservation-meta"><span><CalendarDays size={14}/>{new Date(item.startAt).toLocaleDateString()}</span><span><Clock3 size={14}/>{new Date(item.startAt).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})} – {new Date(item.endAt).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})}</span></div></div><div className="queue-item-actions"><span className="duration">{(new Date(item.endAt).getTime()-new Date(item.startAt).getTime())/3600000} hr</span><button className="icon-button danger" aria-label="Remove queued booking" onClick={()=>remove(item.id)}><Trash2 size={17}/></button></div></article>)}</div>}</section><p className="fine-print queue-note">Queued items do not block availability. Each item is revalidated on confirmation; conflicting bookings remain in the queue so you can edit or remove them.</p></>;
}
function ClassesPage() {
  const [classes,setClasses]=useState<any[]>([]);
  const [email,setEmail]=useState<Record<string,string>>({});
  const [message,setMessage]=useState("");
  const {user}=useAuth();
  async function load(){try{setClasses(await api.get<any[]>("/classes"));}catch(e){setMessage(e instanceof Error?e.message:"Unable to load classes.");}}
  useEffect(()=>{load();},[]);
  async function addMember(id:string){try{await api.post(`/classes/${id}/members`,{email:email[id]});setMessage("Student added to class.");setEmail(v=>({...v,[id]:""}));await load();}catch(e){setMessage(e instanceof Error?e.message:"Unable to add student.");}}
  return <><PageHeading eyebrow="ACADEMIC DIRECTORY" title="Your classes" description="Class rosters, representatives, and upcoming room reservations."/><div className="class-list">{classes.map(cls=><section className="panel class-panel" key={cls.id}><div className="class-banner"><div className="class-monogram">{cls.block.slice(-2)}</div><div><span className="eyebrow">{cls.program}</span><h2>{cls.block}</h2><p>{cls.yearLevel}{cls.yearLevel===1?"st":cls.yearLevel===2?"nd":cls.yearLevel===3?"rd":"th"} year · {cls.memberships.length} members</p></div></div><div className="class-content"><div><h3>Representatives</h3><div className="member-list">{cls.representatives.map((rep:any)=><div className="member-row" key={rep.id}><span className="avatar">{rep.fullName.split(" ").map((n:string)=>n[0]).slice(0,2).join("")}</span><span>{rep.fullName}<small>{rep.email}</small></span><span className="status confirmed">Representative</span></div>)}</div><h3>Class members</h3><div className="member-list">{cls.memberships.map((m:any)=><div className="member-row" key={m.id}><span className="avatar">{m.user.fullName.split(" ").map((n:string)=>n[0]).slice(0,2).join("")}</span><span>{m.user.fullName}<small>{m.user.email}</small></span>{m.isRep&&<span className="status confirmed">Rep</span>}</div>)}</div>{cls.memberships.some((m:any)=>m.userId===user?.id&&m.isRep)&&<div className="add-member"><label className="field-label">Add existing student by email<input type="email" placeholder="student@school.edu" value={email[cls.id]??""} onChange={e=>setEmail(v=>({...v,[cls.id]:e.target.value}))}/></label><button className="btn secondary" onClick={()=>addMember(cls.id)}><Plus size={15}/> Add student</button></div>}</div><div className="class-reservations"><h3>Confirmed reservations</h3>{cls.reservations.length?cls.reservations.map((r:any)=><div className="class-reservation" key={r.id}><strong>Room {r.room.number}</strong><span>{new Date(r.startAt).toLocaleDateString()}</span><small>{new Date(r.startAt).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})} – {new Date(r.endAt).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})}</small></div>):<p className="muted">No upcoming reservations.</p>}</div></div></section>)}</div>{message&&<div className="alert" role="status">{message}</div>}</>;
}
function ProfilePage() {
  const {user}=useAuth();
  return <><PageHeading eyebrow="ACCOUNT SETTINGS" title="Your profile" description="Your account details and access permissions."/><section className="panel profile-panel"><div className="profile-cover"><span className="avatar large">{user?.fullName.split(" ").map(n=>n[0]).slice(0,2).join("")}</span></div><div className="profile-details"><div><span className="eyebrow">FULL NAME</span><strong>{user?.fullName}</strong></div><div><span className="eyebrow">EMAIL ADDRESS</span><strong>{user?.email}</strong></div><div><span className="eyebrow">ACCOUNT ROLE</span><strong>{user?.role==="REPRESENTATIVE"?"Class representative":user?.role==="ADMIN"?"Administrator":"Student"}</strong></div><div><span className="eyebrow">ASSIGNED CLASSES</span><strong>{user?.memberships?.map(m=>m.class.block).join(", ")||"Loading class assignments"}</strong></div></div><p className="fine-print">Profile editing and password reset are deferred. Contact your institution's administrator to update account details.</p></section></>;
}
export function App() {
  const [user,setUser]=useState<User|null>(null);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{refreshCsrf().then(()=>api.get<{user:User}>("/auth/me")).then(r=>setUser(r.user)).catch(()=>setUser(null)).finally(()=>setLoading(false));},[]);
  if(loading)return <div className="app-loading"><span className="brand-mark">R</span><span>Preparing your campus…</span></div>;
  return <AuthContext.Provider value={{user,setUser}}><Routes><Route path="/login" element={<LoginPage/>}/><Route path="/" element={<Protected><DashboardPage/></Protected>}/><Route path="/rooms" element={<Protected><RoomsPage/></Protected>}/><Route path="/queue" element={<Protected representative><QueuePage/></Protected>}/><Route path="/classes" element={<Protected><ClassesPage/></Protected>}/><Route path="/profile" element={<Protected><ProfilePage/></Protected>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes></AuthContext.Provider>;
}
