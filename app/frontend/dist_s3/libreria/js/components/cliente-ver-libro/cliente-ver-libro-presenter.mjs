import { Presenter } from "../../commons/presenter.mjs";
import { router } from "../../commons/router.mjs";
import { LibreriaSession } from "../../commons/libreria-session.mjs";
import { mostrarModal } from "../modal/modal.mjs";

export class ClienteVerLibroPresenter extends Presenter {
  constructor(model) {
    super(model, "cliente-ver-libro", "#body");
  }

  get searchParams() {
    return new URLSearchParams(window.location.search);
  }

  get libroId() {
    return this.searchParams.get("id");
  }

  async refresh() {
    await super.refresh();

    const libro = await this.model.getLibroPorId(this.libroId);

    if (!libro) {
      this.parentElement.innerHTML = `<p>Libro no encontrado.</p>`;
      return;
    }

    this.parentElement.querySelector("#verLibroTitulo").textContent = libro.titulo;
    this.parentElement.querySelector("#isbn").textContent = libro.isbn;
    this.parentElement.querySelector("#titulo").textContent = libro.titulo;
    this.parentElement.querySelector("#autores").textContent = libro.autores;
    this.parentElement.querySelector("#resumen").textContent = libro.resumen;
    this.parentElement.querySelector("#stock").textContent = libro.stock;
    this.parentElement.querySelector("#precio").textContent = `€ ${libro.precio}`;

    this.parentElement.querySelectorAll("a[href]").forEach(a =>
      a.addEventListener("click", e => router.route(e))
    );

    // Botón "Agregar al carrito"
    const addBtn = this.parentElement.querySelector("#addCartBtn");
    
    addBtn.addEventListener("click", () => this.agregarAlCarrito(libro));
  }

  async agregarAlCarrito(libro) {
    try {
      const user = LibreriaSession.currentUser();
      console.log("Usuario actual:", user);
      if (!user || !user.id) {
        mostrarModal("Debes iniciar sesión para agregar al carrito.", "aviso");
        router.navigate("invitado-ingreso.html");
        return;
      }

      await this.model.addClienteCarroItem(user.id, libro.id, 1);

      mostrarModal(`"${libro.titulo}" agregado al carrito`, "ok");
      router.navigate("cliente-carrito.html");
    } catch (err) {
      console.error(err);
      mostrarModal(`Error al agregar al carrito: ${err.message}`, "error");
    }
  }
}
