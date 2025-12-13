import { Presenter } from "../../commons/presenter.mjs";
import { router } from "../../commons/router.mjs";
import { LibreriaSession } from "../../commons/libreria-session.mjs";

const fmt = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export class ClienteVerFacturaPresenter extends Presenter {
  constructor(model) {
    super(model, "cliente-ver-factura", "#body");
  }

  get params() { return new URLSearchParams(window.location.search); }
  get facturaId() { return this.params.get("id"); }

  els() {
    const p = this.parentElement;
    return {
      fecha:    p.querySelector("#fFecha"),
      dni:      p.querySelector("#fDni"),
      razon:    p.querySelector("#fRazon"),
      dir:      p.querySelector("#fDir"),
      email:    p.querySelector("#fEmail"),
      body:     p.querySelector("#fBody"),
      sub:      p.querySelector("#fSub"),
      iva:      p.querySelector("#fIva"),
      ivaRate:  p.querySelector("#fIvaRate"),
      tot:      p.querySelector("#fTot"),
      volver:   p.querySelector("#volverBtn"),
    };
  }

  async _row(it) {
    const libro = await this.model.getLibroPorId(it.libroId);
    const isbn  = libro?.isbn ? ` [${libro.isbn}]` : "";
    return `
      <tr>
        <td>${it.cantidad}</td>
        <td>${it.titulo}${isbn}</td>
        <td>€ ${fmt.format(it.precio)}</td>
        <td>€ ${fmt.format(it.subtotal)}</td>
      </tr>
    `;
  }

  async refresh() {
    await super.refresh();

    const user = LibreriaSession.currentUser();
    if (!user?.id) {
      alert("Debes iniciar sesión para ver esta factura.");
      return router.navigate("/libreria/invitado-ingreso.html");
    }

    try {
      const f = await this.model.getFacturaPorId(this.facturaId);

      if (!f) {
        this.parentElement.innerHTML = `<p>No se encontró la factura.</p>`;
        return;
      }

      const E = this.els();

      // Cabecera
      E.fecha.value = (f.fechaISO ?? "").slice(0,10);
      E.dni.value   = f.meta?.dni ?? "";
      E.razon.value = f.meta?.razonSocial ?? "";
      E.dir.value   = f.meta?.direccion ?? "";
      E.email.value = f.meta?.email ?? "";

      // Items + totales
      E.body.innerHTML = await Promise.all(f.items.map(async it => this._row(it))).then(rows => rows.join(""));
      E.sub.textContent = `€ ${fmt.format(f.subtotal)}`;
      E.iva.textContent = `€ ${fmt.format(f.iva)}`;
      const ivaRate = (typeof f.ivaRate === 'number') ? f.ivaRate : 0.04;
      E.ivaRate.textContent = `(${Math.round(ivaRate * 100)}%)`;
      E.tot.textContent = `€ ${fmt.format(f.total)}`;

      // Acciones
      E.volver.addEventListener("click", () => router.navigate("/libreria/cliente-lista-compras.html"));
    } catch (err) {
      console.error(err);
      alert("Error al cargar la factura.");
    }
  }
}
