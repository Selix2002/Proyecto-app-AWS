import { Presenter } from "../../commons/presenter.mjs";
import { router } from "../../commons/router.mjs";
import { LibreriaSession } from "../../commons/libreria-session.mjs";
import { mostrarModal } from "../modal/modal.mjs";  

export class AdminVerLibroPresenter extends Presenter {
  constructor(model) { 
    super(model, "admin-ver-libro", "#body"); 
  }

  get searchParams() { return new URLSearchParams(window.location.search); }
  get libroId() { return this.searchParams.get("id"); }

  async refresh() {
    await super.refresh();

    // Solo admin
    const rol = LibreriaSession.currentUser()?.rol;
    if (rol !== 'admin') {
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

      this.parentElement.querySelector("#verLibroTitulo").textContent = libro.titulo;
      this.parentElement.querySelector("#isbn").textContent = libro.isbn;
      this.parentElement.querySelector("#titulo").textContent = libro.titulo;
      this.parentElement.querySelector("#autores").textContent = libro.autores;
      this.parentElement.querySelector("#resumen").textContent = libro.resumen;
      this.parentElement.querySelector("#stock").textContent = libro.stock;
      this.parentElement.querySelector("#precio").textContent = `€ ${libro.precio}`;

      this.parentElement.querySelectorAll("a[href]")
        .forEach(a => a.addEventListener("click", e => router.route(e)));

      // Botón BORRAR
      const btnDelete = this.parentElement.querySelector("#deleteBook");
      if (btnDelete) {
        btnDelete.addEventListener("click", async () => {
          const ok = window.confirm(`¿Borrar el libro "${libro.titulo}"?\nEsta acción no se puede deshacer.`);
          if (!ok) return;
          try {
            mostrarModal(`Libro "${libro.titulo}" borrado correctamente.`, 'ok');

            await this.model.removeLibro(libro._id);
            
            // Borrar el libro de todos los carritos de los usuarios
            const users = await this.model.getClientes();  // Obtener todos los usuarios
            for (const user of users) {
              try {
                const cart = await this.model.getCarroCliente(user.id); // Obtener carrito del usuario
                const libroIndex = cart.items.findIndex(item => item.libroId === String(libro._id));
                if (libroIndex !== -1) {
                  await this.model.carts.removeClienteCarroItem(user.id, String(libro._id));
                }
              } catch (err) {
                console.error(`Error al borrar el libro del carrito del usuario ${user.id}:`, err);
              }
            }

            router.navigate('/libreria/admin-home.html?tab=libros');
          } catch (err) {
            console.error(err);
            mostrarModal(err?.message || "No se pudo borrar el libro.", "error");
          }
        });
      }

      // Botón EDITAR
      const btnEdit = this.parentElement.querySelector("#editBook");
      if (btnEdit) {
        btnEdit.addEventListener("click", () => {
          router.navigate(`/libreria/admin-modificar-libro.html?id=${encodeURIComponent(libro._id)}`);
        });
      }
    } catch (err) {
      console.error(err);
      mostrarModal("Error al cargar el libro.", "error");
    }
  }
}
