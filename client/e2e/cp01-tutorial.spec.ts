import { test, expect } from '@playwright/test';
import { login, loginThenOpenTutorial, trackConsole } from './_helpers';

/**
 * CP1 — Tutorial de bienvenida
 *  · Crítico: <60s desde "Empezar" hasta proyecto creado.
 *  · 4 pantallas: persona, primer proyecto, configurado, fin.
 *  · Skip funciona en cualquier paso.
 *  · Modo "trying" salta la pantalla 2.
 */
test.describe('CP1 — Tutorial', () => {
  test('flujo principal: persona "solo" → cliente+proyecto creado <60s', async ({ page }) => {
    const errors = trackConsole(page);
    await loginThenOpenTutorial(page);

    // Pantalla 0 — persona
    await expect(page.getByRole('heading', { name: /vamos a configurar/i })).toBeVisible();
    await expect(page.getByText(/cómo trabajas ahora/i)).toBeVisible();

    // Verifica las 3 cards de persona
    const card1 = page.getByRole('button', { name: /solo, varios clientes pequeños/i });
    const card2 = page.getByRole('button', { name: /un cliente grande/i });
    const card3 = page.getByRole('button', { name: /empiezo de cero/i });
    await expect(card1).toBeVisible();
    await expect(card2).toBeVisible();
    await expect(card3).toBeVisible();

    // CRONÓMETRO
    const t0 = Date.now();
    await card1.click();

    // Pantalla 1 — primer proyecto
    await expect(page.getByRole('heading', { name: /tu primer cliente y proyecto/i })).toBeVisible();
    // Restringimos al diálogo del wizard para evitar colisión con la nav del
    // sidebar (que tiene aria-label="Proyectos").
    const dialog = page.locator('[role="dialog"][aria-label="Tutorial de bienvenida"]');
    await dialog.getByLabel('Cliente').fill(`QA Cliente ${Date.now() % 10000}`);
    await dialog.getByLabel('Proyecto / trabajo').fill(`QA Proyecto ${Date.now() % 10000}`);
    // Modo cobro: por defecto FIXED. Lo dejamos.
    await dialog.getByLabel(/cuánto te paga/i).fill('1500');
    await dialog.getByRole('button', { name: /^empezar$/i }).click();

    // Pantalla 2 — configurado
    await expect(page.getByRole('heading', { name: /^configurado$/i })).toBeVisible({ timeout: 8000 });
    const t1 = Date.now();
    const seconds = Math.round((t1 - t0) / 1000);
    console.log(`[CP1] tiempo para crear primer proyecto: ${seconds}s`);

    await page.getByRole('button', { name: /continuar/i }).click();

    // Pantalla 3 — todo tuyo
    await expect(page.getByRole('heading', { name: /todo tuyo/i })).toBeVisible();

    await page.getByRole('button', { name: /entrar al dashboard/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    expect(seconds, 'tutorial debería completarse en <60s').toBeLessThan(60);
    expect(errors, 'sin errores de consola').toEqual([]);
  });

  test('modo "trying" salta pantalla de proyecto', async ({ page }) => {
    await loginThenOpenTutorial(page);

    await page.getByRole('button', { name: /empiezo de cero/i }).click();

    // El wizard llama a /demo/seed; mientras carga muestra "Cargando datos…",
    // luego "Listo para explorar" si OK o "No pudimos cargar..." si falla.
    // Cualquiera de los tres confirma que saltó pantalla 2 (no fue a la de proyecto).
    await expect(
      page.getByRole('heading', {
        name: /(cargando datos de ejemplo|listo para explorar|configurado para explorar|no pudimos cargar)/i,
      })
    ).toBeVisible({ timeout: 10_000 });
  });

  test('botón Saltar cierra el wizard', async ({ page }) => {
    await loginThenOpenTutorial(page);

    await expect(page.getByRole('heading', { name: /vamos a configurar/i })).toBeVisible();
    await page.locator('[role="dialog"] button[aria-label="Saltar tutorial"]').click();
    await expect(page.getByRole('heading', { name: /vamos a configurar/i })).not.toBeVisible({ timeout: 3000 });
  });

  // Regresión del bug H reportado por Claude-Chrome (2026-04-28):
  // hacer "trying" primero dejaba demoSeeded=true en estado React; al
  // reabrir el wizard y elegir "solo" la pantalla "Todo tuyo" mostraba
  // los bullets de explorar la demo en vez de "Lo primero que conviene hacer".
  test('regresión H — "solo" tras "trying" muestra bullets correctos', async ({ page }) => {
    await loginThenOpenTutorial(page);

    // Primer pase: trying → llega hasta "Todo tuyo"
    await page.getByRole('button', { name: /empiezo de cero/i }).click();
    // Espera la pantalla 2 (cualquiera de los estados)
    await expect(
      page.getByRole('heading', {
        name: /(cargando datos de ejemplo|listo para explorar|configurado para explorar|no pudimos cargar)/i,
      }),
    ).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: /continuar/i }).click();
    // Pantalla 3: "Todo tuyo" con bullets demo
    await expect(page.getByText(/para empezar a explorar/i)).toBeVisible({ timeout: 5000 });

    // Cerrar
    await page.locator('[role="dialog"] button[aria-label="Saltar tutorial"]').click();

    // Segundo pase: reabrir y elegir "solo"
    await page.evaluate(() => localStorage.removeItem('hp_onboarding_done'));
    await page.getByRole('button', { name: /repetir tutorial|cómo usar horaspro/i }).click();
    await page.waitForSelector('[role="dialog"][aria-label="Tutorial de bienvenida"]');
    await page.getByRole('button', { name: /solo, varios clientes pequeños/i }).click();

    // Pantalla 1: rellenar
    const dialog = page.locator('[role="dialog"][aria-label="Tutorial de bienvenida"]');
    await dialog.getByLabel('Cliente').fill(`QA Reg ${Date.now() % 10000}`);
    await dialog.getByLabel('Proyecto / trabajo').fill(`Test reg ${Date.now() % 10000}`);
    await dialog.getByLabel(/cuánto te paga/i).fill('500');
    await dialog.getByRole('button', { name: /^empezar$/i }).click();

    // Pantalla 2 "Configurado", continuar
    await expect(page.getByRole('heading', { name: /^configurado$/i })).toBeVisible({ timeout: 8000 });
    await page.getByRole('button', { name: /continuar/i }).click();

    // Pantalla 3 "Todo tuyo" — DEBE mostrar bullets normales, NO los de demo
    await expect(page.getByText(/lo primero que conviene hacer/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/para empezar a explorar/i)).not.toBeVisible();
    // Y los bullets concretos del flow normal:
    await expect(page.getByText(/fichar tu primera hora/i)).toBeVisible();
  });
});
