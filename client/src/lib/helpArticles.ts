// ============================================================================
// helpArticles.ts — Catálogo de artículos del Centro de Ayuda
// ============================================================================
// Cada artículo está escrito en español llano, sin tecnicismos. El objetivo
// es que un autónomo sin conocimientos de gestión entienda exactamente
// qué hace cada cosa y por qué importa.
//
// Cada artículo se asocia a una sección de la app vía `relatedRoutes` para
// que el botón "?" flotante de cada pantalla abra el artículo correcto.
// ============================================================================

export type HelpCategory =
  | 'empezar'
  | 'rentabilidad'
  | 'cobros'
  | 'fiscal'
  | 'suscripciones'
  | 'productividad';

export interface HelpBlock {
  type:    'p' | 'h3' | 'list' | 'note' | 'warn' | 'tip' | 'example';
  content: string | string[];
}

export interface HelpArticle {
  id:             string;
  category:       HelpCategory;
  title:          string;
  summary:        string;
  /** Rutas en las que este artículo es relevante */
  relatedRoutes:  string[];
  /** Tiempo estimado de lectura, ej. "2 min" */
  readingTime:    string;
  blocks:         HelpBlock[];
  /** ids de artículos relacionados */
  related?:       string[];
}

export const HELP_CATEGORIES: { id: HelpCategory; label: string; emoji: string; color: string }[] = [
  { id: 'empezar',        label: 'Empezar',         emoji: '🚀', color: '#0A84FF' },
  { id: 'rentabilidad',   label: 'Rentabilidad',    emoji: '🚦', color: '#30D158' },
  { id: 'cobros',         label: 'Cobros y abonos', emoji: '💶', color: '#FF9F0A' },
  { id: 'fiscal',         label: 'Impuestos',       emoji: '🧾', color: '#BF5AF2' },
  { id: 'suscripciones',  label: 'Suscripciones',   emoji: '🔁', color: '#64D2FF' },
  { id: 'productividad',  label: 'Horas y tiempo',  emoji: '⏱️', color: '#FF453A' },
];

