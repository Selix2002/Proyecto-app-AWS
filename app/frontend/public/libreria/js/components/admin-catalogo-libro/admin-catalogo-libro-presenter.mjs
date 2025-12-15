import { Presenter } from "../../commons/presenter.mjs";

export class AdminCatalogoLibroPresenter extends Presenter {
  get grid() { return this.parentElement.querySelector('#catalogoGrid'); }

  async refresh() {
    await super.refresh();
    const libros = await this.model.getLibros();
    if(this.grid === null){
      return;
    }
      const grid = this.grid;
    grid.innerHTML = '';

    for (const l of libros) {
      grid.insertAdjacentHTML('beforeend', `
        <article class="card" data-id="${l.id}"> 
          <div class="card-cover"></div>
          <h3 class="card-title">${l.titulo}</h3>
          <p class="card-author">${l.autores}</p>
          <p class="card-price">€ ${l.precio}</p>
          <a class="card-link" href="admin-ver-libro.html?id=${l.id}">Ver</a>
        </article>
      `);
    }
    this.attachAnchors();
  }
}
