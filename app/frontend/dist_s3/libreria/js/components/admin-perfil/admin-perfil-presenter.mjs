import { Presenter } from "../../commons/presenter.mjs";
import { LibreriaSession } from "../../commons/libreria-session.mjs";
import { router } from "../../commons/router.mjs";
import { mostrarModal } from "../modal/modal.mjs";

export class AdminPerfilPresenter extends Presenter {
  constructor(model, fragmentName, parentSelector = '#body') {
    super(model, fragmentName, parentSelector);
  }

  get form() { return this.parentElement.querySelector('#perfilForm'); }
  getInput(id) { return this.form.querySelector('#' + id); }

  fill(u) {
    this.getInput('dni').value = u.dni ?? '';
    this.getInput('email').value = u.email ?? '';
    this.getInput('nombres').value = u.nombres ?? '';
    this.getInput('apellidos').value = u.apellidos ?? '';
    this.getInput('direccion').value = u.direccion ?? '';
    this.getInput('telefono').value = u.telefono ?? '';
    this.getInput('password').value = '';
    this.getInput('rol').value = (u.rol ?? '').toUpperCase();
  }

  async refresh() {
    await super.refresh();

    const user = LibreriaSession.currentUser();
    if (!user || user.rol !== 'admin') {
      mostrarModal("Debe estar logueado como administrador.", "aviso");
      return router.navigate('/libreria/invitado-ingreso.html');
    }

    this.fill(user);

    this.form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const patch = {
        dni: this.getInput('dni').value.trim(),
        email: this.getInput('email').value.trim(),
        nombres: this.getInput('nombres').value.trim(),
        apellidos: this.getInput('apellidos').value.trim(),
        direccion: this.getInput('direccion').value.trim(),
        telefono: this.getInput('telefono').value.trim(),
      };
      const newPassword = this.getInput('password').value.trim();
      if (newPassword) {
        // solo si el usuario escribió algo, lo mandamos
        patch.password = newPassword;
      }

      try {
        const updated = await this.model.updateAdmin(user.id, patch);

        LibreriaSession.saveUser(updated);

        mostrarModal("Perfil actualizado correctamente.", "ok");
        this.fill(LibreriaSession.currentUser());
      } catch (err) {
        mostrarModal(err?.message || "No se pudo actualizar el perfil.", "error");
      }
    });
  }
}
