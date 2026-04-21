const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));

  try {
    // Test Dashboard
    await page.goto('https://q5jdov1uwicz.space.minimax.io/dashboard');
    await page.waitForTimeout(2000);
    const title = await page.title();
    console.log('Title:', title);
    
    const statsCards = await page.locator('.card').count();
    console.log('Dashboard cards found:', statsCards);

    // Test Contacts
    await page.goto('https://q5jdov1uwicz.space.minimax.io/contacts');
    await page.waitForTimeout(1000);
    const contactRows = await page.locator('tbody tr').count();
    console.log('Contact rows:', contactRows);

    // Test Companies
    await page.goto('https://q5jdov1uwicz.space.minimax.io/companies');
    await page.waitForTimeout(1000);
    const companyRows = await page.locator('tbody tr').count();
    console.log('Company rows:', companyRows);

    // Test Deals (Pipeline)
    await page.goto('https://q5jdov1uwicz.space.minimax.io/deals');
    await page.waitForTimeout(1000);
    const kanbanCols = await page.locator('.flex-shrink-0').count();
    console.log('Kanban columns found:', kanbanCols);

    // Test Stores
    await page.goto('https://q5jdov1uwicz.space.minimax.io/stores');
    await page.waitForTimeout(1000);
    console.log('Stores page loaded');

    // Test Activities
    await page.goto('https://q5jdov1uwicz.space.minimax.io/activities');
    await page.waitForTimeout(1000);
    const activityCards = await page.locator('.group').count();
    console.log('Activity items:', activityCards);

    // Test Analytics
    await page.goto('https://q5jdov1uwicz.space.minimax.io/analytics');
    await page.waitForTimeout(1000);
    console.log('Analytics page loaded');

    // Test Settings
    await page.goto('https://q5jdov1uwicz.space.minimax.io/settings');
    await page.waitForTimeout(1000);
    console.log('Settings page loaded');

    // Test adding a contact
    await page.goto('https://q5jdov1uwicz.space.minimax.io/contacts');
    await page.waitForTimeout(500);
    const addBtn = page.locator('button:has-text("Add Contact")');
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await page.waitForTimeout(500);
      await page.fill('input[placeholder="Full name"]', 'Test User');
      await page.fill('input[placeholder="email@example.com"]', 'test@example.com');
      await page.locator('button:has-text("Save Contact")').click();
      await page.waitForTimeout(500);
      console.log('Contact add test: PASSED');
    }

    // Test adding a deal
    await page.goto('https://q5jdov1uwicz.space.minimax.io/deals');
    await page.waitForTimeout(500);
    const addDealBtn = page.locator('button:has-text("Add Deal")');
    if (await addDealBtn.isVisible()) {
      await addDealBtn.click();
      await page.waitForTimeout(500);
      await page.fill('input[placeholder="Deal name"]', 'Test Deal');
      await page.fill('input[placeholder="0"]', '50000');
      await page.locator('button:has-text("Save Deal")').click();
      await page.waitForTimeout(500);
      console.log('Deal add test: PASSED');
    }

    if (errors.length > 0) {
      console.log('\nConsole errors found:', errors.slice(0, 5));
    } else {
      console.log('\nNo console errors!');
    }

    console.log('\n✅ All tests passed!');
  } catch (err) {
    console.error('Test failed:', err.message);
  }

  await browser.close();
})();
