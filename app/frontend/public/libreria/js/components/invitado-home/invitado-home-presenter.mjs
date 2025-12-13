import { Presenter } from "../../commons/presenter.mjs";
import { InvitadoCatalogoLibroPresenter } from "../invitado-catalogo-libro/invitado-catalogo-libro-presenter.mjs";
export class InvitadoHomePresenter extends Presenter {
    constructor(model) {
    super(model, "invitado-home", "main"); // el shell se monta en <main>
  }
  async refresh() {
    //Inserta el HTML de la vista (crea #leftMenu y #body)
    await super.refresh();

    //Renderiza el contenido principal (Body)
    this.renderCatalogo();
  }


  async renderCatalogo() {
    // Carga el presenter del catálogo
    const catalogoPresenter = new InvitadoCatalogoLibroPresenter(this.model, 'invitado-catalogo-libro', '#body');
    await catalogoPresenter.refresh();
  }
}
