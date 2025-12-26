let modalContainer = null;
let hideTimeout = null;

//Este modal recibe un mensaje y un estado ('info', 'ok', 'error','aviso') y muestra el mensaje correspondiente
export async function mostrarModal(mensaje, estado = 'info', duracion = 3000) {
  if (!modalContainer) {
    const resp = await fetch('/libreria/js/components/modal/modal.html');
    const html = await resp.text();
    document.body.insertAdjacentHTML('beforeend', html);
    modalContainer = document.querySelector('#modal');
  }

  const modalContent = document.querySelector('#modal-content');
  const modalMessage = document.querySelector('#modal-message');

  modalContent.className = 'modal-content';
  modalContent.classList.add(`modal-${estado}`);

  modalMessage.textContent = mensaje;

  modalContainer.classList.remove('oculto');
  modalContainer.classList.add('mostrar');

  // Reiniciar temporizador si ya estaba activo
  clearTimeout(hideTimeout);

  // Ocultar después de la duración especificada
  hideTimeout = setTimeout(() => {
    ocultarModal();
  }, duracion);
}

function ocultarModal() {
  if (modalContainer) {
    modalContainer.classList.remove('mostrar');
    setTimeout(() => {
      modalContainer.classList.add('oculto');
    }, 500);
  }
}
