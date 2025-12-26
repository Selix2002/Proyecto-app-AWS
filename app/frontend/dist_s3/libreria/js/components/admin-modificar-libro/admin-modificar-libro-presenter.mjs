import { Presenter } from "../../commons/presenter.mjs";
import { router } from "../../commons/router.mjs";
import { LibreriaSession } from "../../commons/libreria-session.mjs";
import { mostrarModal } from "../modal/modal.mjs";

export class AdminModificarLibroPresenter extends Presenter {
  constructor(model) {
    super(model, "admin-modificar-libro", "#body");
  }

  get searchParams() { return new URLSearchParams(window.location.search); }
  get libroId() { return this.searchParams.get("id"); }

  get form() { return this.parentElement.querySelector("#editBookForm"); }
  get isbnEl() { return this.parentElement.querySelector("#isbn"); }
  get titEl() { return this.parentElement.querySelector("#titulo"); }
  get autEl() { return this.parentElement.querySelector("#autores"); }
  get resEl() { return this.parentElement.querySelector("#resumen"); }
  get stkEl() { return this.parentElement.querySelector("#stock"); }
  get preEl() { return this.parentElement.querySelector("#precio"); }

  async refresh() {
    await super.refresh();

    const rol = LibreriaSession.currentUser()?.rol;
    if (rol !== "admin") {
      mostrarModal("Debe ser administrador", "aviso");
      router.navigate("/libreria/invitado-ingreso.html");
      return;
    }

    try {
      const libro = await this.model.getLibroPorId(this.libroId);
      if (!libro) {
        mostrarModal("Libro no encontrado.", "error");
        return;
      }

      this.isbnEl.value = libro.isbn ?? "";
      this.titEl.value = libro.titulo ?? "";
      this.autEl.value = libro.autores ?? "";
      this.resEl.value = libro.resumen ?? "";
      this.stkEl.value = String(libro.stock ?? 0);
      this.preEl.value = String(libro.precio ?? 0);

      this.parentElement.querySelectorAll("a[href]")
        .forEach(a => a.addEventListener("click", e => router.route(e)));

      const cancelBtn = this.parentElement.querySelector("#cancelEdit");
      if (cancelBtn) {
        cancelBtn.addEventListener("click", () => {
          router.navigate(`/libreria/admin-ver-libro.html?id=${encodeURIComponent(libro.id)}`);
        });
      }

      // Manejo del submit del formulario
      this.form.addEventListener("submit", (e) => this.onSubmit(e, libro.id));
    } catch (err) {
      console.error(err);
      mostrarModal("Error al cargar el libro.", "error");
    }
  }

  async onSubmit(e, id) {
    e.preventDefault();

    // Validación
    const stock = Number(this.stkEl.value);
    const precio = Number(this.preEl.value);

    try {
      if (!this.titEl.value.trim()) throw new Error("El título es obligatorio.");
      if (Number.isNaN(stock) || stock <= 0) throw new Error("Stock inválido.");
      if (Number.isNaN(precio) || precio <= 0) throw new Error("Precio inválido.");
      if (!this.autEl.value.trim()) throw new Error("Los autores son obligatorios.");
      if (!this.isbnEl.value.trim()) throw new Error("El ISBN es obligatorio.");
    } catch (err) {
      mostrarModal(err?.message || "Error en el formulario.", "error");
      return;
    }

    try {
      const patch = {
        isbn: this.isbnEl.value.trim(),
        titulo: this.titEl.value.trim(),
        autores: this.autEl.value.trim(),
        resumen: this.resEl.value.trim(),
        stock,
        precio
      };
      console.log("Actualizando libro con datos:", patch);
      await this.model.updateLibro(id, patch);

      LibreriaSession.pushMessage("Libro actualizado correctamente.", "ok");
      mostrarModal("Libro actualizado correctamente.", "ok");
      router.navigate(`/libreria/admin-ver-libro.html?id=${encodeURIComponent(id)}`);
    } catch (err) {
      console.error(err);
      mostrarModal(err?.message || "No se pudo actualizar el libro.", "error");
    }
  }
}
