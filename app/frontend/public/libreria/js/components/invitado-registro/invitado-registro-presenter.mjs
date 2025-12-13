import { Presenter } from "../../commons/presenter.mjs";
import { router } from "../../commons/router.mjs";
import { mostrarModal } from "../modal/modal.mjs";

export class InvitadoRegistroPresenter extends Presenter {
  constructor(model) {
    super(model, "invitado-registro", "#body");
  }

  async refresh() {
    await super.refresh();
    const form = this.parentElement.querySelector("#registerForm");

    // Para evitar múltiples listeners si el presenter se refresca varias veces
    form.onsubmit = async (e) => {
      e.preventDefault();
      const val = (id) => form.querySelector("#" + id).value.trim();

      const data = {
        dni:       val("dni"),
        nombres:   val("nombres"),
        apellidos: val("apellidos"),
        direccion: val("direccion"),
        telefono:  val("telefono"),
        email:     val("email"),
        password:  form.querySelector("#password").value,
        rol:       form.querySelector("#rol").value, // "admin" | "cliente"
      };
      const pw2 = form.querySelector("#password2").value;

      if (data.password !== pw2) {
        mostrarModal("Las contraseñas no coinciden", "error");
        return;
      }

      try {
        // 1) Registro (signup)
        //    El backend se encarga de encriptar password y fijar rol (cliente/admin)
        const userCreado = await this.model.signupUsuario(data);
        console.log("Usuario creado:", userCreado);
        mostrarModal("Registro exitoso. Bienvenido/a!", "ok");
        router.navigate("/libreria/index.html");
      } catch (err) {
        console.error(err);
        mostrarModal(
          err?.message || "No se pudo completar el registro.",
          "error"
        );
      }
    };
  }
}
