import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  HashRouter,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import "./style.css";

// Application configuration
const API_URL = import.meta.env.DEV
  ? "http://localhost:3000"
  : window.location.origin;

const resources = {
  articles: {
    label: "Articles",
    endpoint: "/articles",
    fields: [
      ["title", "Title"],
      ["description", "Description"],
      ["link", "Article link"],
      ["user", "Published by"],
      ["channel", "Channel"],
    ],
  },
  channels: {
    label: "Channels",
    endpoint: "/channels",
    fields: [
      ["name", "Channel name"],
      ["description", "Description"],
      ["channelBio", "Channel bio"],
      ["user", "Owner"],
    ],
  },
  categories: {
    label: "Categories",
    endpoint: "/categories",
    fields: [
      ["name", "Category name"],
      ["description", "Description"],
    ],
  },
  "category-channels": {
    label: "Category Channels",
    endpoint: "/category-channels",
    fields: [
      ["category", "Category"],
      ["channel", "Channel"],
      ["user", "Linked by"],
    ],
    requiresLogin: true,
  },
};

// Authentication and API helpers
function getToken() {
  return localStorage.getItem("crud3-token");
}

async function api(path, options = {}) {
  const token = getToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      data.message || `Request failed with status ${response.status}`,
    );
  return data;
}

// Main application layout
function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const currentPath = location.pathname.split("/")[1] || "articles";

  useEffect(() => {
    if (!getToken()) return;
    api("/users/me")
      .then((data) => setUser(data.user))
      .catch(() => {
        localStorage.removeItem("crud3-token");
        setUser(null);
      });
  }, []);

  function signOut() {
    localStorage.removeItem("crud3-token");
    setUser(null);
    navigate("/articles");
  }

  function handleLogin(nextUser) {
    setUser(nextUser);
    setAuthOpen(false);
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <NavLink className="brand" to="/articles">
          <span className="brand-mark">C</span>
          <span>
            Common
            <br />
            <em>Ground</em>
          </span>
        </NavLink>
        <p className="eyebrow">Workspace</p>
        <nav className="nav" aria-label="Workspace navigation">
          <div className="workflow-guide">
            <NavLink to="/categories" className="workflow-step">
              <span className="step-number">1</span>
              <span>Create Category</span>
            </NavLink>
            <span className="workflow-arrow">↓</span>
            <NavLink to="/channels" className="workflow-step">
              <span className="step-number">2</span>
              <span>Create Channel</span>
            </NavLink>
            <span className="workflow-arrow">↓</span>
            <NavLink to="/category-channels" className="workflow-step">
              <span className="step-number">3</span>
              <span>Create CategoryChannel link</span>
            </NavLink>
            <span className="workflow-arrow">↓</span>
            <NavLink to="/articles" className="workflow-step">
              <span className="step-number">4</span>
              <span>Create Article using a Channel</span>
            </NavLink>
          </div>
          <NavItem to="/profiles" icon="□">
            Profiles
          </NavItem>
        </nav>
        <div className="sidebar-bottom">
          <p className="eyebrow">API status</p>
          <p className="status">
            <i /> MongoDB API connected
          </p>
          {user && (
            <p className="signed-in-as">
              {user.name}
            </p>
          )}
        </div>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Community data workspace</p>
            <h1>
              {currentPath === "profiles"
                ? "Profile"
                : resources[currentPath]?.label || "Common Ground"}
            </h1>
          </div>
          <div className="top-actions">
            {user ? (
              <button className="header-button" onClick={signOut}>
                Sign out
              </button>
            ) : (
              <>
                <button
                  className="header-button"
                  onClick={() => setAuthOpen("login")}
                >
                  Sign in
                </button>
                <button
                  className="register-button header-register"
                  onClick={() => setAuthOpen("register")}
                >
                  Register
                </button>
              </>
            )}
          </div>
        </header>
        <Routes>
          <Route
            path="/"
            element={
              <CollectionPage
                resourceKey="articles"
                user={user}
                onSignIn={() => setAuthOpen(true)}
              />
            }
          />
          <Route
            path="/profiles"
            element={
              <ProfilePage user={user} onSignIn={() => setAuthOpen(true)} />
            }
          />
          {Object.keys(resources)
            .filter((key) => key !== "profiles")
            .map((key) => (
              <Route
                key={key}
                path={`/${key}`}
                element={
                  <CollectionPage
                    resourceKey={key}
                    user={user}
                    onSignIn={() => setAuthOpen(true)}
                  />
                }
              />
            ))}
          <Route
            path="*"
            element={
              <CollectionPage
                resourceKey="articles"
                user={user}
                onSignIn={() => setAuthOpen(true)}
              />
            }
          />
        </Routes>
      </main>
      {authOpen && (
        <AuthModal
          initialMode={authOpen}
          onClose={() => setAuthOpen(false)}
          onLogin={handleLogin}
        />
      )}
    </div>
  );
}

