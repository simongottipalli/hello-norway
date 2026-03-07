import { test, expect } from '@playwright/test';

test.describe('Onboarding survey', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/onboarding');
    await page.waitForLoadState('networkidle');
  });

  test('Next button is disabled until the current question is answered', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Go to next question' })).toBeDisabled();

    await page.getByPlaceholder('Start typing a country').fill('Norway');

    await expect(page.getByRole('button', { name: 'Go to next question' })).toBeEnabled();
  });

  test('Back button is disabled on the first question', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Go to previous question' })).toBeDisabled();
  });

  test('can navigate forward and back between questions', async ({ page }) => {
    const countryInput = page.getByPlaceholder('Start typing a country');
    await countryInput.fill('Norway');
    await page.getByRole('button', { name: 'Go to next question' }).click();

    // Should now be on Q2 (citizenships)
    await expect(page.getByPlaceholder('India, Norway')).toBeVisible();

    await page.getByRole('button', { name: 'Go to previous question' }).click();

    // Back on Q1 — answer should be preserved
    await expect(countryInput).toHaveValue('Norway');
  });

  test('progress bar increases as questions are answered', async ({ page }) => {
    const progressbar = page.getByRole('progressbar', { name: 'Onboarding progress' });

    const initialProgress = await progressbar.getAttribute('aria-valuenow');
    expect(Number(initialProgress)).toBe(0);

    await page.getByPlaceholder('Start typing a country').fill('Norway');

    const afterQ1 = await progressbar.getAttribute('aria-valuenow');
    expect(Number(afterQ1)).toBeGreaterThan(0);
  });

  test('jobOffer question does not appear when applying as Student', async ({ page }) => {
    await page.getByPlaceholder('Start typing a country').fill('Norway');
    await page.getByRole('button', { name: 'Go to next question' }).click();

    await page.getByPlaceholder('India, Norway').fill('Norway');
    await page.getByRole('button', { name: 'Go to next question' }).click();

    await page.getByRole('button', { name: 'Student' }).click();
    await page.getByRole('button', { name: 'Go to next question' }).click();

    await page.getByRole('spinbutton').fill('25');

    // "Student" path ends here — next action is Finish, not another question
    await expect(page.getByRole('button', { name: 'Finish questionnaire' })).toBeEnabled();
    await page.getByRole('button', { name: 'Finish questionnaire' }).click();

    await expect(page.getByRole('heading', { name: 'Your first Norway tasks' })).toBeVisible();
  });

  test('jobOffer question appears when applying as Skilled worker', async ({ page }) => {
    await page.getByPlaceholder('Start typing a country').fill('Norway');
    await page.getByRole('button', { name: 'Go to next question' }).click();

    await page.getByPlaceholder('India, Norway').fill('Norway');
    await page.getByRole('button', { name: 'Go to next question' }).click();

    await page.getByRole('button', { name: 'Skilled worker' }).click();
    await page.getByRole('button', { name: 'Go to next question' }).click();

    await page.getByRole('spinbutton').fill('30');
    await page.getByRole('button', { name: 'Go to next question' }).click();

    // Q5 should now be visible
    await expect(page.getByRole('heading', { name: 'Do you already have a job offer in Norway?' })).toBeVisible();

    await page.getByRole('button', { name: 'Yes' }).click();
    await page.getByRole('button', { name: 'Finish questionnaire' }).click();

    await expect(page.getByRole('heading', { name: 'Your first Norway tasks' })).toBeVisible();
  });

  test('completing all questions shows task preview and save action', async ({ page }) => {
    await page.getByPlaceholder('Start typing a country').fill('Norway');
    await page.getByRole('button', { name: 'Go to next question' }).click();

    await page.getByPlaceholder('India, Norway').fill('Norway');
    await page.getByRole('button', { name: 'Go to next question' }).click();

    await page.getByRole('button', { name: 'Student' }).click();
    await page.getByRole('button', { name: 'Go to next question' }).click();

    await page.getByRole('spinbutton').fill('25');
    await page.getByRole('button', { name: 'Finish questionnaire' }).click();

    await expect(page.getByRole('heading', { name: 'Your first Norway tasks' })).toBeVisible();
    // Test runs with authenticated context, so should show the save button for logged-in users
    await expect(page.getByRole('button', { name: 'Save and continue to tasks' })).toBeVisible();
  });
});
