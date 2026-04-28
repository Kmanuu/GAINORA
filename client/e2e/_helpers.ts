import type { Page } from '@playwright/test';

/**
 * Login con seed agencia-demo.
 * Por defecto marca hp_onboarding_done=true para evitar que el wizard
 * se autoabra (interfiere con tests). Los tests del tutorial usan
 * `loginThenOpenTutorial` para forzar reaparición.
 */
export async function login(page: Page) {
  await page.goto('/login');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('hp_onboarding_done', 'true');
  });
  await page.reload();
  await page.waitForLoadState('domcontentloaded');

  await page.getByRole('textbox', { name: 'Correo electrónico' }).fill('owner@agencia-demo.com');
  await page.getByRole('textbox', { name: 'Contraseña' }).fill('password123');
  await page.getByRole('button', { name: /Entrar a/i }).click();

  await page.waitForURL(/\/(dashboard|proyectos)/, { timeout: 10_000 });

  // Defensivo: si por timing el wizard se coló, ciérralo.
  await dismissOnboardingIfPresent(page);
}

/**
 * Login + apertura del tutorial desde el sidebar (forzando reaparición).
 */
export async function loginThenOpenTutorial(page: Page) {
  await login(page);
  await page.evaluate(() => localStorage.removeItem('hp_onboarding_done'));
  // El botón en el sidebar se renombró a "Repetir tutorial" (antes "Cómo usar HorasPRO").
  await page.getByRole('button', { name: /repetir tutorial|cómo usar horaspro/i }).click();
  await page.waitForSelector('[role="dialog"][aria-label="Tutorial de bienvenida"]', { timeout: 5000 });
}

/**
 * Cierra el wizard de onboarding si aparece.
 */
export async function dismissOnboardingIfPresent(page: Page) {
  const dialog = page.locator('[role="dialog"][aria-label="Tutorial de bienvenida"]');
  try {
    await dialog.waitFor({ state: 'visible', timeout: 1500 });
    await page.locator('[role="dialog"] button[aria-label="Saltar tutorial"]').click();
    await dialog.waitFor({ state: 'hidden', timeout: 3000 });
  } catch {
    // no estaba presente
  }
}

/** Captura errores de consola, filtrando 401 pre-auth y extensiones. */
export function trackConsole(page: Page) {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (/401|Unauthorized|chrome-extension|favicon|Failed to load resource/i.test(text)) return;
    errors.push(text);
  });
  page.on('pageerror', (err) => {
    errors.push('PAGE ERROR: ' + err.message);
  });
  return errors;
}
