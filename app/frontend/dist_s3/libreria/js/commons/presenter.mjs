import { router } from "./router.mjs";

export class Presenter {
  static BASE = "/libreria/js/components";
  static DEFAULT_PARENT = "main";

  constructor(model, view, parentSelector) {
    this.model = model;
    this.view = view;
    this.parentSelector = parentSelector ?? Presenter.DEFAULT_PARENT;
    this.html = null;
  }

  get viewURL() {
    return `${Presenter.BASE}/${this.view}/${this.view}-presenter.html`;
  }

  async loadHTML() {
    const res = await fetch(this.viewURL);
    if (!res.ok) throw new Error(`${this.view} not found!`);
    this.html = await res.text();
    return this.html;
  }

  async getHTML() {
    return this.html ?? this.loadHTML();
  }

  get parentElement() {
    return document.querySelector(this.parentSelector);
  }

  attachAnchors() {
    this.parentElement.querySelectorAll("a[href]").forEach((a) => {
      a.addEventListener("click", (e) => router.route(e)); // SPA
    });
  }

  async refresh() {
    const parent = this.parentElement;
    if (!parent) {
      throw new Error(
        `${this.view}: no existe ${this.parentSelector} en el shell`
      );
    }
    parent.innerHTML = await this.getHTML();
    this.attachAnchors();
  }
}
