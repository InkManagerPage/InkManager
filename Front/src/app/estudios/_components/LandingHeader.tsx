'use client';

import { useState } from 'react';
import Navbar from 'react-bootstrap/Navbar';
// import Link from 'next/link';
import Nav from 'react-bootstrap/Nav';
import { LoginModal } from '../../(auth)/Login/Login';
import { RegisterModal } from '../../(auth)/Register/Register';
import styles from './landing.module.css';

export function LandingHeader() {
  // Este estado indica si el menú del celular está abierto.
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [modalLoginAbierto, setModalLoginAbierto] = useState(false);
  const [modalRegisterAbierto, setModalRegisterAbierto] = useState(false);

  function cerrarMenu() {
    setMenuAbierto(false);
  }

  return (
    <>
    <header className={styles.header} id="inicio">
      <Navbar
        expand="lg"
        expanded={menuAbierto}
        onToggle={setMenuAbierto}
        className={styles.navbar}
        data-bs-theme="dark"
      >
        <div className={`container-fluid ${styles.container}`}>
          <Navbar.Brand href="#inicio" className={styles.brand} onClick={cerrarMenu}>
            InkManager
          </Navbar.Brand>
          <Navbar.Toggle
            aria-controls="landing-navigation"
            aria-expanded={menuAbierto}
            label="Abrir o cerrar menú"
          />
          <Navbar.Collapse id="landing-navigation">
            <div className="d-none d-lg-block" style={{ width: '100px' }}></div>
            <Nav className="d-none d-lg-flex position-absolute start-50 translate-middle-x align-items-center" onSelect={cerrarMenu}>
              <Nav.Link href="#plataforma">La plataforma</Nav.Link>
              <Nav.Link href="#herramientas">Herramientas</Nav.Link>
              <Nav.Link href="#planes">Planes</Nav.Link>
            </Nav>
            <Nav className="d-lg-none align-items-start my-2" onSelect={cerrarMenu}>
              <Nav.Link href="#plataforma">La plataforma</Nav.Link>
              <Nav.Link href="#herramientas">Herramientas</Nav.Link>
              <Nav.Link href="#planes">Planes</Nav.Link>
            </Nav>
            <Nav 
              className="align-items-center gap-4 d-flex flex-row ms-auto mt-3 mt-lg-0" style={{ width: 'auto' }} onSelect={cerrarMenu}
            >
              <Nav.Link as="button" onClick={() => { setModalLoginAbierto(true); cerrarMenu(); }} className="border-0 bg-transparent text-light p-0" style={{ transition: 'opacity 0.2s', opacity: 0.85 }} onMouseEnter={(e) => e.currentTarget.style.opacity = '0.5'} onMouseLeave={(e) => e.currentTarget.style.opacity = '0.85'}>
                Login
              </Nav.Link>
  
            <Nav.Link as="button" onClick={() => { setModalRegisterAbierto(true); cerrarMenu(); }} className="border-0 bg-transparent text-light p-0"style={{ transition: 'opacity 0.2s', opacity: 0.85 }} onMouseEnter={(e) => e.currentTarget.style.opacity = '0.5'} onMouseLeave={(e) => e.currentTarget.style.opacity = '0.85'}>
              Register
            </Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </div>
      </Navbar>
    </header>
    <LoginModal 
        show={modalLoginAbierto} 
        onHide={() => setModalLoginAbierto(false)} 
      />
      
      <RegisterModal 
        show={modalRegisterAbierto} 
        onHide={() => setModalRegisterAbierto(false)} 
      />
    </>
  );
}
