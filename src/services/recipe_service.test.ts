/**
 *        @file recipe_service.test.ts
 *  @repository 000-a-3100_api_boilerplate
 * @application 000-a-3100_api_boilerplate
 *     @summary Unit tests for RecipeService
 * @description Contains unit tests for the RecipeService class.
 */

import { RecipeService } from './recipe_service'
import { Recipe } from '../models/recipe'
import { User } from '../models'
import { logger } from '../providers/logger'
import Helper from '../db_pool/helper' // Original Helper
import puppeteer from 'puppeteer' // Original puppeteer

// Mock logger
jest.mock('../providers/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}))

// Mock Helper
jest.mock('../db_pool/helper')
const MockedHelper = Helper as jest.Mocked<typeof Helper> // Typed mock

// Mock Puppeteer
jest.mock('puppeteer')
const mockedPuppeteer = puppeteer as jest.Mocked<typeof puppeteer>

describe('RecipeService', () => {
  let recipeService: RecipeService
  let mockUser: User

  // Mock for aquery
  const mockAquery = jest.fn()

  // Mocks for Puppeteer
  const mockPage = {
    goto: jest.fn(),
    evaluate: jest.fn(),
    setUserAgent: jest.fn(),
    close: jest.fn(), // Mock for page.close() although not directly used in service
  }
  const mockBrowser = {
    newPage: jest.fn().mockResolvedValue(mockPage as any), // Cast to any if type complains
    close: jest.fn().mockResolvedValue(undefined),
  }

  beforeEach(() => {
    mockUser = new User({ id: 1, username: 'testuser' })
    recipeService = new RecipeService(mockUser)
    
    jest.clearAllMocks() // Clear all mocks before each test

    // Setup mock for Helper.pool().aquery()
    MockedHelper.pool.mockReturnValue({ aquery: mockAquery } as any)

    // Setup mock for puppeteer.launch()
    mockedPuppeteer.launch.mockResolvedValue(mockBrowser as any) // Cast to any if type complains
  })

  describe('saveRecipe', () => {
    const mockRecipeData: Partial<Recipe> = {
      ingredients: 'Test Ingredients',
      instructions: 'Test Instructions',
      original_video_url: 'http://example.com/video.mp4',
    }
    const expectedSavedRecipe: Recipe = {
      id: 1, // Example ID
      ...mockRecipeData,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } as Recipe

    it('should save a recipe and return the saved data', async () => {
      mockAquery.mockResolvedValue({ rows: [expectedSavedRecipe], rowCount: 1 })

      const result = await recipeService.saveRecipe(mockRecipeData)

      expect(MockedHelper.pool).toHaveBeenCalledTimes(1)
      expect(mockAquery).toHaveBeenCalledWith(
        mockUser, // this.user_current
        'SELECT * FROM public.recipe_insert_one($1, $2, $3);',
        [
          mockRecipeData.ingredients,
          mockRecipeData.instructions,
          mockRecipeData.original_video_url,
        ]
      )
      expect(result).toEqual(expectedSavedRecipe)
      expect(logger.info).toHaveBeenCalledWith(`[RecipeService] Attempting to save recipe with data: ${JSON.stringify(mockRecipeData)}`)
      expect(logger.info).toHaveBeenCalledWith(`[RecipeService] Recipe saved successfully with id: ${expectedSavedRecipe.id}`)
    })

    it('should throw an error if database function returns no rows', async () => {
      mockAquery.mockResolvedValue({ rows: [], rowCount: 0 })

      await expect(recipeService.saveRecipe(mockRecipeData)).rejects.toThrow(
        'Failed to create recipe: No data returned from database function.'
      )
      expect(logger.error).toHaveBeenCalledWith('[RecipeService] Failed to create recipe: No data returned from database function.')
    })

    it('should throw an error if aquery fails', async () => {
      const dbError = new Error('DB connection error')
      mockAquery.mockRejectedValue(dbError)

      await expect(recipeService.saveRecipe(mockRecipeData)).rejects.toThrow('DB connection error')
      expect(logger.error).toHaveBeenCalledWith(`[RecipeService] Error saving recipe: ${dbError.message}`)
    })
  })

  describe('parseInstagramRecipe', () => {
    const testUrl = 'https://www.instagram.com/p/C123XYZ/'

    beforeEach(() => {
        // Reset puppeteer mocks for page methods for each test
        mockPage.goto.mockReset().mockResolvedValue(undefined);
        mockPage.evaluate.mockReset();
        mockPage.setUserAgent.mockReset().mockResolvedValue(undefined);
        mockBrowser.newPage.mockClear().mockResolvedValue(mockPage as any);
        mockBrowser.close.mockClear().mockResolvedValue(undefined);
        mockedPuppeteer.launch.mockClear().mockResolvedValue(mockBrowser as any);
    });

    it('should parse ingredients, instructions, and video URL when all found', async () => {
      mockPage.evaluate
        .mockResolvedValueOnce('Ingredients: flour, sugar\nInstructions: mix, bake') // For og:description
        .mockResolvedValueOnce('http://cdn.instagram.com/video.mp4') // For og:video

      const result = await recipeService.parseInstagramRecipe(testUrl)

      expect(mockedPuppeteer.launch).toHaveBeenCalledTimes(1)
      expect(mockBrowser.newPage).toHaveBeenCalledTimes(1)
      expect(mockPage.goto).toHaveBeenCalledWith(testUrl, { waitUntil: 'networkidle2', timeout: 60000 })
      expect(mockPage.setUserAgent).toHaveBeenCalledTimes(1)
      expect(mockPage.evaluate).toHaveBeenCalledTimes(2)
      expect(result.ingredients).toBe('flour, sugar')
      expect(result.instructions).toBe('mix, bake')
      expect(result.original_video_url).toBe('http://cdn.instagram.com/video.mp4')
      expect(mockBrowser.close).toHaveBeenCalledTimes(1)
      expect(logger.info).toHaveBeenCalledWith(`[RecipeService] Parsed Ingredients: flour, sugar...`)
      expect(logger.info).toHaveBeenCalledWith(`[RecipeService] Parsed Instructions: mix, bake...`)
      expect(logger.info).toHaveBeenCalledWith(`[RecipeService] Found video URL (og:video): http://cdn.instagram.com/video.mp4`)
    })

    it('should use input URL as video URL if og:video not found', async () => {
      mockPage.evaluate
        .mockResolvedValueOnce('Ingredients: salt\nInstructions: sprinkle') // For og:description
        .mockResolvedValueOnce(null) // For og:video (not found)

      const result = await recipeService.parseInstagramRecipe(testUrl)

      expect(result.ingredients).toBe('salt')
      expect(result.instructions).toBe('sprinkle')
      expect(result.original_video_url).toBe(testUrl)
      expect(logger.info).toHaveBeenCalledWith('[RecipeService] No specific video URL (og:video) found, falling back to input URL.')
    })

    it('should return null for ingredients/instructions if caption not found', async () => {
      mockPage.evaluate
        .mockResolvedValueOnce(null) // No caption
        .mockResolvedValueOnce('http://cdn.instagram.com/video.mp4') // Video found

      const result = await recipeService.parseInstagramRecipe(testUrl)

      expect(result.ingredients).toBeNull()
      expect(result.instructions).toBeNull()
      expect(result.original_video_url).toBe('http://cdn.instagram.com/video.mp4')
      expect(logger.warn).toHaveBeenCalledWith('[RecipeService] Could not extract caption content (og:description).')
    })
    
    it('should handle puppeteer.launch error gracefully', async () => {
      const launchError = new Error('Puppeteer launch failed')
      mockedPuppeteer.launch.mockRejectedValue(launchError)

      const result = await recipeService.parseInstagramRecipe(testUrl)

      expect(logger.error).toHaveBeenCalledWith(`[RecipeService] Error parsing Instagram URL ${testUrl}: ${launchError.message}`)
      expect(result.ingredients).toBeNull()
      expect(result.instructions).toBeNull()
      expect(result.original_video_url).toBe(testUrl) // Fallback to input URL
      expect(mockBrowser.close).not.toHaveBeenCalled() // Browser was not launched
    })

    it('should handle page.goto error gracefully and still close browser', async () => {
      const gotoError = new Error('Navigation failed')
      mockPage.goto.mockRejectedValue(gotoError)

      const result = await recipeService.parseInstagramRecipe(testUrl)

      expect(logger.error).toHaveBeenCalledWith(`[RecipeService] Error parsing Instagram URL ${testUrl}: ${gotoError.message}`)
      expect(result.ingredients).toBeNull()
      expect(result.instructions).toBeNull()
      expect(result.original_video_url).toBe(testUrl) // Fallback to input URL
      expect(mockBrowser.close).toHaveBeenCalledTimes(1) // Ensure browser is closed via finally
    })

    it('should handle page.evaluate error gracefully and still close browser', async () => {
        const evaluateError = new Error('Evaluation failed')
        mockPage.evaluate.mockRejectedValue(evaluateError) // Simulate error on first evaluate call
  
        const result = await recipeService.parseInstagramRecipe(testUrl)
  
        expect(logger.error).toHaveBeenCalledWith(`[RecipeService] Error parsing Instagram URL ${testUrl}: ${evaluateError.message}`)
        expect(result.ingredients).toBeNull()
        expect(result.instructions).toBeNull()
        expect(result.original_video_url).toBe(testUrl) // Fallback
        expect(mockBrowser.close).toHaveBeenCalledTimes(1)
      })
  })
})
