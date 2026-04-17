'use client';

import { Drawer } from 'vaul';

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;
}

export function BottomSheet({ open, onOpenChange, children, title }: BottomSheetProps) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-[#1c1917] border-t border-white/8 max-h-[85vh] flex flex-col">
          <div className="px-6 pt-4 pb-2">
            <Drawer.Handle className="mx-auto w-9 h-1 rounded-full bg-white/15" />
            {title && (
              <Drawer.Title className="text-base font-semibold text-white mt-4 mb-2">{title}</Drawer.Title>
            )}
          </div>
          <div className="px-6 pb-6 overflow-y-auto flex-1" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
