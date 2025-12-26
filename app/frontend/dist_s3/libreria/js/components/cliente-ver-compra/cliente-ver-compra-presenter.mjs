import { Presenter } from "../../commons/presenter.mjs";
import { router } from "../../commons/router.mjs";
import { LibreriaSession } from "../../commons/libreria-session.mjs";
import { mostrarModal } from "../modal/modal.mjs";

const fmt = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export class ClienteVerCompraPresenter extends Presenter {
  constructor(model, fragmentName, parentSelector = "#body") {
    super(model, fragmentName, parentSelector);
  }

  els() {
    const p = this.parentElement;
    return {
      fecha: p.querySelector("#fecha"),
      dni: p.querySelector("#dni"),
      razon: p.querySelector("#razonSocial"),
      dir: p.querySelector("#direccion"),
      email: p.querySelector("#email"),
      body: p.querySelector("#resumeBody"),
      sub: p.querySelector("#resumeSubtotal"),
      iva: p.querySelector("#resumeIva"),
      ivaRate: p.querySelector("#resumeIvaRate"),
      tot: p.querySelector("#resumeTotal"),
      volver: p.querySelector("#volverBtn"),
      pagar: p.querySelector("#pagarBtn"),
    };
  }

  _fmt(n) {
    return `€ ${Number(n).toFixed(2)}`;
  }

  _todayStr() {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
  }

  async _row(it) {
    const libro = await this.model.getLibroPorId(it.libroId);
    const isbn = libro?.isbn ? ` [${libro.isbn}]` : "";
    return `
      <tr>
        <td>${it.cantidad}</td>
        <td>${it.titulo}${isbn}</td>
        <td>${this._fmt(it.precio)}</td>
        <td>${this._fmt(it.subtotal)}</td>
      </tr>
    `;
  }

  async refresh() {
    await super.refresh();

    const user = LibreriaSession.currentUser();
    if (!user || user.rol !== "cliente") {
      mostrarModal("Debes iniciar sesión como cliente para ver tus compras.", "aviso");
      return router.navigate("/libreria/invitado-ingreso.html");
    }

    const E = this.els();
    E.fecha.value = this._todayStr();
    E.dni.value = user.dni ?? "";
    E.email.value = user.email ?? "";

    E.razon.value =
      user.nombres && user.apellidos
        ? `${user.nombres} ${user.apellidos}`
        : user.nombres ?? "";
    E.dir.value = user.direccion ?? "";

    try {
      const cart = await this.model.getCarroCliente(user.id);

      if (cart.items.length === 0) {
        mostrarModal("El carrito está vacío. No hay nada que comprar.", "info");
        return router.navigate("/libreria/cliente-home.html");
      }

      // Render tabla
      E.body.innerHTML = await Promise.all(cart.items.map(async (it) => this._row(it))).then(rows => rows.join(""));
      E.sub.textContent = this._fmt(cart.subtotal);
      E.iva.textContent = this._fmt(cart.iva);
      E.ivaRate.textContent = `(${Math.round(cart.ivaRate * 100)}%)`;
      E.tot.textContent = this._fmt(cart.total);

      // Botones
      E.volver.addEventListener("click", () =>
        router.navigate("/libreria/cliente-carrito.html")
      );

      // Gestionar el pago
      E.pagar.addEventListener("click", async () => {
        const razon = E.razon.value.trim();
        const dir = E.dir.value.trim();
        if (!razon) {
          mostrarModal("Indica la Razón Social.", "aviso");
          return;
        }
        if (!dir) {
          mostrarModal("Indica la Dirección.", "aviso");
          return;
        }

        try {
          // Descontar stock de TODOS los ítems
          for (const it of cart.items) {
            const libro = await this.model.getLibroPorId(it.libroId);
            console.log("Descontando stock libroId=", it.libroId, "stock actual=", libro?.stock, "cantidad=", it.cantidad);
            const nuevoStock = Math.max(0, (libro?.stock ?? 0) - it.cantidad);
            await this.model.updateLibro(it.libroId, { stock: nuevoStock });
          }

          // Crear una factura desde el carrito
          await this.model.facturarCompraCliente({
            userId: user.id,
            meta: {
              razonSocial: razon,
              direccion: dir,
              dni: user.dni ?? "",
              email: user.email ?? "",
            },
          });

          mostrarModal("Compra realizada con éxito.", "ok");
          router.navigate("/libreria/cliente-lista-compras.html");
        } catch (err) {
          console.error(err);
          mostrarModal(err?.message || "Error al procesar la compra.", "error");
        }
      });
    } catch (err) {
      console.error(err);
      mostrarModal("Error al cargar el carrito.", "error");
    }
  }
}
