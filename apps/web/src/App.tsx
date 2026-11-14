import { useEffect, useRef, useState, createContext, useContext } from "react";
import type { FormEvent, ReactNode, ElementType } from "react";

import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";

import {
  ShieldCheck,
  CalendarDays,
  Building2,
  Users,
  GraduationCap,
  ClipboardList,
  UserCircle,
  Sun,
  Moon,
  LogOut,
  Eye,
  EyeOff,
  Search,
  Clock3,
  Plus,
  Trash2,
  CheckCircle2,
  X,
  Menu,
} from "lucide-react";

import { api, refreshCsrf } from "./api";
import { flushSync } from "react-dom";

import type {
  User,
  Building,
  Reservation,
  ClassInfo,
  Room,
} from "./types";



// --------------------------------------------------
// AUTHENTICATION CONTEXT
// --------------------------------------------------

type AuthContextType = {
  user: User | null;
  setUser: (user: User | null) => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => undefined,
});

const useAuth = () => useContext(AuthContext);

// --------------------------------------------------
// THEME
// --------------------------------------------------

function useTheme() {
  const [dark, setDark] = useState(
    () =>
      document.documentElement.dataset.theme === "dark" ||
      localStorage.getItem("roomwise-theme") === "dark",
  );

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("roomwise-theme", dark ? "dark" : "light");
  }, [dark]);

  const toggle = () => {
    const next = !dark;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (!document.startViewTransition || reduceMotion) {
      document.documentElement.classList.add("theme-switching");
      setDark(next);

      setTimeout(() => {
        document.documentElement.classList.remove("theme-switching");
      }, 700);

      return;
    }

    document.startViewTransition(() => {
      flushSync(() => setDark(next));
      document.documentElement.dataset.theme = next ? "dark" : "light";
    });
  };

  return { dark, toggle };
}

// --------------------------------------------------
// LOGIN PAGE 
// --------------------------------------------------

function LoginPage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setBusy(true);

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
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-brand">
        <div className="brand-mark" aria-label="Room for More logo">
          <Building2 size={25} strokeWidth={2.2} />
          <span className="brand-mark-check">
            <CheckCircle2 size={12} />
          </span>
        </div>

        <span className="eyebrow">BSIT - 1B IT 101 Group Project</span>

        <h1>Room for More?</h1>

        <p className="muted">
          Find a space, reserve your time, and keep your day moving.
        </p>

        <div className="art-cards" aria-hidden="true">
          <div className="art-card">
            <div className="art-icon">
              <svg viewBox="0 0 24 24">
                <path d="M5 12l5 5L20 7" />
              </svg>
            </div>
            <strong>Find your space</strong>
            <small>Explore available campus rooms.</small>
            <div className="bar">
              <i />
            </div>
          </div>

          <div className="art-card">
            <div className="art-icon">
              <svg viewBox="0 0 24 24">
                <path d="M5 12l5 5L20 7" />
              </svg>
            </div>
            <strong>Plan your schedule</strong>
            <small>Check room availability.</small>
            <div className="bar">
              <i />
            </div>
          </div>

          <div className="art-card">
            <div className="art-icon">
              <svg viewBox="0 0 24 24">
                <path d="M5 12l5 5L20 7" />
              </svg>
            </div>
            <strong>Reserve with ease</strong>
            <small>Keep your class organized.</small>
            <div className="bar">
              <i />
            </div>
          </div>
        </div>

        <div className="bg-shapes" aria-hidden="true">
          <div className="shape circle-big" />
          <div className="shape circle-mid" />
          <div className="shape square-big" />
          <div className="shape ring-big" />
        </div>
      </section>

      <section className="login-form-wrap">
        <button
          type="button"
          className="icon-button login-theme-toggle"
          onClick={theme.toggle}
          aria-label={
            theme.dark ? "Switch to light mode" : "Switch to dark mode"
          }
        >
          {theme.dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <form className="login-form" onSubmit={submit}>
          <span className="eyebrow">
            WELCOME TO A ROOM RESERVATION INFORMATION SYSTEM
          </span>

          <h2>Sign in to your account</h2>

          {error && (
            <div className="alert error" role="alert">
              {error}
            </div>
          )}

          <hr className="auth-divider" />

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
            <div className="password-input-wrapper">
              <input
                type={show ? "text" : "password"}
                required
                minLength={8}
                maxLength={200}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShow(!show)}
                aria-label={show ? "Hide password" : "Show password"}
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <div className="auth-actions">
            <button type="submit" className="btn primary" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </button>

            <button
              type="button"
              className="btn secondary"
              onClick={() => navigate("/signup")}
            >
              Sign up
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

// --------------------------------------------------
// SIGN UP ROLE SELECTION PAGE
// --------------------------------------------------

function SignupPage() {
  const navigate = useNavigate();
  const theme = useTheme();

  return (
    <main className="login-page">
      <section className="login-brand">
        <div className="brand-mark" aria-label="Room for More logo">
          <Building2 size={25} strokeWidth={2.2} />
          <span className="brand-mark-check">
            <CheckCircle2 size={12} />
          </span>
        </div>

        <span className="eyebrow">BSIT - 1B IT 101 Group Project</span>

        <h1>Room for More?</h1>

        <p className="muted">
          Find a space, reserve your time, and keep your day moving.
        </p>

        <div className="art-cards" aria-hidden="true">
          <div className="art-card">
            <div className="art-icon">
              <svg viewBox="0 0 24 24">
                <path d="M5 12l5 5L20 7" />
              </svg>
            </div>
            <strong>Find your space</strong>
            <small>Explore available campus rooms.</small>
            <div className="bar">
              <i />
            </div>
          </div>

          <div className="art-card">
            <div className="art-icon">
              <svg viewBox="0 0 24 24">
                <path d="M5 12l5 5L20 7" />
              </svg>
            </div>
            <strong>Plan your schedule</strong>
            <small>Check room availability.</small>
            <div className="bar">
              <i />
            </div>
          </div>

          <div className="art-card">
            <div className="art-icon">
              <svg viewBox="0 0 24 24">
                <path d="M5 12l5 5L20 7" />
              </svg>
            </div>
            <strong>Reserve with ease</strong>
            <small>Keep your class organized.</small>
            <div className="bar">
              <i />
            </div>
          </div>
        </div>

        <div className="bg-shapes" aria-hidden="true">
          <div className="shape circle-big" />
          <div className="shape circle-mid" />
          <div className="shape square-big" />
          <div className="shape ring-big" />
        </div>
      </section>

      <section className="login-form-wrap">
        <button
          type="button"
          className="icon-button login-theme-toggle"
          onClick={theme.toggle}
        >
          {theme.dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className="login-form">
          <span className="eyebrow">CREATE YOUR ACCOUNT</span>

          <h2>Join Room for More?</h2>

          <p className="muted">First, choose your account type.</p>

          <div className="role-options">
            <button
              type="button"
              className="role-card student-card"
              onClick={() => navigate("/signup/student")}
            >
              <span className="role-icon">
                <GraduationCap size={32} />
              </span>

              <strong>Student</strong>

              <span className="role-description">
                Check-out rooms for your campus activities
              </span>

              <span className="role-action">Continue →</span>
            </button>

            <button
              type="button"
              className="role-card representative-card"
              onClick={() => navigate("/signup/representative")}
            >
              <span className="role-icon">
                <Users size={32} />
              </span>

              <strong>Representative</strong>

              <span className="role-description">
                Manage class reservations and booking requests.
              </span>

              <span className="role-note">Invitation code required</span>

              <span className="role-action">Continue →</span>
            </button>
          </div>

          <button
            type="button"
            className="text-button"
            onClick={() => navigate("/login")}
          >
            Back to Sign In
          </button>
        </div>
      </section>
    </main>
  );
}

// --------------------------------------------------
// REGISTRATION HELPERS
// --------------------------------------------------

function getProgramCode(program: string) {
  const codes: Record<string, string> = {
    "Information Technology": "BSIT",
    "Computer Science": "BSCS",
    Chemistry: "BSCHEM",
    Meteorology: "BSMET",
  };

  return codes[program] ?? "";
}

// --------------------------------------------------
// REGISTRATION PAGE
// --------------------------------------------------

function RegistrationPage({ role }: { role: "STUDENT" | "REPRESENTATIVE" }) {
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [program, setProgram] = useState("");
  const [programSearch, setProgramSearch] = useState("");
  const [showProgramOptions, setShowProgramOptions] = useState(false);
  const [yearLevel, setYearLevel] = useState("");
  const [block, setBlock] = useState("");
  const theme = useTheme();

  const [inviteCode, setInviteCode] = useState("");

  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get<ClassInfo[]>("/auth/classes")
      .then(setClasses)
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : "Unable to load classes.",
        );
      })
      .finally(() => {
        setClassesLoading(false);
      });
  }, []);

  // Build the program list from the classes returned by the API.
  // The abbreviation is taken from the class identifier (e.g. BSIT-1A).
  const programOptions = Array.from(
    new Map(
      classes.map((cls) => {
        const code = cls.block.split("-")[0];

        return [
          cls.program,
          {
            value: cls.program,
            code,
            label: `${code} – ${cls.program}`,
          },
        ];
      }),
    ).values(),
  ).sort((a, b) => a.label.localeCompare(b.label));

  const filteredProgramOptions = programOptions.filter((option) =>
    `${option.label} ${option.value}`
      .toLowerCase()
      .includes(programSearch.toLowerCase()),
  );

  const selectedProgram = programOptions.find(
    (option) => option.value === program,
  );

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!selectedProgram || !yearLevel || !block) {
      setError("Please select your program, year level, and block.");
      return;
    }

    const expectedBlock = `${selectedProgram.code}-${yearLevel}${block}`;

    const selectedClass = classes.find(
      (cls) =>
        cls.program === program &&
        cls.yearLevel === Number(yearLevel) &&
        cls.block === expectedBlock,
    );

    if (!selectedClass) {
      setError(
        "The selected class could not be found. Please check your selections.",
      );
      return;
    }

    setBusy(true);

    try {
      const result = await api.post<{
        user: User;
        csrfToken: string;
      }>("/auth/register", {
        fullName,
        email,
        password,
        role,
        classId: selectedClass.id,
        ...(role === "REPRESENTATIVE" ? { inviteCode } : {}),
      });

      api.setCsrf(result.csrfToken);
      setUser(result.user);

      navigate("/");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to create your account.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-brand">
        <div className="brand-mark" aria-label="Room for More logo">
          <Building2 size={25} strokeWidth={2.2} />
          <span className="brand-mark-check">
            <CheckCircle2 size={12} />
          </span>
        </div>

        <span className="eyebrow">BSIT - 1B IT 101 Group Project</span>

        <h1>Room for More?</h1>

        <p className="muted">
          Find a space, reserve your time, and keep your day moving.
        </p>

        <div className="art-cards" aria-hidden="true">
          <div className="art-card">
            <div className="art-icon">
              <svg viewBox="0 0 24 24">
                <path d="M5 12l5 5L20 7" />
              </svg>
            </div>
            <strong>Find your space</strong>
            <small>Explore available campus rooms.</small>
            <div className="bar">
              <i />
            </div>
          </div>

          <div className="art-card">
            <div className="art-icon">
              <svg viewBox="0 0 24 24">
                <path d="M5 12l5 5L20 7" />
              </svg>
            </div>
            <strong>Plan your schedule</strong>
            <small>Check room availability.</small>
            <div className="bar">
              <i />
            </div>
          </div>

          <div className="art-card">
            <div className="art-icon">
              <svg viewBox="0 0 24 24">
                <path d="M5 12l5 5L20 7" />
              </svg>
            </div>
            <strong>Reserve with ease</strong>
            <small>Keep your class organized.</small>
            <div className="bar">
              <i />
            </div>
          </div>
        </div>

        <div className="bg-shapes" aria-hidden="true">
          <div className="shape circle-big" />
          <div className="shape circle-mid" />
          <div className="shape square-big" />
          <div className="shape ring-big" />
        </div>
      </section>

      <section className="login-form-wrap">
        <button
          type="button"
          className="icon-button login-theme-toggle"
          onClick={theme.toggle}
        >
          {theme.dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <form className="login-form" onSubmit={submit}>
          <span className="eyebrow">CREATE YOUR ACCOUNT</span>

          <h2>
            {role === "STUDENT"
              ? "Student Registration"
              : "Representative Registration"}
          </h2>

          <p className="muted">Complete the details below to get started.</p>

          {error && (
            <div className="alert error" role="alert">
              {error}
            </div>
          )}

          <label>
            Full name
            <input
              type="text"
              required
              minLength={2}
              maxLength={100}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
            />
          </label>

          <label>
            Email address
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>

          <div className="class-selection-grid">
            <label>
              Program
              <div className="program-select">
                <input
                  type="text"
                  required
                  autoComplete="off"
                  disabled={classesLoading || programOptions.length === 0}
                  placeholder={
                    classesLoading ? "Loading programs..." : "Search program..."
                  }
                  value={programSearch || selectedProgram?.label || ""}
                  onFocus={() => {
                    setProgramSearch("");
                    setShowProgramOptions(true);
                  }}
                  onChange={(e) => {
                    setProgramSearch(e.target.value);
                    setProgram("");
                    setYearLevel("");
                    setBlock("");
                    setShowProgramOptions(true);
                  }}
                  onBlur={() => setShowProgramOptions(false)}
                />

                {showProgramOptions && (
                  <div className="program-options">
                    {filteredProgramOptions.length > 0 ? (
                      filteredProgramOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          className="program-option"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setProgram(option.value);
                            setProgramSearch("");
                            setYearLevel("");
                            setBlock("");
                            setShowProgramOptions(false);
                          }}
                        >
                          {option.label}
                        </button>
                      ))
                    ) : (
                      <span className="program-no-results">
                        {classesLoading
                          ? "Loading programs..."
                          : "No matching program found."}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </label>

            <label>
              Year Level
              <select
                required
                value={yearLevel}
                onChange={(e) => setYearLevel(e.target.value)}
                disabled={!program}
              >
                <option value="">Select year</option>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
            </label>

            <label>
              Block
              <select
                required
                value={block}
                onChange={(e) => setBlock(e.target.value)}
                disabled={!program || !yearLevel}
              >
                <option value="">Select block</option>
                <option value="A">Block A</option>
                <option value="B">Block B</option>
                <option value="C">Block C</option>
                <option value="D">Block D</option>
              </select>
            </label>
          </div>

          {role === "REPRESENTATIVE" && (
            <label>
              Representative invitation code
              <input
                type="text"
                required
                autoComplete="off"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="Enter your class invitation code"
              />
              <small className="muted">
                Use the code provided by your administrator for the selected
                class.
              </small>
            </label>
          )}

          <label>
            Password
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                maxLength={200}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <label>
            Confirm password
            <div className="password-input-wrapper">
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={
                  showConfirmPassword ? "Hide password" : "Show password"
                }
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <button
            type="submit"
            className="btn primary"
            disabled={
              busy || classesLoading || classes.length === 0 || !program
            }
          >
            {classesLoading
              ? "Loading classes…"
              : busy
                ? "Creating account…"
                : "Create account"}
          </button>

          <button
            type="button"
            className="text-button"
            onClick={() => navigate("/signup")}
          >
            Back to account selection
          </button>
        </form>
      </section>
    </main>
  );
}

