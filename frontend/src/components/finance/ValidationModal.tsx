import { Button } from '../ui/Button';
import { AlertCircle, AlertTriangle } from 'lucide-react';

interface ValidationResult {
  pode_fechar: boolean;
  avisos: string[];
  bloqueios: string[];
}

interface ValidationModalProps {
  validationResult: ValidationResult;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ValidationModal = ({ validationResult, onConfirm, onCancel }: ValidationModalProps) => {
  const { pode_fechar, avisos, bloqueios } = validationResult;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-xl font-bold">Validação de Fechamento de Caixa</h2>

        {bloqueios.length > 0 && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Não é possível fechar o caixa devido aos seguintes erros:
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <ul className="list-disc space-y-1 pl-5">
                    {bloqueios.map((bloqueio, index) => (
                      <li key={index}>{bloqueio}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {avisos.length > 0 && (
          <div className="mb-4 rounded-md bg-yellow-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Avisos:</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <ul className="list-disc space-y-1 pl-5">
                    {avisos.map((aviso, index) => (
                      <li key={index}>{aviso}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-4">
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={!pode_fechar}>
            {pode_fechar ? 'Confirmar Fechamento' : 'Não é possível fechar'}
          </Button>
        </div>
      </div>
    </div>
  );
};
