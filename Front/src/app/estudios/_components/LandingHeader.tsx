'use client';

import { useState } from 'react';
import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';
import styles from './landing.module.css';

export function LandingHeader() {
  // Este estado indica si el menú del celular está abierto.
  const [menuAbierto, setMenuAbierto] = useState(false);

  function cerrarMenu() {
    setMenuAbierto(false);
  }

  return (
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
            <Nav className="ms-auto align-items-lg-center" onSelect={cerrarMenu}>
              <Nav.Link href="#plataforma">La plataforma</Nav.Link>
              <Nav.Link href="#herramientas">Herramientas</Nav.Link>
              <Nav.Link href="#planes">Planes</Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </div>
      </Navbar>
    </header>
  );
}