// --------------------------------------------------
// MAIN APPLICATION SHELL
// --------------------------------------------------

function AppShell({ children }: { children: ReactNode }) {
  const { user, setUser } = useAuth();
  const theme = useTheme();
  const navigate = useNavigate();

  const profileRef = useRef<HTMLDivElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const initials = user?.fullName.split(" ").map((n) => n[0]).slice(0, 2).join("");
  
  const roleLabel =
    user?.role === "REPRESENTATIVE"
      ? "Class representative"
      : user?.role === "ADMIN"
        ? "Administrator"
        : "Student";

  const [adminMenuOpen, setAdminMenuOpen] = useState(false);

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
    ? [{ to: "/queue", label: "Reservations", icon: ClipboardList }]
    : []),

  { to: "/classes", label: "Classes", icon: Users },
];

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="wordmark">
          <span className="brand-mark small" aria-hidden="true">
            <Building2 size={19} />
            <span className="brand-mark-check">
              <CheckCircle2 size={10} />
            </span>
          </span>

          <span>
            Room for More<span className="wordmark-mark">?</span>
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
              onClick={() => {
                setMobileOpen(false);
                setAdminMenuOpen(false);
              }}
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}

          {user?.role === "ADMIN" && (
            <div className="nav-dropdown">
              <button
                type="button"
                className={`nav-dropdown-toggle ${adminMenuOpen ? "active" : ""}`}
                onClick={() => setAdminMenuOpen((open) => !open)}
                aria-expanded={adminMenuOpen}
              >
                <ShieldCheck size={16} />
                Administration
                <span className="dropdown-arrow">
                  {adminMenuOpen ? "▲" : "▼"}
                </span>
              </button>

              {adminMenuOpen && (
                <div className="nav-dropdown-menu">
                  <NavLink
                    to="/admin/programs"
                    onClick={() => {
                      setAdminMenuOpen(false);
                      setMobileOpen(false);
                    }}
                  >
                    <GraduationCap size={16} />
                    Program Management
                  </NavLink>

                  <NavLink
                    to="/admin/buildings"
                    onClick={() => {
                      setAdminMenuOpen(false);
                      setMobileOpen(false);
                    }}
                  >
                    <Building2 size={16} />
                    Building Management
                  </NavLink>

                  <NavLink
                    to="/admin/schedules"
                    onClick={() => {
                      setAdminMenuOpen(false);
                      setMobileOpen(false);
                    }}
                  >
                    <CalendarDays size={16} />
                    Regular Schedule Management
                  </NavLink>

                  <NavLink
                    to="/admin/invitations"
                    onClick={() => {
                      setAdminMenuOpen(false);
                      setMobileOpen(false);
                    }}
                  >
                    <GraduationCap size={16} />
                    Invitation Codes
                  </NavLink>
                </div>
              )}
            </div>
          )}
        </nav>

        <div className="top-actions">
          <button
            className="icon-button"
            onClick={theme.toggle}
            aria-label={
              theme.dark ? "Switch to light mode" : "Switch to dark mode"
            }
          >
            {theme.dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <div className="profile-menu" ref={profileRef}>
            <button
              type="button"
              className="profile-chip profile-chip-button"
              aria-haspopup="dialog"
              aria-expanded={profileOpen}
              onClick={() => setProfileOpen((v) => !v)}
            >
              <span className="avatar">{initials}</span>
              <span className="profile-chip-name">
                {user?.fullName}
                <small>{roleLabel}</small>
              </span>
            </button>

            {profileOpen && (
              <div className="profile-popover" role="dialog" aria-label="Your profile">
                <div className="profile-popover-head">
                  <span className="avatar large">{initials}</span>
                  <div>
                    <strong>{user?.fullName}</strong>
                    <small>{user?.email}</small>
                  </div>
                </div>

                <dl className="profile-popover-list">
                  <div>
                    <dt className="eyebrow">ACCOUNT ROLE</dt>
                    <dd>{roleLabel}</dd>
                  </div>
                  <div>
                    <dt className="eyebrow">ASSIGNED CLASSES</dt>
                    <dd>{user?.memberships?.map((m) => m.class.block).join(", ") || "No classes assigned"}</dd>
                  </div>
                </dl>
              </div>
            )}
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
        <span>BSIT - 1B IT 101 Group Project</span>
        <span>Room for More?</span>
      </footer>
    </div>
  );
}

// --------------------------------------------------
// PROTECTED ROUTES
// --------------------------------------------------

function Protected({
  children,
  representative = false,
  admin = false,
}: {
  children: ReactNode;
  representative?: boolean;
  admin?: boolean;
}) {
  const { user } = useAuth();

  // Redirect users who are not logged in.
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Only Admins can access Admin pages.
  if (admin && user.role !== "ADMIN") {
    return <Navigate to="/" replace />;
  }

  // Only Representatives and Admins can access representative pages.
  if (
    representative &&
    user.role !== "REPRESENTATIVE" &&
    user.role !== "ADMIN"
  ) {
    return <Navigate to="/" replace />;
  }

  return <AppShell>{children}</AppShell>;
}

// --------------------------------------------------
// REUSABLE PAGE COMPONENTS
// --------------------------------------------------

function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>

      {action}
    </div>
  );
}

