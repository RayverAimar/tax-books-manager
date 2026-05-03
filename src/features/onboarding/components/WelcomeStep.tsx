import React from 'react';
import { BookOpen, ChevronRight } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/shared/components/ui/card';

/**
 * Welcome Step Props
 */
interface WelcomeStepProps {
  onNext: () => void;
}

/**
 * Welcome Step Component
 * First step of onboarding flow - welcome message and intro
 */
export const WelcomeStep: React.FC<WelcomeStepProps> = ({ onNext }) => {
  return (
    <Card className="border-2">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <BookOpen className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-3xl">¡Bienvenido a Tax Books Manager!</CardTitle>
        <CardDescription className="text-base">Tu solución para gestionar registros contables SUNAT</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-3 text-sm text-muted-foreground">
          <p className="text-center">
            Esta aplicación te ayudará a administrar tus libros electrónicos de compras y ventas de manera eficiente.
          </p>

          <div className="rounded-lg border bg-muted/50 p-4">
            <h3 className="mb-2 font-semibold text-foreground">Características principales:</h3>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                <span>Importa y exporta archivos CSV en formato SUNAT</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                <span>Gestiona múltiples periodos contables</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                <span>Visualiza métricas y reportes financieros</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                <span>Almacenamiento local seguro en tu dispositivo</span>
              </li>
            </ul>
          </div>

          <p className="text-center text-xs">Para comenzar, necesitarás registrar la información de tu empresa</p>
        </div>
      </CardContent>

      <CardFooter className="flex justify-end">
        <Button onClick={onNext} size="lg" className="w-full sm:w-auto">
          Comenzar
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};
