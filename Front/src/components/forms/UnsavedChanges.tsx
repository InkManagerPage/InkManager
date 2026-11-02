'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { NavigationGuardProvider, useNavigationGuard } from 'nextjs-nav-guard';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';

interface ChangesContext {
  register: (id: string, dirty: boolean) => void;
  confirmClose: (action: () => void, dirty?: boolean) => void;
}
const ChangesContext = createContext<ChangesContext | null>(null);

export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  return (
    <NavigationGuardProvider>
      <ChangesGuard>{children}</ChangesGuard>
    </NavigationGuardProvider>
  );
}

function ChangesGuard({ children }: { children: ReactNode }) {
  const dirtyForms = useRef(new Set<string>());
  const resolver = useRef<((accepted: boolean) => void) | null>(null);
  const [open, setOpen] = useState(false);
  const ask = useCallback(
    () =>
      new Promise<boolean>((resolve) => {
        if (resolver.current) return resolve(false);
        resolver.current = resolve;
        setOpen(true);
      }),
    [],
  );
  useNavigationGuard({ enabled: () => dirtyForms.current.size > 0, confirm: ask });
  const register = useCallback((id: string, dirty: boolean) => {
    if (dirty) dirtyForms.current.add(id);
    else dirtyForms.current.delete(id);
  }, []);
  const confirmClose = useCallback(
    (action: () => void, dirty = dirtyForms.current.size > 0) => {
      if (!dirty) {
        action();
        return;
      }
      void ask().then((accepted) => {
        if (accepted) {
          // El cierre también puede navegar al quitar el detalle de la URL.
          dirtyForms.current.clear();
          action();
        }
      });
    },
    [ask],
  );
  function finish(accepted: boolean) {
    const resolve = resolver.current;
    resolver.current = null;
    setOpen(false);
    resolve?.(accepted);
  }
  return (
    <ChangesContext.Provider value={{ register, confirmClose }}>
      {children}
      <Modal
        show={open}
        onHide={() => finish(false)}
        centered
        aria-labelledby="unsaved-title"
        backdrop="static"
      >
        <Modal.Header>
          <Modal.Title as="h2" id="unsaved-title">
            ¿Descartar los cambios?
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>Tenés cambios sin guardar. Si continuás, se perderán.</Modal.Body>
        <Modal.Footer>
          <Button variant="outline-dark" onClick={() => finish(false)} autoFocus>
            Seguir editando
          </Button>
          <Button variant="danger" onClick={() => finish(true)}>
            Descartar cambios
          </Button>
        </Modal.Footer>
      </Modal>
    </ChangesContext.Provider>
  );
}

export function useDiscardChanges() {
  const context = useContext(ChangesContext);
  if (!context) throw new Error('Falta el proveedor de cambios sin guardar.');
  return context.confirmClose;
}

export function useUnsavedChanges(dirty: boolean) {
  const context = useContext(ChangesContext);
  const id = useId();
  const register = context?.register;
  useEffect(() => {
    register?.(id, dirty);
    return () => register?.(id, false);
  }, [dirty, id, register]);
  return useCallback(() => register?.(id, false), [id, register]);
}
