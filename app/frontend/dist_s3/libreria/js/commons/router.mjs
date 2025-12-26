// router.mjs
import { LibreriaSession } from "./libreria-session.mjs";

class Router {
  static _instance;
  routers = [];
  presenters = [];
  routeRoles = []; 

  static get instance() {
    return (Router._instance ??= new Router());
  }

  constructor() {
    window.addEventListener("popstate", () => this.handleLocation());
  }

  /**
   * @param {RegExp} regex  Patrón de la URL
   * @param {object} presenter  Presenter asociado
   * @param {string|null} requiredRole  "admin" | "cliente" | "invitado" | null
   *        null = ruta pública (sin restricción)
   */
  register(regex, presenter, requiredRole = null) {
    this.routers.push(regex);
    this.presenters.push(presenter);
    this.routeRoles.push(requiredRole);
  }

  route(event) {
    event.preventDefault();
    this.navigate(event.currentTarget.href);
  }

  navigate(url) {
    window.history.pushState({}, "", url);
    this.handleLocation();
  }

  get localLocation() {
    return window.location.pathname;
  }

  // Devuelve el índice del presenter actual
  get currentIndex() {
    const url = this.localLocation;
    return this.routers.findIndex((r) => r.test(url));
  }

  get presenter() {
    const index = this.currentIndex;
    return index >= 0 ? this.presenters[index] : null;
  }

  currentRole() {
    try {
      const user = LibreriaSession.currentUser();
      const rol = user?.rol ?? "invitado";
      return rol;
    } catch {
      return "invitado";
    }
  }

  pathForRol(role) {
    switch (role) {
      case "admin":
        return "/libreria/admin-home.html";
      case "cliente":
        return "/libreria/cliente-home.html";
      default:
        return "/libreria/index.html"; // Invitado
    }
  }

  IndexForRol(role) {
    const path = this.pathForRol(role);
    return this.routers.findIndex((r) => r.test(path));
  }

  async ensureShellFor(role) {
    if (document.querySelector("#body")) return;

    const idxShell = this.IndexForRol(role);
    if (idxShell >= 0) {
      await this.presenters[idxShell].refresh(); // Crea #body y layout del rol
    } else {
      const idxGuest = this.IndexForRol("invitado");
      if (idxGuest >= 0) await this.presenters[idxGuest].refresh();
    }
  }

  // -----------------------------------------------------------------

async handleLocation() {
  //Sincroniza auth
  await LibreriaSession.ensureAuthState();

  //Calcula ruta y rol con el estado actualizado
  const idx = this.currentIndex;
  const p = idx >= 0 ? this.presenters[idx] : null;
  const role = this.currentRole();

  // Si no hay presenter para la URL actual, redirige al home según rol
  if (!p) {
    const path = this.pathForRol(role);
    const idxHome = this.IndexForRol(role);

    if (idxHome >= 0) {
      window.history.replaceState({}, "", path);
      await this.presenters[idxHome].refresh();
    }
    return;
  }

  const requiredRole = this.routeRoles[idx];

  if (requiredRole && requiredRole !== role) {
    const fallbackPath = this.pathForRol(role);
    const fallbackIdx = this.IndexForRol(role);

    if (fallbackIdx >= 0) {
      window.history.replaceState({}, "", fallbackPath);
      await this.presenters[fallbackIdx].refresh();
    } else {
      window.history.replaceState({}, "", "/libreria/index.html");
    }
    return;
  }

  if (p.parentSelector === "#body" && !document.querySelector("#body")) {
    await this.ensureShellFor(role);
  }

  await p.refresh();
}

}

export const router = Router.instance;
