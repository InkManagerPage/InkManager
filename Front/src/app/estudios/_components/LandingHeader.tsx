'use client';
import { useState } from 'react';
import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';
import { AuthControls } from '@/components/auth/AuthControls';
import styles from './landing.module.css';
export function LandingHeader() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const cerrarMenu = () => setMenuAbierto(false);
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
          <Navbar.Brand href="/" className={styles.brand}>
            InkManager
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="landing-navigation" label="Abrir o cerrar menú" />
          <Navbar.Collapse id="landing-navigation">
            <Nav className="mx-auto my-3 my-lg-0" onSelect={cerrarMenu}>
              <Nav.Link href="#plataforma">La plataforma</Nav.Link>
              <Nav.Link href="#herramientas">Herramientas</Nav.Link>
              <Nav.Link href="#planes">Planes</Nav.Link>
            </Nav>
            <AuthControls light onOpen={cerrarMenu} />
          </Navbar.Collapse>
        </div>
      </Navbar>
    </header>
  );
}
