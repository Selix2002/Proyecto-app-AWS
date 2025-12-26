import { Presenter } from "../../commons/presenter.mjs";
import { LibreriaSession } from "../../commons/libreria-session.mjs";
import { router } from "../../commons/router.mjs";
import { mostrarModal } from "../modal/modal.mjs";

export class ClienteCarritoPresenter extends Presenter {
  constructor(model) {
    super(model, "cliente-carrito", "#body");
  }

  get els() {
    const p = this.parentElement;
    return {
      empty: p.querySelector('#emptyMsg'),
      table: p.querySelector('#cartTable'),
      body: p.querySelector('#cartBody'),
      subtotal: p.querySelector('#cartSubtotal'),
      iva: p.querySelector('#cartIva'),
      ivaRate: p.querySelector('#cartIvaRate'),
      total: p.querySelector('#cartTotal'),
      actions: p.querySelector('#cartActions'),
      seguir: p.querySelector('#seguirComprando'),
      checkout: p.querySelector('#checkout'),
    };
  }

  _fmt(n) { return `€ ${Number(n).toFixed(2)}`; }

  _renderRow(it) {
    return `
      <tr data-id="${it.libroId}">
        <td>${it.titulo}<br/><small>Stock: ${it.stock}</small></td>
        <td>${this._fmt(it.precio)}</td>
        <td class="qty">
          <input class="q" type="number" min="1" max="${it.stock}" value="${it.cantidad}" />
        </td>
        <td class="sub">${this._fmt(it.subtotal)}</td>
        <td><button class="rm">Eliminar</button></td>
      </tr>
    `;
  }

  async _bindRowEvents(tr, user) {
    const id = tr.getAttribute('data-id');
    const qInput = tr.querySelector('input.q');
    const btnRm = tr.querySelector('button.rm');

    const refresh = () => this._loadAndRender(user);

    btnRm.addEventListener('click', async () => {
      try {
        await this.model.removeClienteCarroItem(user.id, id);
        refresh();
      } catch (err) {
        console.error(err);
        mostrarModal(`Error al eliminar el libro: ${err.message}`, "error");
      }
    });

    qInput.addEventListener('change', async () => {
      const n = Number(qInput.value);
      try {
        await this.model.setClienteCarroItemCantidad(user.id, id, n);
        refresh();
      } catch (err) {
        console.error(err);
        mostrarModal(`Error al actualizar la cantidad: ${err.message}`, "error");
      }
    });
  }

  async _loadAndRender(user) {
    try {
      const { items, subtotal, iva, total, ivaRate } = await this.model.getCarroCliente(user.id);
      const { empty, table, body, subtotal: subEl, iva: ivaEl, ivaRate: rateEl, total: totEl, actions, checkout } = this.els;


      if (items.length === 0) {
        empty.hidden = false;
        table.hidden = true;
        actions.hidden = true;
        return;
      }

      empty.hidden = true;
      table.hidden = false;
      actions.hidden = false;

      body.innerHTML = items.map(it => this._renderRow(it)).join('');
      body.querySelectorAll('tr').forEach(tr => this._bindRowEvents(tr, user));

      subEl.textContent = this._fmt(subtotal);
      ivaEl.textContent = this._fmt(iva);
      rateEl.textContent = `${Math.round(ivaRate * 100)}%`;
      totEl.textContent = this._fmt(total);
      checkout.disabled = total <= 0;
    } catch (err) {
      return;
    }
  }

  async refresh() {
    await super.refresh();

    const user = LibreriaSession.currentUser();
    if (!user || user.rol === 'invitado') {
      mostrarModal("Debes iniciar sesión para ver el carrito.", "aviso");
      return router.navigate('/libreria/invitado-ingreso.html');
    }

    this._loadAndRender(user);

    this.els.seguir.addEventListener('click', () => router.navigate('/libreria/cliente-home.html'));

    this.els.checkout.addEventListener('click', async () => {
      try {
        await router.navigate('/libreria/cliente-ver-compra.html');
      } catch (err) {
        console.error(err);
        mostrarModal("Error al procesar el pago.", "error");
      }
    });
  }
}