function StatCard({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  note: string;
  icon: ElementType;
}) {
  return (
    <article className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <span className="stat-icon">
          <Icon size={18} />
        </span>
      </div>

      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function ReservationCard({
  reservation,
  onCancel,
}: {
  reservation: Reservation;
  onCancel?: (id: string) => void;
}) {
  const start = new Date(reservation.startAt);
  const end = new Date(reservation.endAt);

  return (
    <article className="reservation-card">
      <div className="reservation-date">
        <span>{start.toLocaleDateString("en-PH", { month: "short" })}</span>

        <strong>{start.getDate()}</strong>

        <small>{start.toLocaleDateString("en-PH", { weekday: "short" })}</small>
      </div>

      <div className="reservation-info">
        <div className="reservation-title-row">
          <h3>
            {reservation.room.floor?.building?.name ?? "Campus building"}
            {" · "}
            Room {reservation.room.number}
          </h3>

          <span className={`status ${reservation.status.toLowerCase()}`}>
            {reservation.status.toLowerCase()}
          </span>
        </div>

        <p>
          {reservation.class.block}
          <span className="dot-separator"> · </span>
          Floor {reservation.room.floor?.number ?? "—"}
        </p>

        <div className="reservation-meta">
          <span>
            <Clock3 size={14} />
            {start.toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            })}
            {" – "}
            {end.toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>

          <span>Booked by {reservation.createdBy.fullName}</span>
        </div>
      </div>

      {onCancel && reservation.status === "CONFIRMED" && (
        <button
          className="icon-button cancel-btn"
          onClick={() => onCancel(reservation.id)}
          aria-label="Cancel reservation"
        >
          <X size={17} />
        </button>
      )}
    </article>
  );
}

// --------------------------------------------------
// DASHBOARD PAGE
// --------------------------------------------------

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

    try {
      const [reservationData, buildingData] = await Promise.all([
        api.get<Reservation[]>("/reservations"),
        api.get<Building[]>("/buildings"),
      ]);

      setReservations(reservationData);
      setBuildings(buildingData);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load dashboard.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function cancel(id: string) {
    if (!confirm("Cancel this reservation?")) return;

    try {
      await api.post(`/reservations/${id}/cancel`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cancellation failed.");
    }
  }

  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);

  const firstDay = (monthStart.getDay() + 6) % 7;

  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();

  const dayReservations = reservations.filter(
    (r) => new Date(r.startAt).toDateString() === selectedDate.toDateString(),
  );

  const upcomingReservations = reservations.filter(
    (r) => r.status === "CONFIRMED" && new Date(r.endAt) > new Date(),
  );

  return (
    <>
      <PageHeading
        eyebrow="OVERVIEW"
        title={`Good ${
          new Date().getHours() < 12
            ? "morning"
            : new Date().getHours() < 18
              ? "afternoon"
              : "evening"
        }, ${user?.fullName.split(" ")[0] ?? "there"}.`}
        description="Here's what's happening with your class spaces."
        action={
          <Link className="btn primary" to="/rooms">
            <Search size={16} />
            Find a room
          </Link>
        }
      />

      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}

      <div className="stats-grid">
        <StatCard
          label="UPCOMING RESERVATIONS"
          value={upcomingReservations.length}
          note="Across your classes"
          icon={CalendarDays}
        />

        <StatCard
          label="BUILDINGS"
          value={buildings.length}
          note="Available to explore"
          icon={Building2}
        />

        <StatCard
          label="YOUR ROLE"
          value={
            user?.role === "REPRESENTATIVE"
              ? "REPRESENTATIVE"
              : user?.role === "ADMIN"
                ? "ADMIN"
                : "STUDENT"
          }
          note="Campus access level"
          icon={UserCircle}
        />
      </div>

      <div className="dashboard-grid">
        <section className="panel reservations-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">YOUR CLASS</span>
              <h2>Upcoming reservations</h2>
            </div>

            <Link to="/classes" className="inline-link">
              View classes →
            </Link>
          </div>

          {busy ? (
            <div className="loading-state">Loading reservations…</div>
          ) : upcomingReservations.slice(0, 5).length > 0 ? (
            <div className="reservation-list">
              {upcomingReservations.slice(0, 5).map((r) => (
                <ReservationCard
                  key={r.id}
                  reservation={r}
                  onCancel={
                    user?.role === "REPRESENTATIVE" ? cancel : undefined
                  }
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <CalendarDays size={25} />
              <strong>No upcoming reservations</strong>
              <span>When your class reserves a room, it will appear here.</span>
              <Link to="/rooms" className="inline-link">
                Browse rooms
              </Link>
            </div>
          )}
        </section>

        <section className="panel calendar-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">SCHEDULE</span>
              <h2>Calendar</h2>
            </div>

            <div className="calendar-controls">
              <button
                className="icon-button"
                onClick={() =>
                  setMonth(
                    new Date(month.getFullYear(), month.getMonth() - 1, 1),
                  )
                }
                aria-label="Previous month"
              >
                ‹
              </button>

              <button
                className="icon-button"
                onClick={() =>
                  setMonth(
                    new Date(month.getFullYear(), month.getMonth() + 1, 1),
                  )
                }
                aria-label="Next month"
              >
                ›
              </button>
            </div>
          </div>

          <div className="calendar-month">
            {month.toLocaleDateString("en-PH", {
              month: "long",
              year: "numeric",
            })}
          </div>

          <div className="calendar-grid">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <span className="weekday" key={`${d}${i}`}>
                {d}
              </span>
            ))}

            {Array.from({ length: firstDay }, (_, i) => (
              <span key={`blank${i}`} />
            ))}

            {Array.from({ length: days }, (_, i) => {
              const date = new Date(
                month.getFullYear(),
                month.getMonth(),
                i + 1,
              );

              const count = reservations.filter(
                (r) =>
                  new Date(r.startAt).toDateString() === date.toDateString() &&
                  r.status === "CONFIRMED",
              ).length;

              return (
                <button
                  key={i}
                  className={`calendar-day ${
                    date.toDateString() === selectedDate.toDateString()
                      ? "selected"
                      : ""
                  } ${count ? "has-booking" : ""}`}
                  onClick={() => setSelectedDate(date)}
                  aria-label={`${date.toDateString()}, ${count} reservations`}
                >
                  {i + 1}
                  {count > 0 && <i />}
                </button>
              );
            })}
          </div>

          <div className="calendar-legend">
            <span>
              <i className="legend-blue" />
              Has reservations
            </span>
            <span>
              <i className="legend-gray" />
              No reservations
            </span>
          </div>

          <div className="selected-day">
            <strong>
              {selectedDate.toLocaleDateString("en-PH", {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </strong>

            <span>
              {dayReservations.length} class reservation
              {dayReservations.length === 1 ? "" : "s"}
            </span>
          </div>
        </section>
      </div>

      <section className="panel buildings-preview">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">CAMPUS DIRECTORY</span>
            <h2>Explore buildings</h2>
          </div>

          <Link className="inline-link" to="/rooms">
            All buildings →
          </Link>
        </div>

        <div className="building-grid compact">
          {buildings.slice(0, 3).map((b) => (
            <BuildingCard key={b.id} building={b} />
          ))}
        </div>
      </section>
    </>
  );
}

// --------------------------------------------------
// BUILDING CARD
// --------------------------------------------------

function BuildingCard({
  building,
  onSelect,
}: {
  building: Building;
  onSelect?: (id: string) => void;
}) {
  return (
    <article className="building-card">
      <div className="building-visual">
        <div className="building-visual-lines" />
        <div className="building-symbol">
          <Building2 size={27} />
        </div>
        <span className="building-code">{building.code}</span>
      </div>

      <div className="building-card-body">
        <h3>{building.name}</h3>
        <p>{building.description}</p>

        <div className="building-stats">
          <span>
            <Building2 size={14} />
            {building.floorCount} floors
          </span>
          <span>{building.roomCount} rooms</span>
        </div>

        <button
          className="btn secondary full"
          onClick={() =>
            onSelect ? onSelect(building.id) : window.location.assign("/rooms")
          }
        >
          Explore building <span>→</span>
        </button>
      </div>
    </article>
  );
}

// --------------------------------------------------
// FIND ROOMS PAGE
// --------------------------------------------------

function RoomsPage() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selected, setSelected] = useState("");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomId, setRoomId] = useState("");

  const [date, setDate] = useState(new Date().toLocaleDateString("en-CA"));

  const [availability, setAvailability] = useState<any>(null);

  const [start, setStart] = useState("08:00");
  const [end, setEnd] = useState("09:00");

  const [classId, setClassId] = useState("");
  const [classes, setClasses] = useState<ClassInfo[]>([]);

  const [roomSearch, setRoomSearch] = useState("");
  const [roomTypeFilter, setRoomTypeFilter] = useState("ALL");
  const [capacityFilter, setCapacityFilter] = useState("ALL");

  const [message, setMessage] = useState("");

  const { user } = useAuth();

  const canBook = user?.role === "REPRESENTATIVE" || user?.role === "ADMIN";

  useEffect(() => {
    api
      .get<Building[]>("/buildings")
      .then(setBuildings)
      .catch((e) => setMessage(e.message));

    api
      .get<ClassInfo[]>("/classes")
      .then(setClasses)
      .catch(() => undefined);
  }, []);

  async function chooseBuilding(id: string) {
    setSelected(id);
    setRoomId("");
    setAvailability(null);
    setMessage("");

    try {
      const building = await api.get<any>(`/buildings/${id}`);

      setRooms(
        building.floors.flatMap((floor: any) =>
          floor.rooms.map((room: Room) => ({
            ...room,
            // A room is unavailable when it, its floor, or its building is inactive.
            active: room.active && floor.active && building.active,
            floor: {
              number: floor.number,
              building: { name: building.name },
            },
          })),
        ),
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to load rooms.");
    }
  }

  async function inspectRoom(id: string, selectedDate = date) {
    setRoomId(id);
    setMessage("");

    try {
      setAvailability(
        await api.get(
          `/buildings/rooms/${id}/availability?date=${selectedDate}`,
        ),
      );
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Could not load availability.",
      );
    }
  }

  async function addQueue() {
    if (!selectedRoom?.active) {
      setMessage("This room is inactive and cannot be booked.");
      return;
    }

    if (!classId) {
      setMessage("Select the class for this booking.");
      return;
    }

    if (start >= end) {
      setMessage("End time must be later than start time.");
      return;
    }

    try {
      await api.post("/reservations", {
        roomId,
        classId,
        startAt: `${date}T${start}`,
        endAt: `${date}T${end}`,
      });

      setMessage("Reservation confirmed successfully!");
      await inspectRoom(roomId);
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Unable to create reservation.",
      );
    }
  }

  const selectedRoom = rooms.find((r) => r.id === roomId);

  const visibleRooms = rooms.filter(
    (r) =>
      `${r.number} ${r.roomType}`
        .toLowerCase()
        .includes(roomSearch.toLowerCase()) &&
      (roomTypeFilter === "ALL" || r.roomType === roomTypeFilter) &&
      (capacityFilter === "ALL" || r.capacity >= Number(capacityFilter)),
  );

  const roomTypes = [...new Set(rooms.map((r) => r.roomType))].sort();

  const availableClasses = classes.filter(
    (c) =>
      user?.role === "ADMIN" ||
      user?.memberships?.some((m) => m.class.id === c.id && m.isRep),
  );

  return (
    <>
      <PageHeading
        eyebrow="CAMPUS DIRECTORY"
        title="Find a room"
        description="Browse buildings, inspect room schedules, and find an open slot for your class."
      />

      <div className="rooms-layout">
        <section className="panel directory-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">01 / BUILDINGS</span>
              <h2>Choose a building</h2>
            </div>
          </div>

          <div className="building-grid">
            {buildings.map((b) => (
              <button
                key={b.id}
                className={`building-select ${
                  selected === b.id ? "active" : ""
                }`}
                onClick={() => chooseBuilding(b.id)}
              >
                <span className="building-select-icon">
                  <Building2 size={20} />
                </span>

                <strong>{b.name}</strong>

                <small>
                  {b.floorCount} floors · {b.roomCount} rooms
                </small>

                <span className="inline-link">View rooms →</span>
              </button>
            ))}
          </div>

          {selected && (
            <>
              <div className="section-subheading">
                <span className="eyebrow">02 / FLOORS & ROOMS</span>
                <h2>Rooms in this building</h2>
                <p className="muted">
                  Search by room number or type, then select a room to see its
                  schedule.
                </p>
              </div>

              <div className="room-filters">
                <label className="search-field">
                  <Search size={16} />

                  <input
                    aria-label="Search rooms"
                    placeholder="Search room number or type"
                    value={roomSearch}
                    onChange={(e) => setRoomSearch(e.target.value)}
                  />
                </label>

                <select
                  aria-label="Filter by room type"
                  value={roomTypeFilter}
                  onChange={(e) => setRoomTypeFilter(e.target.value)}
                >
                  <option value="ALL">All room types</option>
                  {roomTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Minimum room capacity"
                  value={capacityFilter}
                  onChange={(e) => setCapacityFilter(e.target.value)}
                >
                  <option value="ALL">Any capacity</option>
                  <option value="20">20+ people</option>
                  <option value="40">40+ people</option>
                  <option value="60">60+ people</option>
                </select>
              </div>

              <div className="room-results-count">
                {visibleRooms.length} room
                {visibleRooms.length === 1 ? "" : "s"} found
              </div>

              {visibleRooms.length === 0 ? (
                <div className="empty-state compact-empty">
                  <Search size={22} />
                  <strong>No rooms match those filters</strong>
                  <span>Try another keyword or clear a filter.</span>

                  <button
                    className="btn secondary"
                    onClick={() => {
                      setRoomSearch("");
                      setRoomTypeFilter("ALL");
                      setCapacityFilter("ALL");
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                [...new Set(visibleRooms.map((r) => r.floor?.number))]
                  .sort((a, b) => (b ?? 0) - (a ?? 0))
                  .map((floor) => (
                    <div className="floor-group" key={floor}>
                      <h3>Floor {floor}</h3>

                      <div className="room-grid">
                        {visibleRooms
                          .filter((r) => r.floor?.number === floor)
                          .map((r) => (
                            <button
                              className={`room-tile ${
                                roomId === r.id ? "active" : ""
                              } ${!r.active ? "inactive" : ""}`}
                              key={r.id}
                              disabled={!r.active}
                              aria-disabled={!r.active}
                              title={
                                r.active
                                  ? "Select this room to view its schedule"
                                  : "This room is inactive and cannot be booked"
                              }
                              style={
                                !r.active
                                  ? {
                                      background: "#e5e7eb",
                                      color: "#6b7280",
                                      borderColor: "#cbd5e1",
                                      opacity: 0.75,
                                      cursor: "not-allowed",
                                      filter: "grayscale(1)",
                                    }
                                  : undefined
                              }
                              onClick={() => inspectRoom(r.id)}
                            >
                              <span className="room-number">{r.number}</span>

                              <span>{r.roomType}</span>

                              <small>Capacity · {r.capacity} people</small>

                              {!r.active && (
                                <span className="room-select-hint">
                                  Inactive · Not available for booking
                                </span>
                              )}

                              {r.active && (
                                <span className="room-select-hint">
                                  {roomId === r.id
                                    ? "Selected ✓"
                                    : "View schedule →"}
                                </span>
                              )}
                            </button>
                          ))}
                      </div>
                    </div>
                  ))
              )}
            </>
          )}
        </section>

        <section className="panel availability-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">03 / AVAILABILITY</span>
              <h2>
                {selectedRoom ? `Room ${selectedRoom.number}` : "Room schedule"}
              </h2>
            </div>
          </div>

          {!roomId || !selectedRoom?.active ? (
            <div className="empty-state">
              <Clock3 size={28} />
              <strong>
                {selectedRoom && !selectedRoom.active
                  ? "This room is inactive"
                  : "Select a room to inspect its schedule"}
              </strong>
              <span>
                {selectedRoom && !selectedRoom.active
                  ? "This room cannot be selected or added to the booking queue."
                  : "Availability is checked against confirmed reservations."}
              </span>
            </div>
          ) : (
            <>
              <label className="field-label">
                Reservation date
                <input
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    inspectRoom(roomId, e.target.value);
                  }}
                />
              </label>

              <div className="slot-legend">
                <span>
                  <i className="slot-available" />
                  Available
                </span>
                <span>
                  <i className="slot-occupied" />
                  Occupied
                </span>
                <span>
                  <i className="slot-past" />
                  Past
                </span>
              </div>

              <div className="slot-grid">
                {(availability?.slots ?? []).map((slot: any) => (
                  <button
                    key={slot.startAt}
                    disabled={!slot.available}
                    className={`time-slot ${
                      slot.available
                        ? "available"
                        : slot.past
                          ? "past"
                          : "occupied"
                    } ${
                      start ===
                      new Date(slot.startAt).toLocaleTimeString("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Asia/Manila",
                      })
                        ? "chosen"
                        : ""
                    }`}
                    onClick={() => {
                      const slotStart = new Date(slot.startAt);

                      setStart(
                        slotStart.toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "Asia/Manila",
                        }),
                      );

                      const slotEnd = new Date(
                        slotStart.getTime() + 60 * 60 * 1000,
                      );

                      setEnd(
                        slotEnd.toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "Asia/Manila",
                        }),
                      );
                    }}
                  >
                    {new Date(slot.startAt).toLocaleTimeString("en-PH", {
                      hour: "numeric",
                      minute: "2-digit",
                      timeZone: "Asia/Manila",
                    })}
                  </button>
                ))}
              </div>

              <div className="booking-fields">
                <label className="field-label">
                  Start time
                  <input
                    type="time"
                    step="1800"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                  />
                </label>

                <label className="field-label">
                  End time
                  <input
                    type="time"
                    step="1800"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                  />
                </label>

                {canBook && (
                  <label className="field-label wide">
                    Reserve for class
                    <select
                      value={classId}
                      onChange={(e) => setClassId(e.target.value)}
                    >
                      <option value="">Select your class</option>

                      {availableClasses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.block}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                {canBook ? (
                  <button className="btn primary full wide" onClick={addQueue}>
                    <Plus size={16} />
                    Confirm reservation
                  </button>
                ) : (
                  <p className="helper-text wide">
                    You can check availability, but only assigned class
                    representatives can reserve rooms.
                  </p>
                )}
              </div>
            </>
          )}

          {message && (
            <div
              className={`alert ${
                message.includes("Added") ? "success" : "error"
              }`}
              role="status"
            >
              {message}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

// --------------------------------------------------
// RESERVATIONS PAGE
// --------------------------------------------------

function QueuePage() {
  const { user } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(true);
  const [workingId, setWorkingId] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("EARLIEST");
  const [extensionValues, setExtensionValues] = useState<Record<string, string>>({});
  const [undoableIds, setUndoableIds] = useState<string[]>([]);

  const isAdmin = user?.role === "ADMIN";

  function canManage(reservation: Reservation) {
    return isAdmin || user?.memberships?.some(
      (membership) => membership.class.id === reservation.class.id && membership.isRep,
    ) === true;
  }

  function toManilaDateTimeInput(value: string) {
    const date = new Date(value);
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
    return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
  }

  async function load() {
    setBusy(true);

    try {
      const data = await api.get<Reservation[]>("/reservations");

      // Exclude all cancelled reservations when loading or refreshing.
      setReservations(
        data.filter((reservation) => reservation.status !== "CANCELLED")
      );

      setMessage("");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not load reservations.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function cancelReservation(id: string) {
    if (!confirm("Cancel this upcoming reservation?")) return;

    setWorkingId(id);

    try {
      await api.post(`/reservations/${id}/cancel`);

      // Update the reservation's status in the frontend.
      setReservations((prev) =>
        prev.map((reservation) =>
          reservation.id === id
            ? { ...reservation, status: "CANCELLED" }
            : reservation
        )
      );

      setMessage("Reservation cancelled.");
      setUndoableIds((prev) => [...prev, id]);

    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Cancellation failed.");
    } finally {
      setWorkingId("");
    }
  }

  async function undoCancellation(id: string) {
    setWorkingId(id);

    try {
      await api.post(`/reservations/${id}/undo-cancel`);

      setReservations((prev) =>
        prev.map((reservation) =>
          reservation.id === id
            ? { ...reservation, status: "CONFIRMED" }
            : reservation
        )
      );

      setUndoableIds((prev) => prev.filter((reservationId) => reservationId !== id));
      setMessage("Reservation restored successfully.");
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Could not restore reservation."
      );
    } finally {
      setWorkingId("");
    }
  }

  async function endReservationEarly(id: string) {
    if (!confirm("End this reservation now? The remaining time will become available.")) return;
    setWorkingId(id);
    try {
      await api.post(`/reservations/${id}/end-early`);
      setMessage("Reservation ended early. The remaining time is now available.");
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not end reservation early.");
    } finally {
      setWorkingId("");
    }
  }

  async function extendReservation(id: string) {
    const endAt = extensionValues[id];
    if (!endAt) {
      setMessage("Choose a new end date and time first.");
      return;
    }
    setWorkingId(id);
    try {
      await api.patch(`/reservations/${id}/extend`, { endAt });
      setMessage("Reservation extended successfully.");
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not extend reservation.");
    } finally {
      setWorkingId("");
    }
  }

  const visibleReservations = [...reservations]
    .filter((reservation) =>
      `${reservation.room.floor?.building?.name ?? "Building"} room ${reservation.room.number} ${reservation.class.block} ${reservation.createdBy.fullName}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "LATEST"
        ? new Date(b.startAt).getTime() - new Date(a.startAt).getTime()
        : new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
    );

  const now = Date.now();
  const upcomingCount = reservations.filter(
    (reservation) =>
      reservation.status === "CONFIRMED" &&
      new Date(reservation.startAt).getTime() > now &&
      !reservation.endedEarlyAt,
  ).length;
  const activeCount = reservations.filter(
    (reservation) =>
      reservation.status === "CONFIRMED" &&
      new Date(reservation.startAt).getTime() <= now &&
      new Date(reservation.endedEarlyAt ?? reservation.endAt).getTime() > now,
  ).length;

  return (
    <>
      <PageHeading
        eyebrow="RESERVATION MANAGEMENT"
        title="Reservations"
        description="View confirmed room reservations and manage bookings for your class."
        action={
          <button className="btn secondary" onClick={load} disabled={busy}>
            <span aria-hidden="true">↻</span>
            Refresh
          </button>
        }
      />

      {message && (
        <div className="alert" role="status">
          {message}
        </div>
      )}

      <div className="queue-summary">
        <article className="queue-summary-card">
          <span className="eyebrow">TOTAL RESERVATIONS</span>
          <strong>{reservations.length}</strong>
          <small>Bookings across your accessible classes</small>
        </article>
        <article className="queue-summary-card">
          <span className="eyebrow">UPCOMING</span>
          <strong>{upcomingCount}</strong>
          <small>Confirmed future bookings</small>
        </article>
        <article className="queue-summary-card">
          <span className="eyebrow">CURRENTLY ACTIVE</span>
          <strong>{activeCount}</strong>
          <small>Reservations in progress</small>
        </article>
      </div>

      <section className="panel queue-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">CONFIRMED BOOKINGS</span>
            <h2>Your reservations</h2>
          </div>
          <span className="status confirmed">Automatically confirmed</span>
        </div>

        {!busy && reservations.length > 0 && (
          <div className="queue-toolbar">
            <label className="search-field">
              <Search size={16} />
              <input
                aria-label="Search reservations"
                placeholder="Search room, building, class, or booker"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <select
              aria-label="Sort reservations"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="EARLIEST">Earliest first</option>
              <option value="LATEST">Latest first</option>
            </select>
          </div>
        )}

        {busy ? (
          <div className="loading-state">Loading reservations…</div>
        ) : reservations.length === 0 ? (
          <div className="empty-state">
            <CalendarDays size={28} />
            <strong>No reservations yet</strong>
            <span>When a representative books a room, the confirmed reservation will appear here.</span>
            <Link className="btn secondary" to="/rooms">Find a room</Link>
          </div>
        ) : visibleReservations.length === 0 ? (
          <div className="empty-state compact-empty">
            <Search size={22} />
            <strong>No matching reservations</strong>
            <span>Try another room, building, class, or booker name.</span>
          </div>
        ) : (
          <div className="queue-list">
            {visibleReservations.map((reservation) => {
              const start = new Date(reservation.startAt);
              const scheduledEnd = new Date(reservation.endAt);
              const effectiveEnd = new Date(reservation.endedEarlyAt ?? reservation.endAt);
              const isConfirmed = reservation.status === "CONFIRMED";
              const isActive =
                isConfirmed &&
                start.getTime() <= now &&
                effectiveEnd.getTime() > now &&
                !reservation.endedEarlyAt;
              const isUpcoming = isConfirmed && start.getTime() > now;
              const manager = canManage(reservation);
              const isWorking = workingId === reservation.id;

              return (
                <article className="queue-item" key={reservation.id}>
                  <div className="queue-room-icon">
                    <Building2 size={21} />
                  </div>

                  <div className="queue-item-info">
                    <h3>
                      {reservation.room.floor?.building?.name ?? "Building"}
                      {" · "}
                      Room {reservation.room.number}
                    </h3>
                    <p>
                      {reservation.class.block} · Floor {reservation.room.floor?.number ?? "—"}
                    </p>

                    <div className="reservation-meta">
                      <span>
                        <CalendarDays size={14} />
                        {start.toLocaleDateString("en-PH", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          timeZone: "Asia/Manila",
                        })}
                      </span>
                      <span>
                        <Clock3 size={14} />
                        {start.toLocaleTimeString("en-PH", {
                          hour: "numeric",
                          minute: "2-digit",
                          timeZone: "Asia/Manila",
                        })}
                        {" – "}
                        {(reservation.endedEarlyAt ? effectiveEnd : scheduledEnd).toLocaleTimeString("en-PH", {
                          hour: "numeric",
                          minute: "2-digit",
                          timeZone: "Asia/Manila",
                        })}
                      </span>
                      <span>Booked by {reservation.createdBy.fullName}</span>
                    </div>

                    <span className={`queue-pending-label ${
                        reservation.status === "CANCELLED"
                          ? "cancelled"
                          : reservation.endedEarlyAt
                            ? "ended"
                            : ""
                      }`}
                    >
                      <i />
                      {reservation.status === "CANCELLED"
                        ? "Cancelled"
                        : reservation.endedEarlyAt
                          ? "Ended early"
                          : isActive
                            ? "In progress"
                            : isUpcoming
                              ? "Upcoming"
                              : reservation.status.toLowerCase()}
                    </span>

                    {reservation.status === "CANCELLED" &&
                      undoableIds.includes(reservation.id) && (
                        <button
                          className="queue-undo-button"
                          disabled={isWorking}
                          onClick={() => undoCancellation(reservation.id)}
                        >
                          {isWorking ? "Restoring..." : "Undo"}
                        </button>
                      )}

                    {manager && isConfirmed && (
                      <div className="queue-item-actions reservation-actions">
                        {isActive && (
                          <button
                            className="btn secondary"
                            disabled={isWorking}
                            onClick={() => endReservationEarly(reservation.id)}
                          >
                            End early
                          </button>
                        )}

                        {!reservation.endedEarlyAt && scheduledEnd.getTime() > now && (
                          <div className="reservation-extend-control">
                            <label>
                              New end time
                              <input
                                type="datetime-local"
                                step="1800"
                                min={toManilaDateTimeInput(reservation.endAt)}
                                value={extensionValues[reservation.id] ?? toManilaDateTimeInput(reservation.endAt)}
                                onChange={(e) =>
                                  setExtensionValues((current) => ({
                                    ...current,
                                    [reservation.id]: e.target.value,
                                  }))
                                }
                              />
                            </label>
                            <button
                              className="extend-button"
                              disabled={isWorking}
                              onClick={() => extendReservation(reservation.id)}
                            >
                              Extend
                            </button>
                          </div>
                        )}

                        {isUpcoming && (
                          <button
                            className="btn danger"
                            disabled={isWorking}
                            onClick={() => cancelReservation(reservation.id)}
                          >
                            Cancel reservation
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <p className="fine-print queue-note">
        Reservations are confirmed automatically when all booking rules pass. Representatives can manage reservations belonging to their own class; students can view reservations but cannot manage them.
      </p>
    </>
  );
}

// --------------------------------------------------
// CLASSSES PAGE
// --------------------------------------------------

function ClassesPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [email, setEmail] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");

  // Admin class filters
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedBlock, setSelectedBlock] = useState("");

  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  async function load() {
    try {
      setClasses(await api.get<any[]>("/classes"));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to load classes.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function addMember(id: string) {
    try {
      await api.post(`/classes/${id}/members`, {
        email: email[id],
      });

      setMessage("Student added to class.");

      setEmail((v) => ({
        ...v,
        [id]: "",
      }));

      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to add student.");
    }
  }

  // Get all available programs
  const programs = Array.from(
    new Set(classes.map((cls) => cls.program)),
  ).sort();

  // Get years belonging to the selected program
  const availableYears = Array.from(
    new Set(
      classes
        .filter((cls) => cls.program === selectedProgram)
        .map((cls) => cls.yearLevel),
    ),
  ).sort((a, b) => a - b);

  // Get blocks belonging to the selected program and year
  const availableBlocks = Array.from(
    new Set(
      classes
        .filter(
          (cls) =>
            cls.program === selectedProgram && cls.yearLevel === selectedYear,
        )
        .map((cls) => cls.block),
    ),
  ).sort();

  // Find the selected class
  const selectedClass = classes.find(
    (cls) =>
      cls.program === selectedProgram &&
      cls.yearLevel === selectedYear &&
      cls.block === selectedBlock,
  );

  function clearFilters() {
    setSelectedProgram("");
    setSelectedYear(null);
    setSelectedBlock("");
    setMessage("");
  }

  function renderClassCard(cls: any) {
    return (
      <section className="panel class-panel" key={cls.id}>
        <div className="class-banner">
          <div className="class-monogram">{cls.block.slice(-2)}</div>

          <div>
            <span className="eyebrow">{cls.program}</span>
            <h2>{cls.block}</h2>

            <p>
              {cls.yearLevel}
              {cls.yearLevel === 1
                ? "st"
                : cls.yearLevel === 2
                  ? "nd"
                  : cls.yearLevel === 3
                    ? "rd"
                    : "th"}{" "}
              year · {cls.memberships.length} members
            </p>
          </div>
        </div>

        <div className="class-content">
          <div>
            <h3>Representatives</h3>
              
            <div className="member-list">
              {cls.memberships
                .filter((m: any) => m.isRep)
                .map((m: any) => (
                  <div className="member-row" key={m.id}>
                    <span className="avatar">
                      {m.user.fullName
                        .split(" ")
                        .map((n: string) => n[0])
                        .slice(0, 2)
                        .join("")}
                    </span>

                    <span>
                      {m.user.fullName}
                      <small>{m.user.email}</small>
                    </span>

                    <span className="status confirmed">Representative</span>
                  </div>
                ))}

              {!cls.memberships.some((m: any) => m.isRep) && (
                <p className="muted">No representatives assigned.</p>
              )}
            </div>
          
            <h3>Class members</h3>

            <div className="member-list">
              {cls.memberships
                .filter((m: any) => !m.isRep)
                .map((m: any) => (

                <div className="member-row" key={m.id}>
                  <span className="avatar">
                    {m.user.fullName
                      .split(" ")
                      .map((n: string) => n[0])
                      .slice(0, 2)
                      .join("")}
                  </span>

                  <span>
                    {m.user.fullName}
                    <small>{m.user.email}</small>
                  </span>
                </div>
              ))}
            </div>

            {cls.memberships.some(
              (m: any) => m.userId === user?.id && m.isRep,
            ) && (
              <div className="add-member">
                <label className="field-label">
                  Add existing student by email
                  <input
                    type="email"
                    placeholder="student@school.edu"
                    value={email[cls.id] ?? ""}
                    onChange={(e) =>
                      setEmail((v) => ({
                        ...v,
                        [cls.id]: e.target.value,
                      }))
                    }
                  />
                </label>

                <button
                  className="btn secondary"
                  onClick={() => addMember(cls.id)}
                >
                  <Plus size={15} />
                  Add student
                </button>
              </div>
            )}
          </div>

          <div className="class-reservations">
            <h3>Confirmed reservations</h3>

            {cls.reservations.length ? (
              cls.reservations.map((r: any) => (
                <div className="class-reservation" key={r.id}>
                  <strong>Room {r.room.number}</strong>

                  <span>{new Date(r.startAt).toLocaleDateString()}</span>

                  <small>
                    {new Date(r.startAt).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                    {" – "}
                    {new Date(r.endAt).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </small>
                </div>
              ))
            ) : (
              <p className="muted">No upcoming reservations.</p>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <PageHeading
        eyebrow="ACADEMIC DIRECTORY"
        title={isAdmin ? "Class Management" : "Your classes"}
        description="Class rosters, representatives, and upcoming room reservations."
      />

      {/* ADMIN CLASS FILTERS */}
      {isAdmin ? (
        <div className="panel">
          <h3>Find a Class</h3>

          {/* PROGRAM */}
          <div className="form-group">
            <label className="field-label">PROGRAM</label>

            <div className="selection-buttons">
              {programs.map((program) => (
                <button
                  key={program}
                  type="button"
                  className={
                    selectedProgram === program
                      ? "btn primary"
                      : "btn secondary"
                  }
                  onClick={() => {
                    setSelectedProgram(program);
                    setSelectedYear(null);
                    setSelectedBlock("");
                    setMessage("");
                  }}
                >
                  {program}
                </button>
              ))}
            </div>
          </div>

          {/* YEAR LEVEL */}
          <div className="form-group">
            <label className="field-label">YEAR LEVEL</label>

            <div className="selection-buttons">
              {[1, 2, 3, 4].map((year) => (
                <button
                  key={year}
                  type="button"
                  className={
                    selectedYear === year ? "btn primary" : "btn secondary"
                  }
                  disabled={!selectedProgram || !availableYears.includes(year)}
                  onClick={() => {
                    setSelectedYear(year);
                    setSelectedBlock("");
                    setMessage("");
                  }}
                >
                  {year}
                  {year === 1
                    ? "st"
                    : year === 2
                      ? "nd"
                      : year === 3
                        ? "rd"
                        : "th"}{" "}
                  Year
                </button>
              ))}
            </div>
          </div>

          {/* BLOCK */}
          <div className="form-group">
            <label className="field-label">BLOCK</label>

            <div className="selection-buttons">
              {["A", "B", "C", "D"].map((block) => {
                const matchingBlock = availableBlocks.find((value) =>
                  value.endsWith(block),
                );

                return (
                  <button
                    key={block}
                    type="button"
                    className={
                      selectedBlock === matchingBlock && matchingBlock
                        ? "btn primary"
                        : "btn secondary"
                    }
                    disabled={!selectedYear || !matchingBlock}
                    onClick={() => {
                      if (!matchingBlock) return;

                      setSelectedBlock(matchingBlock);
                      setMessage("");
                    }}
                  >
                    Block {block}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            className="btn secondary"
            onClick={clearFilters}
          >
            Clear Selection
          </button>
        </div>
      ) : null}

      {/* CLASS RESULTS */}
      <div className="class-list">
        {isAdmin ? (
          selectedClass ? (
            renderClassCard(selectedClass)
          ) : (
            <div className="panel empty-state">
              <h3>Select a Class</h3>
              <p>
                Choose a program, year level, and block above to view the class
                information.
              </p>
            </div>
          )
        ) : (
          classes.map((cls) => renderClassCard(cls))
        )}
      </div>

      {message && (
        <div className="alert" role="status">
          {message}
        </div>
      )}
    </>
  );
}

//--------11/07/26-----//
type ProgramInfo = {
  id: string;
  code: string;
  name: string;
  active: boolean;
  classCount: number;
  createdAt: string;
};

type InvitationCode = {
  id: string;
  classId: string;
  maxUses: number;
  usedCount: number;
  active: boolean;
  expiresAt: string | null;
  createdAt: string;
  class: {
    id: string;
    program: string;
    yearLevel: number;
    block: string;
  };
};

type AdminRoom = {
  id: string;
  number: string;
  name: string;
  capacity: number;
  roomType: string;
  facilities: string[];
  active: boolean;
};

type AdminFloor = {
  id: string;
  number: number;
  active: boolean;
  rooms: AdminRoom[];
};

type AdminBuilding = {
  id: string;
  code: string;
  name: string;
  description: string;
  active: boolean;
  floors: AdminFloor[];
};

type RoomDraft = {
  number: string;
  name: string;
  capacity: number;
  roomType: string;
  facilities: string;
};

type FloorDraft = {
  number: number;
  rooms: RoomDraft[];
};

function createRoomDraft(): RoomDraft {
  return {
    number: "",
    name: "",
    capacity: 30,
    roomType: "Classroom",
    facilities: "",
  };
}

function BuildingsPage() {
  const [buildings, setBuildings] = useState<AdminBuilding[]>([]);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [floors, setFloors] = useState<FloorDraft[]>([
    { number: 1, rooms: [createRoomDraft()] },
  ]);

  const [step, setStep] = useState(1);
  const [selectedFloor, setSelectedFloor] = useState(0);
  const [directoryOpen, setDirectoryOpen] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState("");

  const [manageBuilding, setManageBuilding] = useState<AdminBuilding | null>(
    null,
  );

  const [selectedDelete, setSelectedDelete] = useState<{
    type: "building" | "floor" | "room";
    id: string;
    label: string;
  } | null>(null);

  async function loadBuildings() {
    const result = await api.get<{ buildings: AdminBuilding[] }>(
      "/admin/buildings",
    );
    setBuildings(result.buildings);
  }

  useEffect(() => {
    async function load() {
      try {
        await loadBuildings();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to load buildings.",
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  function changeFloorCount(count: number) {
    const safeCount = Math.max(1, Math.min(20, count));

    setFloors((current) => {
      const updated = [...current];

      while (updated.length < safeCount) {
        updated.push({
          number: updated.length + 1,
          rooms: [createRoomDraft()],
        });
      }

      return updated.slice(0, safeCount).map((floor, index) => ({
        ...floor,
        number: index + 1,
      }));
    });

    setSelectedFloor(0);
  }

  function changeRoomCount(floorIndex: number, count: number) {
    const safeCount = Math.max(1, Math.min(100, count));

    setFloors((current) =>
      current.map((floor, index) => {
        if (index !== floorIndex) return floor;

        const rooms = [...floor.rooms];

        while (rooms.length < safeCount) {
          rooms.push(createRoomDraft());
        }

        return {
          ...floor,
          rooms: rooms.slice(0, safeCount),
        };
      }),
    );
  }

  function updateRoom(
    floorIndex: number,
    roomIndex: number,
    field: keyof RoomDraft,
    value: string | number,
  ) {
    setFloors((current) =>
      current.map((floor, index) => {
        if (index !== floorIndex) return floor;

        return {
          ...floor,
          rooms: floor.rooms.map((room, roomNumber) =>
            roomNumber === roomIndex ? { ...room, [field]: value } : room,
          ),
        };
      }),
    );
  }

  function validateBuildingDetails() {
    if (code.trim().length < 2) {
      setError("Please enter a building code with at least 2 characters.");
      return false;
    }

    if (name.trim().length < 2) {
      setError("Please enter a building name with at least 2 characters.");
      return false;
    }

    return true;
  }

  function validateFloors() {
    for (let floorIndex = 0; floorIndex < floors.length; floorIndex++) {
      const floor = floors[floorIndex];

      for (let roomIndex = 0; roomIndex < floor.rooms.length; roomIndex++) {
        const room = floor.rooms[roomIndex];

        if (!room.number.trim()) {
          setSelectedFloor(floorIndex);
          setError(
            `Please enter a room number for every room on Floor ${floor.number}.`,
          );
          return false;
        }

        if (room.capacity < 1 || !Number.isInteger(room.capacity)) {
          setSelectedFloor(floorIndex);
          setError(
            `Please enter a valid capacity for every room on Floor ${floor.number}.`,
          );
          return false;
        }
      }
    }

    return true;
  }

  function goToStep(nextStep: number) {
    setError("");

    if (nextStep > 1 && !validateBuildingDetails()) {
      setStep(1);
      return;
    }

    if (nextStep > 2 && !validateFloors()) {
      setStep(2);
      return;
    }

    setStep(nextStep);
  }

  async function addBuilding(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!validateBuildingDetails() || !validateFloors()) {
      setStep(1);
      return;
    }

    setBusy(true);

    try {
      await api.post("/admin/buildings", {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: description.trim() || "",
        floors: floors.map((floor) => ({
          number: floor.number,
          rooms: floor.rooms.map((room) => ({
            number: room.number.trim(),
            name: room.name.trim(),
            capacity: room.capacity,
            roomType: room.roomType.trim(),
            facilities: room.facilities
              .split(",")
              .map((facility) => facility.trim())
              .filter(Boolean),
          })),
        })),
      });

      setCode("");
      setName("");
      setDescription("");
      setFloors([{ number: 1, rooms: [createRoomDraft()] }]);
      setSelectedFloor(0);
      setStep(1);

      setMessage("Building, floors, and rooms created successfully.");
      await loadBuildings();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to create building.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function deleteSelected() {
    if (!manageBuilding || !selectedDelete) return;

    const deletionScope =
      selectedDelete.type === "building"
        ? " This will also delete all of its floors and rooms."
        : selectedDelete.type === "floor"
          ? " This will also delete all rooms on that floor."
          : "";

    const confirmed = window.confirm(
      `Are you sure you want to delete "${selectedDelete.label}"?${deletionScope} This action cannot be undone.`,
    );

    if (!confirmed) return;

    setError("");
    setMessage("");
    setDeletingId(selectedDelete.id);

    try {
      const endpoint =
        selectedDelete.type === "building"
          ? `/admin/buildings/${selectedDelete.id}`
          : selectedDelete.type === "floor"
            ? `/admin/floors/${selectedDelete.id}`
            : `/admin/rooms/${selectedDelete.id}`;

      await api.delete(endpoint);

      setMessage(`${selectedDelete.type} deleted successfully.`);
      setSelectedDelete(null);
      setManageBuilding(null);

      await loadBuildings();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete the selected item.",
      );
    } finally {
      setDeletingId("");
    }
  }

  async function changeLocationStatus(
    type: "building" | "floor" | "room",
    id: string,
    active: boolean,
  ) {
    const label =
      type === "building" ? "building" : type === "floor" ? "floor" : "room";

    const action = active ? "activate" : "deactivate";

    if (!window.confirm(`Are you sure you want to ${action} this ${label}?`)) {
      return;
    }

    setError("");
    setMessage("");

    try {
      await api.patch(`/admin/${type}s/${id}/status`, { active });

      setMessage(
        `${label} ${active ? "activated" : "deactivated"} successfully.`,
      );

      await loadBuildings();

      if (manageBuilding) {
        const updated = await api.get<{ buildings: AdminBuilding[] }>(
          "/admin/buildings",
        );

        setManageBuilding(
          updated.buildings.find(
            (building) => building.id === manageBuilding.id,
          ) ?? null,
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Unable to update ${label} status.`,
      );
    }
  }

  const totalRooms = floors.reduce(
    (total, floor) => total + floor.rooms.length,
    0,
  );

  const activeFloor = floors[selectedFloor];

  return (
    <>
      <PageHeading
        eyebrow="ADMINISTRATION"
        title="Building Management"
        description="Set up buildings, floors, and classrooms in three simple steps."
      />

      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}

      {message && (
        <div className="alert success" role="status">
          {message}
        </div>
      )}

      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">BUILDING SETUP</span>
            <h2>
              {step === 1
                ? "Building information"
                : step === 2
                  ? "Floor and classroom setup"
                  : "Review your building"}
            </h2>
          </div>
          <Building2 size={24} />
        </div>

        <div className="step-indicator">
          {[1, 2, 3].map((number) => (
            <button
              key={number}
              type="button"
              className={`step-item ${step === number ? "active" : ""} ${step > number ? "completed" : ""}`}
              onClick={() => goToStep(number)}
            >
              <span className="step-number">{number}</span>
              <span>
                {number === 1
                  ? "Building"
                  : number === 2
                    ? "Floors & Rooms"
                    : "Review"}
              </span>
            </button>
          ))}
        </div>

        <form onSubmit={addBuilding}>
          {step === 1 && (
            <div className="wizard-content">
              <p className="muted">
                Start by providing the basic information about the building.
              </p>

              <label className="field-label">
                BUILDING CODE
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. BLDG-A"
                  required
                  minLength={2}
                  maxLength={20}
                />
              </label>

              <label className="field-label">
                BUILDING NAME
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Main Academic Building"
                  required
                  minLength={2}
                  maxLength={100}
                />
              </label>

              <label className="field-label">
                DESCRIPTION
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe this building..."
                  minLength={2}
                  maxLength={500}
                />
              </label>

              <label className="field-label">
                NUMBER OF FLOORS
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={floors.length}
                  onChange={(e) => changeFloorCount(Number(e.target.value))}
                  required
                />
                <small className="muted">
                  You can configure the classrooms on each floor in the next
                  step.
                </small>
              </label>

              <div className="wizard-actions">
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => goToStep(2)}
                >
                  Continue to Floors
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="wizard-content">
              <p className="muted">
                Select a floor below to configure its classrooms. Only one floor
                is displayed at a time.
              </p>

              <div className="floor-selector">
                {floors.map((floor, index) => (
                  <button
                    key={floor.number}
                    type="button"
                    className={`btn ${selectedFloor === index ? "primary" : "secondary"}`}
                    onClick={() => {
                      setSelectedFloor(index);
                      setError("");
                    }}
                  >
                    Floor {floor.number}
                  </button>
                ))}
              </div>

              {activeFloor && (
                <section className="floor-editor">
                  <div className="panel-heading">
                    <div>
                      <span className="eyebrow">
                        FLOOR {activeFloor.number}
                      </span>
                      <h3>Classroom configuration</h3>
                    </div>
                    <Building2 size={22} />
                  </div>

                  <label className="field-label">
                    NUMBER OF ROOMS ON THIS FLOOR
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={activeFloor.rooms.length}
                      onChange={(e) =>
                        changeRoomCount(selectedFloor, Number(e.target.value))
                      }
                      required
                    />
                  </label>

                  <div className="room-editor-list">
                    {activeFloor.rooms.map((room, roomIndex) => (
                      <details
                        className="room-editor"
                        key={`${activeFloor.number}-${roomIndex}`}
                        open={roomIndex === 0}
                      >
                        <summary>
                          <strong>
                            Room {roomIndex + 1}
                            {room.name.trim() ? ` – ${room.name}` : ""}
                          </strong>
                          <span className="muted">
                            {room.number.trim() || "Room number not set"}
                          </span>
                        </summary>

                        <div className="room-editor-fields">
                          <label className="field-label">
                            ROOM NUMBER
                            <input
                              value={room.number}
                              onChange={(e) =>
                                updateRoom(
                                  selectedFloor,
                                  roomIndex,
                                  "number",
                                  e.target.value,
                                )
                              }
                              placeholder="e.g. 101"
                              required
                            />
                          </label>

                          <label className="field-label">
                            ROOM NAME
                            <input
                            value={room.name}
                            onChange={(e) =>
                              updateRoom(
                                selectedFloor,
                                roomIndex,
                                "name",
                                e.target.value,
                              )
                            }
                            placeholder="e.g. Computer Laboratory"
                          />
                          </label>

                          <label className="field-label">
                            CAPACITY
                            <input
                              type="number"
                              min={1}
                              value={room.capacity}
                              onChange={(e) =>
                                updateRoom(
                                  selectedFloor,
                                  roomIndex,
                                  "capacity",
                                  Number(e.target.value),
                                )
                              }
                              required
                            />
                          </label>

                          <label className="field-label">
                            ROOM TYPE
                            <input
                              value={room.roomType}
                              onChange={(e) =>
                                updateRoom(
                                  selectedFloor,
                                  roomIndex,
                                  "roomType",
                                  e.target.value,
                                )
                              }
                              placeholder="e.g. Classroom, Laboratory"
                              required
                            />
                          </label>

                          <label className="field-label">
                            FACILITIES
                            <input
                              value={room.facilities}
                              onChange={(e) =>
                                updateRoom(
                                  selectedFloor,
                                  roomIndex,
                                  "facilities",
                                  e.target.value,
                                )
                              }
                              placeholder="e.g. Projector, Wi-Fi, Air Conditioning"
                            />
                            <small className="muted">
                              Separate facilities with commas.
                            </small>
                          </label>
                        </div>
                      </details>
                    ))}
                  </div>

                  <p className="muted">
                    {activeFloor.rooms.length} room(s) configured on this floor.
                  </p>
                </section>
              )}

              <p className="muted">
                Total: {floors.length} floor(s) and {totalRooms} room(s).
              </p>

              <div className="wizard-actions">
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => goToStep(1)}
                >
                  Back
                </button>

                <button
                  type="button"
                  className="btn primary"
                  onClick={() => goToStep(3)}
                >
                  Review Building
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="wizard-content">
              <p className="muted">
                Check your information before saving. You can go back to make
                changes.
              </p>

              <section className="review-section">
                <span className="eyebrow">BUILDING DETAILS</span>
                <h3>{name}</h3>
                <p>
                  <strong>Code:</strong> {code.toUpperCase()}
                </p>
                <p>{description}</p>
              </section>

              <section className="review-section">
                <span className="eyebrow">FLOOR AND ROOM SUMMARY</span>

                {floors.map((floor) => (
                  <div className="review-floor" key={floor.number}>
                    <h3>
                      Floor {floor.number} – {floor.rooms.length} room(s)
                    </h3>

                    {floor.rooms.map((room, index) => (
                      <div
                        className="review-room"
                        key={`${floor.number}-${index}`}
                      >
                        <strong>
                          {room.number} – {room.name}
                        </strong>
                        <small>
                          {room.roomType} · Capacity: {room.capacity}
                        </small>
                        {room.facilities.trim() && (
                          <small>Facilities: {room.facilities}</small>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </section>

              <p className="muted">
                Ready to create {name || "this building"} with {floors.length}{" "}
                floor(s) and {totalRooms} room(s).
              </p>

              <div className="wizard-actions">
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => goToStep(2)}
                  disabled={busy}
                >
                  Back to Floors
                </button>

                <button type="submit" className="btn primary" disabled={busy}>
                  <Plus size={16} />
                  {busy ? "Creating building..." : "Save Building and Rooms"}
                </button>
              </div>
            </div>
          )}
        </form>
      </section>

      <section className="panel">
        <details
          open={directoryOpen}
          onToggle={(e) => setDirectoryOpen(e.currentTarget.open)}
        >
          <summary className="directory-summary">
            <div>
              <span className="eyebrow">BUILDING DIRECTORY</span>
              <h2>Existing buildings ({buildings.length})</h2>
            </div>
            <Building2 size={22} />
          </summary>

          <div className="directory-content">
            {loading ? (
              <div className="loading-state">Loading buildings...</div>
            ) : buildings.length === 0 ? (
              <div className="empty-state">
                No buildings have been added yet.
              </div>
            ) : (
              <div className="invitation-list">
                {buildings.map((building) => (
                  <article className="member-row" key={building.id}>
                    <span className="avatar">
                      <Building2 size={18} />
                    </span>

                    <div>
                      <strong>
                        {building.code} – {building.name}
                      </strong>

                      <small>{building.description}</small>

                      <small>
                        {building.floors.length} floor(s) ·{" "}
                        {building.floors.reduce(
                          (total, floor) => total + floor.rooms.length,
                          0,
                        )}{" "}
                        room(s)
                      </small>
                    </div>

                    <button
                      type="button"
                      className="btn secondary"
                      onClick={() => {
                        setManageBuilding(building);
                        // Require an explicit selection to prevent accidental
                        // deletion of an entire building.
                        setSelectedDelete(null);
                      }}
                    >
                      Manage
                    </button>
                  </article>
                ))}
              </div>
            )}
          </div>
        </details>
      </section>

      {manageBuilding && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(0, 0, 0, 0.6)",
            display: "grid",
            placeItems: "center",
            padding: "20px",
          }}
        >
          <div
            className="building-management-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="manage-building-title"
            style={{
              width: "100%",
              maxWidth: "650px",
              maxHeight: "85vh",
              overflowY: "auto",
              borderRadius: "16px",
              padding: "24px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
          >
            <div className="panel-heading">
              <div>
                <span className="eyebrow">BUILDING MANAGEMENT</span>
                <h2 id="manage-building-title">
                  {manageBuilding.code} – {manageBuilding.name}
                </h2>
                <p className="muted">
                  Activate or deactivate locations, or select an item to delete.
                </p>
              </div>

              <button
                type="button"
                className="btn secondary"
                onClick={() => {
                  setManageBuilding(null);
                  setSelectedDelete(null);
                }}
              >
                <X size={16} />
                Close
              </button>
            </div>

            <div className="wizard-content">
              <div className="review-section">
                <div className="review-room">
                  <span>
                    <strong>
                      {manageBuilding.code} – {manageBuilding.name}
                    </strong>
                    {!manageBuilding.active && " (Inactive)"}
                  </span>

                  <div className="selection-buttons">
                    <button
                      type="button"
                      className="btn secondary"
                      onClick={() =>
                        changeLocationStatus(
                          "building",
                          manageBuilding.id,
                          !manageBuilding.active,
                        )
                      }
                    >
                      {manageBuilding.active ? "Deactivate" : "Activate"}
                    </button>

                    <button
                      type="button"
                      className={`btn ${
                        selectedDelete?.type === "building" &&
                        selectedDelete.id === manageBuilding.id
                          ? "primary"
                          : "secondary"
                      }`}
                      onClick={() =>
                        setSelectedDelete({
                          type: "building",
                          id: manageBuilding.id,
                          label: `${manageBuilding.code} – ${manageBuilding.name}`,
                        })
                      }
                    >
                      <Building2 size={16} />
                      Select Entire Building
                    </button>
                  </div>
                </div>
              </div>

              {manageBuilding.floors.map((floor) => (
                <div className="review-section" key={floor.id}>
                  <div className="review-room">
                    <span>
                      <strong>Floor {floor.number}</strong>
                      {!floor.active && " (Inactive)"}
                    </span>

                    <div className="selection-buttons">
                      <button
                        type="button"
                        className="btn secondary"
                        onClick={() =>
                          changeLocationStatus("floor", floor.id, !floor.active)
                        }
                      >
                        {floor.active ? "Deactivate" : "Activate"}
                      </button>

                      <button
                        type="button"
                        className={`btn ${
                          selectedDelete?.type === "floor" &&
                          selectedDelete.id === floor.id
                            ? "primary"
                            : "secondary"
                        }`}
                        onClick={() =>
                          setSelectedDelete({
                            type: "floor",
                            id: floor.id,
                            label: `Floor ${floor.number} of ${manageBuilding.name}`,
                          })
                        }
                      >
                        Select Floor {floor.number}
                      </button>
                    </div>
                  </div>

                  {floor.rooms.map((room) => (
                    <div className="review-room" key={room.id}>
                      <span>
                        {room.number} – {room.name}
                        {!room.active && " (Inactive)"}
                      </span>

                      <div className="selection-buttons">
                        <button
                          type="button"
                          className="btn secondary"
                          onClick={() =>
                            changeLocationStatus("room", room.id, !room.active)
                          }
                        >
                          {room.active ? "Deactivate" : "Activate"}
                        </button>

                        <button
                          type="button"
                          className={`btn ${
                            selectedDelete?.type === "room" &&
                            selectedDelete.id === room.id
                              ? "primary"
                              : "secondary"
                          }`}
                          onClick={() =>
                            setSelectedDelete({
                              type: "room",
                              id: room.id,
                              label: `Room ${room.number} – ${room.name}`,
                            })
                          }
                        >
                          Select Room
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="wizard-actions">
              <button
                type="button"
                className="btn secondary"
                onClick={() => {
                  setManageBuilding(null);
                  setSelectedDelete(null);
                }}
                disabled={Boolean(deletingId)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn primary"
                onClick={deleteSelected}
                disabled={!selectedDelete || Boolean(deletingId)}
              >
                <Trash2 size={16} />
                {deletingId ? "Deleting..." : "Delete Selected"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ProgramsPage() {
  const [programs, setPrograms] = useState<ProgramInfo[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [updatingId, setUpdatingId] = useState("");

  async function loadPrograms() {
    const result = await api.get<{ programs: ProgramInfo[] }>(
      "/admin/programs",
    );
    setPrograms(result.programs);
  }

  useEffect(() => {
    async function load() {
      try {
        await loadPrograms();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to load programs.",
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  async function addProgram(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!name.trim() || !code.trim()) {
      setError("Please enter both the program name and abbreviation.");
      return;
    }

    setBusy(true);

    try {
      await api.post("/admin/programs", {
        name: name.trim(),
        code: code.trim().toUpperCase(),
      });

      setName("");
      setCode("");
      setMessage("Program and its 16 classes created successfully.");
      await loadPrograms();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add program.");
    } finally {
      setBusy(false);
    }
  }

  async function changeProgramStatus(program: ProgramInfo) {
    const action = program.active ? "deactivate" : "reactivate";

    if (
      !window.confirm(
        `Are you sure you want to ${action} ${program.code} – ${program.name}?`,
      )
    ) {
      return;
    }

    setError("");
    setMessage("");
    setUpdatingId(program.id);

    try {
      await api.patch(`/admin/programs/${program.id}/status`, {
        active: !program.active,
      });

      setMessage(
        `${program.code} has been ${program.active ? "deactivated" : "reactivated"}.`,
      );

      await loadPrograms();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update program status.",
      );
    } finally {
      setUpdatingId("");
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="ADMINISTRATION"
        title="Program Management"
        description="Add academic programs and manage their availability in the reservation system."
      />

      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}

      {message && (
        <div className="alert success" role="status">
          {message}
        </div>
      )}

      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">01 / CREATE</span>
            <h2>Add an academic program</h2>
          </div>
        </div>

        <p className="muted">
          Each new program automatically receives 16 classes: Years 1–4, with
          Blocks A–D.
        </p>

        <form onSubmit={addProgram}>
          <label className="field-label">
            PROGRAM NAME
            <input
              type="text"
              placeholder="e.g. Information Technology"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
            />
          </label>

          <label className="field-label">
            PROGRAM ABBREVIATION
            <input
              type="text"
              placeholder="e.g. BSIT"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              required
              maxLength={10}
            />
          </label>

          <button type="submit" className="btn primary" disabled={busy}>
            <Plus size={16} />
            {busy ? "Creating..." : "Add Program"}
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">02 / DIRECTORY</span>
            <h2>Academic programs</h2>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">Loading programs...</div>
        ) : programs.length === 0 ? (
          <div className="empty-state">
            No academic programs have been added yet.
          </div>
        ) : (
          <div className="invitation-list">
            {programs.map((program) => (
              <article className="member-row" key={program.id}>
                <span className="avatar">
                  <GraduationCap size={18} />
                </span>

                <span>
                  <strong>
                    {program.code} – {program.name}
                  </strong>
                  <small>{program.classCount} classes</small>
                  <small>
                    Added:{" "}
                    {new Date(program.createdAt).toLocaleDateString("en-PH")}
                  </small>
                </span>

                <span
                  className={`status ${
                    program.active ? "confirmed" : "cancelled"
                  }`}
                >
                  {program.active ? "Active" : "Inactive"}
                </span>

                <button
                  type="button"
                  className="btn secondary"
                  disabled={updatingId === program.id}
                  onClick={() => changeProgramStatus(program)}
                >
                  {updatingId === program.id
                    ? "Updating..."
                    : program.active
                      ? "Deactivate"
                      : "Reactivate"}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

type RegularScheduleInfo = {
  id: string;
  roomId: string;
  classId: string;
  days: number[];
  startTime: string;
  endTime: string;
  effectiveFrom: string;
  effectiveUntil: string | null;
  active: boolean;
  room: {
    number: string;
    name: string;
    floor: {
      number: number;
      building: {
        name: string;
      };
    };
  };
  class: {
    block: string;
    program: string;
    yearLevel: number;
  };
  exceptions: {
    id: string;
    date: string;
    type: string;
    reason: string | null;
  }[];
};

type ScheduleRoomOption = AdminRoom & {
  floor: {
    number: number;
    active?: boolean;
    building: {
      name: string;
      active?: boolean;
    };
  };
};

function RegularSchedulesPage() {
  const [buildings, setBuildings] = useState<AdminBuilding[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [schedules, setSchedules] = useState<RegularScheduleInfo[]>([]);

  const [roomId, setRoomId] = useState("");
  const [classId, setClassId] = useState("");
  const [days, setDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("09:00");
  const [effectiveFrom, setEffectiveFrom] = useState(
    new Date().toLocaleDateString("en-CA"),
  );
  const [effectiveUntil, setEffectiveUntil] = useState("");

  const [exceptionScheduleId, setExceptionScheduleId] = useState("");
  const [exceptionDate, setExceptionDate] = useState("");
  const [exceptionReason, setExceptionReason] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const weekdays = [
    { value: 1, label: "Monday" },
    { value: 2, label: "Tuesday" },
    { value: 3, label: "Wednesday" },
    { value: 4, label: "Thursday" },
    { value: 5, label: "Friday" },
    { value: 6, label: "Saturday" },
  ];

  const availableRooms: ScheduleRoomOption[] = buildings.flatMap((building) =>
    building.floors.flatMap((floor) =>
      floor.rooms
        .filter(
          (room) =>
            room.active && floor.active !== false && building.active !== false,
        )
        .map((room) => ({
          ...room,
          floor: {
            number: floor.number,
            active: floor.active,
            building: {
              name: building.name,
              active: building.active,
            },
          },
        })),
    ),
  );

  async function loadData() {
    const [buildingData, classData, scheduleData] = await Promise.all([
      api.get<{ buildings: AdminBuilding[] }>("/admin/buildings"),
      api.get<ClassInfo[]>("/classes"),
      api.get<{ schedules: RegularScheduleInfo[] }>("/admin/regular-schedules"),
    ]);

    setBuildings(buildingData.buildings);
    setClasses(classData);
    setSchedules(scheduleData.schedules);
  }

  useEffect(() => {
    async function load() {
      try {
        await loadData();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load regular schedules.",
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  function toggleDay(day: number) {
    setDays((current) =>
      current.includes(day)
        ? current.filter((value) => value !== day)
        : [...current, day].sort((a, b) => a - b),
    );
  }

  async function createSchedule(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!roomId || !classId || days.length === 0) {
      setError("Please select a room, class, and at least one day.");
      return;
    }

    if (startTime >= endTime) {
      setError("The ending time must be later than the starting time.");
      return;
    }

    if (effectiveUntil && effectiveUntil < effectiveFrom) {
      setError("The ending date cannot be earlier than the starting date.");
      return;
    }

    setBusy(true);

    try {
      await api.post("/admin/regular-schedules", {
        roomId,
        classId,
        days,
        startTime,
        endTime,
        effectiveFrom,
        effectiveUntil: effectiveUntil || null,
      });

      setMessage("Regular schedule created successfully.");
      setRoomId("");
      setClassId("");
      setDays([]);
      setStartTime("08:00");
      setEndTime("09:00");
      setEffectiveUntil("");

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create regular schedule.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function changeScheduleStatus(schedule: RegularScheduleInfo) {
    const action = schedule.active ? "deactivate" : "reactivate";

    if (
      !window.confirm(
        `Are you sure you want to ${action} this regular schedule?`,
      )
    ) {
      return;
    }

    setError("");
    setMessage("");
    setBusy(true);

    try {
      await api.patch(`/admin/regular-schedules/${schedule.id}/status`, {
        active: !schedule.active,
      });

      setMessage(`Regular schedule ${action}d successfully.`);
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update regular schedule.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function cancelOccurrence(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!exceptionScheduleId || !exceptionDate) {
      setError("Please select a schedule and date.");
      return;
    }

    setBusy(true);

    try {
      await api.post(
        `/admin/regular-schedules/${exceptionScheduleId}/exceptions`,
        {
          type: "CANCELLED",
          date: exceptionDate,
          reason: exceptionReason.trim() || "Regular class cancelled",
        },
      );

      setMessage(
        "That day's regular schedule has been cancelled. The room can be made available for other bookings.",
      );

      setExceptionScheduleId("");
      setExceptionDate("");
      setExceptionReason("");

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to cancel this schedule occurrence.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="ADMINISTRATION"
        title="Regular Schedule Management"
        description="Create recurring class schedules and manage individual cancelled occurrences."
      />

      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}

      {message && (
        <div className="alert success" role="status">
          {message}
        </div>
      )}

      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">01 / CREATE</span>
            <h2>Add a regular schedule</h2>
          </div>
        </div>

        <p className="muted">
          Assign a room to a class on recurring days and times. You can also set
          an optional ending date.
        </p>

        {loading ? (
          <div className="loading-state">Loading rooms and classes...</div>
        ) : (
          <form onSubmit={createSchedule}>
            <div className="form-group">
              <label className="field-label">ROOM</label>
              <select
                className="form-control"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                required
              >
                <option value="">Select a room</option>
                {availableRooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.floor.building.name} · Floor {room.floor.number} ·
                    Room {room.number} ({room.name})
                  </option>
                ))}
              </select>

              {availableRooms.length === 0 && (
                <p className="muted">No active rooms are available.</p>
              )}
            </div>

            <div className="form-group">
              <label className="field-label">CLASS</label>
              <select
                className="form-control"
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                required
              >
                <option value="">Select a class</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.program} · Year {cls.yearLevel} · Block {cls.block}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="field-label">RECURRING DAYS</label>
              <div className="selection-buttons">
                {weekdays.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    className={
                      days.includes(day.value) ? "btn primary" : "btn secondary"
                    }
                    onClick={() => toggleDay(day.value)}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="field-label">START TIME</label>
                <input
                  className="form-control"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="field-label">END TIME</label>
                <input
                  className="form-control"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="field-label">EFFECTIVE FROM</label>
                <input
                  className="form-control"
                  type="date"
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="field-label">
                  EFFECTIVE UNTIL (OPTIONAL)
                </label>
                <input
                  className="form-control"
                  type="date"
                  value={effectiveUntil}
                  onChange={(e) => setEffectiveUntil(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn primary"
              disabled={busy || availableRooms.length === 0}
            >
              <Plus size={16} />
              {busy ? "Saving..." : "Create Regular Schedule"}
            </button>
          </form>
        )}
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">02 / EXISTING SCHEDULES</span>
            <h2>Manage regular schedules</h2>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">Loading schedules...</div>
        ) : schedules.length === 0 ? (
          <div className="empty-state">
            <CalendarDays size={26} />
            <strong>No regular schedules yet</strong>
            <span>Create a recurring schedule using the form above.</span>
          </div>
        ) : (
          <div className="invitation-list">
            {schedules.map((schedule) => (
              <article className="member-row" key={schedule.id}>
                <span className="avatar">
                  <CalendarDays size={18} />
                </span>

                <span>
                  <strong>
                    {schedule.room.floor.building.name} · Room{" "}
                    {schedule.room.number}
                  </strong>
                  <small>
                    {schedule.class.program} · Year {schedule.class.yearLevel} ·
                    Block {schedule.class.block}
                  </small>
                  <small>
                    {schedule.days
                      .map(
                        (day) =>
                          weekdays.find((item) => item.value === day)?.label,
                      )
                      .filter(Boolean)
                      .join(", ")}
                  </small>
                  <small>
                    {schedule.startTime} – {schedule.endTime}
                  </small>
                  <small>
                    Effective:{" "}
                    {new Date(schedule.effectiveFrom).toLocaleDateString(
                      "en-PH",
                    )}
                    {schedule.effectiveUntil
                      ? ` – ${new Date(
                          schedule.effectiveUntil,
                        ).toLocaleDateString("en-PH")}`
                      : " – No end date"}
                  </small>
                  {schedule.exceptions.length > 0 && (
                    <small>
                      {schedule.exceptions.length} schedule exception(s)
                      recorded
                    </small>
                  )}
                </span>

                <span
                  className={`status ${
                    schedule.active ? "confirmed" : "cancelled"
                  }`}
                >
                  {schedule.active ? "Active" : "Inactive"}
                </span>

                <button
                  type="button"
                  className="btn secondary"
                  disabled={busy}
                  onClick={() => changeScheduleStatus(schedule)}
                >
                  {schedule.active ? "Deactivate" : "Reactivate"}
                </button>

                {schedule.active && (
                  <button
                    type="button"
                    className="btn secondary"
                    disabled={busy}
                    onClick={() => {
                      setExceptionScheduleId(schedule.id);
                      setError("");
                      setMessage("");
                    }}
                  >
                    Cancel one day
                  </button>
                )}
              </article>
            ))}
          </div>
        )}

        {exceptionScheduleId && (
          <form onSubmit={cancelOccurrence} className="form-group">
            <h3>Cancel one schedule occurrence</h3>
            <p className="muted">
              This cancels only the selected date. The recurring schedule
              remains active on its other days.
            </p>

            <label className="field-label">DATE TO CANCEL</label>
            <input
              className="form-control"
              type="date"
              value={exceptionDate}
              onChange={(e) => setExceptionDate(e.target.value)}
              required
            />

            <label className="field-label">REASON (OPTIONAL)</label>
            <input
              className="form-control"
              value={exceptionReason}
              onChange={(e) => setExceptionReason(e.target.value)}
              placeholder="e.g. Professor unavailable"
            />

            <button type="submit" className="btn primary" disabled={busy}>
              {busy ? "Saving..." : "Confirm Cancellation"}
            </button>

            <button
              type="button"
              className="btn secondary"
              onClick={() => {
                setExceptionScheduleId("");
                setExceptionDate("");
                setExceptionReason("");
              }}
            >
              Cancel
            </button>
          </form>
        )}
      </section>
    </>
  );
}

function AdminInvitationsPage() {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [invitations, setInvitations] = useState<InvitationCode[]>([]);
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedBlock, setSelectedBlock] = useState("");
  const [newCode, setNewCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState("");

  // Get the available programs from the database.
  const programs = Array.from(
    new Set(classes.map((cls) => cls.program)),
  ).sort();

  // Show only year levels belonging to the selected program.
  const availableYears = Array.from(
    new Set(
      classes
        .filter((cls) => cls.program === selectedProgram)
        .map((cls) => cls.yearLevel),
    ),
  ).sort((a, b) => a - b);

  // Show only blocks belonging to the selected program and year.
  const availableBlocks = Array.from(
    new Set(
      classes
        .filter(
          (cls) =>
            cls.program === selectedProgram && cls.yearLevel === selectedYear,
        )
        .map((cls) => cls.block),
    ),
  ).sort();

  console.log(
    "All class block values:",
    classes.map((cls) => ({
      program: cls.program,
      year: cls.yearLevel,
      block: cls.block,
    })),
  );

  console.log("Available blocks:", availableBlocks);

  // Find the exact class matching all three selections.
  const selectedClass = classes.find(
    (cls) =>
      cls.program === selectedProgram &&
      cls.yearLevel === selectedYear &&
      cls.block === selectedBlock,
  );

  async function loadInvitations() {
    const result = await api.get<{
      invitations: InvitationCode[];
    }>("/admin/invitation-codes");

    setInvitations(result.invitations);
  }

  useEffect(() => {
    async function load() {
      try {
        const [classData, invitationData] = await Promise.all([
          api.get<ClassInfo[]>("/classes"),
          api.get<{ invitations: InvitationCode[] }>("/admin/invitation-codes"),
        ]);

        setClasses(classData);
        setInvitations(invitationData.invitations);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load invitation management.",
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  async function generateCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");
    setNewCode("");

    if (!selectedClass) {
      setError("Please select a program, year level, and block.");
      return;
    }

    setBusy(true);

    try {
      const result = await api.post<{
        code: string;
        invitation: InvitationCode;
      }>("/admin/invitation-codes", {
        classId: selectedClass.id,
      });

      setNewCode(result.code);
      setMessage("Invitation code generated successfully.");

      await loadInvitations();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to generate invitation code.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function deactivateCode(id: string) {
    if (!window.confirm("Are you sure you want to deactivate this code?")) {
      return;
    }

    setError("");
    setMessage("");
    setDeactivatingId(id);

    try {
      await api.patch(`/admin/invitation-codes/${id}/deactivate`, {});

      setMessage("Invitation code deactivated successfully.");

      await loadInvitations();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to deactivate invitation code.",
      );
    } finally {
      setDeactivatingId("");
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="ADMINISTRATION"
        title="Representative Invitation Codes"
        description="Generate and manage class-specific codes for Representative registration."
      />

      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}

      {message && (
        <div className="alert success" role="status">
          {message}
        </div>
      )}

      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">01 / GENERATE</span>
            <h2>Create an invitation code</h2>
          </div>
        </div>

        <p className="muted">
          Each generated code is assigned to one class and allows up to two
          verified Representative accounts.
        </p>

        {loading ? (
          <div className="loading-state">Loading classes...</div>
        ) : classes.length === 0 ? (
          <div className="empty-state">No classes are available.</div>
        ) : (
          <form onSubmit={generateCode}>
            {/* PROGRAM SELECTION */}
            <div className="form-group">
              <label className="field-label">PROGRAM</label>

              <div className="selection-buttons">
                {programs.map((program) => (
                  <button
                    key={program}
                    type="button"
                    className={
                      selectedProgram === program
                        ? "btn primary"
                        : "btn secondary"
                    }
                    onClick={() => {
                      setSelectedProgram(program);
                      setSelectedYear(null);
                      setSelectedBlock("");
                      setNewCode("");
                      setMessage("");
                      setError("");
                    }}
                  >
                    {program}
                  </button>
                ))}
              </div>
            </div>

            {/* YEAR LEVEL SELECTION */}
            <div className="form-group">
              <label className="field-label">YEAR LEVEL</label>

              <div className="selection-buttons">
                {[1, 2, 3, 4].map((year) => (
                  <button
                    key={year}
                    type="button"
                    className={
                      selectedYear === year ? "btn primary" : "btn secondary"
                    }
                    disabled={
                      !selectedProgram || !availableYears.includes(year)
                    }
                    onClick={() => {
                      setSelectedYear(year);
                      setSelectedBlock("");
                      setNewCode("");
                      setMessage("");
                      setError("");
                    }}
                  >
                    Year {year}
                  </button>
                ))}
              </div>
            </div>

            {/* BLOCK SELECTION */}
            <div className="form-group">
              <label className="field-label">BLOCK</label>

              <div className="selection-buttons">
                {["A", "B", "C", "D"].map((block) => {
                  const matchingBlock = availableBlocks.find((value) =>
                    value.endsWith(block),
                  );

                  return (
                    <button
                      key={block}
                      type="button"
                      className={
                        selectedBlock === matchingBlock
                          ? "btn primary"
                          : "btn secondary"
                      }
                      disabled={!selectedYear || !matchingBlock}
                      onClick={() => {
                        if (!matchingBlock) return;

                        setSelectedBlock(matchingBlock);
                        setNewCode("");
                        setMessage("");
                        setError("");
                      }}
                    >
                      Block {block}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SELECTED CLASS */}

            {selectedClass && (
              <div className="alert success">
                <strong>Selected Class</strong>
                <p>
                  {selectedClass.program} · Year {selectedClass.yearLevel} ·
                  Block {selectedClass.block}
                </p>
              </div>
            )}

            {/* GENERATE BUTTON */}
            <button
              type="submit"
              className="btn primary"
              disabled={busy || !selectedClass}
            >
              <Plus size={16} />
              {busy ? "Generating..." : "Generate Invitation Code"}
            </button>
          </form>
        )}

        {/* NEW INVITATION CODE */}
        {newCode && (
          <div className="alert success">
            <strong>Your new invitation code:</strong>
            <p>
              <code>{newCode}</code>
            </p>
            <p className="fine-print">
              Save and distribute this code securely. It will not be shown again
              after you leave or refresh this page.
            </p>
            <button
              type="button"
              className="btn secondary"
              onClick={() => {
                navigator.clipboard.writeText(newCode);
                setMessage("Invitation code copied to clipboard.");
              }}
            >
              Copy invitation code
            </button>
          </div>
        )}
      </section>

      {/* EXISTING INVITATION CODES */}
      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">02 / MANAGEMENT</span>
            <h2>Existing invitation codes</h2>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">Loading invitation codes...</div>
        ) : invitations.length === 0 ? (
          <div className="empty-state">
            <ClipboardList size={26} />
            <strong>No invitation codes yet</strong>
            <span>Generate your first class invitation code above.</span>
          </div>
        ) : (
          <div className="invitation-list">
            {invitations.map((invitation) => (
              <article className="member-row" key={invitation.id}>
                <span className="avatar">
                  <GraduationCap size={18} />
                </span>

                <span>
                  <strong>
                    {invitation.class.program} · Year{" "}
                    {invitation.class.yearLevel}
                  </strong>
                  <small>Block {invitation.class.block}</small>
                  <small>
                    Usage: {invitation.usedCount}/{invitation.maxUses}
                  </small>
                  <small>
                    Created:{" "}
                    {new Date(invitation.createdAt).toLocaleDateString("en-PH")}
                  </small>
                </span>

                <span
                  className={`status ${
                    invitation.active ? "confirmed" : "cancelled"
                  }`}
                >
                  {invitation.active ? "Active" : "Inactive"}
                </span>

                {invitation.active && (
                  <button
                    type="button"
                    className="btn secondary"
                    disabled={deactivatingId === invitation.id}
                    onClick={() => deactivateCode(invitation.id)}
                  >
                    {deactivatingId === invitation.id
                      ? "Deactivating..."
                      : "Deactivate"}
                  </button>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

// --------------------------------------------------
// PROFILE PAGE
// --------------------------------------------------

function ProfilePage() {
  const { user } = useAuth();

  return (
    <>
      <PageHeading
        eyebrow="ACCOUNT SETTINGS"
        title="Your profile"
        description="Your account details and access permissions."
      />

      <section className="panel profile-panel">
        <div className="profile-cover">
          <span className="avatar large">
            {user?.fullName
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")}
          </span>
        </div>

        <div className="profile-details">
          <div>
            <span className="eyebrow">FULL NAME</span>
            <strong>{user?.fullName}</strong>
          </div>

          <div>
            <span className="eyebrow">EMAIL ADDRESS</span>
            <strong>{user?.email}</strong>
          </div>

          <div>
            <span className="eyebrow">ACCOUNT ROLE</span>
            <strong>
              {user?.role === "REPRESENTATIVE"
                ? "Class representative"
                : user?.role === "ADMIN"
                  ? "Administrator"
                  : "Student"}
            </strong>
          </div>

          <div>
            <span className="eyebrow">ASSIGNED CLASSES</span>
            <strong>
              {user?.memberships?.map((m) => m.class.block).join(", ") ||
                "Loading class assignments"}
            </strong>
          </div>
        </div>

        <p className="fine-print">
          Profile editing and password reset are deferred. Contact your
          institution's administrator to update account details.
        </p>
      </section>
    </>
  );
}

// --------------------------------------------------
// MAIN APP EXPORT
// --------------------------------------------------

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refreshCsrf()
      .then(() => api.get<{ user: User }>("/auth/me"))
      .then((result) => setUser(result.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="app-loading">
        <span className="brand-mark">R</span>
        <span>Preparing your campus…</span>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route path="/signup" element={<SignupPage />} />

        <Route
          path="/signup/student"
          element={<RegistrationPage role="STUDENT" />}
        />

        <Route
          path="/signup/representative"
          element={<RegistrationPage role="REPRESENTATIVE" />}
        />

        <Route
          path="/"
          element={
            <Protected>
              <DashboardPage />
            </Protected>
          }
        />

        <Route
          path="/rooms"
          element={
            <Protected>
              <RoomsPage />
            </Protected>
          }
        />

        <Route
          path="/queue"
          element={
            <Protected representative>
              <QueuePage />
            </Protected>
          }
        />

        <Route
          path="/admin/programs"
          element={
            <Protected admin>
              <ProgramsPage />
            </Protected>
          }
        />

        <Route
          path="/admin/buildings"
          element={
            <Protected admin>
              <BuildingsPage />
            </Protected>
          }
        />
        <Route
          path="/admin/schedules"
          element={
            <Protected admin>
              <RegularSchedulesPage />
            </Protected>
          }
        />

        <Route
          path="/admin/invitations"
          element={
            <Protected admin>
              <AdminInvitationsPage />
            </Protected>
          }
        />

        <Route
          path="/classes"
          element={
            <Protected>
              <ClassesPage />
            </Protected>
          }
        />

        <Route
          path="/profile"
          element={
            <Protected>
              <ProfilePage />
            </Protected>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthContext.Provider>
  );
}
