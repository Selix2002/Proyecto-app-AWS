// src/seeder.mjs
import { model } from "../model/model.mjs";

export async function seed() {

  // ==========================
  // 1) Seeds de LIBROS
  // ==========================
  const librosExistentes = await model.libros.getLibros();
  if (!librosExistentes.length) {
    const datosLibros = [
      { isbn:'978-0131103627', titulo:'The C Programming Language', autores:'Brian W. Kernighan, Dennis M. Ritchie', resumen:'Clásico fundamental del lenguaje C', stock:5, precio:45 },
      { isbn:'978-0132350884', titulo:'Clean Code', autores:'Robert C. Martin', resumen:'Buenas prácticas de programación y diseño limpio', stock:3, precio:39 },
      { isbn:'978-1492056355', titulo:'Learning JavaScript', autores:'Ethan Brown', resumen:'Introducción práctica a JavaScript moderno', stock:7, precio:32 },
      { isbn:'978-0201633610', titulo:'Design Patterns', autores:'Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides', resumen:'Patrones de diseño de software clásicos', stock:4, precio:50 },
      { isbn:'978-0262033848', titulo:'Introduction to Algorithms', autores:'Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest, Clifford Stein', resumen:'Referente en algoritmos y estructuras de datos', stock:6, precio:65 },
      { isbn:'978-0596007126', titulo:'Head First Design Patterns', autores:'Eric Freeman, Elisabeth Robson', resumen:'Patrones explicados de forma visual y práctica', stock:8, precio:42 },
      { isbn:'978-0307474278', titulo:'Sapiens: A Brief History of Humankind', autores:'Yuval Noah Harari', resumen:'Historia de la humanidad de forma divulgativa', stock:5, precio:28 },
      { isbn:'978-0140449136', titulo:'The Odyssey', autores:'Homer', resumen:'Epopeya clásica de la literatura griega', stock:2, precio:18 },
    ];

    for (const data of datosLibros) {
      await model.libros.addLibro(data);
    }
  }

  // ==========================
  // 2) Seeds de USUARIOS
  // ==========================
  const adminEmail   = "admin@demo.com";
  const clienteEmail = "cliente@demo.com";

  const admin = await model.users.findByEmail(adminEmail);
  if (!admin) {
    await model.users.addUser({
      dni:'1-9',
      nombres:'Sebastian',
      apellidos:'Muñoz',
      direccion:'C/ Algoritmo 101',
      telefono:'+34 600 000 001',
      email: adminEmail,
      password:'admin',
      rol:'admin'
    });
  }

  const cliente = await model.users.findByEmail(clienteEmail);
  if (!cliente) {
    await model.users.addUser({
      dni:'2-7',
      nombres:'David',
      apellidos:'Vega',
      direccion:'Av. Libro 202',
      telefono:'+34 600 000 002',
      email: clienteEmail,
      password:'cliente',
      rol:'cliente'
    });
  }
}
