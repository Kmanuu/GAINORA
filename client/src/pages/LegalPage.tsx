import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GainoraWordmark } from '@/components/brand/GainoraLogo';
import './LandingPage.css';

type Doc = 'privacy' | 'terms' | 'legal' | 'cookies';

const TITLES: Record<Doc, string> = {
  privacy: 'Política de Privacidad',
  terms: 'Términos y Condiciones',
  legal: 'Aviso Legal',
  cookies: 'Política de Cookies',
};

const SUBTITLES: Record<Doc, string> = {
  privacy: 'Cómo tratamos los datos personales que nos confías.',
  terms: 'Las reglas del juego al usar Gainora.',
  legal: 'Información legal del titular del servicio (LSSI-CE).',
  cookies: 'Qué cookies usamos y cómo gestionarlas.',
};

const LINK: React.CSSProperties = { color: '#0A84FF', textDecoration: 'none', fontWeight: 500 };
const UL: React.CSSProperties = { paddingLeft: 22, lineHeight: 1.8, color: '#94A3B8' };

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section style={{ marginBottom: 36 }}>
    <h2 style={{
      fontSize: 18, fontWeight: 700, color: '#F5F7FA',
      marginBottom: 12, letterSpacing: '-.01em',
    }}>
      {title}
    </h2>
    <div style={{ color: '#94A3B8', fontSize: 15, lineHeight: 1.75 }}>{children}</div>
  </section>
);

const PRIVACY_BODY = (
  <>
    <Section title="1. Responsable del tratamiento">
      <p>
        El responsable del tratamiento de los datos personales recogidos a través de Gainora es el titular
        del servicio, cuyos datos identificativos completos se publican en el <a href="/legal" style={LINK}>Aviso Legal</a>.
      </p>
    </Section>

    <Section title="2. Datos que recogemos">
      <ul style={UL}>
        <li>Datos de cuenta: nombre, email, contraseña cifrada.</li>
        <li>Datos fiscales del autónomo: NIF, dirección, datos de facturación.</li>
        <li>Datos operativos: clientes, proyectos, horas, facturas y cobros que registres en la herramienta.</li>
        <li>Datos técnicos: IP, navegador, fecha y hora de acceso, registros de uso necesarios para el funcionamiento del servicio.</li>
      </ul>
    </Section>

    <Section title="3. Finalidades">
      <ul style={UL}>
        <li>Prestar el servicio contratado y permitir el cálculo de rentabilidad y la generación de facturas legales.</li>
        <li>Cumplir las obligaciones legales y fiscales vinculadas a la facturación electrónica.</li>
        <li>Atender las consultas de soporte que nos remitas.</li>
        <li>Enviar comunicaciones operativas estrictamente necesarias para el servicio.</li>
      </ul>
    </Section>

    <Section title="4. Base jurídica">
      <p>
        Tratamos tus datos en virtud de la ejecución del contrato de servicio (RGPD art. 6.1.b), las obligaciones legales aplicables (art. 6.1.c) y, en su caso, tu consentimiento (art. 6.1.a) cuando sea necesario.
      </p>
    </Section>

    <Section title="5. Conservación">
      <p>
        Mantenemos tus datos mientras tu cuenta esté activa y, tras su cancelación, durante los plazos legalmente exigibles para los datos fiscales (en general 4–6 años, según AEAT). Después se suprimirán o anonimizarán.
      </p>
    </Section>

    <Section title="6. Encargados de tratamiento (subprocesadores)">
      <p>
        Para prestar el servicio nos apoyamos en proveedores de hosting, base de datos, pasarela de pago y email transaccional, todos ellos sometidos a contrato de encargo de tratamiento conforme al RGPD. Publicamos la lista de subprocesadores y la actualizamos cuando cambia.
      </p>
    </Section>

    <Section title="7. Tus derechos">
      <p>
        Puedes ejercer en cualquier momento los derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo a{' '}
        <a href="mailto:privacidad@gainora.app" style={LINK}>privacidad@gainora.app</a>. También puedes presentar una reclamación ante la Agencia Española de Protección de Datos (AEPD).
      </p>
    </Section>

    <Section title="8. Seguridad">
      <p>
        Aplicamos medidas técnicas y organizativas razonables: cifrado en tránsito (HTTPS), contraseñas almacenadas mediante hash, copias de seguridad periódicas y separación de datos por inquilino (multitenancy).
      </p>
    </Section>
  </>
);

