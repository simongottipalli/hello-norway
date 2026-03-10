import { test, expect } from '@playwright/test';

test.describe('Navigation and Routing', () => {
  test.describe('Protected Routes', () => {
    test('should redirect unauthenticated users from /dashboard to /login', async ({ page, context }) => {
      // Clear cookies to simulate unauthenticated state
      await context.clearCookies();
      
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Should be redirected to login
      await expect(page).toHaveURL(/\/login/);
    });

    test('should redirect unauthenticated users from /tasks to /login', async ({ page, context }) => {
      await context.clearCookies();
      
      await page.goto('/tasks');
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveURL(/\/login/);
    });

    test('should redirect unauthenticated users from /profile to /login', async ({ page, context }) => {
      await context.clearCookies();
      
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveURL(/\/login/);
    });

    test('should allow authenticated users to access /dashboard', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveURL(/\/dashboard/);
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    });

    test('should allow authenticated users to access /tasks', async ({ page }) => {
      await page.goto('/tasks');
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveURL(/\/tasks/);
      await expect(page.getByRole('heading', { name: 'Tasks', exact: true })).toBeVisible();
    });

    test('should allow authenticated users to access /profile', async ({ page }) => {
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveURL(/\/profile/);
      await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible();
    });
  });

  test.describe('Public Routes', () => {
    test('should allow unauthenticated users to access home page', async ({ page, context }) => {
      await context.clearCookies();
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveURL('/');
    });

    test('should allow unauthenticated users to access /login', async ({ page, context }) => {
      await context.clearCookies();
      
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveURL('/login');
    });

    test('should allow unauthenticated users to access /onboarding', async ({ page, context }) => {
      await context.clearCookies();
      
      await page.goto('/onboarding');
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveURL('/onboarding');
    });
  });

  test.describe('Authenticated User Redirects', () => {
    test('should redirect authenticated users from /login to /dashboard', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      
      // Authenticated users should be redirected to dashboard
      await expect(page).toHaveURL(/\/dashboard/);
    });

    test('should redirect authenticated users from /signup to /dashboard', async ({ page }) => {
      await page.goto('/signup');
      await page.waitForLoadState('networkidle');
      
      // Authenticated users should be redirected to dashboard
      await expect(page).toHaveURL(/\/dashboard/);
    });
  });

  test.describe('Navigation Component', () => {
    test('should display navigation links for authenticated users', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Check for desktop navigation links
      await expect(page.getByRole('link', { name: 'Dashboard' }).first()).toBeVisible();
      await expect(page.getByRole('link', { name: 'Tasks' }).first()).toBeVisible();
      await expect(page.getByRole('link', { name: 'Profile' }).first()).toBeVisible();
      await expect(page.getByRole('button', { name: /Logout/i }).first()).toBeVisible();
    });

    test('should navigate between pages using navigation links', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Navigate to Tasks
      await page.getByRole('link', { name: 'Tasks' }).first().click();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/\/tasks/);
      
      // Navigate to Profile
      await page.getByRole('link', { name: 'Profile' }).first().click();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/\/profile/);
      
      // Navigate back to Dashboard
      await page.getByRole('link', { name: 'Dashboard' }).first().click();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/\/dashboard/);
    });

    test('should highlight active page in navigation', async ({ page }) => {
      // Go to dashboard
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Dashboard link should have secondary variant classes (active state)
      const dashboardLink = page.locator('a[href="/dashboard"]').first();
      await expect(dashboardLink).toHaveClass(/bg-secondary/);
      
      // Go to tasks
      await page.goto('/tasks');
      await page.waitForLoadState('networkidle');
      
      // Tasks link should have secondary variant classes (active state)
      const tasksLink = page.locator('a[href="/tasks"]').first();
      await expect(tasksLink).toHaveClass(/bg-secondary/);
    });

    test('should logout successfully from navigation', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Click logout button
      await page.getByRole('button', { name: /Logout/i }).first().click();
      
      // Should be redirected to home page
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL('/');
      
      // Should no longer have access to protected routes
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Mobile Navigation', () => {
    test('should display mobile menu button on small screens', async ({ page }) => {
      // Set viewport to mobile size
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Mobile menu button should be visible
      await expect(page.getByLabel('Toggle menu')).toBeVisible();
    });

    test('should toggle mobile menu when button is clicked', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
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
      await page.waitForLoadState('networkidle');
      
      // Open mobile menu
      await page.getByLabel('Toggle menu').click();
      
      const mobileNav = page.getByTestId('mobile-nav');
      await expect(mobileNav).toBeVisible();
      
      // Click on Tasks link in mobile menu
      await page.getByTestId('mobile-tasks-link').click();
      await page.waitForLoadState('networkidle');
      
      // Should navigate to tasks
      await expect(page).toHaveURL(/\/tasks/);
      
      // Mobile menu should be closed after navigation
      await expect(mobileNav).not.toBeVisible();
    });

    test('should display all navigation links in mobile menu', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Open mobile menu
      await page.getByLabel('Toggle menu').click();
      
      // All links should be visible in mobile menu using test IDs
      const mobileNav = page.getByTestId('mobile-nav');
      await expect(mobileNav.getByTestId('mobile-dashboard-link')).toBeVisible();
      await expect(mobileNav.getByTestId('mobile-tasks-link')).toBeVisible();
      await expect(mobileNav.getByTestId('mobile-profile-link')).toBeVisible();
      await expect(mobileNav.getByRole('button', { name: /Logout/i })).toBeVisible();
    });
  });
});
