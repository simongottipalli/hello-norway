import { test, expect } from '@playwright/test';

test.describe('Tasks API', () => {
  const API_BASE_URL = 'http://localhost:3001/api/tasks';

  test('GET /api/tasks should return list of tasks', async ({ request }) => {
    const response = await request.get(API_BASE_URL);
    
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    
    const tasks = await response.json();
    expect(Array.isArray(tasks)).toBeTruthy();
    expect(tasks.length).toBeGreaterThan(0);
    
    // Verify task structure
    const firstTask = tasks[0];
    expect(firstTask).toHaveProperty('id');
    expect(firstTask).toHaveProperty('slug');
    expect(firstTask).toHaveProperty('title');
    expect(firstTask).toHaveProperty('shortDescription');
    expect(firstTask).toHaveProperty('body');
    expect(firstTask).toHaveProperty('category');
    expect(firstTask).toHaveProperty('sortOrder');
  });

  test('POST /api/tasks should create a new task', async ({ request }) => {
    const newTask = {
      slug: `test-task-${Date.now()}`,
      title: 'API Test Task',
      shortDescription: 'Test description',
      body: 'Test body content',
      category: 'OTHER',
      sortOrder: Math.floor(Math.random() * 30000),
      officialLinks: {},
    };

    const response = await request.post(API_BASE_URL, {
      data: newTask,
    });

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(201);

    const createdTask = await response.json();
    expect(createdTask.slug).toBe(newTask.slug);
    expect(createdTask.title).toBe(newTask.title);
    expect(createdTask.shortDescription).toBe(newTask.shortDescription);
    expect(createdTask.body).toBe(newTask.body);
    expect(createdTask.category).toBe(newTask.category);
    expect(createdTask).toHaveProperty('id');
    expect(createdTask).toHaveProperty('createdAt');
    expect(createdTask).toHaveProperty('updatedAt');
  });

  test('POST /api/tasks should reject invalid data', async ({ request }) => {
    const invalidTask = {
      title: 'Incomplete Task',
      // Missing required fields
    };

    const response = await request.post(API_BASE_URL, {
      data: invalidTask,
    });

    expect(response.ok()).toBeFalsy();
    expect(response.status()).toBe(400);
  });

  test('POST /api/tasks should handle sortOrder within valid range', async ({ request }) => {
    const newTask = {
      slug: `sort-test-${Date.now()}`,
      title: 'Sort Order Test',
      shortDescription: 'Testing sortOrder',
      body: 'Test body',
      category: 'OTHER',
      sortOrder: 25000, // Within SmallInt range
      officialLinks: {},
    };

    const response = await request.post(API_BASE_URL, {
      data: newTask,
    });

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(201);
  });

  test('GET /api/tasks/[id] should return a specific task', async ({ request }) => {
    // First, get all tasks to find an ID
    const listResponse = await request.get(API_BASE_URL);
    const tasks = await listResponse.json();
    
    if (tasks.length > 0) {
      const taskId = tasks[0].id;
      
      // Get specific task
      const response = await request.get(`${API_BASE_URL}/${taskId}`);
      
      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);
      
      const task = await response.json();
      expect(task.id).toBe(taskId);
    }
  });

  test('GET /api/tasks/[id] should return 404 for non-existent task', async ({ request }) => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const response = await request.get(`${API_BASE_URL}/${fakeId}`);
    
    expect(response.status()).toBe(404);
  });

  test('DELETE /api/tasks/[id] should delete a task', async ({ request }) => {
    // Create a task first
    const newTask = {
      slug: `delete-test-${Date.now()}`,
      title: 'Task to Delete',
      shortDescription: 'Will be deleted',
      body: 'Test body',
      category: 'OTHER',
      sortOrder: Math.floor(Math.random() * 30000),
      officialLinks: {},
    };

    const createResponse = await request.post(API_BASE_URL, {
      data: newTask,
    });
    const createdTask = await createResponse.json();

    // Delete the task
    const deleteResponse = await request.delete(`${API_BASE_URL}/${createdTask.id}`);
    expect(deleteResponse.ok()).toBeTruthy();
    expect(deleteResponse.status()).toBe(200);

    // Verify it's deleted
    const getResponse = await request.get(`${API_BASE_URL}/${createdTask.id}`);
    expect(getResponse.status()).toBe(404);
  });

  test('PUT /api/tasks/[id] should update a task', async ({ request }) => {
    // Create a task first
    const newTask = {
      slug: `update-test-${Date.now()}`,
      title: 'Original Title',
      shortDescription: 'Original description',
      body: 'Original body',
      category: 'OTHER',
      sortOrder: Math.floor(Math.random() * 30000),
      officialLinks: {},
    };

    const createResponse = await request.post(API_BASE_URL, {
      data: newTask,
    });
    const createdTask = await createResponse.json();

    // Update the task
    const updatedData = {
      title: 'Updated Title',
      shortDescription: 'Updated description',
      body: 'Updated body',
    };

    const updateResponse = await request.put(`${API_BASE_URL}/${createdTask.id}`, {
      data: updatedData,
    });

    expect(updateResponse.ok()).toBeTruthy();
    expect(updateResponse.status()).toBe(200);

    const updatedTask = await updateResponse.json();
    expect(updatedTask.title).toBe(updatedData.title);
    expect(updatedTask.shortDescription).toBe(updatedData.shortDescription);
    expect(updatedTask.body).toBe(updatedData.body);
  });
});
