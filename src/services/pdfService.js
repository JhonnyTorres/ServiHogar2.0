import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";

const LABEL_SERVICIOS = {
    plomeria: 'Plomería', electricidad: 'Electricidad', construccion: 'Construcción',
    pintura: 'Pintura', carpinteria: 'Carpintería', cerrajeria: 'Cerrajería',
    jardineria: 'Jardinería', aseo: 'Aseo', gas: 'Gas', climatizacion: 'Climatización',
    domicilios: 'Domicilios', cuidado_ninos: 'Cuidado de niños',
    adultos_mayores: 'Cuidado de adultos mayores', servicios_gen: 'Servicios generales',
};

const formatCOP = (monto) =>
    (monto || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

const formatFecha = (fecha = new Date()) =>
    fecha.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });

// ─── Plantilla HTML compartida (paleta v2) ─────────────────────────────────────
const plantillaBase = ({ tipo, numero, servicio, clienteNombre, profesionalNombre, monto, descripcion }) => {
    const categoriaLabel = LABEL_SERVICIOS[servicio.categoria] || servicio.categoria;
    const esCotizacion = tipo === 'cotizacion';
    const colorAccento = '#D97706'; // rol profesional

    return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          * { box-sizing: border-box; font-family: -apple-system, Helvetica, Arial, sans-serif; }
          body { margin: 0; padding: 32px; color: #0F172A; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid ${colorAccento}; padding-bottom: 16px; margin-bottom: 24px; }
          .logo { font-size: 22px; font-weight: 700; color: ${colorAccento}; }
          .tipo-doc { text-align: right; }
          .tipo-doc .titulo { font-size: 18px; font-weight: 700; color: #0F172A; }
          .tipo-doc .numero { font-size: 12px; color: #64748B; margin-top: 2px; }
          .seccion { margin-bottom: 20px; }
          .seccion-label { font-size: 11px; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
          .seccion-valor { font-size: 14px; color: #0F172A; font-weight: 600; }
          .fila { display: flex; justify-content: space-between; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th { text-align: left; font-size: 11px; color: #64748B; text-transform: uppercase; padding: 8px 0; border-bottom: 1px solid #E2E8F0; }
          td { padding: 12px 0; border-bottom: 1px solid #E2E8F0; font-size: 14px; }
          .total-row td { border-bottom: none; padding-top: 16px; font-size: 16px; font-weight: 700; }
          .total-label { text-align: right; padding-right: 16px; }
          .badge { display: inline-block; background: #FEF3C7; color: #D97706; font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 20px; margin-top: 8px; }
          .footer { margin-top: 40px; font-size: 11px; color: #94A3B8; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">ServiHogar</div>
          <div class="tipo-doc">
            <div class="titulo">${esCotizacion ? 'Cotización' : 'Factura de servicio'}</div>
            <div class="numero">N.° ${numero} · ${formatFecha()}</div>
          </div>
        </div>

        <div class="fila">
          <div class="seccion">
            <div class="seccion-label">Cliente</div>
            <div class="seccion-valor">${clienteNombre}</div>
          </div>
          <div class="seccion">
            <div class="seccion-label">Profesional</div>
            <div class="seccion-valor">${profesionalNombre}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr><th>Servicio</th><th style="text-align:right">Valor</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>
                ${categoriaLabel}
                ${descripcion ? `<div style="color:#64748B;font-size:12px;margin-top:4px;">${descripcion}</div>` : ''}
              </td>
              <td style="text-align:right">${formatCOP(monto)}</td>
            </tr>
            <tr class="total-row">
              <td class="total-label" colspan="1">Total</td>
              <td style="text-align:right">${formatCOP(monto)}</td>
            </tr>
          </tbody>
        </table>

        ${esCotizacion ? '<div class="badge">Válida por 15 días · sujeta a confirmación</div>' : ''}

        <div class="footer">Generado desde la app ServiHogar</div>
      </body>
    </html>
  `;
};

// ─── Generar el PDF y abrir el diálogo de compartir/descargar ────────────────
const generarYCompartir = async (html, nombreArchivo = 'documento') => {
    const { uri } = await Print.printToFileAsync({ html, base64: false });

    // En algunos dispositivos Android, expo-sharing no puede leer directamente
    // la ruta temporal que usa expo-print. Copiamos el archivo al cacheDirectory
    // de la app (que sí está permitido) antes de compartirlo.
    const uriFinal = `${FileSystem.cacheDirectory}${nombreArchivo}-${Date.now()}.pdf`;
    await FileSystem.copyAsync({ from: uri, to: uriFinal });

    const disponible = await Sharing.isAvailableAsync();
    if (disponible) {
        await Sharing.shareAsync(uriFinal, { mimeType: 'application/pdf', dialogTitle: 'Compartir documento' });
    }
    return uriFinal;
};

// ─── Cotización (al aceptar una solicitud) ────────────────────────────────────
export const generarCotizacionPDF = async ({ servicio, clienteNombre, profesionalNombre, monto, descripcion }) => {
    const html = plantillaBase({
        tipo: 'cotizacion',
        numero: servicio.id?.slice(0, 8).toUpperCase() || '—',
        servicio, clienteNombre, profesionalNombre, monto, descripcion,
    });
    return generarYCompartir(html, 'cotizacion');
};

// ─── Factura (al finalizar el servicio) ───────────────────────────────────────
export const generarFacturaPDF = async ({ servicio, clienteNombre, profesionalNombre, monto }) => {
    const html = plantillaBase({
        tipo: 'factura',
        numero: servicio.id?.slice(0, 8).toUpperCase() || '—',
        servicio, clienteNombre, profesionalNombre, monto,
    });
    return generarYCompartir(html, 'factura');
};