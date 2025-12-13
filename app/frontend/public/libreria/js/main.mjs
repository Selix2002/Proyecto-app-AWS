import { proxy } from "./model/proxy.mjs";
import { router } from "./commons/router.mjs";
import { LibreriaSession } from "./commons/libreria-session.mjs";

//IMPORTS DEL INVITADO
import { InvitadoHomePresenter } from "./components/invitado-home/invitado-home-presenter.mjs";
import { InvitadoIngresoPresenter } from "./components/invitado-ingreso/invitado-ingreso-presenter.mjs";
import { InvitadoRegistroPresenter } from "./components/invitado-registro/invitado-registro-presenter.mjs";
import { InvitadoVerLibroPresenter } from "./components/invitado-ver-libro/invitado-ver-libro-presenter.mjs";
//IMPORTS DEL CLIENTE
import { ClientePerfilPresenter } from "./components/cliente-perfil/cliente-perfil-presenter.mjs";
import { ClienteCarritoPresenter } from "./components/cliente-carrito/cliente-carrito-presenter.mjs";
import { ClienteVerCompraPresenter } from "./components/cliente-ver-compra/cliente-ver-compra-presenter.mjs";
import { ClienteHomePresenter } from "./components/cliente-home/cliente-home-presenter.mjs";
import { ClienteCatalogoLibroPresenter } from "./components/cliente-catalogo-libro/cliente-catalogo-libro-presenter.mjs";
import { ClienteVerLibroPresenter } from "./components/cliente-ver-libro/cliente-ver-libro-presenter.mjs";
import { ClienteListaComprasPresenter } from "./components/cliente-lista-compras/cliente-lista-compras-presenter.mjs";
import { ClienteVerFacturaPresenter } from "./components/cliente-ver-factura/cliente-ver-factura-presenter.mjs";
//IMPORTS DEL ADMIN
import { AdminHomePresenter } from "./components/admin-home/admin-home-presenter.mjs";
import { AdminCatalogoLibroPresenter } from "./components/admin-catalogo-libro/admin-catalogo-libro-presenter.mjs";
import { AdminVerLibroPresenter } from "./components/admin-ver-libro/admin-ver-libro-presenter.mjs";
import { AdminModificarLibroPresenter } from "./components/admin-modificar-libro/admin-modificar-libro-presenter.mjs";
import { AdminPerfilPresenter } from "./components/admin-perfil/admin-perfil-presenter.mjs";
import { AdminAgregarLibroPresenter } from "./components/admin-agregar-libro/admin-agregar-libro-presenter.mjs";
export function init() {
  LibreriaSession.init();  
  


  //RUTAS HOME
  router.register(/^\/libreria\/index.html$/, new InvitadoHomePresenter(proxy, 'invitado-home'),"invitado");
  router.register(/^\/libreria\/cliente-home.html$/, new ClienteHomePresenter(proxy, 'cliente-home'),"cliente");
  router.register(/^\/libreria\/admin-home.html$/, new AdminHomePresenter(proxy, 'admin-home'),"admin");
  //RUTAS DEL INVITADO
  router.register(/^\/libreria\/invitado-ingreso.html$/, new InvitadoIngresoPresenter(proxy, 'invitado-ingreso'),"invitado");
  router.register(/^\/libreria\/invitado-registro.html$/, new InvitadoRegistroPresenter(proxy, 'invitado-registro'),"invitado");
  router.register(/^\/libreria\/invitado-ver-libro.html/, new InvitadoVerLibroPresenter(proxy, 'invitado-ver-libro'),"invitado");
  //RUTAS DEL CLIENTE
  router.register(/^\/libreria\/cliente-perfil\.html$/, new ClientePerfilPresenter(proxy, 'cliente-perfil'),"cliente");
  router.register(/^\/libreria\/cliente-carrito\.html$/, new ClienteCarritoPresenter(proxy, 'cliente-carrito'),"cliente");
  router.register(/^\/libreria\/cliente-ver-compra\.html$/, new ClienteVerCompraPresenter(proxy, 'cliente-ver-compra'),"cliente");
  router.register(/^\/libreria\/cliente-catalogo-libro.html$/, new ClienteCatalogoLibroPresenter(proxy, 'cliente-catalogo-libro', '#body'),"cliente");
  router.register(/^\/libreria\/cliente-ver-libro.html/,  new ClienteVerLibroPresenter(proxy));
  router.register(/^\/libreria\/cliente-lista-compras\.html$/, new ClienteListaComprasPresenter(proxy, 'cliente-lista-compras'),"cliente");
  router.register(/^\/libreria\/cliente-ver-factura.html/, new ClienteVerFacturaPresenter(proxy));
  //RUTAS DEL ADMIN
  router.register(/^\/libreria\/admin-catalogo-libro.html$/, new AdminCatalogoLibroPresenter(proxy, 'admin-catalogo-libro', '#body'),"admin");
  router.register(/^\/libreria\/admin-ver-libro.html/,  new AdminVerLibroPresenter(proxy),"admin");
  router.register(/^\/libreria\/admin-modificar-libro\.html$/, new AdminModificarLibroPresenter(proxy),"admin");
  router.register(/^\/libreria\/admin-perfil\.html$/, new AdminPerfilPresenter(proxy, 'admin-perfil'),"admin");
  router.register(/^\/libreria\/admin-agregar-libro\.html$/, new AdminAgregarLibroPresenter(proxy),"admin");
  router.handleLocation();
}
