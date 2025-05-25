/**
 *        @file recipe_service.ts
 *  @repository 000-a-3100_api_boilerplate
 * @application 000-a-3100_api_boilerplate
 *     @summary RecipeService Class
 * @description Defines functions for recipe-related operations
 */

import { User } from '../models'
import { Recipe } from '../models/recipe'
import { CommonService } from './common_service'
import { logger } from '../providers/logger'
// import PGPool from '../db_pool/pg_pool' // PGPool might not be directly needed if using CommonService methods
import Helper from '../db_pool/helper' // For getting default user or pool if needed
import puppeteer, { Browser } from 'puppeteer'

export class RecipeService extends CommonService {
  constructor(user: User) {
    super(user)
    this.type_name = 'recipes' // Set the table name for CommonService methods
  }

  /**
   * Saves a recipe to the database.
   * For now, this is a placeholder.
   * @param recipeData - Partial data of the recipe to save.
   * @returns A Promise resolving to the saved Recipe.
   */
  public async saveRecipe(recipeData: Partial<Recipe>): Promise<Recipe> {
    logger.info(`[RecipeService] Attempting to save recipe with data: ${JSON.stringify(recipeData)}`)

    const pool = Helper.pool()
    const sql = 'SELECT * FROM public.recipe_insert_one($1, $2, $3);' // Added semicolon for clarity
    const params = [
      recipeData.ingredients || null,
      recipeData.instructions || null,
      recipeData.original_video_url || null,
    ];

    try {
      const result = await pool.aquery(this.user_current, sql, params);

      if (result.rows && result.rows.length > 0) {
        // The recipe_insert_one function returns the full row, which should match the Recipe interface.
        // Type assertion might be needed if the row structure is not guaranteed by pg_pool.
        const savedRecipe = result.rows[0] as Recipe; 
        logger.info(`[RecipeService] Recipe saved successfully with id: ${savedRecipe.id}`);
        return savedRecipe;
      } else {
        logger.error('[RecipeService] Failed to create recipe: No data returned from database function.');
        throw new Error('Failed to create recipe: No data returned from database function.');
      }
    } catch (error) {
      logger.error(`[RecipeService] Error saving recipe: ${error.message || JSON.stringify(error)}`);
      // Re-throw the error to be handled by the caller (e.g., controller)
      throw error;
    }
  }

  /**
   * Parses a recipe from an Instagram URL.
   * For now, this is a placeholder.
   * @param url - The URL of the Instagram recipe.
   * @returns A Promise resolving to partial Recipe data.
   */
  public async parseInstagramRecipe(url: string): Promise<Partial<Recipe>> {
    logger.info(`[RecipeService] Attempting to parse Instagram URL: ${url}`)
    let browser: Browser | null = null
    let ingredients: string | null = null
    let instructions: string | null = null
    let videoUrl: string | null = null

    try {
      browser = await puppeteer.launch({
        headless: true, // Run headless by default
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage', // Often needed in CI/Docker
          '--disable-gpu', // Can help in some environments
          '--window-size=1920,1080', // Set a common window size
        ],
      })
      const page = await browser.newPage()
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36'); // Set a common user agent

      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 }) // 60s timeout

      // Attempt to extract caption from 'og:description' meta tag
      const captionContent = await page.evaluate(() => {
        const metaDescription = document.querySelector('meta[property="og:description"]')
        return metaDescription ? metaDescription.getAttribute('content') : null
      })

      if (captionContent) {
        logger.info(`[RecipeService] Extracted caption: ${captionContent.substring(0, 100)}...`)
        const lines = captionContent.split(/\\n|\n|<br\s*\/?>/i); // Split by newlines or <br> tags
        let currentSection: 'ingredients' | 'instructions' | null = null
        const ingredientLines: string[] = []
        const instructionLines: string[] = []

        for (const line of lines) {
          const trimmedLine = line.trim()
          if (trimmedLine.toLowerCase().startsWith('ingredients:')) {
            currentSection = 'ingredients'
            const contentAfterKeyword = trimmedLine.substring('ingredients:'.length).trim()
            if(contentAfterKeyword) ingredientLines.push(contentAfterKeyword)
          } else if (trimmedLine.toLowerCase().startsWith('instructions:')) {
            currentSection = 'instructions'
            const contentAfterKeyword = trimmedLine.substring('instructions:'.length).trim()
            if(contentAfterKeyword) instructionLines.push(contentAfterKeyword)
          } else if (currentSection === 'ingredients' && trimmedLine) {
            ingredientLines.push(trimmedLine)
          } else if (currentSection === 'instructions' && trimmedLine) {
            instructionLines.push(trimmedLine)
          }
        }
        if (ingredientLines.length > 0) ingredients = ingredientLines.join('\n')
        if (instructionLines.length > 0) instructions = instructionLines.join('\n')
        logger.info(`[RecipeService] Parsed Ingredients: ${ingredients ? ingredients.substring(0, 50) + '...' : 'None'}`)
        logger.info(`[RecipeService] Parsed Instructions: ${instructions ? instructions.substring(0, 50) + '...' : 'None'}`)
      } else {
        logger.warn('[RecipeService] Could not extract caption content (og:description).')
      }

      // Attempt to extract video URL from 'og:video' meta tag
      videoUrl = await page.evaluate(() => {
        const videoMeta = document.querySelector('meta[property="og:video"]')
        return videoMeta ? videoMeta.getAttribute('content') : null
      })

      if (!videoUrl) {
        videoUrl = url // Fallback to the post URL if specific video URL not found
        logger.info('[RecipeService] No specific video URL (og:video) found, falling back to input URL.')
      } else {
        logger.info(`[RecipeService] Found video URL (og:video): ${videoUrl}`)
      }

    } catch (error) {
      logger.error(`[RecipeService] Error parsing Instagram URL ${url}: ${error.message || JSON.stringify(error)}`)
      // Return nulls or partial data if an error occurs
      // Fallback videoUrl to input url even on error, as it's better than nothing.
      videoUrl = videoUrl || url; 
    } finally {
      if (browser) {
        await browser.close()
        logger.info('[RecipeService] Puppeteer browser closed.')
      }
    }

    const result: Partial<Recipe> = {
      ingredients,
      instructions,
      original_video_url: videoUrl,
    }
    logger.info(`[RecipeService] Parsed data for URL ${url}: ${JSON.stringify(result)}`)
    return result
  }
}

// Export an instance of RecipeService.
// It needs a User object. For a default/system-level service,
// we might use a default user, or this might be instantiated per request.
// For now, let's use a default user from Helper.
const defaultUser = Helper.defaultUser()
export const recipeService = new RecipeService(defaultUser)
