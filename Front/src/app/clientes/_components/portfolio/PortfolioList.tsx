'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Modal from 'react-bootstrap/Modal';
import type { ArtistaPublico, TrabajoPublico } from '@/types/artista';
import PortfolioCard from './PortfolioCard';
import styles from './portfolio.module.css';
import authStyles from '@/components/auth/auth.module.css';
import { generarSlug } from '@/lib/generar-slug';

export default function PortfolioList({
  trabajos,
  artistas,
}: {
  trabajos: TrabajoPublico[];
  artistas: ArtistaPublico[];
}) {
  const [seleccionado, setSeleccionado] = useState<TrabajoPublico | null>(null);

  const artista = artistas.find(
    (item) => item.id === seleccionado?.artistaId
  );

  return (
    <>
      <div className={styles.grid}>
        {trabajos.map((trabajo, index) => (
          <PortfolioCard
            key={trabajo.id}
            trabajo={trabajo}
            loading={index < 3 ? 'eager' : 'lazy'}
            onOpen={() => setSeleccionado(trabajo)}
          />
        ))}
      </div>

      <Modal
        show={Boolean(seleccionado)}
        onHide={() => setSeleccionado(null)}
        size="xl"
        centered
        scrollable
        aria-labelledby="work-detail-title"
      >
        <Modal.Header closeButton closeLabel="Cerrar">
          <Modal.Title id="work-detail-title">
            {seleccionado?.nombreArtista}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body className={styles.modalBody}>
          {seleccionado && (
            <div className={styles.detailLayout}>
              <div className={styles.expandedImage}>
                <Image
                  src={seleccionado.url}
                  alt={seleccionado.descripcion}
                  width={1600}
                  height={1600}
                  sizes="(max-width: 800px) 100vw, 65vw"
                />
              </div>

              <div className={styles.detailInfo}>
                {artista && (
                  <div className={styles.artist}>
                    <Image
                      src={artista.fotoPerfil}
                      alt=""
                      width={52}
                      height={52}
                    />

                    <div>
                      <strong>{artista.nombreArtistico}</strong>
                      <span>{artista.ciudad}</span>
                    </div>
                  </div>
                )}

                <p className={styles.description}>
                  {seleccionado.descripcion}
                </p>

                <div className={styles.tags}>
                  {seleccionado.estilos.map((estilo) => (
                    <span key={estilo}>{estilo}</span>
                  ))}
                </div>

                {artista?.biografia && (
                  <p className={styles.biography}>
                    {artista.biografia}
                  </p>
                )}

                {/* Botón para solicitar presupuesto */}

                {artista && (
                  <Link
                    href={`/cotizacion/artista/${encodeURIComponent(
                      generarSlug(artista.nombreArtistico)
                    )}`}
                    className={authStyles.submit}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: '24px',
                      textDecoration: 'none',
                    }}
                    onClick={() => setSeleccionado(null)}
                  >
                    Solicitar presupuesto
                  </Link>
                )}
              </div>
            </div>
          )}
        </Modal.Body>
      </Modal>
    </>
  );
}
