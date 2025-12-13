import { Presenter } from "../../commons/presenter.mjs";
import { router } from "../../commons/router.mjs";
import { LibreriaSession } from "../../commons/libreria-session.mjs";
import { mostrarModal } from "../modal/modal.mjs";

export class AdminAgregarLibroPresenter extends Presenter {
  constructor(model) {
    super(model, "admin-agregar-libro", "#body");
  }

  els() {
    const p = this.parentElement;
    return {
      form:     p.querySelector("#formLibro"),
      isbn:     p.querySelector("#isbn"),
      titulo:   p.querySelector("#titulo"),
      autores:  p.querySelector("#autores"),
      resumen:  p.querySelector("#resumen"),
      stock:    p.querySelector("#stock"),
      precio:   p.querySelector("#precio"),
      limpiar:  p.querySelector("#btnLimpiar"),
      cancelar: p.querySelector("#linkCancelar"),
    };
  }

  _parseInt(v) {
    return Number.parseInt(String(v ?? "").trim(), 10);
  }

  _parseFloat(v) {
    return Number.parseFloat(String(v ?? "").trim());
  }

  _getPayload() {
    const E = this.els();
    return {
      isbn:    E.isbn.value.trim(),
      titulo:  E.titulo.value.trim(),
      autores: E.autores.value.trim(),
      resumen: E.resumen.value.trim(),
      stock:   this._parseInt(E.stock.value),
      precio:  this._parseFloat(E.precio.value),
    };
  }

  _validate({ isbn, titulo, autores, stock, precio }) {
    if (!isbn)    throw new Error("El ISBN es obligatorio.");
    if (!titulo)  throw new Error("El título es obligatorio.");
    if (!autores) throw new Error("Los autores son obligatorios.");
    if (!Number.isFinite(stock) || stock <= 0) throw new Error("Stock inválido.");
    if (!Number.isFinite(precio) || precio <= 0) throw new Error("Precio inválido.");
  }

  async refresh() {
    await super.refresh();

    this.attachAnchors();

    const user = LibreriaSession.currentUser();
    if (!user || user.rol !== "admin") {
      mostrarModal("Debe ser administrador", "aviso");
      return router.navigate("/libreria/invitado-ingreso.html");
    }

    const E = this.els();

    // Submit
    E.form.addEventListener("submit", (ev) => {
      ev.preventDefault();
      this.handleSubmit();
    });

    // Limpiar
    E.limpiar.addEventListener("click", () => {
      E.form.reset();
    });
  }

  async handleSubmit() {
    try {
      const payload = this._getPayload();
      this._validate(payload);

      const nuevo = await this.model.addLibro(payload);

      mostrarModal(`Libro agregado: "${nuevo.titulo}" (stock: ${nuevo.stock}, €${nuevo.precio.toFixed(2)})`, "ok");

      // Limpiar formulario
      this.els().form.reset();

    } catch (err) {
      console.error(err);
      mostrarModal(err?.message || "No se pudo guardar el libro.", "error");
    }
  }
}
