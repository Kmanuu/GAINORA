// ============================================================================
// email.ts — Envío de emails transaccionales (alertas de sobrepaso de horas)
// ============================================================================
// Mock por ahora. Cuando se configure Resend, solo hay que cambiar
// la implementación interna. La interfaz pública no cambia.
// ============================================================================

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export interface EmailResult {
  success: boolean;
  messageId: string | null;
}

/**
 * Envía un email transaccional.
 *
 * MOCK: Loggea por consola y devuelve success=true.
 * REAL: Llamar a la API de Resend con RESEND_API_KEY.
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  // En producción se sustituye por fetch a https://api.resend.com/emails
  // usando RESEND_API_KEY. La interfaz pública no cambia.
  console.log(`[EMAIL MOCK] To: ${options.to} | Subject: ${options.subject}`);

  return {
    success: true,
    messageId: `mock-${Date.now()}`,
  };
}

/**
 * Envía una alerta cuando un proyecto supera las horas presupuestadas.
 */
export async function sendBudgetAlert(
  to: string,
  projectName: string,
  budgetHours: number,
  actualHours: number,
): Promise<EmailResult> {
  return sendEmail({
    to,
    subject: `⚠️ Gainora: "${projectName}" ha superado las horas presupuestadas`,
    html: `
      <h2>Alerta de sobrepaso de horas</h2>
      <p>El proyecto <strong>${projectName}</strong> ha consumido 
         <strong>${actualHours.toFixed(1)}h</strong> de las 
         <strong>${budgetHours}h</strong> presupuestadas.</p>
      <p>Revisa la rentabilidad en tu dashboard de Gainora.</p>
    `,
  });
}
