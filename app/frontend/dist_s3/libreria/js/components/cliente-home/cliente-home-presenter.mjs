import { Presenter } from "../../commons/presenter.mjs";
import { router } from "../../commons/router.mjs";
import { LibreriaSession } from "../../commons/libreria-session.mjs";
import { ClienteCatalogoLibroPresenter } from "../cliente-catalogo-libro/cliente-catalogo-libro-presenter.mjs";
import { mostrarModal } from "../modal/modal.mjs";
export class ClienteHomePresenter extends Presenter {
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

    const catalogo = new ClienteCatalogoLibroPresenter(this.model, "cliente-catalogo-libro", "#body");
    await catalogo.refresh();
  }

logout() {
  // 1) Limpiar sesión
  LibreriaSession.clear();

  // 2) Mensaje (si quieres conservarlo, haz el pushMessage DESPUÉS del clear
  LibreriaSession.pushMessage("Has cerrado sesión correctamente.", "ok");
  mostrarModal("Has cerrado sesión correctamente.", "ok");

  // 3) Romper el shell actual (#body) para que el router monte el del nuevo rol
  const shell = document.querySelector("#body");
  if (shell) {
    shell.remove();
  }

  // 4) Navegar explícitamente al home de invitado
  const guestHome = router.pathForRol("invitado"); // -> "/libreria/index.html"
  router.navigate(guestHome);
}

}
