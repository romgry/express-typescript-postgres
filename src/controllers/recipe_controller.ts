/**
 *        @file recipe_controller.ts
 *  @repository 000-a-3100_api_boilerplate
 * @application 000-a-3100_api_boilerplate
 *     @summary Recipe Controller Object.
 * @description This file contains functions for handling recipe-related API requests.
 *    @services - RecipeService
 *   @functions - uploadInstagramRecipe()
 *     @returns Express JSON Response
 */

import { Response, NextFunction } from 'express'
import { RecipeService } from '../services/recipe_service' // Ensure RecipeService class is exported
import Helper, { CUserAuthInfoRequest } from '../db_pool/helper'
import { wrapper } from '../helpers/exception_wrapper'
import { ResponseWrapper } from '../helpers/response_wrapper'
import { logger } from '../providers/logger'

const recipeController = {
  uploadInstagramRecipe: async (req: CUserAuthInfoRequest, res: Response, next: NextFunction): Promise<void> => {
    const url = req.body.url

    if (!url || typeof url !== 'string') {
      const response = new ResponseWrapper(res)
      // Using .handle to specify 400 for bad request directly
      response.handle({ success: false, data: { message: 'Invalid URL in request body' } }, 200, 400)
      return
    }

    // Use req.cUser if available (from auth middleware), otherwise defaultUser
    // This matches the pattern in UserController for instantiating services that extend CommonService
    const userContext = req.cUser || Helper.defaultUser()
    const recipeServiceInstance = new RecipeService(userContext) // Renamed to avoid conflict if service was exported as recipeService
    const response = new ResponseWrapper(res)

    try {
      logger.info(`[RecipeController] Parsing Instagram URL: ${url}`)
      const parsedData = await recipeServiceInstance.parseInstagramRecipe(url)
      
      if (!parsedData || Object.keys(parsedData).length === 0) {
        logger.warn(`[RecipeController] Parsing returned no data for URL: ${url}`)
        response.ok({ success: false, data: { message: 'Could not parse any recipe data from the URL.' }})
        return
      }

      logger.info(`[RecipeController] Saving parsed recipe data: ${JSON.stringify(parsedData)}`)
      const savedRecipe = await recipeServiceInstance.saveRecipe(parsedData)
      
      response.ok({ success: true, data: savedRecipe })
    } catch (error) {
      logger.error(`[RecipeController] Error in uploadInstagramRecipe: ${error}`)
      // The 'wrapper' will catch this and pass it to 'next'
      throw error; 
    }
  }
}

// Wrap the controller method for error handling
// The wrapper expects the function itself, then its arguments including 'next' at args[2]
// So, we wrap the function definition.
recipeController.uploadInstagramRecipe = wrapper(recipeController.uploadInstagramRecipe)

export default recipeController
