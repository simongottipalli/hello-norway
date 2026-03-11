import { test, expect } from '@playwright/test';
import { LOGOUT_AUTH_STATE_PATH } from './global-setup';

// Test instance without authentication for unauthenticated tests
const unauthenticatedTest = test.extend({
  storageState: { cookies: [], origins: [] },
});

// Test instance with an isolated session for the logout test.
// The logout test deletes its session from the DB; using a dedicated session
// here prevents that deletion from invalidating the shared session used by
// all other tests in this file.
const logoutTest = test.extend({
  storageState: LOGOUT_AUTH_STATE_PATH,
});

test.describe('Navigation and Routing', () => {
  test.describe('Protected Routes', () => {
    unauthenticatedTest('should redirect unauthenticated users from /dashboard to /login', async ({ page }) => {
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/\/login/);
    });

    unauthenticatedTest('should redirect unauthenticated users from /tasks to /login', async ({ page }) => {
      await page.goto('/tasks');
      await expect(page).toHaveURL(/\/login/);
    });

    unauthenticatedTest('should redirect unauthenticated users from /profile to /login', async ({ page }) => {
      await page.goto('/profile');
      await expect(page).toHaveURL(/\/login/);
    });

    test('should allow authenticated users to access /dashboard', async ({ page }) => {
      await page.goto('/dashboard');
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
      await expect(page).toHaveURL(/\/dashboard/);
    });

    test('should allow authenticated users to access /tasks', async ({ page }) => {
      await page.goto('/tasks');
      await expect(page.getByRole('heading', { name: 'Tasks', exact: true })).toBeVisible();
      await expect(page).toHaveURL(/\/tasks/);
    });

    test('should allow authenticated users to access /profile', async ({ page }) => {
      await page.goto('/profile');
      await expect(page.getByRole('heading', { name: 'Profile', exact: true })).toBeVisible();
      await expect(page).toHaveURL(/\/profile/);
    });
  });

  test.describe('Public Routes', () => {
    unauthenticatedTest('should allow unauthenticated users to access home page', async ({ page }) => {
      await page.goto('/');
      await expect(page).toHaveURL('/');
    });

    unauthenticatedTest('should allow unauthenticated users to access /login', async ({ page }) => {
      await page.goto('/login');
      await expect(page).toHaveURL('/login');
    });

    unauthenticatedTest('should allow unauthenticated users to access /onboarding', async ({ page }) => {
      await page.goto('/onboarding');
      await expect(page).toHaveURL('/onboarding');
    });
  });

  test.describe('Authenticated User Redirects', () => {
    test('should redirect authenticated users from /login to /dashboard', async ({ page }) => {
      await page.goto('/login');
      await expect(page).toHaveURL(/\/dashboard/);
    });

    test('should redirect authenticated users from /signup to /dashboard', async ({ page }) => {
      await page.goto('/signup');
      await expect(page).toHaveURL(/\/dashboard/);
    });
  });

  test.describe('Navigation Component', () => {
    test('should display navigation links for authenticated users', async ({ page }) => {
      await page.goto('/dashboard');

      // Check for desktop navigation links
      await expect(page.getByTestId('nav-dashboard-link')).toBeVisible();
      await expect(page.getByTestId('nav-tasks-link')).toBeVisible();
      await expect(page.getByTestId('nav-profile-link')).toBeVisible();
      await expect(page.getByTestId('nav-logout-button')).toBeVisible();
    });

    test('should navigate between pages using navigation links', async ({ page }) => {
      await page.goto('/dashboard');
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

      // Navigate to Tasks
      await page.getByTestId('nav-tasks-link').click();
      await expect(page.getByRole('heading', { name: 'Tasks', exact: true })).toBeVisible();

      // Navigate to Profile
      await page.getByTestId('nav-profile-link').click();
      await expect(page.getByRole('heading', { name: 'Profile', exact: true })).toBeVisible();

      // Navigate back to Dashboard
      await page.getByTestId('nav-dashboard-link').click();
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    });

    test('should highlight active page in navigation', async ({ page }) => {
      await page.goto('/dashboard');
      await expect(page.getByTestId('nav-dashboard-link')).toHaveAttribute('data-active', 'true');

      await page.goto('/tasks');
      await expect(page.getByTestId('nav-tasks-link')).toHaveAttribute('data-active', 'true');
    });

    logoutTest('should logout successfully from navigation', async ({ page }) => {
      await page.goto('/dashboard');
      await expect(page.getByTestId('nav-logout-button')).toBeVisible();

      // Click logout button
      await page.getByTestId('nav-logout-button').click();

      // Should be redirected to home page
      await expect(page).toHaveURL('/');

      // Should no longer have access to protected routes
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Mobile Navigation', () => {
    test('should display mobile menu button on small screens', async ({ page }) => {
      // Set viewport to mobile size
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/dashboard');
      await expect(page.getByLabel('Toggle menu')).toBeVisible();
    });

    test('should toggle mobile menu when button is clicked', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/dashboard');
      await expect(page.getByLabel('Toggle menu')).toBeVisible();

      // Mobile menu should not be visible initially
      const mobileNav = page.getByTestId('mobile-nav');
      await expect(mobileNav).not.toBeVisible();

      // Click menu button
      await page.getByLabel('Toggle menu').click();

      // Mobile menu should be visible
      await expect(mobileNav).toBeVisible();

      // Click menu button again to close
      await page.getByLabel('Toggle menu').click();

      // Mobile menu should be hidden
      await expect(mobileNav).not.toBeVisible();
    });

    test('should close mobile menu when navigating', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/dashboard');

      // Open mobile menu
      await page.getByLabel('Toggle menu').click();

      const mobileNav = page.getByTestId('mobile-nav');
      await expect(mobileNav).toBeVisible();

      // Wait for authentication to complete by checking for user greeting
      await expect(mobileNav.getByText(/Hey .+ 👋/)).toBeVisible();

      // Wait for the Tasks link to be visible before clicking
      const tasksLink = mobileNav.getByTestId('mobile-tasks-link');
      await expect(tasksLink).toBeVisible();
      await tasksLink.click();

      // Should navigate to tasks
      await expect(page.getByRole('heading', { name: 'Tasks', exact: true })).toBeVisible();

      // Mobile menu should be closed after navigation
      await expect(mobileNav).not.toBeVisible();
    });

    test('should close mobile menu when Escape key is pressed', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/dashboard');
      await page.getByLabel('Toggle menu').click();

      const mobileNav = page.getByTestId('mobile-nav');
      await expect(mobileNav).toBeVisible();

      await page.keyboard.press('Escape');

      await expect(mobileNav).not.toBeVisible();
    });

    test('should close mobile menu when clicking outside', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/dashboard');
      await page.getByLabel('Toggle menu').click();

      const mobileNav = page.getByTestId('mobile-nav');
      await expect(mobileNav).toBeVisible();

      // Click on the page content outside the header
      await page.getByRole('heading', { name: 'Dashboard' }).click();

      await expect(mobileNav).not.toBeVisible();
    });

    test('should display all navigation links in mobile menu', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/dashboard');

      // Open mobile menu
      await page.getByLabel('Toggle menu').click();

      // Wait for mobile menu to be visible
      const mobileNav = page.getByTestId('mobile-nav');
      await expect(mobileNav).toBeVisible();

      // Wait for authentication to complete by checking for user greeting
      await expect(mobileNav.getByText(/Hey .+ 👋/)).toBeVisible();

      // All links should be visible in mobile menu using test IDs
      await expect(mobileNav.getByTestId('mobile-dashboard-link')).toBeVisible();
      await expect(mobileNav.getByTestId('mobile-tasks-link')).toBeVisible();
      await expect(mobileNav.getByTestId('mobile-profile-link')).toBeVisible();
      await expect(mobileNav.getByRole('button', { name: /Logout/i })).toBeVisible();
    });
  });
});
