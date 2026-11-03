
'use client';

import { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import styles from '@/components/auth/auth.module.css';

interface SelectionArea {
  startX: number;
  startY: number;
  width: number;
  height: number;
}

interface InteractiveMarkerProps {
  zonaGeneral: string;
  zonaEspecifica: string;
  onImageCaptured: (file: File | null) => void;
}

export function MarcaInteractiva({
  zonaGeneral,
  zonaEspecifica,
  onImageCaptured,
}: InteractiveMarkerProps) {
  const [area, setArea] = useState<SelectionArea | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const captureAreaRef = useRef<HTMLDivElement>(null);
  const tempStart = useRef<{ x: number; y: number } | null>(null);
  const areaRef = useRef<SelectionArea | null>(null);

  const generateImageCapture = async () => {
    if (!captureAreaRef.current) return;

    setIsCapturing(true);
    setIsSaved(false);

    try {
      const canvas = await html2canvas(captureAreaRef.current, {
        useCORS: true,
        scale: 2,
      });

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/png');
      });

      if (!blob) {
        throw new Error('No se pudo generar la imagen.');
      }

      const file = new File(
        [blob],
        `area-tatuaje-${zonaGeneral}-${Date.now()}.png`,
        { type: 'image/png' }
      );

      onImageCaptured(file);
      setIsSaved(true);
    } catch (err) {
      console.error('Error capturando el área:', err);
      onImageCaptured(null);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!captureAreaRef.current || isCapturing) return;

    const rect = captureAreaRef.current.getBoundingClientRect();

    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    tempStart.current = { x, y };

    const initialArea = {
      startX: x,
      startY: y,
      width: 0,
      height: 0,
    };

    areaRef.current = initialArea;
    setArea(initialArea);
    setIsSaved(false);
    setIsDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !tempStart.current || !captureAreaRef.current) return;

    const rect = captureAreaRef.current.getBoundingClientRect();

    const currentX = Math.max(
      0,
      Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)
    );

    const currentY = Math.max(
      0,
      Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)
    );

    const startX = tempStart.current.x;
    const startY = tempStart.current.y;

    const nextArea = {
      startX: Math.min(currentX, startX),
      startY: Math.min(currentY, startY),
      width: Math.abs(currentX - startX),
      height: Math.abs(currentY - startY),
    };

    areaRef.current = nextArea;
    setArea(nextArea);
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;

    setIsDrawing(false);
    tempStart.current = null;

    const selectedArea = areaRef.current;

    if (
      selectedArea &&
      selectedArea.width > 2 &&
      selectedArea.height > 2
    ) {
      // Esperamos a que React actualice la selección antes de capturar.
      requestAnimationFrame(() => {
        generateImageCapture();
      });
    } else {
      areaRef.current = null;
      setArea(null);
    }
  };

  const handleReset = () => {
    areaRef.current = null;
    tempStart.current = null;

    setArea(null);
    setIsSaved(false);
    onImageCaptured(null);
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ fontSize: '14px', color: '#62665f', marginBottom: '12px' }}>
        Haz clic y arrastra sobre el modelo para delimitar el{' '}
        <strong>área aproximada</strong> del tatuaje (
        {zonaEspecifica || zonaGeneral}):
      </p>

      <div
        ref={captureAreaRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '320px',
          height: '380px',
          margin: '0 auto',
          background: '#e5e7eb',
          borderRadius: '12px',
          overflow: 'hidden',
          cursor: 'crosshair',
          border: '2px solid #cccec7',
          userSelect: 'none',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#777',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          [ Modelo para: {zonaEspecifica || zonaGeneral} ]
        </div>

        {area && (area.width > 0 || area.height > 0) && (
          <div
            style={{
              position: 'absolute',
              left: `${area.startX}%`,
              top: `${area.startY}%`,
              width: `${area.width}%`,
              height: `${area.height}%`,
              border: '2px dashed #111',
              background: 'rgba(32, 35, 32, 0.25)',
              borderRadius: '6px',
              pointerEvents: 'none',
            }}
          >
            <div style={{ position: 'absolute', top: -4, left: -4, width: 8, height: 8, background: '#111', borderRadius: '50%' }} />
            <div style={{ position: 'absolute', top: -4, right: -4, width: 8, height: 8, background: '#111', borderRadius: '50%' }} />
            <div style={{ position: 'absolute', bottom: -4, left: -4, width: 8, height: 8, background: '#111', borderRadius: '50%' }} />
            <div style={{ position: 'absolute', bottom: -4, right: -4, width: 8, height: 8, background: '#111', borderRadius: '50%' }} />
          </div>
        )}
      </div>

      {area && area.width > 2 && area.height > 2 && (
        <div style={{ marginTop: '12px' }}>
          <p style={{ fontSize: '12px', color: '#2b5329', fontWeight: 600 }}>
            {isCapturing
              ? '📷 Guardando área delimitada...'
              : isSaved
                ? '✓ Área de tatuaje guardada correctamente'
                : 'Área delimitada'}
          </p>

          <button
            type="button"
            onClick={handleReset}
            className={styles.outline}
            style={{ marginTop: '6px', padding: '6px 14px', fontSize: '12px' }}
            disabled={isCapturing}
          >
            Volver a marcar área
          </button>
        </div>
      )}
    </div>
  );
}
