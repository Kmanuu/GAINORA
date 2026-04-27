import { test, expect } from '@playwright/test';
import { login, trackConsole } from './_helpers';

test.describe('CP2 — PlansPage', () => {
  test('lista, crear, archivar, reactivar, eliminar', async ({ page }) => {
    const errors = trackConsole(page);
    await login(page);
    await page.goto('/planes');

    // Lista carga con seed (Free, Pro, Max)
    await expect(page.getByRole('heading', { name: /catálogo de planes/i })).toBeVisible();
    await expect(page.getByText('Free')).toBeVisible();
    await expect(page.getByText('Pro').first()).toBeVisible();
    await expect(page.getByText('Max')).toBeVisible();

    // Verificar labels de tier en español: Básico, Pro, Élite
    // (Cards seed: Free→Básico, Pro→Pro, Max→Élite)
    await expect(page.getByText('Básico').first()).toBeVisible();
    await expect(page.getByText('Élite').first()).toBeVisible();

    // Crear nuevo plan
    const planName = `QA Plan ${Date.now() % 100000}`;
    await page.getByRole('button', { name: /^nuevo plan$/i }).click();
    await page.getByRole('textbox', { name: /nombre del plan/i }).fill(planName);
    await page.getByLabel(/^nivel$/i).selectOption('PRO');
    // Modo facturación default es SUBSCRIPTION (suscripción)
    await page.getByRole('spinbutton', { name: /cuota/i }).fill('99.90');

    // Añadir 3 features
    const featureInput = page.getByPlaceholder(/añade una característica/i);
    for (const f of ['soporte', 'ssl', 'backups']) {
      await featureInput.fill(f);
      await featureInput.press('Enter');
    }

    // Avanzado → JSON limits
    await page.getByRole('button', { name: /^avanzado$/i }).click();
    const limitsTextarea = page.getByRole('textbox', { name: /límites/i });
    await limitsTextarea.fill('{"max_contracts": 10}');

    await page.getByRole('button', { name: /^crear plan$/i }).click();
    await expect(page.getByText(/plan creado/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('heading', { name: planName, level: 3 })).toBeVisible();

    // Verificar chips de features
    const newCard = page.locator('div').filter({ has: page.getByRole('heading', { name: planName, level: 3 }) }).first();
    await expect(newCard.getByText('soporte')).toBeVisible();
    await expect(newCard.getByText('ssl')).toBeVisible();
    await expect(newCard.getByText('backups')).toBeVisible();

    // Archivar
    await newCard.getByRole('button').last().click(); // 3 puntos
    await page.getByRole('button', { name: /^archivar$/i }).click();
    // ConfirmDialog
    await page.getByRole('button', { name: /^archivar$/i }).click();
    await expect(page.getByText(/plan archivado/i)).toBeVisible({ timeout: 3000 });

    // Cambiar a filtro Archivados
    await page.getByRole('button', { name: /archivados/i }).click();
    await expect(page.getByRole('heading', { name: planName, level: 3 })).toBeVisible();
    await expect(newCard.getByText(/archivado/i)).toBeVisible();

    // Reactivar
    await newCard.getByRole('button').last().click();
    await page.getByRole('button', { name: /^reactivar$/i }).click();
    await expect(page.getByText(/plan reactivado/i)).toBeVisible({ timeout: 3000 });

    // Volver a Activos y eliminar definitivo
    await page.getByRole('button', { name: /^activos/i }).click();
    await newCard.getByRole('button').last().click();
    await page.getByRole('button', { name: /^eliminar$/i }).click();
    // ConfirmDialog
    await page.getByRole('button', { name: /eliminar definitivamente/i }).click();
    await expect(page.getByText(/plan eliminado/i)).toBeVisible({ timeout: 3000 });
    await expect(page.getByRole('heading', { name: planName, level: 3 })).not.toBeVisible({ timeout: 3000 });

    expect(errors).toEqual([]);
  });

  test('crear plan con nombre duplicado → 409', async ({ page }) => {
    await login(page);
    await page.goto('/planes');

    // El seed tiene "Free". Intentamos duplicarlo.
    await page.getByRole('button', { name: /^nuevo plan$/i }).click();
    await page.getByRole('textbox', { name: /nombre del plan/i }).fill('Free');
    await page.getByRole('spinbutton', { name: /cuota/i }).fill('1');
    await page.getByRole('button', { name: /^crear plan$/i }).click();

    // Debe mostrar error 409
    await expect(page.getByText(/ya existe un plan/i)).toBeVisible({ timeout: 5000 });
  });
});
