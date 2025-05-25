/**
 *        @file src/routes/recipe/recipe_routes.test.ts
 *  @repository 000-a-3100_api_boilerplate
 * @application 000-a-3100_api_boilerplate
 *     @summary Integration tests for recipe routes
 * @description Contains integration tests for the /v0/recipes endpoints.
 */

import request from 'supertest'
// NOTE: This import might fail if src/index.ts doesn't export 'app' correctly.
// Ideally, app setup is in 'app.ts' and 'index.ts' imports and starts it.
// For this test, we'll assume 'app' can be imported or this part would need adjustment.
// If 'app' is not exported from 'src/index.ts', a common pattern is to have an 'app.ts'
// that exports the app, and 'index.ts' imports it to start the server.
// As 'src/app.ts' was not found, we proceed with this placeholder for 'app'.
// In a real scenario, src/index.ts would need to be refactored to export app.
// For now, we'll mock it or assume it's available.
// Let's simulate a minimal app export from where routes are attached.
import express from 'express'
import routes from '../../routes' // This is where /v0 is mounted
import { RecipeService } from '../../services/recipe_service'
import { Recipe } from '../../models/recipe'
import { User } from '../../models' // For RecipeService constructor mock
import Helper from '../../db_pool/helper' // For defaultUser in service constructor

// Create a minimal app instance for testing, applying the /v0 routes
const app = express()
app.use(express.json()) // Important for parsing req.body
app.use('/v0', routes) // Mount the main router

// Mock RecipeService methods
// We need to mock the prototype because RecipeService is instantiated in the controller
jest.mock('../../services/recipe_service')

// Mock logger to prevent actual logging during tests
jest.mock('../../providers/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}))

describe('POST /v0/recipes/upload/instagram', () => {
  const mockUrl = 'http://instagram.com/mock_recipe'
  const mockParsedData: Partial<Recipe> = {
    ingredients: 'parsed ingredients',
    instructions: 'parsed instructions',
    original_video_url: mockUrl,
  }
  const mockSavedRecipe: Recipe = {
    id: 123,
    ingredients: 'parsed ingredients',
    instructions: 'parsed instructions',
    original_video_url: mockUrl,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
  }

  let parseInstagramRecipeSpy: jest.SpyInstance
  let saveRecipeSpy: jest.SpyInstance

  beforeEach(() => {
    // Clear mocks and restore any spied methods before each test
    jest.clearAllMocks()

    // Spy on and mock the implementation of RecipeService methods
    // We need to ensure RecipeService.prototype is correctly spied upon
    // The constructor of RecipeService takes a User object.
    // The controller creates `new RecipeService(req.cUser || Helper.defaultUser())`
    // Our mock needs to intercept calls on instances of RecipeService.

    // Mocking the constructor and its methods
    RecipeService.prototype.parseInstagramRecipe = jest.fn().mockResolvedValue(mockParsedData)
    RecipeService.prototype.saveRecipe = jest.fn().mockResolvedValue(mockSavedRecipe)

    // For verification, we can use these spies if needed, but the above jest.fn().mockResolvedValue should suffice
    // parseInstagramRecipeSpy = jest.spyOn(RecipeService.prototype, 'parseInstagramRecipe')
    // saveRecipeSpy = jest.spyOn(RecipeService.prototype, 'saveRecipe')
  })

  it('should successfully parse and save a recipe, returning the saved recipe data', async () => {
    const response = await request(app)
      .post('/v0/recipes/upload/instagram')
      .send({ url: mockUrl })
      .expect('Content-Type', /json/)
      .expect(200) // Based on ResponseWrapper.ok()

    expect(response.body.success).toBe(true)
    expect(response.body.data).toEqual(mockSavedRecipe)

    // Verify that the mocked service methods were called correctly
    expect(RecipeService.prototype.parseInstagramRecipe).toHaveBeenCalledTimes(1)
    expect(RecipeService.prototype.parseInstagramRecipe).toHaveBeenCalledWith(mockUrl)

    expect(RecipeService.prototype.saveRecipe).toHaveBeenCalledTimes(1)
    expect(RecipeService.prototype.saveRecipe).toHaveBeenCalledWith(mockParsedData)
  })

  it('should return 400 if URL is not provided', async () => {
    const response = await request(app)
      .post('/v0/recipes/upload/instagram')
      .send({}) // No URL
      .expect('Content-Type', /json/)
      .expect(400)

    expect(response.body.success).toBe(false)
    expect(response.body.data.message).toBe('Invalid URL in request body')
    expect(RecipeService.prototype.parseInstagramRecipe).not.toHaveBeenCalled()
    expect(RecipeService.prototype.saveRecipe).not.toHaveBeenCalled()
  })

  it('should return 500 if parseInstagramRecipe fails (simulated by wrapper)', async () => {
    // Simulate parseInstagramRecipe throwing an error
     RecipeService.prototype.parseInstagramRecipe = jest.fn().mockRejectedValue(new Error('Parsing failed'))

    const response = await request(app)
      .post('/v0/recipes/upload/instagram')
      .send({ url: mockUrl })
      .expect('Content-Type', /json/)
      // The 'wrapper' helper in the controller should catch the error and call next(error).
      // Express's default error handler will then send a 500 response.
      .expect(500) 
    
    // Depending on the default error handler, the body might look like:
    // { "success": false, "data": { "message": "Internal Server Error" } } or just the error message.
    // This part is harder to assert without knowing the exact default error handling middleware.
    // For now, status code 500 is the primary check.
    expect(RecipeService.prototype.parseInstagramRecipe).toHaveBeenCalledWith(mockUrl)
    expect(RecipeService.prototype.saveRecipe).not.toHaveBeenCalled()
  })

   it('should return 500 if saveRecipe fails (simulated by wrapper)', async () => {
    // Simulate saveRecipe throwing an error
    RecipeService.prototype.saveRecipe = jest.fn().mockRejectedValue(new Error('Saving failed'))

    const response = await request(app)
      .post('/v0/recipes/upload/instagram')
      .send({ url: mockUrl })
      .expect('Content-Type', /json/)
      .expect(500)
    
    expect(RecipeService.prototype.parseInstagramRecipe).toHaveBeenCalledWith(mockUrl)
    expect(RecipeService.prototype.saveRecipe).toHaveBeenCalledWith(mockParsedData)
  })

  it('should handle empty or no data from parseInstagramRecipe', async () => {
    RecipeService.prototype.parseInstagramRecipe = jest.fn().mockResolvedValue(null); // or {}

    const response = await request(app)
      .post('/v0/recipes/upload/instagram')
      .send({ url: mockUrl })
      .expect('Content-Type', /json/)
      .expect(200)

    expect(response.body.success).toBe(false);
    expect(response.body.data.message).toBe('Could not parse any recipe data from the URL.');
    expect(RecipeService.prototype.parseInstagramRecipe).toHaveBeenCalledWith(mockUrl);
    expect(RecipeService.prototype.saveRecipe).not.toHaveBeenCalled();
  });
})
