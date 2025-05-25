/**
 *        @file recipe_service.test.ts
 *  @repository 000-a-3100_api_boilerplate
 * @application 000-a-3100_api_boilerplate
 *     @summary Unit tests for RecipeService
 * @description Contains unit tests for the RecipeService class.
 */

import { RecipeService } from './recipe_service'
import { Recipe } from '../models/recipe'
import { User } from '../models' // For creating a dummy user
import { logger } from '../providers/logger'

// Mock the logger
jest.mock('../providers/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}))

describe('RecipeService', () => {
  let recipeService: RecipeService
  let mockUser: User

  beforeEach(() => {
    // Create a mock User instance
    mockUser = new User({ id: 1, username: 'testuser' })
    // Create a new instance of RecipeService before each test
    recipeService = new RecipeService(mockUser)
    // Clear all mock calls before each test
    jest.clearAllMocks()
  })

  describe('parseInstagramRecipe', () => {
    it('should log the URL and return mock data for parseInstagramRecipe', async () => {
      const testUrl = 'https://www.instagram.com/p/C123XYZ/'
      const expectedLogMessage = `[RecipeService] parseInstagramRecipe called with URL: ${testUrl}`
      const expectedMockOutput: Partial<Recipe> = {
        ingredients: 'Mock ingredients from Instagram',
        instructions: 'Mock instructions from Instagram',
        original_video_url: testUrl,
      }

      const result = await recipeService.parseInstagramRecipe(testUrl)

      expect(logger.info).toHaveBeenCalledWith(expectedLogMessage)
      // The second logger.info call in the actual method
      expect(logger.info).toHaveBeenCalledWith(`[RecipeService] Mock parsed data: ${JSON.stringify(expectedMockOutput)}`)
      expect(result).toEqual(expectedMockOutput)
    })
  })

  describe('saveRecipe', () => {
    it('should log the input data and return a mock recipe for saveRecipe', async () => {
      const mockRecipeData: Partial<Recipe> = {
        ingredients: 'Test Ingredients',
        instructions: 'Test Instructions',
        original_video_url: 'http://example.com/video.mp4',
      }
      const expectedLogMessage = `[RecipeService] saveRecipe called with: ${JSON.stringify(mockRecipeData)}`
      
      const result = await recipeService.saveRecipe(mockRecipeData)

      expect(logger.info).toHaveBeenCalledWith(expectedLogMessage)
      // The second logger.info call in the actual method
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('[RecipeService] Mock recipe created:'))
      
      expect(result).toBeDefined()
      expect(result.id).toBeDefined() // Mock ID is Date.now()
      expect(result.ingredients).toBe(mockRecipeData.ingredients)
      expect(result.instructions).toBe(mockRecipeData.instructions)
      expect(result.original_video_url).toBe(mockRecipeData.original_video_url)
      expect(result.created_at).toBeInstanceOf(Date)
      expect(result.updated_at).toBeInstanceOf(Date)
      expect(result.deleted_at).toBeNull()
    })

    it('should use provided fields in the returned mock recipe', async () => {
      const mockRecipeData: Partial<Recipe> = {
        ingredients: 'Custom Ingredients',
        // id is not typically passed in Partial<Recipe> for creation, 
        // but testing if the mock creation logic handles it if present.
        // The current mock implementation spreads recipeData last, so it would override.
      }
      
      const result = await recipeService.saveRecipe(mockRecipeData)
      
      expect(result.ingredients).toBe('Custom Ingredients')
      // Other fields should have their default mock values
      expect(result.instructions).toBeNull() // As per mockRecipe in service if not provided
      expect(result.original_video_url).toBeNull() // As per mockRecipe in service if not provided
    })
  })
})