// A reusable navigation link used by the sidebar.
function NavItem({ to, icon, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
    >
      <span>{icon}</span>
      {children}
    </NavLink>
  );
}

// MongoDB collection page
function CollectionPage({ resourceKey, user, onSignIn }) {
  const resource = resources[resourceKey];
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError("");
    api(resource.endpoint)
      .then((data) => setItems(data[resourceKey] || data.links || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [resourceKey, user]);

  const canCreate = Boolean(user);

  return (
    <>
      <section className="welcome">
        <div>
          <span className="sun">✦</span>
          <p className="eyebrow">MongoDB collection</p>
          <h2>
            Manage your
            <br />
            <strong>{resource.label.toLowerCase()}.</strong>
          </h2>
          <p>
            Live records loaded from MongoDB with populated relationship names.
          </p>
        </div>
        <div className="welcome-art">
          <span>“</span>
          <span>“</span>
          <span>“</span>
        </div>
      </section>
      <div className="toolbar">
        <div>
          <p className="eyebrow">{resource.label}</p>
          <h2 className="section-title">{items.length} records</h2>
        </div>
        {canCreate && (
          <button className="primary-button" onClick={() => setFormOpen(true)}>
            ＋ Add {resource.label.replace(/s$/, "").toLowerCase()}
          </button>
        )}
      </div>
      {loading && (
        <div className="empty-state">
          <span className="loader" />
          <p>Fetching {resource.label.toLowerCase()} from MongoDB...</p>
        </div>
      )}
      {!loading && error && (
        <ErrorState
          error={error}
          requiresLogin={resource.requiresLogin}
          user={user}
          onSignIn={onSignIn}
        />
      )}
      {!loading && !error && (
        <DataGrid
          resourceKey={resourceKey}
          fields={resource.fields}
          items={items}
        />
      )}
      {formOpen && (
        <CreateModal
          resourceKey={resourceKey}
          onClose={() => setFormOpen(false)}
          onCreated={() => window.location.reload()}
        />
      )}
    </>
  );
}

// Profile and relationship page
function ProfilePage({ user, onSignIn }) {
  const [profile, setProfile] = useState(null);
  const [related, setRelated] = useState({
    articles: [],
    channels: [],
    categories: [],
    links: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    Promise.all([
      api("/profile/me"),
      api("/articles"),
      api("/channels"),
      api("/categories"),
      api("/category-channels"),
    ])
      .then(([profileData, articles, channels, categories, links]) => {
        const userId = profileData.profile.user?._id;
        setProfile(profileData.profile);
        setRelated({
          articles: (articles.articles || []).filter(
            (item) => item.user?._id === userId,
          ),
          channels: (channels.channels || []).filter(
            (item) => item.user?._id === userId,
          ),
          categories: categories.categories || [],
          links: (links.links || []).filter(
            (item) => item.user?._id === userId,
          ),
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user)
    return (
      <ErrorState
        error="Sign in to view your profile and related data."
        requiresLogin
        user={user}
        onSignIn={onSignIn}
      />
    );
  if (loading)
    return (
      <div className="empty-state">
        <span className="loader" />
        <p>Fetching your profile and relationships...</p>
      </div>
    );
  if (error)
    return <ErrorState error={error} user={user} onSignIn={onSignIn} />;
  if (!profile)
    return (
      <div className="empty-state">
        <span className="empty-icon">○</span>
        <h3>No profile found</h3>
        <p>Create a profile to see your complete workspace.</p>
      </div>
    );

  return (
    <section className="profile-page">
      <div className="profile-header">
        <span className="profile-avatar">{profile.user?.name?.[0] || "?"}</span>
        <div>
          <p className="eyebrow">Profile</p>
          <h2>{profile.user?.name}</h2>
          <p>{profile.user?.email}</p>
        </div>
      </div>
      <div className="profile-details">
        <Info label="Address" value={profile.address} />
        <Info label="Phone" value={profile.phone} />
        <Info label="City" value={profile.city} />
        <Info label="Country" value={profile.country} />
      </div>
      <div className="profile-columns">
        <RelationList
          title="Channels"
          items={related.channels.map((item) => item.name)}
        />
        <RelationList
          title="Articles"
          items={related.articles.map((item) => item.title)}
        />
        <RelationList
          title="Categories"
          items={related.categories.map((item) => item.name)}
        />
        <RelationList
          title="Category Channels"
          items={related.links.map(
            (item) => `${item.category?.name} → ${item.channel?.name}`,
          )}
        />
      </div>
    </section>
  );
}

// Reusable display components
function Info({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  );
}
function RelationList({ title, items }) {
  return (
    <div className="relation-list">
      <p className="eyebrow">{title}</p>
      {items.length ? (
        <ul>
          {items.map((item, index) => (
            <li key={`${item}-${index}`}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="muted">No related records</p>
      )}
    </div>
  );
}
function ErrorState({ error, requiresLogin, user, onSignIn }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">!</span>
      <h3>
        {requiresLogin && !user ? "Sign in required" : "Could not load data"}
      </h3>
      <p>{error}</p>
      {requiresLogin && !user && (
        <button className="primary-button" onClick={onSignIn}>
          Sign in
        </button>
      )}
    </div>
  );
}
function populatedValue(value) {
  if (!value) return "—";
  if (typeof value !== "object") return value;
  return value.name || value.email || value.title || value._id || "—";
}
function DataGrid({ resourceKey, fields, items }) {
  if (!items.length)
    return (
      <div className="empty-state">
        <span className="empty-icon">○</span>
        <h3>No records yet</h3>
        <p>This MongoDB schema is ready for its first entry.</p>
      </div>
    );
  return (
    <div className="data-grid">
      {items.map((item) => (
        <article className="data-card" key={item._id}>
          <div className="card-top">
            <span className="tag">{resourceKey}</span>
            <span className="record-id">ID: {item._id?.slice(-6)}</span>
          </div>
          <h3>
            {item.title ||
              item.name ||
              item.user?.name ||
              item.category?.name ||
              "Record"}
          </h3>
          {fields.map(([field, label]) => (
            <div className="data-row" key={field}>
              <span>{label}</span>
              <strong>{populatedValue(item[field])}</strong>
            </div>
          ))}
        </article>
      ))}
    </div>
  );
}

// Login and registration modal
function AuthModal({ initialMode = "login", onClose, onLogin }) {
  const [register, setRegister] = useState(initialMode === "register");
  const [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.target));
    try {
      const data = await api(register ? "/register" : "/login", {
        method: "POST",
        body: JSON.stringify({
          ...form,
        }),
      });
      localStorage.setItem("crud3-token", data.token);
      const me = await api("/users/me");
      onLogin(me.user);
    } catch (err) {
      setError(err.message);
    }
  }
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <button className="close-button" onClick={onClose}>
          ×
        </button>
        <p className="eyebrow">Account</p>
        <h2>{register ? "Join the workspace." : "Welcome back."}</h2>
        <form onSubmit={submit}>
          {register && (
            <>
              <label>
                Name
                <input name="name" required minLength="3" />
              </label>
              <label>
                Address
                <input name="address" required minLength="3" />
              </label>
              <label>
                Phone
                <input name="phone" required minLength="10" maxLength="15" />
              </label>
              <label>
                City
                <input name="city" required minLength="2" />
              </label>
              <label>
                Country
                <input name="country" required minLength="2" />
              </label>
            </>
          )}
          <label>
            Email
            <input name="email" type="email" required />
          </label>
          <label>
            Password
            <input name="password" type="password" minLength="8" required />
          </label>
          <button className="primary-button full">
            {register ? "Create account and profile" : "Sign in"}
          </button>
          <p className="form-switch">
            {register ? "Already registered?" : "New here?"}{" "}
            <button type="button" onClick={() => setRegister(!register)}>
              {register ? "Sign in" : "Create an account"}
            </button>
          </p>
          <p className="form-error">{error}</p>
        </form>
      </div>
    </div>
  );
}

// Create-record modal
function CreateModal({ resourceKey, onClose, onCreated }) {
  const resource = resources[resourceKey];
  const [error, setError] = useState("");
  const [options, setOptions] = useState({ categories: [], channels: [] });
  useEffect(() => {
    if (resourceKey === "category-channels") {
      Promise.all([api("/categories"), api("/channels")])
        .then(([categories, channels]) =>
          setOptions({
            categories: categories.categories || [],
            channels: channels.channels || [],
          }),
        )
        .catch((err) => setError(err.message));
    } else if (resourceKey === "articles") {
      api("/channels")
        .then((channels) =>
          setOptions((currentOptions) => ({
            ...currentOptions,
            channels: channels.channels || [],
          })),
        )
        .catch((err) => setError(err.message));
    }
  }, [resourceKey]);
  async function submit(event) {
    event.preventDefault();
    try {
      await api(resource.createEndpoint || resource.endpoint, {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(new FormData(event.target))),
      });
      onCreated();
    } catch (err) {
      setError(err.message);
    }
  }
  function control(field, label) {
    if (resourceKey === "articles" && field === "channel") {
      return (
        <label key={field}>
          {label}
          <select name={field} required>
            <option value="">Select a channel</option>
            {options.channels.map((channel) => (
              <option value={channel._id} key={channel._id}>
                {channel.name}
              </option>
            ))}
          </select>
        </label>
      );
    }
    if (
      resourceKey === "category-channels" &&
      (field === "category" || field === "channel")
    ) {
      const list = field === "category" ? options.categories : options.channels;
      return (
        <label key={field}>
          {label}
          <select name={field} required>
            <option value="">Select {label.toLowerCase()}</option>
            {list.map((item) => (
              <option value={item._id} key={item._id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      );
    }
    return (
      <label key={field}>
        {label}
        <textarea
          name={field}
          required
          minLength={field === "link" ? undefined : 3}
        />
      </label>
    );
  }
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <button className="close-button" onClick={onClose}>
          ×
        </button>
        <p className="eyebrow">Create MongoDB record</p>
        <h2>New {resource.label.replace(/s$/, "").toLowerCase()}.</h2>
        <form onSubmit={submit}>
          {resource.fields
            .filter(([field]) => field !== "user")
            .map(([field, label]) => control(field, label))}
          <button className="primary-button full">Save record</button>
          <p className="form-error">{error}</p>
        </form>
      </div>
    </div>
  );
}

// Start the React application
createRoot(document.querySelector("#app")).render(
  <StrictMode>
    <HashRouter>
      <Layout />
    </HashRouter>
  </StrictMode>,
);
