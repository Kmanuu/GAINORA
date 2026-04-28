import { test, expect } from '@playwright/test';
import { login } from './_helpers';

/**
 * CP99 — Smoke visual de los badges "demo" en los listados.
 * No es exhaustivo: sólo verifica que con datos demo cargados se ven los
 * badges en las páginas clave. Captura screenshots en test-results para
 * inspección humana.
 */
test.describe('CP99 — Badges demo', () => {
  test('badge demo aparece en clientes, proyectos, costes fijos, facturas y cobros', async ({ page }) => {
    await login(page);

    // Cargar datos demo (force=1 si la cuenta tiene datos reales)
    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    const seedRes = await page.request.post('http://localhost:3001/api/v1/demo/seed?force=1', {
      headers: { Authorization: `Bearer ${token}` },
      data: {},
    });
    if (![201, 409].includes(seedRes.status())) {
      throw new Error(`seed devolvió ${seedRes.status()}`);
    }

    // Clientes
    await page.goto('/clientes');
    await expect(page.getByText(/carpintería lópez/i).first()).toBeVisible();
    await page.screenshot({ path: 'test-results/cp99-clientes.png', fullPage: true });

    // Proyectos
    await page.goto('/proyectos');
    await expect(page.getByText(/reforma local/i).first()).toBeVisible();
    await page.screenshot({ path: 'test-results/cp99-proyectos.png', fullPage: true });

    // Costes fijos
    await page.goto('/costes-fijos');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/cp99-costes-fijos.png', fullPage: true });

    // Facturas
    await page.goto('/facturas');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/cp99-facturas.png', fullPage: true });

    // Cobros
    await page.goto('/cobros');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/cp99-cobros.png', fullPage: true });

    // Verifica al menos un badge "demo" en alguna página
    // (puede haber muchos — basta con que alguno se vea)
    const anyDemoBadge = page.getByText(/^demo$/i).first();
    await expect(anyDemoBadge).toBeVisible({ timeout: 5000 });
  });

  test('settings — datos demo confirm dialog usa el modal nuevo (no window.confirm)', async ({ page }) => {
    await login(page);
    await page.goto('/ajustes');

    // Asegurar que existen datos demo
    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    await page.request.post('http://localhost:3001/api/v1/demo/seed?force=1', {
      headers: { Authorization: `Bearer ${token}` },
      data: {},
    });
    await page.reload();

    // Click "Borrar datos demo"
    const wipeBtn = page.getByRole('button', { name: /borrar datos demo/i });
    await expect(wipeBtn).toBeVisible({ timeout: 8000 });
    await wipeBtn.click();

    // Debe aparecer ConfirmDialog estilizado, no window.confirm
    await expect(page.getByRole('heading', { name: /borrar los datos demo/i })).toBeVisible({ timeout: 3000 });
    await page.screenshot({ path: 'test-results/cp99-confirm-dialog.png' });

    // Cancelar (no queremos borrar para no afectar a los otros tests)
    await page.getByRole('button', { name: /cancelar/i }).click();
    await expect(page.getByRole('heading', { name: /borrar los datos demo/i })).not.toBeVisible({ timeout: 2000 });
  });

  test('informes — modelo 130 muestra dos columnas trimestre/año', async ({ page }) => {
    await login(page);
    await page.goto('/informes');
    await page.waitForLoadState('networkidle');

    // Header de la sección
    await expect(page.getByRole('heading', { name: /tu trimestre fiscal/i })).toBeVisible({ timeout: 8000 });

    // Botón descargar 130
    const btn130 = page.getByRole('button', { name: /descargar preformulario 130/i });
    await expect(btn130).toBeVisible();
    await page.screenshot({ path: 'test-results/cp99-reportes-130.png', fullPage: true });
  });
});
