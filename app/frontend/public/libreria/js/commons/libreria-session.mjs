import { proxy } from "../model/proxy.mjs";
import { mostrarModal } from "../components/modal/modal.mjs";

// Persistencia mínima de sesión y mensajes (RNF)
const SESSION_KEY = "libreria_session";
const MESSAGES_KEY = "libreria_messages";
// 👉 Nuevo: clave para el token JWT en sessionStorage
const TOKEN_KEY = "libreria_token";

export const LibreriaSession = {
  _user: undefined,

  init() {
    this._user = this.readUser();

    // Sincroniza cambios entre pestañas (solo sesión de usuario)
    window.addEventListener("storage", (e) => {
      if (e.key === SESSION_KEY) {
        this._user = this.readUser();
      }
    });
  },

  // Lector desde localStorage (sesión de usuario)
  readUser() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      const sess = raw ? JSON.parse(raw) : null;
      return sess?.user ?? null;
    } catch {
      console.log("LibreriaSession: error leyendo usuario de localStorage");
      return null;
    }
  },

  saveUser(user) {
    const sess = {
      user: user
        ? {
            id: user._id ?? user.id,
            dni: user.dni,
            nombres: user.nombres,
            apellidos: user.apellidos,
            direccion: user.direccion,
            telefono: user.telefono,
            rol: user.rol,
            email: user.email,
          }
        : null,
    };
    this._user = sess.user;
    try {
      if (sess.user) localStorage.setItem(SESSION_KEY, JSON.stringify(sess));
      else localStorage.removeItem(SESSION_KEY);
    } catch {
      throw new Error(
        "LibreriaSession: error guardando session en localStorage"
      );
    }

    // opcional: limpiar cualquier rastro viejo de sesión en sessionStorage
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      throw new Error("LibreriaSession: error limpiando sessionStorage");
    }
  },

  currentUser() {
    if (this._user === undefined) this._user = this.readUser();
    return this._user; // Puede ser null si no hay sesión
  },

  // 👉 Nuevo: helper para saber si hay usuario
  isAuthenticated() {
    return !!this.currentUser();
  },

  // 👉 Nuevo: manejar el token JWT en sessionStorage
  getToken() {
    try {
      return sessionStorage.getItem(TOKEN_KEY) || null;
    } catch {
      console.error("LibreriaSession: error leyendo token de sessionStorage");
      return null;
    }
  },

  setToken(token) {
    try {
      if (token) {
        sessionStorage.setItem(TOKEN_KEY, token);
      } else {
        sessionStorage.removeItem(TOKEN_KEY);
      }
    } catch {
      console.error("LibreriaSession: error guardando token en sessionStorage");
    }
  },

  // 👉 NUEVO: decodificar el JWT (solo payload)
  _decodeToken(token) {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return null;
      const payloadB64 = parts[1];
      const json = atob(payloadB64);
      return JSON.parse(json);
    } catch (err) {
      console.warn("LibreriaSession: error decodificando token:", err);
      return null;
    }
  },

  // 👉 NUEVO: revisar si el token está expirado según el campo "exp"
  isTokenExpired(token) {
    const t = token || this.getToken();
    if (!t) return true;

    const payload = this._decodeToken(t);
    if (!payload || !payload.exp) {
      // Si no hay exp, no lo consideramos expirado por cliente
      return false;
    }

    const nowMs = Date.now();
    const expMs = payload.exp * 1000;
    return nowMs >= expMs;
  },

  // 👉 NUEVO: sincronizar token + usuario con el backend
  //  - Si no hay token -> usuario null
  //  - Si el token está expirado -> borra token y usuario
  //  - Si el token parece válido -> consulta /api/usuarios/actual
// 👇 SOLO si NO hay dependencia circular. Si proxy NO importa LibreriaSession,
// puedes hacer este import directo:

async ensureAuthState() {
  const token = this.getToken();

  if (!token) {
    this.saveUser(null);      
    return;
  }

  if (this._user && !this.isTokenExpired(token)) {
    return;
  }

  // 3) Token presente pero expirado según el cliente
  if (this.isTokenExpired(token)) {

    console.warn("[LibreriaSession] Token expirado (cliente). Cerrando sesión.");
    mostrarModal("Tu sesión ha expirado. Por favor, inicia sesión de nuevo.", "aviso");
    this.setToken(null);
    this.saveUser(null);
    return;
  }

  //Validar token contra backend usando el proxy
  try {
    const user = await proxy.getUsuarioActual();
    this.saveUser(user);
  } catch (err) {
    const msg = String(err.message || "");
    if (msg.includes("Error 401:") || msg.includes("Error 403:")) {
      console.warn("[LibreriaSession] Backend rechazó token. Cerrando sesión.");
      this.setToken(null);
      this.saveUser(null);
    } else {
      console.error("[LibreriaSession] Error al sincronizar sesión:", err);
      // Aquí decides: o mantienes el estado actual, o fueras logout duro.
    }
  }
}
,


  clear() {
    this._user = null;
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      console.error("LibreriaSession: error limpiando localStorage");
    }
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      console.error("LibreriaSession: error limpiando sessionStorage");
    }
    try {
      sessionStorage.removeItem(MESSAGES_KEY);
    } catch {
      console.error("LibreriaSession: error limpiando mensajes en sessionStorage");
    }
    try {
      sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      console.error("LibreriaSession: error limpiando token en sessionStorage");
    }
  },

  // ================== MENSAJES ==================

  pushMessage(msg, type = "info") {
    // info | ok | error
    const all = this.loadMessages();
    all.push({ msg, type, ts: Date.now() });
    try {
      sessionStorage.setItem(MESSAGES_KEY, JSON.stringify(all));
    } catch {
      console.error("LibreriaSession: error guardando mensajes en sessionStorage");
    }
  },

  pullMessages() {
    const all = this.loadMessages();
    try {
      sessionStorage.setItem(MESSAGES_KEY, JSON.stringify([]));
    } catch {
      console.error("LibreriaSession: error limpiando mensajes en sessionStorage");
    }
    return all;
  },

  loadSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY));
    } catch {
      return null;
    }
  },

  loadMessages() {
    try {
      const raw = sessionStorage.getItem(MESSAGES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },
};
