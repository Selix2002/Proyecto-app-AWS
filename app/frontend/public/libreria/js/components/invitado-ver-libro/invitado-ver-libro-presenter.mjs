import { Presenter } from "../../commons/presenter.mjs";


export class InvitadoVerLibroPresenter extends Presenter {
  constructor(model) {
    super(model, "invitado-ver-libro", "#body");
  }
  get searchParams() { return new URLSearchParams(document.location.search); }
  get id() { return this.searchParams.get('id'); }

  async getLibro() {
    if (!this.id) return null;
    try {
      console.log("Presenter: obteniendo libro con id:", this.id);
      const libro = await this.model.getLibroPorId(this.id);
      return libro;
    } catch (err) {
      console.error("Error al obtener libro", err);
      return null;
    }
  }

  set libro(lib) {
    this.isbn = lib.isbn; 
    this.titulo = lib.titulo; 
    this.autores = lib.autores;
    this.resumen = lib.resumen; 
    this.stock = lib.stock; 
    this.precio = lib.precio;
  }
  get isbnParagraph()    { return document.querySelector('#isbnParagraph'); }
  set isbn(v)            { this.isbnParagraph.textContent = v; }
  get tituloParagraph()  { return document.querySelector('#tituloParagraph'); }
  set titulo(v)          { this.tituloParagraph.textContent = v; }
  get autoresParagraph() { return document.querySelector('#autoresParagraph'); }
  set autores(v)         { this.autoresParagraph.textContent = v; }
  get resumenParagraph() { return document.querySelector('#resumenParagraph'); }
  set resumen(v)         { this.resumenParagraph.textContent = v; }
  get precioParagraph()  { return document.querySelector('#precioParagraph'); }
  set precio(v)          { this.precioParagraph.textContent = v; }
  get stockParagraph()   { return document.querySelector('#stockParagraph'); }
  set stock(v)           { this.stockParagraph.textContent = v; }

  async refresh() {
    await super.refresh();
    const libro = await this.getLibro();
    if (libro) {
      this.libro = libro;
      document.querySelector('#verLibroTitulo').textContent = `Título: ${libro.titulo}`;
    } else {
      console.error(`Libro ${this.id} not found!`);
    }
  }
}
