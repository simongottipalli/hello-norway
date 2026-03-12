const { chromium } = require('playwright');
const path = require('path');

async function takeScreenshots() {
  const authStatePath = path.join(__dirname, '..', 'e2e', '.auth', 'user.json');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: authStatePath,
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  console.log('📸 Taking screenshots...');

  // Take screenshot of dashboard with sidebar
  await page.goto('http://localhost:3000/dashboard');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ 
    path: '/tmp/dashboard-with-sidebar.png',
    fullPage: false
  });
  console.log('✓ Dashboard screenshot saved to /tmp/dashboard-with-sidebar.png');

  // Click the Add Task button to open dialog
  const sidebar = page.getByRole('complementary', { name: 'Dashboard sidebar' });
  await sidebar.getByRole('button', { name: 'Add Task' }).click();
  await page.waitForTimeout(500); // Wait for dialog animation
  
  await page.screenshot({ 
    path: '/tmp/dashboard-add-task-dialog.png',
    fullPage: false
  });
  console.log('✓ Add Task Dialog screenshot saved to /tmp/dashboard-add-task-dialog.png');

  await browser.close();
  console.log('✅ Screenshots complete!');
}

takeScreenshots().catch(console.error);