export const HELP_ARTICLES: HelpArticle[] = [
  // ──────────────────────────────────────────────────────────────────────────
  // EMPEZAR
  // ──────────────────────────────────────────────────────────────────────────
  {
    id:            'primeros-pasos',
    category:      'empezar',
    title:         'Primeros 10 minutos en Gainora',
    summary:       'Lo mínimo que necesitas hacer para que el dashboard te diga la verdad.',
    relatedRoutes: ['/dashboard'],
    readingTime:   '3 min',
    blocks: [
      { type: 'p', content: 'Gainora solo es útil si los datos son reales. Y los datos reales necesitan que tú los metas. La buena noticia: solo tienes que hacerlo una vez para los costes fijos, y unos pocos minutos al día para las horas.' },
      { type: 'h3', content: 'Paso 1 — Mete tus costes fijos' },
      { type: 'p', content: 'Son los gastos que pagas independientemente de si trabajas o no: alquiler, software, gestoría, internet, móvil, seguros... Sin esto, Gainora no puede calcular tu coste por hora real.' },
      { type: 'tip', content: 'No hace falta que sean exactos al céntimo. Una aproximación es 100 veces mejor que dejarlo vacío.' },
      { type: 'h3', content: 'Paso 2 — Crea tu primer cliente y proyecto' },
      { type: 'p', content: 'Cliente = la persona o empresa que te paga. Proyecto = el trabajo concreto que haces para ese cliente. Un cliente puede tener varios proyectos.' },
      { type: 'h3', content: 'Paso 3 — Ficha las horas que dediques' },
      { type: 'p', content: 'Usa el timer de la sección "Horas" o añádelas manualmente al final del día. Cada hora fichada se asocia a un proyecto y entra en el cálculo de rentabilidad.' },
      { type: 'h3', content: 'Paso 4 — Mira el dashboard una vez por semana' },
      { type: 'p', content: 'Esto es lo que de verdad cambia el juego: dedicar 5 minutos cada lunes a ver cómo va el mes. Cuanto antes detectes un proyecto en rojo, más margen tienes para reaccionar.' },
    ],
    related: ['como-funciona-tarifa', 'como-leer-semaforo'],
  },
  {
    id:            'como-funciona-tarifa',
    category:      'rentabilidad',
    title:         'Cómo funciona la "Tarifa mínima" del dashboard',
    summary:       'El número que te dice cuánto tienes que cobrar la hora para no trabajar gratis.',
    relatedRoutes: ['/dashboard'],
    readingTime:   '4 min',
    blocks: [
      { type: 'p', content: 'La tarifa mínima es el precio por hora que necesitas cobrar para cubrir todos tus gastos y tener un margen mínimo decente. Si cobras menos, estás pagando por trabajar.' },
      { type: 'h3', content: 'La fórmula' },
      { type: 'example', content: 'Tarifa mínima = (coste por hora real) × (1 + margen objetivo)' },
      { type: 'p', content: 'El "coste por hora real" se calcula así: Gainora suma todos tus costes fijos del mes y los divide entre las horas que tú declaras que puedes trabajar. Eso da el coste de cada hora antes de ganar nada.' },
      { type: 'p', content: 'Después le suma un margen objetivo (por defecto 30%) que es lo que tú ganas. Resultado: si tu coste por hora son 25 €, la tarifa mínima es 32,50 €.' },
      { type: 'h3', content: '¿Por qué cambia tanto?' },
      { type: 'p', content: 'Cambia con dos cosas: tus costes fijos del mes y la "capacidad planificada" (las horas al mes que dices que puedes trabajar). Si bajas tus costes o subes tu capacidad, la tarifa mínima baja.' },
      { type: 'note', content: 'Configura tu capacidad y margen en Ajustes → Capacidad y rentabilidad. Por defecto están en 160 h/mes y 30 % — son sensatos para un autónomo a tiempo completo.' },
      { type: 'h3', content: '¿Qué hago con este número?' },
      { type: 'list', content: [
        'Antes de presupuestar a un cliente, divide el presupuesto entre las horas estimadas. Si te sale por debajo de la tarifa mínima, no aceptes (o sube precio).',
        'Si llevas meses cobrando por debajo, plantéate subir tarifas. Es la decisión que más impacta tu negocio.',
        'Si tus costes han subido, comprueba que la tarifa mínima sigue cuadrando con lo que cobras.',
      ]},
    ],
    related: ['como-leer-semaforo', 'modos-calculo'],
  },
  {
    id:            'como-leer-semaforo',
    category:      'rentabilidad',
    title:         'El semáforo de rentabilidad: 3 colores, 1 mensaje',
    summary:       'Verde, amarillo, rojo. Sin tecnicismos, sin gráficos raros.',
    relatedRoutes: ['/dashboard', '/proyectos'],
    readingTime:   '2 min',
    blocks: [
      { type: 'p', content: 'Cada proyecto y el negocio entero tienen un color que te dice cómo va sin que tengas que leer nada. Lo verás en el dashboard y en cada ficha de proyecto.' },
      { type: 'list', content: [
        '🟢 Verde — Margen mayor del 20%. Vas bien, sigue así.',
        '🟡 Amarillo — Entre 10% y 20%. Ajustado. Cuidado con imprevistos o clientes que pidan extras.',
        '🔴 Rojo — Por debajo del 10% (o negativo). Estás perdiendo o casi. Hay que actuar: subir precio, reducir horas, renegociar o aprender la lección para el siguiente.',
      ]},
      { type: 'tip', content: 'Si un proyecto está en rojo y aún no has terminado, todavía puedes actuar. Si está en rojo y ya entregaste, al menos sabes qué tipo de proyecto evitar la próxima vez.' },
    ],
    related: ['como-funciona-tarifa'],
  },
  {
    id:            'modos-calculo',
    category:      'rentabilidad',
    title:         'Modo "Absorción" vs "Contribución": cuál usar',
    summary:       'Dos formas de repartir los costes fijos entre tus proyectos. La elección importa.',
    relatedRoutes: ['/ajustes', '/dashboard'],
    readingTime:   '3 min',
    blocks: [
      { type: 'p', content: 'Cuando calculas si un proyecto es rentable, hay que decidir cómo "repartir" tus costes fijos (alquiler, software, gestoría) entre los distintos proyectos. Gainora te deja elegir entre dos formas.' },
      { type: 'h3', content: 'Absorción (por defecto)' },
      { type: 'p', content: 'Cada proyecto absorbe parte de los costes fijos en proporción a las horas que le dedicas. Si trabajas 100 h en el mes y 60 son del proyecto A, ese proyecto se "come" el 60% del alquiler, software, etc.' },
      { type: 'p', content: 'Te dice si el proyecto es rentable de verdad, contando con todo. Es lo que usaría un contable serio.' },
      { type: 'h3', content: 'Contribución' },
      { type: 'p', content: 'Cada proyecto solo carga sus costes directos (subcontrataciones, materiales). Los fijos no se reparten. El "margen" que ves es lo que el proyecto aporta a cubrir los fijos.' },
      { type: 'p', content: 'Útil cuando tienes un cliente grande que cubre todos los fijos y otros pequeños — quieres ver cuánto contribuye cada uno extra, no cargarlos con un alquiler que ya está pagado.' },
      { type: 'note', content: 'Si tienes dudas, deja Absorción. Es lo más conservador y lo que más fácil te alerta de proyectos que pierden dinero.' },
    ],
    related: ['como-funciona-tarifa'],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // COBROS
  // ──────────────────────────────────────────────────────────────────────────
  {
    id:            'que-es-cobro',
    category:      'cobros',
    title:         '¿Qué es un cobro y cómo lo registro?',
    summary:       'Un cobro = un cargo que esperas recibir. Aquí los gestionas todos.',
    relatedRoutes: ['/cobros'],
    readingTime:   '3 min',
    blocks: [
      { type: 'p', content: 'En Gainora, "cobro" es cada cantidad que un cliente te tiene que pagar. Puede ser un proyecto cerrado, una mensualidad de suscripción o una bolsa de horas.' },
      { type: 'h3', content: 'De dónde salen los cobros' },
      { type: 'list', content: [
        'Si tienes una suscripción mensual: Gainora genera el cobro automáticamente cada mes (cron diario a las 03:00).',
        'Si tienes un proyecto cerrado: el cobro se crea cuando termines y des por bueno el contrato.',
        'También puedes crear un cobro manual desde el contrato o desde la ficha del proyecto.',
      ]},
      { type: 'h3', content: 'Estados del cobro' },
      { type: 'list', content: [
        '🟠 Pendiente — Aún no te ha pagado nada el cliente.',
        '🔵 Parcial — El cliente ha hecho un abono parcial. Queda dinero pendiente.',
        '🟢 Pagado — El total está cobrado.',
      ]},
      { type: 'h3', content: 'Registrar un abono' },
      { type: 'p', content: 'Pulsa "Cobrar" en cualquier cobro. Indica cuánto te ha pagado, cuándo, por qué método (transferencia, tarjeta, efectivo) y opcionalmente la referencia bancaria. Gainora recalcula automáticamente lo que queda pendiente.' },
      { type: 'tip', content: 'Si activas el toggle "Generar factura cuando se complete el pago", al registrar el último abono se crea automáticamente una factura legal con número correlativo.' },
    ],
    related: ['cobros-net-vs-bruto', 'que-es-factura'],
  },
  {
    id:            'cobros-net-vs-bruto',
    category:      'cobros',
    title:         '¿Neto o bruto? Por qué los números cambian',
    summary:       'El IVA confunde. Aquí te explicamos qué número mirar y cuándo.',
    relatedRoutes: ['/cobros', '/dashboard'],
    readingTime:   '2 min',
    blocks: [
      { type: 'p', content: 'En la página de Cobros tienes un toggle "Neto / Bruto" arriba a la derecha. Cambia los números que se muestran. ¿Qué significa cada uno?' },
      { type: 'list', content: [
        'NETO (sin IVA): el dinero que de verdad es tuyo. Lo que entra a tu negocio.',
        'BRUTO (con IVA): la cantidad total que cobras al cliente. El IVA es para Hacienda, no es tuyo.',
      ]},
      { type: 'example', content: 'Cobras 121 € a un cliente con IVA 21%. Neto: 100 €. IVA: 21 €. Bruto: 121 €.' },
      { type: 'note', content: 'Por defecto verás el NETO porque es tu ingreso real. Cambia a BRUTO solo si necesitas saber el total facturado (por ejemplo para conciliar con tu cuenta bancaria).' },
      { type: 'tip', content: 'Si en el contrato marcas "El precio ya incluye IVA", el sistema asume que el precio que pones es el bruto. Si no, asume que es neto y le suma el IVA por encima.' },
    ],
    related: ['que-es-cobro', 'iva-y-irpf'],
  },
  {
    id:            'morosidad',
    category:      'cobros',
    title:         'Salud de cobros: DSO y morosidad',
    summary:       'Quién te paga rápido y quién no. El gráfico que más tarde te ahorrará dinero.',
    relatedRoutes: ['/dashboard'],
    readingTime:   '2 min',
    blocks: [
      { type: 'p', content: 'En el dashboard, debajo de los proyectos, encontrarás la sección "Salud de cobros". Te dice cuánto tardan tus clientes en pagarte.' },
      { type: 'h3', content: 'DSO global' },
      { type: 'p', content: 'DSO = Days Sales Outstanding. Es el promedio de días que tarda en convertirse una factura emitida en dinero en tu cuenta. 30 días es saludable; 60+ ya es preocupante; 90+ es una alerta roja.' },
      { type: 'h3', content: 'Pendiente por antigüedad' },
      { type: 'p', content: 'Cuatro barras de colores que te dicen cuánto dinero llevas pendiente y desde cuándo. Las barras rojas (90+ días) son las primeras que tienes que reclamar.' },
      { type: 'h3', content: 'Top clientes lentos' },
      { type: 'p', content: 'Los 3 clientes que más tardan en pagarte. Si uno aparece consistentemente, plantéate pedir un anticipo en el siguiente proyecto.' },
    ],
    related: ['que-es-cobro'],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // FISCAL
  // ──────────────────────────────────────────────────────────────────────────
  {
    id:            'iva-y-irpf',
    category:      'fiscal',
    title:         'IVA e IRPF explicados como si tu sobrina te lo preguntara',
    summary:       'Dos impuestos que aparecen en cada factura. Sin jerga.',
    relatedRoutes: ['/cobros', '/facturas', '/contratos'],
    readingTime:   '4 min',
    blocks: [
      { type: 'h3', content: 'IVA: el impuesto del cliente' },
      { type: 'p', content: 'Cuando facturas, le añades un IVA al precio. Por defecto en España es 21 %, pero hay actividades con 10 % (libros, ciertos servicios) o 4 % (productos básicos).' },
      { type: 'p', content: 'Ese IVA NO es tuyo. Lo cobras al cliente y se lo pasas a Hacienda cada trimestre con el modelo 303. De los 121 € que cobras, 21 € son para Hacienda.' },
      { type: 'tip', content: 'Si compras algo para tu negocio (software, materiales), el IVA que tú pagaste se lo restas a lo que tienes que entregar. Eso es el "IVA deducible".' },
      { type: 'h3', content: 'IRPF: el impuesto sobre tus ingresos' },
      { type: 'p', content: 'Si facturas a otra empresa o profesional (B2B), tu cliente te retiene un porcentaje y se lo entrega directamente a Hacienda en tu nombre. Es un "anticipo" del IRPF que pagarás en la declaración de la renta.' },
      { type: 'list', content: [
        '15 % es la retención estándar para profesionales.',
        '7 % los primeros 3 años desde que te diste de alta como autónomo (nuevos autónomos).',
        '0 % si facturas a un particular (B2C) — los particulares no retienen.',
      ]},
      { type: 'example', content: 'Facturas 1.000 € + IVA 21 % = 1.210 €. Si aplicas IRPF 15 %, restas 150 €. El cliente te paga 1.060 € y entrega 150 € a Hacienda en tu nombre.' },
      { type: 'note', content: 'Configura el IRPF por contrato en la ficha del contrato. Por defecto está vacío (no se aplica). Si trabajas con empresas, márcalo siempre.' },
    ],
    related: ['que-es-factura', 'tarjetas-fiscales'],
  },
  {
    id:            'que-es-factura',
    category:      'fiscal',
    title:         'Facturas: estructura legal en España',
    summary:       'Por qué necesitas un número correlativo y qué tiene que llevar el PDF.',
    relatedRoutes: ['/facturas'],
    readingTime:   '3 min',
    blocks: [
      { type: 'p', content: 'Una factura no es un recibo cualquiera. Tiene requisitos legales que la AEAT (Agencia Tributaria) puede inspeccionar. Si te falta algo, multa.' },
      { type: 'h3', content: 'Lo que tiene que llevar siempre' },
      { type: 'list', content: [
        'Número correlativo único (sin saltos) dentro de una serie. Gainora los genera atómicamente para que dos facturas no compartan número.',
        'Fecha de emisión y fecha de vencimiento.',
        'Datos del emisor (tú): nombre completo o razón social, NIF, dirección.',
        'Datos del receptor (cliente): nombre, NIF si es empresa, dirección.',
        'Concepto de cada línea, cantidad y precio unitario.',
        'Tipo de IVA aplicado a cada línea (puede haber varios en la misma factura).',
        'Retención IRPF si aplica.',
        'Total a pagar.',
      ]},
      { type: 'h3', content: 'Series de numeración' },
      { type: 'p', content: 'En Gainora empiezas con una sola serie ("A" — General). Si necesitas separar tipos de facturas (rectificativas, simplificadas, distinta actividad) puedes crear más series desde Ajustes → Facturación.' },
      { type: 'h3', content: 'Anular una factura: usar rectificativa, no borrar' },
      { type: 'warn', content: 'Una factura emitida NO se puede borrar legalmente. Si te equivocaste, debes emitir una factura RECTIFICATIVA con importes negativos que cancele la original. Gainora lo hace por ti con el botón "Anular": marca la original como anulada y emite la rectificativa automáticamente.' },
    ],
    related: ['iva-y-irpf', 'tarjetas-fiscales'],
  },
  {
    id:            'tarjetas-fiscales',
    category:      'fiscal',
    title:         'Resumen del trimestre: lo que tendrás que declarar',
    summary:       'Modelo 303 (IVA) y modelo 130 (IRPF) explicados con tus números reales.',
    relatedRoutes: ['/informes'],
    readingTime:   '4 min',
    blocks: [
      { type: 'p', content: 'En "Informes" → "Tu trimestre fiscal" encontrarás un resumen con los números que de verdad necesitas para hacer (o pasar a tu gestor) las declaraciones trimestrales.' },
      { type: 'h3', content: 'Modelo 303 — IVA' },
      { type: 'p', content: 'Es la declaración trimestral del IVA. Se presenta los 20 primeros días de abril, julio, octubre y enero.' },
      { type: 'list', content: [
        'IVA repercutido = el IVA que TÚ has cobrado a tus clientes en facturas emitidas.',
        'IVA soportado deducible = el IVA que TÚ has pagado en compras y gastos del negocio.',
        'A pagar = repercutido − soportado. Si sale negativo, te lo compensan en el siguiente trimestre.',
      ]},
      { type: 'h3', content: 'Modelo 130 — Pago fraccionado IRPF' },
      { type: 'p', content: 'Es un anticipo del IRPF anual. Se presenta también trimestral, a 20 días del fin de trimestre.' },
      { type: 'list', content: [
        'Sirve para pagar el 20% del beneficio (ingresos − gastos) cada trimestre.',
        'Si más del 70% de tus facturas llevan retención IRPF, no estás obligado a presentarlo (la retención ya cubre).',
      ]},
      { type: 'warn', content: 'Gainora te da los NÚMEROS pero NO presenta la declaración a la AEAT. Esa parte se hace en la web de Hacienda o se pasa a un gestor. El objetivo de la app es que tengas los datos correctos en la mano sin escarbar en Excel.' },
      { type: 'note', content: 'Para declarar bien necesitas tener AL DÍA: facturas emitidas (con IVA correcto), pagos con su fecha real (criterio caja vs devengo), y costes fijos / variables marcados como deducibles.' },
    ],
    related: ['iva-y-irpf', 'que-es-factura'],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // SUSCRIPCIONES
  // ──────────────────────────────────────────────────────────────────────────
  {
    id:            'que-es-suscripcion',
    category:      'suscripciones',
    title:         'Suscripciones recurrentes: cómo funcionan',
    summary:       'Si cobras una cuota fija periódica, esto es lo que necesitas saber.',
    relatedRoutes: ['/proyectos', '/cobros'],
    readingTime:   '3 min',
    blocks: [
      { type: 'p', content: 'Una suscripción es un contrato que genera cobros automáticamente cada cierto tiempo: mensual, trimestral o anual. Útil si vendes mantenimiento, hosting, soporte, alquiler de equipos, etc.' },
      { type: 'h3', content: 'Cómo crearla' },
      { type: 'p', content: 'Desde el detalle de un proyecto, pestaña "Contratos" → "Nuevo contrato". Elige Modo de cobro: Suscripción. Indica precio, frecuencia, día de cobro (1-28) y la fecha de inicio.' },
      { type: 'h3', content: 'Generación automática' },
      { type: 'p', content: 'Cada noche a las 03:00 (hora Madrid), Gainora revisa todas las suscripciones activas y genera los cobros pendientes. Si activaste una suscripción hace 3 meses y nunca la abriste, al volver verás los 3 cobros generados, sin perder ninguno.' },
      { type: 'h3', content: 'Prorrateo del primer y último mes' },
      { type: 'p', content: 'Si una suscripción mensual empieza el día 15, el primer cobro será proporcional (la mitad del mes). Igual al cancelar a mitad de periodo. No te tienes que preocupar.' },
      { type: 'h3', content: 'Pausar o cancelar' },
      { type: 'p', content: 'Desde la ficha del contrato puedes cambiar el estado a "Pausado" (no genera cobros mientras esté pausado) o "Cancelado" (con fecha de fin, no genera más cobros y se cierra el ciclo).' },
      { type: 'tip', content: 'Si cambias el precio de un contrato existente, los cobros ya creados NO se actualizan automáticamente. Usa el botón "Regenerar" en cada cobro PENDIENTE para recalcularlo con el precio nuevo.' },
    ],
    related: ['planes-vs-contratos', 'que-es-cobro'],
  },
  {
    id:            'planes-vs-contratos',
    category:      'suscripciones',
    title:         'Planes vs Contratos: ¿qué es cada cosa?',
    summary:       'Plan = plantilla. Contrato = instancia para un cliente. Una decisión que ahorra tiempo.',
    relatedRoutes: ['/planes', '/proyectos'],
    readingTime:   '2 min',
    blocks: [
      { type: 'h3', content: 'Plan = plantilla reutilizable' },
      { type: 'p', content: 'Un Plan es una plantilla que defines una vez. Por ejemplo: "Mantenimiento Pro" con cuota 99 €/mes, IVA 21%, 5 horas/mes incluidas. Lo creas en la sección "Planes".' },
      { type: 'h3', content: 'Contrato = instancia para un cliente' },
      { type: 'p', content: 'Cuando creas un contrato para un cliente concreto, puedes elegir un Plan como base. El Plan rellena automáticamente todos los campos. Después puedes cambiar lo que quieras a nivel del Contrato sin afectar al Plan.' },
      { type: 'note', content: 'Esto te permite tener "tarifas oficiales" (Planes) pero hacer excepciones por cliente (Contrato) sin liarte. Si subes el precio del Plan, los Contratos antiguos siguen igual; solo los nuevos heredan el precio actualizado.' },
    ],
    related: ['que-es-suscripcion'],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // PRODUCTIVIDAD
  // ──────────────────────────────────────────────────────────────────────────
  {
    id:            'fichar-horas',
    category:      'productividad',
    title:         'Cómo fichar horas (timer y manual)',
    summary:       'Dos formas de meter horas. La mejor es la que de verdad uses.',
    relatedRoutes: ['/horas'],
    readingTime:   '2 min',
    blocks: [
      { type: 'h3', content: 'Modo timer' },
      { type: 'p', content: 'Pulsa "Iniciar timer" cuando empieces a trabajar en un proyecto. Gainora empieza a contar segundos. Cuando termines, pulsa "Parar y guardar". El timer se mantiene aunque cierres el navegador (se guarda en local).' },
      { type: 'h3', content: 'Modo manual' },
      { type: 'p', content: 'Si te olvidaste de fichar o prefieres anotar al final del día, puedes añadir una entrada manual con fecha, hora de inicio, hora de fin y una descripción. También puedes usar "Modo duración" e indicar solo cuántas horas dedicaste, sin hora exacta.' },
      { type: 'tip', content: 'Marca cada entrada como "Facturable" o "No facturable" según si vas a cobrarla. El dashboard muestra los KPIs separados.' },
    ],
  },
  {
    id:            'utilizacion',
    category:      'productividad',
    title:         '¿Qué es la "utilización" y por qué importa?',
    summary:       'Cuánto de tu tiempo va a proyectos que pagas. El KPI que más se ignora.',
    relatedRoutes: ['/dashboard'],
    readingTime:   '2 min',
    blocks: [
      { type: 'p', content: 'Utilización = horas facturables / horas de capacidad planificada × 100. Te dice qué porcentaje de tu tiempo declarado se convierte en dinero.' },
      { type: 'example', content: 'Capacidad: 160 h/mes. Has fichado 100 horas facturables y 30 administrativas. Utilización: 100/160 = 62%.' },
      { type: 'h3', content: 'Por qué importa' },
      { type: 'list', content: [
        'Si tu utilización es < 50% durante meses, o cobras barato o tienes demasiados huecos vacíos.',
        'Si es > 90% sostenido, estás al límite. Riesgo de quemarte. Sube precios o subcontrata.',
        'Si es > 100%, estás contando más horas de las que dijiste que podías. Ajusta tu capacidad planificada en Ajustes.',
      ]},
    ],
    related: ['como-funciona-tarifa'],
  },
];

/**
 * Devuelve el artículo más relevante para una ruta concreta.
 * Si no hay match, devuelve el de "primeros pasos".
 */
export function articleForRoute(route: string): HelpArticle {
  const found = HELP_ARTICLES.find((a) => a.relatedRoutes.some((r) => route.startsWith(r)));
  return found ?? HELP_ARTICLES[0];
}
