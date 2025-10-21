import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Modal, Button, Group, Text, Stack, Alert } from '@mantine/core';
import { FaCamera, FaTimes, FaCheckCircle } from 'react-icons/fa';

/**
 * Componente de Scanner de Código de Barras
 * Usa a câmera do dispositivo para ler códigos de barras
 */
function BarcodeScanner({ opened, onClose, onScan, title = "Scanner de Código de Barras" }) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [lastScanned, setLastScanned] = useState(null);
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  useEffect(() => {
    if (opened) {
      const timer = setTimeout(() => {
        startScanner();
      }, 150); // Delay to ensure modal is rendered

      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    }
  }, [opened]);

  const startScanner = async () => {
    try {
      setError(null);
      setScanning(true);

      // Cria instância do scanner
      const html5QrCode = new Html5Qrcode("barcode-reader");
      html5QrCodeRef.current = html5QrCode;

      // Configurações do scanner
      const config = {
        fps: 10, // Frames por segundo
        qrbox: { width: 250, height: 150 }, // Área de leitura
        aspectRatio: 1.777778, // 16:9
      };

      // Inicia o scanner
      await html5QrCode.start(
        { facingMode: "environment" }, // Câmera traseira
        config,
        onScanSuccess,
        onScanError
      );

    } catch (err) {
      console.error("Erro ao iniciar scanner:", err);
      setError(
        err.message.includes('Permission denied')
          ? 'Permissão de câmera negada. Habilite o acesso à câmera nas configurações.'
          : 'Erro ao iniciar câmera. Verifique se o dispositivo possui câmera.'
      );
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.error("Erro ao parar scanner:", err);
      }
      html5QrCodeRef.current = null;
    }
    setScanning(false);
  };

  const onScanSuccess = (decodedText, decodedResult) => {
    console.log("Código detectado:", decodedText);

    // Evita scans duplicados rápidos
    if (decodedText === lastScanned) {
      return;
    }

    setLastScanned(decodedText);

    // Vibra o dispositivo (se disponível)
    if (navigator.vibrate) {
      navigator.vibrate(200);
    }

    // Chama callback com o código escaneado
    if (onScan) {
      onScan(decodedText);
    }

    // Para o scanner após sucesso
    setTimeout(() => {
      handleClose();
    }, 500);
  };

  const onScanError = (errorMessage) => {
    // Ignora erros de "not found" que são normais durante o scan
    if (!errorMessage.includes('NotFoundException')) {
      console.warn("Erro no scan:", errorMessage);
    }
  };

  const handleClose = async () => {
    await stopScanner();
    setLastScanned(null);
    setError(null);
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={title}
      size="lg"
      centered
    >
      <Stack gap="md">
        {error && (
          <Alert color="red" title="Erro" icon={<FaTimes />}>
            {error}
          </Alert>
        )}

        {lastScanned && (
          <Alert color="green" title="Código Detectado" icon={<FaCheckCircle />}>
            {lastScanned}
          </Alert>
        )}

        <div style={{ position: 'relative' }}>
          <div id="barcode-reader" style={{ width: '100%', borderRadius: '8px', overflow: 'hidden' }} />

          {!scanning && !error && (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              background: '#f8f9fa',
              borderRadius: '8px'
            }}>
              <FaCamera size={48} style={{ color: '#228be6', marginBottom: '16px' }} />
              <Text size="sm" c="dimmed">Iniciando câmera...</Text>
            </div>
          )}
        </div>

        <Stack gap="xs">
          <Text size="sm" c="dimmed" ta="center">
            {scanning
              ? '📷 Aponte a câmera para o código de barras'
              : 'Aguarde...'
            }
          </Text>

          <Text size="xs" c="dimmed" ta="center">
            Suporta: EAN-13, EAN-8, UPC, Code 128, Code 39, QR Code
          </Text>
        </Stack>

        <Group justify="center" mt="md">
          <Button
            variant="light"
            color="red"
            leftSection={<FaTimes />}
            onClick={handleClose}
          >
            Cancelar
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

export default BarcodeScanner;