const TERMS_BODY = (
  <>
    <Section title="1. Aceptación">
      <p>
        El uso de Gainora implica la aceptación íntegra de los presentes Términos. Si no estás de acuerdo, no utilices el servicio.
      </p>
    </Section>
    <Section title="2. Objeto del servicio">
      <p>
        Gainora es una herramienta SaaS dirigida a autónomos y pequeñas agencias en España para registrar horas, gestionar contratos y suscripciones, emitir facturas y preparar resúmenes fiscales trimestrales.
      </p>
    </Section>
    <Section title="3. Naturaleza del servicio (importante)">
      <p>
        Gainora es una herramienta informática. <strong>No es un servicio de asesoramiento fiscal, contable ni legal</strong>. Los preformularios de los modelos 303, 130 y 349 son ayudas al usuario y a su asesor; la presentación final ante la AEAT corresponde siempre al usuario o a su gestor con su certificado.
      </p>
    </Section>
    <Section title="4. Cuenta de usuario">
      <p>
        Eres responsable de la veracidad de los datos facilitados, del uso correcto de tus credenciales y de la actividad realizada desde tu cuenta. Notifícanos cualquier acceso no autorizado.
      </p>
    </Section>
    <Section title="5. Suscripción y pago">
      <p>
        El servicio se contrata por suscripción mensual. El usuario puede cancelar en cualquier momento, manteniendo el acceso hasta el final del periodo facturado. No hay reembolso de los periodos ya iniciados salvo que la ley aplicable disponga lo contrario.
      </p>
    </Section>
    <Section title="6. Disponibilidad">
      <p>
        Trabajamos para mantener el servicio disponible, pero no garantizamos un 100% de uptime. Podremos realizar tareas de mantenimiento programado avisando con la mayor antelación posible.
      </p>
    </Section>
    <Section title="7. Limitación de responsabilidad">
      <p>
        En la máxima medida permitida por la ley, Gainora no responde por (i) decisiones fiscales o contables tomadas por el usuario o terceros sobre la base de los datos calculados por la herramienta; (ii) interrupciones puntuales del servicio; (iii) daños indirectos o lucro cesante. La responsabilidad máxima por cualquier reclamación se limita al importe pagado en los doce meses anteriores.
      </p>
    </Section>
    <Section title="8. Propiedad intelectual">
      <p>
        El software, la marca y los contenidos de Gainora son propiedad de su titular. El usuario conserva la titularidad de los datos que introduce en la plataforma.
      </p>
    </Section>
    <Section title="9. Cancelación y portabilidad">
      <p>
        Al cancelar la cuenta puedes exportar tus datos en formatos estándar (CSV, PDF). Tras la cancelación se conservarán únicamente los datos exigidos por la legislación fiscal aplicable.
      </p>
    </Section>
    <Section title="10. Ley aplicable y jurisdicción">
      <p>
        Estos Términos se rigen por la legislación española. Las controversias se someten a los juzgados y tribunales del domicilio del titular del servicio, salvo que la ley imponga otro fuero.
      </p>
    </Section>
  </>
);

const LEGAL_BODY = (
  <>
    <Section title="Información del titular">
      <p>
        En cumplimiento del artículo 10 de la Ley 34/2002 de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE):
      </p>
      <ul style={UL}>
        <li>Titular: <em>[Nombre y apellidos del titular]</em></li>
        <li>NIF: <em>[NIF del titular]</em></li>
        <li>Domicilio: <em>[Dirección postal]</em></li>
        <li>Email de contacto: <a href="mailto:hola@gainora.app" style={LINK}>hola@gainora.app</a></li>
        <li>Email de privacidad: <a href="mailto:privacidad@gainora.app" style={LINK}>privacidad@gainora.app</a></li>
      </ul>
    </Section>
    <Section title="Condiciones de uso">
      <p>
        El acceso a este sitio web y su uso atribuyen la condición de usuario, lo que implica la aceptación de las condiciones aquí publicadas y de las que en cada momento estén en vigor.
      </p>
    </Section>
    <Section title="Propiedad intelectual e industrial">
      <p>
        Todos los contenidos, marcas, logotipos y diseños son propiedad de su titular o de terceros que han autorizado su uso. Queda prohibida su reproducción sin autorización expresa.
      </p>
    </Section>
    <Section title="Legislación aplicable">
      <p>
        El presente Aviso Legal se rige por la normativa española vigente.
      </p>
    </Section>
  </>
);

