import { Presenter } from "../../commons/presenter.mjs";
import { router } from "../../commons/router.mjs";
import { LibreriaSession } from "../../commons/libreria-session.mjs";
import { AdminCatalogoLibroPresenter } from "../admin-catalogo-libro/admin-catalogo-libro-presenter.mjs";
import { mostrarModal } from "../modal/modal.mjs";
export class AdminHomePresenter extends Presenter {
  async refresh() {
    await super.refresh();

    this.parentElement.querySelectorAll('#leftMenu a[href]')
      .forEach(a => a.addEventListener('click', e => router.route(e)));

    const logoutLink = this.parentElement.querySelector('#logoutLink');
    if (logoutLink) {
      logoutLink.addEventListener('click', e => {
        e.preventDefault();
        this.logout();
      });
    }

    // Renderizar catálogo
    const catalogo = new AdminCatalogoLibroPresenter(this.model, "admin-catalogo-libro", "#body");
    await catalogo.refresh();
  }

  logout() {
    LibreriaSession.pushMessage('Has cerrado sesión correctamente.', 'ok');
    LibreriaSession.clear();           // Elimina sesion
    mostrarModal("Has cerrado sesión correctamente.", "ok");
    router.navigate("index.html");     // Redirige al modo invitado
  }
}
