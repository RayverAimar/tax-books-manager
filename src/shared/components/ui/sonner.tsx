import { useTheme } from 'next-themes';
import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      position="bottom-right"
      expand={true}
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: [
            'group toast group-[.toaster]:bg-background',
            'group-[.toaster]:text-foreground group-[.toaster]:border-border',
            'group-[.toaster]:shadow-lg'
          ].join(' '),
          description: 'group-[.toast]:text-muted-foreground',
          actionButton: [
            '!bg-white/20 !border !border-white/30 !text-white !font-medium',
            '!mt-2 !self-end !rounded !px-3 !py-1.5',
            'hover:!bg-white/30 active:!bg-white/40 !transition-colors'
          ].join(' '),
          cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
          closeButton: [
            '!bg-transparent !border-0 !text-white',
            '!w-6 !h-6 !flex !items-center !justify-center !rounded',
            'hover:!bg-black/30 active:!bg-black/40 !transition-colors'
          ].join(' '),
          success: [
            'group-[.toaster]:!bg-green-500 group-[.toaster]:!text-white',
            'group-[.toaster]:!border-green-600',
            'dark:group-[.toaster]:!bg-green-600 dark:group-[.toaster]:!text-white'
          ].join(' '),
          error: [
            'group-[.toaster]:!bg-red-500 group-[.toaster]:!text-white',
            'group-[.toaster]:!border-red-600',
            'dark:group-[.toaster]:!bg-red-600 dark:group-[.toaster]:!text-white'
          ].join(' '),
          warning: [
            'group-[.toaster]:!bg-amber-500 group-[.toaster]:!text-white',
            'group-[.toaster]:!border-amber-600',
            'dark:group-[.toaster]:!bg-amber-600 dark:group-[.toaster]:!text-white'
          ].join(' '),
          info: [
            'group-[.toaster]:!bg-blue-500 group-[.toaster]:!text-white',
            'group-[.toaster]:!border-blue-600',
            'dark:group-[.toaster]:!bg-blue-600 dark:group-[.toaster]:!text-white'
          ].join(' '),
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
