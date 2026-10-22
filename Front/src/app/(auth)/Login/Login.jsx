"use client";

import Modal from 'react-bootstrap/Modal';
import { FormikForm } from '../../../components/forms/FormikForm';
import { loginFields } from './loginFields';

export function LoginModal({ show, onHide }) {

  const handleLoginSubmit = (values) => {
    console.log("Login enviado:", values);
    //Aca va la conexión al back
    onHide(); // Cierra el modal al enviar
  };

  return (
    <Modal show={show} onHide={onHide} centered data-bs-theme="dark">
      <Modal.Header closeButton className="border-0 bg-zinc-900 text-white">
        <Modal.Title className="fw-bold">Iniciar Sesión</Modal.Title>
      </Modal.Header>
      <Modal.Body className="bg-zinc-900 text-white p-4">
        <FormikForm fields={loginFields} handleSubmit={handleLoginSubmit} buttonText="Iniciar Sesión" buttonClassName="btn rounded-pill shadow-sm" buttonStyles={{ backgroundColor: '#ffffff', borderColor: '#ffffff', color: '#000000'}}
        />
      </Modal.Body>
    </Modal>
  );
}