const COOKIES_BODY = (
  <>
    <Section title="¿Qué son las cookies?">
      <p>
        Una cookie es un pequeño archivo de texto que un sitio web almacena en tu navegador para recordar información sobre tu visita.
      </p>
    </Section>
    <Section title="Cookies que usamos">
      <ul style={UL}>
        <li><strong>Técnicas estrictamente necesarias</strong> — para mantener la sesión iniciada (token de autenticación). No requieren consentimiento conforme al art. 22.2 LSSI.</li>
        <li><strong>De preferencias</strong> — recuerdan, por ejemplo, si has completado el tutorial de bienvenida.</li>
      </ul>
      <p>
        Actualmente no utilizamos cookies analíticas ni publicitarias de terceros. Si en el futuro las incorporamos, se solicitará tu consentimiento previo conforme a la guía de la AEPD.
      </p>
    </Section>
    <Section title="Cómo gestionarlas">
      <p>
        Puedes configurar tu navegador para bloquear o eliminar cookies. Ten en cuenta que bloquear las cookies técnicas puede impedir el funcionamiento correcto del servicio.
      </p>
    </Section>
  </>
);

const BODIES: Record<Doc, React.ReactNode> = {
  privacy: PRIVACY_BODY,
  terms: TERMS_BODY,
  legal: LEGAL_BODY,
  cookies: COOKIES_BODY,
};

export default function LegalPage({ doc }: { doc: Doc }) {
  const navigate = useNavigate();

  useEffect(() => {
    document.body.classList.add('landing-active');
    window.scrollTo(0, 0);
    return () => { document.body.classList.remove('landing-active'); };
  }, []);

  const updated = '29 de abril de 2026';

  return (
    <div className="landing-page" style={{ minHeight: '100vh', paddingBottom: 80 }}>
      {/* Top bar minimal */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        padding: '16px 24px',
        background: 'rgba(5,8,22,.85)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button
          onClick={() => navigate('/')}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
            color: '#F5F7FA',
          }}
        >
          <GainoraWordmark size={22} textColor="#F5F7FA" />
        </button>
      </nav>

      <main style={{ maxWidth: 760, margin: '0 auto', padding: '64px 24px 0' }}>
        {/* Aviso de borrador honesto */}
        <div style={{
          marginBottom: 32,
          padding: '14px 18px',
          borderRadius: 12,
          background: 'rgba(255,159,10,.08)',
          border: '1px solid rgba(255,159,10,.25)',
          color: '#FFB84A',
          fontSize: 13,
          lineHeight: 1.6,
        }}>
          <strong>Documento provisional.</strong> Este texto es un borrador inicial; la versión definitiva
          la revisará un asesor legal antes del lanzamiento comercial. Para cualquier duda escríbenos a{' '}
          <a href="mailto:privacidad@gainora.app" style={{ color: '#FFB84A', textDecoration: 'underline' }}>
            privacidad@gainora.app
          </a>.
        </div>

        <div style={{
          fontSize: 12, color: '#64748B', letterSpacing: .4, textTransform: 'uppercase',
          marginBottom: 12,
        }}>
          Última actualización · {updated}
        </div>

        <h1 style={{
          fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 800,
          letterSpacing: '-.03em', marginBottom: 14, lineHeight: 1.1,
          color: '#F5F7FA',
        }}>
          {TITLES[doc]}
        </h1>
        <p style={{ color: '#94A3B8', fontSize: 17, lineHeight: 1.65, marginBottom: 48 }}>
          {SUBTITLES[doc]}
        </p>

        {BODIES[doc]}

        <div style={{
          marginTop: 56, paddingTop: 24,
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', flexWrap: 'wrap', gap: 16,
          fontSize: 13, color: '#64748B',
        }}>
          <a href="/privacy" style={{ color: '#94A3B8', textDecoration: 'none' }}>Privacidad</a>
          <a href="/terms" style={{ color: '#94A3B8', textDecoration: 'none' }}>Términos</a>
          <a href="/legal" style={{ color: '#94A3B8', textDecoration: 'none' }}>Aviso legal</a>
          <a href="/cookies" style={{ color: '#94A3B8', textDecoration: 'none' }}>Cookies</a>
          <span style={{ marginLeft: 'auto' }}>© 2026 Gainora</span>
        </div>
      </main>
    </div>
  );
}
