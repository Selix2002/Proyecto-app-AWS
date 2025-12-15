import { Presenter } from "../../commons/presenter.mjs";

export class InvitadoCatalogoLibroPresenter extends Presenter {

  get grid() {
    return this.parentElement.querySelector('#catalogoGrid');
  }

  async refresh() {
    await super.refresh();

    const libros = await this.model.getLibros();
    console.log("Libros obtenidos:", libros);
    if(this.grid === null) return;
    const g = this.grid;
    g.innerHTML = '';

    for (const l of libros) {
      g.insertAdjacentHTML('beforeend', `
        <article class="card" data-id="${l.id}">
          <div class="card-cover"></div>
          <h3 class="card-title">${l.titulo}</h3>
          <p class="card-author">${l.autores}</p>
          <p class="card-price">€ ${l.precio}</p>
          <a class="card-link" href="invitado-ver-libro.html?id=${l.id}">Ver</a>
        </article>
      `);
    }

    this.attachAnchors(); // mantiene navegación SPA
  }
}
