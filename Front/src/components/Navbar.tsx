'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import BootstrapNavbar from 'react-bootstrap/Navbar';
import styles from './Navbar.module.css';

export interface NavbarLink {
  href: string;
  label: string;
}

interface NavbarProps {
  actions?: (closeMenu: () => void) => ReactNode;
  brandHref?: string;
  brandLabel?: string;
  headerId?: string;
  links?: NavbarLink[];
  navigationId?: string;
  overlay?: boolean;
}

export default function Navbar({
  actions,
  brandHref = '/',
  brandLabel = 'InkManager',
  headerId,
  links = [],
  navigationId = 'site-navigation',
  overlay = false,
}: NavbarProps) {
  const [expanded, setExpanded] = useState(false);
  const closeMenu = () => setExpanded(false);

  return (
    <header id={headerId} className={`${styles.header} ${overlay ? styles.overlay : ''}`}>
      <BootstrapNavbar
        expand="lg"
        expanded={expanded}
        onToggle={setExpanded}
        className={styles.navbar}
        data-bs-theme="dark"
      >
        <div className={`container d-flex ${styles.container}`}>
          <BootstrapNavbar.Brand
            as={Link}
            href={brandHref}
            className={styles.brand}
            aria-label={`${brandLabel}, inicio`}
          >
            {brandLabel}
          </BootstrapNavbar.Brand>
          <BootstrapNavbar.Toggle
            aria-controls={navigationId}
            label="Abrir o cerrar menú"
            className={styles.toggle}
          />
          <BootstrapNavbar.Collapse id={navigationId} className={styles.collapse}>
            {links.length > 0 && (
              <nav className={styles.links} aria-label="Navegación principal">
                {links.map(({ href, label }) => (
                  <Link key={href} href={href} className={styles.link} onClick={closeMenu}>
                    {label}
                  </Link>
                ))}
              </nav>
            )}
            {actions && <div className={styles.actions}>{actions(closeMenu)}</div>}
          </BootstrapNavbar.Collapse>
        </div>
      </BootstrapNavbar>
    </header>
  );
}
