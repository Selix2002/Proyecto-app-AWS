import { Presenter } from "../../commons/presenter.mjs";
import { router } from "../../commons/router.mjs";
import { LibreriaSession } from "../../commons/libreria-session.mjs";
import { mostrarModal } from "../modal/modal.mjs";

export class InvitadoIngresoPresenter extends Presenter {
  constructor(model) {
    super(model, "invitado-ingreso", "#body");
  }

  get form() {
    return this.parentElement.querySelector("#loginForm");
  }
  get emailInput() {
    return this.parentElement.querySelector("#email");
  }
  get passInput() {
    return this.parentElement.querySelector("#password");
  }
  get errorBox() {
    return this.parentElement.querySelector("#loginError");
  }
  get rolValue() {
    return this.parentElement.querySelector("#rol")?.value ?? "";
  }

  async refresh() {
    await super.refresh();

    this.parentElement
      .querySelectorAll("a[href]")
      .forEach((a) => a.addEventListener("click", (e) => router.route(e)));

    this.form.onsubmit = (e) => this.onSubmit(e);
  }

  showError(msg) {
    if (!this.errorBox) return;
    this.errorBox.textContent = msg;
    this.errorBox.hidden = !msg;
  }

  async onSubmit(e) {
    e.preventDefault();

    const rol = this.rolValue; // se espera 'admin' o 'cliente'
    const email = this.emailInput.value.trim().toLowerCase();
    const pass = this.passInput.value;

    if (!rol || !email || !pass) {
      mostrarModal("Por favor, complete todos los campos.", "aviso");
      return;
    }

    try {
      // 1) Autenticación genérica → obtiene { token }
      const { token } = await this.model.autenticar({
        email,
        password: pass,
        rol, // "admin" o "cliente" (el backend espera esto en minúscula)
      });

      if (!token) {
        throw new Error("No se recibió token de autenticación.");
      }

      // 2) Guardar token en sesión
      LibreriaSession.setToken(token);

      // 3) Obtener usuario actual desde el backend usando el token
      const user = await this.model.getUsuarioActual();
      if (!user) {
        throw new Error("No se pudo obtener el usuario actual.");
      }

      // 4) Guardar sesión de usuario
      LibreriaSession.saveUser(user);
      console.log("Usuario autenticado:", user);

      // 5) Redirigir por rol
      const destino =
        user.rol === "admin"
          ? "/libreria/admin-home.html"
          : "/libreria/cliente-home.html";

      mostrarModal("Ingreso exitoso. Redirigiendo...", "ok");
      router.navigate(destino);
    } catch (err) {
      console.error(err);
      const msg = err?.message || "Error al procesar el ingreso.";
      mostrarModal(msg, "error");
      this.showError(msg);
    }
  }
}
