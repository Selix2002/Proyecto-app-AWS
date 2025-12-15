import { Presenter } from "../../commons/presenter.mjs";
import { router } from "../../commons/router.mjs";
import { LibreriaSession } from "../../commons/libreria-session.mjs";

const fmtEuro = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

export class ClienteListaComprasPresenter extends Presenter {
  constructor(model) {
    super(model, "cliente-lista-compras", "#body");
  }

  async refresh() {
    await super.refresh();

    const user = LibreriaSession.currentUser();
    if (!user || !user.id) {
      alert("Debes iniciar sesión para ver tu historial.");
      router.navigate("invitado-ingreso.html");
      return;
    }

    try {
      console.log("Cargando historial de compras para el usuario:", user);
      const compras = await this.model.getFacturasPorCliente(user.id);
      const empty = this.parentElement.querySelector('#emptyCompras');
      const table = this.parentElement.querySelector('#tablaCompras');
      const body = this.parentElement.querySelector('#comprasBody');
      const totalCell = this.parentElement.querySelector('#comprasTotal');

      if (!compras.length) {
        empty.hidden = false;
        table.hidden = true;
        return;
      }

      empty.hidden = true;
      table.hidden = false;
      body.innerHTML = '';

      let totalAcum = 0;

      compras.forEach((c, idx) => {
        totalAcum += c.total;
        console.log(c);

        const fecha = (c.fechaISO ?? '').slice(0, 10); 
        const total = fmtEuro.format(c.total);

        body.insertAdjacentHTML(
          'beforeend',
          `
            <tr>
              <td>${idx + 1}</td>
              <td>${fecha}</td>
              <td>${total}</td>
              <td>
                <button class="ver" data-id="${c.id}" title="Ver">Ver</button>
              </td>
            </tr>
          `
        );
      });

      totalCell.textContent = fmtEuro.format(totalAcum);

      body.querySelectorAll('button.ver').forEach(btn => {
        btn.addEventListener('click', () => {
          const compraId = btn.getAttribute('data-id');
          router.navigate(`/libreria/cliente-ver-factura.html?id=${compraId}`);
        });
      });
    } catch (err) {
      console.error("Error al cargar el historial de compras:", err);
      mostrarModal("Error al cargar el historial de compras.", "error");
    }
  }
}
