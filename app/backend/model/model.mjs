// src/model/model.mjs

// Importamos los services basados en Mongoose
import { userService } from "./services/userServices.mjs";
import { libroService } from "./services/libroServices.mjs";
import { cartService } from "./services/cartServices.mjs";
import { facturaService } from "./services/facturaServices.mjs";

/**
 * Este objeto `model` mantiene la misma interfaz
 * que el antiguo Modelo (this.libros, this.users, this.carts, this.facturas),
 * pero por detras usa MongoDB a través de los services.
 */

export const model = {
  // ----------------- Usuarios -----------------
  users: {
    findByEmail(email) {
      return userService.findByEmail(email);
    },

    findByEmailAndRole(email, rol) {
      return userService.findByEmailAndRole(email, rol);
    },

    findByDni(dni) {
      return userService.findByDni(dni);
    },

    getById(id) {
      return userService.getById(id);
    },

    addUser(data) {
      return userService.addUser(data);
    },

    validate(email, password, rol) {
      return userService.validate(email, password, rol);
    },

    updateUser(id, patch) {
      return userService.updateUser(id, patch);
    },
  },

  // ----------------- Libros -----------------
  libros: {
    getLibros() {
      return libroService.getLibros();
    },

    getLibroPorId(id) {
      return libroService.getLibroPorId(id);
    },

    addLibro(data) {
      return libroService.addLibro(data);
    },

    updateLibro(id, patch) {
      return libroService.updateLibro(id, patch);
    },

    removeLibro(id) {
      return libroService.removeLibro(id);
    },
  },

  // ----------------- Carrito -----------------
  carts: {
    get(userId) {
      return cartService.get(userId);
    },

    add(userId, libroId, qty) {
      return cartService.add(userId, libroId, qty);
    },

    setQty(userId, libroId, qty) {
      return cartService.setQty(userId, libroId, qty);
    },

    inc(userId, libroId) {
      return cartService.inc(userId, libroId);
    },

    dec(userId, libroId) {
      return cartService.dec(userId, libroId);
    },

    remove(userId, libroId) {
      return cartService.remove(userId, libroId);
    },

    clear(userId) {
      return cartService.clear(userId);
    },
  },

  // ----------------- Facturas -----------------
  facturas: {
    createFromCart(userId, meta) {
      return facturaService.createFromCart(userId, meta);
    },

    getAll(userId) {
      return facturaService.getAll(userId);
    },

    getById(userId, orderId) {
      return facturaService.getById(userId, orderId);
    },
  },
};
