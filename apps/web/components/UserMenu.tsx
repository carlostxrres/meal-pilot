"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { IconLogout, IconMenu2 } from "@tabler/icons-react";
import { useState, useTransition } from "react";
import { signOut } from "../app/login/actions";

export function UserMenu() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <DropdownMenu.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenu.Trigger asChild>
          <button type="button" className="icon-btn" aria-label="Menú">
            <IconMenu2 size={18} stroke={1.75} />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content className="select-content dropdown-content" align="end" sideOffset={4}>
            <DropdownMenu.Item
              className="select-item dropdown-item dropdown-item-destructive"
              onSelect={(e) => {
                e.preventDefault();
                setMenuOpen(false);
                setConfirmOpen(true);
              }}
            >
              <IconLogout size={16} stroke={1.75} /> Cerrar sesión
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <AlertDialog.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="dialog-overlay" />
          <AlertDialog.Content className="dialog-content">
            <AlertDialog.Title className="dialog-title">¿Cerrar sesión?</AlertDialog.Title>
            <AlertDialog.Description className="dialog-description">
              Tendrás que volver a iniciar sesión para ver tu propuesta del día.
            </AlertDialog.Description>
            <div className="dialog-actions">
              <AlertDialog.Cancel asChild>
                <button type="button" className="btn-secondary">
                  Cancelar
                </button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <button
                  type="button"
                  className="btn-destructive"
                  disabled={isPending}
                  onClick={() => startTransition(() => signOut())}
                >
                  Cerrar sesión
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );
}
